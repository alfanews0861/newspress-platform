/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress YouTube News Channel & Video Production Studio Types
 */

export type SupportedIndianLanguage =
  | 'te' // Telugu
  | 'hi' // Hindi
  | 'ta' // Tamil
  | 'kn' // Kannada
  | 'ml' // Malayalam
  | 'bn' // Bengali
  | 'mr' // Marathi
  | 'gu' // Gujarati
  | 'pa' // Punjabi
  | 'or' // Odia
  | 'en'; // English (Indian Accent)

export interface LanguageOption {
  code: SupportedIndianLanguage;
  name: string;
  nativeName: string;
}

export const SUPPORTED_INDIAN_LANGUAGES: LanguageOption[] = [
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'en', name: 'English (India)', nativeName: 'English' },
];

export type WatermarkPlacement = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface WatermarkSettings {
  // Channel Logo Settings (Static & Animated Broadcast Logo Bug)
  logoUrl?: string;
  logoDataUrl?: string; // base64 / blob
  isAnimatedLogo?: boolean;
  logoFormat?: 'video' | 'gif' | 'image';
  logoAnimationType?: '3d_spin' | 'shimmer_shine' | 'pulse_glow' | 'none';
  logoVideoUrl?: string;
  logoVideoBlob?: Blob;
  logoFileName?: string;
  logoPlacement?: WatermarkPlacement; // Default: 'top-right'
  logoScalePercent?: number; // 10% to 35% of video width
  logoOpacityPercent?: number; // 10% to 100%
  logoXPercent?: number; // 0% (Left) to 100% (Right), Default: 88%
  logoYPercent?: number; // 0% (Top) to 100% (Bottom), Default: 8%

  // Watermark Text Settings (White Color, Custom / Middle / Left Placement)
  text?: string; // White text watermark (Channel name or custom text)
  textColor?: string; // Default: #ffffff (White)
  placement?: WatermarkPlacement; // Default: 'top-left' (Left side)
  scalePercent: number; // 10% to 35% of video width
  opacityPercent: number; // 10% to 100%
  xPercent?: number; // 0% (Left) to 100% (Right), Default: 50% (Center/Middle)
  yPercent?: number; // 0% (Top) to 100% (Bottom), Default: 50% (Center/Middle)
  offsetX: number; // padding px
  offsetY: number; // padding px
}

export interface NewsVideoClipItem {
  id: string;
  file: File;
  previewUrl: string;
  durationSec: number;
  sizeBytes: number;
  name: string;
}

export interface VoiceActorProfile {
  id: string;
  name: string;
  teluguName: string;
  englishName: string;
  googleOriginalVoice: string; // 'Fenrir' | 'Charon' | 'Kore' | 'Aoede' | 'Puck'
  gender: 'male' | 'female';
  roleTitle: string;
  emotionalTone: string;
  styleInstruction: string;
  defaultPitch: number;
  badge: string;
}

export type EmotionalNewsStyle =
  | 'emotional_breaking'
  | 'dramatic_primetime'
  | 'urgent_investigative'
  | 'speed_bulletin';

