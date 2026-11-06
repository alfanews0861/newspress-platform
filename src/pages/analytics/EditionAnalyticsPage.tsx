/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 14 — Edition Analytics & Content Utilization Page
 * Displays edition production cycles, readiness rates, and content utilization formulas.
 */

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  PieChart,
  FileText,
  Clock,
  Layers,
  ShoppingBag,
  HelpCircle,
} from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import { EditionAnalyticsService } from '../../services/editionAnalyticsService';
import { EditionAnalyticsSummary } from '../../types/analytics';
import { Badge } from '../../components/ui/Badge';

export const EditionAnalyticsPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const activeTenantId = currentTenant?.tenantId;
  const [summary, setSummary] = useState<EditionAnalyticsSummary | null>(null);

  useEffect(() => {
    const data = EditionAnalyticsService.getEditionSummary({ tenantId: activeTenantId });
    setSummary(data);
  }, [activeTenantId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-serif font-bold text-slate-100">Edition Planning & Content Utilization</h1>
          <Badge variant="outline" size="sm">Phase 9 Integration</Badge>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Newspaper edition lifecycle tracking, front-page lead usage, readiness rates, and story utilization.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono text-slate-400 uppercase">Editions Published</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-purple-400">{summary?.editionsPublished || 0}</span>
            <span className="text-xs text-slate-400">of {summary?.editionsPlanned || 0} planned</span>
          </div>
          <span className="text-[11px] text-slate-400">Finalized: {summary?.editionsFinalized || 0}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono text-slate-400 uppercase">Content Utilization</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {summary?.contentUtilization.contentUtilizationRate || 0}%
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {summary?.contentUtilization.storiesPlacedInEditions || 0} stories placed in editions
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono text-slate-400 uppercase">Front-Page Lead Usage</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">{summary?.frontPageLeadUsageRate || 0}%</span>
          </div>
          <span className="text-[11px] text-slate-400">A1 lead hero headline allocation</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono text-slate-400 uppercase">Readiness Pass Rate</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">{summary?.editionReadinessRate || 0}%</span>
          </div>
          <span className="text-[11px] text-slate-400">Preflight constraint satisfaction</span>
        </div>
      </div>

      {/* Content Utilization Breakdown (Section 19) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-200">Content Pool Utilization Breakdown</h2>
          </div>
          <Badge variant="outline" size="sm">Section 19 Formula</Badge>
        </div>

        <div className="bg-slate-950 border border-slate-800/80 rounded p-3 text-xs mt-3">
          <span className="font-mono text-amber-300 font-bold">Calculation Definition:</span>
          <span className="font-mono text-slate-300 ml-2">{summary?.contentUtilization.formula}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-xs">
          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <span className="text-slate-400">Approved Stories:</span>
            <span className="font-mono font-bold text-slate-100 block text-lg mt-1">
              {summary?.contentUtilization.storiesApproved || 0}
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <span className="text-slate-400">Used in Editions:</span>
            <span className="font-mono font-bold text-emerald-400 block text-lg mt-1">
              {summary?.contentUtilization.storiesPlacedInEditions || 0}
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <span className="text-slate-400">Unused Approved:</span>
            <span className="font-mono font-bold text-amber-400 block text-lg mt-1">
              {summary?.contentUtilization.unusedApprovedStories || 0}
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <span className="text-slate-400">Marketplace Syndicated Used:</span>
            <span className="font-mono font-bold text-sky-400 block text-lg mt-1">
              {summary?.contentUtilization.marketplaceStoriesUsed || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
