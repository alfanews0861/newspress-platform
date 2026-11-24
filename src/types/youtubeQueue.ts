/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NewsPress YouTube News Studio — Task Queue & Priority Management Types
 */

import { SupportedIndianLanguage } from './youtube';

export type YouTubeVideoPriority =
  | 'P1_FLASH_BREAKING'      // Priority 1: Flash / Breaking News - jumps to front
  | 'P2_PRIMETIME_BULLETIN'  // Priority 2: Prime-Time Broadcast Packages - Medium / High
  | 'P3_ROUTINE_FIELD_REPORT'; // Priority 3: Routine Field Reports - Standard FIFO

export const PRIORITY_CONFIG: Record<
  YouTubeVideoPriority,
  {
    weight: number;
    code: string;
    labelEnglish: string;
    badgeColor: string;
    description: string;
  }
> = {
  P1_FLASH_BREAKING: {
    weight: 1,
    code: 'P1',
    labelEnglish: 'Flash Breaking News',
    badgeColor: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40',
    description: 'Bypasses standard queue; prioritized for immediate broadcast transmission.',
  },
  P2_PRIMETIME_BULLETIN: {
    weight: 2,
    code: 'P2',
    labelEnglish: 'Prime-Time Bulletin',
    badgeColor: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40',
    description: 'High-priority desk package for scheduled prime-time programming.',
  },
  P3_ROUTINE_FIELD_REPORT: {
    weight: 3,
    code: 'P3',
    labelEnglish: 'Routine Field Report',
    badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
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

export interface ReviewedBroadcastOverrides {
  headlineTitle: string;
  scriptText: string;
  youtubeDescription: string;
  tags: string[];
  thumbnailHeadline?: string;
  thumbnailBadge?: string;
  thumbnailCuriosityLine?: string;
  thumbnailDataUrl?: string;
}

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
  reviewedPackage?: ReviewedBroadcastOverrides;
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
  needsFootageReattach?: boolean;
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
