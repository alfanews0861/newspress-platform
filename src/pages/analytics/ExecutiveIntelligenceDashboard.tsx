/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 14 — Executive Intelligence Dashboard
 * Route: /admin/analytics/executive
 * Cross-platform executive intelligence, growth KPIs, financial performance,
 * deterministic anomaly alerts, tenant health indicators, and grounded AI summaries.
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Newspaper,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Download,
  Brain,
  ShieldCheck,
  RefreshCw,
  Users,
  Layers,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import { AnalyticsQueryService } from '../../services/analyticsQueryService';
import { AnalyticsNarrativeService } from '../../services/analyticsNarrativeService';
import { AnalyticsAlertService } from '../../services/analyticsAlertService';
import { TenantHealthService } from '../../services/tenantHealthService';
import { AnalyticsExportService } from '../../services/analyticsExportService';
import {
  ExecutiveKpiSummary,
  AnalyticsNarrative,
  AnalyticsAlert,
  TenantHealthStatus,
  DateRangePreset,
} from '../../types/analytics';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../../components/ui/Badge';

export const ExecutiveIntelligenceDashboard: React.FC = () => {
  const { user } = useAuth();
  const [preset, setPreset] = useState<DateRangePreset>('last_30_days');
  const [kpis, setKpis] = useState<ExecutiveKpiSummary | null>(null);
  const [narrative, setNarrative] = useState<AnalyticsNarrative | null>(null);
  const [alerts, setAlerts] = useState<AnalyticsAlert[]>([]);
  const [tenantHealthList, setTenantHealthList] = useState<TenantHealthStatus[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const period = AnalyticsQueryService.resolveDateRange(preset);
    const kpiData = await AnalyticsQueryService.getExecutiveKpis(period);
    const alertData = AnalyticsAlertService.getAlerts(undefined, true);
    const healthData = await TenantHealthService.evaluateAllTenants();
    const narData = AnalyticsNarrativeService.generateExecutiveNarrative({
      kpis: kpiData,
      narrativeType: 'EXECUTIVE_SUMMARY',
      isAiAssisted: true,
    });

    setKpis(kpiData);
    setAlerts(alertData);
    setTenantHealthList(healthData);
    setNarrative(narData);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [preset]);

  const handleResolveAlert = (alertId: string) => {
    AnalyticsAlertService.resolveAlert(alertId, user?.displayName || 'Executive Admin');
    setAlerts(AnalyticsAlertService.getAlerts(undefined, true));
  };

  const handleExport = async (format: 'CSV' | 'PDF_JSON') => {
    if (!kpis) return;
    const exportRows = [
      { metric: 'Active Tenants', value: kpis.platform.activeTenants },
      { metric: 'Marketplace GMV (INR)', value: (kpis.platform.monthlyMarketplaceGmvMinor / 100).toFixed(2) },
      { metric: 'Platform Revenue (INR)', value: (kpis.platform.platformRevenueMinor / 100).toFixed(2) },
      { metric: 'Editions Produced', value: kpis.platform.editionsProduced },
      { metric: 'Production Success Rate', value: `${kpis.platform.productionSuccessRate}%` },
      { metric: 'Delivery Success Rate', value: `${kpis.platform.deliverySuccessRate}%` },
      { metric: 'Turnaround Hours', value: `${kpis.operational.editorialTurnaroundHours}h` },
    ];

    const res = await AnalyticsExportService.exportReport({
      tenantId: 'platform_executive',
      reportName: 'Executive_Intelligence_Summary',
      format,
      data: exportRows,
      summaryMetrics: {
        generatedAt: new Date().toISOString(),
        period: kpis.period.label,
      },
      actorId: user?.uid || 'user-admin',
      actorName: user?.displayName || 'Alfa News Admin',
      actorRole: 'super_admin',
    });

    setExportNotice(`Exported ${res.filename} successfully (${res.recordsCount} records)`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-slate-100">Executive Intelligence & MIS</h1>
            <Badge variant="amber" size="sm">Phase 14</Badge>
            <Badge variant="outline" size="sm">Platform Admin</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative executive analytics across all news organizations, rotary press runs, and marketplace revenue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-md p-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as DateRangePreset)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none pr-2 py-0.5 cursor-pointer"
            >
              <option value="today" className="bg-slate-900">Today</option>
              <option value="yesterday" className="bg-slate-900">Yesterday</option>
              <option value="last_7_days" className="bg-slate-900">Last 7 Days</option>
              <option value="last_30_days" className="bg-slate-900">Last 30 Days</option>
              <option value="current_month" className="bg-slate-900">Current Month</option>
              <option value="previous_month" className="bg-slate-900">Previous Month</option>
              <option value="quarter" className="bg-slate-900">Quarter (90d)</option>
              <option value="year" className="bg-slate-900">Year</option>
            </select>
          </div>

          <button
            onClick={() => handleExport('CSV')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded text-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            onClick={() => handleExport('PDF_JSON')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 rounded text-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export MIS
          </button>

          <button
            onClick={loadData}
            title="Refresh metrics"
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded text-xs transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-4 py-2.5 rounded text-xs flex items-center justify-between">
          <span>✓ {exportNotice}</span>
          <button onClick={() => setExportNotice(null)} className="text-emerald-400 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Freshness Bar */}
      <div className="flex items-center justify-between bg-slate-900/60 px-4 py-2 rounded border border-slate-800/80 text-[11px] font-mono text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {kpis?.dataFreshness || 'Connecting to operational data layer...'}
        </span>
        <span>Period: <strong className="text-slate-200">{kpis?.period.label}</strong></span>
      </div>

      {/* Primary Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase">Monthly GMV</span>
            <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              ₹{kpis ? ((kpis.platform.monthlyMarketplaceGmvMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })) : '...'}
            </span>
            <span className="text-xs font-mono text-emerald-400 flex items-center">
              <ArrowUpRight className="w-3 h-3" /> +{kpis?.growth.purchaseGrowthRate}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Platform comm: ₹{kpis ? (kpis.platform.platformRevenueMinor / 100).toFixed(2) : '...'}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase">Editions Produced</span>
            <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Newspaper className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              {kpis?.platform.editionsProduced || 0}
            </span>
            <span className="text-xs font-mono text-slate-400">editions</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Readiness pass rate: <strong className="text-slate-200">{kpis?.operational.editionReadinessRate}%</strong>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase">Delivery Success</span>
            <div className="w-8 h-8 rounded bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              {kpis?.platform.deliverySuccessRate}%
            </span>
            <span className="text-xs font-mono text-emerald-400">On Target</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Reprint defect rate: {kpis?.operational.reprintRate}%</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase">Editorial Velocity</span>
            <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              {kpis?.operational.editorialTurnaroundHours}h
            </span>
            <span className="text-xs font-mono text-slate-400">avg turnaround</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Story approval: {kpis?.operational.storyApprovalRate}%</p>
        </div>
      </div>

      {/* AI Grounded Executive Intelligence Summary (Section 44 & 45) */}
      {narrative && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20 border border-amber-500/30 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-amber-300">
                {narrative.label}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Grounded strictly in verified metrics • No automated editorial decisions
            </span>
          </div>

          <div className="mt-3">
            <h3 className="text-base font-serif font-bold text-slate-100">{narrative.headline}</h3>
            <ul className="mt-3 space-y-2">
              {narrative.bullets.map((bullet, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Transparent Underlying Metrics Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap gap-4 text-[11px] font-mono text-slate-400">
            {Object.entries(narrative.groundedMetricValues).map(([k, v]) => (
              <span key={k} className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {k}: <strong className="text-slate-200">{String(v)}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Executive Alerts & Deterministic Anomalies (Section 27 & 28) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-slate-200">Active Operational Alerts</h2>
            </div>
            <Badge variant="outline" size="sm">{alerts.length} Active</Badge>
          </div>

          <div className="mt-4 space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                All deterministic operational thresholds are healthy. Zero active alerts.
              </div>
            ) : (
              alerts.map((alt) => (
                <div key={alt.alertId} className="bg-slate-950 border border-slate-800 rounded p-3 text-xs flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-400">{alt.metric}</span>
                    <Badge variant={alt.severity === 'CRITICAL' ? 'rose' : 'amber'} size="sm">
                      {alt.severity}
                    </Badge>
                  </div>
                  <p className="text-slate-300">{alt.reason}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-900">
                    <span>Threshold: {alt.threshold} | Current: {alt.currentValue}</span>
                    <button
                      onClick={() => handleResolveAlert(alt.alertId)}
                      className="text-amber-400 hover:text-amber-300 cursor-pointer underline"
                    >
                      Acknowledge & Resolve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tenant Operational Health (Section 26) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-semibold text-slate-200">Publisher Organization Health</h2>
            </div>
            <Badge variant="outline" size="sm">Explainable Indicators</Badge>
          </div>

          <div className="mt-4 space-y-3">
            {tenantHealthList.map((th) => (
              <div key={th.tenantId} className="bg-slate-950 border border-slate-800 rounded p-3 text-xs flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{th.organizationName}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    th.indicator === 'ACTIVE'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : th.indicator === 'LIMIT_NEAR'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}>
                    {th.indicator}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">{th.explanation}</p>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-900">
                  <span>Editions: {th.metricsSnapshot.editionsCreatedThisMonth}</span>
                  <span>Limit: {th.metricsSnapshot.editionLimitUtilization}% used</span>
                  <span>Press Failures: {th.metricsSnapshot.productionFailureRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
