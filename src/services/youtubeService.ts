/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress YouTube Service
 * Handles Google OAuth YouTube Channel connection, Channel Branding Settings,
 * and YouTube Data API v3 direct video & thumbnail publishing.
 */

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import { auth, db } from './firebase';
import { isFirebaseConfigured } from '../config/firebase';
import { sanitizeFirestore } from '../utils/sanitizeFirestore';
import {
  YouTubeConnectedAccount,
  YouTubeChannelBrandingSettings,
  YouTubePublishResult,
  YouTubeBroadcastRecord,
  SupportedIndianLanguage,
} from '../types/youtube';
import { loadMediaBlob } from '../utils/mediaBlobStore';

const SETTINGS_STORAGE_KEY = 'newspress_youtube_branding_settings_v1';
const ACCOUNT_STORAGE_KEY = 'newspress_youtube_connected_account_v1';
const ACCOUNTS_LIST_STORAGE_KEY = 'newspress_youtube_connected_accounts_list_v1';
const BROADCAST_HISTORY_STORAGE_KEY = 'newspress_youtube_broadcast_history_v1';

export const DEFAULT_BRANDING_SETTINGS: YouTubeChannelBrandingSettings = {
  watermark: {
    // Channel Logo Settings
    logoPlacement: 'top-right',
    logoScalePercent: 18,
    logoOpacityPercent: 90,
    logoXPercent: 88, // 88% from left (Top-Right)
    logoYPercent: 8,  // 8% from top

    // White Text Watermark (Middle / Center by default, or adjustable with 2 bars)
    placement: 'top-left',
    text: 'NEWS 24X7',
    textColor: '#ffffff',
    scalePercent: 18,
    opacityPercent: 85,
    xPercent: 50, // 50% (Center / Middle horizontal)
    yPercent: 50, // 50% (Center / Middle vertical)
    offsetX: 32,
    offsetY: 32,
  },
  defaultLanguage: 'te',
  voiceGender: 'male',
  voiceActorId: 'ravi_shankar',
  emotionalStyle: 'emotional_breaking',
  speechRate: 1.3, // High-energy fast breaking news default
  defaultCategory: '25', // News & Politics
  defaultTags: ['BreakingNews', 'NewsToday', 'TopStories', 'LatestNews'],
  descriptionTemplate: `🔴 Latest News Bulletin.\n\nSubscribe to our channel for authentic, real-time news updates.\n\nDisclaimer: This video report is produced using verified journalistic field footage and editorial summary.\n#News #BreakingNews #Updates`,
  privacyStatus: 'public', // Direct Public publication as requested
};

