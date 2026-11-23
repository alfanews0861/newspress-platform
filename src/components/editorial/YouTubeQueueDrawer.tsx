/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress YouTube News Studio — Live Task Queue & Priority Management Drawer
 * Real-time monitoring of asynchronous video mastering, queue positions, ETAs, and priority promotions.
 */

import React, { useState, useEffect } from 'react';
import {
  Layers,
  X,
  Play,
  RotateCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Flame,
  Clock,
  FileText,
  Zap,
  Sliders,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Video,
} from 'lucide-react';
import {
  YouTubeVideoJob,
  YouTubeVideoPriority,
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
  const [stats, setStats] = useState<QueueSystemStats>(() => YouTubeQueueService.getQueueStats(tenantId));
  const [filterTab, setFilterTab] = useState<'all' | 'queued' | 'processing' | 'published' | 'failed'>('all');

  useEffect(() => {
    // Subscribe to live queue updates
    const unsubscribe = YouTubeQueueService.subscribe((updatedJobs) => {
      const filtered = tenantId ? updatedJobs.filter((j) => j.tenantId === tenantId) : updatedJobs;
      setJobs(filtered);
      setStats(YouTubeQueueService.getQueueStats(tenantId));
    });

    return () => {
      unsubscribe();
    };
  }, [tenantId]);

  if (!isOpen) return null;

  const handlePromoteToP1 = async (jobId: string) => {
    await YouTubeQueueService.setJobPriority(jobId, 'P1_FLASH_BREAKING');
  };

  const handleCancel = async (jobId: string) => {
    await YouTubeQueueService.cancelJob(jobId, 'Cancelled by editor.');
  };

  const handleRetry = async (jobId: string) => {
    await YouTubeQueueService.retryJob(jobId);
  };

  const handleClearCompleted = async () => {
    await YouTubeQueueService.clearCompleted();
  };

  // Filter jobs based on selected tab
  const displayedJobs = jobs.filter((job) => {
    if (filterTab === 'all') return true;
    if (filterTab === 'queued') return job.status === 'QUEUED';
    if (filterTab === 'processing') return job.status === 'PROCESSING';
    if (filterTab === 'published') return job.status === 'PUBLISHED';
    if (filterTab === 'failed') return job.status === 'FAILED' || job.status === 'CANCELLED';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1e1f20] h-full shadow-2xl flex flex-col border-l border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 font-sans">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-[#18191a]">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-red-600/30">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  YouTube Task Queue
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  Live Engine
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Autonomous background video mastering, rate-limiting &amp; priority scheduling.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Operational Concurrency & Statistics Banner */}
        <div className="p-4 bg-neutral-100/70 dark:bg-[#252728] border-b border-neutral-200 dark:border-neutral-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 rounded-xl bg-white dark:bg-[#1e1f20] border border-neutral-200 dark:border-neutral-700 shadow-2xs">
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-semibold tracking-wider block">
              Active Workers
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-sm text-blue-600 dark:text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span>{stats.activeWorkers} / {stats.maxConcurrentWorkers} Active</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-[#1e1f20] border border-neutral-200 dark:border-neutral-700 shadow-2xs">
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-semibold tracking-wider block">
              Waiting in Queue
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-sm text-amber-600 dark:text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{stats.queuedCount} Jobs</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-[#1e1f20] border border-neutral-200 dark:border-neutral-700 shadow-2xs">
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-semibold tracking-wider block">
              Published Live
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{stats.publishedCount} Videos</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-[#1e1f20] border border-neutral-200 dark:border-neutral-700 shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-semibold tracking-wider block">
              System Status
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-xs text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Autonomous Broadcast Engine</span>
            </div>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="px-4 pt-3 pb-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'All Jobs', count: stats.totalJobs },
              { id: 'processing', label: 'Processing', count: stats.processingCount },
              { id: 'queued', label: 'Waiting', count: stats.queuedCount },
              { id: 'published', label: 'Published', count: stats.publishedCount },
              { id: 'failed', label: 'Failed / Cancelled', count: stats.failedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-full font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  filterTab === tab.id
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  filterTab === tab.id
                    ? 'bg-white/20 dark:bg-black/20 text-white dark:text-neutral-900'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}>
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {displayedJobs.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 dark:text-neutral-500 space-y-2">
              <Layers className="w-8 h-8 mx-auto stroke-1 opacity-40" />
              <p className="text-sm font-semibold">No video jobs in this category</p>
              <p className="text-xs">
                When you click "Queue for Broadcast", video packages enter this autonomous pipeline.
              </p>
            </div>
          ) : (
            displayedJobs.map((job) => {
              const priorityInfo = PRIORITY_CONFIG[job.priority] || PRIORITY_CONFIG.P3_ROUTINE_FIELD_REPORT;
              const isProcessing = job.status === 'PROCESSING';
              const isQueued = job.status === 'QUEUED';
              const isPublished = job.status === 'PUBLISHED';
              const isFailed = job.status === 'FAILED' || job.status === 'CANCELLED';

              return (
                <div
                  key={job.jobId}
                  className={`rounded-2xl border p-4 transition-all space-y-3 ${
                    isProcessing
                      ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-500/50 shadow-md ring-1 ring-blue-500/20'
                      : isPublished
                      ? 'bg-white dark:bg-[#202122] border-emerald-500/30 shadow-xs'
                      : isFailed
                      ? 'bg-red-50/30 dark:bg-red-950/20 border-red-500/30'
                      : 'bg-white dark:bg-[#202122] border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-neutral-300'
                  }`}
                >
                  {/* Job Header: Priority Badge, Queue Position & Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Priority Badge */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${priorityInfo.badgeColor}`}>
                        {job.priority === 'P1_FLASH_BREAKING' ? (
                          <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                        ) : job.priority === 'P2_PRIMETIME_BULLETIN' ? (
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        <span>{priorityInfo.labelEnglish}</span>
                        <span className="text-[10px] opacity-75 font-normal font-sans">({priorityInfo.labelTelugu})</span>
                      </span>

                      {/* Status / Position Badge */}
                      {isQueued && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                          #{job.queuePosition} in line &bull; ETA: ~{job.estimatedWaitSec}s
                        </span>
                      )}

                      {isProcessing && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white flex items-center gap-1.5 animate-pulse">
                          <RotateCw className="w-3 h-3 animate-spin" />
                          <span>Active Mastering ({job.progress}%)</span>
                        </span>
                      )}

                      {isPublished && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Live on YouTube</span>
                        </span>
                      )}

                      {isFailed && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{job.status === 'CANCELLED' ? 'Cancelled' : 'Failed'}</span>
                        </span>
                      )}
                    </div>

                    {/* Quick Priority Upgrade / Cancel Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isQueued && job.priority !== 'P1_FLASH_BREAKING' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePromoteToP1(job.jobId)}
                          className="h-7 px-2 text-[11px] font-bold text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer flex items-center gap-1"
                          title="Promote to Flash Breaking News (Jumps to Front of Queue)"
                        >
                          <Zap className="w-3 h-3 text-red-500 fill-current" />
                          <span>Promote to P1</span>
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

                      {isFailed && (
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

                  {/* Title and Metadata */}
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-snug line-clamp-2">
                      {job.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                      {job.newsLocation && (
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                          📍 {job.newsLocation}
                        </span>
                      )}
                      <span>Reporter: {job.userName}</span>
                      <span>Lang: {job.language?.toUpperCase()}</span>
                      <span>Created: {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Live Progress Bar and Stage Feedback */}
                  {(isProcessing || isQueued) && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-neutral-600 dark:text-neutral-300 font-medium truncate max-w-[80%] flex items-center gap-1.5">
                          {isProcessing && <RotateCw className="w-3 h-3 animate-spin text-blue-500 shrink-0" />}
                          <span>{job.stageMessage}</span>
                        </span>
                        <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                          {job.progress}%
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isProcessing ? 'bg-blue-600' : 'bg-amber-400'
                          }`}
                          style={{ width: `${Math.max(5, job.progress)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Failure Message */}
                  {isFailed && job.error && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs">
                      <p className="font-semibold">Reason: {job.error}</p>
                    </div>
                  )}

                  {/* Published Success & YouTube Live Link */}
                  {isPublished && job.youtubeUrl && (
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-3">
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
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#18191a] flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Autonomous Cloud Run Rate-Limiting Engine</span>
          </div>
          <Button size="sm" variant="outline" onClick={onClose} className="text-xs">
            Close Monitor
          </Button>
        </div>
      </div>
    </div>
  );
};
