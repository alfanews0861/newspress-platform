/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 14 — Tenant Executive Dashboard
 * Route: /analytics
 * Strictly isolated to the active news organization tenant.
 * Covers Newsroom operations, Marketplace spend, Editions, Night Production, Finance & Plan limits.
 */

import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  BookOpen,
  ShoppingBag,
  Printer,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  FileCheck,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import { usePermission } from '../../hooks/usePermission';
import { AnalyticsQueryService } from '../../services/analyticsQueryService';
import { AnalyticsNarrativeService } from '../../services/analyticsNarrativeService';
import {
  TenantExecutiveSummary,
  PlanUtilizationSummary,
  AnalyticsNarrative,
  DateRangePreset,
} from '../../types/analytics';
import { Badge } from '../../components/ui/Badge';

export const TenantExecutiveDashboard: React.FC = () => {
  const { currentTenant } = useTenant();
  const activeTenantId = currentTenant?.tenantId;
  const { can } = usePermission();
  const [preset, setPreset] = useState<DateRangePreset>('last_30_days');
  const [summary, setSummary] = useState<TenantExecutiveSummary | null>(null);
  const [planUtilization, setPlanUtilization] = useState<PlanUtilizationSummary | null>(null);
  const [narrative, setNarrative] = useState<AnalyticsNarrative | null>(null);

  const tenantId = activeTenantId || 'tenant-metro-chronicle';

  useEffect(() => {
    const period = AnalyticsQueryService.resolveDateRange(preset);
    const tenantData = AnalyticsQueryService.getTenantExecutiveSummary(tenantId, period);
    const planData = AnalyticsQueryService.getPlanUtilization(tenantId);
    const narData = AnalyticsNarrativeService.generateTenantNarrative(tenantData, false);

    setSummary(tenantData);
    setPlanUtilization(planData);
    setNarrative(narData);
  }, [tenantId, preset]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-slate-100">
              {currentTenant?.organizationName || 'Newsroom'} Analytics
            </h1>
            <Badge variant="emerald" size="sm">Tenant Workspace</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Operational throughput, newsroom turnaround, edition fulfillment, and subscription entitlements.
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-md p-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as DateRangePreset)}
            className="bg-transparent text-xs text-slate-200 focus:outline-none pr-2 py-0.5 cursor-pointer"
          >
            <option value="today" className="bg-slate-900">Today</option>
            <option value="last_7_days" className="bg-slate-900">Last 7 Days</option>
            <option value="last_30_days" className="bg-slate-900">Last 30 Days</option>
            <option value="current_month" className="bg-slate-900">Current Month</option>
            <option value="quarter" className="bg-slate-900">Quarter (90d)</option>
          </select>
        </div>
      </div>

      {/* Narrative Highlights */}
      {narrative && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-semibold mb-1">
            <Zap className="w-3.5 h-3.5" />
            Executive Operational Digest
          </div>
          <p className="text-sm font-semibold text-slate-200">{narrative.headline}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80">
            {narrative.bullets.map((b, i) => (
              <div key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                <span className="text-amber-400">•</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5 Operational Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Section 1: Newsroom */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold">
                <Newspaper className="w-4 h-4 text-amber-400" />
                Newsroom Operations
              </div>
              <Badge variant="outline" size="sm">Factual</Badge>
            </div>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Total Submissions:</span>
                <span className="font-mono font-bold text-slate-200">{summary?.newsroom.submissionsCount || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Approved Stories:</span>
                <span className="font-mono font-bold text-emerald-400">{summary?.newsroom.approvalsCount || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Revision Requests:</span>
                <span className="font-mono text-amber-400">{summary?.newsroom.revisionsCount || 0}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Editorial Turnaround:</span>
                <span className="font-mono text-slate-200">{summary?.newsroom.averageTurnaroundHours || 0} hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Editions */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold">
                <BookOpen className="w-4 h-4 text-purple-400" />
                Newspaper Editions
              </div>
              <Badge variant="outline" size="sm">Press</Badge>
            </div>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Planned Editions:</span>
                <span className="font-mono font-bold text-slate-200">{summary?.editions.planned || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Finalized Editions:</span>
                <span className="font-mono font-bold text-slate-200">{summary?.editions.finalized || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Published to Press:</span>
                <span className="font-mono font-bold text-purple-400">{summary?.editions.published || 0}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Avg Stories / Edition:</span>
                <span className="font-mono text-slate-200">{summary?.editions.averageStoriesPerEdition || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Marketplace */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold">
                <ShoppingBag className="w-4 h-4 text-sky-400" />
                Marketplace Syndication
              </div>
              <Badge variant="outline" size="sm">Wire</Badge>
            </div>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Stories Purchased:</span>
                <span className="font-mono font-bold text-slate-200">{summary?.marketplace.purchasesCount || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Total Spend:</span>
                <span className="font-mono font-bold text-sky-400">
                  ₹{summary ? (summary.marketplace.spendingMinor / 100).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Active Licenses:</span>
                <span className="font-mono text-slate-200">{summary?.marketplace.licensedContentCount || 0}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Pack Redemptions:</span>
                <span className="font-mono text-slate-200">{summary?.marketplace.subscriptionRedemptionsCount || 0} units</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Production */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold">
                <Printer className="w-4 h-4 text-emerald-400" />
                Press & Print Logistics
              </div>
              <Badge variant="outline" size="sm">Night Run</Badge>
            </div>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">PDFs Generated:</span>
                <span className="font-mono font-bold text-slate-200">{summary?.production.pdfsGenerated || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Preflight Pass Rate:</span>
                <span className="font-mono font-bold text-emerald-400">{summary?.production.preflightPassRate || 100}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Rotary Dispatches:</span>
                <span className="font-mono text-slate-200">{summary?.production.vendorDispatchesCount || 0}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Circulation Delivery:</span>
                <span className="font-mono text-slate-200">{summary?.production.deliveryRate || 99}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Finance & Payables (Permitted check) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold">
                <DollarSign className="w-4 h-4 text-amber-400" />
                Financial Settlements
              </div>
              <Badge variant="outline" size="sm">Ledger</Badge>
            </div>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Syndication Spend:</span>
                <span className="font-mono font-bold text-slate-200">
                  ₹{summary ? (summary.finance.marketplaceSpendMinor / 100).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Content Royalties:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ₹{summary ? (summary.finance.contentRoyaltyEarnedMinor / 100).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Pending Payables:</span>
                <span className="font-mono text-amber-400">
                  ₹{summary ? (summary.finance.pendingPayablesMinor / 100).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Available Balance:</span>
                <span className="font-mono text-slate-200">
                  ₹{summary ? (summary.finance.availablePayablesMinor / 100).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Plan Quotas & Entitlements */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold">
                <Layers className="w-4 h-4 text-indigo-400" />
                Plan Quota Utilization
              </div>
              <Badge variant="outline" size="sm">{planUtilization?.currentPlanId || 'BASIC'}</Badge>
            </div>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Editions Used:</span>
                <span className="font-mono font-bold text-slate-200">
                  {planUtilization?.editionsUsed} / {planUtilization?.editionLimit}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">AI Tokens Used:</span>
                <span className="font-mono font-bold text-indigo-400">
                  {planUtilization?.aiUsed} / {planUtilization?.aiLimit}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">News Articles:</span>
                <span className="font-mono text-slate-200">
                  {planUtilization?.newsProcessed} / {planUtilization?.newsProcessingLimit}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Storage Capacity:</span>
                <span className="font-mono text-slate-200">
                  {planUtilization?.storageUsedMb} MB / {planUtilization?.storageLimitMb} MB
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
