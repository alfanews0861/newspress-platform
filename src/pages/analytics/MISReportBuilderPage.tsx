/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 14 — MIS Custom Report Builder & Saved Reports
 * Enables authorized users to configure dynamic reports, group by dimensions,
 * schedule automated runs, freeze immutable report snapshots, and export sanitized data.
 */

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Save,
  Play,
  Calendar,
  Layers,
  Download,
  CheckCircle2,
  Clock,
  Bookmark,
  Share2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { MISReportService } from '../../services/misReportService';
import { AnalyticsExportService } from '../../services/analyticsExportService';
import { AnalyticsQueryService } from '../../services/analyticsQueryService';
import {
  SavedAnalyticsReport,
  AnalyticsReportSnapshot,
  ReportGrouping,
  ReportSchedule,
  ReportExportFormat,
  DateRangePreset,
} from '../../types/analytics';
import { Badge } from '../../components/ui/Badge';

export const MISReportBuilderPage: React.FC = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const activeTenantId = currentTenant?.tenantId;
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'storiesSubmitted',
    'storiesApproved',
    'editionsProduced',
  ]);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(['desk', 'category']);
  const [grouping, setGrouping] = useState<ReportGrouping>('month');
  const [preset, setPreset] = useState<DateRangePreset>('last_30_days');
  const [reportName, setReportName] = useState<string>('Custom Newsroom Velocity MIS');
  const [schedule, setSchedule] = useState<ReportSchedule>('monthly');

  const [savedReports, setSavedReports] = useState<SavedAnalyticsReport[]>([]);
  const [snapshots, setSnapshots] = useState<AnalyticsReportSnapshot[]>([]);
  const [reportResult, setReportResult] = useState<{
    rows: Array<Record<string, any>>;
    summary: Record<string, any>;
    generatedAt: string;
  } | null>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const tenantId = activeTenantId || 'tenant-metro-chronicle';

  const loadSaved = () => {
    const list = MISReportService.getSavedReports(tenantId);
    const snaps = MISReportService.getSnapshotsForTenant(tenantId);
    setSavedReports(list);
    setSnapshots(snaps);
  };

  useEffect(() => {
    loadSaved();
  }, [tenantId]);

  const handleExecute = async () => {
    const period = AnalyticsQueryService.resolveDateRange(preset);
    const result = await MISReportService.executeReport({
      tenantId,
      metricIds: selectedMetrics,
      dimensions: selectedDimensions,
      grouping,
      period,
      actorId: user?.uid || 'user-admin',
      actorName: user?.displayName || 'Alfa Admin',
    });
    setReportResult(result);
    setStatusMessage('Report generated successfully with verified operational data.');
  };

  const handleSaveReport = async () => {
    await MISReportService.saveReport({
      tenantId,
      createdBy: user?.uid || 'user-admin',
      name: reportName,
      description: `Custom report grouped by ${grouping}`,
      metricIds: selectedMetrics,
      dimensions: selectedDimensions,
      filters: [],
      grouping,
      schedule,
      recipients: ['editorial-leads@metrochronicle.press'],
      format: 'CSV',
      active: true,
    });
    loadSaved();
    setStatusMessage(`Saved report "${reportName}" to catalog.`);
  };

  const handleSnapshot = async () => {
    if (!reportResult) return;
    const period = AnalyticsQueryService.resolveDateRange(preset);
    const snap = await MISReportService.createReportSnapshot({
      tenantId,
      reportDefinitionId: 'rep_dynamic_snapshot',
      reportName,
      period,
      dataRows: reportResult.rows,
      summaryMetrics: reportResult.summary,
      createdBy: user?.uid || 'user-admin',
    });
    loadSaved();
    setStatusMessage(`Immutable snapshot frozen (#${snap.snapshotId}) with data hash ${snap.dataHash}`);
  };

  const handleExport = async (format: ReportExportFormat) => {
    if (!reportResult) return;
    const res = await AnalyticsExportService.exportReport({
      tenantId,
      reportName,
      format,
      data: reportResult.rows,
      summaryMetrics: reportResult.summary,
      actorId: user?.uid || 'user-admin',
      actorName: user?.displayName || 'Alfa Admin',
      actorRole: 'administrator',
    });
    setStatusMessage(`Exported ${res.filename} cleanly (${res.recordsCount} rows)`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-serif font-bold text-slate-100">MIS Report Builder & Saved Catalogs</h1>
            <Badge variant="outline" size="sm">Phase 14 Custom MIS</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Build custom MIS reports, select dimensions, schedule distribution, and generate immutable audit snapshots.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExecute}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-xs transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Run Report
          </button>
          <button
            onClick={handleSaveReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Save Configuration
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-4 py-2 rounded text-xs flex items-center justify-between">
          <span>✓ {statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-400 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Builder Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric Selection */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-xs">
          <span className="font-mono text-slate-400 font-bold uppercase block pb-2 border-b border-slate-800">
            1. Select Operational Metrics
          </span>
          <div className="mt-3 space-y-2">
            {[
              { id: 'storiesSubmitted', label: 'Stories Submitted' },
              { id: 'storiesApproved', label: 'Stories Approved' },
              { id: 'editorialTurnaroundHours', label: 'Editorial Turnaround (Hours)' },
              { id: 'editionsProduced', label: 'Editions Produced' },
              { id: 'contentUtilizationRate', label: 'Content Utilization Rate (%)' },
              { id: 'productionJobs', label: 'Production Press Jobs' },
              { id: 'deliverySuccessRate', label: 'Delivery Success Rate (%)' },
              { id: 'grossMarketplaceRevenueMinor', label: 'Marketplace GMV' },
              { id: 'platformRevenueMinor', label: 'Platform Revenue' },
            ].map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(m.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedMetrics([...selectedMetrics, m.id]);
                    else setSelectedMetrics(selectedMetrics.filter((id) => id !== m.id));
                  }}
                  className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0"
                />
                <span>{m.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Grouping & Date Range */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-xs">
          <span className="font-mono text-slate-400 font-bold uppercase block pb-2 border-b border-slate-800">
            2. Dimensions & Time Horizon
          </span>
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-slate-400 block mb-1">Time Grouping:</label>
              <select
                value={grouping}
                onChange={(e) => setGrouping(e.target.value as ReportGrouping)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200"
              >
                <option value="day">By Day</option>
                <option value="week">By Week</option>
                <option value="month">By Month</option>
                <option value="quarter">By Quarter</option>
                <option value="category">By Story Category</option>
                <option value="district">By District</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Date Horizon:</label>
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value as DateRangePreset)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200"
              >
                <option value="last_7_days">Last 7 Days</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="current_month">Current Month</option>
                <option value="previous_month">Previous Month</option>
                <option value="quarter">Quarter (90d)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Schedule & Metadata */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-xs">
          <span className="font-mono text-slate-400 font-bold uppercase block pb-2 border-b border-slate-800">
            3. Report Definition & Schedule
          </span>
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-slate-400 block mb-1">Report Name:</label>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Automated Schedule:</label>
              <select
                value={schedule}
                onChange={(e) => setSchedule(e.target.value as ReportSchedule)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200"
              >
                <option value="none">Manual On-Demand</option>
                <option value="daily">Daily Midnight Rollup</option>
                <option value="weekly">Weekly Monday Morning</option>
                <option value="monthly">Monthly Executive Close</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Report Execution Output */}
      {reportResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Execution Output: {reportName}</h2>
              <span className="text-[11px] font-mono text-slate-400">Generated: {reportResult.generatedAt}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleExport('CSV')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition cursor-pointer"
              >
                Download CSV
              </button>
              <button
                onClick={() => handleExport('PDF_JSON')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition cursor-pointer"
              >
                Download JSON
              </button>
              <button
                onClick={handleSnapshot}
                className="px-2.5 py-1 bg-purple-950 hover:bg-purple-900 border border-purple-800 text-purple-300 rounded text-xs transition cursor-pointer"
              >
                Freeze Snapshot
              </button>
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 font-mono text-[11px] text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Dimension</th>
                  <th className="py-2 px-3">Stories Count</th>
                  <th className="py-2 px-3">Editions Allocation</th>
                  <th className="py-2 px-3">Period</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {reportResult.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-slate-200 font-semibold">{row.dimension}</td>
                    <td className="py-2 px-3">{row.storiesCount}</td>
                    <td className="py-2 px-3 text-emerald-400">{row.editionsContribution}</td>
                    <td className="py-2 px-3 text-slate-400">{row.period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Saved Reports Catalog & Immutable Snapshots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-semibold text-slate-200">
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            Saved MIS Reports
          </div>
          <div className="mt-3 space-y-2 text-xs">
            {savedReports.map((r) => (
              <div key={r.id} className="bg-slate-950 p-2.5 rounded border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-200 block">{r.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">Schedule: {r.schedule} • {r.format}</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedMetrics(r.metricIds);
                    setSelectedDimensions(r.dimensions);
                    setGrouping(r.grouping);
                    setReportName(r.name);
                    handleExecute();
                  }}
                  className="text-amber-400 hover:text-amber-300 text-xs underline cursor-pointer"
                >
                  Load & Run
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-semibold text-slate-200">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            Immutable Audit Snapshots (Section 33)
          </div>
          <div className="mt-3 space-y-2 text-xs">
            {snapshots.length === 0 ? (
              <span className="text-slate-400 text-xs block py-2">No historical snapshots frozen yet.</span>
            ) : (
              snapshots.map((s) => (
                <div key={s.snapshotId} className="bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-[11px]">
                  <span className="text-slate-200 font-bold block">{s.reportName}</span>
                  <div className="flex justify-between text-slate-400 mt-1">
                    <span>Hash: {s.dataHash.substring(0, 16)}...</span>
                    <span>{new Date(s.generationTimestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
