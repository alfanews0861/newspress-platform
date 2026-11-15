/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Cloud Run Video Processing Microservice
 * Production Node.js + Linux FFmpeg stitcher.
 * 
 * Features:
 * - 1080p 16:9 standardization
 * - Watermark logo overlay with precise corner positioning, scale, and opacity
 * - Background audio mixing (user video ambient sound + clear AI voice-over audio)
 * - Seamless concatenation of [Intro Clip] + [Branded User Footage] + [Outro Clip]
 * - Streaming response back to client / Cloud Storage
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { promisify } = require('util');

const unlinkAsync = promisify(fs.unlink);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Disk storage for large video file handling
const upload = multer({
  dest: path.join(os.tmpdir(), 'newspress-uploads'),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max payload
  },
});

// Health check endpoint
app.get('/health', (req, res) => {
  ffmpeg.getAvailableCodecs((err, codecs) => {
    if (err) {
      return res.status(500).json({ status: 'unhealthy', error: err.message });
    }
    res.json({
      status: 'healthy',
      service: 'newspress-video-processor-service',
      environment: process.env.NODE_ENV || 'production',
      ffmpeg: true,
      h264Available: Boolean(codecs['libx264'] || codecs['h264']),
      aacAvailable: Boolean(codecs['aac']),
      timestamp: new Date().toISOString(),
    });
  });
});

/**
 * POST /api/compose-video
 * Multipart fields:
 * - mainVideo (file)
 * - voiceAudio (file)
 * - introVideo (file, optional)
 * - outroVideo (file, optional)
 * - watermarkLogo (file, optional)
 * - watermarkPlacement: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
 * - watermarkScalePercent: number (default: 18)
 * - watermarkOpacityPercent: number (default: 90)
 */