export const VOICE_ACTORS: VoiceActorProfile[] = [
  {
    id: 'ravi_shankar',
    name: 'Ravi Shankar',
    teluguName: 'Ravi Shankar',
    englishName: 'Ravi Shankar',
    googleOriginalVoice: 'Fenrir',
    gender: 'male',
    roleTitle: 'Senior Prime-Time News Anchor',
    emotionalTone: 'Authoritative & Deep Emotional Delivery',
    styleInstruction: 'High-energy, authoritative, deeply emotional Indian prime-time news anchor delivery with powerful vocal presence, dramatic emphasis, and intense breaking news cadence.',
    defaultPitch: 1.0,
    badge: 'Recommended',
  },
  {
    id: 'krishna_murthy',
    name: 'Krishna Murthy',
    teluguName: 'Krishna Murthy',
    englishName: 'Krishna Murthy',
    googleOriginalVoice: 'Charon',
    gender: 'male',
    roleTitle: 'Breaking News Announcer',
    emotionalTone: 'Urgent & Dramatic Breaking Cadence',
    styleInstruction: 'Urgent, high-voltage, fast-paced breaking news presentation with dramatic emotional intensity, suspenseful pauses, and passionate cadence.',
    defaultPitch: 0.96,
    badge: 'Breaking News',
  },
  {
    id: 'sunitha',
    name: 'Sunitha',
    teluguName: 'Sunitha',
    englishName: 'Sunitha',
    googleOriginalVoice: 'Kore',
    gender: 'female',
    roleTitle: 'Chief News Presenter',
    emotionalTone: 'Heartfelt & Clear Delivery',
    styleInstruction: 'Heartfelt, expressive, deeply empathetic female TV news presenter with clear diction, compelling emotional resonance, and dignified gravitas.',
    defaultPitch: 1.05,
    badge: 'Expressive',
  },
  {
    id: 'priyanka',
    name: 'Priyanka',
    teluguName: 'Priyanka',
    englishName: 'Priyanka',
    googleOriginalVoice: 'Aoede',
    gender: 'female',
    roleTitle: 'Dynamic Speed News & Live Anchor',
    emotionalTone: 'Dynamic & Vibrant Energy',
    styleInstruction: 'Fast-paced, vibrant, energetic delivery with youthful excitement and rhythmic cadence, ideal for rapid news bulletins and viral reports.',
    defaultPitch: 1.1,
    badge: 'Energetic Speed',
  },
  {
    id: 'rajesh',
    name: 'Rajesh',
    teluguName: 'Rajesh',
    englishName: 'Rajesh',
    googleOriginalVoice: 'Puck',
    gender: 'male',
    roleTitle: 'Investigative & Ground Field Reporter',
    emotionalTone: 'Investigative & Ground Tension',
    styleInstruction: 'Gritty, suspenseful, investigative field-reporter tone with conversational authenticity, emotional tension, and urgent realism.',
    defaultPitch: 0.98,
    badge: 'Investigative Report',
  },
];

export interface YouTubeChannelBrandingSettings {
  introVideoUrl?: string;
  introVideoFileName?: string;
  outroVideoUrl?: string;
  outroVideoFileName?: string;
  watermark: WatermarkSettings;
  defaultLanguage: SupportedIndianLanguage;
  voiceGender: 'male' | 'female';
  voiceActorId?: string; // 'ravi_shankar' | 'krishna_murthy' | 'sunitha' | 'priyanka' | 'rajesh'
  emotionalStyle?: EmotionalNewsStyle; // 'emotional_breaking' | 'dramatic_primetime' | 'urgent_investigative' | 'speed_bulletin'
  speechRate: number; // default: 1.3 (0.8 to 1.6)
  defaultCategory: string; // '25' = News & Politics
  defaultTags: string[];
  descriptionTemplate: string;
  privacyStatus: 'public' | 'unlisted' | 'private';
}

export interface YouTubeConnectedAccount {
  isConnected: boolean;
  channelId?: string;
  channelTitle?: string;
  channelCustomUrl?: string;
  channelAvatar?: string;
  subscriberCount?: number;
  videoCount?: number;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  clientId?: string;
  clientSecret?: string;
  connectedAt?: string;
  googleEmail?: string;
}

export interface BroadcastScriptResult {
  headlineTitle: string;
  scriptText: string;
  wordCount: number;
  youtubeDescription: string;
  tags: string[];
  thumbnailHeadline: string;
  thumbnailBadge: string;
  thumbnailCuriosityLine: string;
  thumbnailColorTheme?: 'fire_red' | 'electric_yellow' | 'shock_blue' | 'crimson_dark';
  language: SupportedIndianLanguage;
  bulletPoints: string[];
}

export type VideoAssemblyStep =
  | 'idle'
  | 'editor_analyzing'
  | 'generating_voice'
  | 'generating_thumbnail'
  | 'rendering_ffmpeg'
  | 'ready_preview'
  | 'uploading_youtube'
  | 'published'
  | 'failed';

export interface VideoProcessingProgress {
  step: VideoAssemblyStep;
  progressPercent: number; // 0 - 100
  statusMessage: string;
  error?: string;
}

export interface YouTubePublishResult {
  videoId: string;
  youtubeUrl: string;
  embedUrl: string;
  title: string;
  publishedAt: string;
  privacyStatus: string;
  thumbnailUploaded: boolean;
}

export interface YouTubeBroadcastRecord {
  videoId: string;
  youtubeUrl: string;
  embedUrl?: string;
  title: string;
  publishedAt: string;
  privacyStatus?: string;
  thumbnailUrl?: string;
  newsLocation?: string;
  location?: string;
  durationMode?: string;
  language?: string;
  voiceActorId?: string;
  voiceActorName?: string;
  channelTitle?: string;
  status?: 'processing' | 'ready' | 'published';
  isSdReady?: boolean;
}

export * from './youtubeQueue';

