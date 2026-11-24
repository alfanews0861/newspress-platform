/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NewsPress YouTube News Studio — Priority Broadcast Queue Scheduler
 * Deterministic P1 / P2 / P3 queue management with concurrency control,
 * pre-reviewed package support, footage re-attach recovery, and Firestore sync.
 */

import { doc, setDoc, collection, query, orderBy, deleteDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { isFirebaseConfigured } from '../config/firebase';
import { sanitizeFirestore } from '../utils/sanitizeFirestore';
import {
  YouTubeVideoJob,
  YouTubeVideoPriority,
  YouTubeJobPayload,
  QueueSystemStats,
} from '../types/youtubeQueue';
import { YouTubeService } from './youtubeService';
import { AIVideoEditorialService } from './aiVideoEditorialService';
import { ThumbnailGeneratorService } from './thumbnailGeneratorService';
import { VideoCompositorService } from './videoCompositorService';
import { VOICE_ACTORS, YouTubeBroadcastRecord } from '../types/youtube';

const QUEUE_STORAGE_KEY = 'newspress_youtube_video_queue_v1';
const FIRESTORE_COLLECTION = 'youtube_video_queue';

const PRIORITY_WEIGHTS: Record<YouTubeVideoPriority, number> = {
  P1_FLASH_BREAKING: 1,
  P2_PRIMETIME_BULLETIN: 2,
  P3_ROUTINE_FIELD_REPORT: 3,
};

interface SessionBlobEntry {
  clips: File[];
  thumbnailBlob?: Blob;
  voiceOverBlob?: Blob;
}

const _jobs = new Map<string, YouTubeVideoJob>();
const _blobRegistry = new Map<string, SessionBlobEntry>();
const _listeners = new Set<(jobs: YouTubeVideoJob[]) => void>();

let _isWorkerLoopRunning = false;
let _workerTimer: ReturnType<typeof setInterval> | null = null;
let _workerPaused = false;
let _maxConcurrentJobs = 2;

export class YouTubeQueueService {
  static resetStore(): void {
    _jobs.clear();
    _blobRegistry.clear();
    _maxConcurrentJobs = 2;
    if (_workerTimer) {
      clearInterval(_workerTimer);
      _workerTimer = null;
    }
    _isWorkerLoopRunning = false;
    try {
      localStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch {}
    this.notifyListeners();
  }

  static isWorkerPaused(): boolean {
    return _workerPaused;
  }

  static pauseWorker(): void {
    _workerPaused = true;
    if (_workerTimer) {
      clearInterval(_workerTimer);
      _workerTimer = null;
    }
    _isWorkerLoopRunning = false;
    this.notifyListeners();
  }

  static resumeWorker(): void {
    _workerPaused = false;
    this.startWorker();
    this.triggerWorker();
    this.notifyListeners();
  }

  static setMaxConcurrentJobs(limit: number): void {
    _maxConcurrentJobs = Math.max(1, Math.min(10, limit));
    this.recalculateQueuePositions();
    this.triggerWorker();
  }

  static getMaxConcurrentJobs(): number {
    return _maxConcurrentJobs;
  }

  static init(): void {
    this.loadFromStorage();
    this.recalculateQueuePositions();
    this.startWorker();

    if (isFirebaseConfigured && db && auth?.currentUser) {
      try {
        const q = query(collection(db, FIRESTORE_COLLECTION), orderBy('createdAt', 'desc'));
        onSnapshot(
          q,
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              const remoteJob = change.doc.data() as YouTubeVideoJob;
              if (change.type === 'removed') {
                _jobs.delete(change.doc.id);
              } else {
                const local = _jobs.get(change.doc.id);
                if (local && local.status === 'PROCESSING' && remoteJob.status === 'QUEUED') {
                  return;
                }
                _jobs.set(change.doc.id, remoteJob);
              }
            });
            this.recalculateQueuePositions();
            this.notifyListeners();
          },
          (err) => {
            console.warn('[YouTubeQueueService] Firestore real-time listener notice:', err.message);
          }
        );
      } catch (e) {
        console.warn('[YouTubeQueueService] Firestore snapshot init notice:', e);
      }
    }
  }

  static subscribe(listener: (jobs: YouTubeVideoJob[]) => void): () => void {
    _listeners.add(listener);
    listener(this.getAllJobs());
    return () => {
      _listeners.delete(listener);
    };
  }

  private static notifyListeners(): void {
    const list = this.getAllJobs();
    for (const listener of _listeners) {
      try {
        listener(list);
      } catch (e) {
        console.error('[YouTubeQueueService] Listener notification error:', e);
      }
    }
  }

  static async enqueueJob(params: {
    tenantId: string;
    userId: string;
    userName: string;
    title: string;
    priority?: YouTubeVideoPriority;
    payload: YouTubeJobPayload;
    activeClipsFiles?: File[];
    thumbnailBlob?: Blob;
    voiceOverBlob?: Blob;
  }): Promise<YouTubeVideoJob> {
    const jobId = `yt_job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const priority = params.priority || 'P3_ROUTINE_FIELD_REPORT';

    if ((params.activeClipsFiles && params.activeClipsFiles.length > 0) || params.thumbnailBlob || params.voiceOverBlob) {
      _blobRegistry.set(jobId, {
        clips: params.activeClipsFiles || [],
        thumbnailBlob: params.thumbnailBlob,
        voiceOverBlob: params.voiceOverBlob,
      });
    }

    const job: YouTubeVideoJob = {
      jobId,
      tenantId: params.tenantId || 'tenant_default',
      userId: params.userId || auth?.currentUser?.uid || 'studio_user',
      userName: params.userName || 'Broadcast Desk',
      title: params.title || 'Breaking News Broadcast',
      newsLocation: params.payload.newsLocation || '',
      language: params.payload.language || 'en',
      priority,
      status: 'QUEUED',
      stage: 'queued',
      stageMessage: 'Queued for studio mastering and Public YouTube broadcast...',
      progress: 0,
      retryCount: 0,
      maxRetries: 3,
      needsFootageReattach: false,
      createdAt: new Date().toISOString(),
      payload: {
        ...params.payload,
        activeClipsFiles: undefined,
      },
    };

    _jobs.set(jobId, job);
    this.recalculateQueuePositions();
    await this.persistJob(job);
    this.notifyListeners();
    this.triggerWorker();

    return job;
  }

  static async setJobPriority(jobId: string, newPriority: YouTubeVideoPriority): Promise<boolean> {
    const job = _jobs.get(jobId);
    if (!job) return false;

    job.priority = newPriority;
    this.recalculateQueuePositions();
    await this.persistJob(job);
    this.notifyListeners();
    this.triggerWorker();
    return true;
  }

  static async cancelJob(jobId: string, reason = 'Cancelled by editor'): Promise<boolean> {
    const job = _jobs.get(jobId);
    if (!job) return false;

    job.status = 'CANCELLED';
    job.stage = 'failed';
    job.stageMessage = reason;
    job.completedAt = new Date().toISOString();

    _blobRegistry.delete(jobId);
    this.recalculateQueuePositions();
    await this.persistJob(job);
    this.notifyListeners();
    this.triggerWorker();
    return true;
  }

  static async retryJob(jobId: string): Promise<boolean> {
    const job = _jobs.get(jobId);
    if (!job) return false;

    const existingBlobs = _blobRegistry.get(jobId);
    if (!existingBlobs || existingBlobs.clips.length === 0) {
      job.needsFootageReattach = true;
      job.status = 'FAILED';
      job.stage = 'failed';
      job.error = 'Local video footage is unavailable in this browser session. Please re-attach footage to resume.';
      job.stageMessage = 'Footage re-attach required before retrying.';
      await this.persistJob(job);
      this.notifyListeners();
      return false;
    }

    job.status = 'QUEUED';
    job.stage = 'queued';
    job.stageMessage = 'Re-queued for broadcast mastering...';
    job.progress = 0;
    job.error = undefined;
    job.needsFootageReattach = false;
    job.retryCount = 0;
    job.createdAt = new Date().toISOString();

    this.recalculateQueuePositions();
    await this.persistJob(job);
    this.notifyListeners();
    this.triggerWorker();
    return true;
  }

  /**
   * Re-attaches local video File clips to a restored job after browser reload and resumes processing.
   */
  static async reattachFootageAndRetry(jobId: string, clips: File[]): Promise<boolean> {
    const job = _jobs.get(jobId);
    if (!job || clips.length === 0) return false;

    const current = _blobRegistry.get(jobId) || { clips: [] };
    _blobRegistry.set(jobId, {
      ...current,
      clips,
    });
    job.payload.activeClipsMeta = clips.map((f) => ({ name: f.name, size: f.size }));
    job.needsFootageReattach = false;
    return this.retryJob(jobId);
  }

  static async clearCompleted(): Promise<void> {
    for (const [id, job] of _jobs.entries()) {
      if (job.status === 'PUBLISHED' || job.status === 'CANCELLED') {
        _jobs.delete(id);
        _blobRegistry.delete(id);
        if (isFirebaseConfigured && db && auth?.currentUser) {
          deleteDoc(doc(db, FIRESTORE_COLLECTION, id)).catch(() => {});
        }
      }
    }
    this.saveToStorage();
    this.recalculateQueuePositions();
    this.notifyListeners();
  }

  static getAllJobs(tenantId?: string): YouTubeVideoJob[] {
    let list = Array.from(_jobs.values());
    if (tenantId) {
      list = list.filter((j) => j.tenantId === tenantId || j.tenantId === 'tenant_default');
    }

    return list.sort((a, b) => {
      if (a.status === 'PROCESSING' && b.status !== 'PROCESSING') return -1;
      if (b.status === 'PROCESSING' && a.status !== 'PROCESSING') return 1;

      if (a.status === 'QUEUED' && b.status === 'QUEUED') {
        const weightDiff = PRIORITY_WEIGHTS[a.priority] - PRIORITY_WEIGHTS[b.priority];
        if (weightDiff !== 0) return weightDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (a.status === 'QUEUED') return -1;
      if (b.status === 'QUEUED') return 1;

      const timeA = new Date(a.completedAt || a.createdAt).getTime();
      const timeB = new Date(b.completedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
  }

  static getJobById(jobId: string): YouTubeVideoJob | undefined {
    return _jobs.get(jobId);
  }

  static getQueueStats(tenantId?: string): QueueSystemStats {
    const all = this.getAllJobs(tenantId);
    const queuedCount = all.filter((j) => j.status === 'QUEUED').length;
    const processingCount = all.filter((j) => j.status === 'PROCESSING').length;
    const publishedCount = all.filter((j) => j.status === 'PUBLISHED').length;
    const failedCount = all.filter((j) => j.status === 'FAILED' || j.status === 'CANCELLED').length;

    return {
      totalJobs: all.length,
      queuedCount,
      processingCount,
      publishedCount,
      failedCount,
      activeWorkers: processingCount,
      maxConcurrentWorkers: _maxConcurrentJobs,
    };
  }

  private static recalculateQueuePositions(): void {
    const queuedJobs = Array.from(_jobs.values())
      .filter((j) => j.status === 'QUEUED')
      .sort((a, b) => {
        const weightDiff = PRIORITY_WEIGHTS[a.priority] - PRIORITY_WEIGHTS[b.priority];
        if (weightDiff !== 0) return weightDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    const activeCount = Array.from(_jobs.values()).filter((j) => j.status === 'PROCESSING').length;
    const avgJobDurationSec = 60;

    queuedJobs.forEach((job, index) => {
      job.queuePosition = index + 1;
      const batchesAhead = Math.floor(index / _maxConcurrentJobs);
      job.estimatedWaitSec = Math.max(15, batchesAhead * avgJobDurationSec + (activeCount > 0 ? 25 : 5));
    });
  }

  private static startWorker(): void {
    if (_workerPaused || _isWorkerLoopRunning) return;
    _isWorkerLoopRunning = true;

    if (!_workerTimer) {
      _workerTimer = setInterval(() => {
        this.processNextInQueue();
      }, 4000);
      if (typeof (_workerTimer as any)?.unref === 'function') {
        (_workerTimer as any).unref();
      }
    }
  }

  static triggerWorker(): void {
    if (_workerPaused) return;
    this.startWorker();
    setTimeout(() => {
      this.processNextInQueue();
    }, 100);
  }

  private static async processNextInQueue(): Promise<void> {
    if (_workerPaused) return;
    const activeJobs = Array.from(_jobs.values()).filter((j) => j.status === 'PROCESSING');
    if (activeJobs.length >= _maxConcurrentJobs) return;

    const queuedJobs = Array.from(_jobs.values())
      .filter((j) => j.status === 'QUEUED')
      .sort((a, b) => {
        const weightDiff = PRIORITY_WEIGHTS[a.priority] - PRIORITY_WEIGHTS[b.priority];
        if (weightDiff !== 0) return weightDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    if (queuedJobs.length === 0) return;

    const job = queuedJobs[0];

    // Check footage availability immediately before claiming if reloaded after session restart
    const registeredBlobs = _blobRegistry.get(job.jobId);
    if (!registeredBlobs || registeredBlobs.clips.length === 0) {
      job.status = 'FAILED';
      job.stage = 'failed';
      job.needsFootageReattach = true;
      job.error = 'Local video files were cleared after browser reload. Re-attach footage to resume mastering.';
      job.stageMessage = 'Footage re-attach required.';
      job.completedAt = new Date().toISOString();
      this.recalculateQueuePositions();
      await this.persistJob(job);
      this.notifyListeners();
      return;
    }

    job.status = 'PROCESSING';
    job.startedAt = new Date().toISOString();
    job.stage = 'editorial_review';
    job.stageMessage = 'Starting broadcast production pipeline...';
    job.progress = 5;

    this.recalculateQueuePositions();
    await this.persistJob(job);
    this.notifyListeners();

    this.executeJob(job).catch((err) => {
      console.error(`[YouTubeQueueService] Uncaught error processing job ${job.jobId}:`, err);
    });
  }

  private static async executeJob(job: YouTubeVideoJob): Promise<void> {
    const updateJob = async (stage: YouTubeVideoJob['stage'], progress: number, message: string) => {
      const current = _jobs.get(job.jobId);
      if (current && current.status === 'CANCELLED') {
        throw new Error('JOB_ABORTED_CANCELLED');
      }

      job.stage = stage;
      job.progress = progress;
      job.stageMessage = message;
      await this.persistJob(job);
      this.notifyListeners();
    };

    try {
      const { payload } = job;
      const settings = YouTubeService.getSettings();
      const account = YouTubeService.getConnectedAccount();
      const registeredBlobs = _blobRegistry.get(job.jobId);
      const clips = registeredBlobs?.clips || [];

      if (clips.length === 0) {
        job.needsFootageReattach = true;
        throw new Error('FOOTAGE_REATTACH_REQUIRED');
      }

      // Step 1: Pre-flight OAuth validation
      let activeAccessToken = '';
      try {
        activeAccessToken = await YouTubeService.getValidAccessToken();
      } catch {
        throw new Error('YouTube channel session is expired or not connected. Please reconnect in Settings.');
      }

      const activeActor =
        VOICE_ACTORS.find((a) => a.id === (payload.selectedVoiceActorId || settings.voiceActorId)) || VOICE_ACTORS[0];
      const speechRate = payload.speechRate || settings.speechRate || 1.3;
      const emotionalStyle = (payload.emotionalStyle || settings.emotionalStyle || 'emotional_breaking') as any;

      // Step 2: Use pre-reviewed Step 2 package if present, otherwise run compliance & editorial formatting
      let headlineTitle = payload.reviewedPackage?.headlineTitle || job.title;
      let scriptText = payload.reviewedPackage?.scriptText || '';
      let youtubeDescription = payload.reviewedPackage?.youtubeDescription || '';
      let tags = payload.reviewedPackage?.tags || [];
      let thumbHeadline = payload.reviewedPackage?.thumbnailHeadline || headlineTitle;
      let thumbBadge = payload.reviewedPackage?.thumbnailBadge || '';
      let thumbCuriosity = payload.reviewedPackage?.thumbnailCuriosityLine || '';

      if (!scriptText) {
        await updateJob('editorial_review', 12, 'Verifying story against editorial standards...');
        const compliance = await AIVideoEditorialService.verifyEditorialCompliance(payload.newsText);
        if (!compliance.isCompliant) {
          throw new Error(`Editorial Advisory: ${compliance.statusMessage}`);
        }

        await updateJob('script_writing', 25, 'Formatting broadcast script and discovery metadata...');
        const editorialPkg = await AIVideoEditorialService.generateBroadcastPackage({
          newsText: payload.newsText,
          language: payload.language,
          channelName: account.channelTitle || 'NewsPress Network',
          videoClips: clips,
        });
        headlineTitle = editorialPkg.headlineTitle;
        scriptText = editorialPkg.scriptText;
        youtubeDescription = editorialPkg.youtubeDescription;
        tags = editorialPkg.tags;
        thumbHeadline = editorialPkg.thumbnailHeadline;
        thumbBadge = editorialPkg.thumbnailBadge;
        thumbCuriosity = editorialPkg.thumbnailCuriosityLine;
      }

      // Step 3: Studio Anchor Narration (reuse reviewed audio blob if already approved in Step 2)
      let voiceBlob = registeredBlobs?.voiceOverBlob;
      if (!voiceBlob) {
        await updateJob('voice_recording', 38, `Recording 24kHz studio narration (${activeActor.englishName})...`);
        const voiceResult = await AIVideoEditorialService.synthesizeVoiceOver({
          scriptText,
          language: payload.language,
          rate: speechRate,
          gender: activeActor.gender,
          voiceActorId: activeActor.id,
          emotionalStyle,
        });
        voiceBlob = voiceResult.audioBlob;
        URL.revokeObjectURL(voiceResult.audioUrl);
      }

      // Step 4: Thumbnail Cover (reuse reviewed thumbnail blob if already approved in Step 2)
      let finalThumbBlob = registeredBlobs?.thumbnailBlob;
      let finalThumbUrl = payload.reviewedPackage?.thumbnailDataUrl || '';

      if (!finalThumbBlob) {
        await updateJob('graphics_thumbnail', 50, 'Rendering 1280x720 broadcast cover thumbnail...');
        const thumb = await ThumbnailGeneratorService.renderThumbnail({
          headlineText: thumbHeadline,
          badgeText: thumbBadge,
          curiosityLine: thumbCuriosity,
          themeColor: payload.thumbnailTheme || 'fire_red',
          logoDataUrl: settings.watermark.logoDataUrl,
          channelName: account.channelTitle || 'NEWSPRESS 24x7',
          language: payload.language,
        });
        finalThumbBlob = thumb.blob;
        finalThumbUrl = thumb.dataUrl;
      }

      // Step 5: Studio Composition & Mastering
      await updateJob('video_mastering', 65, 'Mastering 1080p broadcast video with watermark, audio ducking, and ticker...');

      const { introVideoBlob, outroVideoBlob, animatedLogoBlob } = await YouTubeService.getHydratedIntroOutroBlobs();
      const hydratedWatermark = {
        ...settings.watermark,
        logoVideoBlob: settings.watermark.logoVideoBlob || animatedLogoBlob,
      };

      const broadcastResult = await VideoCompositorService.composeAndPublishDirectToYouTube({
        tenantId: job.tenantId,
        mainVideoBlob: clips[0],
        videoClips: clips,
        voiceOverAudioBlob: voiceBlob,
        voiceScriptText: scriptText,
        language: payload.language,
        introVideoBlob,
        outroVideoBlob,
        introVideoUrl: settings.introVideoUrl,
        outroVideoUrl: settings.outroVideoUrl,
        watermarkSettings: hydratedWatermark,
        newsLocation: payload.newsLocation || job.newsLocation,
        tickerText: payload.tickerText,
        clipDurationMode: payload.clipDurationMode,
        speechRate,
        voiceActorId: activeActor.id,
        voiceActorGoogleVoice: activeActor.googleOriginalVoice,
        emotionalStyle,
        thumbnailBlob: finalThumbBlob,
        channelTitle: account.channelTitle || 'NewsPress 24x7',
        youtubeTitle: headlineTitle,
        youtubeDescription,
        youtubeTags: tags,
        youtubePrivacyStatus: 'public',
        youtubeAccessToken: activeAccessToken,
        youtubeRefreshToken: account.refreshToken,
        youtubeClientId: account.clientId,
        onProgress: (pct, msg) => {
          const clean =
            msg.includes('Cloud Run') || msg.includes('FFmpeg')
              ? 'Mastering broadcast package and transmitting to YouTube...'
              : msg;
          updateJob('video_mastering', Math.min(85, Math.max(65, pct)), clean);
        },
      });

      // Step 6: Verify YouTube SD Readiness
      await updateJob('sd_verification', 90, 'Uploaded as Public on YouTube! Checking SD playback readiness...');

      let isVerifiedSdReady = false;
      const pollStart = Date.now();
      while (Date.now() - pollStart < 25000) {
        try {
          const ytStatus = await YouTubeService.getVideoProcessingStatus(broadcastResult.videoId, activeAccessToken);
          if (ytStatus.isSdReady || ytStatus.uploadStatus === 'processed' || ytStatus.processingStatus === 'succeeded') {
            isVerifiedSdReady = true;
            break;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 3000));
      }

      // Step 7: Finalized & Saved to Broadcast History
      job.status = 'PUBLISHED';
      job.stage = 'published';
      job.progress = 100;
      job.stageMessage = 'Published live as Public on YouTube.';
      job.videoId = broadcastResult.videoId;
      job.youtubeUrl = broadcastResult.youtubeUrl;
      job.thumbnailUrl = finalThumbUrl || `https://img.youtube.com/vi/${broadcastResult.videoId}/hqdefault.jpg`;
      job.completedAt = new Date().toISOString();

      const newRecord: YouTubeBroadcastRecord = {
        videoId: broadcastResult.videoId,
        tenantId: job.tenantId,
        createdBy: job.userId,
        youtubeUrl: broadcastResult.youtubeUrl,
        embedUrl: `https://www.youtube.com/embed/${broadcastResult.videoId}`,
        title: broadcastResult.title,
        publishedAt: broadcastResult.publishedAt || new Date().toISOString(),
        privacyStatus: 'public',
        thumbnailUrl: job.thumbnailUrl,
        location: payload.newsLocation || job.newsLocation,
        newsLocation: payload.newsLocation || job.newsLocation,
        language: payload.language,
        channelTitle: account.channelTitle || 'News Channel',
        voiceActorId: activeActor.id,
        voiceActorName: activeActor.englishName || activeActor.name,
        durationMode: payload.clipDurationMode,
        tags,
        status: isVerifiedSdReady ? 'ready' : 'published',
        isSdReady: isVerifiedSdReady,
      };
      await YouTubeService.saveBroadcastRecord(newRecord);

      _blobRegistry.delete(job.jobId);
    } catch (err: any) {
      if (err.message === 'JOB_ABORTED_CANCELLED') return;

      if (err.message === 'FOOTAGE_REATTACH_REQUIRED') {
        job.status = 'FAILED';
        job.stage = 'failed';
        job.needsFootageReattach = true;
        job.error = 'Local video files need to be re-attached before mastering can resume.';
        job.stageMessage = 'Footage re-attach required.';
        job.completedAt = new Date().toISOString();
      } else {
        console.error(`[YouTubeQueueService] Job ${job.jobId} failed:`, err);
        job.retryCount += 1;

        if (job.retryCount <= job.maxRetries) {
          job.status = 'QUEUED';
          job.stage = 'queued';
          job.progress = 0;
          job.stageMessage = `Retrying attempt ${job.retryCount}/${job.maxRetries}: ${err.message}`;
        } else {
          job.status = 'FAILED';
          job.stage = 'failed';
          job.error = err.message || 'Broadcast pipeline failed.';
          job.stageMessage = `Broadcast failed: ${err.message}`;
          job.completedAt = new Date().toISOString();
        }
      }
    } finally {
      this.recalculateQueuePositions();
      await this.persistJob(job);
      this.notifyListeners();

      setTimeout(() => {
        this.processNextInQueue();
      }, 500);
    }
  }

  private static async persistJob(job: YouTubeVideoJob): Promise<void> {
    this.saveToStorage();

    if (isFirebaseConfigured && db && auth?.currentUser) {
      try {
        const cleanPayload = { ...job.payload, activeClipsFiles: undefined };
        const cleanJob = sanitizeFirestore({ ...job, payload: cleanPayload });
        await setDoc(doc(db, FIRESTORE_COLLECTION, job.jobId), cleanJob, { merge: true });
      } catch (err: any) {
        console.warn('[YouTubeQueueService] Firestore persistence notice:', err.message);
      }
    }
  }

  private static saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const serializableJobs = Array.from(_jobs.values()).map((j) => ({
        ...j,
        payload: { ...j.payload, activeClipsFiles: undefined },
      }));
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(serializableJobs));
    } catch (e) {
      console.warn('[YouTubeQueueService] Failed to save queue to localStorage:', e);
    }
  }

  private static loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as YouTubeVideoJob[];
        if (Array.isArray(parsed)) {
          parsed.forEach((job) => {
            if (job.status === 'PROCESSING' || job.status === 'QUEUED') {
              // After a hard browser reload, local File blobs in _blobRegistry are gone
              if (!_blobRegistry.has(job.jobId)) {
                job.status = 'FAILED';
                job.stage = 'failed';
                job.needsFootageReattach = true;
                job.error = 'Local video footage must be re-attached after page reload to resume broadcast mastering.';
                job.stageMessage = 'Footage re-attach required after reload.';
              }
            }
            _jobs.set(job.jobId, job);
          });
        }
      }
    } catch (e) {
      console.warn('[YouTubeQueueService] Failed to load queue from localStorage:', e);
    }
  }
}

YouTubeQueueService.init();
