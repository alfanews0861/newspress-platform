/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 14 — Reporter Analytics & Productivity Page
 * Displays factual, operational metrics for reporters.
 * Strictly avoids subjective rankings or editorial quality bias.
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  Coins,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { ReporterAnalyticsService } from '../../services/reporterAnalyticsService';
import { ReporterAnalyticsSummary } from '../../types/analytics';
import { Badge } from '../../components/ui/Badge';

export const ReporterAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const activeTenantId = currentTenant?.tenantId;
  const [reporterId, setReporterId] = useState<string>('rep_sofia_chen');
  const [summary, setSummary] = useState<ReporterAnalyticsSummary | null>(null);

  useEffect(() => {
    const data = ReporterAnalyticsService.getReporterSummary(reporterId, activeTenantId);
    setSummary(data);
  }, [reporterId, activeTenantId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-serif font-bold text-slate-100">Reporter Operational Intelligence</h1>
            <Badge variant="outline" size="sm">Factual Productivity</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Factual performance records, turnaround times, syndicated earnings, and verified formulas.
          </p>
        </div>

        {/* Reporter Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-mono">Reporter:</label>
          <select
            value={reporterId}
            onChange={(e) => setReporterId(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none"
          >
            <option value="rep_sofia_chen">Sofia Chen (Investigative)</option>
            <option value="rep_marcus_vance">Marcus Vance (Crime & City Hall)</option>
            <option value="rep_elena_vance">Elena Vance (Senior Bureau)</option>
            <option value="rep_david_okafor">David Okafor (Freelance Wire)</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono text-slate-400 uppercase">Submissions</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">{summary?.storiesSubmitted || 0}</span>
            <span className="text-xs text-emerald-400">{summary?.storiesApproved || 0} approved</span>
          </div>
          <span className="text-[11px] text-slate-400">Approval rate: {summary?.productivity.approvalRate}%</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono text-slate-400 uppercase">Assignments</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">{summary?.assignmentsReceived || 0}</span>
            <span className="text-xs text-slate-400">{summary?.assignmentsCompleted || 0} completed</span>
          </div>
          <span className="text-[11px] text-slate-400">On-time rate: {summary?.productivity.onTimeSubmissionRate}%</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono text-slate-400 uppercase">Avg Turnaround</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              {summary?.productivity.averageSubmissionTurnaroundHours || 0}h
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Revisions: {summary?.productivity.revisionRequestRate}%</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono text-slate-400 uppercase">Total Royalties</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              ₹{summary ? (summary.reporterEarningsMinor / 100).toFixed(2) : '0.00'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Available: ₹{summary ? (summary.availableEarningsMinor / 100).toFixed(2) : '0.00'}
          </span>
        </div>
      </div>

      {/* Transparent Formula Registry (Section 9) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-slate-200">Transparent Productivity Metric Definitions</h2>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          NewsPress enforces strict transparency: formulas are published openly to prevent subjective editorial bias.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {summary && Object.entries(summary.formulaDefinitions).map(([metricKey, formula]) => (
            <div key={metricKey} className="bg-slate-950 border border-slate-800/80 rounded p-3 text-xs">
              <span className="font-mono font-bold text-amber-300 block">{metricKey}</span>
              <span className="font-mono text-slate-400 mt-1 block">{formula}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