export class YouTubeService {
  /**
   * Retrieves stored branding and production settings.
   */
  static getSettings(): YouTubeChannelBrandingSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_BRANDING_SETTINGS,
          ...parsed,
          voiceActorId: parsed.voiceActorId || 'ravi_shankar',
          emotionalStyle: parsed.emotionalStyle || 'emotional_breaking',
          speechRate: (parsed.speechRate && parsed.speechRate !== 1.0) ? parsed.speechRate : 1.3,
        };
      }
    } catch (e) {
      console.warn('Failed to parse YouTube settings from localStorage:', e);
    }
    return DEFAULT_BRANDING_SETTINGS;
  }

  /**
   * Saves branding and production settings.
   */
  static saveSettings(settings: Partial<YouTubeChannelBrandingSettings>): YouTubeChannelBrandingSettings {
    const updated = { ...this.getSettings(), ...settings };
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save YouTube settings:', e);
    }
    return updated;
  }

  /**
   * Retrieves currently connected YouTube account.
   */
  static getConnectedAccount(): YouTubeConnectedAccount {
    try {
      const stored = localStorage.getItem(ACCOUNT_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse YouTube account from storage:', e);
    }

    // If no stored account, return disconnected state
    return {
      isConnected: false,
    };
  }

  /**
   * Retrieves all connected YouTube channels (multi-channel support for users managing multiple channels).
   */
  static getConnectedAccountsList(): YouTubeConnectedAccount[] {
    try {
      const stored = localStorage.getItem(ACCOUNTS_LIST_STORAGE_KEY);
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list) && list.length > 0) return list;
      }
    } catch (e) {}
    const current = this.getConnectedAccount();
    return current.isConnected ? [current] : [];
  }

  /**
   * Saves or disconnects YouTube account and keeps the multi-channel registry synchronized.
   */
  static saveConnectedAccount(account: YouTubeConnectedAccount): void {
    try {
      localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
      if (account.isConnected && account.channelId) {
        const list = this.getConnectedAccountsList();
        const existingIdx = list.findIndex((c) => c.channelId === account.channelId);
        if (existingIdx >= 0) {
          list[existingIdx] = account;
        } else {
          list.push(account);
        }
        localStorage.setItem(ACCOUNTS_LIST_STORAGE_KEY, JSON.stringify(list));
      }
    } catch (e) {
      console.error('Failed to persist connected YouTube account:', e);
    }
  }

  /**
   * Switches the active broadcast channel from the multi-channel list with 1-click.
   */
  static switchActiveChannel(channelId: string): YouTubeConnectedAccount | null {
    const list = this.getConnectedAccountsList();
    const target = list.find((c) => c.channelId === channelId);
    if (target) {
      this.saveConnectedAccount(target);
      return target;
    }
    return null;
  }

  /**
   * Connect YouTube channel via Google OAuth with YouTube scopes.
   * Commercial 1-Click Connection:
   * 1. Attempts Google Identity Services (GIS) initCodeClient to obtain permanent Refresh Token.
   * 2. Falls back to Firebase signInWithPopup if GIS is unavailable.
   * Never requires manual technical token configuration from end users!
   */
  static async connectGoogleYouTubeChannel(): Promise<YouTubeConnectedAccount> {
    const clientId = import.meta.env.VITE_YOUTUBE_CLIENT_ID || '';
    const cloudRunExchangeUrl = 'https://composevideo-vz346mffwa-uc.a.run.app?action=exchange_code';

    // 1. Try Google Identity Services (GIS) Code Flow to get a Permanent Refresh Token
    const tryGisCodeFlow = (): Promise<YouTubeConnectedAccount | null> => {
      return new Promise((resolve) => {
        const gis = (window as any).google?.accounts?.oauth2;
        if (!gis || typeof gis.initCodeClient !== 'function') {
          return resolve(null);
        }

        let isHandled = false;

        try {
          const client = gis.initCodeClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
            ux_mode: 'popup',
            select_account: true,
            callback: async (response: any) => {
              if (isHandled) return;
              isHandled = true;

              if (response.error) {
                console.warn('[YouTube Auth] GIS authorization returned error:', response.error);
                return resolve(null);
              }

              if (!response.code) {
                return resolve(null);
              }

              try {
                console.log('[YouTube Auth] Exchanging authorization code via Cloud Run backend...');
                const clientSecret = import.meta.env.VITE_YOUTUBE_CLIENT_SECRET || '';
                const exResp = await fetch(cloudRunExchangeUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    code: response.code,
                    clientId,
                    clientSecret,
                    redirectUri: 'postmessage',
                  }),
                });

                if (exResp.ok) {
                  const accountData: YouTubeConnectedAccount = await exResp.json();
                  if (accountData.isConnected) {
                    console.log('[YouTube Auth] Permanent YouTube connection established successfully!');
                    accountData.clientId = clientId;
                    accountData.clientSecret = clientSecret;
                    this.saveConnectedAccount(accountData);
                    return resolve(accountData);
                  }
                }
                const errData = await exResp.json().catch(() => ({}));
                console.warn('[YouTube Auth] Server code exchange failed:', errData);
                resolve(null);
              } catch (exErr) {
                console.warn('[YouTube Auth] Server exchange exception:', exErr);
                resolve(null);
              }
            },
            error_callback: (err: any) => {
              console.warn('[YouTube Auth] GIS popup error callback:', err);
              if (!isHandled) {
                isHandled = true;
                resolve(null);
              }
            },
          });

          client.requestCode();
        } catch (gisInitErr) {
          console.warn('[YouTube Auth] GIS init exception:', gisInitErr);
          resolve(null);
        }
      });
    };

    // Execute GIS code flow
    try {
      const gisResult = await tryGisCodeFlow();
      if (gisResult && gisResult.isConnected) {
        return gisResult;
      }
    } catch (e) {
      console.warn('[YouTube Auth] GIS attempt skipped, proceeding to standard auth:', e);
    }

    // 2. Standard Fallback: Firebase signInWithPopup
    if (!auth || !isFirebaseConfigured) {
      throw new Error(
        'Firebase Authentication is not configured. Please verify your environment configuration.'
      );
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/youtube.upload');
      provider.addScope('https://www.googleapis.com/auth/youtube.readonly');
      provider.setCustomParameters({
        prompt: 'consent select_account',
        access_type: 'offline',
      });

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      let channelTitle = result.user.displayName || 'News Channel';
      let channelAvatar = result.user.photoURL || '';
      let channelId = `UC_${result.user.uid}`;
      let subscribers = 0;

      // Fetch authentic YouTube channel details from YouTube Data API v3
      if (accessToken) {
        try {
          const resp = await fetch(
            'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          if (resp.ok) {
            const data = await resp.json();
            if (data.items && data.items.length > 0) {
              const item = data.items[0];
              channelId = item.id;
              channelTitle = item.snippet?.title || channelTitle;
              channelAvatar = item.snippet?.thumbnails?.default?.url || channelAvatar;
              subscribers = parseInt(item.statistics?.subscriberCount || '0', 10);
            }
          } else {
            const errData = await resp.json().catch(() => ({}));
            console.warn('YouTube channel fetch returned non-200:', errData);
          }
        } catch (apiErr) {
          console.warn('Direct YouTube channel info fetch failed, using Google account details:', apiErr);
        }
      }

      // Check if existing account had a permanent refresh token, preserve it!
      const existingAccount = this.getConnectedAccount();

      const connected: YouTubeConnectedAccount = {
        isConnected: true,
        channelId,
        channelTitle,
        channelAvatar,
        subscriberCount: subscribers,
        accessToken,
        refreshToken: existingAccount.refreshToken, // Preserve permanent refresh token if present
        tokenExpiresAt: Date.now() + 3500 * 1000,
        googleEmail: result.user.email || undefined,
        clientId,
        connectedAt: new Date().toISOString(),
      };

      this.saveConnectedAccount(connected);
      return connected;
    } catch (err: any) {
      console.error('Google YouTube OAuth connection failed:', err);

      // Handle Google OAuth access_denied / 403 specifically
      if (
        err?.code === 'auth/access-denied' ||
        err?.message?.includes('access_denied') ||
        err?.message?.includes('Error 403')
      ) {
        throw new Error(
          'Google OAuth 403 (Access Denied): Please ensure your Google account is listed under "Test Users" in your OAuth consent screen configuration, or use the Permanent Token option.'
        );
      }

      if (err?.code === 'auth/popup-closed-by-user') {
        throw new Error('Google Sign-In popup was closed before completing authorization.');
      }

      throw new Error(err?.message || 'Failed to authenticate with Google YouTube service.');
    }
  }

  /**
   * Connect YouTube channel using manual OAuth Access Token or Service Credentials.
   * Used for enterprise environments or direct API access.
   */
  static async connectWithAccessToken(token: string, channelName?: string): Promise<YouTubeConnectedAccount> {
    if (!token.trim()) {
      throw new Error('Access token cannot be empty.');
    }

    let channelTitle = channelName || 'Custom YouTube Channel';
    let channelId = 'UC_CustomChannel';
    let subscribers = 0;
    let channelAvatar = '';

    try {
      const resp = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data.items && data.items.length > 0) {
          const item = data.items[0];
          channelId = item.id;
          channelTitle = item.snippet?.title || channelTitle;
          channelAvatar = item.snippet?.thumbnails?.default?.url || '';
          subscribers = parseInt(item.statistics?.subscriberCount || '0', 10);
        }
      }
    } catch (e) {
      console.warn('Failed to query channel with token:', e);
    }

    const connected: YouTubeConnectedAccount = {
      isConnected: true,
      channelId,
      channelTitle,
      channelAvatar,
      subscriberCount: subscribers,
      accessToken: token,
      connectedAt: new Date().toISOString(),
    };

    this.saveConnectedAccount(connected);
    return connected;
  }

  /**
   * Automatically exchanges a permanent Google OAuth Refresh Token for a fresh short-lived Access Token.
   * Calls Google Cloud Run token microservice to execute the secure token exchange.
   */
  static async refreshAccessToken(
    refreshToken: string,
    clientId?: string,
    clientSecret?: string
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const effectiveClientId =
      clientId?.trim() ||
      import.meta.env.VITE_YOUTUBE_CLIENT_ID ||
      '';
    const effectiveClientSecret =
      clientSecret?.trim() ||
      import.meta.env.VITE_YOUTUBE_CLIENT_SECRET ||
      '';

    const endpoint = 'https://composevideo-vz346mffwa-uc.a.run.app?action=refresh_token';
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken,
        clientId: effectiveClientId,
        clientSecret: effectiveClientSecret,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in || 3600,
      };
    }
    const errText = await resp.text().catch(() => '');
    throw new Error(`Token refresh failed with HTTP ${resp.status}: ${errText}`);
  }

  /**
   * Connect YouTube channel using a permanent OAuth 2.0 Refresh Token.
   * Provides permanent 24/7 autonomous connectivity without requiring users or reporters to re-login every hour!
   */
  static async connectWithRefreshToken(
    refreshToken: string,
    channelName?: string,
    clientId?: string,
    clientSecret?: string
  ): Promise<YouTubeConnectedAccount> {
    if (!refreshToken.trim()) {
      throw new Error('Refresh token cannot be empty.');
    }

    // 1. Exchange refresh token for fresh access token immediately
    const refreshed = await this.refreshAccessToken(refreshToken.trim(), clientId?.trim(), clientSecret?.trim());
    const accessToken = refreshed.accessToken;

    let channelTitle = channelName || 'Official News Channel';
    let channelId = 'UC_PermanentChannel';
    let subscribers = 0;
    let channelAvatar = '';

    // 2. Query channel details from YouTube Data API v3
    try {
      const resp = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data.items && data.items.length > 0) {
          const item = data.items[0];
          channelId = item.id;
          channelTitle = item.snippet?.title || channelTitle;
          channelAvatar = item.snippet?.thumbnails?.default?.url || '';
          subscribers = parseInt(item.statistics?.subscriberCount || '0', 10);
        }
      }
    } catch (e) {
      console.warn('Channel query with refreshed token error:', e);
    }

    const connected: YouTubeConnectedAccount = {
      isConnected: true,
      channelId,
      channelTitle,
      channelAvatar,
      subscriberCount: subscribers,
      accessToken,
      refreshToken: refreshToken.trim(),
      tokenExpiresAt: Date.now() + (refreshed.expiresIn || 3500) * 1000,
      clientId: clientId?.trim(),
      clientSecret: clientSecret?.trim(),
      connectedAt: new Date().toISOString(),
    };

    this.saveConnectedAccount(connected);
    return connected;
  }

  /**
   * Ensures an active, unexpired YouTube OAuth access token is available.
   * If a permanent Refresh Token is present, automatically and silently refreshes expired tokens in the background!
   */
  static async getValidAccessToken(): Promise<string> {
    const account = this.getConnectedAccount();
    if (!account.isConnected) {
      throw new Error(
        'No YouTube channel connected. Please connect your YouTube channel in Settings before publishing.'
      );
    }

    const now = Date.now();
    const isExpired = !account.accessToken || (account.tokenExpiresAt ? now >= account.tokenExpiresAt - 300000 : false);

    // If permanent refresh token exists and token is expired or expiring in < 5 minutes, silently refresh!
    if (account.refreshToken && (isExpired || !account.accessToken)) {
      try {
        console.log('[YouTube Auth] Silently refreshing access token using permanent refresh token...');
        const refreshed = await this.refreshAccessToken(account.refreshToken, account.clientId, account.clientSecret);
        if (refreshed.accessToken) {
          account.accessToken = refreshed.accessToken;
          account.tokenExpiresAt = Date.now() + (refreshed.expiresIn || 3500) * 1000;
          this.saveConnectedAccount(account);
          return account.accessToken;
        }
      } catch (e: any) {
        console.warn('[YouTube Auth] Auto-refresh with refresh token failed:', e.message);
      }
    }

    if (account.accessToken) {
      return account.accessToken;
    }

    throw new Error(
      'Your YouTube channel session has expired (Google OAuth tokens expire after 1 hour). Please click "Reconnect YouTube Channel" or configure a permanent Refresh Token in Settings.'
    );
  }

  /**
   * Disconnects a specific YouTube channel or clears all channels.
   */
  static disconnectYouTubeChannel(channelId?: string): void {
    if (!channelId) {
      localStorage.removeItem(ACCOUNT_STORAGE_KEY);
      localStorage.removeItem(ACCOUNTS_LIST_STORAGE_KEY);
      return;
    }
    const list = this.getConnectedAccountsList().filter((c) => c.channelId !== channelId);
    localStorage.setItem(ACCOUNTS_LIST_STORAGE_KEY, JSON.stringify(list));
    if (list.length > 0) {
      this.saveConnectedAccount(list[0]);
    } else {
      localStorage.removeItem(ACCOUNT_STORAGE_KEY);
    }
  }

  /**
   * Direct video and thumbnail upload to YouTube Data API v3.
   * Uses automatic background token renewal for permanent 24/7 autonomous uptime.
   */
  static async uploadVideoAndThumbnail(params: {
    videoBlob: Blob;
    thumbnailBlob?: Blob;
    title: string;
    description: string;
    tags: string[];
    categoryId?: string;
    privacyStatus?: 'public' | 'unlisted' | 'private';
    onProgress?: (percent: number, message: string) => void;
  }): Promise<YouTubePublishResult> {
    const { videoBlob, thumbnailBlob, title, description, tags, categoryId = '25', privacyStatus = 'public', onProgress } = params;
    
    // Automatically retrieve or silently refresh active OAuth credentials
    const accessToken = await this.getValidAccessToken();

    onProgress?.(10, 'Initializing YouTube Data API v3 resumable upload session...');

    try {
      // Resumable YouTube Video Upload
      const metadata = {
        snippet: {
          title,
          description,
          tags,
          categoryId,
        },
        status: {
          privacyStatus,
          selfDeclaredMadeForKids: false,
        },
      };

      const initResponse = await fetch(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Length': videoBlob.size.toString(),
            'X-Upload-Content-Type': videoBlob.type || 'video/mp4',
          },
          body: JSON.stringify(metadata),
        }
      );

        if (!initResponse.ok) {
          const errBody = await initResponse.json().catch(() => ({}));
          const errMsg = errBody?.error?.message || `YouTube API returned HTTP ${initResponse.status}`;
          if (initResponse.status === 401 || errMsg.includes('invalid authentication credentials') || errMsg.includes('Expected OAuth 2')) {
            throw new Error(
              'Your YouTube channel session has expired (Google OAuth tokens expire after 1 hour). Please click "Reconnect YouTube Channel" below to refresh your token and broadcast.'
            );
          }
          throw new Error(`YouTube API Initialization Failed: ${errMsg}`);
        }

        const uploadUrl = initResponse.headers.get('Location');
        if (!uploadUrl) {
          throw new Error('YouTube API did not provide a valid resumable upload location URL.');
        }

        onProgress?.(35, 'Transmitting 1080p broadcast video to YouTube Data API...');
        const uploadResp = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': videoBlob.type || 'video/mp4',
          },
          body: videoBlob,
        });

        if (!uploadResp.ok) {
          const errBody = await uploadResp.json().catch(() => ({}));
          const errMsg = errBody?.error?.message || `Upload failed with HTTP ${uploadResp.status}`;
          throw new Error(`YouTube Video Upload Failed: ${errMsg}`);
        }

        const videoData = await uploadResp.json();
        const videoId = videoData.id;

        onProgress?.(80, 'Uploading breaking news thumbnail...');
        let thumbSuccess = false;
        if (thumbnailBlob && videoId) {
          try {
            const thumbResp = await fetch(
              `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': thumbnailBlob.type || 'image/jpeg',
                },
                body: thumbnailBlob,
              }
            );
            thumbSuccess = thumbResp.ok;
          } catch (tErr) {
            console.warn('Thumbnail upload warning:', tErr);
          }
        }

        onProgress?.(100, 'Published directly to YouTube as Public!');
        return {
          videoId,
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          title,
          publishedAt: new Date().toISOString(),
          privacyStatus,
          thumbnailUploaded: thumbSuccess,
        };
      } catch (err: any) {
        console.error('YouTube Data API execution error:', err);
        throw new Error(err?.message || 'Failed to complete video upload to YouTube Data API.');
      }
  }

  /**
   * Queries YouTube Data API v3 to inspect live video ingestion and transcoding status.
   * Tells users whether YouTube has finished processing SD/HD versions of their broadcast.
   * Once uploadStatus === 'processed', SD resolution is 100% ready to watch and share!
   */
  static async getVideoProcessingStatus(videoId: string, token?: string): Promise<{
    isProcessed: boolean;
    isSdReady: boolean;
    uploadStatus: string;
    processingStatus: string;
    progressPercentage?: number;
    privacyStatus?: string;
  }> {
    try {
      let accessToken = token;
      if (!accessToken) {
        try {
          accessToken = await this.getValidAccessToken();
        } catch (e) {}
      }
      if (!accessToken) {
        return { isProcessed: false, isSdReady: false, uploadStatus: 'unknown', processingStatus: 'unknown' };
      }

      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=status,processingDetails&id=${encodeURIComponent(videoId)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }
      );
      if (!resp.ok) {
        return { isProcessed: false, isSdReady: false, uploadStatus: 'unknown', processingStatus: 'unknown' };
      }
      const data = await resp.json();
      const item = data.items?.[0];
      if (!item) {
        return { isProcessed: false, isSdReady: false, uploadStatus: 'not_found', processingStatus: 'unknown' };
      }
      const uploadStatus = item.status?.uploadStatus || 'unknown';
      const processingStatus = item.processingDetails?.processingStatus || 'unknown';
      // In YouTube Data API, uploadStatus === 'processed' means SD processing is 100% finished and playable!
      const isSdReady = uploadStatus === 'processed' || processingStatus === 'succeeded';
      const isProcessed = isSdReady;

      let progressPercentage: number | undefined;
      const progress = item.processingDetails?.processingProgress;
      if (progress && progress.partsTotal > 0) {
        progressPercentage = Math.round((progress.partsProcessed / progress.partsTotal) * 100);
      }

      return {
        isProcessed,
        isSdReady,
        uploadStatus,
        processingStatus,
        progressPercentage,
        privacyStatus: item.status?.privacyStatus,
      };
    } catch (e) {
      console.warn('Failed to query YouTube video processing status:', e);
      return { isProcessed: false, isSdReady: false, uploadStatus: 'unknown', processingStatus: 'unknown' };
    }
  }

  /**
   * Saves a published broadcast record to local storage and Firestore.
   * Ensures resilience against browser crash or tab closing.
   */
  static async saveBroadcastRecord(record: YouTubeBroadcastRecord): Promise<void> {
    try {
      const existing = this.getStoredBroadcastRecords();
      const filtered = existing.filter((r) => r.videoId !== record.videoId);
      const updated = [record, ...filtered].slice(0, 60);
      localStorage.setItem(BROADCAST_HISTORY_STORAGE_KEY, JSON.stringify(updated));

      // Persist to Firestore if live db is available
      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'youtube_broadcasts', record.videoId), sanitizeFirestore({
            ...record,
            savedAt: new Date().toISOString(),
          }), { merge: true });
        } catch (fsErr) {
          console.warn('Could not persist broadcast record to Firestore:', fsErr);
        }
      }
    } catch (e) {
      console.warn('Failed to save broadcast record locally:', e);
    }
  }

  /**
   * Returns locally cached broadcast records instantly.
   */
  static getStoredBroadcastRecords(): YouTubeBroadcastRecord[] {
    try {
      const data = localStorage.getItem(BROADCAST_HISTORY_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Retrieves all processed broadcast records across Firestore and local storage.
   */
  static async getAllBroadcastRecords(): Promise<YouTubeBroadcastRecord[]> {
    const local = this.getStoredBroadcastRecords();
    if (!isFirebaseConfigured || !db) {
      return local;
    }
    try {
      const q = query(collection(db, 'youtube_broadcasts'), orderBy('publishedAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      const remoteRecords: YouTubeBroadcastRecord[] = [];
      snap.forEach((d) => {
        const item = d.data() as YouTubeBroadcastRecord;
        if (item.videoId) remoteRecords.push(item);
      });
      if (remoteRecords.length > 0) {
        const idMap = new Map<string, YouTubeBroadcastRecord>();
        for (const r of local) idMap.set(r.videoId, r);
        for (const r of remoteRecords) idMap.set(r.videoId, r);
        const merged = Array.from(idMap.values()).sort(
          (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
        localStorage.setItem(BROADCAST_HISTORY_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    } catch (err) {
      console.warn('Failed to fetch broadcast records from Firestore, using local cache:', err);
    }
    return local;
  }

  /**
   * Rehydrates persisted intro & outro video blobs from IndexedDB
   * so user bumpers work seamlessly after browser refreshes.
   */
  static async getHydratedIntroOutroBlobs(): Promise<{
    introVideoBlob?: Blob;
    outroVideoBlob?: Blob;
  }> {
    const [introBlob, outroBlob] = await Promise.all([
      loadMediaBlob('youtube_intro_video_blob'),
      loadMediaBlob('youtube_outro_video_blob'),
    ]);
    return {
      introVideoBlob: introBlob || undefined,
      outroVideoBlob: outroBlob || undefined,
    };
  }
}
