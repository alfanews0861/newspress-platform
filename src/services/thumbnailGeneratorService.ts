/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NewsPress Broadcast YouTube Thumbnail Studio Service
 * Creates high-impact 1280x720 broadcast graphics with HD video keyframe extraction,
 * cinematic newsroom framing, and authentic native typography across all Indian languages.
 */

import { SupportedIndianLanguage } from '../types/youtube';
import { AIVideoEditorialService } from './aiVideoEditorialService';

export interface ThumbnailRenderOptions {
  videoElement?: HTMLVideoElement;
  keyframeImageUrl?: string;
  headlineText: string;
  badgeText?: string;
  curiosityLine?: string;
  logoDataUrl?: string;
  themeColor?: 'fire_red' | 'electric_yellow' | 'shock_blue' | 'crimson_dark' | string;
  channelName?: string;
  language?: SupportedIndianLanguage | string;
  preferGeminiImageModel?: boolean;
}

export interface ThumbnailGenerationResult {
  dataUrl: string;
  blob: Blob;
  modelUsed: string;
  source: 'gemini-image-model' | 'broadcast-canvas';
  error?: string;
}

const LANGUAGE_CONFIG: Record<string, { name: string; nativeName: string; font: string }> = {
  te: { name: 'Telugu', nativeName: 'తెలుగు', font: '"Ramabhadra", "Noto Sans Telugu", sans-serif' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', font: '"Khand", "Mukta", "Noto Sans Devanagari", sans-serif' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்', font: '"Catamaran", "Noto Sans Tamil", sans-serif' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ', font: '"Noto Sans Kannada", sans-serif' },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം', font: '"Manjari", "Noto Sans Malayalam", sans-serif' },
  bn: { name: 'Bengali', nativeName: 'বাংলা', font: '"Hind Siliguri", "Noto Sans Bengali", sans-serif' },
  mr: { name: 'Marathi', nativeName: 'मराठी', font: '"Khand", "Mukta", "Noto Sans Devanagari", sans-serif' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી', font: '"Mukta Vaani", "Noto Sans Gujarati", sans-serif' },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', font: '"Mukta Mahee", "Noto Sans Gurmukhi", sans-serif' },
  or: { name: 'Odia', nativeName: 'ଓଡ଼ିଆ', font: '"Noto Sans Oriya", sans-serif' },
  en: { name: 'English', nativeName: 'English', font: '"Plus Jakarta Sans", "Roboto", sans-serif' },
};

