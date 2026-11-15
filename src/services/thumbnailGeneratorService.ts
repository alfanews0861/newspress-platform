/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress AI YouTube Thumbnail Generator Service
 * Creates high-impact, 1280x720 breaking news graphics with video frame extraction,
 * bold typography, channel watermark, and breaking news banners.
 */

export interface ThumbnailRenderOptions {
  videoElement?: HTMLVideoElement;
  keyframeImageUrl?: string;
  headlineText: string;
  badgeText?: string;
  curiosityLine?: string;
  logoDataUrl?: string;
  themeColor?: 'fire_red' | 'electric_yellow' | 'shock_blue' | 'crimson_dark' | string;
  channelName?: string;
}

export class ThumbnailGeneratorService {
  /**
   * Extracts a video frame at a given timestamp into an Image / Canvas.
   */
  static extractFrameFromVideo(videoElement: HTMLVideoElement, atTimeSec: number = 2): Promise<string> {
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve('');
          return;
        }

        // Draw current video frame
        ctx.drawImage(videoElement, 0, 0, 1280, 720);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch (e) {
        console.warn('Frame extraction error:', e);
        resolve('');
      }
    });
  }

  /**
   * Renders the complete 1280x720 YouTube Thumbnail onto a Canvas.
   */
  static async renderThumbnail(options: ThumbnailRenderOptions): Promise<{ dataUrl: string; blob: Blob }> {
    const {
      videoElement,
      keyframeImageUrl,
      headlineText,
      badgeText = 'సంచలన నిజాలు!',
      curiosityLine,
      logoDataUrl,
      themeColor = 'fire_red',
      channelName = 'NEWSPRESS 24x7',
    } = options;

    const width = 1280;
    const height = 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 1. Draw Background: Video Frame or Dramatic Studio Backdrop
    let imageLoaded = false;
    if (keyframeImageUrl) {
      try {
        const bgImg = await this.loadImage(keyframeImageUrl);
        ctx.drawImage(bgImg, 0, 0, width, height);
        imageLoaded = true;
      } catch (err) {
        console.warn('Background image load failed:', err);
      }
    } else if (videoElement && videoElement.videoWidth > 0) {
      ctx.drawImage(videoElement, 0, 0, width, height);
      imageLoaded = true;
    }

    if (!imageLoaded) {
      // Dark radial studio newsroom gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e293b');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Subdued geometric news grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

    // 2. High-Contrast Vignette & Lower-Third Shadow
    const shadowGrad = ctx.createLinearGradient(0, height * 0.30, 0, height);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shadowGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0.70)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Channel Watermark Logo (Top-Right)
    if (logoDataUrl) {
      try {
        const logoImg = await this.loadImage(logoDataUrl);
        const logoW = 160;
        const logoH = (logoImg.height / logoImg.width) * logoW;
        ctx.drawImage(logoImg, width - logoW - 40, 40, logoW, logoH);
      } catch (e) {
        console.warn('Logo draw failed in thumbnail:', e);
      }
    } else {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(width - 240, 40, 200, 44, 8);
      } else {
        ctx.fillRect(width - 240, 40, 200, 44);
      }
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(channelName, width - 140, 69);
    }

    // 4. Dynamic Attention-Grabbing Badge (Top-Left or Above Headline)
    ctx.save();
    const bugX = 60;
    const bugY = height - 290;
    const bugW = Math.max(280, ctx.measureText(badgeText).width + 120);
    const bugH = 58;

    // Glowing badge background with gradient
    const badgeGrad = ctx.createLinearGradient(bugX, bugY, bugX + bugW, bugY);
    if (themeColor === 'electric_yellow') {
      badgeGrad.addColorStop(0, '#eab308');
      badgeGrad.addColorStop(1, '#ca8a04');
    } else if (themeColor === 'shock_blue') {
      badgeGrad.addColorStop(0, '#2563eb');
      badgeGrad.addColorStop(1, '#1d4ed8');
    } else {
      // fire_red
      badgeGrad.addColorStop(0, '#dc2626');
      badgeGrad.addColorStop(1, '#991b1b');
    }

    ctx.fillStyle = badgeGrad;
    ctx.shadowColor = themeColor === 'electric_yellow' ? 'rgba(234, 179, 8, 0.8)' : 'rgba(220, 38, 38, 0.8)';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(bugX, bugY, bugW, bugH, 10);
    } else {
      ctx.fillRect(bugX, bugY, bugW, bugH);
    }
    ctx.fill();
    ctx.restore();

    // Pulse dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(bugX + 28, bugY + bugH / 2, 8, 0, Math.PI * 2);
    ctx.fill();

    // Badge text
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(badgeText, bugX + 48, bugY + 38);

    // 5. Main Headline Typography (Large, High Impact, Yellow with black outline)
    ctx.save();
    ctx.font = '900 56px sans-serif';
    ctx.textAlign = 'left';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#fde047'; // Bright attention-grabbing yellow

    let lineY = height - 195;
    ctx.strokeText(headlineText, 60, lineY);
    ctx.fillText(headlineText, 60, lineY);

    // 6. Curiosity Hook Line (Second Sub-line for maximum Click-Through Rate)
    if (curiosityLine) {
      lineY += 76;
      ctx.font = '900 44px sans-serif';
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = '#ffffff'; // Crisp white
      ctx.strokeText(curiosityLine, 60, lineY);
      ctx.fillText(curiosityLine, 60, lineY);
    }
    ctx.restore();

    // 7. Output Blob and DataURL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b || new Blob()), 'image/jpeg', 0.92));

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
    const words = text.split(' ');
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
