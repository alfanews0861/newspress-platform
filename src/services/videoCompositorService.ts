/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Video Compositor Service
 * Assembles broadcast news video using:
 * [Intro Clip] + [User Video Footage + Logo Watermark + AI Voice-Over Audio] + [Outro Clip]
 * Produces final MP4/WebM video ready for YouTube publication.
 */

import { WatermarkSettings } from '../types/youtube';
import { storage } from './firebase';
import { ref, uploadBytesResumable, getDownloadURL, getBlob } from 'firebase/storage';

export interface AdBannerConfig {
  enabled: boolean;
  type: 'video' | 'image' | 'text';
  videoUrl?: string;
  videoBlob?: Blob;
  imageUrl?: string;
  sponsorName?: string;
  headline?: string;
  phoneOrContact?: string;
  tagline?: string;
  durationSec: number;
}

export interface ChannelBannerConfig {
  enabled: boolean;
  type?: 'video' | 'image' | 'text';
  videoUrl?: string;
  videoBlob?: Blob;
  imageUrl?: string;
  channelName?: string;
  tagline?: string;
  youtubeHandle?: string;
  whatsappNumber?: string;
  instagramHandle?: string;
  facebookHandle?: string;
  twitterHandle?: string;
  websiteUrl?: string;
  durationSec: number;
}

export interface HeadlineBannerConfig {
  enabled: boolean;
  headlines: string[];
}

export interface BroadcastBannerSettings {
  enabled: boolean;
  adBanner?: Partial<AdBannerConfig>;
  channelBanner?: Partial<ChannelBannerConfig>;
  headlineBanner?: Partial<HeadlineBannerConfig>;
}

export interface VideoCompositeParams {
  mainVideoBlob?: Blob;
  videoClips?: (Blob | File)[]; // 1 to 3 sequential field footage clips
  voiceOverAudioBlob?: Blob;
  voiceScriptText?: string;
  language?: string;
  introVideoUrl?: string;
  introVideoBlob?: Blob;
  outroVideoUrl?: string;
  outroVideoBlob?: Blob;
  watermarkSettings?: WatermarkSettings;
  newsLocation?: string;
  tickerText?: string;
  broadcastBannerSettings?: BroadcastBannerSettings;
  clipDurationMode?: 'bulletin' | '60s' | '120s' | '300s' | 'full';
  sourceDuration?: number;
  channelTitle?: string;
  speechRate?: number;
  voiceActorId?: string;
  voiceActorGoogleVoice?: string;
  emotionalStyle?: string;
  onProgress?: (percent: number, message: string) => void;
}

export interface CompositedVideoResult {
  videoBlob: Blob;
  videoUrl: string;
  durationSec: number;
  width: number;
  height: number;
}

export interface DirectYouTubePublishParams extends VideoCompositeParams {
  thumbnailBlob?: Blob;
  youtubeTitle: string;
  youtubeDescription: string;
  youtubeTags: string[];
  youtubePrivacyStatus?: 'public' | 'unlisted' | 'private';
  youtubeAccessToken?: string;
  youtubeRefreshToken?: string;
  youtubeClientId?: string;
  youtubeClientSecret?: string;
}

export interface DirectYouTubePublishResult {
  status: 'published';
  videoId: string;
  youtubeUrl: string;
  title: string;
  publishedAt: string;
}

// In-Memory Egress & Bandwidth Protection Registry
const videoUploadCache = new Map<string, { url: string; timestamp: number }>();
const attemptHistory = new Map<string, number[]>();

export class VideoCompositorService {
  /**
   * Clears the video upload cache to force a fresh upload if the user deliberately replaces footage.
   */
  static clearVideoUploadCache(): void {
    videoUploadCache.clear();
  }

