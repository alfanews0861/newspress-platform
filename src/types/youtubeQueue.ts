/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress YouTube News Studio — Task Queue & Priority Management Types
 */

import { SupportedIndianLanguage } from './youtube';

export type YouTubeVideoPriority =
  | 'P1_FLASH_BREAKING'     // Priority 1: Flash / Breaking News ("తాజా వార్తలు") - Top Priority, jumps to front
  | 'P2_PRIMETIME_BULLETIN'  // Priority 2: Prime-Time Broadcast Packages ("ప్రైమ్‌టైమ్ బులిటెన్") - Medium / High
  | 'P3_ROUTINE_FIELD_REPORT';// Priority 3: Routine Field Reports / Freelance Submissions - Standard FIFO

export const PRIORITY_CONFIG: Record<
  YouTubeVideoPriority,
  {
    weight: number;
    code: string;
    labelEnglish: string;
    labelTelugu: string;
    badgeColor: string;
    description: string;
  }
> = {
  P1_FLASH_BREAKING: {
    weight: 1,
    code: 'P1',
    labelEnglish: 'Flash Breaking News',
    labelTelugu: 'తాజా వార్తలు (అత్యవసరం)',
    badgeColor: 'bg-red-500/20 text-red-400 border-red-500/40',
    description: 'Bypasses standard queue; prioritized for immediate broadcast transmission.',
  },
  P2_PRIMETIME_BULLETIN: {
    weight: 2,
    code: 'P2',
    labelEnglish: 'Prime-Time Bulletin',
    labelTelugu: 'ప్రైమ్‌టైమ్ బులిటెన్',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    description: 'High-priority desk package for scheduled prime-time programming.',
  },
  P3_ROUTINE_FIELD_REPORT: {
    weight: 3,
    code: 'P3',
    labelEnglish: 'Routine Field Report',
    labelTelugu: 'సాధారణ ఫీల్డ్ రిపోర్ట్',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    description: 'Standard FIFO queue for daily investigative and ground field reports.',
  },
};

export type YouTubeJobStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'CANCELLED';

export type YouTubeJobStage =
  | 'queued'
  | 'editorial_review'
  | 'script_writing'
  | 'voice_recording'
  | 'graphics_thumbnail'
  | 'video_mastering'
  | 'youtube_upload'
  | 'sd_verification'
  | 'published'
  | 'failed';

export interface YouTubeJobPayload {
  newsText: string;
  language: SupportedIndianLanguage;
  clipDurationMode: 'bulletin' | '60s' | '120s' | '300s' | 'full';
  newsLocation?: string;
  tickerText?: string;
  selectedVoiceActorId?: string;
  speechRate?: number;
  emotionalStyle?: string;
  activeClipsMeta: { name: string; size: number }[];
  activeClipsFiles?: File[];
  adBannerConfig?: any;
  channelBannerConfig?: any;
  todayHeadlines?: string[];
  thumbnailTheme?: 'fire_red' | 'electric_yellow' | 'shock_blue' | 'crimson_dark';
}

export interface YouTubeVideoJob {
  jobId: string;
  tenantId: string;
  userId: string;
  userName: string;
  title: string;
  newsLocation: string;
  language: SupportedIndianLanguage;
  priority: YouTubeVideoPriority;
  status: YouTubeJobStatus;
  stage: YouTubeJobStage;
  stageMessage: string;
  progress: number; // 0 to 100
  queuePosition?: number; // 1-based index in queue
  estimatedWaitSec?: number;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  videoId?: string;
  youtubeUrl?: string;
  thumbnailUrl?: string;
  durationSec?: number;
  payload: YouTubeJobPayload;
}

export interface QueueSystemStats {
  totalJobs: number;
  queuedCount: number;
  processingCount: number;
  publishedCount: number;
  failedCount: number;
  activeWorkers: number;
  maxConcurrentWorkers: number;
}
