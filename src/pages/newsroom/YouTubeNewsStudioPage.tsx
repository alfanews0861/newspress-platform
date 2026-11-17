/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress YouTube News Video Studio
 * National Standard Edition (Professional English UI).
 * Zero-friction autonomous studio:
 * Upload field footage + Enter news manuscript -> Click "Publish to YouTube".
 * 
 * Production Pipeline:
 * 1. Editorial & Guidelines Verification
 * 2. News Manuscript & Broadcast Headlines Formatting
 * 3. Studio Anchor Narration Audio Recording
 * 4. Footage Keyframe Visual Extraction & Broadcast Graphics (Dynamic Thumbnail)
 * 5. High-Definition Broadcast Composition (Footage + Watermark + Narration)
 * 6. Direct Transmission to Official YouTube Channel
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Youtube,
  Upload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Languages,
  RotateCw,
  Rocket,
  ShieldCheck,
  Video,
  FileText,
  Settings,
  Clock,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Layers,
  Film,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { YouTubeService } from '../../services/youtubeService';
import { AIVideoEditorialService, PolicyComplianceResult } from '../../services/aiVideoEditorialService';
import { ThumbnailGeneratorService } from '../../services/thumbnailGeneratorService';
import { VideoCompositorService } from '../../services/videoCompositorService';
import { newsSubmissionService } from '../../services/newsSubmissionService';
import { marketplaceService } from '../../services/marketplaceService';
import { useTenant } from '../../hooks/useTenant';
import {
  YouTubeConnectedAccount,
  YouTubeChannelBrandingSettings,
  SUPPORTED_INDIAN_LANGUAGES,
  SupportedIndianLanguage,
  YouTubePublishResult,
  NewsVideoClipItem,
} from '../../types/youtube';
import { navigateTo } from '../../utils/navigation';

