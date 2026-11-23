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
  MapPin,
  Tv,
  Sparkles,
  Zap,
  Download,
  Loader2,
  Info,
  Image as ImageIcon,
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

/**
 * Authentic Broadcast Navigation Map Pointer Icon:
 * Circular top with hollow center hole and sharp bottom pointer
 */
export const MapLocationPointerIcon: React.FC<{ className?: string; size?: number }> = ({ className = 'w-4 h-4', size = 20 }) => (
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
 * Resolves the ideal broadcast display font style for news ticker crawls:
 * - Telugu: Ramabhadra (the gold standard for bold Telugu broadcast tickers)
 * - Other languages: Ramabhadra-like bold, impactful broadcast display fonts:
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

  // English / Universal: Khand is a high-impact broadcast display font matching Ramabhadra's boldness
  return {
    fontFamily: '"Khand", "Cinzel", "Roboto", "Segoe UI", sans-serif',
    fontWeight: 600,
    fontLabel: 'Khand • Broadcast Display',
    isTelugu: false,
  };
};

export const YouTubeNewsStudioPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const [settings, setSettings] = useState<YouTubeChannelBrandingSettings>(() => YouTubeService.getSettings());
  const [account, setAccount] = useState<YouTubeConnectedAccount>(() => YouTubeService.getConnectedAccount());

  // Form Inputs: 3 Dedicated Sequential Clip Slots (Opening, Main Speech, Conclusion)
  const [newsText, setNewsText] = useState<string>('');
  const [newsLocation, setNewsLocation] = useState<string>('');
  const [tickerText, setTickerText] = useState<string>('');
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
  const [youtubeProcessingState, setYoutubeProcessingState] = useState<'idle' | 'checking' | 'processing' | 'processed' | 'background'>('idle');
  const [isExtractingStory, setIsExtractingStory] = useState<boolean>(false);

  // YouTube Thumbnail Studio States
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string>('');
  const [thumbnailCustomBlob, setThumbnailCustomBlob] = useState<Blob | null>(null);
  const [isCustomThumbnailUploaded, setIsCustomThumbnailUploaded] = useState<boolean>(false);
  const [customThumbnailFileName, setCustomThumbnailFileName] = useState<string>('');
  const [thumbnailHeadline, setThumbnailHeadline] = useState<string>('');
  const [thumbnailBadge, setThumbnailBadge] = useState<string>('BREAKING!');
  const [thumbnailCuriosity, setThumbnailCuriosity] = useState<string>('What Just Happened?');
  const [thumbnailThemeColor, setThumbnailThemeColor] = useState<'fire_red' | 'electric_yellow' | 'shock_blue' | 'crimson_dark'>('fire_red');
  const [thumbnailKeyframeTimeSec, setThumbnailKeyframeTimeSec] = useState<number>(2.0);
  const [thumbnailKeyframeBase64, setThumbnailKeyframeBase64] = useState<string>('');
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState<boolean>(false);
  const [thumbnailModelUsed, setThumbnailModelUsed] = useState<string>('');
  const [thumbnailSource, setThumbnailSource] = useState<'gemini-image-model' | 'broadcast-canvas' | 'custom-upload' | ''>('');

  const LANGUAGE_BADGE_PRESETS: Record<string, string[]> = {
    te: ['BREAKING!', 'MAJOR UPDATE!', 'SPECIAL REPORT!', 'WHAT HAPPENED?', 'HIGH ALERT!'],
    hi: ['BREAKING!', 'BIG REVELATION!', 'SPECIAL REPORT!', 'WHAT HAPPENED?'],
    ta: ['BREAKING!', 'TOP STORY!', 'SPECIAL REPORT!'],
    kn: ['BREAKING!', 'TOP STORY!', 'SPECIAL REPORT!'],
    ml: ['BREAKING!', 'SPECIAL REPORT!'],
    bn: ['BREAKING!', 'SPECIAL REPORT!'],
    mr: ['BREAKING!', 'SPECIAL REPORT!'],
    gu: ['BREAKING!', 'SPECIAL REPORT!'],
    pa: ['BREAKING!', 'SPECIAL REPORT!'],
    or: ['BREAKING!', 'SPECIAL REPORT!'],
    en: ['SHOCKING REVELATION!', 'BREAKING REPORT!', 'UNEXPECTED TWIST!', 'WHAT HAPPENED?'],
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbnailFileInputRef = useRef<HTMLInputElement>(null);

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

  // Live state-level news ticker headlines from the newsroom feed (fallback when ticker field is blank)
  const defaultStateTicker = React.useMemo(() => {
    return newsSubmissionService.getStateTickerString(currentTenant?.tenantId);
  }, [currentTenant?.tenantId]);

  // Active ticker text and typography (Ramabhadra for Telugu, broadcast display for other languages)
  const activeTickerText = tickerText.trim() || defaultStateTicker;
  const tickerFont = React.useMemo(() => {
    return getBroadcastTickerFont(activeTickerText, selectedLanguage);
  }, [activeTickerText, selectedLanguage]);

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

    // Auto-populate reporting location from story metadata or dateline prefix
    if ((art as any).location) {
      setNewsLocation((art as any).location);
    } else {
      const match = combined.match(/^([^\n:,\-–—]{2,25})\s*[:\-–—]/);
      if (match && match[1] && !match[1].includes(' ')) {
        setNewsLocation(match[1].trim());
      }
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

  const handleExtractStoryFromVideo = async (videoFile?: File | Blob) => {
    const targetFile = videoFile || clips[0]?.file;
    if (!targetFile) return;
    setIsExtractingStory(true);
    setErrorMessage(null);
    try {
      const result = await AIVideoEditorialService.draftStoryFromVideo(targetFile, selectedLanguage);
      if (result.story) {
        setNewsText(result.story);
      }
      if (result.headline) {
        setThumbnailHeadline(result.headline);
      }
      if (result.location && !newsLocation) {
        setNewsLocation(result.location);
      }
    } catch (e: any) {
      console.warn('AI story extraction notice:', e);
    } finally {
      setIsExtractingStory(false);
    }
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

    // Automatically extract news story manuscript from footage if manuscript is empty
    if (!newsText.trim() && files[0] && slotIdx === 0) {
      handleExtractStoryFromVideo(files[0]);
    }

    // Automatically generate thumbnail from footage only if user has not uploaded a custom thumbnail
    if (!isCustomThumbnailUploaded) {
      setTimeout(() => {
        handleGenerateAIThumbnail();
      }, 600);
    }
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
    setTickerText('');
    setPublishedResult(null);
    setErrorMessage(null);
    setComplianceWarning(null);
    setProgressPercent(0);
    setCurrentStep('');
    setIsCustomThumbnailUploaded(false);
    setCustomThumbnailFileName('');
    setThumbnailCustomBlob(null);
    setThumbnailPreviewUrl('');
    setThumbnailSource('');
  };

  const handleCustomThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setThumbnailPreviewUrl(dataUrl);
      setThumbnailCustomBlob(file);
      setIsCustomThumbnailUploaded(true);
      setCustomThumbnailFileName(file.name);
      setThumbnailSource('custom-upload');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveCustomThumbnail = () => {
    setIsCustomThumbnailUploaded(false);
    setCustomThumbnailFileName('');
    setThumbnailCustomBlob(null);
    setThumbnailPreviewUrl('');
    setThumbnailSource('');
    // If video footage is already uploaded, auto-generate thumbnail from footage
    if (activeClips.some((c) => Boolean(c))) {
      setTimeout(() => {
        handleGenerateAIThumbnail();
      }, 200);
    }
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

  // 100% Autonomous AI YouTube Thumbnail Generation with Gemini Image Model
  const handleGenerateAIThumbnail = async () => {
    // If user uploaded their own custom thumbnail, strictly do not generate AI thumbnail
    if (isCustomThumbnailUploaded) {
      return;
    }
    try {
      setIsGeneratingThumbnail(true);
      setErrorMessage(null);

      let keyframe = thumbnailKeyframeBase64;
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        keyframe = await ThumbnailGeneratorService.extractBestFaceKeyframe(videoRef.current, [1.0, 2.5, 4.0]);
        if (keyframe) {
          setThumbnailKeyframeBase64(keyframe);
        }
      }

      // Auto-extract headline from manuscript if not pre-set
      let activeHeadline = thumbnailHeadline.trim();
      if (!activeHeadline && newsText.trim()) {
        const firstLine = newsText.trim().split('\n')[0].replace(/^([^\n:,\-–—]{2,25})\s*[:\-–—]/, '').trim();
        if (firstLine) {
          activeHeadline = firstLine.slice(0, 42);
        }
      }
      if (!activeHeadline) {
        activeHeadline = 'BREAKING NEWS REPORT';
      }

      const activeBadge = thumbnailBadge.trim() || 'BREAKING!';
      const activeCuriosity = thumbnailCuriosity.trim() || 'What Just Happened?';

      setThumbnailHeadline(activeHeadline);
      setThumbnailBadge(activeBadge);
      setThumbnailCuriosity(activeCuriosity);

      const result = await ThumbnailGeneratorService.generateAIThumbnail({
        videoElement: videoRef.current || undefined,
        keyframeImageUrl: keyframe,
        headlineText: activeHeadline,
        badgeText: activeBadge,
        curiosityLine: activeCuriosity,
        themeColor: thumbnailThemeColor,
        logoDataUrl: settings.watermark.logoDataUrl,
        channelName: account.channelTitle || 'NEWSPRESS 24x7',
        language: selectedLanguage,
        preferGeminiImageModel: true,
      });

      setThumbnailPreviewUrl(result.dataUrl);
      setThumbnailCustomBlob(result.blob);
      setThumbnailModelUsed(result.modelUsed);
      setThumbnailSource(result.source);
    } catch (err: any) {
      console.warn('AI Thumbnail Generation error:', err);
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const handleDownloadThumbnail = () => {
    const url = thumbnailPreviewUrl || publishedThumbnailUrl;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube_thumbnail_${selectedLanguage}_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

    // Pacing Manager for Cloud Studio Mastering
    const estimatedMasteringSec = Math.max(
      30,
      Math.min(180, Math.round((totalFootageDuration || 60) * 0.35) + 15)
    );

    let masteringInterval: NodeJS.Timeout | null = null;
    setYoutubeProcessingState('idle');

    setProgressPercent(6);
    setCurrentStep('Reviewing news manuscript against editorial standards...');

    try {
      // Step 1: Legal & Compliance Verification
      if (!isOverride) {
        const compliance = await AIVideoEditorialService.verifyEditorialCompliance(newsText);
        if (!compliance.isCompliant) {
          setComplianceWarning(compliance.statusMessage || 'The news content flagged an editorial compliance advisory.');
          setIsPublishing(false);
          return;
        }
      }
      setProgressPercent(16);

      // Step 2: News Manuscript & Broadcast Headlines Formatting
      setCurrentStep('Formatting broadcast news script and headlines from story and video footage...');
      const editorialPkg = await AIVideoEditorialService.generateBroadcastPackage({
        newsText: newsText.trim() || 'Latest Breaking News Update',
        language: selectedLanguage,
        channelName: account.channelTitle || 'NewsPress Network',
        videoClips: activeClips.map((c) => c.file),
      });
      setProgressPercent(28);

      // Step 3: Studio Anchor Narration Audio Recording
      const langObj = SUPPORTED_INDIAN_LANGUAGES.find((l) => l.code === selectedLanguage);
      setCurrentStep(`Recording studio news narration in ${langObj?.name || 'regional language'}...`);
      const voiceResult = await AIVideoEditorialService.synthesizeVoiceOver({
        scriptText: editorialPkg.scriptText,
        language: selectedLanguage,
        rate: settings.speechRate,
        gender: settings.voiceGender,
      });
      setProgressPercent(40);

      // Step 4: Video Thumbnail (Custom Uploaded or Auto Generated)
      let finalThumbBlob: Blob;
      let finalThumbDataUrl: string;

      if (isCustomThumbnailUploaded && thumbnailCustomBlob && thumbnailPreviewUrl) {
        setCurrentStep('Attaching your custom uploaded thumbnail...');
        finalThumbBlob = thumbnailCustomBlob;
        finalThumbDataUrl = thumbnailPreviewUrl;
      } else {
        setCurrentStep('Designing broadcast thumbnail from video footage...');
        let keyframeUrl = thumbnailKeyframeBase64;
        if (!keyframeUrl && videoRef.current && videoRef.current.videoWidth > 0) {
          keyframeUrl = await ThumbnailGeneratorService.extractBestFaceKeyframe(videoRef.current, [1, 2.5, 4]);
        }
        const thumb = await ThumbnailGeneratorService.generateAIThumbnail({
          videoElement: videoRef.current || undefined,
          keyframeImageUrl: keyframeUrl,
          headlineText: thumbnailHeadline || editorialPkg.thumbnailHeadline,
          badgeText: thumbnailBadge || editorialPkg.thumbnailBadge,
          curiosityLine: thumbnailCuriosity || editorialPkg.thumbnailCuriosityLine,
          themeColor: thumbnailThemeColor || editorialPkg.thumbnailColorTheme || 'fire_red',
          logoDataUrl: settings.watermark.logoDataUrl,
          channelName: account.channelTitle || 'NEWSPRESS 24x7',
          language: selectedLanguage,
          preferGeminiImageModel: true,
        });
        finalThumbBlob = thumb.blob;
        finalThumbDataUrl = thumb.dataUrl;
        setThumbnailPreviewUrl(thumb.dataUrl);
        setThumbnailCustomBlob(thumb.blob);
      }
      setPublishedThumbnailUrl(finalThumbDataUrl);
      setProgressPercent(46);

      // Step 5: Studio Composition & Mastering on Cloud Run
      setCurrentStep(`Mastering broadcast package (${activeClips.length} sequential clips + bumpers) with 2-tier tickers & watermark...`);

      // Start smooth pacing interval for mastering stage: smoothly climbs from 46% up to 82%
      masteringInterval = setInterval(() => {
        setProgressPercent((prev) => {
          if (prev >= 82) return 82;
          const step = Math.max(0.4, (82 - prev) / (estimatedMasteringSec * 0.7));
          return Math.min(82, Math.round(prev + step));
        });
      }, 1000);

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
        newsLocation: newsLocation.trim(),
        tickerText: tickerText.trim() || defaultStateTicker,
        clipDurationMode,
        sourceDuration: totalFootageDuration,
        thumbnailBlob: finalThumbBlob,
        channelTitle: account.channelTitle || 'NewsPress 24x7',
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

      if (masteringInterval) {
        clearInterval(masteringInterval);
        masteringInterval = null;
      }

      // Step 6: Direct Transmission to YouTube Succeeded
      setProgressPercent(86);
      setCurrentStep('Delivered to YouTube! Verifying live SD/HD stream processing...');
      setYoutubeProcessingState('checking');

      // Step 7: Poll YouTube Data API for live processing status (SD transcode ready)
      const pollStart = Date.now();
      const maxPollMs = 35000;
      let isVerifiedSdReady = false;

      while (Date.now() - pollStart < maxPollMs) {
        try {
          const ytStatus = await YouTubeService.getVideoProcessingStatus(
            broadcastResult.videoId,
            activeAccessToken
          );
          if (ytStatus.isSdReady || ytStatus.uploadStatus === 'processed' || ytStatus.processingStatus === 'succeeded') {
            isVerifiedSdReady = true;
            setYoutubeProcessingState('processed');
            break;
          } else if (ytStatus.uploadStatus === 'uploaded' || ytStatus.processingStatus === 'processing') {
            setYoutubeProcessingState('processing');
            const ytPct = ytStatus.progressPercentage ? ` (${ytStatus.progressPercentage}%)` : '';
            setCurrentStep(`Processing video on YouTube: preparing SD quality${ytPct}...`);
            setProgressPercent((prev) => Math.min(98, prev + 2));
          }
        } catch (pollErr) {
          console.warn('YouTube processing status poll notice:', pollErr);
        }
        await new Promise((r) => setTimeout(r, 3000));
      }

      if (!isVerifiedSdReady) {
        setYoutubeProcessingState('background');
      }

      setProgressPercent(100);
      setCurrentStep(
        isVerifiedSdReady
          ? 'Broadcast Ready! SD video processing completed and ready to watch on YouTube.'
          : 'Video published successfully to YouTube! Ready to share and watch.'
      );

      const pubRes: YouTubePublishResult = {
        videoId: broadcastResult.videoId,
        youtubeUrl: broadcastResult.youtubeUrl,
        embedUrl: `https://www.youtube.com/embed/${broadcastResult.videoId}`,
        title: broadcastResult.title,
        privacyStatus: 'public',
        publishedAt: broadcastResult.publishedAt || new Date().toISOString(),
        thumbnailUploaded: true,
      };
      setPublishedResult(pubRes);
    } catch (err: any) {
      if (masteringInterval) {
        clearInterval(masteringInterval);
        masteringInterval = null;
      }
      console.error('Publishing failed:', err);
      setErrorMessage(err?.message || 'An error occurred during video processing or YouTube publishing.');
    } finally {
      if (masteringInterval) {
        clearInterval(masteringInterval);
        masteringInterval = null;
      }
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 font-sans w-full min-w-0 overflow-x-hidden">
      {/* Top Header */}
      <PageHeader
        title="YouTube News Video Studio"
        subtitle="Newsroom Broadcast Studio: Submit field footage and news manuscript to produce a complete broadcast package with anchor narration, broadcast graphics, channel watermark, and direct YouTube publication."
        breadcrumbs={[
          { label: 'Newsroom', href: '/newsroom/news' },
          { label: 'YouTube Studio' },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-nowrap shrink-0">
            {account.isConnected ? (
              <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold shadow-xs">
                <span className="w-5 h-5 rounded-md bg-red-600 text-white inline-flex items-center justify-center shrink-0 shadow-xs">
                  <Youtube className="w-3 h-3 text-white" />
                </span>
                <span className="truncate max-w-[120px] xs:max-w-[150px] sm:max-w-[200px]">{account.channelTitle || 'Connected Channel'}</span>
                {account.refreshToken ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 sm:px-2 py-0.5 rounded-full font-medium border border-emerald-200 dark:border-emerald-800 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Linked
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 ml-0.5" title="Active session" />
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleReconnectChannel}
                title="Connect or ReConnect YouTube Channel"
                className="inline-flex items-center gap-1.5 sm:gap-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 px-3 py-1.5 rounded-full shadow-xs transition cursor-pointer whitespace-nowrap"
              >
                <span className="w-5 h-5 rounded-md bg-white/20 text-white inline-flex items-center justify-center shrink-0">
                  <Youtube className="w-3 h-3" />
                </span>
                <span>ReConnect</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => navigateTo('/settings?tab=youtube')}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full border border-[#dadce0] dark:border-[#444746] bg-white dark:bg-[#28292a] hover:bg-[#f1f3f4] dark:hover:bg-[#333537] text-xs font-semibold text-[#3c4043] dark:text-[#e3e3e3] shadow-xs transition cursor-pointer whitespace-nowrap"
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
            <div className="lg:col-span-7 space-y-3">
              <div className="bg-black rounded-xl overflow-hidden shadow-sm border border-[#dadce0] dark:border-[#3c4043] aspect-video relative">
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

              {youtubeProcessingState === 'processing' && (
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                  <span className="font-medium">
                    Processing video stream on YouTube (SD/HD). Player will become available for broadcast in a few moments.
                  </span>
                </div>
              )}
              {youtubeProcessingState === 'processed' && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-semibold">
                    YouTube broadcast verified! Video stream is live and ready for high-definition playback.
                  </span>
                </div>
              )}
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5f6368] dark:text-[#8e918f]">
                  Broadcast Headline
                </span>
                <h3 className="text-base font-bold text-[#202124] dark:text-[#f2f2f2] mt-1 leading-snug">
                  {publishedResult.title || (newsText.trim() ? newsText.split('\n')[0] : 'BREAKING NEWS • SPECIAL REPORT')}
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
          <Card className="p-3.5 sm:p-6 lg:p-8 space-y-6 shadow-sm rounded-2xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#1f1f1f]">
            {/* Input 1: Field Video Footage (3 Dedicated Sequential Slots) */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-800 mt-0.5">
                    <Video className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#202124] dark:text-[#f2f2f2] leading-tight">
                      1. Field News Footage
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[#5f6368] dark:text-[#8e918f] mt-0.5 font-normal">
                      (3 Sequential Clip Slots &bull; Up to 10 Min Max)
                    </p>
                  </div>
                </div>

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

              {/* 3 Dedicated Video Upload Slots Grid (Compact Sizing) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  {
                    idx: 0,
                    title: 'Clip 1: Opening Intro',
                    sub: 'Event Opening / Incident Scene',
                    required: true,
                  },
                  {
                    idx: 1,
                    title: 'Clip 2: Main Speech',
                    sub: 'Key Statement / Public Address',
                    required: false,
                  },
                  {
                    idx: 2,
                    title: 'Clip 3: Conclusion',
                    sub: 'Audience Reaction / Closing',
                    required: false,
                  },
                ].map((slot) => {
                  const clip = clips[slot.idx];
                  return (
                    <div
                      key={slot.idx}
                      className={`rounded-xl border p-2.5 sm:p-3 flex flex-col justify-between transition-all ${
                        clip
                          ? 'bg-blue-50/40 dark:bg-blue-950/20 border-[#1a73e8]/70 shadow-xs'
                          : 'bg-[#f8fafd] dark:bg-[#1f1f1f] border-dashed border-[#dadce0] dark:border-[#444746] hover:border-[#1a73e8]'
                      }`}
                    >
                      <div>
                        {/* Slot Header */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className={`w-4.5 h-4.5 rounded-md font-bold text-[10px] flex items-center justify-center shrink-0 ${
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
                          <div className="space-y-1.5">
                            <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-[#dadce0] dark:border-[#3c4043] group">
                              <video
                                ref={slot.idx === 0 ? videoRef : undefined}
                                src={clip.previewUrl}
                                controls
                                className="w-full h-full object-contain"
                              />

                              {/* Live TV Watermark, Location Badge & Two-Tier Ticker Overlay on Slot 1 Player */}
                              {slot.idx === 0 && (
                                <>
                                  {/* Top-Right: Channel Watermark Logo */}
                                  <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none drop-shadow-md">
                                    {settings.watermark.logoDataUrl ? (
                                      <img
                                        src={settings.watermark.logoDataUrl}
                                        alt="Channel Logo"
                                        className="h-7 w-auto object-contain opacity-90"
                                      />
                                    ) : (
                                      <div className="bg-[#1e1b4b]/90 border border-amber-400 text-white px-2 py-0.5 rounded text-[10px] font-bold tracking-wider shadow-sm flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                        <span>{(account.channelTitle || 'NEWS 24X7').slice(0, 16)}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Top-Left: TV News Reporting Location Badge */}
                                  {newsLocation.trim() && (
                                    <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none flex items-center gap-1 bg-[#1e293b]/90 border border-amber-400/80 px-2 py-0.5 rounded text-[10px] text-white font-medium shadow-md">
                                      <MapPin className="w-3 h-3 text-red-400" />
                                      <span>{newsLocation.trim()}</span>
                                    </div>
                                  )}

                                  {/* Bottom Two-Tier TV News Tickers */}
                                  <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none flex flex-col shadow-lg overflow-hidden">
                                    {/* Tier 2: Headlines Strap (Upper Bar) */}
                                    <div className="h-5.5 bg-gradient-to-r from-[#061738] via-[#1e3a8a] to-[#071530] border-t border-amber-400/80 border-b border-[#38bdf8]/60 flex items-center px-2">
                                      <div className="bg-[#0f172a] px-1.5 py-0.2 rounded text-[8.5px] text-[#38bdf8] mr-2 shrink-0 border-r border-[#38bdf8]/80 uppercase tracking-wider flex items-center gap-1 font-bold">
                                        <span className="w-1 h-1 rounded-full bg-[#38bdf8] animate-ping" />
                                        <span>HEADLINES</span>
                                      </div>
                                      <div
                                        className="text-white truncate drop-shadow-md leading-normal text-[10px] font-medium"
                                        style={{
                                          fontFamily: tickerFont.fontFamily,
                                        }}
                                      >
                                        {thumbnailHeadline.trim() || activeTickerText.split('✦')[0]?.trim() || 'TODAY BREAKING HEADLINES'}
                                      </div>
                                    </div>

                                    {/* Tier 1: Continuous Scrolling Crawler (Lower Bar) */}
                                    <div className="h-6.5 bg-gradient-to-r from-[#7f1d1d] via-[#991b1b] to-[#7f1d1d] border-t border-amber-400 flex items-center px-2 overflow-hidden shadow-inner">
                                      <div
                                        className="bg-[#450a0a] px-1.5 py-0.5 rounded text-[9px] text-amber-300 mr-2 shrink-0 border-r border-amber-400/80 uppercase tracking-wider flex items-center gap-1 font-normal z-20"
                                        style={{
                                          fontFamily: tickerFont.isTelugu
                                            ? '"Ramabhadra", "Noto Sans Telugu", sans-serif'
                                            : '"Khand", "Cinzel", "Roboto", sans-serif',
                                          fontWeight: tickerFont.isTelugu ? 400 : 700,
                                        }}
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                        <span>BREAKING NEWS</span>
                                      </div>
                                      <div className="flex-1 overflow-hidden relative flex items-center">
                                        <div
                                          className="np-ticker-track text-white drop-shadow-md tracking-wide cursor-default whitespace-nowrap"
                                          style={{
                                            fontFamily: tickerFont.fontFamily,
                                            fontWeight: tickerFont.isTelugu ? 400 : tickerFont.fontWeight,
                                            fontSize: tickerFont.isTelugu ? '12px' : '10.5px',
                                          }}
                                        >
                                          <span className="pr-12 inline-block">{activeTickerText}</span>
                                          <span className="pr-12 inline-block">{activeTickerText}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
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
                          <label className="min-h-[84px] sm:min-h-[92px] rounded-lg border-2 border-dashed border-[#dadce0] dark:border-[#444746] flex flex-col items-center justify-center cursor-pointer hover:border-[#1a73e8] hover:bg-white dark:hover:bg-[#28292a] py-2 px-2 transition group text-center">
                            <div className="w-7 h-7 rounded-full bg-[#f1f3f4] dark:bg-[#28292a] text-[#5f6368] group-hover:text-[#1a73e8] group-hover:bg-[#e8f0fe] transition flex items-center justify-center mb-1">
                              <Upload className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-semibold text-xs text-[#202124] dark:text-[#f2f2f2]">
                              {slot.idx === 0 ? 'Upload Clip 1' : `+ Add Clip ${slot.idx + 1}`}
                            </span>
                            <span className="text-[9.5px] text-[#5f6368] dark:text-[#8e918f] mt-0.5 leading-tight">
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
                        <div className="pt-1.5 border-t border-[#dadce0]/70 dark:border-[#444746]/70 mt-1.5 flex items-center justify-between">
                          <label className="text-[10.5px] text-[#1a73e8] dark:text-[#8ab4f8] hover:underline cursor-pointer font-semibold">
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
                            className="text-[10.5px] text-red-600 dark:text-red-400 hover:underline cursor-pointer flex items-center gap-1 font-medium"
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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5 w-full min-w-0">
                <div className="flex items-start gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1a73e8] dark:text-[#8ab4f8] flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#202124] dark:text-[#f2f2f2] leading-tight">
                      2. News Story Manuscript
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[#5f6368] dark:text-[#8e918f] mt-0.5 font-normal">
                      (Source Text &bull; Story Dispatches &amp; Reporting Content)
                    </p>
                  </div>
                </div>

                {/* Quick Newsroom Story Loader + Language Selector */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {newsroomStories.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={(e) => handleLoadStoryManuscript(e.target.value)}
                      className="px-2.5 py-1 w-full sm:w-auto max-w-full sm:max-w-[240px] bg-blue-50 dark:bg-[#004a77] border border-[#d2e3fc] dark:border-[#1a73e8] rounded-full text-xs font-semibold text-[#1a73e8] dark:text-[#c2e7ff] cursor-pointer truncate"
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

              {/* Draft Story from Uploaded Footage Button */}
              {clips[0]?.file && (
                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                  <button
                    type="button"
                    onClick={() => handleExtractStoryFromVideo()}
                    disabled={isExtractingStory}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-full text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isExtractingStory ? 'animate-spin' : ''}`} />
                    <span>
                      {isExtractingStory
                        ? 'Analyzing video audio & footage...'
                        : '✨ Draft Story from Video'}
                    </span>
                  </button>
                  <span className="text-[11px] text-[#5f6368] dark:text-[#8e918f]">
                    Extracts dialogue, spoken facts, and narrative from video footage
                  </span>
                </div>
              )}

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

            {/* Input 3: Reporting Location (TV Watermark Badge) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1e1e1e] border border-[#dadce0] dark:border-[#3c4043] shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800 mt-0.5">
                    <MapLocationPointerIcon className="w-4 h-4" size={16} />
                  </span>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#202124] dark:text-[#f2f2f2] leading-tight">
                      3. News Reporting Location
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[#5f6368] dark:text-[#8e918f] mt-0.5 font-normal">
                      (TV Watermark Badge &bull; Live On-Screen Location)
                    </p>
                  </div>
                </div>
                <span className="text-xs text-[#5f6368] dark:text-[#8e918f]">
                  Appears directly under Channel Logo with circular map pointer badge
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-600 dark:text-rose-400">
                    <MapLocationPointerIcon className="w-4 h-4" size={18} />
                  </div>
                  <input
                    type="text"
                    value={newsLocation}
                    onChange={(e) => setNewsLocation(e.target.value)}
                    placeholder="Enter reporting location (e.g., New Delhi, Hyderabad, Amaravati, Mumbai, Tirupati)..."
                    className="w-full pl-10 pr-14 py-2.5 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-[#f8fafd] dark:bg-[#121212] text-sm text-[#202124] dark:text-[#f2f2f2] placeholder-[#70757a] focus:ring-2 focus:ring-[#1a73e8]/30 focus:border-[#1a73e8] focus:outline-none transition-all"
                  />
                  {newsLocation && (
                    <button
                      type="button"
                      onClick={() => setNewsLocation('')}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-semibold text-[#70757a] hover:text-[#202124] dark:hover:text-[#f2f2f2] cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Live Broadcast Badge Preview */}
                {newsLocation.trim() && (
                  <div className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">TV Badge:</span>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-r from-red-600 to-red-800 text-white text-xs font-bold shadow-xs">
                      <MapLocationPointerIcon className="w-3.5 h-3.5 text-white" size={14} />
                      <span>{newsLocation.trim()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Suggestion Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-medium text-[#5f6368] dark:text-[#8e918f] mr-1">Quick Select:</span>
                {['New Delhi', 'Hyderabad', 'Amaravati', 'Vijayawada', 'Visakhapatnam', 'Bengaluru', 'Mumbai', 'Tirupati'].map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setNewsLocation(loc)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                      newsLocation === loc
                        ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 font-bold shadow-xs'
                        : 'bg-[#f1f3f4] dark:bg-[#28292a] border-[#dadce0] dark:border-[#444746] text-[#3c4043] dark:text-[#c4c7c5] hover:bg-[#e8eaed] dark:hover:bg-[#333537]'
                    }`}
                  >
                    <MapLocationPointerIcon className={`w-3 h-3 ${newsLocation === loc ? 'text-rose-600 dark:text-rose-400' : 'text-[#70757a]'}`} size={12} />
                    <span>{loc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input 4: Video News Ticker */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1e1e1e] border border-[#dadce0] dark:border-[#3c4043] shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800 mt-0.5">
                    <Tv className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#202124] dark:text-[#f2f2f2] leading-tight">
                      4. Video News Ticker
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[#5f6368] dark:text-[#8e918f] mt-0.5 font-normal">
                      (Bottom Breaking News Scrolling Ticker &bull; Broadcast Overlay)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      tickerText.trim()
                        ? 'bg-blue-50 text-[#1a73e8] border-blue-200 dark:bg-blue-950/60 dark:text-[#8ab4f8] dark:border-blue-800'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    }`}
                  >
                    {tickerText.trim() ? 'Custom Headlines Active' : 'Auto: State-Level Headlines'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#5f6368] dark:text-[#8e918f] leading-relaxed">
                Broadcast ticker displayed continuously at the bottom of the video, matching TV news channels. You can enter custom headlines here; if left blank, live state headlines from your newsroom will scroll automatically.
              </p>

              <div className="space-y-2">
                <textarea
                  rows={2}
                  value={tickerText}
                  onChange={(e) => setTickerText(e.target.value)}
                  placeholder={defaultStateTicker ? `Leave blank for auto newsroom headlines: ${defaultStateTicker.slice(0, 110)}...` : 'Enter custom scrolling headlines for the bottom TV ticker...'}
                  className="w-full p-3.5 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-[#f8fafd] dark:bg-[#121212] text-sm text-[#202124] dark:text-[#f2f2f2] placeholder-[#70757a] focus:ring-2 focus:ring-[#1a73e8]/30 focus:border-[#1a73e8] focus:outline-none leading-relaxed transition-all"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-[#5f6368] dark:text-[#8e918f]">Quick Actions:</span>
                    <button
                      type="button"
                      onClick={() => setTickerText(defaultStateTicker)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#e8f0fe] text-[#1a73e8] hover:bg-[#d2e3fc] dark:bg-[#004a77] dark:text-[#c2e7ff] border border-blue-200 dark:border-blue-800 transition cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Load State Headlines</span>
                    </button>

                    {newsText.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          const firstLine = newsText
                            .trim()
                            .split('\n')[0]
                            .replace(/^([^\n:,\-–—]{2,25})\s*[:\-–—]/, '')
                            .trim();
                          if (firstLine) {
                            setTickerText(firstLine);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#f1f3f4] text-[#3c4043] hover:bg-[#e8eaed] dark:bg-[#28292a] dark:text-[#e3e3e3] border border-[#dadce0] dark:border-[#444746] transition cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Use Story Headline</span>
                      </button>
                    )}

                    {tickerText && (
                      <button
                        type="button"
                        onClick={() => setTickerText('')}
                        className="text-[11px] text-red-600 dark:text-red-400 hover:underline font-medium ml-1 cursor-pointer"
                      >
                        Reset to Auto Headlines
                      </button>
                    )}
                  </div>

                  <span className="text-[11px] text-[#5f6368] dark:text-[#8e918f]">
                    {tickerText.trim() ? `${tickerText.trim().length} characters (Custom)` : 'Automatic Default Selected'}
                  </span>
                </div>
              </div>

              {/* Live Animated 2-Tier TV Ticker Preview */}
              <div className="rounded-xl overflow-hidden border border-red-800/80 bg-red-950 shadow-md">
                <div className="px-3 py-1 bg-red-950/90 border-b border-red-900/60 flex items-center justify-between text-[10px] text-red-200/80 font-bold uppercase tracking-wider">
                  <span>
                    TV Broadcast 2-Tier Ticker Preview ({tickerFont.fontLabel} &bull; Upper Headlines + Lower Crawler)
                  </span>
                  <span className="text-amber-300 flex items-center gap-1 font-mono">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                    LIVE 2-TIER PREVIEW
                  </span>
                </div>

                {/* Tier 2: Headlines Strap (Upper Bar) */}
                <div className="h-9 sm:h-10 bg-gradient-to-r from-[#061738] via-[#1e3a8a] to-[#071530] flex items-stretch border-t-2 border-amber-400 border-b border-[#38bdf8]/60 relative overflow-hidden shadow-inner">
                  <div
                    className="z-10 px-3.5 bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#1e3a8a] border-r-2 border-[#38bdf8] text-white text-xs uppercase flex items-center gap-2 shrink-0 shadow-lg tracking-wide font-normal"
                    style={{
                      fontFamily: tickerFont.isTelugu
                        ? '"Ramabhadra", "Noto Sans Telugu", sans-serif'
                        : '"Khand", "Cinzel", "Roboto", sans-serif',
                      fontWeight: tickerFont.isTelugu ? 400 : 700,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-ping" />
                    <span>HEADLINES</span>
                  </div>
                  <div className="flex-1 overflow-hidden relative flex items-center px-4 bg-gradient-to-r from-blue-900/40 via-blue-800/20 to-blue-900/40">
                    <div
                      className="text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] tracking-wide cursor-default truncate font-medium"
                      style={{
                        fontFamily: tickerFont.fontFamily,
                        fontSize: tickerFont.isTelugu ? '17px' : '15px',
                      }}
                    >
                      {thumbnailHeadline.trim() || activeTickerText.split('✦')[0]?.trim() || 'TODAY BREAKING HEADLINES'}
                    </div>
                  </div>
                </div>

                {/* Tier 1: Continuous Scrolling Crawler (Lower Bar) */}
                <div className="h-11 sm:h-12 bg-gradient-to-r from-[#7f1d1d] via-[#991b1b] to-[#7f1d1d] flex items-stretch border-t border-amber-400 relative overflow-hidden shadow-inner">
                  {/* Left Dark Maroon / Red Badge with Gold Border */}
                  <div
                    className="z-10 px-3.5 bg-gradient-to-r from-[#450a0a] via-[#5c0e0e] to-[#7f1d1d] border-r-2 border-amber-400 text-white text-xs uppercase flex items-center gap-2 shrink-0 shadow-lg tracking-wide font-normal"
                    style={{
                      fontFamily: tickerFont.isTelugu
                        ? '"Ramabhadra", "Noto Sans Telugu", sans-serif'
                        : '"Khand", "Cinzel", "Roboto", sans-serif',
                      fontWeight: tickerFont.isTelugu ? 400 : 700,
                    }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-300 animate-pulse" />
                    <span>BREAKING NEWS</span>
                  </div>

                  {/* Scrolling Headlines: Increased size, strict 400 normal weight for Ramabhadra */}
                  <div className="flex-1 overflow-hidden relative flex items-center px-4 bg-gradient-to-r from-red-900/40 via-red-800/20 to-red-900/40">
                    <div
                      className="np-ticker-track text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] tracking-wide cursor-default"
                      style={{
                        fontFamily: tickerFont.fontFamily,
                        fontWeight: tickerFont.isTelugu ? 400 : tickerFont.fontWeight,
                        fontSize: tickerFont.isTelugu ? '20px' : '17px',
                        lineHeight: 1.25,
                      }}
                    >
                      <span className="pr-16 inline-block">
                        {activeTickerText}
                      </span>
                      <span className="pr-16 inline-block">
                        {activeTickerText}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Input 5: YouTube Thumbnail Studio (Custom Upload or Studio Frame) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1e1e1e] border border-[#dadce0] dark:border-[#3c4043] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#dadce0] dark:border-[#3c4043] pb-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0 mt-0.5">
                    <ImageIcon className="w-4 h-4 text-white" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-[#202124] dark:text-[#f2f2f2] leading-tight">
                        5. YouTube Thumbnail (16:9 HD)
                      </h3>
                      {isCustomThumbnailUploaded ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          <span>Custom Thumbnail Uploaded</span>
                        </span>
                      ) : (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Studio Footage Cover</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-[#5f6368] dark:text-[#8e918f] mt-0.5 font-normal">
                      Upload your custom 16:9 thumbnail, or render a high-definition frame cover from your video footage.
                    </p>
                  </div>
                </div>

                {(thumbnailPreviewUrl || publishedThumbnailUrl) && (
                  <button
                    type="button"
                    onClick={handleDownloadThumbnail}
                    className="px-3.5 py-2 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#28292a] text-[#202124] dark:text-[#f2f2f2] text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-[#333] flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Download Thumbnail (1280x720)</span>
                  </button>
                )}
              </div>

              {/* Hidden file input for custom thumbnail */}
              <input
                ref={thumbnailFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleCustomThumbnailUpload}
                className="hidden"
              />

              {/* 2-Column: Upload Control (Left) + 16:9 HD Preview (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start text-xs">
                {/* Left Column: Upload Custom Thumbnail Card */}
                <div className="lg:col-span-5 space-y-3">
                  {!isCustomThumbnailUploaded ? (
                    <div className="space-y-3">
                      <div
                        onClick={() => thumbnailFileInputRef.current?.click()}
                        className="border-2 border-dashed border-[#dadce0] dark:border-[#3c4043] hover:border-blue-500 dark:hover:border-blue-400 rounded-xl p-5 text-center cursor-pointer transition-colors bg-[#f8fafd] dark:bg-[#181818] hover:bg-blue-50/40 dark:hover:bg-blue-950/20 group flex flex-col items-center justify-center gap-2.5"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#202124] dark:text-[#f2f2f2]">
                            Upload Custom Thumbnail
                          </p>
                          <p className="text-[11px] text-[#5f6368] dark:text-[#8e918f] mt-0.5">
                            PNG, JPG or WEBP (16:9 recommended)
                          </p>
                        </div>
                        <button
                          type="button"
                          className="mt-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                        >
                          Choose Image
                        </button>
                      </div>

                      <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] space-y-2">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-[#5f6368] dark:text-[#8e918f] leading-relaxed">
                            <strong className="text-[#202124] dark:text-[#f2f2f2]">Automatic Thumbnail: </strong>
                            If you do not upload a custom image, the system automatically creates a 16:9 thumbnail from your video footage.
                          </p>
                        </div>

                        {activeClips.some((c) => Boolean(c)) && (
                          <button
                            type="button"
                            onClick={handleGenerateAIThumbnail}
                            disabled={isGeneratingThumbnail}
                            className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#28292a] hover:bg-neutral-100 dark:hover:bg-[#333] text-xs font-medium text-[#202124] dark:text-[#f2f2f2] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {isGeneratingThumbnail ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                <span>Generating Thumbnail...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                <span>Regenerate Footage Cover</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 space-y-3">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-xs font-bold">Custom Thumbnail Attached</span>
                      </div>
                      <p className="text-[11px] text-[#5f6368] dark:text-[#8e918f] leading-relaxed">
                        <span className="font-semibold text-[#202124] dark:text-[#f2f2f2] truncate block">
                          {customThumbnailFileName || 'Custom Image Uploaded'}
                        </span>
                        Custom cover selected. Your uploaded image will be published to YouTube.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => thumbnailFileInputRef.current?.click()}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#28292a] text-xs font-semibold text-[#202124] dark:text-[#f2f2f2] hover:bg-neutral-100 dark:hover:bg-[#333] flex items-center justify-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Replace</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveCustomThumbnail}
                          className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Live 16:9 Thumbnail Graphic Preview Card */}
                <div className="lg:col-span-7 space-y-2.5">
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 shadow-md">
                    <div className="flex items-center justify-between px-2 py-1.5 text-xs text-neutral-300 border-b border-neutral-800 mb-2">
                      <span className="font-bold flex items-center gap-1.5 text-neutral-200">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                        <span>16:9 HD Thumbnail Live Preview (1280x720)</span>
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono ${
                        isCustomThumbnailUploaded
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : thumbnailPreviewUrl
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      }`}>
                        {isCustomThumbnailUploaded ? 'Custom Upload' : (thumbnailPreviewUrl ? 'Footage Cover' : 'No Thumbnail')}
                      </span>
                    </div>

                    {/* 16:9 Aspect Ratio Frame */}
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center border border-neutral-800 shadow-inner group">
                      {isGeneratingThumbnail ? (
                        <div className="flex flex-col items-center justify-center text-white space-y-2 p-6 text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                          <span className="text-xs font-semibold">Creating 16:9 thumbnail from footage...</span>
                        </div>
                      ) : (thumbnailPreviewUrl || publishedThumbnailUrl) ? (
                        <img
                          src={thumbnailPreviewUrl || publishedThumbnailUrl}
                          alt="Video Thumbnail Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-neutral-500 space-y-2 p-6 text-center">
                          <ImageIcon className="w-10 h-10 stroke-1" />
                          <span className="text-xs font-medium">
                            Upload a custom image or add video footage to generate thumbnail.
                          </span>
                        </div>
                      )}

                      {/* YouTube Desktop Preview Emulation (Duration Badge) */}
                      <div className="absolute bottom-2 right-2 bg-black/85 text-white text-[10px] font-mono px-1.5 py-0.5 rounded font-bold pointer-events-none">
                        {formatDuration(totalFootageDuration || 65)}
                      </div>
                    </div>

                    {/* Status bar */}
                    <div className="flex items-center justify-between pt-2 px-1 text-[11px] text-neutral-400">
                      <span>
                        {isCustomThumbnailUploaded
                          ? 'Source: Custom Image Upload'
                          : thumbnailPreviewUrl
                          ? 'Source: Broadcast Footage Cover'
                          : 'Status: Waiting for input'}
                      </span>
                      {(thumbnailPreviewUrl || publishedThumbnailUrl) && (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Ready for YouTube</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
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

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1 text-[9px] sm:text-[10px] text-center text-neutral-400 font-medium">
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
                className="w-full inline-flex flex-row items-center justify-center gap-2 sm:gap-3 bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white font-bold text-sm sm:text-base py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl shadow-sm hover:shadow-md transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none"
              >
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/20 text-white inline-flex items-center justify-center shrink-0">
                  <Rocket className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isPublishing ? 'animate-bounce' : ''}`} />
                </span>
                <span className="font-bold text-center break-words">
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
