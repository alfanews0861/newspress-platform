/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NewsPress YouTube News Video Studio
 * Two-step editorial broadcast production suite:
 *   Step 1: Story & Footage Setup (3-clip sequencing, WYSIWYG overlay monitor, anchor & cover controls)
 *   Step 2: Pre-Broadcast Review & Publish Desk (editable 60–70w script, 24kHz audio audition + re-record,
 *           YouTube metadata editor, cover preview, Direct Public Publish OR Broadcast Queue P1/P2/P3)
 * Plus integrated Broadcast Queue Monitor Drawer & Persistent Broadcast History Archive.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  ArrowUp,
  ArrowDown,
  Layers,
  Film,
  MapPin,
  Tv,
  Zap,
  Download,
  Loader2,
  Image as ImageIcon,
  Mic,
  Volume2,
  ArrowLeft,
  ArrowRight,
  Copy,
  Check,
  History,
  BookOpen,
  Flame,
  Sliders,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { YouTubeQueueDrawer } from '../../components/editorial/YouTubeQueueDrawer';
import { BroadcastHistoryPanel } from '../../components/editorial/BroadcastHistoryPanel';
import { YouTubeService } from '../../services/youtubeService';
import {
  AIVideoEditorialService,
  PolicyComplianceResult,
} from '../../services/aiVideoEditorialService';
import { ThumbnailGeneratorService } from '../../services/thumbnailGeneratorService';
import { VideoCompositorService } from '../../services/videoCompositorService';
import { YouTubeQueueService } from '../../services/youtubeQueueService';
import { newsSubmissionService } from '../../services/newsSubmissionService';
import { marketplaceService } from '../../services/marketplaceService';
import { loadMediaBlob } from '../../utils/mediaBlobStore';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import {
  YouTubeConnectedAccount,
  YouTubeChannelBrandingSettings,
  SUPPORTED_INDIAN_LANGUAGES,
  SupportedIndianLanguage,
  YouTubePublishResult,
  YouTubeBroadcastRecord,
  NewsVideoClipItem,
  VOICE_ACTORS,
  EmotionalNewsStyle,
} from '../../types/youtube';
import { YouTubeVideoPriority, PRIORITY_CONFIG } from '../../types/youtubeQueue';
import { navigateTo } from '../../utils/navigation';

/**
 * Authentic Broadcast Navigation Map Pointer Icon:
 * Circular top with hollow center hole and sharp bottom pointer.
 */
export const MapLocationPointerIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'w-4 h-4',
  size = 20,
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C7.58 2 4 5.58 4 10C4 15.25 12 22 12 22C12 22 20 15.25 20 10C20 5.58 16.42 2 12 2ZM12 13C10.34 13 9 11.66 9 10C9 8.34 10.34 7 12 7C13.66 7 15 8.34 15 10C15 11.66 13.66 13 12 13Z"
    />
  </svg>
);

/**
 * Resolves the ideal broadcast display font style for news ticker crawls across Indian scripts.
 */
export const getBroadcastTickerFont = (
  text: string,
  language?: string
): { fontFamily: string; fontWeight: number; fontLabel: string; isTelugu: boolean } => {
  const content = text || '';
  const isTelugu = /[\u0C00-\u0C7F]/.test(content) || language === 'te';
  if (isTelugu) {
    return {
      fontFamily: '"Ramabhadra", "Noto Sans Telugu", sans-serif',
      fontWeight: 400,
      fontLabel: 'Ramabhadra • Telugu',
      isTelugu: true,
    };
  }
  const isDevanagari = /[\u0900-\u097F]/.test(content) || language === 'hi' || language === 'mr';
  if (isDevanagari) {
    return {
      fontFamily: '"Khand", "Mukta", "Noto Sans Devanagari", sans-serif',
      fontWeight: 600,
      fontLabel: 'Khand • Devanagari',
      isTelugu: false,
    };
  }
  const isTamil = /[\u0B80-\u0BFF]/.test(content) || language === 'ta';
  if (isTamil) {
    return {
      fontFamily: '"Catamaran", "Pavanam", "Noto Sans Tamil", sans-serif',
      fontWeight: 600,
      fontLabel: 'Catamaran • Tamil',
      isTelugu: false,
    };
  }
  const isKannada = /[\u0C80-\u0CFF]/.test(content) || language === 'kn';
  if (isKannada) {
    return {
      fontFamily: '"Noto Sans Kannada", sans-serif',
      fontWeight: 600,
      fontLabel: 'Noto Sans • Kannada',
      isTelugu: false,
    };
  }
  const isMalayalam = /[\u0D00-\u0D7F]/.test(content) || language === 'ml';
  if (isMalayalam) {
    return {
      fontFamily: '"Manjari", "Chilanka", "Noto Sans Malayalam", sans-serif',
      fontWeight: 600,
      fontLabel: 'Manjari • Malayalam',
      isTelugu: false,
    };
  }
  const isBengali = /[\u0980-\u09FF]/.test(content) || language === 'bn';
  if (isBengali) {
    return {
      fontFamily: '"Hind Siliguri", "Noto Sans Bengali", sans-serif',
      fontWeight: 600,
      fontLabel: 'Hind Siliguri • Bengali',
      isTelugu: false,
    };
  }
  const isGujarati = /[\u0A80-\u0AFF]/.test(content) || language === 'gu';
  if (isGujarati) {
    return {
      fontFamily: '"Mukta Vaani", "Noto Sans Gujarati", sans-serif',
      fontWeight: 600,
      fontLabel: 'Mukta Vaani • Gujarati',
      isTelugu: false,
    };
  }
  const isPunjabi = /[\u0A00-\u0A7F]/.test(content) || language === 'pa';
  if (isPunjabi) {
    return {
      fontFamily: '"Mukta Mahee", "Noto Serif Gurmukhi", sans-serif',
      fontWeight: 600,
      fontLabel: 'Mukta Mahee • Punjabi',
      isTelugu: false,
    };
  }
  const isOdia = /[\u0B00-\u0B7F]/.test(content) || language === 'or';
  if (isOdia) {
    return {
      fontFamily: '"Noto Sans Oriya", "Noto Serif Oriya", sans-serif',
      fontWeight: 600,
      fontLabel: 'Noto Sans • Odia',
      isTelugu: false,
    };
  }

  return {
    fontFamily: '"Khand", "Cinzel", "Roboto", "Segoe UI", sans-serif',
    fontWeight: 600,
    fontLabel: 'Khand • Broadcast Display',
    isTelugu: false,
  };
};

interface PreparedBroadcastPackage {
  compliance: PolicyComplianceResult;
  overrideCompliance: boolean;
  voiceOverScript: string;
  youtubeTitle: string;
  youtubeDescription: string;
  youtubeTagsText: string;
  audioBlob: Blob;
  audioUrl: string;
  audioDurationSec: number;
  thumbnailBlob: Blob;
  thumbnailDataUrl: string;
}

interface NewsroomQuickStory {
  id: string;
  headline: string;
  body: string;
  location?: string;
}

const PAN_INDIA_LOCATIONS = [
  'New Delhi',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Lucknow',
];

const BADGE_PRESETS = [
  'BREAKING!',
  'EXCLUSIVE',
  'TOP STORY',
  'SPECIAL REPORT',
  'HIGH ALERT',
  'LIVE UPDATE',
];

const THEME_OPTIONS: Array<{
  id: 'fire_red' | 'electric_yellow' | 'shock_blue' | 'crimson_dark';
  label: string;
  swatch: string;
}> = [
  { id: 'fire_red', label: 'Breaking Red', swatch: 'bg-red-600' },
  { id: 'electric_yellow', label: 'Headline Gold', swatch: 'bg-amber-400' },
  { id: 'shock_blue', label: 'Broadcast Blue', swatch: 'bg-blue-600' },
  { id: 'crimson_dark', label: 'Prime Crimson', swatch: 'bg-rose-900' },
];

