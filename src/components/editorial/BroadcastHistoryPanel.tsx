/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Broadcast History & Published Archive Panel
 * Displays all Direct Public YouTube broadcasts published from the studio or queue,
 * with search, language/status filters, live YouTube SD/HD verification, and quick links.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Youtube,
  Search,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Film,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Globe,
  MapPin,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { YouTubeService } from '../../services/youtubeService';
import {
  YouTubeBroadcastRecord,
  SUPPORTED_INDIAN_LANGUAGES,
} from '../../types/youtube';

interface BroadcastHistoryPanelProps {
  tenantId?: string;
  onCreateNew: () => void;
  refreshSignal?: number;
}

export const BroadcastHistoryPanel: React.FC<BroadcastHistoryPanelProps> = ({
  tenantId,
  onCreateNew,
  refreshSignal = 0,
}) => {
  const [records, setRecords] = useState<YouTubeBroadcastRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [liveStatusMap, setLiveStatusMap] = useState<
    Record<string, { status: string; label: string }>
  >({});

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await YouTubeService.getAllBroadcastRecords(tenantId);
      setRecords(list);
    } catch (err) {
      console.error('[BroadcastHistoryPanel] Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshSignal]);

  const handleCopyUrl = async (videoId: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(videoId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard blocked in restricted iframe
    }
  };

  const handleCheckLiveStatus = async (record: YouTubeBroadcastRecord) => {
    if (!record.videoId) return;
    setCheckingId(record.videoId);
    try {
      const status = await YouTubeService.getVideoProcessingStatus(record.videoId);
      let label = 'Processing';
      let normalizedStatus = status.processingStatus || 'processing';
      if (status.isSdReady || status.isProcessed) {
        label = 'HD / SD Ready';
        normalizedStatus = 'succeeded';
      } else if (status.processingStatus === 'failed') {
        label = 'Check YouTube Studio';
      } else if (status.processingStatus === 'unknown') {
        label = 'Reconnect Channel to Verify';
      }
      setLiveStatusMap((prev) => ({
        ...prev,
        [record.videoId]: { status: normalizedStatus, label },
      }));
    } catch {
      setLiveStatusMap((prev) => ({
        ...prev,
        [record.videoId]: { status: 'unknown', label: 'Status Unavailable' },
      }));
    } finally {
      setCheckingId(null);
    }
  };

  const filteredRecords = records.filter((rec) => {
    if (languageFilter !== 'all' && rec.language !== languageFilter) return false;
    if (statusFilter !== 'all' && (rec.status || 'published') !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (rec.title || '').toLowerCase().includes(q);
      const matchChannel = (rec.channelTitle || '').toLowerCase().includes(q);
      const matchLocation = (rec.newsLocation || rec.location || '').toLowerCase().includes(q);
      const matchId = (rec.videoId || '').toLowerCase().includes(q);
      if (!matchTitle && !matchChannel && !matchLocation && !matchId) return false;
    }
    return true;
  });

  const getLanguageLabel = (code?: string) => {
    if (!code) return 'Universal';
    return SUPPORTED_INDIAN_LANGUAGES.find((l) => l.code === code)?.name || code.toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <Card className="p-4 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by headline, channel, location, or YouTube ID..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/40"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              aria-label="Filter by language"
              className="px-3 py-2 text-xs font-medium bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg"
            >
              <option value="all">All Languages</option>
              {SUPPORTED_INDIAN_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="px-3 py-2 text-xs font-medium bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
            </select>

            <Button
              size="sm"
              variant="outline"
              onClick={loadHistory}
              disabled={isLoading}
              className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Loading Skeleton */}
      {isLoading ? (
        <Card className="p-6 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
          {[1, 2, 3].map((row) => (
            <div
              key={row}
              className="h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800/70 animate-pulse"
            />
          ))}
        </Card>
      ) : filteredRecords.length === 0 ? (
        /* Empty State */
        <Card className="p-12 text-center border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center mx-auto">
            <Film className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            {records.length === 0 ? 'No Broadcasts Published Yet' : 'No Matching Broadcasts Found'}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
            {records.length === 0
              ? 'Every video published directly or dispatched through the Broadcast Queue is permanently logged here with live YouTube verification links.'
              : 'Try clearing your search query or switching the language and status filters.'}
          </p>
          {records.length === 0 && (
            <div className="pt-2">
              <Button
                onClick={onCreateNew}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 py-2.5 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Broadcast</span>
              </Button>
            </div>
          )}
        </Card>
      ) : (
        /* Populated Broadcast History Table */
        <Card className="overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  <th className="py-3 px-4">Broadcast</th>
                  <th className="py-3 px-4">Channel &amp; Language</th>
                  <th className="py-3 px-4">Visibility &amp; Status</th>
                  <th className="py-3 px-4">Published</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
                {filteredRecords.map((rec) => {
                  const liveStatus = liveStatusMap[rec.videoId];
                  const isCopied = copiedId === rec.videoId;
                  const isChecking = checkingId === rec.videoId;
                  const publishedDate = rec.publishedAt
                    ? new Date(rec.publishedAt)
                    : null;
                  const watchUrl = rec.youtubeUrl || `https://www.youtube.com/watch?v=${rec.videoId}`;
                  const locationLabel = rec.newsLocation || rec.location;

                  return (
                    <tr
                      key={rec.videoId}
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="flex items-start gap-3">
                          {rec.thumbnailUrl ? (
                            <img
                              src={rec.thumbnailUrl}
                              alt={rec.title}
                              className="w-24 aspect-video rounded-lg object-cover border border-neutral-200 dark:border-neutral-700 shrink-0 bg-neutral-950"
                            />
                          ) : (
                            <div className="w-24 aspect-video rounded-lg bg-neutral-900 text-neutral-500 flex items-center justify-center shrink-0 border border-neutral-800">
                              <Youtube className="w-5 h-5 text-red-500" />
                            </div>
                          )}
                          <div className="min-w-0 space-y-1">
                            <p className="font-bold text-neutral-900 dark:text-white leading-snug line-clamp-2 text-xs sm:text-sm">
                              {rec.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                              <span className="font-mono">{rec.videoId}</span>
                              {locationLabel && (
                                <span className="inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-300 font-medium">
                                  <MapPin className="w-3 h-3 text-red-500" />
                                  {locationLabel}
                                </span>
                              )}
                              {rec.voiceActorName && (
                                <span>Anchor: {rec.voiceActorName}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                          {rec.channelTitle || 'Connected Channel'}
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1 mt-0.5">
                          <Globe className="w-3 h-3" />
                          <span>{getLanguageLabel(rec.language)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Public</span>
                          </span>

                          {liveStatus ? (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                liveStatus.status === 'succeeded'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : liveStatus.status === 'failed'
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {liveStatus.status === 'succeeded' ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : liveStatus.status === 'failed' ? (
                                <AlertCircle className="w-3 h-3" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                              <span>{liveStatus.label}</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleCheckLiveStatus(rec)}
                              disabled={isChecking}
                              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw
                                className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`}
                              />
                              <span>{isChecking ? 'Checking...' : 'Check SD/HD'}</span>
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-neutral-600 dark:text-neutral-300 tabular-nums">
                        {publishedDate ? (
                          <div>
                            <div className="font-medium">
                              {publishedDate.toLocaleDateString()}
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              {publishedDate.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyUrl(rec.videoId, watchUrl)}
                            className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-200 inline-flex items-center gap-1 cursor-pointer transition"
                            title="Copy YouTube Link"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          <a
                            href={watchUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center gap-1 transition"
                          >
                            <span>Watch</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