  /**
   * Serializes up to 3 video clips, intro, and outro for cloud processing.
   * Large clips (>15MB) are uploaded to Firebase Storage and passed as URLs to eliminate payload limits.
   */
  private static async prepareClipsFormData(
    formData: FormData,
    params: VideoCompositeParams,
    onProgress?: (percent: number, message: string) => void
  ): Promise<void> {
    const clipsToProcess: (Blob | File)[] = [];
    if (params.videoClips && params.videoClips.length > 0) {
      clipsToProcess.push(...params.videoClips.slice(0, 5));
    } else if (params.mainVideoBlob) {
      clipsToProcess.push(params.mainVideoBlob);
    }

    if (clipsToProcess.length === 0) {
      throw new Error('Please provide at least one news video clip.');
    }

    for (let i = 0; i < clipsToProcess.length; i++) {
      const clip = clipsToProcess[i];
      const fileFingerprint = `${clip.size}_${(clip as File).name || 'clip_' + i}_${(clip as File).lastModified || 0}`;
      const now = Date.now();
      const cached = videoUploadCache.get(fileFingerprint);

      if (cached && now - cached.timestamp < 15 * 60 * 1000) {
        console.log(`[VideoCompositorService] Reusing active Cloud Storage URL for clip ${i + 1}:`, cached.url);
        formData.append(`clipUrl_${i}`, cached.url);
        if (i === 0) formData.append('mainVideoUrl', cached.url);
      } else if (clip.size > 15 * 1024 * 1024) {
        if (!storage) {
          throw new Error(`Cloud Storage connection required for clip ${i + 1} (${(clip.size / (1024 * 1024)).toFixed(1)} MB).`);
        }
        const sizeMB = (clip.size / (1024 * 1024)).toFixed(1);
        onProgress?.(12 + i * 8, `Transferring Clip ${i + 1} of ${clipsToProcess.length} (${sizeMB} MB)...`);
        const fileExt = clip.type?.includes('quicktime') ? 'mov' : 'mp4';
        const storageRef = ref(storage, `news_footage/${Date.now()}_clip${i}_${Math.random().toString(36).substring(7)}.${fileExt}`);
        const uploadTask = uploadBytesResumable(storageRef, clip);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            () => {},
            (err) => reject(err),
            async () => {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              videoUploadCache.set(fileFingerprint, { url: downloadUrl, timestamp: Date.now() });
              formData.append(`clipUrl_${i}`, downloadUrl);
              if (i === 0) formData.append('mainVideoUrl', downloadUrl);
              resolve();
            }
          );
        });
      } else {
        formData.append(`clip_${i}`, clip, (clip as File).name || `clip_${i}.mp4`);
        if (i === 0) formData.append('mainVideo', clip, (clip as File).name || 'mainVideo.mp4');
      }
    }

    // Intro & Outro Video Bumpers
    if (params.introVideoUrl && !params.introVideoUrl.startsWith('blob:')) {
      formData.append('introVideoUrl', params.introVideoUrl);
    } else if (params.introVideoBlob) {
      formData.append('introVideo', params.introVideoBlob, 'intro.mp4');
    }

    if (params.outroVideoUrl && !params.outroVideoUrl.startsWith('blob:')) {
      formData.append('outroVideoUrl', params.outroVideoUrl);
    } else if (params.outroVideoBlob) {
      formData.append('outroVideo', params.outroVideoBlob, 'outro.mp4');
    }
  }

  /**
   * Stitches the final broadcast video package.
   * If Google Cloud Run video processing microservice (VITE_VIDEO_PROCESSOR_SERVICE_URL) is configured,
   * dispatches the video assembly to the cloud Linux FFmpeg cluster.
   * Otherwise uses high-speed browser-level compositing.
   */
  static async composeBroadcastVideo(params: VideoCompositeParams): Promise<CompositedVideoResult> {
    const {
      voiceOverAudioBlob,
      voiceScriptText,
      language,
      watermarkSettings,
      clipDurationMode = 'bulletin',
      sourceDuration,
      onProgress,
    } = params;

    const primaryClip = (params.videoClips && params.videoClips[0]) || params.mainVideoBlob;
    if (!primaryClip) {
      throw new Error('Please provide at least one news video clip.');
    }

    // Egress Guard 1: Anti-Loop Circuit Breaker
    // Enforce max 3 attempts per minute per asset to stop runaway loops and accidental egress spikes
    const fileFingerprint = `${primaryClip.size}_${(primaryClip as File).name || 'footage'}_${(primaryClip as File).lastModified || 0}`;
    const now = Date.now();
    const history = (attemptHistory.get(fileFingerprint) || []).filter((t) => now - t < 60000);
    if (history.length >= 3) {
      throw new Error(
        'Egress Protection Guard: Too many compositing attempts (3 within 60s). Please wait 1 minute before retrying to prevent runaway network egress and accidental cloud quota burnout.'
      );
    }
    history.push(now);
    attemptHistory.set(fileFingerprint, history);

    const DIRECT_CLOUD_RUN_URL = 'https://composevideo-vz346mffwa-uc.a.run.app';
    const configuredUrl = (import.meta as any).env?.VITE_VIDEO_PROCESSOR_SERVICE_URL;
    const cloudServiceUrl = configuredUrl || DIRECT_CLOUD_RUN_URL;

    if (cloudServiceUrl) {
      try {
        onProgress?.(10, 'Preparing broadcast studio engine...');
        const formData = new FormData();

        // Prepare sequential multi-clips + bumpers for Cloud processing
        await this.prepareClipsFormData(formData, params, onProgress);

        if (voiceOverAudioBlob) {
          formData.append('voiceAudio', voiceOverAudioBlob, 'voice.mp3');
        }
        if (voiceScriptText) {
          formData.append('voiceScriptText', voiceScriptText);
        }
        if (language) {
          formData.append('language', language);
        }
        if (clipDurationMode) {
          formData.append('clipDurationMode', clipDurationMode);
        }
        if (sourceDuration) {
          formData.append('sourceDuration', Math.round(sourceDuration).toString());
        }
        await this.appendWatermarkAndTickersToFormData(formData, {
          watermarkSettings,
          newsLocation: params.newsLocation,
          tickerText: params.tickerText,
          language: params.language,
          channelTitle: (params as any).channelTitle,
          broadcastBannerSettings: params.broadcastBannerSettings,
          youtubeTitle: (params as any).youtubeTitle,
        });

        if (params.broadcastBannerSettings) {
          formData.append('broadcastBannerSettings', JSON.stringify({
            enabled: params.broadcastBannerSettings.enabled,
            adBanner: {
              enabled: params.broadcastBannerSettings.adBanner?.enabled,
              type: params.broadcastBannerSettings.adBanner?.type,
              videoUrl: params.broadcastBannerSettings.adBanner?.videoUrl,
              sponsorName: params.broadcastBannerSettings.adBanner?.sponsorName,
              headline: params.broadcastBannerSettings.adBanner?.headline,
              phoneOrContact: params.broadcastBannerSettings.adBanner?.phoneOrContact,
              durationSec: params.broadcastBannerSettings.adBanner?.durationSec,
            },
            channelBanner: {
              enabled: params.broadcastBannerSettings.channelBanner?.enabled,
              type: params.broadcastBannerSettings.channelBanner?.type,
              videoUrl: params.broadcastBannerSettings.channelBanner?.videoUrl,
              channelName: params.broadcastBannerSettings.channelBanner?.channelName,
              tagline: params.broadcastBannerSettings.channelBanner?.tagline,
              youtubeHandle: params.broadcastBannerSettings.channelBanner?.youtubeHandle,
              whatsappNumber: params.broadcastBannerSettings.channelBanner?.whatsappNumber,
              durationSec: params.broadcastBannerSettings.channelBanner?.durationSec,
            },
            headlineBanner: params.broadcastBannerSettings.headlineBanner,
          }));

          if (params.broadcastBannerSettings.adBanner?.videoBlob) {
            formData.append('adBannerVideo', params.broadcastBannerSettings.adBanner.videoBlob, 'ad_leaderboard.mp4');
          }
          if (params.broadcastBannerSettings.channelBanner?.videoBlob) {
            formData.append('channelBannerVideo', params.broadcastBannerSettings.channelBanner.videoBlob, 'channel_promo.mp4');
          }
        }

        const timeoutMs = clipDurationMode === 'full' ? 520000 : 180000;
        const progressMsg = clipDurationMode === 'full'
          ? `Mastering complete news broadcast package (${Math.round(sourceDuration || 0)}s)...`
          : 'Mastering broadcast package with studio narration and channel watermark...';
        onProgress?.(45, progressMsg);
        const endpoint = cloudServiceUrl;

        const resp = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (resp.ok) {
          onProgress?.(85, 'Master broadcast video assembled successfully.');
          const contentType = resp.headers.get('content-type') || '';
          let processedBlob: Blob;
          let videoUrl: string;

          if (contentType.includes('application/json')) {
            const jsonResp = await resp.json();
            if (jsonResp.videoUrl || jsonResp.remotePath) {
              videoUrl = jsonResp.videoUrl || '';
              onProgress?.(88, 'Loading master broadcast package...');

              // Primary: Native Firebase Client SDK getBlob bypasses browser CORS limits completely
              if (storage && jsonResp.remotePath) {
                try {
                  const storageFileRef = ref(storage, jsonResp.remotePath);
                  processedBlob = await getBlob(storageFileRef);
                  if (!videoUrl) {
                    videoUrl = URL.createObjectURL(processedBlob);
                  }
                } catch (sdkErr: any) {
                  console.warn('Firebase getBlob fallback, attempting direct fetch:', sdkErr);
                  const dlResp = await fetch(jsonResp.videoUrl);
                  if (!dlResp.ok) {
                    throw new Error(`Cloud Storage download failed with HTTP ${dlResp.status}: ${await dlResp.text().catch(() => '')}`);
                  }
                  processedBlob = await dlResp.blob();
                }
              } else {
                const dlResp = await fetch(jsonResp.videoUrl);
                if (!dlResp.ok) {
                  throw new Error(`Cloud Storage download failed with HTTP ${dlResp.status}: ${await dlResp.text().catch(() => '')}`);
                }
                processedBlob = await dlResp.blob();
              }
            } else {
              throw new Error(jsonResp.error || 'Cloud processor returned invalid response payload');
            }
          } else {
            processedBlob = await resp.blob();
            videoUrl = URL.createObjectURL(processedBlob);
          }

          return {
            videoBlob: processedBlob,
            videoUrl,
            durationSec: 25,
            width: 1920,
            height: 1080,
          };
        } else {
          const errText = await resp.text().catch(() => '');
          throw new Error(`Cloud video processor failed with HTTP ${resp.status}: ${errText.slice(0, 150)}`);
        }
      } catch (cloudErr: any) {
        console.error('Cloud video processing exception:', cloudErr);
        // Do not silently hang in browser canvas if cloud failed; report clear actionable error
        throw new Error(
          `Video compositing error: ${cloudErr?.message || 'Failed to composite video on Cloud Run'}. Please retry.`
        );
      }
    }

    onProgress?.(5, 'Preparing media assets and broadcast timelines...');

    const mainVideoUrl = URL.createObjectURL(primaryClip);
    const mainVideoEl = await this.loadVideoElement(mainVideoUrl);

    const width = 1920;
    const height = 1080;
    const fps = 30;

    // Load watermark logo image if configured
    let watermarkImg: HTMLImageElement | null = null;
    if (watermarkSettings?.logoDataUrl || watermarkSettings?.logoUrl) {
      try {
        watermarkImg = await this.loadImage(watermarkSettings.logoDataUrl || watermarkSettings.logoUrl!);
      } catch (err) {
        console.warn('Could not load watermark image:', err);
      }
    }

    onProgress?.(20, 'Configuring audio mixing and voice-over tracks...');

    // Setup Audio Context for mixing VO Audio and Background Video Audio
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    const destNode = audioCtx.createMediaStreamDestination();

    // Load and play VO audio if present
    let voBuffer: AudioBuffer | null = null;
    if (voiceOverAudioBlob) {
      try {
        const arrayBuf = await voiceOverAudioBlob.arrayBuffer();
        voBuffer = await audioCtx.decodeAudioData(arrayBuf);
        const voSource = audioCtx.createBufferSource();
        voSource.buffer = voBuffer;
        const voGain = audioCtx.createGain();
        voGain.gain.value = 1.0;
        voSource.connect(voGain);
        voGain.connect(destNode);
        voSource.start(0);
      } catch (e) {
        console.warn('Failed to decode voice-over audio in mixer:', e);
      }
    }

    // Connect main video audio (with slight ducking if VO exists)
    try {
      const vidSource = audioCtx.createMediaElementSource(mainVideoEl);
      const vidGain = audioCtx.createGain();
      vidGain.gain.value = voBuffer ? 0.0 : 0.9; // 0% background footage sound when VO speaks
      vidSource.connect(vidGain);
      vidGain.connect(destNode);
    } catch (e) {
      // Already attached or no audio track
    }

    onProgress?.(40, 'Rendering video frames with logo watermark & graphics...');

    // Canvas Compositor
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // MediaRecorder on Canvas Stream + Mixed Audio Stream
    const canvasStream = canvas.captureStream(fps);
    const combinedTracks = [
      ...canvasStream.getVideoTracks(),
      ...destNode.stream.getAudioTracks(),
    ];
    const combinedStream = new MediaStream(combinedTracks);

    const mimeType = this.getSupportedMimeType();
    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 6000000, // 6 Mbps 1080p broadcast quality
    });

    const recordedChunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    // Cap broadcast video package to 25-30s bulletin duration for snappy processing
    const targetDurationSec = Math.min(25, Math.max(8, mainVideoEl.duration || 20));

    return new Promise(async (resolve, reject) => {
      mediaRecorder.onstop = () => {
        onProgress?.(95, 'Finalizing video package container...');
        const finalBlob = new Blob(recordedChunks, { type: 'video/mp4' });
        const finalUrl = URL.createObjectURL(finalBlob);

        audioCtx.close().catch(() => {});
        URL.revokeObjectURL(mainVideoUrl);

        onProgress?.(100, 'Video assembly complete!');
        resolve({
          videoBlob: finalBlob,
          videoUrl: finalUrl,
          durationSec: targetDurationSec,
          width,
          height,
        });
      };

      mediaRecorder.onerror = (err) => {
        audioCtx.close().catch(() => {});
        URL.revokeObjectURL(mainVideoUrl);
        reject(err);
      };

      mediaRecorder.start(250);
      mainVideoEl.currentTime = 0;
      await mainVideoEl.play().catch(() => {});

      let startTime = performance.now();
      let animFrameId: number;

      const renderLoop = () => {
        const elapsedSec = (performance.now() - startTime) / 1000;
        const progress = Math.min(90, Math.round(40 + (elapsedSec / targetDurationSec) * 50));
        onProgress?.(progress, `Compositing broadcast frame sequence (${Math.round(elapsedSec)}s / ${Math.round(targetDurationSec)}s)...`);

        // 1. Draw Main Video Frame
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        if (mainVideoEl.videoWidth > 0) {
          this.drawContainOrCover(ctx, mainVideoEl, width, height);
        }

        // 2. Draw Channel Watermark Logo if present
        if (watermarkImg && watermarkSettings) {
          this.drawWatermark(ctx, watermarkImg, watermarkSettings, width, height);
        }

        // 3. Optional TV News Lower-Third / Live Ticker Bar
        this.drawBroadcastBug(ctx, width, height);

        // 4. TV News Bottom Scrolling News Ticker
        if (params.tickerText?.trim()) {
          this.drawNewsTicker(ctx, width, height, params.tickerText.trim(), elapsedSec, params.language);
        }

        if (elapsedSec < targetDurationSec && !mainVideoEl.ended) {
          animFrameId = requestAnimationFrame(renderLoop);
        } else {
          cancelAnimationFrame(animFrameId);
          mainVideoEl.pause();
          mediaRecorder.stop();
        }
      };

      renderLoop();
    });
  }

  /**
   * Complete Autonomous Server-Side Broadcast:
   * Dispatches footage, manuscript, and YouTube credentials directly to Cloud Run.
   * Cloud Run synthesizes 24kHz AI voice-over, composites 1080p video with watermark & ducking,
   * and uploads directly to YouTube Data API v3 over Google's internal datacenter fiber!
   * ZERO video downloads to browser, ZERO video uploads from browser, zero client bandwidth!
   */
  static async composeAndPublishDirectToYouTube(
    params: DirectYouTubePublishParams
  ): Promise<DirectYouTubePublishResult> {
    const {
      mainVideoBlob,
      voiceOverAudioBlob,
      voiceScriptText,
      language,
      watermarkSettings,
      clipDurationMode = 'bulletin',
      sourceDuration,
      thumbnailBlob,
      youtubeTitle,
      youtubeDescription,
      youtubeTags,
      youtubePrivacyStatus = 'public',
      youtubeAccessToken,
      youtubeRefreshToken,
      youtubeClientId,
      youtubeClientSecret,
      onProgress,
    } = params;

    const DIRECT_CLOUD_RUN_URL = 'https://composevideo-vz346mffwa-uc.a.run.app';
    const configuredUrl = (import.meta as any).env?.VITE_VIDEO_PROCESSOR_SERVICE_URL;
    const cloudServiceUrl = configuredUrl || DIRECT_CLOUD_RUN_URL;

    onProgress?.(10, 'Preparing broadcast payload for Cloud Run Server...');

    const formData = new FormData();

    // Prepare sequential multi-clips + bumpers for Cloud processing
    await this.prepareClipsFormData(formData, params, onProgress);

    if (voiceOverAudioBlob) formData.append('voiceAudio', voiceOverAudioBlob, 'voice.mp3');
    if (voiceScriptText) formData.append('voiceScriptText', voiceScriptText);
    if (language) formData.append('language', language);
    if (clipDurationMode) formData.append('clipDurationMode', clipDurationMode);
    if (sourceDuration) formData.append('sourceDuration', Math.round(sourceDuration).toString());
    await this.appendWatermarkAndTickersToFormData(formData, {
      watermarkSettings,
      newsLocation: params.newsLocation,
      tickerText: params.tickerText,
      language,
      channelTitle: (params as any).channelTitle,
      broadcastBannerSettings: params.broadcastBannerSettings,
      youtubeTitle,
    });

    // Direct YouTube Broadcast Parameters
    formData.append('directPublish', 'true');
    formData.append('youtubeTitle', youtubeTitle);
    formData.append('youtubeDescription', youtubeDescription);
    formData.append('youtubeTags', JSON.stringify(youtubeTags || []));
    formData.append('youtubePrivacyStatus', youtubePrivacyStatus);
    if (youtubeAccessToken) formData.append('youtubeAccessToken', youtubeAccessToken);
    if (youtubeRefreshToken) formData.append('youtubeRefreshToken', youtubeRefreshToken);
    if (youtubeClientId) formData.append('youtubeClientId', youtubeClientId);
    if (youtubeClientSecret) formData.append('youtubeClientSecret', youtubeClientSecret);
    if (thumbnailBlob) formData.append('youtubeThumbnail', thumbnailBlob, 'thumbnail.jpg');

    onProgress?.(45, 'Mastering broadcast package with anchor narration and preparing transmission...');

    const timeoutMs = 660000; // 11 minutes to safely accommodate 10-minute speech packages without client timeout
    try {
      const resp = await fetch(cloudServiceUrl, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.status === 'published' && data.videoId) {
          onProgress?.(100, 'Published directly to YouTube broadcast channel!');
          return {
            status: 'published',
            videoId: data.videoId,
            youtubeUrl: data.youtubeUrl || `https://www.youtube.com/watch?v=${data.videoId}`,
            title: data.title || youtubeTitle,
            publishedAt: data.publishedAt || new Date().toISOString(),
          };
        }
        throw new Error(data.error || 'Server broadcast completed without valid YouTube Video ID');
      } else {
        const errText = await resp.text().catch(() => '');
        throw new Error(`Server broadcast failed with HTTP ${resp.status}: ${errText.slice(0, 200)}`);
      }
    } catch (publishErr: any) {
      console.error('Direct server-side YouTube broadcast error:', publishErr);
      throw new Error(`Broadcast transmission error: ${publishErr?.message || 'Failed to publish to YouTube'}. Please retry.`);
    }
  }

  private static drawContainOrCover(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    canvasW: number,
    canvasH: number
  ) {
    const vW = video.videoWidth;
    const vH = video.videoHeight;
    const vRatio = vW / vH;
    const cRatio = canvasW / canvasH;

    let dW = canvasW;
    let dH = canvasH;
    let dX = 0;
    let dY = 0;

    if (vRatio > cRatio) {
      dH = canvasW / vRatio;
      dY = (canvasH - dH) / 2;
    } else {
      dW = canvasH * vRatio;
      dX = (canvasW - dW) / 2;
    }

    ctx.drawImage(video, dX, dY, dW, dH);
  }

  private static drawWatermark(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    settings: WatermarkSettings,
    canvasW: number,
    canvasH: number
  ) {
    ctx.save();
    ctx.globalAlpha = Math.max(0.2, Math.min(1.0, (settings.opacityPercent || 90) / 100));

    const scale = Math.max(0.1, Math.min(0.35, (settings.scalePercent || 18) / 100));
    const targetW = canvasW * scale;
    const targetH = (img.height / img.width) * targetW;

    const padX = settings.offsetX || 40;
    const padY = settings.offsetY || 40;

    let posX = canvasW - targetW - padX;
    let posY = padY;

    if (settings.placement === 'top-left') {
      posX = padX;
      posY = padY;
    } else if (settings.placement === 'bottom-right') {
      posX = canvasW - targetW - padX;
      posY = canvasH - targetH - padY - 80;
    } else if (settings.placement === 'bottom-left') {
      posX = padX;
      posY = canvasH - targetH - padY - 80;
    }

    // Shadow backdrop for high visibility on any footage
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 12;

    ctx.drawImage(img, posX, posY, targetW, targetH);
    ctx.restore();
  }

  private static drawBroadcastBug(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number) {
    ctx.save();
    // Live Red Dot in Top Corner
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(60, 60, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('LIVE REPORT', 82, 68);
    ctx.restore();
  }

  /**
   * Resolves broadcast typography for news ticker crawls:
   * - Telugu: Ramabhadra (strictly normal weight 400 without synthetic bolding, with enlarged font size for crystal-clear readability)
   * - Other Indian & International languages: Ramabhadra-like bold, impactful broadcast display fonts:
   *   - Hindi/Marathi/Devanagari: Khand / Mukta (exact broadcast equivalent to Ramabhadra)
   *   - Tamil: Catamaran / Pavanam
   *   - Kannada: Noto Sans Kannada
   *   - Malayalam: Manjari
   *   - Bengali: Hind Siliguri
   *   - Gujarati: Mukta Vaani
   *   - Punjabi: Mukta Mahee
   *   - Odia: Noto Sans Oriya
   *   - English/Universal: Khand / Cinzel / Roboto
   */
  static getTickerCrawlFont(text: string, language?: string, fontSize: number = 32): string {
    const isTelugu = /[\u0C00-\u0C7F]/.test(text) || language === 'te';
    if (isTelugu) {
      // Ramabhadra: strictly normal 400 weight (no bolding) with larger font size for sharp, un-smudged Telugu glyphs
      const teluguSize = Math.round(fontSize * 1.25);
      return `normal ${teluguSize}px "Ramabhadra", "Noto Sans Telugu", "Gautami", sans-serif`;
    }
    const isDevanagari = /[\u0900-\u097F]/.test(text) || language === 'hi' || language === 'mr';
    if (isDevanagari) {
      return `600 ${fontSize + 2}px "Khand", "Mukta", "Noto Sans Devanagari", sans-serif`;
    }
    const isTamil = /[\u0B80-\u0BFF]/.test(text) || language === 'ta';
    if (isTamil) {
      return `600 ${fontSize}px "Catamaran", "Pavanam", "Noto Sans Tamil", sans-serif`;
    }
    const isKannada = /[\u0C80-\u0CFF]/.test(text) || language === 'kn';
    if (isKannada) {
      return `600 ${fontSize}px "Noto Sans Kannada", sans-serif`;
    }
    const isMalayalam = /[\u0D00-\u0D7F]/.test(text) || language === 'ml';
    if (isMalayalam) {
      return `600 ${fontSize}px "Manjari", "Noto Sans Malayalam", sans-serif`;
    }
    const isBengali = /[\u0980-\u09FF]/.test(text) || language === 'bn';
    if (isBengali) {
      return `600 ${fontSize + 1}px "Hind Siliguri", "Noto Sans Bengali", sans-serif`;
    }
    const isGujarati = /[\u0A80-\u0AFF]/.test(text) || language === 'gu';
    if (isGujarati) {
      return `600 ${fontSize}px "Mukta Vaani", "Noto Sans Gujarati", sans-serif`;
    }
    const isPunjabi = /[\u0A00-\u0A7F]/.test(text) || language === 'pa';
    if (isPunjabi) {
      return `600 ${fontSize}px "Mukta Mahee", "Noto Serif Gurmukhi", sans-serif`;
    }
    const isOdia = /[\u0B00-\u0B7F]/.test(text) || language === 'or';
    if (isOdia) {
      return `600 ${fontSize}px "Noto Sans Oriya", "Noto Serif Oriya", sans-serif`;
    }

    // English / Universal: Khand is a bold, condensed broadcast display font matching Ramabhadra
    return `600 ${fontSize + 2}px "Khand", "Cinzel", "Roboto", "Arial Black", sans-serif`;
  }

  /**
   * Resolves broadcast typography for news headline straps:
   * - Telugu: Ramaraja Google Font (large serif, high contrast, elegant Telugu typography)
   * - Hindi/Devanagari: Rozha One / Yatra One / Mukta
   * - Universal: Cinzel / Playfair Display / Roboto
   */
  static getHeadlineFont(text: string, language?: string, fontSize: number = 44): string {
    const isTelugu = /[\u0C00-\u0C7F]/.test(text) || language === 'te';
    if (isTelugu) {
      return `normal ${fontSize}px "Ramaraja", "Noto Serif Telugu", "Peddana", serif`;
    }
    const isDevanagari = /[\u0900-\u097F]/.test(text) || language === 'hi' || language === 'mr';
    if (isDevanagari) {
      return `600 ${fontSize}px "Rozha One", "Yatra One", "Noto Serif Devanagari", serif`;
    }
    return `700 ${fontSize}px "Cinzel", "Playfair Display", "Roboto", serif`;
  }

  /**
   * Draws a professional 2-tier TV News Broadcast Lower-Third:
   * Tier 1 (Top, 80px): Breaking News Ticker Crawler (raised up, smooth horizontal scrolling, increased size)
   * Tier 2 (Bottom, 160px, Double Height): Rotating Multi-Banner:
   *   - 1. Advertisement Banner (User commercial / Google Ads leaderboard video or text)
   *   - 2. Own Channel & Social Media Banner (YouTube, WhatsApp, Instagram handles)
   *   - 3. Today's Headlines Banner (Blue gradient, Ramaraja font in Telugu, white text, large size, zoom in/out animation, 4x Ad duration!)
   */
  private static drawNewsTicker(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    tickerText?: string,
    elapsedSec: number = 0,
    language?: string,
    bannerSettings?: BroadcastBannerSettings
  ) {
    const rawText = tickerText?.trim() || 'తాజా వార్తలు';

    ctx.save();
    // Tier 1: Ticker height = 80px (raised up)
    const tickerH = 80;
    // Tier 2: Lower banner height = 160px (double the size of news ticker!)
    const bannerH = tickerH * 2;
    const totalH = tickerH + bannerH; // 240px
    const tickerY = canvasH - totalH; // e.g. 1080 - 240 = 840
    const bannerY = canvasH - bannerH; // e.g. 1080 - 160 = 920

    // ==========================================
    // TIER 1: NEWS TICKER CRAWLER (TOP STRAP)
    // ==========================================

    // 1. Ticker Background Bar (Deep TV News Red Gradient)
    const bgGrad = ctx.createLinearGradient(0, tickerY, canvasW, tickerY + tickerH);
    bgGrad.addColorStop(0, '#7f1d1d');
    bgGrad.addColorStop(0.25, '#991b1b');
    bgGrad.addColorStop(0.7, '#b91c1c');
    bgGrad.addColorStop(1, '#6b1212');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, tickerY, canvasW, tickerH);

    // Top golden accent ribbon
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, tickerY, canvasW, 3.5);

    // 2. Left "BREAKING NEWS" / "తాజా వార్తలు" Badge
    const badgeWidth = 270;
    const badgeGrad = ctx.createLinearGradient(0, tickerY, badgeWidth, tickerY + tickerH);
    badgeGrad.addColorStop(0, '#450a0a');
    badgeGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = badgeGrad;
    ctx.beginPath();
    ctx.moveTo(0, tickerY);
    ctx.lineTo(badgeWidth, tickerY);
    ctx.lineTo(badgeWidth - 20, tickerY + tickerH);
    ctx.lineTo(0, tickerY + tickerH);
    ctx.closePath();
    ctx.fill();

    // Golden separator line on angled edge of badge
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(badgeWidth, tickerY);
    ctx.lineTo(badgeWidth - 20, tickerY + tickerH);
    ctx.stroke();

    // Flashing Live Indicator Dot on Badge (Golden/Yellow pulse)
    const pulse = (Math.sin(elapsedSec * 4) + 1) / 2;
    ctx.fillStyle = pulse > 0.4 ? '#fef08a' : '#f87171';
    ctx.beginPath();
    ctx.arc(32, tickerY + tickerH / 2, 7, 0, Math.PI * 2);
    ctx.fill();

    // Badge Text in Ramabhadra for Telugu, Khand for others
    ctx.fillStyle = '#ffffff';
    const isTelugu = !language || language === 'te' || /[\u0C00-\u0C7F]/.test(rawText);
    const badgeTitle = isTelugu ? 'తాజా వార్తలు' : 'BREAKING NEWS';
    ctx.font = isTelugu
      ? 'normal 26px "Ramabhadra", "Noto Sans Telugu", sans-serif'
      : '700 22px "Khand", "Cinzel", "Roboto", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeTitle, 52, tickerY + tickerH / 2 + 1);

    // 3. Scrolling Headlines Ticker Crawl: enlarged font size, smooth crawl
    ctx.save();
    ctx.beginPath();
    ctx.rect(badgeWidth + 10, tickerY, canvasW - badgeWidth - 20, tickerH);
    ctx.clip();

    ctx.font = this.getTickerCrawlFont(rawText, language, 34);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;

    const textMetrics = ctx.measureText(rawText);
    const textWidth = textMetrics.width;
    const crawlAreaWidth = canvasW - badgeWidth - 20;

    const speed = 75;
    const loopWidth = textWidth + crawlAreaWidth + 200;
    const totalDistance = elapsedSec * speed;
    const currentOffset = totalDistance % loopWidth;
    const posX = canvasW - currentOffset;

    ctx.fillText(rawText, posX, tickerY + tickerH / 2 + 2);
    if (posX + textWidth < canvasW) {
      ctx.fillText(rawText, posX + textWidth + 160, tickerY + tickerH / 2 + 2);
    }
    ctx.restore();

    // ==========================================
    // TIER 2: DOUBLE-SIZE ROTATING MULTI-BANNER
    // (Advertisement -> Own Channel/Social -> Blue Headlines with Zoom In/Out)
    // Headlines gets 4x more time than Ad banner!
    // ==========================================

    // Golden divider ribbon between Ticker and Banner
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, bannerY, canvasW, 2.5);

    const adDur = Math.max(3, bannerSettings?.adBanner?.durationSec || 5);
    const chanDur = Math.max(3, bannerSettings?.channelBanner?.durationSec || 5);
    const headlineDur = adDur * 4; // Exactly 4 inthalu (4x) more time!
    const cycleTotal = adDur + chanDur + headlineDur;
    const cycleTime = elapsedSec % cycleTotal;

    if (cycleTime < adDur) {
      // ----------------------------------------
      // 1. ADVERTISEMENT BANNER (ప్రాకటన బ్యానర్)
      // ----------------------------------------
      const adBgGrad = ctx.createLinearGradient(0, bannerY, canvasW, canvasH);
      adBgGrad.addColorStop(0, '#2d1502');
      adBgGrad.addColorStop(0.3, '#78350f');
      adBgGrad.addColorStop(0.7, '#92400e');
      adBgGrad.addColorStop(1, '#2d1502');
      ctx.fillStyle = adBgGrad;
      ctx.fillRect(0, bannerY, canvasW, bannerH);

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, canvasH - 3, canvasW, 3);

      // Left Sponsor Badge
      const adBadgeW = 340;
      const adBadgeGrad = ctx.createLinearGradient(0, bannerY, adBadgeW, canvasH);
      adBadgeGrad.addColorStop(0, '#451a03');
      adBadgeGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = adBadgeGrad;
      ctx.beginPath();
      ctx.moveTo(0, bannerY);
      ctx.lineTo(adBadgeW, bannerY);
      ctx.lineTo(adBadgeW - 25, canvasH);
      ctx.lineTo(0, canvasH);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(adBadgeW, bannerY);
      ctx.lineTo(adBadgeW - 25, canvasH);
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textBaseline = 'top';
      const isAdVideo = bannerSettings?.adBanner?.type === 'video';
      ctx.fillText(isAdVideo ? '✦ SPONSORED MP4 ✦' : '✦ SPONSORED ✦', 36, bannerY + 36);
      ctx.fillStyle = '#ffffff';
      ctx.font = isTelugu
        ? 'normal 30px "Ramabhadra", sans-serif'
        : 'bold 26px "Khand", sans-serif';
      ctx.fillText(isTelugu ? 'వాణిజ్య ప్రకటన' : 'ADVERTISEMENT', 36, bannerY + 74);

      // Sponsor Content
      const sponsor = bannerSettings?.adBanner?.sponsorName || 'సురక్ష ఆటోమోటివ్స్ & సర్వీసెస్';
      const adHeadline = bannerSettings?.adBanner?.headline || 'దసరా & దీపావళి ప్రత్యేక ఆఫర్ - 30% డిస్కౌంట్!';
      const adContact = bannerSettings?.adBanner?.phoneOrContact || '📞 ప్రకటనల కొరకు: +91 98480 12345';

      ctx.fillStyle = '#fef08a';
      ctx.font = isTelugu
        ? 'normal 34px "Ramabhadra", sans-serif'
        : 'bold 30px system-ui, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(sponsor, adBadgeW + 30, bannerY + 28);

      ctx.fillStyle = '#ffffff';
      ctx.font = isTelugu
        ? 'normal 38px "Ramaraja", "Noto Serif Telugu", serif'
        : 'bold 32px system-ui, sans-serif';
      ctx.fillText(adHeadline, adBadgeW + 30, bannerY + 76);

      ctx.fillStyle = '#fef3c7';
      ctx.font = '600 24px system-ui, sans-serif';
      ctx.fillText(adContact, adBadgeW + 30, bannerY + 120);

    } else if (cycleTime < adDur + chanDur) {
      // ----------------------------------------
      // 2. OWN CHANNEL & SOCIAL BANNER (స్వంత ఛానెల్ & సోషల్ మీడియా)
      // ----------------------------------------
      const chanBgGrad = ctx.createLinearGradient(0, bannerY, canvasW, canvasH);
      chanBgGrad.addColorStop(0, '#0f172a');
      chanBgGrad.addColorStop(0.35, '#1e1b4b');
      chanBgGrad.addColorStop(0.7, '#2e1065');
      chanBgGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = chanBgGrad;
      ctx.fillRect(0, bannerY, canvasW, bannerH);

      ctx.fillStyle = '#a855f7';
      ctx.fillRect(0, canvasH - 3, canvasW, 3);

      const chanBadgeW = 340;
      const chanBadgeGrad = ctx.createLinearGradient(0, bannerY, chanBadgeW, canvasH);
      chanBadgeGrad.addColorStop(0, '#1e1b4b');
      chanBadgeGrad.addColorStop(1, '#3b0764');
      ctx.fillStyle = chanBadgeGrad;
      ctx.beginPath();
      ctx.moveTo(0, bannerY);
      ctx.lineTo(chanBadgeW, bannerY);
      ctx.lineTo(chanBadgeW - 25, canvasH);
      ctx.lineTo(0, canvasH);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(chanBadgeW, bannerY);
      ctx.lineTo(chanBadgeW - 25, canvasH);
      ctx.stroke();

      ctx.fillStyle = '#e9d5ff';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textBaseline = 'top';
      const isChanVideo = bannerSettings?.channelBanner?.type === 'video';
      ctx.fillText(isChanVideo ? '✦ OFFICIAL MP4 ✦' : '✦ DIGITAL NETWORK ✦', 36, bannerY + 36);
      ctx.fillStyle = '#ffffff';
      ctx.font = isTelugu
        ? 'normal 30px "Ramabhadra", sans-serif'
        : 'bold 26px "Khand", sans-serif';
      ctx.fillText(isTelugu ? 'మా ఛానెల్ లింక్స్' : 'OUR CHANNELS', 36, bannerY + 74);

      const channelTitle = bannerSettings?.channelBanner?.channelName || 'NewsPress 24x7 Digital Network';
      const tagline = bannerSettings?.channelBanner?.tagline || 'నిష్పక్షపాత వార్తలు • ఎప్పటికప్పుడు తాజా సమాచారం';
      const yt = bannerSettings?.channelBanner?.youtubeHandle || '@NewsPressOfficial';
      const wa = bannerSettings?.channelBanner?.whatsappNumber || '+91 98765 43210';

      ctx.fillStyle = '#ffffff';
      ctx.font = isTelugu
        ? 'normal 36px "Ramabhadra", sans-serif'
        : 'bold 32px system-ui, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(channelTitle, chanBadgeW + 30, bannerY + 28);

      ctx.fillStyle = '#c084fc';
      ctx.font = isTelugu
        ? 'normal 26px "Noto Sans Telugu", sans-serif'
        : '500 24px system-ui, sans-serif';
      ctx.fillText(tagline, chanBadgeW + 30, bannerY + 74);

      // Social Badges / Pills
      ctx.fillStyle = '#ef4444'; // YouTube red
      ctx.beginPath();
      ctx.roundRect(chanBadgeW + 30, bannerY + 112, 260, 36, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(`▶ YouTube: ${yt}`, chanBadgeW + 44, bannerY + 130);

      ctx.fillStyle = '#16a34a'; // WhatsApp green
      ctx.beginPath();
      ctx.roundRect(chanBadgeW + 310, bannerY + 112, 280, 36, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(`💬 WhatsApp: ${wa}`, chanBadgeW + 324, bannerY + 130);

    } else {
      // ----------------------------------------
      // 3. TODAY'S HEADLINES BANNER (BLUE GRADIENT, RAMARAJA FONT, ZOOM IN/OUT ANIMATION)
      // Displays for 4x time of Ad banner!
      // ----------------------------------------
      const timeInHeadline = cycleTime - (adDur + chanDur);

      // "ee news vachhetappudu background Blue gradient vundaali"
      const blueGrad = ctx.createLinearGradient(0, bannerY, canvasW, canvasH);
      blueGrad.addColorStop(0, '#061738');
      blueGrad.addColorStop(0.25, '#1e40af'); // Royal news blue
      blueGrad.addColorStop(0.7, '#1d4ed8');  // Vibrant broadcast blue
      blueGrad.addColorStop(1, '#071530');
      ctx.fillStyle = blueGrad;
      ctx.fillRect(0, bannerY, canvasW, bannerH);

      // Golden bottom accent border
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(0, canvasH - 3, canvasW, 3);

      // Left Headlines Badge
      const headBadgeW = 340;
      const headBadgeGrad = ctx.createLinearGradient(0, bannerY, headBadgeW, canvasH);
      headBadgeGrad.addColorStop(0, '#0f172a');
      headBadgeGrad.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = headBadgeGrad;
      ctx.beginPath();
      ctx.moveTo(0, bannerY);
      ctx.lineTo(headBadgeW, bannerY);
      ctx.lineTo(headBadgeW - 25, canvasH);
      ctx.lineTo(0, canvasH);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(headBadgeW, bannerY);
      ctx.lineTo(headBadgeW - 25, canvasH);
      ctx.stroke();

      // Flashing Cyan Dot
      const bluePulse = (Math.sin(elapsedSec * 5) + 1) / 2;
      ctx.fillStyle = bluePulse > 0.4 ? '#38bdf8' : '#93c5fd';
      ctx.beginPath();
      ctx.arc(36, bannerY + 48, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText('✦ HEADLINES ✦', 56, bannerY + 36);

      ctx.fillStyle = '#ffffff';
      ctx.font = isTelugu
        ? 'normal 34px "Ramabhadra", sans-serif'
        : 'bold 30px "Khand", sans-serif';
      ctx.fillText(isTelugu ? 'నేటి ముఖ్యాంశాలు' : 'TODAY HEADLINES', 36, bannerY + 76);

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText('LIVE FLASH ✦ 4X DURATION', 36, bannerY + 120);

      // Headlines List & Zoom In/Out Animation
      const defaultHeadlines = [
        'ఇస్రో చారిత్రక మైలురాయి: గగన్‌యాన్ మానవసహిత మిషన్ తుది భూ పరీక్షలు విజయవంతం',
        'భారత నౌకాదళంలోకి స్వదేశీ అణు జలాంతర్గామి ఐఎన్ఎస్ అరిఘాట్ చేరిక',
        'అమరావతి ప్రజా రాజధాని పునర్నిర్మాణ పనులకు శరవేగ శ్రీకారం: ప్రపంచ స్థాయి మౌలిక వసతులు',
      ];
      const headlines = (bannerSettings?.headlineBanner?.headlines && bannerSettings.headlineBanner.headlines.length > 0)
        ? bannerSettings.headlineBanner.headlines
        : defaultHeadlines;

      const itemsCount = Math.min(headlines.length, 3);
      const durPerItem = headlineDur / itemsCount; // e.g. 20s / 3 = 6.66s per headline
      const itemIdx = Math.floor(timeInHeadline / durPerItem) % headlines.length;
      const currentHeadline = headlines[itemIdx];

      const itemTime = timeInHeadline % durPerItem;
      const progress = itemTime / durPerItem; // 0 to 1

      // Zoom in / Zoom out animation calculation:
      let scale = 1.0;
      let opacity = 1.0;
      if (progress < 0.15) {
        // Zoom in from 0.82 to 1.0
        const t = progress / 0.15;
        scale = 0.82 + 0.18 * t;
        opacity = t;
      } else if (progress > 0.85) {
        // Zoom out from 1.02 to 1.15 and fade
        const t = (progress - 0.85) / 0.15;
        scale = 1.02 + 0.13 * t;
        opacity = 1 - t;
      } else {
        // Subtle drift from 1.0 to 1.02
        const t = (progress - 0.15) / 0.7;
        scale = 1.0 + 0.02 * t;
        opacity = 1.0;
      }

      // Draw Animated Headline Text with Ramaraja Font for Telugu
      const clipX = headBadgeW + 20;
      const clipW = canvasW - clipX - 30;
      const centerY = bannerY + bannerH / 2;
      const centerX = clipX + clipW / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(clipX, bannerY, clipW, bannerH);
      ctx.clip();

      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);
      ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

      // "aksharaalu white color lo vundaali , news telugu ayithe font ramaraja vundaali , pedda size vundaali"
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 8;
      ctx.textBaseline = 'middle';

      const isHeadlineTelugu = /[\u0C00-\u0C7F]/.test(currentHeadline) || isTelugu;
      ctx.font = this.getHeadlineFont(currentHeadline, language, isHeadlineTelugu ? 48 : 38);

      // Measure and center/fit text cleanly
      const textW = ctx.measureText(currentHeadline).width;
      if (textW <= clipW) {
        ctx.fillText(currentHeadline, clipX + (clipW - textW) / 2, centerY);
      } else {
        ctx.font = this.getHeadlineFont(currentHeadline, language, isHeadlineTelugu ? 40 : 32);
        ctx.fillText(currentHeadline, clipX, centerY);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Generates a unified high-resolution broadcast TV news 2-tier bottom strap graphic:
   * 1. Top Tier (80px): Breaking News badge on left & TV News Red Gradient ticker bar
   * 2. Bottom Tier (160px - Double Size): Rotating Multi-Banner / Blue Gradient Ramaraja Headlines
   */
  static async composeTickerOverlay(params: {
    tickerText: string;
    language?: string;
    badgeText?: string;
    broadcastBannerSettings?: BroadcastBannerSettings;
  }): Promise<Blob | null> {
    const cleanText = params.tickerText?.trim();
    if (!cleanText) return null;

    const canvas = document.createElement('canvas');
    const canvasW = 1920;
    const tickerH = 80;
    const bannerH = 160; // Exactly double the size of news ticker!
    const canvasH = tickerH + bannerH; // 240px
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d')!;

    // ==========================================
    // TIER 1: NEWS TICKER CRAWLER (TOP 80px)
    // ==========================================
    const bgGrad = ctx.createLinearGradient(0, 0, canvasW, tickerH);
    bgGrad.addColorStop(0, '#7f1d1d');
    bgGrad.addColorStop(0.25, '#991b1b');
    bgGrad.addColorStop(0.7, '#b91c1c');
    bgGrad.addColorStop(1, '#6b1212');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, tickerH);

    // Top golden ribbon
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, canvasW, 3.5);

    // Left "BREAKING NEWS" / "తాజా వార్తలు" Badge
    const badgeWidth = 270;
    const badgeGrad = ctx.createLinearGradient(0, 0, badgeWidth, tickerH);
    badgeGrad.addColorStop(0, '#450a0a');
    badgeGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = badgeGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(badgeWidth, 0);
    ctx.lineTo(badgeWidth - 20, tickerH);
    ctx.lineTo(0, tickerH);
    ctx.closePath();
    ctx.fill();

    // Golden separator line
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(badgeWidth, 0);
    ctx.lineTo(badgeWidth - 20, tickerH);
    ctx.stroke();

    // Golden Live Dot
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(32, tickerH / 2, 7, 0, Math.PI * 2);
    ctx.fill();

    const isTelugu = !params.language || params.language === 'te' || /[\u0C00-\u0C7F]/.test(cleanText);
    const badgeTitle = params.badgeText || (isTelugu ? 'తాజా వార్తలు' : 'BREAKING NEWS');
    ctx.font = isTelugu
      ? 'normal 26px "Ramabhadra", "Noto Sans Telugu", sans-serif'
      : '700 22px "Khand", "Cinzel", "Roboto", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(badgeTitle, 52, tickerH / 2 + 1);

    // Crawl text on top strap
    ctx.save();
    ctx.beginPath();
    ctx.rect(badgeWidth + 12, 0, canvasW - badgeWidth - 24, tickerH);
    ctx.clip();

    ctx.font = this.getTickerCrawlFont(cleanText, params.language, 34);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;
    ctx.fillText(cleanText, badgeWidth + 24, tickerH / 2 + 2);
    ctx.restore();

    // ==========================================
    // TIER 2: DOUBLE-SIZE BANNER (BOTTOM 160px)
    // (Blue Gradient background, Ramaraja Telugu Font, White Text, Large Size)
    // ==========================================
    // Golden divider ribbon
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, tickerH, canvasW, 2.5);

    // Blue Gradient Background
    const blueGrad = ctx.createLinearGradient(0, tickerH, canvasW, canvasH);
    blueGrad.addColorStop(0, '#061738');
    blueGrad.addColorStop(0.25, '#1e40af');
    blueGrad.addColorStop(0.7, '#1d4ed8');
    blueGrad.addColorStop(1, '#071530');
    ctx.fillStyle = blueGrad;
    ctx.fillRect(0, tickerH, canvasW, bannerH);

    // Cyan bottom accent border
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, canvasH - 3, canvasW, 3);

    // Left Headlines Badge
    const headBadgeW = 340;
    const headBadgeGrad = ctx.createLinearGradient(0, tickerH, headBadgeW, canvasH);
    headBadgeGrad.addColorStop(0, '#0f172a');
    headBadgeGrad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = headBadgeGrad;
    ctx.beginPath();
    ctx.moveTo(0, tickerH);
    ctx.lineTo(headBadgeW, tickerH);
    ctx.lineTo(headBadgeW - 25, canvasH);
    ctx.lineTo(0, canvasH);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(headBadgeW, tickerH);
    ctx.lineTo(headBadgeW - 25, canvasH);
    ctx.stroke();

    // Cyan Live Indicator Dot
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(36, tickerH + 48, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('✦ HEADLINES ✦', 56, tickerH + 36);

    ctx.fillStyle = '#ffffff';
    ctx.font = isTelugu
      ? 'normal 34px "Ramabhadra", sans-serif'
      : 'bold 30px "Khand", sans-serif';
    ctx.fillText(isTelugu ? 'నేటి ముఖ్యాంశాలు' : 'TODAY HEADLINES', 36, tickerH + 76);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('LIVE FLASH ✦ 4X DURATION', 36, tickerH + 120);

    // Headline Content
    const headlinesList = params.broadcastBannerSettings?.headlineBanner?.headlines;
    const displayHeadline = (headlinesList && headlinesList.length > 0)
      ? headlinesList[0]
      : cleanText;

    const clipX = headBadgeW + 25;
    const clipW = canvasW - clipX - 30;
    const centerY = tickerH + bannerH / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(clipX, tickerH, clipW, bannerH);
    ctx.clip();

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 8;
    ctx.textBaseline = 'middle';

    const isHeadlineTelugu = /[\u0C00-\u0C7F]/.test(displayHeadline) || isTelugu;
    ctx.font = this.getHeadlineFont(displayHeadline, params.language, isHeadlineTelugu ? 48 : 38);

    const textW = ctx.measureText(displayHeadline).width;
    if (textW <= clipW) {
      ctx.fillText(displayHeadline, clipX + (clipW - textW) / 2, centerY);
    } else {
      ctx.font = this.getHeadlineFont(displayHeadline, params.language, isHeadlineTelugu ? 40 : 32);
      ctx.fillText(displayHeadline, clipX, centerY);
    }
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  /**
   * Generates components for continuous FFmpeg animated scrolling ticker:
   * 1. tickerStrapBg: 1920x92 broadcast background strap
   * 2. tickerBadge: Left wedge badge ("తాజా వార్తలు" / "BREAKING NEWS" with golden live indicator)
   * 3. tickerTextStrip: Transparent canvas strip with the full crawl text in Ramabhadra font
   */
  static async composeScrollingTickerParts(params: {
    tickerText: string;
    language?: string;
    badgeText?: string;
    broadcastBannerSettings?: BroadcastBannerSettings;
  }): Promise<{
    strapBgBlob: Blob | null;
    badgeBlob: Blob | null;
    textStripBlob: Blob | null;
    textWidth: number;
  }> {
    const cleanText = params.tickerText?.trim() || '';
    if (!cleanText) {
      return { strapBgBlob: null, badgeBlob: null, textStripBlob: null, textWidth: 0 };
    }

    const isTelugu = !params.language || params.language === 'te' || /[\u0C00-\u0C7F]/.test(cleanText);
    const height = 92;

    // 1. Background strap (1920x92)
    const strapCanvas = document.createElement('canvas');
    strapCanvas.width = 1920;
    strapCanvas.height = height;
    const sCtx = strapCanvas.getContext('2d')!;

    const bgGrad = sCtx.createLinearGradient(0, 0, 1920, height);
    bgGrad.addColorStop(0, '#5c0e0e');
    bgGrad.addColorStop(0.3, '#991b1b');
    bgGrad.addColorStop(0.7, '#7f1d1d');
    bgGrad.addColorStop(1, '#450a0a');
    sCtx.fillStyle = bgGrad;
    sCtx.fillRect(0, 0, 1920, height);

    // Top golden accent line
    sCtx.fillStyle = '#facc15';
    sCtx.fillRect(0, 0, 1920, 3.5);

    // 2. Left Wedge Badge
    const badgeW = 280;
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = badgeW;
    badgeCanvas.height = height;
    const bCtx = badgeCanvas.getContext('2d')!;

    const bGrad = bCtx.createLinearGradient(0, 0, badgeW, height);
    bGrad.addColorStop(0, '#380606');
    bGrad.addColorStop(1, '#660e0e');
    bCtx.fillStyle = bGrad;
    bCtx.beginPath();
    bCtx.moveTo(0, 0);
    bCtx.lineTo(badgeW, 0);
    bCtx.lineTo(badgeW - 24, height);
    bCtx.lineTo(0, height);
    bCtx.closePath();
    bCtx.fill();

    // Golden angled separator line
    bCtx.strokeStyle = '#facc15';
    bCtx.lineWidth = 3;
    bCtx.beginPath();
    bCtx.moveTo(badgeW, 0);
    bCtx.lineTo(badgeW - 24, height);
    bCtx.stroke();

    // Golden live dot
    bCtx.fillStyle = '#fef08a';
    bCtx.beginPath();
    bCtx.arc(36, height / 2, 8, 0, Math.PI * 2);
    bCtx.fill();

    bCtx.fillStyle = '#ffffff';
    bCtx.textBaseline = 'middle';
    bCtx.font = isTelugu
      ? 'normal 26px "Ramabhadra", "Noto Sans Telugu", sans-serif'
      : '700 22px "Khand", "Cinzel", "Roboto", sans-serif';
    const badgeLabel = params.badgeText || (isTelugu ? 'తాజా వార్తలు' : 'BREAKING NEWS');
    bCtx.fillText(badgeLabel, 56, height / 2 + 1);

    // 3. Horizontal Text Strip
    const measureCanvas = document.createElement('canvas');
    const mCtx = measureCanvas.getContext('2d')!;
    const fontStr = this.getTickerCrawlFont(cleanText, params.language, 36);
    mCtx.font = fontStr;
    const textMetrics = mCtx.measureText(cleanText);
    const measuredW = Math.ceil(textMetrics.width);
    const stripWidth = Math.max(1600, measuredW + 400);

    const stripCanvas = document.createElement('canvas');
    stripCanvas.width = stripWidth;
    stripCanvas.height = height;
    const tCtx = stripCanvas.getContext('2d')!;
    tCtx.font = fontStr;
    tCtx.fillStyle = '#ffffff';
    tCtx.textBaseline = 'middle';
    tCtx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    tCtx.shadowBlur = 6;
    tCtx.fillText(cleanText, 40, height / 2 + 2);

    const toBlobPromise = (c: HTMLCanvasElement): Promise<Blob | null> =>
      new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/png'));

    const [strapBgBlob, badgeBlob, textStripBlob] = await Promise.all([
      toBlobPromise(strapCanvas),
      toBlobPromise(badgeCanvas),
      toBlobPromise(stripCanvas),
    ]);

    return {
      strapBgBlob,
      badgeBlob,
      textStripBlob,
      textWidth: stripWidth,
    };
  }

  /**
   * Generates standalone TV News Field Location Badge (44px height) with Map Pointer icon (📍)
   */
  static async composeLocationBadge(locationText: string): Promise<Blob | null> {
    const cleanLocation = locationText?.trim();
    if (!cleanLocation) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const fontSize = 24;
    const font = `bold ${fontSize}px system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Telugu", sans-serif`;
    ctx.font = font;

    const textMetrics = ctx.measureText(cleanLocation);
    const textWidth = Math.ceil(textMetrics.width);

    const paddingX = 16;
    const iconSize = 24;
    const badgeHeight = 44;
    const badgeWidth = paddingX + iconSize + 10 + textWidth + paddingX;

    canvas.width = badgeWidth + 16;
    canvas.height = badgeHeight + 12;

    const bx = 8;
    const by = 6;

    // Badge shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    const bgGrad = ctx.createLinearGradient(bx, by, bx + badgeWidth, by + badgeHeight);
    bgGrad.addColorStop(0, '#c5221f');
    bgGrad.addColorStop(1, '#8e0c0a');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(bx, by, badgeWidth, badgeHeight, 8);
    } else {
      ctx.rect(bx, by, badgeWidth, badgeHeight);
    }
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Map pointer icon (Google Maps / Broadcast style)
    const pinX = bx + paddingX;
    const pinY = by + Math.round((badgeHeight - iconSize) / 2);
    ctx.save();
    ctx.translate(pinX, pinY);
    ctx.fillStyle = '#ffffff';

    if (typeof Path2D !== 'undefined') {
      const pinPath = new Path2D(
        'M12 2C7.58 2 4 5.58 4 10C4 15.25 12 22 12 22C12 22 20 15.25 20 10C20 5.58 16.42 2 12 2ZM12 13C10.34 13 9 11.66 9 10C9 8.34 10.34 7 12 7C13.66 7 15 8.34 15 10C15 11.66 13.66 13 12 13Z'
      );
      ctx.fill(pinPath, 'evenodd');
    } else {
      ctx.beginPath();
      ctx.arc(12, 10, 8, Math.PI * 0.75, Math.PI * 2.25);
      ctx.lineTo(12, 22);
      ctx.closePath();
      ctx.arc(12, 10, 3, 0, Math.PI * 2, true);
      ctx.fill('evenodd');
    }
    ctx.restore();

    // Location text
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 4;
    const textX = pinX + iconSize + 10;
    const textY = by + badgeHeight / 2;
    ctx.fillText(cleanLocation, textX, textY);
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  /**
   * Generates a broadcast channel watermark emblem if no custom logo was uploaded.
   * Ensures channel branding is never blank or missing on broadcast video!
   */
  static async composeDefaultChannelWatermark(channelName: string): Promise<Blob | null> {
    const cleanName = (channelName || 'NEWS 24X7').toUpperCase().slice(0, 18);
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 70;
    const ctx = canvas.getContext('2d')!;

    // Outer Broadcast Badge
    const grad = ctx.createLinearGradient(0, 0, 240, 70);
    grad.addColorStop(0, '#1e1b4b');
    grad.addColorStop(0.5, '#0f172a');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(4, 4, 232, 62, 10);
    } else {
      ctx.rect(4, 4, 232, 62);
    }
    ctx.fill();

    // Golden border
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Red live dot
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(24, 35, 6, 0, Math.PI * 2);
    ctx.fill();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(cleanName, 40, 35);

    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  }

  /**
   * Serializes watermark, location badge, and both bottom ticker tiers into FormData.
   * Guarantees that neither watermark nor tickers are ever missing from Cloud Run composition!
   */
  private static async appendWatermarkAndTickersToFormData(
    formData: FormData,
    params: {
      watermarkSettings?: WatermarkSettings;
      newsLocation?: string;
      tickerText?: string;
      language?: string;
      channelTitle?: string;
      broadcastBannerSettings?: BroadcastBannerSettings;
      youtubeTitle?: string;
    }
  ): Promise<void> {
    const {
      watermarkSettings,
      newsLocation,
      tickerText,
      language,
      channelTitle,
      broadcastBannerSettings,
      youtubeTitle,
    } = params;

    // 1. Watermark & Channel Logo Placement Settings
    const logoPlacement = watermarkSettings?.logoPlacement || watermarkSettings?.placement || 'top-right';
    const logoScale = watermarkSettings?.logoScalePercent || watermarkSettings?.scalePercent || 18;
    const logoOpacity = watermarkSettings?.logoOpacityPercent || watermarkSettings?.opacityPercent || 90;
    const logoX = watermarkSettings?.logoXPercent ?? (logoPlacement.endsWith('right') ? 92 : 8);
    const logoY = watermarkSettings?.logoYPercent ?? (logoPlacement.startsWith('bottom') ? 85 : 8);

    formData.append('logoPlacement', logoPlacement);
    formData.append('logoScalePercent', logoScale.toString());
    formData.append('logoOpacityPercent', logoOpacity.toString());
    formData.append('logoXPercent', logoX.toString());
    formData.append('logoYPercent', logoY.toString());

    formData.append('watermarkPlacement', watermarkSettings?.placement || 'top-left');
    formData.append('watermarkScalePercent', (watermarkSettings?.scalePercent || 18).toString());
    formData.append('watermarkOpacityPercent', (watermarkSettings?.opacityPercent || 85).toString());
    if (watermarkSettings?.xPercent !== undefined) {
      formData.append('watermarkXPercent', watermarkSettings.xPercent.toString());
    }
    if (watermarkSettings?.yPercent !== undefined) {
      formData.append('watermarkYPercent', watermarkSettings.yPercent.toString());
    }
    if (watermarkSettings?.text?.trim()) {
      formData.append('watermarkText', watermarkSettings.text.trim());
    }

    // Animated logo video bug (if configured)
    if (watermarkSettings?.isAnimatedLogo || watermarkSettings?.logoFormat === 'video') {
      formData.append('isAnimatedLogo', 'true');
      if (watermarkSettings?.logoAnimationType) {
        formData.append('logoAnimationType', watermarkSettings.logoAnimationType);
      }
      if (watermarkSettings?.logoVideoBlob) {
        formData.append('watermarkLogoVideo', watermarkSettings.logoVideoBlob, watermarkSettings.logoFileName || 'logo_animated.mp4');
      }
    }

    // 2. Watermark Logo Image: User logo OR Default Channel Crest PNG (Guaranteed never missing)
    let logoBlob: Blob | null = null;
    if (watermarkSettings?.logoDataUrl) {
      try {
        logoBlob = await fetch(watermarkSettings.logoDataUrl).then((r) => r.blob());
      } catch (e) {
        console.warn('Failed to parse watermarkSettings.logoDataUrl:', e);
      }
    } else if (watermarkSettings?.logoUrl) {
      formData.append('watermarkLogoUrl', watermarkSettings.logoUrl);
    }

    if (!logoBlob) {
      try {
        logoBlob = await this.composeDefaultChannelWatermark(
          watermarkSettings?.text || channelTitle || 'NEWSPRESS 24/7'
        );
      } catch (e) {
        console.warn('Failed to compose default channel watermark:', e);
      }
    }

    if (logoBlob) {
      formData.append('watermarkLogo', logoBlob, 'channel_watermark.png');
    }

    // 3. Crisp TV News Reporting Location Badge (Top-Left / Top-Right)
    if (newsLocation?.trim()) {
      formData.append('newsLocation', newsLocation.trim());
      try {
        const locBlob = await this.composeLocationBadge(newsLocation.trim());
        if (locBlob) {
          formData.append('locationBadge', locBlob, 'location_badge.png');
        }
      } catch (e) {
        console.warn('Could not compose location badge:', e);
      }
    }

    // 4. TV News Two-Tier Bottom Ticker Graphics (Tier 1 Crawler + Tier 2 Headline Banner)
    const cleanTicker = tickerText?.trim();
    if (cleanTicker) {
      formData.append('tickerText', cleanTicker);

      // A. Tier 1 Animated Scrolling Crawler Parts (Strap BG, Text Strip, Badge, Width)
      try {
        const parts = await this.composeScrollingTickerParts({
          tickerText: cleanTicker,
          language,
          broadcastBannerSettings,
        });
        if (parts.strapBgBlob && parts.textStripBlob) {
          formData.append('tickerStrapBg', parts.strapBgBlob, 'ticker_strap_bg.png');
          formData.append('tickerTextStrip', parts.textStripBlob, 'ticker_text_strip.png');
          if (parts.badgeBlob) {
            formData.append('tickerBadge', parts.badgeBlob, 'ticker_badge.png');
          }
          formData.append('tickerTextWidth', parts.textWidth.toString());
        }
      } catch (scrollErr) {
        console.warn('Could not compose scrolling ticker parts:', scrollErr);
      }

      // B. Tier 2 Headline Banner Overlay (Stacked directly above Tier 1)
      try {
        const headline = youtubeTitle || broadcastBannerSettings?.headlineBanner?.headlines?.[0] || cleanTicker.split('✦')[0]?.trim();
        const headlineBlob = await this.composeHeadlineBannerOverlay({
          headline,
          language,
        });
        if (headlineBlob) {
          formData.append('headlineBannerOverlay', headlineBlob, 'headline_banner.png');
        }
      } catch (headErr) {
        console.warn('Could not compose headline banner overlay:', headErr);
      }

      // C. Fallback Static Multi-Tier Ticker Overlay
      try {
        const overlayBlob = await this.composeTickerOverlay({
          tickerText: cleanTicker,
          language,
          broadcastBannerSettings,
        });
        if (overlayBlob) {
          formData.append('tickerOverlay', overlayBlob, 'ticker_overlay.png');
        }
      } catch (tErr) {
        console.warn('Could not compose fallback ticker overlay:', tErr);
      }
    }
  }

  /**
   * Generates Tier 2 TV News Headline Banner Overlay (1920x76) with sapphire/royal gradient and bold typography
   */
  static async composeHeadlineBannerOverlay(params: {
    headline: string;
    language?: string;
  }): Promise<Blob | null> {
    const cleanHeadline = params.headline?.trim();
    if (!cleanHeadline) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 76;
    const ctx = canvas.getContext('2d')!;

    // Deep sapphire / royal navy gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 1920, 76);
    bgGrad.addColorStop(0, '#061738');
    bgGrad.addColorStop(0.2, '#1e40af');
    bgGrad.addColorStop(0.7, '#1d4ed8');
    bgGrad.addColorStop(1, '#071530');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1920, 76);

    // Golden accent lines top & cyan accent bottom
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, 1920, 3);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, 73, 1920, 3);

    const isTelugu = !params.language || params.language === 'te' || /[\u0C00-\u0C7F]/.test(cleanHeadline);

    // Left Wedge Badge: "✦ ముఖ్యాంశాలు ✦" / "✦ HEADLINES ✦"
    const badgeW = 280;
    const badgeGrad = ctx.createLinearGradient(0, 0, badgeW, 76);
    badgeGrad.addColorStop(0, '#0f172a');
    badgeGrad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = badgeGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(badgeW, 0);
    ctx.lineTo(badgeW - 20, 76);
    ctx.lineTo(0, 76);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(badgeW, 0);
    ctx.lineTo(badgeW - 20, 76);
    ctx.stroke();

    // Pulse dot
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(30, 38, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = isTelugu
      ? 'normal 24px "Ramabhadra", sans-serif'
      : 'bold 22px "Khand", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(isTelugu ? 'ముఖ్యాంశాలు' : 'HEADLINES', 48, 39);

    // Center Headline text
    ctx.save();
    ctx.beginPath();
    ctx.rect(badgeW + 10, 0, 1920 - badgeW - 20, 76);
    ctx.clip();

    ctx.font = isTelugu
      ? 'normal 30px "Ramabhadra", "Noto Sans Telugu", sans-serif'
      : 'bold 28px "Khand", "Cinzel", "Roboto", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;
    ctx.fillText(cleanHeadline, badgeW + 20, 40);
    ctx.restore();

    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  }

  /**
   * Generates a unified high-resolution broadcast watermark graphic combining:
   * 1. Channel Logo (on top)
   * 2. TV News Field Location Badge with MapPin icon (📍) directly underneath the logo
   */
  static async composeWatermarkWithLocation(params: {
    logoDataUrl?: string;
    logoUrl?: string;
    locationText?: string;
    placement?: string;
  }): Promise<Blob | null> {
    const { logoDataUrl, logoUrl, locationText, placement = 'top-right' } = params;
    const cleanLocation = locationText?.trim() || '';

    // If neither logo nor location exists, return null
    if (!logoDataUrl && !logoUrl && !cleanLocation) {
      return null;
    }

    // If only logo exists and no location, fetch logo blob directly
    if (!cleanLocation && (logoDataUrl || logoUrl)) {
      try {
        const resp = await fetch(logoDataUrl || logoUrl!);
        return await resp.blob();
      } catch (e) {
        return null;
      }
    }

    // Load logo image if present
    let logoImg: HTMLImageElement | null = null;
    if (logoDataUrl || logoUrl) {
      try {
        logoImg = await this.loadImage(logoDataUrl || logoUrl!);
      } catch (e) {
        console.warn('Could not load logo for watermark composition:', e);
      }
    }

    // Create Canvas for broadcast watermark graphic
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Badge typography
    const fontSize = 26;
    const font = `bold ${fontSize}px system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Telugu", "Gautami", "Nirmala UI", sans-serif`;
    ctx.font = font;

    // Measure text width
    const textMetrics = ctx.measureText(cleanLocation);
    const textWidth = Math.ceil(textMetrics.width);

    // Badge layout dimensions
    const badgePaddingX = 16;
    const badgePaddingY = 9;
    const pinIconWidth = 24;
    const badgeHeight = fontSize + badgePaddingY * 2; // ~44px
    const badgeWidth = badgePaddingX + pinIconWidth + 10 + textWidth + badgePaddingX;

    // Determine canvas dimensions
    const logoW = logoImg ? (logoImg.naturalWidth || logoImg.width) : 0;
    const logoH = logoImg ? (logoImg.naturalHeight || logoImg.height) : 0;

    const gap = logoImg ? 12 : 0;
    const canvasW = Math.max(logoW, badgeWidth) + 16;
    const canvasH = logoH + gap + badgeHeight + 16;

    canvas.width = canvasW;
    canvas.height = canvasH;

    // Re-set font after canvas resize (resizing clears state)
    ctx.font = font;
    ctx.textBaseline = 'middle';

    const isRightAligned = placement.includes('right');
    const isLeftAligned = placement.includes('left');

    let logoX = 8;
    let badgeX = 8;

    if (isRightAligned) {
      logoX = canvasW - 8 - logoW;
      badgeX = canvasW - 8 - badgeWidth;
    } else if (isLeftAligned) {
      logoX = 8;
      badgeX = 8;
    } else {
      logoX = Math.round((canvasW - logoW) / 2);
      badgeX = Math.round((canvasW - badgeWidth) / 2);
    }

    // 1. Draw Channel Logo
    if (logoImg && logoW > 0 && logoH > 0) {
      ctx.drawImage(logoImg, logoX, 8, logoW, logoH);
    }

    // 2. Draw TV News Location Badge (Directly below the logo)
    const badgeY = 8 + logoH + gap;
    const badgeR = 8; // rounded corners

    // Badge shadow for TV broadcast pop
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    // Badge background: Sleek broadcast red/crimson gradient
    const bgGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeWidth, badgeY + badgeHeight);
    bgGrad.addColorStop(0, '#c5221f'); // News Red
    bgGrad.addColorStop(1, '#8e0c0a'); // Deep Crimson

    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeR);
    } else {
      ctx.rect(badgeX, badgeY, badgeWidth, badgeHeight);
    }
    ctx.fill();

    // Subtle white border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 3. Draw Round Navigation Map Pointer with Center Hole (Google Maps / Broadcast TV Style)
    const iconSize = 24;
    const pinX = badgeX + badgePaddingX;
    const pinY = badgeY + Math.round((badgeHeight - iconSize) / 2);

    ctx.save();
    ctx.translate(pinX, pinY);
    ctx.fillStyle = '#ffffff';

    if (typeof Path2D !== 'undefined') {
      const pinPath = new Path2D(
        'M12 2C7.58 2 4 5.58 4 10C4 15.25 12 22 12 22C12 22 20 15.25 20 10C20 5.58 16.42 2 12 2ZM12 13C10.34 13 9 11.66 9 10C9 8.34 10.34 7 12 7C13.66 7 15 8.34 15 10C15 11.66 13.66 13 12 13Z'
      );
      ctx.fill(pinPath, 'evenodd');
    } else {
      ctx.beginPath();
      ctx.arc(12, 10, 8, Math.PI * 0.75, Math.PI * 2.25);
      ctx.lineTo(12, 22);
      ctx.closePath();
      ctx.arc(12, 10, 3, 0, Math.PI * 2, true);
      ctx.fill('evenodd');
    }
    ctx.restore();

    // 4. Draw Location Text in Bold White with crisp shadow
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;

    const textX = pinX + iconSize + 10;
    const textY = badgeY + Math.round(badgeHeight / 2);
    ctx.fillText(cleanLocation, textX, textY);
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  /**
   * Generates a broadcast-quality animated Leaderboard MP4/WebM video sample (1920x160)
   * in the style of Google Ads animated Leaderboards (728x90, 970x90, 1920x160).
   * Supports:
   * - 'ad': Commercial sponsored offer with golden gradient, light sweeps, Telugu text, contact, and CTA button.
   * - 'channel': Official channel branding with cyber purple gradient, social handles (YouTube, WhatsApp), and Subscribe button.
   */
  static async createSampleLeaderboardVideo(
    type: 'ad' | 'channel',
    options: {
      title?: string;
      subtitle?: string;
      contact?: string;
      cta?: string;
    } = {}
  ): Promise<{ blob: Blob; url: string; fileName: string }> {
    if (
      typeof document === 'undefined' ||
      typeof MediaRecorder === 'undefined' ||
      typeof HTMLCanvasElement === 'undefined' ||
      !(HTMLCanvasElement.prototype as any).captureStream
    ) {
      const dummyBlob = new Blob(['mock-video-leaderboard-binary'], { type: 'video/mp4' });
      return {
        blob: dummyBlob,
        url: 'blob:mock-leaderboard-video-url',
        fileName: type === 'ad' ? 'ad_leaderboard_sample.mp4' : 'channel_promo_sample.mp4',
      };
    }

    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 160;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context not available');

        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          mimeType = 'video/webm;codecs=vp9';
        }

        const stream = (canvas as any).captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const fileName = type === 'ad' ? `ad_leaderboard_sample.${ext}` : `channel_promo_sample.${ext}`;
          resolve({ blob, url, fileName });
        };

        recorder.start();

        let frame = 0;
        const totalFrames = 30 * 3.5; // ~3.5 seconds animation loop (105 frames)
        const frameIntervalMs = 1000 / 30;

        const animTimer = setInterval(() => {
          frame++;
          const elapsed = frame / 30;

          ctx.clearRect(0, 0, 1920, 160);

          if (type === 'ad') {
            // Gold & Amber Commercial Leaderboard Banner (Google Ads 1920x160 Leaderboard style)
            const grad = ctx.createLinearGradient(0, 0, 1920, 160);
            grad.addColorStop(0, '#2d1502');
            grad.addColorStop(0.3, '#78350f');
            grad.addColorStop(0.7, '#92400e');
            grad.addColorStop(1, '#2d1502');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 1920, 160);

            // Shimmer light sweep across banner
            const sweepX = ((frame * 32) % 3200) - 600;
            const sweepGrad = ctx.createLinearGradient(sweepX, 0, sweepX + 350, 160);
            sweepGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            sweepGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.35)');
            sweepGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = sweepGrad;
            ctx.fillRect(0, 0, 1920, 160);

            // Gold border
            ctx.fillStyle = '#facc15';
            ctx.fillRect(0, 0, 1920, 4);
            ctx.fillRect(0, 156, 1920, 4);

            // Left Badge
            const badgeW = 340;
            ctx.fillStyle = '#451a03';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(badgeW, 0);
            ctx.lineTo(badgeW - 30, 160);
            ctx.lineTo(0, 160);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(badgeW, 0);
            ctx.lineTo(badgeW - 30, 160);
            ctx.stroke();

            // Pulsing beacon
            const pulse = (Math.sin(elapsed * 6) + 1) / 2;
            ctx.fillStyle = pulse > 0.4 ? '#facc15' : '#ef4444';
            ctx.beginPath();
            ctx.arc(42, 50, 9, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fef08a';
            ctx.font = 'bold 22px system-ui, sans-serif';
            ctx.textBaseline = 'middle';
            ctx.fillText('✦ SPONSORED LEADERBOARD ✦', 64, 50);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'normal 32px "Ramabhadra", sans-serif';
            ctx.fillText('ప్రత్యేక ఆఫర్ ప్రకటన', 42, 108);

            // Sponsor info
            const title = options.title || 'సురక్ష ఆటోమోటివ్స్ & హోమ్ అప్లయన్సెస్';
            const subtitle = options.subtitle || 'దసరా & దీపావళి ధమాకా ఆఫర్ - గ్యారంటీడ్ 30% డిస్కౌంట్!';
            const contact = options.contact || '📞 ఉచిత హోమ్ డెలివరీ & బుకింగ్స్: +91 98480 12345';

            ctx.fillStyle = '#fef08a';
            ctx.font = 'normal 34px "Ramabhadra", sans-serif';
            ctx.textBaseline = 'top';
            ctx.fillText(title, badgeW + 35, 24);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'normal 38px "Ramaraja", serif';
            ctx.fillText(subtitle, badgeW + 35, 68);

            ctx.fillStyle = '#fde68a';
            ctx.font = 'bold 23px system-ui, sans-serif';
            ctx.fillText(contact, badgeW + 35, 116);

            // Pulsing Shop Now CTA
            const ctaPulse = 1 + 0.05 * Math.sin(elapsed * 5);
            ctx.save();
            ctx.translate(1700, 80);
            ctx.scale(ctaPulse, ctaPulse);
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.roundRect(-150, -32, 300, 64, 12);
            ctx.fill();
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(options.cta || 'SHOP NOW ▶', 0, 0);
            ctx.restore();

          } else {
            // Channel Promo Leaderboard Video
            const grad = ctx.createLinearGradient(0, 0, 1920, 160);
            grad.addColorStop(0, '#090d16');
            grad.addColorStop(0.35, '#1e1b4b');
            grad.addColorStop(0.7, '#2e1065');
            grad.addColorStop(1, '#0f172a');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 1920, 160);

            // Shimmer light sweep
            const sweepX = ((frame * 32) % 3200) - 600;
            const sweepGrad = ctx.createLinearGradient(sweepX, 0, sweepX + 350, 160);
            sweepGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            sweepGrad.addColorStop(0.5, 'rgba(192, 132, 252, 0.35)');
            sweepGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = sweepGrad;
            ctx.fillRect(0, 0, 1920, 160);

            // Purple border
            ctx.fillStyle = '#c084fc';
            ctx.fillRect(0, 0, 1920, 4);
            ctx.fillRect(0, 156, 1920, 4);

            // Left Badge
            const badgeW = 340;
            ctx.fillStyle = '#1e1b4b';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(badgeW, 0);
            ctx.lineTo(badgeW - 30, 160);
            ctx.lineTo(0, 160);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(badgeW, 0);
            ctx.lineTo(badgeW - 30, 160);
            ctx.stroke();

            // Flashing beacon
            const pulse = (Math.sin(elapsed * 6) + 1) / 2;
            ctx.fillStyle = pulse > 0.4 ? '#a855f7' : '#38bdf8';
            ctx.beginPath();
            ctx.arc(42, 50, 9, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#e9d5ff';
            ctx.font = 'bold 22px system-ui, sans-serif';
            ctx.textBaseline = 'middle';
            ctx.fillText('✦ OFFICIAL NETWORK ✦', 64, 50);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'normal 32px "Ramabhadra", sans-serif';
            ctx.fillText('మా ఛానెల్ నెట్‌వర్క్', 42, 108);

            const title = options.title || 'NewsPress 24x7 Digital Network';
            const subtitle = options.subtitle || 'నిష్పక్షపాత వార్తలు • ఎప్పటికప్పుడు ప్రత్యక్ష ప్రసారం';

            ctx.fillStyle = '#ffffff';
            ctx.font = 'normal 36px "Ramabhadra", sans-serif';
            ctx.textBaseline = 'top';
            ctx.fillText(title, badgeW + 35, 22);

            ctx.fillStyle = '#c084fc';
            ctx.font = 'normal 25px "Noto Sans Telugu", sans-serif';
            ctx.fillText(subtitle, badgeW + 35, 66);

            // Badges: YouTube & WhatsApp
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.roundRect(badgeW + 35, 106, 260, 38, 8);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px system-ui, sans-serif';
            ctx.textBaseline = 'middle';
            ctx.fillText('▶ YouTube: @NewsPress', badgeW + 48, 125);

            ctx.fillStyle = '#16a34a';
            ctx.beginPath();
            ctx.roundRect(badgeW + 315, 106, 280, 38, 8);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px system-ui, sans-serif';
            ctx.fillText('💬 WhatsApp: +91 98765 43210', badgeW + 328, 125);

            // Pulsing Subscribe Button
            const ctaPulse = 1 + 0.05 * Math.sin(elapsed * 5);
            ctx.save();
            ctx.translate(1700, 80);
            ctx.scale(ctaPulse, ctaPulse);
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.roundRect(-150, -32, 300, 64, 12);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('SUBSCRIBE NOW 🔔', 0, 0);
            ctx.restore();
          }

          if (frame >= totalFrames) {
            clearInterval(animTimer);
            try {
              if (recorder.state === 'recording') {
                recorder.stop();
              }
            } catch (recErr) {
              // ignore
            }
          }
        }, frameIntervalMs);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates a broadcast-quality animated Channel Logo Bug MP4/WebM video sample (320x320)
   * with 3D rotating news emblem, spinning satellite orbit rings, and glowing broadcast pulse.
   */
  static async createSampleAnimatedLogo(options: {
    channelName?: string;
    tagline?: string;
  } = {}): Promise<{ blob: Blob; url: string; fileName: string }> {
    if (
      typeof document === 'undefined' ||
      typeof MediaRecorder === 'undefined' ||
      typeof HTMLCanvasElement === 'undefined' ||
      !(HTMLCanvasElement.prototype as any).captureStream
    ) {
      const dummyBlob = new Blob(['mock-animated-logo-binary'], { type: 'video/mp4' });
      return {
        blob: dummyBlob,
        url: 'blob:mock-animated-logo-url',
        fileName: 'channel_logo_animated.mp4',
      };
    }

    return new Promise((resolve, reject) => {
      try {
        const size = 320;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context not available');

        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          mimeType = 'video/webm;codecs=vp9';
        }

        const stream = (canvas as any).captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const fileName = `channel_logo_animated.${ext}`;
          resolve({ blob, url, fileName });
        };

        recorder.start();

        let frame = 0;
        const totalFrames = 30 * 3.5; // ~3.5s loop
        const frameIntervalMs = 1000 / 30;

        const animTimer = setInterval(() => {
          frame++;
          const elapsed = frame / 30;
          ctx.clearRect(0, 0, size, size);

          const centerX = size / 2;
          const centerY = size / 2;

          // 1. Outer Dark TV News Shield Circle with deep crimson & royal blue sheen
          const outerGrad = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, 140);
          outerGrad.addColorStop(0, '#1e1b4b');
          outerGrad.addColorStop(0.7, '#0f172a');
          outerGrad.addColorStop(1, '#020617');
          ctx.fillStyle = outerGrad;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 135, 0, Math.PI * 2);
          ctx.fill();

          // 2. Spinning 3D Golden Broadcast Orbit Ring
          ctx.save();
          ctx.translate(centerX, centerY);
          const angle = elapsed * 2.5;
          ctx.rotate(angle);
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(0, 0, 130, 65, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Orbit satellite beacon dot
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(130, 0, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();

          // 3. Counter-spinning Inner Cyan Orbit Ring
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(-angle * 1.2);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(0, 0, 115, 55, Math.PI / 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // 4. Center 3D News Globe / Shield with Perspective Flip
          const flipScale = Math.cos(elapsed * 2); // 3D Y-axis flip
          ctx.save();
          ctx.translate(centerX, centerY - 10);
          ctx.scale(flipScale, 1);

          // Golden Shield
          const shieldGrad = ctx.createLinearGradient(-50, -50, 50, 50);
          shieldGrad.addColorStop(0, '#fde047');
          shieldGrad.addColorStop(0.5, '#ca8a04');
          shieldGrad.addColorStop(1, '#713f12');
          ctx.fillStyle = shieldGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 56, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 3.5;
          ctx.stroke();

          // "NEWS" text on 3D emblem
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 22px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0,0,0,0.9)';
          ctx.shadowBlur = 6;
          ctx.fillText('NEWS', 0, -2);
          ctx.restore();

          // 5. Lower Badge: "24x7 LIVE" / Channel Name
          const pulse = (Math.sin(elapsed * 6) + 1) / 2;
          ctx.fillStyle = pulse > 0.4 ? '#dc2626' : '#991b1b';
          ctx.beginPath();
          ctx.roundRect(centerX - 80, centerY + 65, 160, 36, 18);
          ctx.fill();
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Flashing white live dot
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(centerX - 56, centerY + 83, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 15px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const label = options.channelName ? options.channelName.slice(0, 12).toUpperCase() : '24x7 LIVE';
          ctx.fillText(label, centerX + 10, centerY + 83);

          if (frame >= totalFrames) {
            clearInterval(animTimer);
            try {
              if (recorder.state === 'recording') {
                recorder.stop();
              }
            } catch (recErr) {
              // ignore
            }
          }
        }, frameIntervalMs);
      } catch (err) {
        reject(err);
      }
    });
  }

  private static loadVideoElement(src: string): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const vid = document.createElement('video');
      vid.crossOrigin = 'anonymous';
      vid.preload = 'auto';
      vid.muted = true;
      vid.onloadedmetadata = () => resolve(vid);
      vid.onerror = (e) => reject(new Error('Failed to load video element'));
      vid.src = src;
    });
  }

  private static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  private static getSupportedMimeType(): string {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    for (const c of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) {
        return c;
      }
    }
    return 'video/webm';
  }
}
