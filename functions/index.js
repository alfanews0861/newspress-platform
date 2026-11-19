/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Cloud Functions (2nd Gen / Cloud Run)
 * Production Video Compositing Microservice
 * 
 * Server-side FFmpeg pipeline:
 * - 1080p 16:9 standardization
 * - Watermark logo overlay (corner placement, scale, opacity)
 * - Ambient background sound ducking & AI voice-over audio mixing
 * - Streaming MP4 response directly to client
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const Busboy = require('busboy');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: 'alfa-news-service-test-project.firebasestorage.app',
  });
}

// Global Default OAuth Credentials for YouTube Publishing
const DEFAULT_CLIENT_ID = process.env.VITE_YOUTUBE_CLIENT_ID || '';
const DEFAULT_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || process.env.VITE_YOUTUBE_CLIENT_SECRET || '';

// Ensure Storage Bucket CORS allows browser downloads
try {
  admin.storage().bucket('alfa-news-service-test-project.firebasestorage.app').setCorsConfiguration([
    {
      origin: ['*'],
      method: ['GET', 'HEAD', 'PUT', 'POST'],
      responseHeader: ['*'],
      maxAgeSeconds: 3600,
    },
  ]).catch(() => {});
} catch (e) {}

// Ensure FFmpeg binary path is linked
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

/**
 * Synthesizes Prime-Time Television News Anchor voice audio.
 * Uses flagship Gemini 3.8 Flash-TTS (gemini-3.8-flash-tts) for 24kHz studio broadcast clarity.
 * Delivers energetic, crisp, authoritative television broadcast delivery (never slow or monotonous).
 */
async function synthesizeNewsAnchorAudio(text, lang = 'te') {
  if (!text || !text.trim()) return null;

  // 1. Primary: Gemini 3.8 Flash-TTS Studio Anchor (Flagship 24kHz Audio Model)
  // Try Paid Key first to prevent Free Tier 10-requests/day 429 quota exhaustion, then fallback
  const geminiKeys = [
    process.env.GEMINI_API_KEY_PAID,
    process.env.GEMINI_API_KEY,
  ].filter(Boolean);

  for (const geminiKey of geminiKeys) {
    try {
      console.log(`[composeVideo] Synthesizing 24kHz broadcast anchor audio via gemini-3.8-flash-tts...`);
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions?key=${geminiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Revision': '2026-05-20',
        },
        body: JSON.stringify({
          model: 'gemini-3.8-flash-tts',
          input: text.slice(0, 1000),
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const audioPart = data.steps?.[0]?.content?.find((c) => c.type === 'audio');
        if (audioPart?.data) {
          console.log(`[composeVideo] Gemini 3.8 Flash-TTS generated ${audioPart.data.length} chars of studio audio!`);
          return {
            buffer: Buffer.from(audioPart.data, 'base64'),
            format: 'wav',
          };
        }
      } else {
        const errText = await resp.text().catch(() => '');
        console.warn(`[composeVideo] Gemini 3.8 Flash-TTS returned HTTP ${resp.status}:`, errText.slice(0, 120));
      }
    } catch (e) {
      console.warn('[composeVideo] Gemini 3.8 Flash-TTS exception:', e.message);
    }
  }

  // 2. High-Paced Fallback TTS
  try {
    const clean = text.replace(/[\r\n]+/g, ' ').trim();
    const sentences = clean.match(/[^.!?।]+[.!?।]?/g) || [clean];
    const chunks = [];
    let current = '';

    for (const s of sentences) {
      if ((current + ' ' + s).length > 140) {
        if (current.trim()) chunks.push(current.trim());
        current = s;
      } else {
        current += ' ' + s;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    const buffers = [];
    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;
      const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (resp.ok) {
        const arr = await resp.arrayBuffer();
        buffers.push(Buffer.from(arr));
      }
    }
    if (buffers.length > 0) {
      return {
        buffer: Buffer.concat(buffers),
        format: 'mp3',
      };
    }
  } catch (fbErr) {
    console.warn('[composeVideo] Fallback TTS error:', fbErr.message);
  }

  return null;
}

/**
 * Probes the duration of an audio file in seconds.
 */
function getAudioDuration(filePath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err || !metadata?.format?.duration) {
        resolve(25);
      } else {
        const dur = parseFloat(metadata.format.duration);
        resolve(isNaN(dur) ? 25 : dur);
      }
    });
  });
}

/**
 * Probes the duration of a video file in seconds.
 */
function getVideoDuration(filePath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        resolve(15);
        return;
      }
      let dur = parseFloat(metadata?.format?.duration);
      if (isNaN(dur) || dur <= 0) {
        const vStream = metadata?.streams?.find((s) => s.codec_type === 'video');
        dur = parseFloat(vStream?.duration);
      }
      resolve(isNaN(dur) || dur <= 0 ? 15 : dur);
    });
  });
}

