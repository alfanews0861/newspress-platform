/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 14 — Analytics Data Quality & Diagnostic View
 * Scans for missing dimensions, duplicate aggregations, negative impossible metrics,
 * financial mismatch warnings, and aggregation drift.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Check,
} from 'lucide-react';
import { AnalyticsDataQualityService } from '../../services/analyticsDataQualityService';
import { AnalyticsDataQualityFinding } from '../../types/analytics';
import { Badge } from '../../components/ui/Badge';

export const AnalyticsDataQualityPage: React.FC = () => {
  const [findings, setFindings] = useState<AnalyticsDataQualityFinding[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const runScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const results = AnalyticsDataQualityService.performDiagnosticScan();
      setFindings(results);
      setIsScanning(false);
    }, 400);
  };

  useEffect(() => {
    runScan();
  }, []);

  const handleResolve = (findingId: string) => {
    AnalyticsDataQualityService.resolveFinding(findingId);
    setFindings(AnalyticsDataQualityService.getFindings());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-serif font-bold text-slate-100">Analytics Data Quality & Diagnostics</h1>
            <Badge variant="outline" size="sm">Audit & Integrity</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic diagnostic scanner detecting aggregation drift, negative impossible values, and ledger reconciliation warnings.
          </p>
        </div>

        <button
          onClick={runScan}
          disabled={isScanning}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          Run Integrity Scan
        </button>
      </div>

      {/* Summary Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono text-slate-400 uppercase">Total Findings</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">{findings.length}</span>
            <span className="text-xs text-slate-400">issues identified</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono text-slate-400 uppercase">Critical Integrity Flags</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-red-400">
              {findings.filter((f) => f.severity === 'CRITICAL' && !f.resolved).length}
            </span>
            <span className="text-xs text-slate-400">blocking discrepancies</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-xs font-mono text-slate-400 uppercase">Resolved Audits</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {findings.filter((f) => f.resolved).length}
            </span>
          </div>
        </div>
      </div>

      {/* Findings List */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-200 pb-3 border-b border-slate-800">
          Diagnostic Findings & Drift Checks
        </h2>

        <div className="mt-4 space-y-3">
          {findings.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              All data quality assertions passed cleanly. No aggregation drift or negative values detected.
            </div>
          ) : (
            findings.map((f) => (
              <div
                key={f.findingId}
                className={`p-3 rounded border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  f.resolved
                    ? 'bg-slate-950/40 border-slate-900 opacity-60'
                    : f.severity === 'CRITICAL'
                    ? 'bg-red-950/20 border-red-900/60'
                    : 'bg-amber-950/20 border-amber-900/60'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-200">{f.checkType}</span>
                    <Badge variant={f.severity === 'CRITICAL' ? 'rose' : 'amber'} size="sm">
                      {f.severity}
                    </Badge>
                    {f.resolved && <Badge variant="emerald" size="sm">Resolved</Badge>}
                  </div>
                  <p className="text-slate-300 mt-1">{f.description}</p>
                  <span className="text-[10px] font-mono text-slate-400 block mt-1">
                    Detected: {new Date(f.detectedAt).toLocaleString()}
                  </span>
                </div>

                {!f.resolved && (
                  <button
                    onClick={() => handleResolve(f.findingId)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    <Check className="w-3 h-3 text-emerald-400" />
                    Mark Resolved
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
