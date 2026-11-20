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
  clipDurationMode?: 'bulletin' | '60s' | '120s' | '300s' | 'full';
  sourceDuration?: number;
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
        if (watermarkSettings?.placement) {
          formData.append('watermarkPlacement', watermarkSettings.placement);
        }
        if (watermarkSettings?.scalePercent) {
          formData.append('watermarkScalePercent', watermarkSettings.scalePercent.toString());
        }
        if (watermarkSettings?.opacityPercent) {
          formData.append('watermarkOpacityPercent', watermarkSettings.opacityPercent.toString());
        }
        // If newsLocation is provided, compose watermark logo + location badge
        let watermarkBlob: Blob | null = null;
        if (params.newsLocation?.trim()) {
          formData.append('newsLocation', params.newsLocation.trim());
          try {
            watermarkBlob = await this.composeWatermarkWithLocation({
              logoDataUrl: watermarkSettings?.logoDataUrl,
              logoUrl: watermarkSettings?.logoUrl,
              locationText: params.newsLocation.trim(),
              placement: watermarkSettings?.placement,
            });
          } catch (e) {
            console.warn('Could not compose watermark with location:', e);
          }
        }

        if (watermarkBlob) {
          formData.append('watermarkLogo', watermarkBlob, 'watermark_with_location.png');
        } else if (watermarkSettings?.logoDataUrl) {
          try {
            const logoBlob = await fetch(watermarkSettings.logoDataUrl).then((r) => r.blob());
            formData.append('watermarkLogo', logoBlob, 'logo.png');
          } catch (e) {
            console.warn('Failed to serialize watermark logo for upload:', e);
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
    if (watermarkSettings?.placement) formData.append('watermarkPlacement', watermarkSettings.placement);
    if (watermarkSettings?.scalePercent) formData.append('watermarkScalePercent', watermarkSettings.scalePercent.toString());
    if (watermarkSettings?.opacityPercent) formData.append('watermarkOpacityPercent', watermarkSettings.opacityPercent.toString());
    // If newsLocation is provided, compose watermark logo + location badge
    let watermarkBlob: Blob | null = null;
    if (params.newsLocation?.trim()) {
      formData.append('newsLocation', params.newsLocation.trim());
      try {
        watermarkBlob = await this.composeWatermarkWithLocation({
          logoDataUrl: watermarkSettings?.logoDataUrl,
          logoUrl: watermarkSettings?.logoUrl,
          locationText: params.newsLocation.trim(),
          placement: watermarkSettings?.placement,
        });
      } catch (e) {
        console.warn('Could not compose watermark with location:', e);
      }
    }

    if (watermarkBlob) {
      formData.append('watermarkLogo', watermarkBlob, 'watermark_with_location.png');
    } else if (watermarkSettings?.logoDataUrl) {
      try {
        const logoBlob = await fetch(watermarkSettings.logoDataUrl).then((r) => r.blob());
        formData.append('watermarkLogo', logoBlob, 'logo.png');
      } catch (e) {}
    }

    // Compose TV News Bottom Ticker Graphic if tickerText is present
    if (params.tickerText?.trim()) {
      formData.append('tickerText', params.tickerText.trim());
      try {
        const tickerBlob = await this.composeTickerOverlay({
          tickerText: params.tickerText.trim(),
          language: params.language,
        });
        if (tickerBlob) {
          formData.append('tickerOverlay', tickerBlob, 'ticker_overlay.png');
        }
      } catch (tErr) {
        console.warn('Could not compose ticker overlay image:', tErr);
      }
    }

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
   * Draws a professional animated TV News Bottom Ticker bar with breaking news badge
   * and smooth scrolling text across the bottom of the video.
   */
  private static drawNewsTicker(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    tickerText?: string,
    elapsedSec: number = 0,
    language?: string
  ) {
    const rawText = tickerText?.trim();
    if (!rawText) return;

    ctx.save();
    const barHeight = 84;
    const barY = canvasH - barHeight;

    // 1. Ticker Background Bar (Deep TV News Red Gradient)
    const bgGrad = ctx.createLinearGradient(0, barY, canvasW, canvasH);
    bgGrad.addColorStop(0, '#7f1d1d'); // deep crimson red
    bgGrad.addColorStop(0.25, '#991b1b'); // rich broadcast red
    bgGrad.addColorStop(0.7, '#b91c1c'); // vibrant red
    bgGrad.addColorStop(1, '#6b1212'); // deep dark red
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, barY, canvasW, barHeight);

    // Top golden accent border (TV news golden ribbon on red background)
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, barY, canvasW, 3.5);

    // 2. Left "BREAKING NEWS" / "తాజా వార్తలు" Badge (Dark Maroon contrast)
    const badgeWidth = 260;
    const badgeGrad = ctx.createLinearGradient(0, barY, badgeWidth, canvasH);
    badgeGrad.addColorStop(0, '#450a0a');
    badgeGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = badgeGrad;
    ctx.beginPath();
    ctx.moveTo(0, barY);
    ctx.lineTo(badgeWidth, barY);
    ctx.lineTo(badgeWidth - 20, canvasH);
    ctx.lineTo(0, canvasH);
    ctx.closePath();
    ctx.fill();

    // Golden separator line on angled edge of badge
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(badgeWidth, barY);
    ctx.lineTo(badgeWidth - 20, canvasH);
    ctx.stroke();

    // Flashing Live Indicator Dot on Badge (Golden/Yellow pulse)
    const pulse = (Math.sin(elapsedSec * 4) + 1) / 2; // 0 to 1
    ctx.fillStyle = pulse > 0.4 ? '#fef08a' : '#f87171';
    ctx.beginPath();
    ctx.arc(32, barY + barHeight / 2, 7, 0, Math.PI * 2);
    ctx.fill();

    // Badge Text in Ramabhadra for Telugu (strictly normal weight, no bold), Khand broadcast font for other languages
    ctx.fillStyle = '#ffffff';
    const isTelugu = !language || language === 'te' || /[\u0C00-\u0C7F]/.test(rawText);
    const badgeTitle = isTelugu ? 'తాజా వార్తలు' : 'BREAKING NEWS';
    ctx.font = isTelugu
      ? 'normal 26px "Ramabhadra", "Noto Sans Telugu", sans-serif'
      : '700 22px "Khand", "Cinzel", "Roboto", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeTitle, 50, barY + barHeight / 2 + 1);

    // 3. Scrolling Headlines Ticker Crawl: Ramabhadra for Telugu (strictly normal weight, enlarged), Khand for others
    ctx.save();
    // Clip to crawl region so text does not bleed into badge
    ctx.beginPath();
    ctx.rect(badgeWidth + 10, barY, canvasW - badgeWidth - 20, barHeight);
    ctx.clip();

    ctx.font = this.getTickerCrawlFont(rawText, language, 30);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;

    const textMetrics = ctx.measureText(rawText);
    const textWidth = textMetrics.width;
    const crawlAreaWidth = canvasW - badgeWidth - 20;

    // Gentle, comfortable news reading speed (~70px/sec instead of fast 140px/sec)
    const speed = 70;
    const loopWidth = textWidth + crawlAreaWidth + 200;
    const totalDistance = elapsedSec * speed;
    const currentOffset = totalDistance % loopWidth;
    const posX = canvasW - currentOffset;

    ctx.fillText(rawText, posX, barY + barHeight / 2 + 2);
    if (posX + textWidth < canvasW) {
      ctx.fillText(rawText, posX + textWidth + 150, barY + barHeight / 2 + 2);
    }

    ctx.restore();
    ctx.restore();
  }

  /**
   * Generates a unified high-resolution broadcast TV news bottom strap graphic:
   * 1. Red Breaking News badge on left
   * 2. TV News Red Gradient bar across the bottom
   * 3. Crisp, styled Telugu Ramabhadra headlines text
   */
  static async composeTickerOverlay(params: {
    tickerText: string;
    language?: string;
    badgeText?: string;
  }): Promise<Blob | null> {
    const cleanText = params.tickerText?.trim();
    if (!cleanText) return null;

    const canvas = document.createElement('canvas');
    const canvasW = 1920;
    const canvasH = 92;
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d')!;

    // Ticker Background Bar (Deep TV News Red Gradient)
    const bgGrad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
    bgGrad.addColorStop(0, '#7f1d1d');
    bgGrad.addColorStop(0.25, '#991b1b');
    bgGrad.addColorStop(0.7, '#b91c1c');
    bgGrad.addColorStop(1, '#6b1212');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Top golden accent border
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, canvasW, 4);

    // Left "BREAKING NEWS" / "తాజా వార్తలు" Badge
    const badgeWidth = 280;
    const badgeGrad = ctx.createLinearGradient(0, 0, badgeWidth, canvasH);
    badgeGrad.addColorStop(0, '#450a0a');
    badgeGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = badgeGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(badgeWidth, 0);
    ctx.lineTo(badgeWidth - 24, canvasH);
    ctx.lineTo(0, canvasH);
    ctx.closePath();
    ctx.fill();

    // Golden separator line on angled edge of badge
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(badgeWidth, 0);
    ctx.lineTo(badgeWidth - 24, canvasH);
    ctx.stroke();

    // Golden Live Indicator Dot on Badge
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(36, canvasH / 2, 8, 0, Math.PI * 2);
    ctx.fill();

    // Badge Text in Ramabhadra for Telugu (strictly normal weight, no bold), Khand broadcast font for others
    const isTelugu = !params.language || params.language === 'te' || /[\u0C00-\u0C7F]/.test(cleanText);
    const badgeTitle = params.badgeText || (isTelugu ? 'తాజా వార్తలు' : 'BREAKING NEWS');
    ctx.font = isTelugu
      ? 'normal 28px "Ramabhadra", "Noto Sans Telugu", sans-serif'
      : '700 24px "Khand", "Cinzel", "Roboto", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(badgeTitle, 58, canvasH / 2 + 1);

    // Headlines Crawl Text: Ramabhadra for Telugu (strictly normal weight, enlarged), Khand broadcast font for others
    ctx.save();
    ctx.beginPath();
    ctx.rect(badgeWidth + 12, 0, canvasW - badgeWidth - 24, canvasH);
    ctx.clip();

    ctx.font = this.getTickerCrawlFont(cleanText, params.language, 32);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;
    ctx.fillText(cleanText, badgeWidth + 24, canvasH / 2 + 2);
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
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
