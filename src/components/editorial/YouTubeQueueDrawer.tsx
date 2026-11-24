/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NewsPress YouTube News Studio — Live Broadcast Queue & Priority Manager Drawer
 * Real-time monitoring of asynchronous video mastering, queue positions, ETAs,
 * worker pause/resume controls, priority promotions, and footage re-attachment recovery.
 */

import React, { useState, useEffect } from 'react';
import {
  Layers,
  X,
  Play,
  Pause,
  RotateCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Flame,
  Clock,
  FileText,
  Zap,
  ShieldCheck,
  Upload,
  MapPin,
} from 'lucide-react';
import {
  YouTubeVideoJob,
  QueueSystemStats,
  PRIORITY_CONFIG,
} from '../../types/youtubeQueue';
import { YouTubeQueueService } from '../../services/youtubeQueueService';
import { Button } from '../ui/Button';

interface YouTubeQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId?: string;
}

export const YouTubeQueueDrawer: React.FC<YouTubeQueueDrawerProps> = ({
  isOpen,
  onClose,
  tenantId,
}) => {
  const [jobs, setJobs] = useState<YouTubeVideoJob[]>([]);
  const [stats, setStats] = useState<QueueSystemStats>(() =>
    YouTubeQueueService.getQueueStats(tenantId)
  );
  const [isPaused, setIsPaused] = useState<boolean>(() => YouTubeQueueService.isWorkerPaused());
  const [filterTab, setFilterTab] = useState<'all' | 'queued' | 'processing' | 'published' | 'failed'>('all');
  const [reattachingJobId, setReattachingJobId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = YouTubeQueueService.subscribe((updatedJobs) => {
      const filtered = tenantId
        ? updatedJobs.filter((j) => j.tenantId === tenantId)
        : updatedJobs;
      setJobs(filtered);
      setStats(YouTubeQueueService.getQueueStats(tenantId));
      setIsPaused(YouTubeQueueService.isWorkerPaused());
    });

    return () => {
      unsubscribe();
    };
  }, [tenantId]);

  if (!isOpen) return null;

  const handleToggleWorker = () => {
    if (isPaused) {
      YouTubeQueueService.resumeWorker();
      setIsPaused(false);
    } else {
      YouTubeQueueService.pauseWorker();
      setIsPaused(true);
    }
  };

  const handlePromoteToP1 = async (jobId: string) => {
    await YouTubeQueueService.setJobPriority(jobId, 'P1_FLASH_BREAKING');
  };

  const handleCancel = async (jobId: string) => {
    await YouTubeQueueService.cancelJob(jobId, 'Cancelled by editor.');
  };

  const handleRetry = async (jobId: string) => {
    await YouTubeQueueService.retryJob(jobId);
  };

  const handleReattachFootage = async (
    jobId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;

    setReattachingJobId(jobId);
    try {
      await YouTubeQueueService.reattachFootageAndRetry(jobId, files);
    } finally {
      setReattachingJobId(null);
    }
  };

  const handleClearCompleted = async () => {
    await YouTubeQueueService.clearCompleted();
  };

  const displayedJobs = jobs.filter((job) => {
    if (filterTab === 'all') return true;
    if (filterTab === 'queued') return job.status === 'QUEUED';
    if (filterTab === 'processing') return job.status === 'PROCESSING';
    if (filterTab === 'published') return job.status === 'PUBLISHED';
    if (filterTab === 'failed') return job.status === 'FAILED' || job.status === 'CANCELLED';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-[#16171a] h-full shadow-2xl flex flex-col border-l border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 font-sans">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-[#111214]">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Broadcast Queue Monitor
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                    isPaused
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  }`}
                >
                  {isPaused ? 'Paused' : 'Running'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Priority-ordered background mastering and Direct Public YouTube dispatch.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleWorker}
              className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Resume Queue</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pause Queue</span>
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Broadcast Queue Monitor"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Operational Concurrency & Statistics Banner */}
        <div className="p-4 bg-neutral-100/70 dark:bg-[#1c1d21] border-b border-neutral-200 dark:border-neutral-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 rounded-xl bg-white dark:bg-[#16171a] border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-semibold tracking-wider block">
              Active Workers
            </span>
            <div className="mt-1 font-bold text-sm text-blue-600 dark:text-blue-400 tabular-nums">
              {stats.activeWorkers} / {stats.maxConcurrentWorkers} Active
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-[#16171a] border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-semibold tracking-wider block">
              Waiting in Queue
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-sm text-amber-600 dark:text-amber-400 tabular-nums">
              <Clock className="w-3.5 h-3.5" />
              <span>{stats.queuedCount} Jobs</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-[#16171a] border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-semibold tracking-wider block">
              Published Public
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{stats.publishedCount} Videos</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-[#16171a] border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-semibold tracking-wider block">
              Failed / Attention
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-sm text-neutral-800 dark:text-neutral-200 tabular-nums">
              <AlertCircle
                className={`w-3.5 h-3.5 ${
                  stats.failedCount > 0 ? 'text-red-500' : 'text-neutral-400'
                }`}
              />
              <span>{stats.failedCount} Jobs</span>
            </div>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="px-4 pt-3 pb-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'All Jobs', count: stats.totalJobs },
              { id: 'processing', label: 'Mastering', count: stats.processingCount },
              { id: 'queued', label: 'Waiting', count: stats.queuedCount },
              { id: 'published', label: 'Published', count: stats.publishedCount },
              { id: 'failed', label: 'Attention', count: stats.failedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  filterTab === tab.id
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums ${
                    filterTab === tab.id
                      ? 'bg-white/20 dark:bg-black/15 text-white dark:text-neutral-900'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {stats.publishedCount > 0 && (
            <button
              type="button"
              onClick={handleClearCompleted}
              className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Done</span>
            </button>
          )}
        </div>

        {/* Jobs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {displayedJobs.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 dark:text-neutral-500 space-y-2">
              <Layers className="w-8 h-8 mx-auto stroke-1 opacity-40" />
              <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                No broadcast jobs in this view
              </p>
              <p className="text-xs max-w-sm mx-auto">
                Add reviewed packages from the Pre-Broadcast Review Desk using &quot;Add to Queue&quot; to schedule background mastering.
              </p>
            </div>
          ) : (
            displayedJobs.map((job) => {
              const priorityInfo =
                PRIORITY_CONFIG[job.priority] || PRIORITY_CONFIG.P3_ROUTINE_FIELD_REPORT;
              const isProcessing = job.status === 'PROCESSING';
              const isQueued = job.status === 'QUEUED';
              const isPublished = job.status === 'PUBLISHED';
              const isFailed = job.status === 'FAILED' || job.status === 'CANCELLED';

              return (
                <div
                  key={job.jobId}
                  className={`rounded-xl border p-4 transition-colors space-y-3 ${
                    isProcessing
                      ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-400/60'
                      : isPublished
                      ? 'bg-white dark:bg-[#1c1d21] border-emerald-500/30'
                      : isFailed
                      ? 'bg-red-50/30 dark:bg-red-950/20 border-red-400/40'
                      : 'bg-white dark:bg-[#1c1d21] border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  {/* Job Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${priorityInfo.badgeColor}`}
                      >
                        {job.priority === 'P1_FLASH_BREAKING' ? (
                          <Flame className="w-3.5 h-3.5 text-red-500" />
                        ) : job.priority === 'P2_PRIMETIME_BULLETIN' ? (
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        <span>{priorityInfo.labelEnglish}</span>
                      </span>

                      {isQueued && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 tabular-nums">
                          #{job.queuePosition || 1} in line &bull; ETA ~{job.estimatedWaitSec || 45}s
                        </span>
                      )}

                      {isProcessing && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-600 text-white flex items-center gap-1.5 tabular-nums">
                          <RotateCw className="w-3 h-3 animate-spin" />
                          <span>Mastering ({job.progress}%)</span>
                        </span>
                      )}

                      {isPublished && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-600 text-white flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Public on YouTube</span>
                        </span>
                      )}

                      {isFailed && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-red-600 text-white flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>
                            {job.needsFootageReattach
                              ? 'Footage Required'
                              : job.status === 'CANCELLED'
                              ? 'Cancelled'
                              : 'Failed'}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isQueued && job.priority !== 'P1_FLASH_BREAKING' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePromoteToP1(job.jobId)}
                          className="h-7 px-2 text-[11px] font-semibold text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer flex items-center gap-1"
                          title="Promote to Flash Breaking News (Moves to Front of Queue)"
                        >
                          <Zap className="w-3 h-3 text-red-500" />
                          <span>Promote P1</span>
                        </Button>
                      )}

                      {isQueued && (
                        <button
                          type="button"
                          onClick={() => handleCancel(job.jobId)}
                          className="text-neutral-400 hover:text-red-500 p-1 rounded-md cursor-pointer transition"
                          title="Cancel Job"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}

                      {isFailed && !job.needsFootageReattach && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(job.jobId)}
                          className="h-7 px-2 text-[11px] font-semibold text-blue-600 border-blue-300 hover:bg-blue-50 cursor-pointer flex items-center gap-1"
                        >
                          <RotateCw className="w-3 h-3" />
                          <span>Retry</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Title & Metadata */}
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-snug line-clamp-2">
                      {job.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                      {job.newsLocation && (
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300 inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-red-500" />
                          {job.newsLocation}
                        </span>
                      )}
                      <span>Desk: {job.userName}</span>
                      <span>Language: {job.language?.toUpperCase()}</span>
                      <span className="tabular-nums">
                        Queued:{' '}
                        {new Date(job.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Live Progress Bar */}
                  {(isProcessing || isQueued) && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-neutral-600 dark:text-neutral-300 font-medium truncate max-w-[82%] flex items-center gap-1.5">
                          {isProcessing && (
                            <RotateCw className="w-3 h-3 animate-spin text-blue-500 shrink-0" />
                          )}
                          <span>{job.stageMessage}</span>
                        </span>
                        <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200 tabular-nums">
                          {job.progress}%
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isProcessing ? 'bg-blue-600' : 'bg-amber-400'
                          }`}
                          style={{ width: `${Math.max(4, job.progress)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Footage Re-Attachment Recovery after Reload */}
                  {isFailed && job.needsFootageReattach && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 space-y-2 text-xs">
                      <p className="text-amber-900 dark:text-amber-200 font-medium">
                        {job.error ||
                          'Browser session reloaded before broadcast started. Re-select the video footage file(s) to resume immediately.'}
                      </p>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs cursor-pointer transition">
                        {reattachingJobId === job.jobId ? (
                          <>
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Resuming...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Re-attach Footage &amp; Resume</span>
                          </>
                        )}
                        <input
                          type="file"
                          multiple
                          accept="video/*"
                          onChange={(e) => handleReattachFootage(job.jobId, e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  {/* Standard Failure Message */}
                  {isFailed && !job.needsFootageReattach && job.error && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs">
                      <p className="font-medium">{job.error}</p>
                    </div>
                  )}

                  {/* Published Success & YouTube Link */}
                  {isPublished && job.youtubeUrl && (
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {job.stageMessage}
                      </span>
                      <a
                        href={job.youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:underline shrink-0"
                      >
                        <span>Watch on YouTube</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111214] flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Direct Public Broadcast Dispatcher</span>
          </div>
          <Button size="sm" variant="outline" onClick={onClose} className="text-xs cursor-pointer">
            Close Monitor
          </Button>
        </div>
      </div>
    </div>
  );
};