export const YouTubeNewsStudioPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  // Studio top-level navigation & queue drawer
  const [activeView, setActiveView] = useState<'studio' | 'history'>('studio');
  const [studioStep, setStudioStep] = useState<1 | 2>(1);
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState<boolean>(false);
  const [queuePendingCount, setQueuePendingCount] = useState<number>(0);
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [historyRefreshSignal, setHistoryRefreshSignal] = useState<number>(0);

  // Synced settings & connected channel
  const [settings, setSettings] = useState<YouTubeChannelBrandingSettings>(() =>
    YouTubeService.getSettings()
  );
  const [account, setAccount] = useState<YouTubeConnectedAccount>(() =>
    YouTubeService.getConnectedAccount()
  );
  const [hydratedAnimatedLogoUrl, setHydratedAnimatedLogoUrl] = useState<string | null>(null);
  const animatedLogoUrlRef = useRef<string | null>(null);

  // Quick Studio Overrides (initialized from Channel Settings)
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedIndianLanguage>(
    settings.defaultLanguage || 'en'
  );
  const [voiceActorId, setVoiceActorId] = useState<string>(
    settings.voiceActorId || 'ravi_shankar'
  );
  const [speechRate, setSpeechRate] = useState<number>(settings.speechRate || 1.3);
  const [emotionalStyle, setEmotionalStyle] = useState<EmotionalNewsStyle>(
    settings.emotionalStyle || 'emotional_breaking'
  );
  const [clipDurationMode, setClipDurationMode] = useState<
    'bulletin' | '60s' | '120s' | '300s' | 'full'
  >('full');

  // Step 1 Inputs: 3 Sequential Clip Slots + Manuscript + Location + Ticker
  const [clips, setClips] = useState<(NewsVideoClipItem | null)[]>([null, null, null]);
  const clipsRef = useRef<(NewsVideoClipItem | null)[]>([null, null, null]);
  clipsRef.current = clips;

  const [newsText, setNewsText] = useState<string>('');
  const [newsLocation, setNewsLocation] = useState<string>('');
  const [tickerText, setTickerText] = useState<string>('');
  const [isExtractingStory, setIsExtractingStory] = useState<boolean>(false);
  const [isGeneratingDemoVideo, setIsGeneratingDemoVideo] = useState<boolean>(false);

  // Newsroom Story Loader
  const [newsroomStories, setNewsroomStories] = useState<NewsroomQuickStory[]>([]);
  const [showStoryPicker, setShowStoryPicker] = useState<boolean>(false);

  // Cover Thumbnail Studio State
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string>('');
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [isCustomThumbnailUploaded, setIsCustomThumbnailUploaded] = useState<boolean>(false);
  const [customThumbnailFileName, setCustomThumbnailFileName] = useState<string>('');
  const [thumbnailHeadline, setThumbnailHeadline] = useState<string>('');
  const [thumbnailBadge, setThumbnailBadge] = useState<string>('BREAKING!');
  const [thumbnailCuriosity, setThumbnailCuriosity] = useState<string>('Full Ground Report');
  const [thumbnailThemeColor, setThumbnailThemeColor] = useState<
    'fire_red' | 'electric_yellow' | 'shock_blue' | 'crimson_dark'
  >('fire_red');
  const [thumbnailKeyframeTimeSec, setThumbnailKeyframeTimeSec] = useState<number>(2.0);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState<boolean>(false);

  // Step 1 -> Step 2 Preparation State
  const [isPreparingPreview, setIsPreparingPreview] = useState<boolean>(false);
  const [prepareStageMessage, setPrepareStageMessage] = useState<string>('');
  const [prepareProgress, setPrepareProgress] = useState<number>(0);
  const [preparedPackage, setPreparedPackage] = useState<PreparedBroadcastPackage | null>(null);
  const preparedAudioUrlRef = useRef<string | null>(null);
  const [isRerecordingVoice, setIsRerecordingVoice] = useState<boolean>(false);

  // Step 2 Publish / Queue State
  const [selectedQueuePriority, setSelectedQueuePriority] =
    useState<YouTubeVideoPriority>('P2_PRIMETIME_BULLETIN');
  const [isEnqueueing, setIsEnqueueing] = useState<boolean>(false);
  const [queueSuccessNotice, setQueueSuccessNotice] = useState<string | null>(null);

  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishStage, setPublishStage] = useState<string>('');
  const [publishProgress, setPublishProgress] = useState<number>(0);
  const [publishedResult, setPublishedResult] = useState<YouTubePublishResult | null>(null);
  const [youtubeProcessingState, setYoutubeProcessingState] = useState<
    'idle' | 'checking' | 'processing' | 'processed' | 'background'
  >('idle');
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync Channel Settings & Connected Account on mount and window focus
  const syncChannelSettings = useCallback(async () => {
    const latestSettings = YouTubeService.getSettings();
    const latestAccount = YouTubeService.getConnectedAccount();
    setSettings(latestSettings);
    setAccount(latestAccount);

    try {
      const animatedBlob = await loadMediaBlob('youtube_animated_logo_blob');
      if (animatedLogoUrlRef.current) {
        URL.revokeObjectURL(animatedLogoUrlRef.current);
        animatedLogoUrlRef.current = null;
      }
      if (animatedBlob) {
        const url = URL.createObjectURL(animatedBlob);
        animatedLogoUrlRef.current = url;
        setHydratedAnimatedLogoUrl(url);
      } else {
        setHydratedAnimatedLogoUrl(null);
      }
    } catch {
      // Ignore IndexedDB unavailability
    }
  }, []);

  useEffect(() => {
    syncChannelSettings();
    const handleFocus = () => {
      syncChannelSettings();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [syncChannelSettings]);

  // Subscribe to Broadcast Queue counts & fetch Broadcast History count
  useEffect(() => {
    const unsubscribe = YouTubeQueueService.subscribe(() => {
      const stats = YouTubeQueueService.getQueueStats(currentTenant?.tenantId);
      setQueuePendingCount(stats.queuedCount + stats.processingCount);
      if (stats.publishedCount > 0) {
        setHistoryRefreshSignal((n) => n + 1);
      }
    });
    return () => unsubscribe();
  }, [currentTenant?.tenantId]);

  useEffect(() => {
    YouTubeService.getAllBroadcastRecords(currentTenant?.tenantId)
      .then((list) => setHistoryCount(list.length))
      .catch(() => {});
  }, [currentTenant?.tenantId, historyRefreshSignal]);

  // Load recent newsroom / marketplace stories for quick pick
  useEffect(() => {
    let active = true;
    const gathered: NewsroomQuickStory[] = [];
    try {
      const subs = newsSubmissionService.getAllArticles(currentTenant?.tenantId || 'tenant_default');
      for (const item of (subs || []).slice(0, 8)) {
        gathered.push({
          id: item.articleId,
          headline: item.headline,
          body: [item.headline, item.leadParagraph, item.bodyContent]
            .filter(Boolean)
            .join('\n\n'),
          location: item.district || item.state || '',
        });
      }
    } catch {
      // Optional story feed
    }
    if (gathered.length < 4) {
      try {
        const listings = marketplaceService.getListings();
        for (const listing of (listings || []).slice(0, 6)) {
          if (!gathered.some((g) => g.headline === listing.title)) {
            gathered.push({
              id: listing.listingId,
              headline: listing.title,
              body: `${listing.title}\n\n${listing.shortDescription || ''}`,
              location: listing.district || listing.state || '',
            });
          }
        }
      } catch {
        // Optional marketplace feed
      }
    }
    if (active) setNewsroomStories(gathered);
    return () => {
      active = false;
    };
  }, [currentTenant?.tenantId]);

  // Cleanup all created object URLs on unmount
  useEffect(() => {
    return () => {
      clipsRef.current.forEach((c) => {
        if (c?.previewUrl) URL.revokeObjectURL(c.previewUrl);
      });
      if (preparedAudioUrlRef.current) {
        URL.revokeObjectURL(preparedAudioUrlRef.current);
      }
      if (animatedLogoUrlRef.current) {
        URL.revokeObjectURL(animatedLogoUrlRef.current);
      }
    };
  }, []);

  const activeClips = clips.filter((c): c is NewsVideoClipItem => c !== null);
  const totalFootageDuration = activeClips.reduce((acc, c) => acc + (c.durationSec || 0), 0);
  const activeVoiceActor =
    VOICE_ACTORS.find((a) => a.id === voiceActorId) || VOICE_ACTORS[0];

  const displayTickerText =
    tickerText.trim() ||
    newsText
      .split(/[\n.!?।]+/)
      .map((s) => s.trim())
      .find((s) => s.length > 6) ||
    'BREAKING NEWS BULLETIN // LIVE GROUND REPORT';

  const tickerFont = getBroadcastTickerFont(displayTickerText, selectedLanguage);

  // Measure video duration cleanly with temporary metadata element
  const measureVideoDuration = (objectUrl: string): Promise<number> => {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.muted = true;
      v.onloadedmetadata = () => {
        const dur = Number.isFinite(v.duration) && v.duration > 0 ? Math.round(v.duration) : 30;
        v.src = '';
        resolve(dur);
      };
      v.onerror = () => resolve(30);
      v.src = objectUrl;
    });
  };

  // Generate 1280x720 Broadcast Cover cleanly (no stale closure reads)
  const renderBroadcastCover = useCallback(
    async (opts?: {
      clipFile?: File | null;
      headlineOverride?: string;
      badgeOverride?: string;
      curiosityOverride?: string;
      themeOverride?: 'fire_red' | 'electric_yellow' | 'shock_blue' | 'crimson_dark';
      keyframeSecOverride?: number;
      languageOverride?: SupportedIndianLanguage;
    }): Promise<{ blob: Blob; dataUrl: string } | null> => {
      const targetClipFile =
        opts?.clipFile !== undefined ? opts.clipFile : clipsRef.current[0]?.file || activeClips[0]?.file || null;
      const lang = opts?.languageOverride || selectedLanguage;
      const defaults = AIVideoEditorialService.getLocalizedDefaultHooks(lang);

      const resolvedHeadline =
        (opts?.headlineOverride ?? thumbnailHeadline).trim() ||
        newsText
          .split(/[\n.!?।]+/)
          .map((s) => s.trim())
          .find((s) => s.length > 5)
          ?.slice(0, 68) ||
        defaults.headline;

      const resolvedBadge = (opts?.badgeOverride ?? thumbnailBadge).trim() || defaults.badge;
      const resolvedCuriosity =
        (opts?.curiosityOverride ?? thumbnailCuriosity).trim() || defaults.curiosity;
      const resolvedTheme = opts?.themeOverride || thumbnailThemeColor;
      const resolvedTime = opts?.keyframeSecOverride ?? thumbnailKeyframeTimeSec;

      setIsGeneratingThumbnail(true);
      try {
        let keyframeImageUrl: string | undefined;
        if (targetClipFile) {
          const tempUrl = URL.createObjectURL(targetClipFile);
          try {
            const videoEl = document.createElement('video');
            videoEl.muted = true;
            videoEl.playsInline = true;
            videoEl.preload = 'auto';
            await new Promise<void>((resolve, reject) => {
              videoEl.onloadeddata = () => resolve();
              videoEl.onerror = () => reject(new Error('Could not decode video keyframe'));
              videoEl.src = tempUrl;
            });
            keyframeImageUrl = await ThumbnailGeneratorService.extractFrameAtTimestamp(
              videoEl,
              resolvedTime
            );
            videoEl.src = '';
          } catch {
            // Fall back to studio backdrop gradient
          } finally {
            URL.revokeObjectURL(tempUrl);
          }
        }

        const result = await ThumbnailGeneratorService.renderThumbnail({
          keyframeImageUrl,
          headlineText: resolvedHeadline,
          badgeText: resolvedBadge,
          curiosityLine: resolvedCuriosity,
          themeColor: resolvedTheme,
          logoDataUrl: settings.watermark.logoDataUrl,
          channelName: account.channelTitle || settings.watermark.text || 'NEWS 24X7',
          language: lang,
        });

        setThumbnailPreviewUrl(result.dataUrl);
        setThumbnailBlob(result.blob);
        setIsCustomThumbnailUploaded(false);
        setCustomThumbnailFileName('');
        return result;
      } catch (err: any) {
        console.error('[Studio] Cover render error:', err);
        setErrorMessage(err?.message || 'Could not render broadcast cover image.');
        return null;
      } finally {
        setIsGeneratingThumbnail(false);
      }
    },
    [
      activeClips,
      account.channelTitle,
      newsText,
      selectedLanguage,
      settings.watermark.logoDataUrl,
      settings.watermark.text,
      thumbnailBadge,
      thumbnailCuriosity,
      thumbnailHeadline,
      thumbnailKeyframeTimeSec,
      thumbnailThemeColor,
    ]
  );

  // Upload footage into Slot 0, 1, or 2
  const handleClipUpload = async (
    slotIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMessage(null);
    const previewUrl = URL.createObjectURL(file);
    const durationSec = await measureVideoDuration(previewUrl);

    setClips((prev) => {
      const next = [...prev];
      const existing = next[slotIndex];
      if (existing?.previewUrl) {
        URL.revokeObjectURL(existing.previewUrl);
      }
      next[slotIndex] = {
        id: `clip_${Date.now()}_${slotIndex}`,
        file,
        previewUrl,
        durationSec,
        sizeBytes: file.size,
        name: file.name,
      };
      return next;
    });

    // Automatically render a crisp cover preview from Slot 1 if no custom cover uploaded
    if (slotIndex === 0 && !isCustomThumbnailUploaded) {
      await renderBroadcastCover({ clipFile: file });
    }
  };

  const handleRemoveClip = (slotIndex: number) => {
    setClips((prev) => {
      const next = [...prev];
      const existing = next[slotIndex];
      if (existing?.previewUrl) {
        URL.revokeObjectURL(existing.previewUrl);
      }
      next[slotIndex] = null;
      return next;
    });
  };

  const handleMoveClip = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex > 2) return;
    setClips((prev) => {
      const next = [...prev];
      const temp = next[fromIndex];
      next[fromIndex] = next[toIndex];
      next[toIndex] = temp;
      return next;
    });
  };

  const handleGenerateDemoFootage = async () => {
    setIsGeneratingDemoVideo(true);
    setErrorMessage(null);
    try {
      const demo = await VideoCompositorService.createSampleLeaderboardVideo('channel', {
        title: account.channelTitle || settings.watermark.text || 'NewsPress 24x7',
      });
      const demoFile = new File([demo.blob], demo.fileName, {
        type: demo.blob.type || 'video/webm',
      });
      const demoDuration = await measureVideoDuration(demo.url);
      setClips((prev) => {
        const next = [...prev];
        if (next[0]?.previewUrl) URL.revokeObjectURL(next[0].previewUrl);
        next[0] = {
          id: `clip_demo_${Date.now()}`,
          file: demoFile,
          previewUrl: demo.url,
          durationSec: demoDuration,
          sizeBytes: demoFile.size,
          name: demo.fileName,
        };
        return next;
      });
      if (!isCustomThumbnailUploaded) {
        await renderBroadcastCover({ clipFile: demoFile });
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not generate sample studio footage.');
    } finally {
      setIsGeneratingDemoVideo(false);
    }
  };

  // Draft story directly from uploaded video clip
  const handleDraftStoryFromFootage = async () => {
    const primaryClip = clips[0] || activeClips[0];
    if (!primaryClip) {
      setErrorMessage('Upload at least one video clip before drafting a story from footage.');
      return;
    }

    setIsExtractingStory(true);
    setErrorMessage(null);
    try {
      const result = await AIVideoEditorialService.draftStoryFromVideo(
        primaryClip.file,
        selectedLanguage
      );
      if (result.story) {
        setNewsText(result.story);
      }
      if (result.location && !newsLocation.trim()) {
        setNewsLocation(result.location);
      }
      if (result.headline) {
        if (!tickerText.trim()) setTickerText(result.headline);
        if (!thumbnailHeadline.trim()) setThumbnailHeadline(result.headline);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Could not analyze the uploaded footage. You can type the news story directly.'
      );
    } finally {
      setIsExtractingStory(false);
    }
  };

  const handleCustomThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setThumbnailPreviewUrl(dataUrl);
      setThumbnailBlob(file);
      setIsCustomThumbnailUploaded(true);
      setCustomThumbnailFileName(file.name);
      if (preparedPackage) {
        setPreparedPackage({
          ...preparedPackage,
          thumbnailBlob: file,
          thumbnailDataUrl: dataUrl,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadThumbnail = () => {
    const url = preparedPackage?.thumbnailDataUrl || thumbnailPreviewUrl;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `broadcast_cover_${Date.now()}.jpg`;
    a.click();
  };

  // STEP 1 -> STEP 2: Generate Script, Real 24kHz Anchor Narration Audio, Metadata, and Cover
  const handlePrepareBroadcastPreview = async () => {
    if (activeClips.length === 0) {
      setErrorMessage('Please upload at least one field footage clip in Slot 1.');
      return;
    }
    if (!newsText.trim() || newsText.trim().length < 15) {
      setErrorMessage('Please enter a news story manuscript (at least 15 characters).');
      return;
    }

    setErrorMessage(null);
    setQueueSuccessNotice(null);
    setPublishedResult(null);
    setIsPreparingPreview(true);
    setPrepareProgress(10);
    setPrepareStageMessage('Verifying broadcast editorial standards...');

    try {
      // 1. Editorial compliance check
      const compliance = await AIVideoEditorialService.verifyEditorialCompliance(newsText);

      setPrepareProgress(32);
      setPrepareStageMessage('Writing 60–70 word anchor script and YouTube broadcast metadata...');

      // 2. Generate anchor script & metadata
      const broadcastPkg = await AIVideoEditorialService.generateBroadcastPackage({
        newsText,
        language: selectedLanguage,
        channelName: account.channelTitle || settings.watermark.text || 'NewsPress 24x7',
        videoClips: activeClips.map((c) => c.file),
      });

      // Keep cover inputs synchronized with generated hooks if user didn't customize them
      const coverHeadline = thumbnailHeadline.trim() || broadcastPkg.thumbnailHeadline;
      const coverBadge = thumbnailBadge.trim() || broadcastPkg.thumbnailBadge;
      const coverCuriosity = thumbnailCuriosity.trim() || broadcastPkg.thumbnailCuriosityLine;
      setThumbnailHeadline(coverHeadline);
      setThumbnailBadge(coverBadge);
      setThumbnailCuriosity(coverCuriosity);

      setPrepareProgress(60);
      setPrepareStageMessage(
        `Recording 24kHz studio narration with ${activeVoiceActor.englishName || activeVoiceActor.name}...`
      );

      // 3. Synthesize real 24kHz anchor WAV narration
      const voiceOver = await AIVideoEditorialService.synthesizeVoiceOver({
        scriptText: broadcastPkg.scriptText,
        language: selectedLanguage,
        rate: speechRate,
        gender: activeVoiceActor.gender,
        voiceActorId: activeVoiceActor.id,
        emotionalStyle,
      });

      // 4. Prepare or reuse 1280x720 cover thumbnail
      setPrepareProgress(84);
      setPrepareStageMessage('Rendering 1280×720 HD Broadcast Cover...');
      let finalThumbBlob = thumbnailBlob;
      let finalThumbUrl = thumbnailPreviewUrl;

      if (!isCustomThumbnailUploaded || !finalThumbBlob || !finalThumbUrl) {
        const rendered = await renderBroadcastCover({
          clipFile: activeClips[0].file,
          headlineOverride: coverHeadline,
          badgeOverride: coverBadge,
          curiosityOverride: coverCuriosity,
          themeOverride: broadcastPkg.thumbnailColorTheme || thumbnailThemeColor,
          languageOverride: selectedLanguage,
        });
        if (rendered) {
          finalThumbBlob = rendered.blob;
          finalThumbUrl = rendered.dataUrl;
        }
      }

      if (!finalThumbBlob || !finalThumbUrl) {
        throw new Error('Could not prepare the 1280×720 broadcast cover thumbnail.');
      }

      // Revoke any previous prepared audio URL
      if (preparedAudioUrlRef.current) {
        URL.revokeObjectURL(preparedAudioUrlRef.current);
      }
      const audioUrl = URL.createObjectURL(voiceOver.audioBlob);
      preparedAudioUrlRef.current = audioUrl;

      setPreparedPackage({
        compliance,
        overrideCompliance: compliance.isCompliant,
        voiceOverScript: broadcastPkg.scriptText,
        youtubeTitle: broadcastPkg.headlineTitle,
        youtubeDescription: broadcastPkg.youtubeDescription,
        youtubeTagsText: (broadcastPkg.tags || []).join(', '),
        audioBlob: voiceOver.audioBlob,
        audioUrl,
        audioDurationSec: voiceOver.durationEstimateSec,
        thumbnailBlob: finalThumbBlob,
        thumbnailDataUrl: finalThumbUrl,
      });

      setPrepareProgress(100);
      setPrepareStageMessage('Broadcast package ready for review.');
      setStudioStep(2);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Failed to prepare broadcast preview. Please check your connection and try again.'
      );
    } finally {
      setIsPreparingPreview(false);
    }
  };

  // Re-record only the anchor audio in Step 2 after editing script/voice/rate
  const handleRerecordVoice = async () => {
    if (!preparedPackage || !preparedPackage.voiceOverScript.trim()) return;
    setErrorMessage(null);
    setIsRerecordingVoice(true);
    try {
      const voiceOver = await AIVideoEditorialService.synthesizeVoiceOver({
        scriptText: preparedPackage.voiceOverScript.trim(),
        language: selectedLanguage,
        rate: speechRate,
        gender: activeVoiceActor.gender,
        voiceActorId: activeVoiceActor.id,
        emotionalStyle,
      });

      if (preparedAudioUrlRef.current) {
        URL.revokeObjectURL(preparedAudioUrlRef.current);
      }
      const nextUrl = URL.createObjectURL(voiceOver.audioBlob);
      preparedAudioUrlRef.current = nextUrl;

      setPreparedPackage((prev) =>
        prev
          ? {
              ...prev,
              audioBlob: voiceOver.audioBlob,
              audioUrl: nextUrl,
              audioDurationSec: voiceOver.durationEstimateSec,
            }
          : null
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not re-record anchor voice narration.');
    } finally {
      setIsRerecordingVoice(false);
    }
  };

  // Regenerate cover inside Step 2 Review Desk
  const handleRegenerateReviewCover = async () => {
    const rendered = await renderBroadcastCover({
      clipFile: activeClips[0]?.file || null,
    });
    if (rendered && preparedPackage) {
      setPreparedPackage({
        ...preparedPackage,
        thumbnailBlob: rendered.blob,
        thumbnailDataUrl: rendered.dataUrl,
      });
    }
  };

  const parseTagsArray = (tagsText: string): string[] =>
    tagsText
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 20);

  // STEP 2 ACTION A: Add Reviewed Broadcast to Background Queue
  const handleAddToQueue = async () => {
    if (!preparedPackage || activeClips.length === 0) return;
    if (!account.isConnected) {
      setErrorMessage('Please connect your YouTube Channel in Channel Settings before queueing broadcasts.');
      return;
    }
    if (!preparedPackage.compliance.isCompliant && !preparedPackage.overrideCompliance) {
      setErrorMessage('Please review and confirm the Editorial Advisory before queueing.');
      return;
    }

    setErrorMessage(null);
    setIsEnqueueing(true);
    try {
      const tags = parseTagsArray(preparedPackage.youtubeTagsText);
      const job = await YouTubeQueueService.enqueueJob({
        tenantId: currentTenant?.tenantId || 'tenant_default',
        userId: user?.uid || 'studio_editor',
        userName: user?.displayName || account.channelTitle || 'Broadcast Desk',
        title: preparedPackage.youtubeTitle.trim() || 'Breaking News Broadcast',
        priority: selectedQueuePriority,
        payload: {
          newsText,
          newsLocation: newsLocation.trim(),
          tickerText: tickerText.trim(),
          language: selectedLanguage,
          clipDurationMode,
          selectedVoiceActorId: activeVoiceActor.id,
          speechRate,
          emotionalStyle,
          activeClipsMeta: activeClips.map((c) => ({ name: c.name, size: c.sizeBytes })),
          thumbnailTheme: thumbnailThemeColor,
          reviewedPackage: {
            headlineTitle: preparedPackage.youtubeTitle.trim(),
            scriptText: preparedPackage.voiceOverScript.trim(),
            youtubeDescription: preparedPackage.youtubeDescription.trim(),
            tags,
            thumbnailHeadline,
            thumbnailBadge,
            thumbnailCuriosityLine: thumbnailCuriosity,
            thumbnailDataUrl: preparedPackage.thumbnailDataUrl,
          },
        },
        activeClipsFiles: activeClips.map((c) => c.file),
        thumbnailBlob: preparedPackage.thumbnailBlob,
        voiceOverBlob: preparedPackage.audioBlob,
      });

      setQueueSuccessNotice(
        `"${job.title}" added to the Broadcast Queue (${PRIORITY_CONFIG[selectedQueuePriority].labelEnglish}).`
      );
      setIsQueueDrawerOpen(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to add broadcast to the queue.');
    } finally {
      setIsEnqueueing(false);
    }
  };

  // STEP 2 ACTION B: Direct Public Publish to YouTube Now
  const handlePublishPublicNow = async () => {
    if (!preparedPackage || activeClips.length === 0) return;
    if (!account.isConnected) {
      setErrorMessage('Please connect your YouTube Channel in Channel Settings before publishing.');
      return;
    }
    if (!preparedPackage.compliance.isCompliant && !preparedPackage.overrideCompliance) {
      setErrorMessage('Please review and confirm the Editorial Advisory before publishing.');
      return;
    }

    setErrorMessage(null);
    setQueueSuccessNotice(null);
    setIsPublishing(true);
    setPublishProgress(8);
    setPublishStage('Validating YouTube broadcast authorization...');

    try {
      const activeAccessToken = await YouTubeService.getValidAccessToken();
      if (!activeAccessToken) {
        throw new Error(
          'Your YouTube authorization session expired. Please reconnect your channel in Channel Settings.'
        );
      }

      setPublishProgress(18);
      setPublishStage('Loading channel intro, outro, and animated logo assets...');
      const { introVideoBlob, outroVideoBlob, animatedLogoBlob } =
        await YouTubeService.getHydratedIntroOutroBlobs();

      const hydratedWatermark = {
        ...settings.watermark,
        ...(animatedLogoBlob ? { logoVideoBlob: animatedLogoBlob } : {}),
      };

      const tags = parseTagsArray(preparedPackage.youtubeTagsText);
      const clientId = (import.meta as any).env?.VITE_YOUTUBE_CLIENT_ID || '';

      const result = await VideoCompositorService.composeAndPublishDirectToYouTube({
        tenantId: currentTenant?.tenantId || 'tenant_default',
        videoClips: activeClips.map((c) => c.file),
        mainVideoBlob: activeClips[0].file,
        introVideoBlob,
        outroVideoBlob,
        voiceOverAudioBlob: preparedPackage.audioBlob,
        voiceScriptText: preparedPackage.voiceOverScript.trim(),
        language: selectedLanguage,
        watermarkSettings: hydratedWatermark,
        newsLocation: newsLocation.trim(),
        tickerText: displayTickerText,
        clipDurationMode,
        sourceDuration: totalFootageDuration || 30,
        speechRate,
        voiceActorId: activeVoiceActor.id,
        voiceActorGoogleVoice: activeVoiceActor.googleOriginalVoice,
        emotionalStyle,
        thumbnailBlob: preparedPackage.thumbnailBlob,
        youtubeTitle: preparedPackage.youtubeTitle.trim(),
        youtubeDescription: preparedPackage.youtubeDescription.trim(),
        youtubeTags: tags,
        youtubePrivacyStatus: 'public',
        youtubeAccessToken: activeAccessToken,
        youtubeRefreshToken: account.refreshToken,
        youtubeClientId: clientId,
        channelTitle: account.channelTitle || settings.watermark.text || 'NewsPress 24x7',
        onProgress: (pct, msg) => {
          setPublishProgress(Math.min(92, Math.max(20, pct)));
          if (msg) setPublishStage(msg);
        },
      });

      // Persist Broadcast History Record immediately
      setPublishProgress(94);
      setPublishStage('Saving broadcast record to archive...');
      const watchUrl = result.youtubeUrl || `https://www.youtube.com/watch?v=${result.videoId}`;
      const record: YouTubeBroadcastRecord = {
        videoId: result.videoId,
        tenantId: currentTenant?.tenantId || 'tenant_default',
        createdBy: user?.uid || 'studio_editor',
        youtubeUrl: watchUrl,
        embedUrl: `https://www.youtube.com/embed/${result.videoId}`,
        title: preparedPackage.youtubeTitle.trim(),
        publishedAt: result.publishedAt || new Date().toISOString(),
        privacyStatus: 'public',
        thumbnailUrl: preparedPackage.thumbnailDataUrl,
        newsLocation: newsLocation.trim() || undefined,
        durationMode: clipDurationMode,
        language: selectedLanguage,
        voiceActorId: activeVoiceActor.id,
        voiceActorName: activeVoiceActor.englishName || activeVoiceActor.name,
        channelTitle: account.channelTitle || 'Connected Channel',
        tags,
        status: 'published',
        isSdReady: false,
      };
      await YouTubeService.saveBroadcastRecord(record);
      setHistoryRefreshSignal((n) => n + 1);

      setPublishedResult({
        videoId: result.videoId,
        youtubeUrl: watchUrl,
        embedUrl: `https://www.youtube.com/embed/${result.videoId}`,
        title: preparedPackage.youtubeTitle.trim(),
        publishedAt: record.publishedAt,
        privacyStatus: 'public',
        thumbnailUploaded: true,
      });

      setPublishProgress(100);
      setPublishStage('Published Public on YouTube! Verifying stream readiness...');
      setYoutubeProcessingState('checking');

      // Lightweight non-blocking YouTube SD verification poll (up to 4 checks)
      let ready = false;
      for (let i = 0; i < 4; i++) {
        await new Promise((r) => setTimeout(r, 3500));
        try {
          const ytStatus = await YouTubeService.getVideoProcessingStatus(
            result.videoId,
            activeAccessToken
          );
          if (ytStatus.isSdReady || ytStatus.isProcessed) {
            ready = true;
            setYoutubeProcessingState('processed');
            break;
          }
          setYoutubeProcessingState('processing');
        } catch {
          break;
        }
      }
      if (!ready) {
        setYoutubeProcessingState('background');
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Broadcast upload failed. Verify your YouTube connection and try again.'
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handleResetStudio = () => {
    clipsRef.current.forEach((c) => {
      if (c?.previewUrl) URL.revokeObjectURL(c.previewUrl);
    });
    if (preparedAudioUrlRef.current) {
      URL.revokeObjectURL(preparedAudioUrlRef.current);
      preparedAudioUrlRef.current = null;
    }
    setClips([null, null, null]);
    setNewsText('');
    setNewsLocation('');
    setTickerText('');
    setThumbnailPreviewUrl('');
    setThumbnailBlob(null);
    setIsCustomThumbnailUploaded(false);
    setCustomThumbnailFileName('');
    setThumbnailHeadline('');
    setPreparedPackage(null);
    setPublishedResult(null);
    setYoutubeProcessingState('idle');
    setQueueSuccessNotice(null);
    setErrorMessage(null);
    setStudioStep(1);
  };

  const handleCopyPublishedUrl = async () => {
    if (!publishedResult?.youtubeUrl) return;
    try {
      await navigator.clipboard.writeText(publishedResult.youtubeUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  };

  const scriptWordCount = (preparedPackage?.voiceOverScript || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const estimatedAudioSeconds = Math.max(
    12,
    Math.round((scriptWordCount / Math.max(0.8, speechRate)) * 0.48)
  );

  const activeLogoVideoUrl = hydratedAnimatedLogoUrl || settings.watermark.logoVideoUrl;
  const hasLogoVisual = Boolean(activeLogoVideoUrl || settings.watermark.logoDataUrl);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Studio Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
            <Youtube className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                YouTube News Video Studio
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Direct Public Broadcast
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Prepare, preview, audition, queue, and publish 1080p news bulletins directly to your connected channel.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Primary View Switcher */}
          <div className="inline-flex p-1 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveView('studio')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeView === 'studio'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-red-600" />
              <span>Production Desk</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeView === 'history'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Broadcast History</span>
              <span className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-[10px] tabular-nums">
                {historyCount}
              </span>
            </button>
          </div>

          {/* Queue Monitor Drawer Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsQueueDrawerOpen(true)}
            className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Queue Monitor</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${
                queuePendingCount > 0
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              {queuePendingCount}
            </span>
          </Button>

          {/* Channel Settings Link */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigateTo('/settings')}
            className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Channel Settings</span>
          </Button>
        </div>
      </div>

      {/* Connected Channel Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/60 text-xs">
        {account.isConnected ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Connected Channel:</span>
            </span>
            <span className="font-bold text-neutral-900 dark:text-white">
              {account.channelTitle}
            </span>
            <span className="text-neutral-400">|</span>
            <span className="text-neutral-600 dark:text-neutral-400">
              Default Anchor: <strong>{activeVoiceActor.englishName || activeVoiceActor.name}</strong> ({speechRate.toFixed(2)}x)
            </span>
            <span className="text-neutral-400">|</span>
            <span className="text-neutral-600 dark:text-neutral-400">
              Visibility: <strong className="text-emerald-600 dark:text-emerald-400">Direct Public</strong>
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                No YouTube channel connected yet. You can prepare and preview broadcasts now, then connect your channel to publish.
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => navigateTo('/settings')}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
            >
              Connect Channel
            </Button>
          </div>
        )}
      </div>

      {/* Global Error / Notice Banners */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs text-red-900 dark:text-red-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {queueSuccessNotice && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold">{queueSuccessNotice}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsQueueDrawerOpen(true)}
            className="text-xs cursor-pointer"
          >
            Open Queue Monitor
          </Button>
        </div>
      )}

      {/* MAIN VIEW: BROADCAST HISTORY OR PRODUCTION DESK */}
      {activeView === 'history' ? (
        <BroadcastHistoryPanel
          tenantId={currentTenant?.tenantId}
          refreshSignal={historyRefreshSignal}
          onCreateNew={() => {
            setActiveView('studio');
            setStudioStep(1);
          }}
        />
      ) : (
        <div className="space-y-6">
          {/* Two-Step Production Stepper */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStudioStep(1)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                studioStep === 1
                  ? 'border-red-600 bg-red-50/70 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                  studioStep === 1
                    ? 'bg-red-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {studioStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
              </span>
              <span>Step 1: Story &amp; Footage Setup</span>
            </button>

            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />

            <button
              type="button"
              disabled={!preparedPackage}
              onClick={() => {
                if (preparedPackage) setStudioStep(2);
              }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition ${
                studioStep === 2
                  ? 'border-red-600 bg-red-50/70 dark:bg-red-950/30 text-red-700 dark:text-red-300 cursor-pointer'
                  : preparedPackage
                  ? 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 cursor-pointer'
                  : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 text-neutral-400 cursor-not-allowed'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                  studioStep === 2
                    ? 'bg-red-600 text-white'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                }`}
              >
                2
              </span>
              <span>Step 2: Pre-Broadcast Review &amp; Publish</span>
            </button>
          </div>

          {/* ================================================================ */}
          {/* STEP 1: STORY & FOOTAGE SETUP                                    */}
          {/* ================================================================ */}
          {studioStep === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (7 cols): Footage Monitor + 3 Clip Slots + Cover Studio */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1A. Live 16:9 Broadcast Monitor & 3-Slot Footage Sequence */}
                <Card className="p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600">
                        <Film className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                          Broadcast Monitor &amp; Footage Sequence
                        </h2>
                        <p className="text-[11px] text-neutral-500">
                          Up to 3 sequential clips stitched in 1080p with your Channel Settings watermark &amp; logo.
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateDemoFootage}
                      disabled={isGeneratingDemoVideo}
                      className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      {isGeneratingDemoVideo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Video className="w-3.5 h-3.5 text-red-600" />
                          <span>Load Sample Clip</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Accurate 16:9 WYSIWYG Broadcast Frame */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 select-none">
                    {clips[0] ? (
                      <video
                        key={clips[0].previewUrl}
                        src={clips[0].previewUrl}
                        controls
                        muted
                        playsInline
                        className="w-full h-full object-contain bg-black"
                      />
                    ) : (
                      <label className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer text-neutral-400 hover:text-white transition p-6 text-center">
                        <Upload className="w-8 h-8 text-red-500" />
                        <span className="text-sm font-bold text-neutral-200">
                          Upload Primary Field Footage (Slot 1)
                        </span>
                        <span className="text-xs text-neutral-400">
                          MP4, MOV, or WebM &bull; Landscape 16:9 recommended
                        </span>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => handleClipUpload(0, e)}
                          className="hidden"
                        />
                      </label>
                    )}

                    {/* WYSIWYG Watermark Text Overlay (Matches exact Channel Settings X/Y/Scale/Opacity) */}
                    {settings.watermark.text && (
                      <div
                        className="absolute pointer-events-none text-center"
                        style={{
                          left: `${settings.watermark.xPercent ?? 50}%`,
                          top: `${settings.watermark.yPercent ?? 50}%`,
                          transform: 'translate(-50%, -50%)',
                          opacity: (settings.watermark.opacityPercent ?? 85) / 100,
                          maxWidth: '80%',
                        }}
                      >
                        <div
                          className="font-black tracking-wider text-white uppercase"
                          style={{
                            fontSize: `calc(9px + ${(settings.watermark.scalePercent || 18) * 0.55}px)`,
                            textShadow: '0 2px 6px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.6)',
                          }}
                        >
                          {settings.watermark.text}
                        </div>
                      </div>
                    )}

                    {/* WYSIWYG Channel Logo Overlay (Matches exact Channel Settings logoXPercent/logoYPercent) */}
                    {hasLogoVisual && (
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: `${settings.watermark.logoXPercent ?? 88}%`,
                          top: `${settings.watermark.logoYPercent ?? 8}%`,
                          transform: 'translate(-50%, -50%)',
                          opacity: (settings.watermark.logoOpacityPercent ?? 90) / 100,
                          width: `${(settings.watermark.logoScalePercent || 18) * 1.3}%`,
                          maxWidth: '96px',
                        }}
                      >
                        {settings.watermark.logoFormat === 'video' && activeLogoVideoUrl ? (
                          <video
                            src={activeLogoVideoUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-auto object-contain drop-shadow-lg"
                          />
                        ) : (
                          <img
                            src={settings.watermark.logoDataUrl}
                            alt="Channel Logo"
                            className="w-full h-auto object-contain drop-shadow-lg"
                          />
                        )}
                      </div>
                    )}

                    {/* Reporting Location Badge */}
                    {newsLocation.trim() && (
                      <div className="absolute top-3 left-3 pointer-events-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600/95 text-white text-[11px] font-bold shadow-md">
                        <MapLocationPointerIcon className="w-3.5 h-3.5 text-white" size={14} />
                        <span className="uppercase tracking-wide">{newsLocation.trim()}</span>
                      </div>
                    )}

                    {/* Bottom 2-Tier News Ticker Preview */}
                    <div className="absolute bottom-0 inset-x-0 pointer-events-none">
                      <div className="bg-red-700/95 text-white px-3 py-1.5 flex items-center gap-2.5 border-t border-red-400/50">
                        <span className="px-1.5 py-0.5 rounded bg-white text-red-700 text-[9px] font-black tracking-wider shrink-0">
                          BREAKING
                        </span>
                        <span
                          className="text-xs sm:text-sm truncate"
                          style={{
                            fontFamily: tickerFont.fontFamily,
                            fontWeight: tickerFont.fontWeight,
                          }}
                        >
                          {displayTickerText}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3 Sequential Footage Clip Slots */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { index: 0, title: 'Slot 1 • Opening Clip', required: true },
                      { index: 1, title: 'Slot 2 • Main Visuals', required: false },
                      { index: 2, title: 'Slot 3 • Closing Shot', required: false },
                    ].map((slot) => {
                      const clip = clips[slot.index];
                      return (
                        <div
                          key={slot.index}
                          className={`p-3 rounded-xl border text-xs space-y-2 ${
                            clip
                              ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
                              : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate">
                              {slot.title}
                            </span>
                            {slot.required && (
                              <span className="text-[10px] font-semibold text-red-600">Required</span>
                            )}
                          </div>

                          {clip ? (
                            <div className="space-y-2">
                              <div className="text-[11px] text-neutral-600 dark:text-neutral-300 font-mono truncate">
                                {clip.name}
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                  {clip.durationSec}s
                                </span>
                                <div className="flex items-center gap-1">
                                  {slot.index > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleMoveClip(slot.index, slot.index - 1)}
                                      className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
                                      title="Move Earlier"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                  )}
                                  {slot.index < 2 && (
                                    <button
                                      type="button"
                                      onClick={() => handleMoveClip(slot.index, slot.index + 1)}
                                      className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
                                      title="Move Later"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveClip(slot.index)}
                                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/60 text-red-500 cursor-pointer"
                                    title="Remove Clip"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <label className="block py-2.5 px-2 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-red-500 text-center cursor-pointer transition text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                              <Upload className="w-3.5 h-3.5 mx-auto mb-1 text-neutral-400" />
                              <span>Select Video</span>
                              <input
                                type="file"
                                accept="video/*"
                                onChange={(e) => handleClipUpload(slot.index, e)}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* 1B. Broadcast Cover Studio (1280x720 Thumbnail) */}
                <Card className="p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                          1280×720 Broadcast Cover Studio
                        </h2>
                        <p className="text-[11px] text-neutral-500">
                          Instant HD keyframe cover with lower-third graphics, or upload your custom artwork.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-200 cursor-pointer inline-flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Custom</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleCustomThumbnailUpload}
                          className="hidden"
                        />
                      </label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => renderBroadcastCover()}
                        disabled={isGeneratingThumbnail}
                        className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCw
                          className={`w-3.5 h-3.5 ${isGeneratingThumbnail ? 'animate-spin' : ''}`}
                        />
                        <span>Render Cover</span>
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    {/* Cover Preview */}
                    <div className="md:col-span-6 space-y-2">
                      <div className="aspect-video rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-950 flex items-center justify-center relative">
                        {thumbnailPreviewUrl ? (
                          <img
                            src={thumbnailPreviewUrl}
                            alt="Broadcast Cover Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-4 text-neutral-500 space-y-1">
                            <ImageIcon className="w-7 h-7 mx-auto opacity-50" />
                            <p className="text-xs font-medium">
                              Cover auto-renders from Slot 1 footage or during Preview
                            </p>
                          </div>
                        )}
                      </div>
                      {customThumbnailFileName && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate">
                          Custom Cover Active: {customThumbnailFileName}
                        </p>
                      )}
                    </div>

                    {/* Cover Graphics Controls */}
                    <div className="md:col-span-6 space-y-3 text-xs">
                      <div>
                        <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                          Cover Headline
                        </label>
                        <input
                          type="text"
                          value={thumbnailHeadline}
                          onChange={(e) => setThumbnailHeadline(e.target.value)}
                          placeholder="Auto-filled from story if left blank"
                          className="w-full px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                            Badge Stamp
                          </label>
                          <select
                            value={thumbnailBadge}
                            onChange={(e) => setThumbnailBadge(e.target.value)}
                            className="w-full px-2.5 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800"
                          >
                            {BADGE_PRESETS.map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                            Sub-Tag / Hook
                          </label>
                          <input
                            type="text"
                            value={thumbnailCuriosity}
                            onChange={(e) => setThumbnailCuriosity(e.target.value)}
                            placeholder="Full Ground Report"
                            className="w-full px-2.5 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {THEME_OPTIONS.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setThumbnailThemeColor(t.id)}
                              title={t.label}
                              className={`w-6 h-6 rounded-md ${t.swatch} transition cursor-pointer ${
                                thumbnailThemeColor === t.id
                                  ? 'ring-2 ring-offset-2 ring-neutral-900 dark:ring-white'
                                  : 'opacity-70 hover:opacity-100'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 tabular-nums">
                          <span>Frame @</span>
                          <input
                            type="number"
                            min={0}
                            max={60}
                            step={0.5}
                            value={thumbnailKeyframeTimeSec}
                            onChange={(e) =>
                              setThumbnailKeyframeTimeSec(Math.max(0, Number(e.target.value) || 0))
                            }
                            className="w-14 px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-center"
                          />
                          <span>s</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right Column (5 cols): News Story Manuscript + Anchor Quick Controls + Location/Ticker + CTA */}
              <div className="lg:col-span-5 space-y-6">
                {/* 1C. News Story Manuscript */}
                <Card className="p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-red-600" />
                      <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                        News Story Manuscript
                      </h2>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {newsroomStories.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowStoryPicker((s) => !s)}
                          className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-semibold text-neutral-700 dark:text-neutral-200 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Load Desk Story</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleDraftStoryFromFootage}
                        disabled={isExtractingStory || activeClips.length === 0}
                        className="px-2.5 py-1 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                      >
                        {isExtractingStory ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Drafting...</span>
                          </>
                        ) : (
                          <>
                            <Film className="w-3 h-3" />
                            <span>Draft from Footage</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Quick Newsroom Story Picker */}
                  {showStoryPicker && newsroomStories.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 max-h-44 overflow-y-auto space-y-1.5">
                      {newsroomStories.map((story) => (
                        <button
                          key={story.id}
                          type="button"
                          onClick={() => {
                            setNewsText(story.body);
                            if (story.location) setNewsLocation(story.location);
                            setTickerText(story.headline);
                            setShowStoryPicker(false);
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-white dark:hover:bg-neutral-900 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 transition cursor-pointer"
                        >
                          <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-1">
                            {story.headline}
                          </p>
                          {story.location && (
                            <p className="text-[10px] text-neutral-500 mt-0.5">{story.location}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Broadcast Language Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                      <Languages className="w-3.5 h-3.5 text-red-600" />
                      <span>Broadcast Language</span>
                    </label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) =>
                        setSelectedLanguage(e.target.value as SupportedIndianLanguage)
                      }
                      className="w-full px-3 py-2 text-sm font-medium bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/40"
                    >
                      {SUPPORTED_INDIAN_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Story Textarea */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Report Facts &amp; Story Copy
                      </label>
                      <span className="text-[11px] text-neutral-400 tabular-nums">
                        {newsText.trim().split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      value={newsText}
                      onChange={(e) => setNewsText(e.target.value)}
                      placeholder="Paste or type your reporter dispatch in English or any Indian regional language. The editorial desk will format it into a crisp 60–70 word anchor bulletin for your review in Step 2."
                      className="w-full px-3 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-y"
                    />
                  </div>

                  {/* Reporting Location & Scrolling Ticker */}
                  <div className="grid grid-cols-1 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-red-600" />
                        <span>Reporting Dateline / Location Badge</span>
                      </label>
                      <input
                        type="text"
                        value={newsLocation}
                        onChange={(e) => setNewsLocation(e.target.value)}
                        placeholder="e.g. New Delhi, Mumbai, Hyderabad, Bengaluru..."
                        className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg"
                      />
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {PAN_INDIA_LOCATIONS.slice(0, 6).map((city) => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => setNewsLocation(city)}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition cursor-pointer ${
                              newsLocation === city
                                ? 'border-red-600 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                                : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                            }`}
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                        Bottom News Ticker Text (Optional)
                      </label>
                      <input
                        type="text"
                        value={tickerText}
                        onChange={(e) => setTickerText(e.target.value)}
                        placeholder="Auto-generated from your headline if left empty"
                        className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg"
                      />
                    </div>
                  </div>
                </Card>

                {/* 1D. Anchor & Broadcast Quick Overrides */}
                <Card className="p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-red-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                        Anchor &amp; Mastering Overrides
                      </h3>
                    </div>
                    <span className="text-[11px] text-neutral-500">Synced with Settings</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                        Voice Anchor
                      </label>
                      <select
                        value={voiceActorId}
                        onChange={(e) => setVoiceActorId(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800"
                      >
                        {VOICE_ACTORS.map((actor) => (
                          <option key={actor.id} value={actor.id}>
                            {actor.englishName || actor.name} ({actor.gender})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                        Delivery Tone
                      </label>
                      <select
                        value={emotionalStyle}
                        onChange={(e) => setEmotionalStyle(e.target.value as EmotionalNewsStyle)}
                        className="w-full px-2.5 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800"
                      >
                        <option value="emotional_breaking">High-Impact Breaking</option>
                        <option value="dramatic_primetime">Prime-Time Authoritative</option>
                        <option value="urgent_investigative">Investigative Pulse</option>
                        <option value="speed_bulletin">Fast Speed Bulletin</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="font-semibold text-neutral-600 dark:text-neutral-400">
                          Pacing
                        </label>
                        <span className="font-mono font-bold text-red-600 tabular-nums">
                          {speechRate.toFixed(2)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.85"
                        max="1.55"
                        step="0.05"
                        value={speechRate}
                        onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                        className="w-full accent-red-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                        Footage Duration
                      </label>
                      <select
                        value={clipDurationMode}
                        onChange={(e) => setClipDurationMode(e.target.value as any)}
                        className="w-full px-2.5 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800"
                      >
                        <option value="full">Full Footage ({totalFootageDuration || 30}s)</option>
                        <option value="bulletin">Match Narration (~45s)</option>
                        <option value="60s">Cap at 60 Seconds</option>
                        <option value="120s">Cap at 2 Minutes</option>
                        <option value="300s">Cap at 5 Minutes</option>
                      </select>
                    </div>
                  </div>
                </Card>

                {/* Primary Step 1 CTA */}
                <Card className="p-5 border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900 space-y-3">
                  {isPreparingPreview ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                          <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                          <span>{prepareStageMessage}</span>
                        </span>
                        <span className="font-mono text-red-600 tabular-nums">
                          {prepareProgress}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full bg-red-600 transition-all duration-300"
                          style={{ width: `${prepareProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={handlePrepareBroadcastPreview}
                      disabled={activeClips.length === 0 || newsText.trim().length < 15}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45"
                    >
                      <span>Generate Broadcast Preview</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                  <p className="text-[11px] text-neutral-500 text-center">
                    Nothing is uploaded to YouTube yet. Step 2 lets you review the script, listen to the 24kHz anchor voice, and approve before publishing.
                  </p>
                </Card>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 2: PRE-BROADCAST REVIEW & PUBLISH DESK                      */}
          {/* ================================================================ */}
          {studioStep === 2 && preparedPackage && (
            <div className="space-y-6">
              {/* Post-Publish Success Panel */}
              {publishedResult && (
                <Card className="p-6 border border-emerald-400/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                          Broadcast Published Public on YouTube
                        </h2>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5">
                          {publishedResult.title} &bull; Channel: {account.channelTitle || 'Connected Channel'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                          <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-semibold">
                            Visibility: Public
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 font-mono text-neutral-700 dark:text-neutral-300">
                            ID: {publishedResult.videoId}
                          </span>
                          <span className="text-neutral-600 dark:text-neutral-300 font-medium">
                            {youtubeProcessingState === 'processed'
                              ? 'YouTube SD/HD playback ready'
                              : youtubeProcessingState === 'checking' ||
                                youtubeProcessingState === 'processing'
                              ? 'YouTube encoding in progress...'
                              : 'Logged to Broadcast History'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyPublishedUrl}
                        className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedUrl ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Link Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </Button>

                      <a
                        href={publishedResult.youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
                      >
                        <span>Watch on YouTube</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveView('history')}
                        className="text-xs font-semibold cursor-pointer"
                      >
                        View History
                      </Button>

                      <Button
                        size="sm"
                        onClick={handleResetStudio}
                        className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold cursor-pointer"
                      >
                        New Broadcast
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Compliance Clearance Banner */}
              <div
                className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  preparedPackage.compliance.isCompliant
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {preparedPackage.compliance.isCompliant ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold block">
                      {preparedPackage.compliance.isCompliant
                        ? 'Editorial & Broadcast Standards Cleared'
                        : `Editorial Advisory (Score: ${preparedPackage.compliance.scorePercent}/100)`}
                    </span>
                    <span className="opacity-90">
                      {preparedPackage.compliance.statusMessage ||
                        'Script adheres to broadcast journalism standards and community guidelines.'}
                    </span>
                    {!preparedPackage.compliance.isCompliant &&
                      preparedPackage.compliance.violations.length > 0 && (
                        <ul className="list-disc pl-4 mt-1 space-y-0.5">
                          {preparedPackage.compliance.violations.map((v, idx) => (
                            <li key={idx}>{v}</li>
                          ))}
                        </ul>
                      )}
                  </div>
                </div>

                {!preparedPackage.compliance.isCompliant && (
                  <label className="inline-flex items-center gap-2 font-semibold shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preparedPackage.overrideCompliance}
                      onChange={(e) =>
                        setPreparedPackage({
                          ...preparedPackage,
                          overrideCompliance: e.target.checked,
                        })
                      }
                      className="accent-red-600 w-4 h-4"
                    />
                    <span>Editor Reviewed &amp; Approved</span>
                  </label>
                )}
              </div>

              {/* Step 2 Main Two-Column Review Desk */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column (7 cols): Editable Script + Live 24kHz Audio Player + Metadata */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Anchor Script & Audio Audition Card */}
                  <Card className="p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-red-600" />
                        <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                          Anchor Script &amp; Studio Voice Audition
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 text-xs tabular-nums">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold ${
                            scriptWordCount >= 45 && scriptWordCount <= 85
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {scriptWordCount} words
                        </span>
                        <span className="text-neutral-500">~{estimatedAudioSeconds}s runtime</span>
                      </div>
                    </div>

                    <textarea
                      rows={5}
                      value={preparedPackage.voiceOverScript}
                      onChange={(e) =>
                        setPreparedPackage({
                          ...preparedPackage,
                          voiceOverScript: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2.5 text-sm leading-relaxed bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/40"
                    />

                    {/* Audio Player & Re-Record Controls */}
                    <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-3">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                          <Volume2 className="w-4 h-4 text-red-600" />
                          <span>
                            24kHz Studio Narration &bull;{' '}
                            {activeVoiceActor.englishName || activeVoiceActor.name}
                          </span>
                        </span>
                        <span className="text-[11px] text-neutral-500 tabular-nums">
                          {speechRate.toFixed(2)}x pace
                        </span>
                      </div>

                      <audio
                        key={preparedPackage.audioUrl}
                        controls
                        src={preparedPackage.audioUrl}
                        className="w-full h-10"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <select
                            value={voiceActorId}
                            onChange={(e) => setVoiceActorId(e.target.value)}
                            aria-label="Select Voice Anchor"
                            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700"
                          >
                            {VOICE_ACTORS.map((actor) => (
                              <option key={actor.id} value={actor.id}>
                                {actor.englishName || actor.name}
                              </option>
                            ))}
                          </select>

                          <select
                            value={speechRate}
                            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                            aria-label="Select Speech Pacing"
                            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 tabular-nums"
                          >
                            <option value={1.0}>1.00x Normal</option>
                            <option value={1.2}>1.20x Brisk</option>
                            <option value={1.3}>1.30x Breaking</option>
                            <option value={1.45}>1.45x Fast</option>
                          </select>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleRerecordVoice}
                          disabled={isRerecordingVoice}
                          className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          {isRerecordingVoice ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Re-Recording...</span>
                            </>
                          ) : (
                            <>
                              <RotateCw className="w-3.5 h-3.5" />
                              <span>Re-Record Voice</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* YouTube Metadata Editor Card */}
                  <Card className="p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-4">
                    <div className="flex items-center gap-2">
                      <Youtube className="w-4 h-4 text-red-600" />
                      <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                        YouTube Broadcast Metadata
                      </h2>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                            Video Title
                          </label>
                          <span
                            className={`font-mono tabular-nums ${
                              preparedPackage.youtubeTitle.length > 100
                                ? 'text-red-600 font-bold'
                                : 'text-neutral-400'
                            }`}
                          >
                            {preparedPackage.youtubeTitle.length} / 100
                          </span>
                        </div>
                        <input
                          type="text"
                          maxLength={100}
                          value={preparedPackage.youtubeTitle}
                          onChange={(e) =>
                            setPreparedPackage({
                              ...preparedPackage,
                              youtubeTitle: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm font-semibold bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                          Video Description
                        </label>
                        <textarea
                          rows={4}
                          value={preparedPackage.youtubeDescription}
                          onChange={(e) =>
                            setPreparedPackage({
                              ...preparedPackage,
                              youtubeDescription: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                          Broadcast Tags (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={preparedPackage.youtubeTagsText}
                          onChange={(e) =>
                            setPreparedPackage({
                              ...preparedPackage,
                              youtubeTagsText: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg"
                        />
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Right Column (5 cols): Cover Preview + Publish / Queue Dispatch */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Cover Verification Card */}
                  <Card className="p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                        16:9 YouTube Cover Preview
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleDownloadThumbnail}
                          className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                          title="Download 1280x720 Cover"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="aspect-video rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-950">
                      <img
                        src={preparedPackage.thumbnailDataUrl}
                        alt="Reviewed Cover"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <input
                        type="text"
                        value={thumbnailHeadline}
                        onChange={(e) => setThumbnailHeadline(e.target.value)}
                        placeholder="Cover headline"
                        className="col-span-2 px-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRegenerateReviewCover}
                        disabled={isGeneratingThumbnail}
                        className="text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RotateCw
                          className={`w-3.5 h-3.5 ${isGeneratingThumbnail ? 'animate-spin' : ''}`}
                        />
                        <span>Regenerate Cover</span>
                      </Button>
                      <label className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-200 cursor-pointer flex items-center justify-center gap-1">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Custom</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleCustomThumbnailUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </Card>

                  {/* Dispatch & Publish Card */}
                  <Card className="p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-4">
                    <div className="space-y-1.5 text-xs">
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                        Final Broadcast Dispatch
                      </h3>
                      <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Target Channel</span>
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {account.isConnected ? account.channelTitle : 'Not Connected'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">YouTube Visibility</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            Direct Public
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Footage Clips</span>
                          <span className="font-semibold tabular-nums">
                            {activeClips.length} clip{activeClips.length > 1 ? 's' : ''} ({totalFootageDuration}s)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Publish Progress Indicator */}
                    {isPublishing && (
                      <div className="p-3.5 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="flex items-center gap-2 text-red-900 dark:text-red-200">
                            <Loader2 className="w-4 h-4 animate-spin text-red-600 shrink-0" />
                            <span>{publishStage}</span>
                          </span>
                          <span className="font-mono text-red-600 tabular-nums">
                            {publishProgress}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-red-200/70 dark:bg-red-950 overflow-hidden">
                          <div
                            className="h-full bg-red-600 transition-all duration-300"
                            style={{ width: `${publishProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Direct Publish Now CTA */}
                    <Button
                      onClick={handlePublishPublicNow}
                      disabled={isPublishing || !account.isConnected}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45"
                    >
                      <Rocket className="w-4 h-4" />
                      <span>
                        {isPublishing ? 'Publishing Public Broadcast...' : 'Publish Public to YouTube Now'}
                      </span>
                    </Button>

                    {/* Background Queue Dispatch Row */}
                    <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                          Or Dispatch via Broadcast Queue
                        </span>
                        <span className="text-[11px] text-neutral-500">Background Worker</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            {
                              id: 'P1_FLASH_BREAKING',
                              label: 'P1 Flash',
                              icon: Flame,
                            },
                            {
                              id: 'P2_PRIMETIME_BULLETIN',
                              label: 'P2 Prime',
                              icon: Clock,
                            },
                            {
                              id: 'P3_ROUTINE_FIELD_REPORT',
                              label: 'P3 Routine',
                              icon: Zap,
                            },
                          ] as const
                        ).map((prio) => {
                          const Icon = prio.icon;
                          const isSelected = selectedQueuePriority === prio.id;
                          return (
                            <button
                              key={prio.id}
                              type="button"
                              onClick={() => setSelectedQueuePriority(prio.id)}
                              className={`py-2 px-2 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                              }`}
                            >
                              <Icon className="w-3 h-3" />
                              <span>{prio.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        onClick={handleAddToQueue}
                        disabled={isEnqueueing || isPublishing || !account.isConnected}
                        className="w-full text-xs font-bold py-2.5 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        <span>{isEnqueueing ? 'Adding to Queue...' : 'Add to Broadcast Queue'}</span>
                      </Button>
                    </div>

                    {/* Back to Step 1 Button */}
                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setStudioStep(1)}
                        disabled={isPublishing}
                        className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Story &amp; Footage</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetStudio}
                        disabled={isPublishing}
                        className="text-xs font-semibold text-neutral-400 hover:text-red-600 cursor-pointer disabled:opacity-40"
                      >
                        Reset Studio
                      </button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slide-over Broadcast Queue Monitor Drawer */}
      <YouTubeQueueDrawer
        isOpen={isQueueDrawerOpen}
        onClose={() => setIsQueueDrawerOpen(false)}
        tenantId={currentTenant?.tenantId}
      />
    </div>
  );
};
