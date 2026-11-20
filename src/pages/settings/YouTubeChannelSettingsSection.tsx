/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * YouTube Channel & Video Branding Settings Section
 * National standard edition: Professional English UI.
 * Connect authentic YouTube Channel via Google OAuth or Direct Access Token,
 * upload Channel Logo Watermark with precision layout controls,
 * configure opening Intro and closing Outro clips, and set editorial preferences.
 */

import React, { useState, useEffect } from 'react';
import {
  Youtube,
  Upload,
  Video,
  CheckCircle2,
  Trash2,
  Globe,
  Sliders,
  Play,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Key,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { YouTubeService } from '../../services/youtubeService';
import { saveMediaBlob, loadMediaBlob, deleteMediaBlob } from '../../utils/mediaBlobStore';
import { getInitialsAvatarDataUrl } from '../../utils/avatarFallback';
import {
  YouTubeChannelBrandingSettings,
  YouTubeConnectedAccount,
  SUPPORTED_INDIAN_LANGUAGES,
  SupportedIndianLanguage,
  WatermarkPlacement,
} from '../../types/youtube';

export const YouTubeChannelSettingsSection: React.FC = () => {
  const [settings, setSettings] = useState<YouTubeChannelBrandingSettings>(() => YouTubeService.getSettings());
  const [account, setAccount] = useState<YouTubeConnectedAccount>(() => YouTubeService.getConnectedAccount());
  const [isConnecting, setIsConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Manual token modal/field
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [manualToken, setManualToken] = useState(account.refreshToken || '');
  const [manualChannelTitle, setManualChannelTitle] = useState(account.channelTitle || '');
  const [manualClientId, setManualClientId] = useState(account.clientId || '970306052942-v8nui4keia6k8kvvntgh02hset1qcqi8.apps.googleusercontent.com');
  const [manualClientSecret, setManualClientSecret] = useState(account.clientSecret || '');

  // File upload refs/states
  const [introFileName, setIntroFileName] = useState<string>(settings.introVideoFileName || '');
  const [outroFileName, setOutroFileName] = useState<string>(settings.outroVideoFileName || '');

  // Rehydrate saved Intro & Outro blobs from IndexedDB so previews work after page reload
  useEffect(() => {
    let active = true;
    (async () => {
      const [introBlob, outroBlob] = await Promise.all([
        loadMediaBlob('youtube_intro_video_blob'),
        loadMediaBlob('youtube_outro_video_blob'),
      ]);
      if (!active) return;
      setSettings((prev) => ({
        ...prev,
        introVideoUrl: introBlob ? URL.createObjectURL(introBlob) : undefined,
        outroVideoUrl: outroBlob ? URL.createObjectURL(outroBlob) : undefined,
      }));
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleConnectChannel = async () => {
    setIsConnecting(true);
    setAuthError(null);
    try {
      const conn = await YouTubeService.connectGoogleYouTubeChannel();
      setAccount(conn);
    } catch (err: any) {
      console.error('Failed to connect YouTube channel:', err);
      setAuthError(err?.message || 'Authentication failed. Please verify your Google account permissions.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = manualToken.trim();
    if (!token) return;
    setIsConnecting(true);
    setAuthError(null);
    try {
      // Detect if Permanent Refresh Token (1//...) or Short-Lived Access Token (ya29...)
      let conn: YouTubeConnectedAccount;
      if (token.startsWith('1//') || token.length > 80) {
        conn = await YouTubeService.connectWithRefreshToken(
          token,
          manualChannelTitle.trim() || undefined,
          manualClientId.trim() || undefined,
          manualClientSecret.trim() || undefined
        );
      } else {
        conn = await YouTubeService.connectWithAccessToken(token, manualChannelTitle.trim() || undefined);
      }
      setAccount(conn);
      setShowTokenInput(false);
      setManualToken('');
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to authenticate with provided YouTube credentials.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectChannel = () => {
    YouTubeService.disconnectYouTubeChannel();
    setAccount({ isConnected: false });
    setAuthError(null);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setSettings((prev) => {
          const updated = {
            ...prev,
            watermark: {
              ...prev.watermark,
              logoDataUrl: dataUrl,
            },
          };
          YouTubeService.saveSettings(updated);
          return updated;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIntroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await saveMediaBlob('youtube_intro_video_blob', file);
      const url = URL.createObjectURL(file);
      setIntroFileName(file.name);
      setSettings((prev) => {
        const updated = {
          ...prev,
          introVideoUrl: url,
          introVideoFileName: file.name,
        };
        YouTubeService.saveSettings(updated);
        return updated;
      });
    }
  };

  const handleOutroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await saveMediaBlob('youtube_outro_video_blob', file);
      const url = URL.createObjectURL(file);
      setOutroFileName(file.name);
      setSettings((prev) => {
        const updated = {
          ...prev,
          outroVideoUrl: url,
          outroVideoFileName: file.name,
        };
        YouTubeService.saveSettings(updated);
        return updated;
      });
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    YouTubeService.saveSettings(settings);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 400);
  };

  return (
    <div className="space-y-8">
      {/* 1. YouTube Channel Google Connection Card */}
      <Card className="p-6 border-l-4 border-red-600 bg-gradient-to-r from-red-50/40 via-white to-neutral-50 dark:from-red-950/20 dark:via-neutral-900 dark:to-neutral-900">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-600/20 shrink-0">
              <Youtube className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                  YouTube Channel Connection
                </h3>
                {account.isConnected ? (
                  <Badge variant="emerald" className="flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-neutral-500 font-semibold">
                    Not Connected
                  </Badge>
                )}
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 max-w-xl">
                Link your official YouTube channel using Google Sign-In. Processed news packages, voice-overs, and
                high-CTR AI thumbnails are published directly to this channel as Public broadcasts.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {account.isConnected ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTokenInput(!showTokenInput)}
                  className="text-xs font-semibold text-neutral-700 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700"
                >
                  <Key className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                  {account.refreshToken ? 'Edit Permanent Token' : 'Upgrade to Permanent Token'}
                </Button>
                <Button size="sm" onClick={handleConnectChannel} disabled={isConnecting} variant="outline" className="text-xs">
                  {isConnecting ? 'Reconnecting...' : 'Google Sign-In'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDisconnectChannel} className="text-red-600 hover:bg-red-50 text-xs">
                  <Trash2 className="w-4 h-4 mr-1" /> Disconnect
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button
                  onClick={handleConnectChannel}
                  disabled={isConnecting}
                  className="bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 font-bold px-5 py-2.5 rounded-xl cursor-pointer text-xs"
                >
                  <Youtube className="w-4 h-4 mr-2" />
                  {isConnecting ? 'Authenticating with Google...' : 'Connect YouTube Channel (Google OAuth)'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTokenInput(!showTokenInput)}
                  className="text-xs font-semibold text-neutral-700 dark:text-neutral-300"
                >
                  <Key className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Permanent Refresh Token (24/7)
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Permanent 24/7 Auto-Refresh Guidance Box if connected via 1-hour access token */}
        {account.isConnected && !account.refreshToken && !showTokenInput && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                <strong>Temporary 1-Hour Session:</strong> Google OAuth tokens expire every hour. To keep autonomous publishing permanent for all reporters, configure a permanent Refresh Token.
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => setShowTokenInput(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer"
            >
              Configure Permanent Token
            </Button>
          </div>
        )}

        {/* Manual Permanent Refresh Token / Access Token Form */}
        {showTokenInput && (
          <form onSubmit={handleManualTokenSubmit} className="mt-5 p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Permanent 24/7 YouTube Channel Authentication (OAuth 2.0 Refresh Token)
                </h4>
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 font-mono">
                Never Expires &bull; Autonomous
              </Badge>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Google OAuth tokens (<code className="font-mono text-neutral-800 dark:text-neutral-200">ya29...</code>) expire after 60 minutes. Entering a permanent Refresh Token (<code className="font-mono text-neutral-800 dark:text-neutral-200">1//...</code>) allows our Cloud Run engine to auto-refresh tokens in the background, allowing all your reporters to publish 24/7 without reconnecting.
            </p>

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
                <ExternalLink className="w-3.5 h-3.5" /> Quick Guide: How to get your permanent 1//... Refresh Token
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-800/90 dark:text-blue-300/90 pl-1">
                <li>
                  Open <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noreferrer" className="font-bold underline text-blue-600 dark:text-blue-400">Google OAuth 2.0 Playground (Click here)</a>.
                </li>
                <li>
                  Under <strong>Step 1: Select & authorize APIs</strong>, scroll to <strong>YouTube Data API v3</strong> and check:
                  <br />
                  <code className="bg-blue-100 dark:bg-blue-900/60 px-1 py-0.5 rounded text-[10px] font-mono">https://www.googleapis.com/auth/youtube.upload</code> and <code className="bg-blue-100 dark:bg-blue-900/60 px-1 py-0.5 rounded text-[10px] font-mono">https://www.googleapis.com/auth/youtube.readonly</code>
                </li>
                <li>
                  Click <strong>Authorize APIs</strong> and sign in with the Google Account that owns your YouTube channel.
                </li>
                <li>
                  In <strong>Step 2: Exchange authorization code for tokens</strong>, click <strong>"Exchange authorization code for tokens"</strong>.
                </li>
                <li>
                  Copy the <strong>Refresh token</strong> value (starts with <code className="font-mono font-bold">1//...</code>) and paste it in the box below!
                </li>
              </ol>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  OAuth 2.0 Refresh Token (starts with 1//...) or Access Token
                </label>
                <Input
                  type="password"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="1//04..."
                  className="text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Channel Display Name (Optional)
                </label>
                <Input
                  value={manualChannelTitle}
                  onChange={(e) => setManualChannelTitle(e.target.value)}
                  placeholder="e.g. Alfa News Service"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Google Client ID (Optional)
                </label>
                <Input
                  value={manualClientId}
                  onChange={(e) => setManualClientId(e.target.value)}
                  placeholder="970306052942-....apps.googleusercontent.com"
                  className="text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Google Client Secret (Optional - only if using custom credentials)
                </label>
                <Input
                  type="password"
                  value={manualClientSecret}
                  onChange={(e) => setManualClientSecret(e.target.value)}
                  placeholder="GOCSPX-..."
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowTokenInput(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isConnecting} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4">
                {isConnecting ? 'Verifying & Linking...' : 'Save & Link Permanent Channel'}
              </Button>
            </div>
          </form>
        )}

        {/* OAuth Error Alert Banner */}
        {authError && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs text-red-900 dark:text-red-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Google OAuth Connection Error</span>
            </div>
            <p className="leading-relaxed">{authError}</p>
            <div className="pt-2 flex items-center gap-3">
              <a
                href="https://console.cloud.google.com/apis/credentials/consent?project=alfa-news-service-test-project"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
              >
                Open Google Cloud Console &rarr; OAuth Consent Screen
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Connected Channel Card Details */}
        {account.isConnected && (
          <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/70 dark:bg-neutral-800/50 p-4 rounded-xl">
            <div className="flex items-center gap-3 md:col-span-2">
              <img
                src={account.channelAvatar || getInitialsAvatarDataUrl(account.channelTitle || 'YT')}
                alt={account.channelTitle}
                className="w-12 h-12 rounded-full border-2 border-red-500 object-cover"
              />
              <div>
                <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  {account.channelTitle}
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </h4>
                <p className="text-xs text-neutral-500 font-mono">{account.channelId || account.channelCustomUrl}</p>
                {account.googleEmail && <p className="text-xs text-neutral-500">{account.googleEmail}</p>}
                <div className="flex items-center gap-2 mt-1">
                  {account.refreshToken ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      <ShieldCheck className="w-3 h-3" /> Permanent 24/7 Auto-Refresh
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                      <AlertCircle className="w-3 h-3" /> 1-Hour Token (Expires Soon)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-center">
              <span className="text-xs text-neutral-500 uppercase font-semibold">Subscribers</span>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                {(account.subscriberCount || 0).toLocaleString()}
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-center">
              <span className="text-xs text-neutral-500 uppercase font-semibold">Upload Mode</span>
              <p className="text-sm font-bold text-emerald-600 uppercase">Direct Public</p>
            </div>
          </div>
        )}
      </Card>

      {/* 2. Indian Language & Voice-Over Anchor Configuration */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-xl">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Language & Voice-Over Anchor Preferences
            </h3>
            <p className="text-xs text-neutral-500">
              Gemini AI Senior Editor writes the 60–70 word voice-over script in your chosen broadcast language.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Language Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-2">
              Default Broadcast Language
            </label>
            <select
              value={settings.defaultLanguage}
              onChange={(e) =>
                setSettings({ ...settings, defaultLanguage: e.target.value as SupportedIndianLanguage })
              }
              className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500"
            >
              {SUPPORTED_INDIAN_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-500 mt-1">
              Supports 10+ Indian languages for national and regional editions.
            </p>
          </div>

          {/* Voice Gender */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-2">
              Voice-Over Anchor Gender
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, voiceGender: 'female' })}
                className={`py-2 px-3 rounded-xl border text-sm font-medium transition cursor-pointer ${
                  settings.voiceGender === 'female'
                    ? 'border-red-600 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 font-bold'
                    : 'border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50'
                }`}
              >
                Female Anchor
              </button>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, voiceGender: 'male' })}
                className={`py-2 px-3 rounded-xl border text-sm font-medium transition cursor-pointer ${
                  settings.voiceGender === 'male'
                    ? 'border-red-600 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 font-bold'
                    : 'border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50'
                }`}
              >
                Male Anchor
              </button>
            </div>
          </div>

          {/* Speech Reading Speed */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                Pacing / Speech Rate
              </label>
              <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                {settings.speechRate.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.3"
              step="0.05"
              value={settings.speechRate}
              onChange={(e) => setSettings({ ...settings, speechRate: parseFloat(e.target.value) })}
              className="w-full accent-red-600"
            />
            <div className="flex justify-between text-[11px] text-neutral-400 mt-1">
              <span>0.8x (Deliberate)</span>
              <span>1.0x (Standard)</span>
              <span>1.3x (Fast Breaking)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Watermark Logo Positioning & Branding */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 rounded-xl">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Channel Watermark Logo Placement</h3>
            <p className="text-xs text-neutral-500">
              The station watermark is composited continuously over the news footage by the video engine.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 space-y-4">
            {/* Logo file selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Upload Transparent Channel Logo (PNG / WebP)
              </label>
              <input
                type="file"
                accept="image/png,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                className="w-full text-xs text-neutral-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-neutral-100 dark:file:bg-neutral-800 file:text-neutral-700 dark:file:text-neutral-200 hover:file:bg-neutral-200 cursor-pointer"
              />
            </div>

            {/* Position Picker */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Watermark Screen Corner
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['top-right', 'top-left', 'bottom-right', 'bottom-left'] as WatermarkPlacement[]).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        watermark: { ...settings.watermark, placement: pos },
                      })
                    }
                    className={`py-2 px-3 text-xs uppercase font-bold rounded-xl border transition cursor-pointer ${
                      settings.watermark.placement === pos
                        ? 'border-red-600 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                        : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {pos.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders: Scale & Opacity */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Logo Size</span>
                  <span>{settings.watermark.scalePercent}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="30"
                  value={settings.watermark.scalePercent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      watermark: { ...settings.watermark, scalePercent: parseInt(e.target.value, 10) },
                    })
                  }
                  className="w-full accent-red-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Logo Opacity</span>
                  <span>{settings.watermark.opacityPercent}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={settings.watermark.opacityPercent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      watermark: { ...settings.watermark, opacityPercent: parseInt(e.target.value, 10) },
                    })
                  }
                  className="w-full accent-red-600"
                />
              </div>
            </div>
          </div>

          {/* 16:9 Frame Preview Box */}
          <div className="lg:col-span-6">
            <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
              Broadcast TV Frame Preview (16:9)
            </span>
            <div className="relative aspect-video bg-neutral-900 rounded-2xl overflow-hidden border-2 border-neutral-700 shadow-inner flex items-center justify-center">
              <span className="text-neutral-600 text-xs font-semibold">User Video Footage Area</span>

              {/* Watermark position preview */}
              <div
                className="absolute p-2 transition-all"
                style={{
                  top: settings.watermark.placement.startsWith('top') ? '12px' : 'auto',
                  bottom: settings.watermark.placement.startsWith('bottom') ? '12px' : 'auto',
                  left: settings.watermark.placement.endsWith('left') ? '12px' : 'auto',
                  right: settings.watermark.placement.endsWith('right') ? '12px' : 'auto',
                  opacity: (settings.watermark.opacityPercent || 90) / 100,
                  width: `${settings.watermark.scalePercent * 2.2}%`,
                }}
              >
                {settings.watermark.logoDataUrl ? (
                  <img src={settings.watermark.logoDataUrl} alt="Watermark" className="w-full h-auto drop-shadow-md" />
                ) : (
                  <div className="bg-red-600 text-white font-black text-[10px] px-2 py-1 rounded shadow">
                    NEWS LOGO
                  </div>
                )}
              </div>

              {/* Breaking bar preview */}
              <div className="absolute bottom-0 inset-x-0 bg-red-600 text-white text-[10px] font-bold py-1 px-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>LIVE REPORT // 24X7 NEWS BULLETIN</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Intro & Outro Video Clips */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-xl">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Channel Intro & Outro Video Clips</h3>
            <p className="text-xs text-neutral-500">
              The video engine prepends your Intro clip at the opening, and appends the Outro clip at the conclusion of every broadcast package.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Intro Clip Upload */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Play className="w-4 h-4 text-emerald-600" /> Intro Clip (Opening 3–5s)
              </span>
              {settings.introVideoUrl && (
                <button
                  type="button"
                  onClick={async () => {
                    await deleteMediaBlob('youtube_intro_video_blob');
                    const updated = { ...settings, introVideoUrl: undefined, introVideoFileName: undefined };
                    setIntroFileName('');
                    setSettings(updated);
                    YouTubeService.saveSettings(updated);
                  }}
                  className="text-xs text-red-600 hover:underline cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>

            {settings.introVideoUrl ? (
              <video src={settings.introVideoUrl} controls className="w-full aspect-video rounded-lg bg-black" />
            ) : (
              <label className="aspect-video rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 p-4 transition">
                <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Upload Channel Intro (MP4)
                </span>
                <span className="text-[10px] text-neutral-400 mt-1">Recommended: 1080p, 3–5 seconds</span>
                <input type="file" accept="video/mp4,video/webm" onChange={handleIntroUpload} className="hidden" />
              </label>
            )}
            {introFileName && <p className="text-[11px] text-neutral-500 mt-2 font-mono truncate">{introFileName}</p>}
          </div>

          {/* Outro Clip Upload */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Play className="w-4 h-4 text-emerald-600" /> Outro Clip (Closing / Call-to-Action)
              </span>
              {settings.outroVideoUrl && (
                <button
                  type="button"
                  onClick={async () => {
                    await deleteMediaBlob('youtube_outro_video_blob');
                    const updated = { ...settings, outroVideoUrl: undefined, outroVideoFileName: undefined };
                    setOutroFileName('');
                    setSettings(updated);
                    YouTubeService.saveSettings(updated);
                  }}
                  className="text-xs text-red-600 hover:underline cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>

            {settings.outroVideoUrl ? (
              <video src={settings.outroVideoUrl} controls className="w-full aspect-video rounded-lg bg-black" />
            ) : (
              <label className="aspect-video rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 p-4 transition">
                <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Upload Channel Outro (MP4)
                </span>
                <span className="text-[10px] text-neutral-400 mt-1">Recommended: 1080p, 4–8 seconds</span>
                <input type="file" accept="video/mp4,video/webm" onChange={handleOutroUpload} className="hidden" />
              </label>
            )}
            {outroFileName && <p className="text-[11px] text-neutral-500 mt-2 font-mono truncate">{outroFileName}</p>}
          </div>
        </div>
      </Card>

      {/* Save Button Bar */}
      <div className="flex flex-col sm:flex-row sm:justify-end items-stretch sm:items-center gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
        {saveSuccess && (
          <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> YouTube Branding Settings Successfully Saved!
          </span>
        )}
        <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold px-8 cursor-pointer">
          {isSaving ? 'Saving...' : 'Save YouTube Channel Settings'}
        </Button>
      </div>
    </div>
  );
};