/**
 * Checks whether a video or audio file contains an active audio stream.
 */
function probeHasAudio(filePath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err || !metadata?.streams) {
        resolve(true); // default to true on error
      } else {
        const hasA = metadata.streams.some((s) => s.codec_type === 'audio');
        resolve(hasA);
      }
    });
  });
}

/**
 * Direct Server-to-Server YouTube Video & Custom Thumbnail Publisher
 * Runs entirely on Google Cloud Run directly into Google YouTube Data API v3
 * Zero client egress, zero client bandwidth consumption!
 */
async function uploadToYouTubeFromServer({
  videoPath,
  thumbnailPath,
  accessToken,
  refreshToken,
  clientId,
  clientSecret,
  title,
  description,
  tags = [],
  privacyStatus = 'public',
}) {
  let activeToken = accessToken;

  const refreshGoogleToken = async () => {
    if (!refreshToken) return null;
    try {
      const cId = clientId || DEFAULT_CLIENT_ID;
      const cSecret = clientSecret || DEFAULT_CLIENT_SECRET;
      const tokenParams = new URLSearchParams({
        client_id: cId,
        client_secret: cSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      const rResp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      });
      if (rResp.ok) {
        const rData = await rResp.json();
        if (rData.access_token) {
          console.log('[composeVideo] Server refreshed YouTube OAuth access token successfully');
          return rData.access_token;
        }
      } else {
        const rErr = await rResp.text().catch(() => '');
        console.warn(`[composeVideo] Server refresh token HTTP ${rResp.status}:`, rErr);
      }
    } catch (rErr) {
      console.warn('[composeVideo] Refresh token attempt failed:', rErr.message);
    }
    return null;
  };

  // 1. If refresh token is provided and no active token, refresh immediately
  if (!activeToken && refreshToken) {
    activeToken = await refreshGoogleToken();
  }

  if (!activeToken) {
    throw new Error('Your YouTube channel session has expired. Please click "Reconnect YouTube Channel" to refresh your session.');
  }

  const stat = fs.statSync(videoPath);
  console.log(`[composeVideo] Initiating direct server-to-server YouTube resumable upload for ${(stat.size / (1024 * 1024)).toFixed(2)} MB video...`);

  const initUploadSession = async (tok) => {
    return fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tok}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': stat.size.toString(),
          'X-Upload-Content-Type': 'video/mp4',
        },
        body: JSON.stringify({
          snippet: {
            title: title || 'NewsPress Broadcast',
            description: description || 'Broadcasted via NewsPress Studio',
            tags: Array.isArray(tags) ? tags : [],
            categoryId: '25', // News & Politics
          },
          status: {
            privacyStatus: privacyStatus || 'public',
            selfDeclaredMadeForKids: false,
          },
        }),
      }
    );
  };

  // 2. Initialize Resumable Upload Session
  let initResp = await initUploadSession(activeToken);

  // If token expired (401), try refreshing token once and re-attempting
  if (initResp.status === 401 && refreshToken) {
    console.log('[composeVideo] Token returned 401, attempting automatic refresh with refreshToken...');
    const refreshedTok = await refreshGoogleToken();
    if (refreshedTok) {
      activeToken = refreshedTok;
      initResp = await initUploadSession(activeToken);
    }
  }

  if (!initResp.ok) {
    const errText = await initResp.text().catch(() => '');
    if (initResp.status === 401 || errText.includes('invalid authentication credentials') || errText.includes('UNAUTHENTICATED')) {
      throw new Error('Your YouTube channel session has expired (Google OAuth tokens expire after 1 hour). Please click "Reconnect YouTube Channel" below to refresh your token.');
    }
    throw new Error(`YouTube API Initialization Failed (HTTP ${initResp.status}): ${errText}`);
  }

  const uploadLocation = initResp.headers.get('Location');
  if (!uploadLocation) {
    throw new Error('YouTube API did not return an upload Location URL');
  }

  // 3. Upload video data directly from Cloud Run to YouTube
  console.log('[composeVideo] Streaming video binary directly to YouTube upload location...');
  const videoBuffer = fs.readFileSync(videoPath);
  const uploadResp = await fetch(uploadLocation, {
    method: 'PUT',
    headers: {
      'Content-Length': stat.size.toString(),
      'Content-Type': 'video/mp4',
    },
    body: videoBuffer,
  });

  if (!uploadResp.ok) {
    const upErrText = await uploadResp.text().catch(() => '');
    throw new Error(`YouTube video binary upload failed (HTTP ${uploadResp.status}): ${upErrText}`);
  }

  const uploadData = await uploadResp.json();
  const videoId = uploadData.id;
  console.log(`[composeVideo] Video published successfully to YouTube! Video ID: ${videoId}`);

  // 4. Attach Custom Breaking News Thumbnail if provided
  if (thumbnailPath && fs.existsSync(thumbnailPath) && videoId) {
    try {
      console.log(`[composeVideo] Uploading custom thumbnail to YouTube video ${videoId}...`);
      const thumbBuffer = fs.readFileSync(thumbnailPath);
      const thumbResp = await fetch(
        `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'Content-Type': 'image/jpeg',
          },
          body: thumbBuffer,
        }
      );
      if (thumbResp.ok) {
        console.log('[composeVideo] Custom thumbnail set successfully on YouTube video!');
      } else {
        console.warn('[composeVideo] Thumbnail set returned HTTP', thumbResp.status);
      }
    } catch (thumbErr) {
      console.warn('[composeVideo] Non-critical thumbnail upload warning:', thumbErr.message);
    }
  }

  return {
    videoId,
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
    title: title || 'NewsPress Broadcast',
    publishedAt: new Date().toISOString(),
  };
}

/**
 * Cloud Function: composeVideo
 * Gen 2 Cloud Function running on Google Cloud Run
 * Memory: 4GiB, CPU: 2, Timeout: 900s (15 minutes for 10-minute multi-clip packages)
 */
exports.composeVideo = onRequest(
  {
    memory: '4GiB',
    cpu: 2,
    timeoutSeconds: 900,
    cors: true,
    invoker: 'public',
  },
  (req, res) => {
    return cors(req, res, async () => {
      // Action: 1-Click Google OAuth Authorization Code Exchange for Permanent Refresh Token
      if (req.query.action === 'exchange_code') {
        let body = {};
        if (typeof req.body === 'string') {
          try { body = JSON.parse(req.body); } catch (e) {}
        } else if (req.body && typeof req.body === 'object') {
          body = req.body;
        }

        const code = body.code || req.query.code;
        if (!code) {
          return res.status(400).json({ error: 'Missing code parameter' });
        }

        const cId = body.clientId || req.query.clientId || DEFAULT_CLIENT_ID;
        const cSecret = body.clientSecret || req.query.clientSecret || DEFAULT_CLIENT_SECRET;
        const redirectUri = body.redirectUri || req.query.redirectUri || 'postmessage';

        try {
          console.log('[composeVideo] Exchanging OAuth authorization code for permanent tokens...');
          const tokenParams = new URLSearchParams({
            code: code,
            client_id: cId,
            client_secret: cSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          });

          const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tokenParams.toString(),
          });

          const tokenData = await tokenResp.json();
          if (!tokenResp.ok) {
            console.error('[composeVideo] Code exchange failed:', tokenData);
            return res.status(tokenResp.status).json(tokenData);
          }

          const accessToken = tokenData.access_token;
          const refreshToken = tokenData.refresh_token;

          // Fetch authentic YouTube Channel Details
          let channelId = 'UC_YouTubeChannel';
          let channelTitle = 'Official YouTube Channel';
          let channelAvatar = '';
          let subscriberCount = 0;

          if (accessToken) {
            try {
              const chResp = await fetch(
                'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
                {
                  headers: { Authorization: `Bearer ${accessToken}` },
                }
              );
              if (chResp.ok) {
                const chData = await chResp.json();
                if (chData.items && chData.items.length > 0) {
                  const item = chData.items[0];
                  channelId = item.id;
                  channelTitle = item.snippet?.title || channelTitle;
                  channelAvatar = item.snippet?.thumbnails?.default?.url || '';
                  subscriberCount = parseInt(item.statistics?.subscriberCount || '0', 10);
                }
              }
            } catch (chErr) {
              console.warn('[composeVideo] Channel detail fetch warning:', chErr.message);
            }
          }

          console.log(`[composeVideo] Channel "${channelTitle}" (${channelId}) linked permanently with refresh token!`);

          return res.status(200).json({
            success: true,
            isConnected: true,
            channelId,
            channelTitle,
            channelAvatar,
            subscriberCount,
            accessToken,
            refreshToken,
            tokenExpiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
            clientId: cId,
            connectedAt: new Date().toISOString(),
          });
        } catch (e) {
          console.error('[composeVideo] exchange_code exception:', e);
          return res.status(500).json({ error: e.message });
        }
      }

      // Action: Auto-Refresh Google OAuth Access Token
      if (req.query.action === 'refresh_token') {
        let body = {};
        if (typeof req.body === 'string') {
          try { body = JSON.parse(req.body); } catch (e) {}
        } else if (req.body && typeof req.body === 'object') {
          body = req.body;
        }

        const refreshToken = body.refreshToken || req.query.refreshToken;
        if (!refreshToken) {
          return res.status(400).json({ error: 'Missing refreshToken parameter' });
        }

        const cId = body.clientId || req.query.clientId || DEFAULT_CLIENT_ID;
        const cSecret = body.clientSecret || req.query.clientSecret || DEFAULT_CLIENT_SECRET;
        const params = new URLSearchParams({
          client_id: cId,
          client_secret: cSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        });

        try {
          const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
          });
          const data = await tokenResp.json();
          if (tokenResp.ok) {
            return res.status(200).json(data);
          } else {
            return res.status(tokenResp.status).json(data);
          }
        } catch (e) {
          return res.status(500).json({ error: e.message });
        }
      }

      // Health check or direct TTS GET endpoint
      if (req.method === 'GET') {
        if (req.query.action === 'tts' || req.query.text) {
          const text = req.query.text || '';
          const lang = req.query.lang || 'te';
          const ttsResult = await synthesizeNewsAnchorAudio(text, lang);
          if (ttsResult && ttsResult.buffer) {
            res.setHeader('Content-Type', ttsResult.format === 'wav' ? 'audio/wav' : 'audio/mpeg');
            return res.send(ttsResult.buffer);
          }
          return res.status(400).json({ error: 'Failed to synthesize TTS' });
        }

        return res.status(200).json({
          status: 'healthy',
          service: 'newspress-video-compositor',
          ffmpegPath: ffmpegInstaller.path,
          timestamp: new Date().toISOString(),
        });
      }

      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
      }

      const tmpDir = os.tmpdir();

      // Core Composition Pipeline Execution Engine
      const executePipeline = async (fields, uploads, filesToClean = []) => {
        let voiceAudioPath = uploads.voiceAudio;
        let watermarkLogoPath = uploads.watermarkLogo;
        const tempStoragePathsToPurge = [];

        const purgeTempStorageFiles = async () => {
          if (tempStoragePathsToPurge.length > 0) {
            const bucket = admin.storage().bucket('alfa-news-service-test-project.firebasestorage.app');
            for (const tPath of tempStoragePathsToPurge) {
              try {
                await bucket.file(tPath).delete({ ignoreNotFound: true });
                console.log(`[composeVideo] Purged temp storage file to eliminate egress: ${tPath}`);
              } catch (pErr) {
                console.warn('[composeVideo] Non-critical: Could not purge temp storage file:', pErr.message);
              }
            }
          }
        };

        const downloadSafeVideoUrl = async (urlStr, prefix) => {
          if (!urlStr || typeof urlStr !== 'string' || urlStr.startsWith('blob:')) return null;
          try {
            if (urlStr.includes('/o/news_footage%2F')) {
              try {
                const m = urlStr.match(/\/o\/(news_footage%2F[^?]+)/);
                if (m && m[1]) tempStoragePathsToPurge.push(decodeURIComponent(m[1]));
              } catch (e) {}
            }

            console.log(`[composeVideo] Downloading ${prefix} from URL: ${urlStr.slice(0, 80)}...`);
            const vResp = await fetch(urlStr, { signal: AbortSignal.timeout(90000) });
            if (!vResp.ok) throw new Error(`HTTP ${vResp.status} when fetching ${prefix}`);
            const vSavePath = path.join(tmpDir, `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp4`);
            const vBuf = Buffer.from(await vResp.arrayBuffer());
            fs.writeFileSync(vSavePath, vBuf);
            filesToClean.push(vSavePath);
            return vSavePath;
          } catch (err) {
            console.error(`[composeVideo] Download error for ${prefix}:`, err.message);
            return null;
          }
        };

        // 1. Gather User Footage Clips (Ordered clip_0, clip_1, clip_2 or fallback to mainVideo)
        const userClipPaths = [];

        // Check for indexed clip uploads or URLs (supports 1 to 5 sequential clips)
        for (let i = 0; i < 5; i++) {
          if (uploads[`clip_${i}`] && fs.existsSync(uploads[`clip_${i}`])) {
            userClipPaths.push(uploads[`clip_${i}`]);
          } else if (fields[`clipUrl_${i}`]) {
            const downloaded = await downloadSafeVideoUrl(fields[`clipUrl_${i}`], `clip_${i}`);
            if (downloaded) userClipPaths.push(downloaded);
          }
        }

        // Fallback: Check uploads.mainVideo / fields.mainVideoUrl
        if (userClipPaths.length === 0) {
          if (uploads.mainVideo && fs.existsSync(uploads.mainVideo)) {
            userClipPaths.push(uploads.mainVideo);
          } else if (fields.mainVideoUrl) {
            const downloaded = await downloadSafeVideoUrl(fields.mainVideoUrl, 'mainVideo');
            if (downloaded) userClipPaths.push(downloaded);
          }
        }

        if (userClipPaths.length === 0) {
          cleanFiles(filesToClean);
          await purgeTempStorageFiles().catch(() => {});
          return res.status(400).json({ error: 'Missing required field: no footage clips provided' });
        }

        console.log(`[composeVideo] Assembling ${userClipPaths.length} sequential user news clips...`);

        // 2. Resolve Intro Video (Opening Broadcast Bumper)
        let introVideoPath = uploads.introVideo;
        if (!introVideoPath && fields.introVideoUrl) {
          introVideoPath = await downloadSafeVideoUrl(fields.introVideoUrl, 'intro');
        }

        // 3. Resolve Outro Video (Closing Broadcast Call-to-Action)
        let outroVideoPath = uploads.outroVideo;
        if (!outroVideoPath && fields.outroVideoUrl) {
          outroVideoPath = await downloadSafeVideoUrl(fields.outroVideoUrl, 'outro');
        }

        // 4. Download watermark logo if URL is provided
        if (!watermarkLogoPath && fields.watermarkLogoUrl) {
          try {
            const lResp = await fetch(fields.watermarkLogoUrl);
            if (lResp.ok) {
              const lSavePath = path.join(tmpDir, `remote_logo_${Date.now()}.png`);
              fs.writeFileSync(lSavePath, Buffer.from(await lResp.arrayBuffer()));
              watermarkLogoPath = lSavePath;
              filesToClean.push(lSavePath);
            }
          } catch (lErr) {
            console.warn('[composeVideo] Could not fetch watermarkLogoUrl:', lErr.message);
          }
        }

        const watermarkPlacement = fields.watermarkPlacement || 'top-right';
        const watermarkScale = parseInt(fields.watermarkScalePercent || '18', 10);
        const watermarkOpacity = parseInt(fields.watermarkOpacityPercent || '90', 10);
        if (fields.newsLocation) {
          console.log(`[composeVideo] Broadcast reporting location: "${fields.newsLocation}"`);
        }

        const outputPath = path.join(tmpDir, `broadcast_${Date.now()}.mp4`);
        filesToClean.push(outputPath);

        // 5. Server-Side Real Broadcast Anchor TTS Synthesis if voice audio was not uploaded but script text is present
        if (!voiceAudioPath && fields.voiceScriptText) {
          console.log(`[composeVideo] Synthesizing Gemini 3.8 Flash-TTS broadcast news anchor voice for: "${fields.voiceScriptText.slice(0, 50)}..."`);
          const ttsResult = await synthesizeNewsAnchorAudio(fields.voiceScriptText, fields.language || 'te');
          if (ttsResult && ttsResult.buffer) {
            const ext = ttsResult.format === 'wav' ? 'wav' : 'mp3';
            const ttsPath = path.join(tmpDir, `tts_${Date.now()}.${ext}`);
            fs.writeFileSync(ttsPath, ttsResult.buffer);
            voiceAudioPath = ttsPath;
            filesToClean.push(ttsPath);
          }
        }

        // 6. Measure voice-over duration for dynamic broadcast audio ducking & package duration
        let voDuration = 25;
        if (voiceAudioPath && fs.existsSync(voiceAudioPath)) {
          voDuration = await getAudioDuration(voiceAudioPath);
          console.log(`[composeVideo] Voice-Over track duration: ${voDuration.toFixed(2)}s`);
        }

        // 7. Calculate Duration Target with 10 Minutes (600s) Hard Maximum Cap
        const clipDurationMode = fields.clipDurationMode || 'bulletin';
        let maxDurationSec = 600; // default 10 minutes max cap
        if (clipDurationMode === 'bulletin') {
          maxDurationSec = Math.max(15, Math.ceil(voDuration + 4));
        } else if (clipDurationMode === '60s') {
          maxDurationSec = 60;
        } else if (clipDurationMode === '120s') {
          maxDurationSec = 120;
        } else if (clipDurationMode === '300s') {
          maxDurationSec = 300;
        } else if (clipDurationMode === 'full') {
          const requestedMax = fields.maxDuration || fields.sourceDuration;
          maxDurationSec = requestedMax ? Math.min(600, parseInt(requestedMax, 10)) : 600;
        }

        // Enforce 10 minutes maximum cap (600 seconds) for rural/political addresses
        maxDurationSec = Math.min(600, Math.max(10, maxDurationSec));

        try {
          console.log(`[composeVideo] Starting FFmpeg composition (clips: ${userClipPaths.length}, intro: ${!!introVideoPath}, outro: ${!!outroVideoPath}, duration: ${maxDurationSec}s)...`);

          let command = ffmpeg();

          // Prepare sequential video input list: [Intro (if any)] -> [User Clips 1..N] -> [Outro (if any)]
          const videoInputs = [];
          if (introVideoPath && fs.existsSync(introVideoPath)) {
            videoInputs.push({ path: introVideoPath, role: 'intro' });
          }
          for (let i = 0; i < userClipPaths.length; i++) {
            videoInputs.push({ path: userClipPaths[i], role: `clip_${i + 1}` });
          }
          if (outroVideoPath && fs.existsSync(outroVideoPath)) {
            videoInputs.push({ path: outroVideoPath, role: 'outro' });
          }

          // Probe each video input for duration and audio stream
          for (const vi of videoInputs) {
            command.input(vi.path);
            vi.duration = await getVideoDuration(vi.path);
            vi.hasAudio = await probeHasAudio(vi.path);
            console.log(`[composeVideo] Input [${vi.role}] duration: ${vi.duration.toFixed(1)}s, hasAudio: ${vi.hasAudio}`);
          }

          // Extract bumpers duration to ensure precise voiceover sync & broadcast timing
          const introInput = videoInputs.find((vi) => vi.role === 'intro');
          const introDuration = (introInput && introInput.duration > 0) ? introInput.duration : 0;
          const outroInput = videoInputs.find((vi) => vi.role === 'outro');
          const outroDuration = (outroInput && outroInput.duration > 0) ? outroInput.duration : 0;

          // Dynamically adjust maximum broadcast duration so intro bumper + voiceover anchor + outro bumper are never truncated
          if (clipDurationMode === 'bulletin') {
            maxDurationSec = Math.min(600, Math.max(15, Math.ceil(introDuration + voDuration + outroDuration + 3)));
          } else {
            maxDurationSec = Math.min(600, Math.max(maxDurationSec, Math.ceil(introDuration + voDuration + 2)));
          }

          const filterComplex = [];

          // Standardize all video inputs to 1920x1080 @ 30fps with letterbox padding & yuv420p
          // Standardize audio to stereo 44100Hz (or synthesize silence matching duration if missing)
          for (let i = 0; i < videoInputs.length; i++) {
            const vi = videoInputs[i];
            filterComplex.push(
              `[${i}:v]fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,setsar=1,format=yuv420p[v_in_${i}]`
            );

            if (vi.hasAudio) {
              filterComplex.push(`[${i}:a]aformat=sample_rates=44100:channel_layouts=stereo[a_in_${i}]`);
            } else {
              const silenceDur = Math.max(1, vi.duration).toFixed(2);
              filterComplex.push(`anullsrc=channel_layout=stereo:sample_rate=44100:d=${silenceDur}[a_in_${i}]`);
            }
          }

          // Concatenate all standardized video and audio streams
          const concatStreams = videoInputs.map((_, i) => `[v_in_${i}][a_in_${i}]`).join('');
          filterComplex.push(`${concatStreams}concat=n=${videoInputs.length}:v=1:a=1[v_concat][a_concat]`);

          let currentVideoStream = 'v_concat';
          let currentAudioStream = 'a_concat';

          // Watermark Logo Overlay
          if (watermarkLogoPath && fs.existsSync(watermarkLogoPath)) {
            const logoInputIdx = videoInputs.length;
            command.input(watermarkLogoPath);
            const logoWidth = Math.round(1920 * (watermarkScale / 100));

            let overlayCoord = 'main_w-overlay_w-40:40'; // top-right default
            if (watermarkPlacement === 'top-left') overlayCoord = '40:40';
            if (watermarkPlacement === 'bottom-right') overlayCoord = 'main_w-overlay_w-40:main_h-overlay_h-60';
            if (watermarkPlacement === 'bottom-left') overlayCoord = '40:main_h-overlay_h-60';

            const alphaVal = (watermarkOpacity / 100).toFixed(2);
            filterComplex.push(
              `[${logoInputIdx}:v]scale=${logoWidth}:-1,format=rgba,colorchannelmixer=aa=${alphaVal}[v_logo]`
            );
            filterComplex.push(`[${currentVideoStream}][v_logo]overlay=${overlayCoord}[v_watermarked]`);
            currentVideoStream = 'v_watermarked';
          }

          // Audio Mixing: AI Anchor Narration & Dynamic Ambient Ducking
          // Synchronize voiceover to begin precisely when main news footage starts (AFTER channel intro bumper)
          if (voiceAudioPath && fs.existsSync(voiceAudioPath)) {
            const voInputIdx = watermarkLogoPath ? videoInputs.length + 1 : videoInputs.length;
            command.input(voiceAudioPath);

            const effectiveVoDuration = voDuration / 1.12;
            const voStartSec = introDuration;
            const voEndSec = voStartSec + effectiveVoDuration;
            const delayMs = Math.round(voStartSec * 1000);

            console.log(`[composeVideo] Voiceover timing sync: Intro duration=${introDuration.toFixed(2)}s, VO start=${voStartSec.toFixed(2)}s, VO end=${voEndSec.toFixed(2)}s, Audio delay=${delayMs}ms`);

            if (delayMs > 0) {
              filterComplex.push(
                `[${voInputIdx}:a]atempo=1.12,equalizer=f=120:width_type=h:width=60:g=3.5,equalizer=f=3200:width_type=h:width=1000:g=3.0,compand=attacks=0.02:decays=0.15:points=-60/-60|-24/-12|-12/-6|0/-2:gain=2.5,aformat=channel_layouts=stereo:sample_rates=44100,adelay=delays=${delayMs}|${delayMs}[a_vo]`
              );
            } else {
              filterComplex.push(
                `[${voInputIdx}:a]atempo=1.12,equalizer=f=120:width_type=h:width=60:g=3.5,equalizer=f=3200:width_type=h:width=1000:g=3.0,compand=attacks=0.02:decays=0.15:points=-60/-60|-24/-12|-12/-6|0/-2:gain=2.5,aformat=channel_layouts=stereo:sample_rates=44100[a_vo]`
              );
            }

            // Calculate total user news clips footage duration
            const userClipsDuration = videoInputs
              .filter((vi) => vi.role !== 'intro' && vi.role !== 'outro')
              .reduce((acc, vi) => acc + (vi.duration || 0), 0);

            // Mute news footage sound completely to 0% (zero camera/field background noise) so only the AI anchor narration is heard with studio clarity.
            // Channel Intro and Channel Outro bumpers retain 100% crisp full volume.
            const muteStartSec = introDuration;
            const muteEndSec = outroInput ? Math.max(voEndSec, introDuration + userClipsDuration) : Math.max(voEndSec, maxDurationSec);

            console.log(`[composeVideo] Ambient footage audio mute (0%): start=${muteStartSec.toFixed(2)}s, end=${muteEndSec.toFixed(2)}s`);

            filterComplex.push(
              `[${currentAudioStream}]volume='if(gte(t\\,${muteStartSec.toFixed(2)})*lt(t\\,${muteEndSec.toFixed(2)})\\,0.0\\,1.0)':eval=frame[a_bg]`
            );
            filterComplex.push(`[a_bg][a_vo]amix=inputs=2:duration=first:dropout_transition=2[a_mixed]`);
            currentAudioStream = 'a_mixed';
          }

          command.complexFilter(filterComplex, [currentVideoStream, currentAudioStream]);

          if (maxDurationSec) {
            command.duration(maxDurationSec);
          }

          // Ultra-fast encoding preset: Ensures 10-minute HD speeches render swiftly without server CPU overload
          command
            .outputOptions([
              '-c:v libx264',
              '-preset ultrafast',
              '-tune fastdecode',
              '-threads 0',
              '-crf 26',
              '-maxrate 3500k',
              '-bufsize 7000k',
              '-c:a aac',
              '-b:a 192k',
              '-ar 44100',
              '-movflags +faststart',
            ])
            .output(outputPath)
            .on('start', (cmdline) => {
              console.log(`[composeVideo] FFmpeg launched: ${cmdline}`);
            })
            .on('error', (err, stdout, stderr) => {
              console.error('[composeVideo] FFmpeg error:', err.message, stderr);
              cleanFiles(filesToClean);
              purgeTempStorageFiles().catch(() => {});
              if (!res.headersSent) {
                res.status(500).json({ error: 'Video processing failed', details: err.message });
              }
            })
            .on('end', async () => {
              const outputStat = fs.statSync(outputPath);
              console.log(`[composeVideo] Rendering finished: ${outputPath}, size: ${(outputStat.size / (1024 * 1024)).toFixed(2)} MB`);
              purgeTempStorageFiles().catch(() => {});

              // DIRECT SERVER-TO-SERVER YOUTUBE PUBLISHING PIPELINE
              // If client requested direct YouTube publishing, upload straight from Cloud Run to YouTube Data API!
              // Eliminates any roundtrip downloading/uploading from the user's browser!
              if (fields.directPublish === 'true' && (fields.youtubeAccessToken || fields.youtubeRefreshToken)) {
                try {
                  console.log('[composeVideo] Executing direct server-to-server YouTube publishing...');
                  let parsedTags = [];
                  if (fields.youtubeTags) {
                    try { parsedTags = JSON.parse(fields.youtubeTags); } catch (e) { parsedTags = [fields.youtubeTags]; }
                  }

                  const ytResult = await uploadToYouTubeFromServer({
                    videoPath: outputPath,
                    thumbnailPath: uploads.youtubeThumbnail,
                    accessToken: fields.youtubeAccessToken,
                    refreshToken: fields.youtubeRefreshToken,
                    clientId: fields.youtubeClientId,
                    clientSecret: fields.youtubeClientSecret,
                    title: fields.youtubeTitle || 'NewsPress Broadcast',
                    description: fields.youtubeDescription || '',
                    tags: parsedTags,
                    privacyStatus: fields.youtubePrivacyStatus || 'public',
                  });

                  cleanFiles(filesToClean);
                  return res.status(200).json({
                    status: 'published',
                    videoId: ytResult.videoId,
                    youtubeUrl: ytResult.youtubeUrl,
                    title: ytResult.title,
                    publishedAt: ytResult.publishedAt,
                  });
                } catch (ytErr) {
                  console.error('[composeVideo] Server-side YouTube publishing failed:', ytErr);
                  cleanFiles(filesToClean);
                  if (!res.headersSent) {
                    return res.status(500).json({
                      error: 'Server-side YouTube publishing failed',
                      details: ytErr.message,
                    });
                  }
                  return;
                }
              }

              // If output is > 25MB or client explicitly requested JSON, upload directly to Firebase Storage
              // to eliminate Google Cloud Functions Gen 2 32MB HTTP payload limit
              const shouldUploadStorage = outputStat.size > 25 * 1024 * 1024 || fields.returnJson === 'true';

              if (shouldUploadStorage) {
                try {
                  const bucket = admin.storage().bucket('alfa-news-service-test-project.firebasestorage.app');
                  const remoteFilename = `broadcast_packages/broadcast_${Date.now()}.mp4`;
                  const downloadToken = crypto.randomUUID();
                  console.log(`[composeVideo] Uploading ${(outputStat.size / (1024 * 1024)).toFixed(2)} MB package to Storage: ${remoteFilename}...`);
                  await bucket.upload(outputPath, {
                    destination: remoteFilename,
                    contentType: 'video/mp4',
                    metadata: {
                      cacheControl: 'public, max-age=86400',
                      metadata: {
                        firebaseStorageDownloadTokens: downloadToken,
                      },
                    },
                  });
                  console.log(`[composeVideo] Storage upload complete: ${remoteFilename}`);
                  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(remoteFilename)}?alt=media&token=${downloadToken}`;
                  cleanFiles(filesToClean);
                  return res.status(200).json({
                    status: 'success',
                    videoUrl: publicUrl,
                    remotePath: remoteFilename,
                    size: outputStat.size,
                    durationSec: maxDurationSec || Math.round(voDuration),
                  });
                } catch (stErr) {
                  console.error('[composeVideo] Storage upload failed:', stErr);
                  cleanFiles(filesToClean);
                  if (!res.headersSent) {
                    return res.status(500).json({
                      error: 'Cloud Storage upload failed for broadcast package',
                      details: stErr.message,
                    });
                  }
                  return;
                }
              }

              // Standard streaming response
              res.setHeader('Content-Type', 'video/mp4');
              res.setHeader('Content-Disposition', `attachment; filename="broadcast_${Date.now()}.mp4"`);

              const readStream = fs.createReadStream(outputPath);
              readStream.pipe(res);
              readStream.on('close', () => {
                cleanFiles(filesToClean);
              });
            });

          command.run();
        } catch (err) {
          console.error('[composeVideo] Exception:', err);
          cleanFiles(filesToClean);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error', details: err.message });
          }
        }
      };

      // Check for JSON request body
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        let body = req.body;
        if (typeof body === 'string') {
          try { body = JSON.parse(body); } catch (e) {}
        }
        body = body || {};
        return executePipeline(body, {}, []);
      }

      // Multipart form upload handler
      const busboy = Busboy({ headers: req.headers });
      const uploads = {};
      const fields = {};
      const fileWrites = [];
      const filesToClean = [];

      busboy.on('field', (fieldname, val) => {
        fields[fieldname] = val;
      });

      busboy.on('file', (fieldname, file, info) => {
        const { filename } = info;
        const savePath = path.join(tmpDir, `${fieldname}_${Date.now()}_${filename || 'file.tmp'}`);
        const writeStream = fs.createWriteStream(savePath);
        file.pipe(writeStream);

        const promise = new Promise((resolve, reject) => {
          file.on('end', () => writeStream.end());
          writeStream.on('finish', () => {
            uploads[fieldname] = savePath;
            filesToClean.push(savePath);
            resolve();
          });
          writeStream.on('error', reject);
        });
        fileWrites.push(promise);
      });

      busboy.on('finish', async () => {
        await Promise.all(fileWrites);
        return executePipeline(fields, uploads, filesToClean);
      });

      if (req.rawBody) {
        busboy.end(req.rawBody);
      } else {
        req.pipe(busboy);
      }
    });
  }
);

function cleanFiles(filePaths) {
  for (const fp of filePaths) {
    if (fp && fs.existsSync(fp)) {
      try {
        fs.unlinkSync(fp);
      } catch (e) {}
    }
  }
}
