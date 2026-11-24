/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NewsPress Wire Feed Ingestion & Syndication Domain Models
 * Configures external RSS/Atom feeds and news website URLs polled by the
 * Google Compute Engine e2-micro editorial wire worker.
 */

export type WireFeedType = 'auto' | 'rss' | 'website_section' | 'article';

export type WireLanguageCode =
  | 'en'
  | 'hi'
  | 'te'
  | 'ta'
  | 'kn'
  | 'ml'
  | 'mr'
  | 'bn'
  | 'gu'
  | 'or'
  | 'pa';

export interface WireLanguageOption {
  code: WireLanguageCode;
  label: string;
  regionHint: string;
}

export const WIRE_LANGUAGES: WireLanguageOption[] = [
  { code: 'en', label: 'English', regionHint: 'Pan-India' },
  { code: 'hi', label: 'Hindi', regionHint: 'North & Central India' },
  { code: 'te', label: 'Telugu', regionHint: 'Andhra Pradesh & Telangana' },
  { code: 'ta', label: 'Tamil', regionHint: 'Tamil Nadu & Puducherry' },
  { code: 'kn', label: 'Kannada', regionHint: 'Karnataka' },
  { code: 'ml', label: 'Malayalam', regionHint: 'Kerala' },
  { code: 'mr', label: 'Marathi', regionHint: 'Maharashtra' },
  { code: 'bn', label: 'Bengali', regionHint: 'West Bengal & Northeast' },
  { code: 'gu', label: 'Gujarati', regionHint: 'Gujarat' },
  { code: 'or', label: 'Odia', regionHint: 'Odisha' },
  { code: 'pa', label: 'Punjabi', regionHint: 'Punjab' },
];

export function getWireLanguageLabel(code?: string): string {
  if (!code) return 'English';
  const normalized = code.toLowerCase();
  const match = WIRE_LANGUAGES.find((lang) => lang.code === normalized);
  return match ? match.label : code.toUpperCase();
}

export const WIRE_CATEGORIES: string[] = [
  'Politics',
  'Crime & Justice',
  'Health & Science',
  'Sports',
  'Business & Economy',
  'Agriculture & Rural',
  'Infrastructure & Transit',
  'Culture & Entertainment',
  'Technology & Science',
];

export interface WireFeedSource {
  sourceId: string;
  name: string;
  url: string;
  feedType: WireFeedType;
  language: WireLanguageCode;
  category: string;
  pollIntervalMinutes: number;
  maxItemsPerRun: number;
  enabled: boolean;
  regionTag?: string;
  lastPolledAt?: string;
  lastStatus?: 'idle' | 'success' | 'partial' | 'failed';
  lastError?: string;
  totalPublishedCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WireScraperRun {
  runId: string;
  workerId: string;
  sourceId: string;
  sourceName: string;
  language: WireLanguageCode;
  category: string;
  status: 'success' | 'partial' | 'failed';
  fetchedCount: number;
  skippedDuplicates: number;
  publishedCount: number;
  errorMessage?: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface WireWorkerStatus {
  workerId: string;
  hostname: string;
  machineType: string;
  region: string;
  status: 'online' | 'idle' | 'offline';
  lastHeartbeatAt: string;
  activeSourcesCount: number;
  publishedTodayCount: number;
  memoryUsageMb: number;
  version: string;
}

export interface CreateWireFeedSourceInput {
  name: string;
  url: string;
  feedType: WireFeedType;
  language: WireLanguageCode;
  category: string;
  pollIntervalMinutes: number;
  maxItemsPerRun: number;
  enabled: boolean;
  regionTag?: string;
  createdBy: string;
}
