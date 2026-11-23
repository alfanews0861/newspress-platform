/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress YouTube News Studio — Autonomous Task Queue & Priority Scheduler
 * 
 * Architecture:
 * - Deterministic Multi-Tier Priority Scheduling:
 *   - P1: Flash / Breaking News (తాజా వార్తలు) - Front-of-line preemption
 *   - P2: Prime-Time Bulletins (ప్రైమ్‌టైమ్ బులిటెన్) - High priority desk packages
 *   - P3: Routine Field Reports (సాధారణ రిపోర్ట్) - Standard FIFO
 * - Concurrency Control (default: 2 parallel mastering workers) to prevent Cloud Run & YouTube API quota choking
 * - Dynamic Queue Position & ETA (Estimated Wait Time) calculation
 * - Multi-Tenant / Firestore Realtime synchronization with offline LocalStorage fallback
 * - Autonomous background worker loop with auto-retry on transient network failures
 */

import { doc, setDoc, getDocs, collection, query, orderBy, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { isFirebaseConfigured } from '../config/firebase';
import { sanitizeFirestore } from '../utils/sanitizeFirestore';
import {
  YouTubeVideoJob,
  YouTubeVideoPriority,
  YouTubeJobStatus,
  YouTubeJobPayload,
  QueueSystemStats,
  PRIORITY_CONFIG,
} from '../types/youtubeQueue';
import { YouTubeService } from './youtubeService';
import { AIVideoEditorialService } from './aiVideoEditorialService';
import { ThumbnailGeneratorService } from './thumbnailGeneratorService';
import { VideoCompositorService } from './videoCompositorService';
import { VOICE_ACTORS, YouTubeBroadcastRecord, SUPPORTED_INDIAN_LANGUAGES } from '../types/youtube';

const QUEUE_STORAGE_KEY = 'newspress_youtube_video_queue_v1';
const FIRESTORE_COLLECTION = 'youtube_video_queue';

// Priority weight lookup: Lower number = Higher priority
const PRIORITY_WEIGHTS: Record<YouTubeVideoPriority, number> = {
  P1_FLASH_BREAKING: 1,
  P2_PRIMETIME_BULLETIN: 2,
  P3_ROUTINE_FIELD_REPORT: 3,
};

// In-Memory job and blob registries for current session
const _jobs = new Map<string, YouTubeVideoJob>();
const _blobRegistry = new Map<string, { clips: File[]; thumbnailBlob?: Blob }>();
const _listeners = new Set<(jobs: YouTubeVideoJob[]) => void>();

let _isWorkerLoopRunning = false;
let _workerTimer: any = null;
let _workerPaused = false;
let _maxConcurrentJobs: number = 2; // Default 2 workers simultaneously

export class YouTubeQueueService {
  /**
   * Resets in-memory stores and localStorage (useful for tests and mock environments).
   */
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
    } catch (e) {}
    this.notifyListeners();
  }

  /**
   * Pauses the autonomous worker execution (for testing or manual maintenance).
   */
  static pauseWorker(): void {
    _workerPaused = true;
    if (_workerTimer) {
      clearInterval(_workerTimer);
      _workerTimer = null;
    }
    _isWorkerLoopRunning = false;
  }

  /**
   * Resumes the autonomous worker execution.
   */
  static resumeWorker(): void {
    _workerPaused = false;
    this.startWorker();
    this.triggerWorker();
  }

  /**
   * Configures concurrency limit for parallel video mastering.
   */
  static setMaxConcurrentJobs(limit: number): void {
    _maxConcurrentJobs = Math.max(1, Math.min(10, limit));
    this.recalculateQueuePositions();
    this.triggerWorker();
  }

  static getMaxConcurrentJobs(): number {
    return _maxConcurrentJobs;
  }

  /**
   * Initializes queue service: loads saved queue and attaches background listener.
   */
  static init(): void {
    this.loadFromStorage();
    this.recalculateQueuePositions();
    this.startWorker();

    // Attach Firestore real-time listener if configured
    if (isFirebaseConfigured && db) {
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
                // If local job is already processing, retain local progress details
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
        console.warn('[YouTubeQueueService] Firestore snapshot init error:', e);
      }
    }
  }

  /**
   * Subscribes to queue updates.
   */
  static subscribe(listener: (jobs: YouTubeVideoJob[]) => void): () => void {
    _listeners.add(listener);
    // Initial call
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

  /**
   * Enqueues a new video composition & publishing job.
   */
  static async enqueueJob(params: {
    tenantId: string;
    userId: string;
    userName: string;
    title: string;
    priority?: YouTubeVideoPriority;
    payload: YouTubeJobPayload;
    activeClipsFiles?: File[];
  }): Promise<YouTubeVideoJob> {
    const jobId = `yt_job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const priority = params.priority || 'P3_ROUTINE_FIELD_REPORT';

    // Store in-memory file blobs for processing in the active session
    if (params.activeClipsFiles && params.activeClipsFiles.length > 0) {
      _blobRegistry.set(jobId, { clips: params.activeClipsFiles });
    }

    const job: YouTubeVideoJob = {
      jobId,
      tenantId: params.tenantId || 'tenant_default',
      userId: params.userId || 'user_guest',
      userName: params.userName || 'Broadcast Reporter',
      title: params.title || 'Breaking News Broadcast',
      newsLocation: params.payload.newsLocation || '',
      language: params.payload.language || 'te',
      priority,
      status: 'QUEUED',
      stage: 'queued',
      stageMessage: 'Queued for studio mastering & broadcast transmission...',
      progress: 0,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
      payload: {
        ...params.payload,
        activeClipsFiles: undefined, // Strip from serializable payload
      },
    };

    _jobs.set(jobId, job);
    this.recalculateQueuePositions();
    await this.persistJob(job);
    this.notifyListeners();

    // Trigger worker immediately to pick up if slot is free
    this.triggerWorker();

    return job;
  }

  /**
   * Promotes or changes the priority of an existing job.
   * e.g., An editor bumping a Routine story to Flash Breaking (P1)!
   */
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

  /**
   * Cancels a queued or processing job.
   */
  static async cancelJob(jobId: string, reason = 'Cancelled by user'): Promise<boolean> {
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

  /**
   * Retries a failed or cancelled job.
   */
  static async retryJob(jobId: string): Promise<boolean> {
    const job = _jobs.get(jobId);
    if (!job) return false;

    job.status = 'QUEUED';
    job.stage = 'queued';
    job.stageMessage = 'Re-queued for broadcast transmission...';
    job.progress = 0;
    job.error = undefined;
    job.retryCount = 0;
    job.createdAt = new Date().toISOString();

    this.recalculateQueuePositions();
    await this.persistJob(job);
    this.notifyListeners();
    this.triggerWorker();
    return true;
  }

  /**
   * Cleans up completed/cancelled jobs from local view.
   */
  static async clearCompleted(): Promise<void> {
    for (const [id, job] of _jobs.entries()) {
      if (job.status === 'PUBLISHED' || job.status === 'CANCELLED') {
        _jobs.delete(id);
        _blobRegistry.delete(id);
        if (isFirebaseConfigured && db) {
          deleteDoc(doc(db, FIRESTORE_COLLECTION, id)).catch(() => {});
        }
      }
    }
    this.saveToStorage();
    this.recalculateQueuePositions();
    this.notifyListeners();
  }

  /**
   * Returns a sorted list of all jobs:
   * 1. Active PROCESSING jobs
   * 2. QUEUED jobs sorted by Priority (P1 > P2 > P3), then FIFO by createdAt
   * 3. PUBLISHED / FAILED / CANCELLED sorted by completedAt/createdAt descending
   */
  static getAllJobs(tenantId?: string): YouTubeVideoJob[] {
    let list = Array.from(_jobs.values());
    if (tenantId) {
      list = list.filter((j) => j.tenantId === tenantId);
    }

    return list.sort((a, b) => {
      // 1. Processing jobs first
      if (a.status === 'PROCESSING' && b.status !== 'PROCESSING') return -1;
      if (b.status === 'PROCESSING' && a.status !== 'PROCESSING') return 1;

      // 2. Queued jobs next, sorted by Priority weight, then createdAt
      if (a.status === 'QUEUED' && b.status === 'QUEUED') {
        const weightDiff = PRIORITY_WEIGHTS[a.priority] - PRIORITY_WEIGHTS[b.priority];
        if (weightDiff !== 0) return weightDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (a.status === 'QUEUED') return -1;
      if (b.status === 'QUEUED') return 1;

      // 3. Completed / other jobs sorted newest to oldest
      const timeA = new Date(a.completedAt || a.createdAt).getTime();
      const timeB = new Date(b.completedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
  }

  static getJobById(jobId: string): YouTubeVideoJob | undefined {
    return _jobs.get(jobId);
  }

  /**
   * Returns high-level operational statistics for the Queue Monitor.
   */
  static getQueueStats(tenantId?: string): QueueSystemStats {
    const all = this.getAllJobs(tenantId);
    const queuedCount = all.filter((j) => j.status === 'QUEUED').length;
    const processingCount = all.filter((j) => j.status === 'PROCESSING').length;
    const publishedCount = all.filter((j) => j.status === 'PUBLISHED').length;
    const failedCount = all.filter((j) => j.status === 'FAILED').length;

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

  /**
   * Deterministically calculates queue position (1-based) and estimated wait time in seconds.
   */
  private static recalculateQueuePositions(): void {
    const queuedJobs = Array.from(_jobs.values())
      .filter((j) => j.status === 'QUEUED')
      .sort((a, b) => {
        const weightDiff = PRIORITY_WEIGHTS[a.priority] - PRIORITY_WEIGHTS[b.priority];
        if (weightDiff !== 0) return weightDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    const activeCount = Array.from(_jobs.values()).filter((j) => j.status === 'PROCESSING').length;
    const avgJobDurationSec = 60; // Estimated 60 seconds per video broadcast package

    queuedJobs.forEach((job, index) => {
      const position = index + 1;
      job.queuePosition = position;

      // Calculate ETA: Slots available per cycle
      const batchesAhead = Math.floor(index / _maxConcurrentJobs);
      const estWait = Math.max(15, batchesAhead * avgJobDurationSec + (activeCount > 0 ? 25 : 5));
      job.estimatedWaitSec = estWait;
    });
  }

  /**
   * Starts the autonomous background worker loop.
   */
  private static startWorker(): void {
    if (_workerPaused) return;
    if (_isWorkerLoopRunning) return;
    _isWorkerLoopRunning = true;

    if (!_workerTimer) {
      _workerTimer = setInterval(() => {
        this.processNextInQueue();
      }, 4000);
      if (typeof _workerTimer?.unref === 'function') {
        _workerTimer.unref();
      }
    }
  }

  /**
   * Triggers an immediate worker pass.
   */
  static triggerWorker(): void {
    if (_workerPaused) return;
    this.startWorker();
    setTimeout(() => {
      this.processNextInQueue();
    }, 100);
  }

  /**
   * Core worker logic: Claims the top priority job and executes the video pipeline.
   */
  private static async processNextInQueue(): Promise<void> {
    if (_workerPaused) return;
    const activeJobs = Array.from(_jobs.values()).filter((j) => j.status === 'PROCESSING');
    if (activeJobs.length >= _maxConcurrentJobs) {
      return; // All worker slots currently busy
    }

    // Find highest priority queued job
    const queuedJobs = Array.from(_jobs.values())
      .filter((j) => j.status === 'QUEUED')
      .sort((a, b) => {
        const weightDiff = PRIORITY_WEIGHTS[a.priority] - PRIORITY_WEIGHTS[b.priority];
        if (weightDiff !== 0) return weightDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    if (queuedJobs.length === 0) return;

    const job = queuedJobs[0];

    // Atomically claim job
    job.status = 'PROCESSING';
    job.startedAt = new Date().toISOString();
    job.stage = 'editorial_review';
    job.stageMessage = 'Starting autonomous broadcast composition...';
    job.progress = 5;

    this.recalculateQueuePositions();
    await this.persistJob(job);
    this.notifyListeners();

    // Run execution asynchronously
    this.executeJob(job).catch((err) => {
      console.error(`[YouTubeQueueService] Uncaught error processing job ${job.jobId}:`, err);
    });
  }

  /**
   * Executes the full 7-step TV broadcast production pipeline for a job.
   */
  private static async executeJob(job: YouTubeVideoJob): Promise<void> {
    const updateJob = async (stage: YouTubeVideoJob['stage'], progress: number, message: string) => {
      // If job was cancelled while processing, abort immediately
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

      // Step 1: Pre-flight OAuth validation
      let activeAccessToken = '';
      try {
        activeAccessToken = await YouTubeService.getValidAccessToken();
      } catch (authErr: any) {
        throw new Error('YouTube channel session is expired or not connected. Please connect channel.');
      }

      await updateJob('editorial_review', 12, 'Reviewing news content against journalistic guidelines...');

      // Step 2: Editorial compliance & Script Formatting
      const compliance = await AIVideoEditorialService.verifyEditorialCompliance(payload.newsText);
      if (!compliance.isCompliant) {
        throw new Error(`Editorial Compliance Flag: ${compliance.statusMessage}`);
      }

      await updateJob('script_writing', 25, 'Generating broadcast script & discovery tags...');
      const editorialPkg = await AIVideoEditorialService.generateBroadcastPackage({
        newsText: payload.newsText,
        language: payload.language,
        channelName: account.channelTitle || 'NewsPress Network',
      });

      // Step 3: Anchor Narration Recording
      await updateJob('voice_recording', 38, 'Synthesizing 24kHz HD studio anchor voiceover...');
      const activeActor = VOICE_ACTORS.find((a) => a.id === payload.selectedVoiceActorId) || VOICE_ACTORS[0];
      const speechRate = payload.speechRate || settings.speechRate || 1.3;

      const voiceResult = await AIVideoEditorialService.synthesizeVoiceOver({
        scriptText: editorialPkg.scriptText,
        language: payload.language,
        rate: speechRate,
        gender: activeActor.gender,
        voiceActorId: activeActor.id,
        emotionalStyle: (payload.emotionalStyle as any) || 'emotional_breaking',
      });

      // Step 4: Broadcast Graphics & AI Thumbnail
      await updateJob('graphics_thumbnail', 50, 'Rendering broadcast news thumbnail & overlays...');
      const thumb = await ThumbnailGeneratorService.renderThumbnail({
        headlineText: editorialPkg.thumbnailHeadline,
        badgeText: editorialPkg.thumbnailBadge,
        curiosityLine: editorialPkg.thumbnailCuriosityLine,
        themeColor: payload.thumbnailTheme || editorialPkg.thumbnailColorTheme || 'fire_red',
        logoDataUrl: settings.watermark.logoDataUrl,
        channelName: account.channelTitle || 'NEWSPRESS 24x7',
      });

      // Retrieve registered video clips
      const registeredBlobs = _blobRegistry.get(job.jobId);
      const clips = registeredBlobs?.clips || [];

      // Step 5: Studio Composition & Cloud Run Mastering
      await updateJob('video_mastering', 65, 'Mastering video on Cloud Run (FFmpeg 1080p + Audio Ducking + Ticker)...');

      const { introVideoBlob, outroVideoBlob } = await YouTubeService.getHydratedIntroOutroBlobs();

      const broadcastResult = await VideoCompositorService.composeAndPublishDirectToYouTube({
        mainVideoBlob: clips[0],
        videoClips: clips,
        voiceOverAudioBlob: voiceResult.audioBlob,
        voiceScriptText: editorialPkg.scriptText,
        language: payload.language,
        introVideoBlob,
        outroVideoBlob,
        introVideoUrl: settings.introVideoUrl,
        outroVideoUrl: settings.outroVideoUrl,
        watermarkSettings: settings.watermark,
        newsLocation: payload.newsLocation || job.newsLocation,
        tickerText: payload.tickerText,
        clipDurationMode: payload.clipDurationMode,
        speechRate,
        voiceActorId: activeActor.id,
        voiceActorGoogleVoice: activeActor.googleOriginalVoice,
        emotionalStyle: (payload.emotionalStyle as any) || 'emotional_breaking',
        thumbnailBlob: thumb.blob,
        youtubeTitle: editorialPkg.headlineTitle,
        youtubeDescription: editorialPkg.youtubeDescription,
        youtubeTags: editorialPkg.tags,
        youtubePrivacyStatus: 'public',
        youtubeAccessToken: activeAccessToken,
        youtubeRefreshToken: account.refreshToken,
        youtubeClientId: account.clientId,
        youtubeClientSecret: account.clientSecret,
        onProgress: (_pct, msg) => {
          let clean = msg;
          if (clean.includes('Cloud Run') || clean.includes('FFmpeg')) {
            clean = 'Mastering broadcast package on Cloud Run...';
          }
          updateJob('video_mastering', Math.min(85, Math.max(65, _pct)), clean);
        },
      });

      // Step 6: YouTube Upload Completed, SD Availability Poll
      await updateJob('sd_verification', 90, 'Broadcast transmitted to YouTube! Verifying live SD readiness...');

      let isVerifiedSdReady = false;
      const pollStart = Date.now();
      while (Date.now() - pollStart < 25000) {
        try {
          const ytStatus = await YouTubeService.getVideoProcessingStatus(
            broadcastResult.videoId,
            activeAccessToken
          );
          if (ytStatus.isSdReady || ytStatus.uploadStatus === 'processed' || ytStatus.processingStatus === 'succeeded') {
            isVerifiedSdReady = true;
            break;
          }
        } catch (e) {}
        await new Promise((r) => setTimeout(r, 3000));
      }

      // Step 7: Finalized & Published
      job.status = 'PUBLISHED';
      job.stage = 'published';
      job.progress = 100;
      job.stageMessage = 'Live on YouTube! Ready to watch and share.';
      job.videoId = broadcastResult.videoId;
      job.youtubeUrl = broadcastResult.youtubeUrl;
      job.thumbnailUrl = thumb.dataUrl;
      job.completedAt = new Date().toISOString();

      // Save to official broadcast history
      const newRecord: YouTubeBroadcastRecord = {
        videoId: broadcastResult.videoId,
        youtubeUrl: broadcastResult.youtubeUrl,
        title: broadcastResult.title,
        publishedAt: broadcastResult.publishedAt || new Date().toISOString(),
        thumbnailUrl: thumb.dataUrl,
        location: payload.newsLocation,
        channelTitle: account.channelTitle || 'News Channel',
        voiceActorName: activeActor.teluguName,
        durationMode: payload.clipDurationMode,
        isSdReady: isVerifiedSdReady,
      };
      await YouTubeService.saveBroadcastRecord(newRecord);

      // Clean up blobs
      _blobRegistry.delete(job.jobId);
    } catch (err: any) {
      if (err.message === 'JOB_ABORTED_CANCELLED') {
        console.log(`[YouTubeQueueService] Job ${job.jobId} processing aborted due to cancellation.`);
        return;
      }

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
        job.error = err.message || 'Video composition pipeline failed.';
        job.stageMessage = `Broadcast failed: ${err.message}`;
        job.completedAt = new Date().toISOString();
        _blobRegistry.delete(job.jobId);
      }
    } finally {
      this.recalculateQueuePositions();
      await this.persistJob(job);
      this.notifyListeners();

      // Immediately trigger worker for next queued item
      setTimeout(() => {
        this.processNextInQueue();
      }, 500);
    }
  }

  /**
   * Persists job state to localStorage and Firestore.
   */
  private static async persistJob(job: YouTubeVideoJob): Promise<void> {
    this.saveToStorage();

    if (isFirebaseConfigured && db) {
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
            // If job was previously marked processing before browser crashed/restarted, reset to QUEUED
            if (job.status === 'PROCESSING') {
              job.status = 'QUEUED';
              job.stage = 'queued';
              job.stageMessage = 'Re-queued after browser session restart.';
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

// Auto-initialize on module import
YouTubeQueueService.init();
