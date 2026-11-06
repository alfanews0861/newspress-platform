/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 14 — Newsroom & Originality Analytics Page
 * Displays editorial submissions, turnaround velocity, beat/desk distributions,
 * and Originality Engine data without commercial quality scoring.
 */

import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Layers,
  MapPin,
  Tag,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import { NewsroomAnalyticsService } from '../../services/newsroomAnalyticsService';
import { NewsroomAnalyticsSummary } from '../../types/analytics';
import { Badge } from '../../components/ui/Badge';

export const NewsroomAnalyticsPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const activeTenantId = currentTenant?.tenantId;
  const [summary, setSummary] = useState<NewsroomAnalyticsSummary | null>(null);

  useEffect(() => {
    const data = NewsroomAnalyticsService.getNewsroomSummary({
      tenantId: activeTenantId,
    });
    setSummary(data);
  }, [activeTenantId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-serif font-bold text-slate-100">Newsroom & Originality Intelligence</h1>
          <Badge variant="outline" size="sm">Editorial Queue & Velocity</Badge>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Detailed metrics across editorial desks, reporting beats, district coverage, and originality verification.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono text-slate-400 uppercase">Submissions</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">{summary?.storiesSubmitted || 0}</span>
            <span className="text-xs text-emerald-400">{summary?.storiesApproved || 0} approved</span>
          </div>
          <span className="text-[11px] text-slate-400">Queue: {summary?.pendingEditorialQueueCount || 0} pending</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono text-slate-400 uppercase">Editorial Velocity</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">{summary?.averageEditorialTurnaroundHours || 0}h</span>
          </div>
          <span className="text-[11px] text-slate-400">Avg submission-to-decision</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono text-slate-400 uppercase">Originality Duplicate Rate</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">{summary?.originality.duplicateRate || 0}%</span>
          </div>
          <span className="text-[11px] text-slate-400">Flagged duplicate submissions</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono text-slate-400 uppercase">Evidence Backed</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">{summary?.originality.evidenceBackedRate || 0}%</span>
          </div>
          <span className="text-[11px] text-slate-400">{summary?.originality.evidenceBackedSubmissionsCount} submissions with media</span>
        </div>
      </div>

      {/* Distributions: Desks, Beats, Districts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-semibold text-slate-200">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            Coverage by Category / Desk
          </div>
          <div className="mt-3 space-y-2 text-xs">
            {summary && Object.entries(summary.storiesByCategory).map(([cat, count]) => (
              <div key={cat} className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">{cat}:</span>
                <span className="font-mono font-bold text-slate-200">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-semibold text-slate-200">
            <Tag className="w-3.5 h-3.5 text-purple-400" />
            Coverage by Beat
          </div>
          <div className="mt-3 space-y-2 text-xs">
            {summary && Object.entries(summary.storiesByBeat).map(([beat, count]) => (
              <div key={beat} className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">{beat}:</span>
                <span className="font-mono font-bold text-slate-200">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-semibold text-slate-200">
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            Coverage by District
          </div>
          <div className="mt-3 space-y-2 text-xs">
            {summary && Object.entries(summary.storiesByDistrict).map(([dist, count]) => (
              <div key={dist} className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">{dist}:</span>
                <span className="font-mono font-bold text-slate-200">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 11: Originality Engine Status Counts */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-200">Originality Engine Verification Status Distribution</h2>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Operational statistics derived from the technical fingerprinting and originality evaluation engine.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {summary && Object.entries(summary.originality.statusCounts).map(([status, count]) => (
            <div key={status} className="bg-slate-950 border border-slate-800 rounded p-3 text-xs">
              <span className="font-mono text-slate-400 block text-[11px] truncate" title={status}>
                {status}
              </span>
              <span className="text-lg font-mono font-bold text-slate-100 mt-1 block">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
