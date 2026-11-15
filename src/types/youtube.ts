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
  logoUrl?: string;
  logoDataUrl?: string; // base64 / blob
  placement: WatermarkPlacement;
  scalePercent: number; // 10% to 30% of video width
  opacityPercent: number; // 20% to 100%
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

export interface YouTubeChannelBrandingSettings {
  introVideoUrl?: string;
  introVideoFileName?: string;
  outroVideoUrl?: string;
  outroVideoFileName?: string;
  watermark: WatermarkSettings;
  defaultLanguage: SupportedIndianLanguage;
  voiceGender: 'male' | 'female';
  speechRate: number; // 0.8 to 1.3
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