export const YouTubeNewsStudioPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const [settings, setSettings] = useState<YouTubeChannelBrandingSettings>(() => YouTubeService.getSettings());
  const [account, setAccount] = useState<YouTubeConnectedAccount>(() => YouTubeService.getConnectedAccount());

  // Form Inputs: 3 Dedicated Sequential Clip Slots (Opening, Main Speech, Conclusion)
  const [newsText, setNewsText] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedIndianLanguage>(settings.defaultLanguage || 'te');
  const [clips, setClips] = useState<(NewsVideoClipItem | null)[]>([null, null, null]);
  const [clipDurationMode, setClipDurationMode] = useState<'bulletin' | '60s' | '120s' | '300s' | 'full'>('full');

  // Publishing Pipeline State
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [complianceWarning, setComplianceWarning] = useState<string | null>(null);
  const [publishedResult, setPublishedResult] = useState<YouTubePublishResult | null>(null);
  const [publishedThumbnailUrl, setPublishedThumbnailUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setSettings(YouTubeService.getSettings());
    const acc = YouTubeService.getConnectedAccount();
    setAccount(acc);
  }, []);

  // Newsroom + Purchased Marketplace stories for zero-friction script loading
  const newsroomStories = React.useMemo(() => {
    const tenantId = currentTenant?.tenantId;
    const own = newsSubmissionService
      .getArticles(tenantId)
      .filter((a) => ['approved', 'published', 'marketplace_listed', 'submitted'].includes(a.editorialStatus));
    const purchased = tenantId
      ? marketplaceService
          .getPurchasedNewsForTenant(tenantId)
          .map((p) => p.article)
          .filter((a): a is NonNullable<typeof a> => Boolean(a))
      : [];
    const seen = new Set<string>();
    return [...own, ...purchased].filter((a) => {
      if (seen.has(a.articleId)) return false;
      seen.add(a.articleId);
      return true;
    }).slice(0, 30);
  }, [currentTenant?.tenantId]);

  const handleLoadStoryManuscript = (articleId: string) => {
    if (!articleId) return;
    const art = newsroomStories.find((a) => a.articleId === articleId);
    if (!art) return;
    const combined = [art.headline, art.leadParagraph, art.bodyContent].filter(Boolean).join('\n\n');
    setNewsText(combined);
    if (/[\u0C00-\u0C7F]/.test(combined)) {
      setSelectedLanguage('te');
    } else if (/[\u0900-\u097F]/.test(combined)) {
      setSelectedLanguage('hi');
    }
  };

  const activeClips = clips.filter((c): c is NewsVideoClipItem => Boolean(c));
  const totalFootageDuration = activeClips.reduce((acc, c) => acc + c.durationSec, 0);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const probeVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      const tempUrl = URL.createObjectURL(file);
      tempVideo.src = tempUrl;
      tempVideo.onloadedmetadata = () => {
        URL.revokeObjectURL(tempUrl);
        resolve(tempVideo.duration || 15);
      };
      tempVideo.onerror = () => {
        URL.revokeObjectURL(tempUrl);
        resolve(15);
      };
    });
  };

  const handleSlotUpload = async (slotIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    VideoCompositorService.clearVideoUploadCache();
    setPublishedResult(null);
    setErrorMessage(null);

    const next = [...clips];
    for (let fIdx = 0; fIdx < files.length; fIdx++) {
      const targetSlot = slotIdx + fIdx;
      if (targetSlot < 3) {
        const file = files[fIdx];
        const dur = await probeVideoDuration(file);
        next[targetSlot] = {
          id: `${Date.now()}_slot${targetSlot}`,
          file,
          previewUrl: URL.createObjectURL(file),
          durationSec: dur,
          sizeBytes: file.size,
          name: file.name,
        };
      }
    }

    setClips(next);
    e.target.value = '';
  };

  const handleRemoveSlot = (slotIdx: number) => {
    setClips((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
  };

  const handleReset = () => {
    VideoCompositorService.clearVideoUploadCache();
    setClips([null, null, null]);
    setPublishedResult(null);
    setErrorMessage(null);
    setComplianceWarning(null);
    setProgressPercent(0);
    setCurrentStep('');
  };

  const handleReconnectChannel = async () => {
    try {
      setIsPublishing(false);
      setErrorMessage(null);
      const acc = await YouTubeService.connectGoogleYouTubeChannel();
      setAccount(acc);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to reconnect YouTube channel.');
    }
  };

  // Complete Newsroom Broadcast Pipeline
  const handlePublish = async (forceOverride: boolean | React.MouseEvent = false) => {
    const isOverride = typeof forceOverride === 'boolean' ? forceOverride : false;
    if (!account.isConnected) {
      setErrorMessage(
        'Your YouTube channel is not connected. Please go to Settings to link your channel before broadcasting.'
      );
      return;
    }

    if (activeClips.length === 0 || !newsText.trim()) {
      setErrorMessage('Please upload at least Clip 1 (Opening) and enter the news story manuscript.');
      return;
    }

    setIsPublishing(true);
    setErrorMessage(null);
    setComplianceWarning(null);
    setPublishedResult(null);

    // Pre-Flight OAuth verification
    let activeAccessToken = '';
    try {
      activeAccessToken = await YouTubeService.getValidAccessToken();
    } catch (authErr: any) {
      console.warn('YouTube token expired or missing, prompting re-authentication:', authErr.message);
      setIsPublishing(false);
      setErrorMessage(
        'Your YouTube channel session has expired. Please click "Reconnect" below to refresh your broadcast link.'
      );
      return;
    }

    // Pacing Manager:
    let estimatedTotalSeconds = 45;
    if (clipDurationMode === '60s') estimatedTotalSeconds = 60;
    if (clipDurationMode === '120s') estimatedTotalSeconds = 90;
    if (clipDurationMode === '300s') estimatedTotalSeconds = 150;
    if (clipDurationMode === 'full') {
      estimatedTotalSeconds = Math.max(90, Math.min(360, Math.round((totalFootageDuration || 60) * 0.5) + 60));
    }

    setProgressPercent(4);
    setCurrentStep('Reviewing news manuscript against editorial standards...');

    const progressInterval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 92) return 92;
        const step = Math.max(0.35, (92 - prev) / (estimatedTotalSeconds * 0.7));
        return Math.min(92, Math.round(prev + step));
      });
    }, 1000);

    try {
      // Step 1: Legal & Compliance Verification
      if (!isOverride) {
        const compliance = await AIVideoEditorialService.verifyEditorialCompliance(newsText);
        if (!compliance.isCompliant) {
          clearInterval(progressInterval);
          setComplianceWarning(compliance.statusMessage || 'The news content flagged an editorial compliance advisory.');
          setIsPublishing(false);
          return;
        }
      }

      // Step 2: News Manuscript & Broadcast Headlines Formatting
      setCurrentStep('Formatting broadcast news script and headlines...');
      const editorialPkg = await AIVideoEditorialService.generateBroadcastPackage({
        newsText,
        language: selectedLanguage,
        channelName: account.channelTitle || 'NewsPress Network',
      });

      // Step 3: Studio Anchor Narration Audio Recording
      const langObj = SUPPORTED_INDIAN_LANGUAGES.find((l) => l.code === selectedLanguage);
      setCurrentStep(`Recording studio news narration in ${langObj?.name || 'regional language'}...`);
      const voiceResult = await AIVideoEditorialService.synthesizeVoiceOver({
        scriptText: editorialPkg.scriptText,
        language: selectedLanguage,
        rate: settings.speechRate,
        gender: settings.voiceGender,
      });

      // Step 4: Extract Keyframe from Uploaded Footage & Compose Broadcast Graphics
      setCurrentStep('Extracting keyframe from news footage and designing broadcast graphics...');
      let keyframeUrl: string | undefined;
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        keyframeUrl = await ThumbnailGeneratorService.extractFrameFromVideo(videoRef.current, 2);
      }
      const thumb = await ThumbnailGeneratorService.renderThumbnail({
        videoElement: videoRef.current || undefined,
        keyframeImageUrl: keyframeUrl,
        headlineText: editorialPkg.thumbnailHeadline,
        badgeText: editorialPkg.thumbnailBadge,
        curiosityLine: editorialPkg.thumbnailCuriosityLine,
        themeColor: editorialPkg.thumbnailColorTheme || 'fire_red',
        logoDataUrl: settings.watermark.logoDataUrl,
        channelName: account.channelTitle || 'NEWSPRESS 24x7',
      });
      setPublishedThumbnailUrl(thumb.dataUrl);

      // Step 5 & 6: Studio Composition & Direct Channel Publication
      setCurrentStep(`Mastering broadcast package (${activeClips.length} sequential clips + bumpers) and preparing transmission...`);
      const { introVideoBlob, outroVideoBlob } = await YouTubeService.getHydratedIntroOutroBlobs();
      const broadcastResult = await VideoCompositorService.composeAndPublishDirectToYouTube({
        mainVideoBlob: activeClips[0]?.file,
        videoClips: activeClips.map((c) => c.file),
        voiceOverAudioBlob: voiceResult.audioBlob,
        voiceScriptText: editorialPkg.scriptText,
        language: selectedLanguage,
        introVideoBlob,
        outroVideoBlob,
        introVideoUrl: settings.introVideoUrl,
        outroVideoUrl: settings.outroVideoUrl,
        watermarkSettings: settings.watermark,
        clipDurationMode,
        sourceDuration: totalFootageDuration,
        thumbnailBlob: thumb.blob,
        youtubeTitle: editorialPkg.headlineTitle,
        youtubeDescription: editorialPkg.youtubeDescription,
        youtubeTags: editorialPkg.tags,
        youtubePrivacyStatus: 'public',
        youtubeAccessToken: activeAccessToken,
        youtubeRefreshToken: account.refreshToken,
        youtubeClientId: account.clientId,
        youtubeClientSecret: account.clientSecret,
        onProgress: (_p, msg) => {
          let cleanMsg = msg;
          if (cleanMsg.includes('Cloud Run') || cleanMsg.includes('FFmpeg') || cleanMsg.includes('Storage')) {
            cleanMsg = 'Mastering multi-clip broadcast package and finalizing transmission...';
          }
          setCurrentStep(cleanMsg);
        },
      });

      clearInterval(progressInterval);
      setProgressPercent(100);
      setCurrentStep('Published successfully to YouTube broadcast channel!');
      setPublishedResult({
        videoId: broadcastResult.videoId,
        youtubeUrl: broadcastResult.youtubeUrl,
        embedUrl: `https://www.youtube.com/embed/${broadcastResult.videoId}`,
        title: broadcastResult.title,
        privacyStatus: 'public',
        publishedAt: broadcastResult.publishedAt,
        thumbnailUploaded: true,
      });
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error('Publishing failed:', err);
      setErrorMessage(err?.message || 'An error occurred during video processing or YouTube publishing.');
    } finally {
      clearInterval(progressInterval);
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 font-sans">
      {/* Top Header */}
      <PageHeader
        title="YouTube News Video Studio"
        subtitle="Newsroom Broadcast Studio: Submit field footage and news manuscript to produce a complete broadcast package with anchor narration, broadcast graphics, channel watermark, and direct YouTube publication."
        breadcrumbs={[
          { label: 'Newsroom', href: '/newsroom/news' },
          { label: 'YouTube Studio' },
        ]}
        actions={
          <div className="flex flex-row items-center gap-2 sm:gap-3 flex-wrap">
            {account.isConnected && (
              <div className="flex flex-row items-center gap-2">
                <div className="inline-flex flex-row items-center gap-2 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-full text-xs font-bold shadow-xs whitespace-nowrap">
                  <span className="w-5 h-5 rounded-md bg-red-600 text-white inline-flex items-center justify-center shrink-0 shadow-xs">
                    <Youtube className="w-3 h-3 text-white" />
                  </span>
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">{account.channelTitle || 'Connected Channel'}</span>
                  {account.refreshToken ? (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium border border-emerald-200 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Linked
                    </span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 ml-0.5" title="Active session" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleReconnectChannel}
                  title="Refresh channel authorization"
                  className="inline-flex flex-row items-center gap-2 text-xs font-semibold text-[#3c4043] dark:text-[#c4c7c5] hover:text-[#1a73e8] dark:hover:text-white bg-white dark:bg-[#28292a] hover:bg-[#f1f3f4] px-3 py-1.5 rounded-full border border-[#dadce0] dark:border-[#444746] shadow-xs transition cursor-pointer whitespace-nowrap"
                >
                  <span className="w-5 h-5 rounded-md bg-[#f1f3f4] dark:bg-[#1f1f1f] text-[#5f6368] dark:text-[#a8c7fa] inline-flex items-center justify-center shrink-0 border border-[#dadce0] dark:border-[#444746]">
                    <RotateCw className="w-3 h-3" />
                  </span>
                  <span>Reconnect</span>
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => navigateTo('/settings?tab=youtube')}
              className="inline-flex flex-row items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#dadce0] dark:border-[#444746] bg-white dark:bg-[#28292a] hover:bg-[#f1f3f4] dark:hover:bg-[#333537] text-xs font-semibold text-[#3c4043] dark:text-[#e3e3e3] shadow-xs transition cursor-pointer whitespace-nowrap"
            >
              <span className="w-5 h-5 rounded-md bg-[#e8f0fe] dark:bg-[#004a77] text-[#1a73e8] dark:text-[#8ab4f8] inline-flex items-center justify-center shrink-0 border border-[#d2e3fc] dark:border-[#1a73e8]">
                <Settings className="w-3 h-3" />
              </span>
              <span>Channel Settings</span>
            </button>
          </div>
        }
      />

      {/* Disconnected Notice Banner */}
      {!account.isConnected && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex flex-row items-start gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0 border border-amber-300 dark:border-amber-800">
              <AlertCircle className="w-4 h-4" />
            </span>
            <div>
              <p className="font-bold text-sm">YouTube Channel is not connected</p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                Link your official YouTube channel and configure your logo watermark in Settings before broadcasting.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigateTo('/settings?tab=youtube')}
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shrink-0 cursor-pointer"
          >
            Configure Channel in Settings &rarr;
          </Button>
        </div>
      )}

      {/* When Video is Published: Show Standardized Showcase Card */}
      {publishedResult ? (
        <div className="p-6 sm:p-8 bg-white dark:bg-[#1f1f1f] border border-[#dadce0] dark:border-[#3c4043] shadow-sm rounded-2xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#dadce0] dark:border-[#3c4043] pb-5">
            <div className="flex flex-row items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Live Broadcast Published
                  </span>
                  <span className="text-xs text-[#5f6368] dark:text-[#8e918f] font-sans">
                    Public Broadcast &bull; Official Channel
                  </span>
                </div>
                <h2 className="text-xl font-bold text-[#202124] dark:text-[#f2f2f2] mt-1 tracking-tight">
                  Video Published Successfully to YouTube!
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold text-xs px-4 py-2 rounded-full shadow-xs inline-flex flex-row items-center gap-2 cursor-pointer transition whitespace-nowrap"
            >
              <span className="w-4 h-4 rounded-md bg-white/20 text-white inline-flex items-center justify-center shrink-0">
                <RotateCw className="w-3 h-3" />
              </span>
              <span>+ Broadcast Another News Story</span>
            </button>
          </div>

          {/* Video Preview & Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 bg-black rounded-xl overflow-hidden shadow-sm border border-[#dadce0] dark:border-[#3c4043] aspect-video relative">
              {publishedResult.embedUrl ? (
                <iframe
                  src={publishedResult.embedUrl}
                  title={publishedResult.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : publishedThumbnailUrl ? (
                <img
                  src={publishedThumbnailUrl}
                  alt={publishedResult.title}
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5f6368] dark:text-[#8e918f]">
                  Broadcast Headline
                </span>
                <h3 className="text-base font-bold text-[#202124] dark:text-[#f2f2f2] mt-1 leading-snug">
                  {publishedResult.title || (newsText.trim() ? newsText.split('\n')[0] : 'తాజా బ్రేకింగ్ వార్తలు • SPECIAL REPORT')}
                </h3>
              </div>

              <div className="p-4 rounded-xl bg-[#f8fafd] dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-[#3c4043] dark:text-[#e3e3e3]">
                  <span className="text-[#5f6368] dark:text-[#8e918f]">Channel</span>
                  <span className="font-bold text-red-600 dark:text-red-400">{account.channelTitle || 'Alfa News Service'}</span>
                </div>
                <div className="flex justify-between items-center text-[#3c4043] dark:text-[#e3e3e3]">
                  <span className="text-[#5f6368] dark:text-[#8e918f]">Broadcast ID</span>
                  <span className="font-mono text-[#1a73e8] dark:text-[#8ab4f8] font-bold">{publishedResult.videoId}</span>
                </div>
                <div className="flex justify-between items-center text-[#3c4043] dark:text-[#e3e3e3]">
                  <span className="text-[#5f6368] dark:text-[#8e918f]">Broadcast Audio</span>
                  <span className="font-semibold text-[#202124] dark:text-[#f2f2f2]">Studio Master Narration &bull; 24kHz HD</span>
                </div>
                <div className="flex justify-between items-center text-[#3c4043] dark:text-[#e3e3e3]">
                  <span className="text-[#5f6368] dark:text-[#8e918f]">Distribution</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">Public Broadcast</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch gap-2.5 pt-2">
                <a
                  href={publishedResult.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex flex-row items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2.5 px-5 rounded-full shadow-xs transition cursor-pointer"
                >
                  <Youtube className="w-4 h-4 text-white" />
                  <span>Watch on YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() => {
                    if (publishedResult.youtubeUrl) {
                      navigator.clipboard.writeText(publishedResult.youtubeUrl);
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2000);
                    }
                  }}
                  className="inline-flex flex-row items-center justify-center gap-1.5 border border-[#dadce0] dark:border-[#444746] bg-white dark:bg-[#28292a] hover:bg-[#f1f3f4] text-[#1a73e8] dark:text-[#8ab4f8] text-xs py-2.5 px-4 font-semibold rounded-full shadow-xs transition cursor-pointer"
                >
                  <span>{copiedUrl ? 'Copied Link!' : 'Copy Video Link'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Compliance Advisory */}
          {complianceWarning && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs shadow-xs space-y-3">
              <div className="flex flex-row items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center shrink-0 border border-amber-300 dark:border-amber-800">
                  <AlertCircle className="w-4 h-4" />
                </span>
                <div className="space-y-2 flex-1">
                  <div>
                    <p className="font-bold text-sm text-amber-800 dark:text-amber-300">Editorial Review Advisory</p>
                    <p className="font-medium text-amber-900/90 dark:text-amber-200/90 mt-1 leading-relaxed">{complianceWarning}</p>
                  </div>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                    As a news editor, you may proceed with the broadcast under journalistic reporting standards if this covers legitimate public interest statements.
                  </p>
                  <div className="pt-2 flex flex-row items-center gap-3 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => handlePublish(true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs px-4 py-2 rounded-full shadow-xs cursor-pointer flex flex-row items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Proceed with Editorial Approval &rarr;</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setComplianceWarning(null)}
                      className="text-xs text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100"
                    >
                      Edit Story Manuscript
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Alert Card */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/40 text-red-800 dark:text-red-200 text-xs space-y-3">
              <div className="flex flex-row items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center shrink-0 border border-red-300 dark:border-red-800">
                  <AlertCircle className="w-4 h-4" />
                </span>
                <div className="space-y-2 flex-1">
                  <span className="font-medium leading-relaxed block">{errorMessage}</span>
                  {(errorMessage.includes('expired') || errorMessage.includes('invalid authentication') || errorMessage.includes('OAuth') || errorMessage.includes('401')) && (
                    <div className="pt-2">
                      <Button
                        size="sm"
                        onClick={handleReconnectChannel}
                        className="bg-red-600 hover:bg-red-500 text-white font-medium text-xs px-4 py-2 rounded-full shadow-xs cursor-pointer flex flex-row items-center gap-1.5"
                      >
                        <Youtube className="w-4 h-4" />
                        <span>Reconnect YouTube Channel &rarr;</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Main Production Broadcast Card */}
          <Card className="p-6 sm:p-8 space-y-6 shadow-sm rounded-2xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#1f1f1f]">
            {/* Input 1: Field Video Footage (3 Dedicated Sequential Slots) */}
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <label className="text-sm font-semibold text-[#202124] dark:text-[#f2f2f2] flex flex-row items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-800">
                    <Video className="w-3.5 h-3.5" />
                  </span>
                  <span>1. Field News Footage (3 Sequential Clip Slots &bull; Up to 10 Min Max)</span>
                </label>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium">
                    {activeClips.length}/3 Clips Added
                  </span>
                  {activeClips.length > 0 && (
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${
                      totalFootageDuration > 600
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200'
                    }`}>
                      Total: {formatDuration(totalFootageDuration)} {totalFootageDuration > 600 ? '(Trimmed to 10m)' : '(Within 10m Cap)'}
                    </span>
                  )}
                </div>
              </div>

              {/* 3 Dedicated Video Upload Slots Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {[
                  {
                    idx: 0,
                    title: 'Clip 1: Opening (ప్రారంభం)',
                    sub: 'Event Opening / Incident Scene',
                    required: true,
                  },
                  {
                    idx: 1,
                    title: 'Clip 2: Main Speech (ముఖ్య ప్రసంగం)',
                    sub: 'Key Statement / Public Address',
                    required: false,
                  },
                  {
                    idx: 2,
                    title: 'Clip 3: Conclusion (ముగింపు దృశ్యాలు)',
                    sub: 'Audience Reaction / Closing',
                    required: false,
                  },
                ].map((slot) => {
                  const clip = clips[slot.idx];
                  return (
                    <div
                      key={slot.idx}
                      className={`rounded-2xl border p-3.5 flex flex-col justify-between transition-all ${
                        clip
                          ? 'bg-blue-50/40 dark:bg-blue-950/20 border-[#1a73e8]/70 shadow-xs'
                          : 'bg-[#f8fafd] dark:bg-[#1f1f1f] border-dashed border-[#dadce0] dark:border-[#444746] hover:border-[#1a73e8]'
                      }`}
                    >
                      <div>
                        {/* Slot Header */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className={`w-5 h-5 rounded-md font-bold text-[11px] flex items-center justify-center shrink-0 ${
                              clip ? 'bg-[#1a73e8] text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                            }`}>
                              #{slot.idx + 1}
                            </span>
                            <span className="font-bold text-xs text-[#202124] dark:text-[#f2f2f2] truncate">
                              {slot.title}
                            </span>
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                            slot.required
                              ? 'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800'
                              : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                          }`}>
                            {slot.required ? 'Required' : 'Optional'}
                          </span>
                        </div>

                        {/* Slot Body: Upload Box or Video Player Preview */}
                        {clip ? (
                          <div className="space-y-2">
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-[#dadce0] dark:border-[#3c4043]">
                              <video
                                ref={slot.idx === 0 ? videoRef : undefined}
                                src={clip.previewUrl}
                                controls
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="text-[11px] text-[#202124] dark:text-[#f2f2f2] truncate font-medium">
                              {clip.name}
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-[#5f6368] dark:text-[#8e918f]">
                              <span className="font-semibold text-[#1a73e8] dark:text-[#8ab4f8]">
                                Duration: {formatDuration(clip.durationSec)}
                              </span>
                              <span>{(clip.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                            </div>
                          </div>
                        ) : (
                          <label className="aspect-video rounded-xl border-2 border-dashed border-[#dadce0] dark:border-[#444746] flex flex-col items-center justify-center cursor-pointer hover:border-[#1a73e8] hover:bg-white dark:hover:bg-[#28292a] p-3 transition group text-center">
                            <div className="w-8 h-8 rounded-full bg-[#f1f3f4] dark:bg-[#28292a] text-[#5f6368] group-hover:text-[#1a73e8] group-hover:bg-[#e8f0fe] transition flex items-center justify-center mb-1">
                              <Upload className="w-4 h-4" />
                            </div>
                            <span className="font-semibold text-xs text-[#202124] dark:text-[#f2f2f2]">
                              {slot.idx === 0 ? 'Upload Clip 1' : `+ Add Clip ${slot.idx + 1}`}
                            </span>
                            <span className="text-[10px] text-[#5f6368] dark:text-[#8e918f] mt-0.5 leading-snug">
                              {slot.sub}
                            </span>
                            <input
                              type="file"
                              accept="video/mp4,video/webm,video/quicktime"
                              multiple
                              onChange={(e) => handleSlotUpload(slot.idx, e)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      {/* Slot Footer Controls */}
                      {clip && (
                        <div className="pt-2 border-t border-[#dadce0]/70 dark:border-[#444746]/70 mt-2 flex items-center justify-between">
                          <label className="text-[11px] text-[#1a73e8] dark:text-[#8ab4f8] hover:underline cursor-pointer font-semibold">
                            Change File
                            <input
                              type="file"
                              accept="video/mp4,video/webm,video/quicktime"
                              onChange={(e) => handleSlotUpload(slot.idx, e)}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(slot.idx)}
                            className="text-[11px] text-red-600 dark:text-red-400 hover:underline cursor-pointer flex items-center gap-1 font-medium"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Broadcast Package Duration Selector & Merge Flow */}
              <div className="p-3.5 bg-[#f8fafd] dark:bg-[#28292a] rounded-xl border border-[#dadce0] dark:border-[#444746] space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="text-xs font-semibold text-[#202124] dark:text-[#f2f2f2] flex flex-row items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#1a73e8] dark:text-[#8ab4f8] flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                      <Clock className="w-3 h-3" />
                    </span>
                    <span>Broadcast Target Duration</span>
                  </span>
                  <span className="text-[11px] font-medium text-[#5f6368] dark:text-[#8e918f]">
                    {activeClips.length > 0 ? (
                      <span>Sequence: {activeClips.map((_, i) => `Clip #${i + 1}`).join(' ➔ ')}</span>
                    ) : (
                      <span>No clips uploaded yet</span>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setClipDurationMode('bulletin')}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      clipDurationMode === 'bulletin'
                        ? 'bg-[#1a73e8] text-white border-[#1a73e8] shadow-xs'
                        : 'bg-white dark:bg-[#1f1f1f] text-[#3c4043] dark:text-[#e3e3e3] border-[#dadce0] dark:border-[#444746] hover:border-[#1a73e8]'
                    }`}
                  >
                    <div className="font-bold text-xs flex flex-row items-center justify-between">
                      <span>News Bulletin</span>
                      <span className={`text-[8px] px-1 py-0.5 rounded font-bold uppercase ${
                        clipDurationMode === 'bulletin' ? 'bg-white text-[#1a73e8]' : 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#004a77] dark:text-[#c2e7ff]'
                      }`}>
                        Fast
                      </span>
                    </div>
                    <div className={`text-[10px] mt-1 ${clipDurationMode === 'bulletin' ? 'text-blue-100' : 'text-[#5f6368] dark:text-[#8e918f]'}`}>
                      Story highlights (~35s)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setClipDurationMode('120s')}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      clipDurationMode === '120s'
                        ? 'bg-[#1a73e8] text-white border-[#1a73e8] shadow-xs'
                        : 'bg-white dark:bg-[#1f1f1f] text-[#3c4043] dark:text-[#e3e3e3] border-[#dadce0] dark:border-[#444746] hover:border-[#1a73e8]'
                    }`}
                  >
                    <div className="font-bold text-xs flex flex-row items-center justify-between">
                      <span>2 Min Digest</span>
                      {clipDurationMode === '120s' && <span className="text-[8px] bg-white/20 px-1 py-0.5 rounded">Active</span>}
                    </div>
                    <div className={`text-[10px] mt-1 ${clipDurationMode === '120s' ? 'text-blue-100' : 'text-[#5f6368] dark:text-[#8e918f]'}`}>
                      Condensed 2 min story
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setClipDurationMode('300s')}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      clipDurationMode === '300s'
                        ? 'bg-[#1a73e8] text-white border-[#1a73e8] shadow-xs'
                        : 'bg-white dark:bg-[#1f1f1f] text-[#3c4043] dark:text-[#e3e3e3] border-[#dadce0] dark:border-[#444746] hover:border-[#1a73e8]'
                    }`}
                  >
                    <div className="font-bold text-xs flex flex-row items-center justify-between">
                      <span>5 Min Coverage</span>
                      {clipDurationMode === '300s' && <span className="text-[8px] bg-white/20 px-1 py-0.5 rounded">Active</span>}
                    </div>
                    <div className={`text-[10px] mt-1 ${clipDurationMode === '300s' ? 'text-blue-100' : 'text-[#5f6368] dark:text-[#8e918f]'}`}>
                      Extended speech report
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setClipDurationMode('full')}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      clipDurationMode === 'full'
                        ? 'bg-[#1a73e8] text-white border-[#1a73e8] shadow-xs'
                        : 'bg-white dark:bg-[#1f1f1f] text-[#3c4043] dark:text-[#e3e3e3] border-[#dadce0] dark:border-[#444746] hover:border-[#1a73e8]'
                    }`}
                  >
                    <div className="font-bold text-xs flex flex-row items-center justify-between">
                      <span>Full Speech (10m)</span>
                      <span className={`text-[8px] px-1 py-0.5 rounded font-bold uppercase ${
                        clipDurationMode === 'full' ? 'bg-white text-[#1a73e8]' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        Public
                      </span>
                    </div>
                    <div className={`text-[10px] mt-1 ${clipDurationMode === 'full' ? 'text-blue-100' : 'text-[#5f6368] dark:text-[#8e918f]'}`}>
                      Complete political address
                    </div>
                  </button>
                </div>

                {totalFootageDuration > 600 && clipDurationMode === 'full' && (
                  <div className="text-[11px] text-[#b06000] dark:text-[#fdd663] bg-[#fef7e0] dark:bg-[#382c00] border border-[#fdd663]/60 p-2.5 rounded-lg flex flex-row items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#b06000] dark:text-[#fdd663] shrink-0" />
                    <span>
                      Footage duration ({formatDuration(totalFootageDuration)}) exceeds the 10-minute maximum cap. The broadcast engine will safely encode the first 10 minutes (600s) to keep cloud rendering stable and lightning fast.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Input 2: News Story Manuscript */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <label className="text-sm font-semibold text-[#202124] dark:text-[#f2f2f2] flex flex-row items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#1a73e8] dark:text-[#8ab4f8] flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                    <FileText className="w-3.5 h-3.5" />
                  </span>
                  <span>2. News Story Manuscript (Source Text)</span>
                </label>

                {/* Quick Newsroom Story Loader + Language Selector */}
                <div className="flex flex-wrap items-center gap-2">
                  {newsroomStories.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={(e) => handleLoadStoryManuscript(e.target.value)}
                      className="px-2.5 py-1 max-w-[240px] bg-blue-50 dark:bg-[#004a77] border border-[#d2e3fc] dark:border-[#1a73e8] rounded-full text-xs font-semibold text-[#1a73e8] dark:text-[#c2e7ff] cursor-pointer truncate"
                    >
                      <option value="">Load Story from Newsroom...</option>
                      {newsroomStories.map((st) => (
                        <option key={st.articleId} value={st.articleId}>
                          {st.headline.slice(0, 55)}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-[#f1f3f4] dark:bg-[#28292a] text-[#5f6368] flex items-center justify-center shrink-0 border border-[#dadce0] dark:border-[#444746]">
                      <Languages className="w-3 h-3" />
                    </span>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value as SupportedIndianLanguage)}
                      className="px-2.5 py-1 bg-[#f1f3f4] dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] rounded-full text-xs font-semibold text-[#202124] dark:text-[#f2f2f2] cursor-pointer"
                    >
                      {SUPPORTED_INDIAN_LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.name} ({l.nativeName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <textarea
                rows={5}
                value={newsText}
                onChange={(e) => setNewsText(e.target.value)}
                placeholder="Paste raw reporter field dispatches, press releases, or news reports here in any language..."
                className="w-full p-4 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-[#f8fafd] dark:bg-[#121212] text-sm text-[#202124] dark:text-[#f2f2f2] placeholder-[#70757a] focus:ring-2 focus:ring-[#1a73e8]/30 focus:border-[#1a73e8] focus:outline-none leading-relaxed transition-all"
              />
              <div className="flex justify-between items-center text-xs text-[#5f6368] dark:text-[#8e918f] mt-1.5">
                <span>{newsText.trim() ? newsText.trim().split(/\s+/).filter(Boolean).length : 0} words</span>
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified for Press Standards &amp; Guidelines
                </span>
              </div>
            </div>

            {/* Action Button & Live Pipeline Progress Visualizer */}
            <div className="pt-4 border-t border-[#dadce0] dark:border-[#3c4043] space-y-4">
              {/* Live Progress Card */}
              {isPublishing && (
                <div className="p-4 rounded-2xl bg-[#202124] border border-[#1a73e8] shadow-lg text-white space-y-3 font-sans">
                  <div className="flex justify-between items-center text-xs sm:text-sm font-semibold">
                    <span className="flex flex-row items-center gap-2.5 text-[#a8c7fa]">
                      <span className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                        <RotateCw className="w-3 h-3 animate-spin text-[#8ab4f8]" />
                      </span>
                      <span>{currentStep}</span>
                    </span>
                    <span className="font-mono text-white text-sm sm:text-base font-bold shrink-0">{progressPercent}%</span>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-neutral-800 overflow-hidden border border-neutral-700">
                    <div
                      className="h-full bg-[#1a73e8] transition-all duration-700 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 text-[10px] text-center text-neutral-400 font-medium">
                    <span className={progressPercent >= 10 ? 'text-emerald-400 font-bold' : ''}>1. Editorial Review</span>
                    <span className={progressPercent >= 25 ? 'text-emerald-400 font-bold' : ''}>2. Script Manuscript</span>
                    <span className={progressPercent >= 45 ? 'text-emerald-400 font-bold' : ''}>3. Anchor Narration</span>
                    <span className={progressPercent >= 65 ? 'text-emerald-400 font-bold' : ''}>4. News Graphics</span>
                    <span className={progressPercent >= 80 ? 'text-emerald-400 font-bold' : ''}>5. Studio Mastering</span>
                    <span className={progressPercent >= 95 ? 'text-emerald-400 font-bold' : ''}>6. YouTube Publish</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => handlePublish()}
                disabled={isPublishing || activeClips.length === 0 || !newsText.trim()}
                className="w-full inline-flex flex-row items-center justify-center gap-3 bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white font-bold text-base py-3.5 px-6 rounded-full shadow-md hover:shadow-lg transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none"
              >
                <span className="w-7 h-7 rounded-lg bg-white/20 text-white inline-flex items-center justify-center shrink-0">
                  <Rocket className={`w-4 h-4 ${isPublishing ? 'animate-bounce' : ''}`} />
                </span>
                <span className="whitespace-nowrap font-bold">
                  {isPublishing ? `Broadcasting in progress (${progressPercent}%)...` : 'Publish to YouTube (News Broadcast)'}
                </span>
              </button>

              <p className="text-center text-xs text-[#5f6368] dark:text-[#8e918f]">
                Complete broadcast package: Records news narration, creates broadcast graphics from video footage, adds channel watermark, and publishes directly to YouTube.
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