export class ThumbnailGeneratorService {
  /**
   * Extracts a video frame into a 1280x720 base64 JPEG.
   */
  static extractFrameFromVideo(videoElement: HTMLVideoElement, _atTimeSec: number = 2): Promise<string> {
    return new Promise((resolve) => {
      try {
        if (!videoElement || videoElement.videoWidth === 0) {
          resolve('');
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }

        ctx.drawImage(videoElement, 0, 0, 1280, 720);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (e) {
        console.warn('[ThumbnailStudio] Frame extraction notice:', e);
        resolve('');
      }
    });
  }

  /**
   * Extracts a keyframe at a specific timestamp by temporarily seeking the video element.
   */
  static async extractFrameAtTimestamp(videoElement: HTMLVideoElement, targetTimeSec: number): Promise<string> {
    return new Promise((resolve) => {
      if (!videoElement || isNaN(videoElement.duration) || videoElement.videoWidth === 0) {
        resolve('');
        return;
      }

      const originalTime = videoElement.currentTime;
      const safeTime = Math.min(Math.max(0.5, targetTimeSec), Math.max(0.5, videoElement.duration - 0.5));
      let settled = false;

      const finish = (dataUrl: string) => {
        if (settled) return;
        settled = true;
        resolve(dataUrl);
      };

      const onSeeked = () => {
        videoElement.removeEventListener('seeked', onSeeked);
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoElement, 0, 0, 1280, 720);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          videoElement.currentTime = originalTime;
          finish(dataUrl);
        } else {
          videoElement.currentTime = originalTime;
          finish('');
        }
      };

      videoElement.addEventListener('seeked', onSeeked, { once: true });
      videoElement.currentTime = safeTime;

      setTimeout(() => {
        videoElement.removeEventListener('seeked', onSeeked);
        this.extractFrameFromVideo(videoElement, safeTime).then(finish);
      }, 1200);
    });
  }

  /**
   * Extracts a crisp keyframe from the video across candidate timestamps.
   */
  static async extractBestFaceKeyframe(
    videoElement: HTMLVideoElement,
    candidateTimestamps: number[] = [1.0, 2.5, 4.0, 6.0]
  ): Promise<string> {
    if (!videoElement || videoElement.videoWidth === 0) {
      return '';
    }

    try {
      for (const t of candidateTimestamps) {
        if (videoElement.duration && t <= videoElement.duration) {
          const frame = await this.extractFrameAtTimestamp(videoElement, t);
          if (frame) return frame;
        }
      }
    } catch (e) {
      console.warn('[ThumbnailStudio] Multi-frame extraction notice:', e);
    }

    return this.extractFrameFromVideo(videoElement, 2);
  }

  /**
   * Renders a high-impact 1280x720 Broadcast News Thumbnail using HD Footage Keyframe
   * + Studio Graphics Canvas Engine with native language typography.
   */
  static async generateAIThumbnail(options: ThumbnailRenderOptions): Promise<ThumbnailGenerationResult> {
    const lang = (options.language || 'en') as SupportedIndianLanguage;
    const defaults = AIVideoEditorialService.getLocalizedDefaultHooks(lang);

    let keyframeUrl = options.keyframeImageUrl || '';
    if (!keyframeUrl && options.videoElement && options.videoElement.videoWidth > 0) {
      keyframeUrl = await this.extractFrameFromVideo(options.videoElement, 2);
    }

    const canvasResult = await this.renderBroadcastCanvasThumbnail({
      ...options,
      language: lang,
      headlineText: options.headlineText?.trim() || defaults.headline,
      badgeText: options.badgeText?.trim() || defaults.badge,
      curiosityLine: options.curiosityLine?.trim() || defaults.curiosity,
      keyframeImageUrl: keyframeUrl,
    });

    return {
      dataUrl: canvasResult.dataUrl,
      blob: canvasResult.blob,
      modelUsed: 'Broadcast News Graphics Engine (1280x720 HD Studio Canvas)',
      source: 'broadcast-canvas',
    };
  }

  /**
   * Backwards-compatible renderThumbnail helper.
   */
  static async renderThumbnail(options: ThumbnailRenderOptions): Promise<{ dataUrl: string; blob: Blob }> {
    const result = await this.generateAIThumbnail(options);
    return {
      dataUrl: result.dataUrl,
      blob: result.blob,
    };
  }

  /**
   * Renders the complete 1280x720 Broadcast YouTube Thumbnail onto an offscreen HTML5 Canvas
   * with high-contrast newsroom framing, lower-third badge, and native language display typography.
   */
  static async renderBroadcastCanvasThumbnail(options: ThumbnailRenderOptions): Promise<{ dataUrl: string; blob: Blob }> {
    const lang = (options.language || 'en') as SupportedIndianLanguage;
    const defaults = AIVideoEditorialService.getLocalizedDefaultHooks(lang);

    const {
      videoElement,
      keyframeImageUrl,
      headlineText = defaults.headline,
      badgeText = defaults.badge,
      curiosityLine,
      logoDataUrl,
      themeColor = 'fire_red',
      channelName = 'NEWSPRESS 24x7',
    } = options;

    if (typeof document === 'undefined') {
      const mockStr = 'mock-1280x720-jpeg-data';
      const b64 = typeof Buffer !== 'undefined' ? Buffer.from(mockStr).toString('base64') : btoa(mockStr);
      return {
        dataUrl: `data:image/jpeg;base64,${b64}`,
        blob: new Blob([mockStr], { type: 'image/jpeg' }),
      };
    }

    const width = 1280;
    const height = 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const langConf = LANGUAGE_CONFIG[lang] || LANGUAGE_CONFIG.en;

    // 1. Background: Extracted Video Frame or Newsroom Studio Backdrop
    let imageLoaded = false;
    if (keyframeImageUrl) {
      try {
        const bgImg = await this.loadImage(keyframeImageUrl);
        ctx.drawImage(bgImg, 0, 0, width, height);
        imageLoaded = true;
      } catch (err) {
        console.warn('[ThumbnailStudio] Background frame load notice:', err);
      }
    } else if (videoElement && videoElement.videoWidth > 0) {
      ctx.drawImage(videoElement, 0, 0, width, height);
      imageLoaded = true;
    }

    if (!imageLoaded) {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e293b');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

    // 2. High-Contrast Subject & Text Readability Vignettes
    const leftTextVignette = ctx.createLinearGradient(0, 0, width * 0.78, 0);
    leftTextVignette.addColorStop(0, 'rgba(0, 0, 0, 0.92)');
    leftTextVignette.addColorStop(0.45, 'rgba(0, 0, 0, 0.70)');
    leftTextVignette.addColorStop(0.8, 'rgba(0, 0, 0, 0.18)');
    leftTextVignette.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = leftTextVignette;
    ctx.fillRect(0, 0, width, height);

    const bottomGrad = ctx.createLinearGradient(0, height * 0.35, 0, height);
    bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    bottomGrad.addColorStop(0.45, 'rgba(0, 0, 0, 0.68)');
    bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0.96)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Broadcast Top-Left Tag
    ctx.save();
    ctx.fillStyle = '#dc2626';
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(40, 40, 128, 38, 6);
    } else {
      ctx.fillRect(40, 40, 128, 38);
    }
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(60, 59, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ON AIR', 74, 65);
    ctx.restore();

    // 4. Channel Logo Bug (Top-Right)
    if (logoDataUrl) {
      try {
        const logoImg = await this.loadImage(logoDataUrl);
        const logoW = 160;
        const logoH = (logoImg.height / logoImg.width) * logoW;
        ctx.drawImage(logoImg, width - logoW - 40, 40, logoW, Math.min(logoH, 80));
      } catch (e) {
        console.warn('[ThumbnailStudio] Logo draw notice:', e);
      }
    } else {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(width - 260, 40, 220, 44, 6);
      } else {
        ctx.fillRect(width - 260, 40, 220, 44);
      }
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(channelName.slice(0, 18), width - 150, 68);
    }

    // 5. High-Impact Story Badge
    ctx.save();
    const bugX = 50;
    const bugY = height - 305;
    const bugH = 56;

    ctx.font = `900 24px ${langConf.font}`;
    const badgeTextWidth = ctx.measureText(badgeText).width;
    const bugW = Math.max(250, Math.min(width - 100, badgeTextWidth + 72));

    const badgeGrad = ctx.createLinearGradient(bugX, bugY, bugX + bugW, bugY);
    if (themeColor === 'electric_yellow') {
      badgeGrad.addColorStop(0, '#eab308');
      badgeGrad.addColorStop(1, '#ca8a04');
    } else if (themeColor === 'shock_blue') {
      badgeGrad.addColorStop(0, '#2563eb');
      badgeGrad.addColorStop(1, '#1d4ed8');
    } else if (themeColor === 'crimson_dark') {
      badgeGrad.addColorStop(0, '#991b1b');
      badgeGrad.addColorStop(1, '#450a0a');
    } else {
      badgeGrad.addColorStop(0, '#dc2626');
      badgeGrad.addColorStop(1, '#991b1b');
    }

    ctx.fillStyle = badgeGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(bugX, bugY, bugW, bugH, 6);
    } else {
      ctx.fillRect(bugX, bugY, bugW, bugH);
    }
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = themeColor === 'electric_yellow' ? '#0f172a' : '#ffffff';
    ctx.font = `900 24px ${langConf.font}`;
    ctx.textAlign = 'left';
    ctx.fillText(badgeText, bugX + 24, bugY + 37);

    // 6. Primary Headline Typography
    ctx.save();
    const headlineFontSize = lang === 'te' ? 54 : 52;
    ctx.font = `900 ${headlineFontSize}px ${langConf.font}`;
    ctx.textAlign = 'left';
    ctx.lineWidth = 12;
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 2;
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#fde047';

    const maxTextWidth = width * 0.78;
    const headlineLines = this.wrapText(ctx, headlineText, maxTextWidth).slice(0, 2);

    let startY = curiosityLine ? height - 198 : height - 148;
    if (headlineLines.length > 1) {
      startY -= 36;
    }

    for (let i = 0; i < headlineLines.length; i++) {
      const lineText = headlineLines[i];
      const y = startY + i * (headlineFontSize + 14);
      ctx.strokeText(lineText, 50, y);
      ctx.fillText(lineText, 50, y);
    }

    // 7. Sub-Headline / Curiosity Hook
    if (curiosityLine) {
      const curiosityY = startY + headlineLines.length * (headlineFontSize + 14) + 12;
      const subFontSize = lang === 'te' ? 38 : 36;
      ctx.font = `900 ${subFontSize}px ${langConf.font}`;
      ctx.lineWidth = 9;
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = '#ffffff';
      const curiosityLines = this.wrapText(ctx, curiosityLine, maxTextWidth).slice(0, 1);
      if (curiosityLines[0]) {
        ctx.strokeText(curiosityLines[0], 50, curiosityY);
        ctx.fillText(curiosityLines[0], 50, curiosityY);
      }
    }
    ctx.restore();

    // 8. Bottom Broadcast Accent Bar
    ctx.save();
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, height - 10, width, 10);
    ctx.fillStyle = '#fde047';
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x + 15, height - 10);
      ctx.lineTo(x + 30, height - 10);
      ctx.lineTo(x + 15, height);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b || new Blob()), 'image/jpeg', 0.94));

    return { dataUrl, blob };
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

  private static wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }
}