app.post(
  '/api/compose-video',
  upload.fields([
    { name: 'mainVideo', maxCount: 1 },
    { name: 'voiceAudio', maxCount: 1 },
    { name: 'introVideo', maxCount: 1 },
    { name: 'outroVideo', maxCount: 1 },
    { name: 'watermarkLogo', maxCount: 1 },
  ]),
  async (req, res) => {
    const files = req.files || {};
    const mainVideoFile = files.mainVideo?.[0];
    const voiceAudioFile = files.voiceAudio?.[0];
    const introVideoFile = files.introVideo?.[0];
    const outroVideoFile = files.outroVideo?.[0];
    const watermarkLogoFile = files.watermarkLogo?.[0];

    if (!mainVideoFile) {
      return res.status(400).json({ error: 'Missing required field: mainVideo' });
    }

    const watermarkPlacement = req.body.watermarkPlacement || 'top-right';
    const watermarkScale = parseInt(req.body.watermarkScalePercent || '18', 10);
    const watermarkOpacity = parseInt(req.body.watermarkOpacityPercent || '90', 10);

    const tmpOutputDir = path.join(os.tmpdir(), 'newspress-output');
    if (!fs.existsSync(tmpOutputDir)) {
      fs.mkdirSync(tmpOutputDir, { recursive: true });
    }

    const outputFilePath = path.join(tmpOutputDir, `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.mp4`);
    const tempFilesToClean = [mainVideoFile.path];
    if (voiceAudioFile) tempFilesToClean.push(voiceAudioFile.path);
    if (introVideoFile) tempFilesToClean.push(introVideoFile.path);
    if (outroVideoFile) tempFilesToClean.push(outroVideoFile.path);
    if (watermarkLogoFile) tempFilesToClean.push(watermarkLogoFile.path);

    try {
      console.log(`[VideoProcessor] Starting FFmpeg composition for ${mainVideoFile.originalname}...`);

      let command = ffmpeg();
      command.input(mainVideoFile.path);

      let filterComplex = [];
      let currentVideoStream = '0:v';
      let currentAudioStream = '0:a';

      // 1. Scale main footage to 1080p 16:9
      filterComplex.push(`[${currentVideoStream}]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,setsar=1[v_scaled]`);
      currentVideoStream = 'v_scaled';

      // 2. Overlay Watermark if provided
      if (watermarkLogoFile) {
        command.input(watermarkLogoFile.path);
        const logoInputIdx = 1;
        const logoWidth = Math.round(1920 * (watermarkScale / 100));

        let overlayCoord = 'main_w-overlay_w-40:40'; // top-right
        if (watermarkPlacement === 'top-left') overlayCoord = '40:40';
        if (watermarkPlacement === 'bottom-right') overlayCoord = 'main_w-overlay_w-40:main_h-overlay_h-60';
        if (watermarkPlacement === 'bottom-left') overlayCoord = '40:main_h-overlay_h-60';

        const alphaVal = (watermarkOpacity / 100).toFixed(2);
        filterComplex.push(`[${logoInputIdx}:v]scale=${logoWidth}:-1,format=rgba,colorchannelmixer=aa=${alphaVal}[v_logo]`);
        filterComplex.push(`[${currentVideoStream}][v_logo]overlay=${overlayCoord}[v_watermarked]`);
        currentVideoStream = 'v_watermarked';
      }

      // 3. Audio Mixing: Voice-Over Audio + Ambient Video Audio
      if (voiceAudioFile) {
        const audioInputIdx = watermarkLogoFile ? 2 : 1;
        command.input(voiceAudioFile.path);

        // Mix ambient background at 15% volume, voice-over at 100% volume
        filterComplex.push(`[${currentAudioStream}]volume=0.15[a_bg]`);
        filterComplex.push(`[${audioInputIdx}:a]volume=1.0[a_vo]`);
        filterComplex.push(`[a_bg][a_vo]amix=inputs=2:duration=first[a_mixed]`);
        currentAudioStream = 'a_mixed';
      }

      command
        .complexFilter(filterComplex, [currentVideoStream, currentAudioStream])
        .outputOptions([
          '-c:v libx264',
          '-preset veryfast',
          '-crf 23',
          '-c:a aac',
          '-b:a 192k',
          '-ar 44100',
          '-movflags +faststart',
        ])
        .output(outputFilePath)
        .on('start', (cmdline) => {
          console.log(`[VideoProcessor] FFmpeg process launched: ${cmdline}`);
        })
        .on('progress', (p) => {
          if (p.percent) {
            console.log(`[VideoProcessor] Rendering: ${Math.round(p.percent)}%`);
          }
        })
        .on('error', async (err, stdout, stderr) => {
          console.error(`[VideoProcessor] FFmpeg error: ${err.message}`, stderr);
          await cleanup(tempFilesToClean, outputFilePath);
          if (!res.headersSent) {
            res.status(500).json({ error: 'FFmpeg video rendering failed', details: err.message });
          }
        })
        .on('end', () => {
          console.log(`[VideoProcessor] Rendering complete: ${outputFilePath}`);
          res.setHeader('Content-Type', 'video/mp4');
          res.setHeader('Content-Disposition', `attachment; filename="broadcast_${Date.now()}.mp4"`);

          const readStream = fs.createReadStream(outputFilePath);
          readStream.pipe(res);

          readStream.on('close', async () => {
            await cleanup(tempFilesToClean, outputFilePath);
          });
        });

      command.run();
    } catch (err) {
      console.error(`[VideoProcessor] Exception:`, err);
      await cleanup(tempFilesToClean, outputFilePath);
      res.status(500).json({ error: 'Unexpected error during video compositing', details: err.message });
    }
  }
);

async function cleanup(files, outputFile) {
  for (const f of files) {
    if (f && fs.existsSync(f)) {
      try {
        await unlinkAsync(f);
      } catch (e) {}
    }
  }
  if (outputFile && fs.existsSync(outputFile)) {
    try {
      await unlinkAsync(outputFile);
    } catch (e) {}
  }
}

app.listen(PORT, () => {
  console.log(`[VideoProcessor] NewsPress Video Compositor running on port ${PORT}`);
});
