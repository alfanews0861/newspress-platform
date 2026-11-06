/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Marketplace Financial Settlement Dashboard
 * Phase 11 — Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine
 */

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  PieChart,
  Coins,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { revenueReportingService, PlatformFinancialReport } from '../../services/revenueReportingService';
import { financialLedgerService } from '../../services/financialLedgerService';
import { financialReconciliationService } from '../../services/financialReconciliationService';
import { FinancialLedgerEntry, FinancialReconciliationFinding } from '../../types/financePhase11';
import { formatINR, formatDateTime } from '../../utils/formatters';

export const MarketplaceFinanceDashboard: React.FC = () => {
  const [report, setReport] = useState<PlatformFinancialReport | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<FinancialLedgerEntry[]>([]);
  const [findings, setFindings] = useState<FinancialReconciliationFinding[]>([]);
  const [searchTerm, setSearchType] = useState('');
  const [filterAccountType, setFilterAccountType] = useState<string>('all');
  const [isReconciling, setIsReconciling] = useState(false);

  const loadDashboard = () => {
    const rep = revenueReportingService.generatePlatformReport();
    setReport(rep);

    const entries = financialLedgerService.getEntries();
    setLedgerEntries(entries.reverse());

    const recon = financialReconciliationService.getFindings();
    setFindings(recon);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleRunReconciliation = async () => {
    setIsReconciling(true);
    try {
      const res = await financialReconciliationService.reconcileAll();
      setFindings(res.findings);
      alert(`Reconciliation scan complete. Total findings: ${res.totalFindings}`);
    } catch (err: any) {
      alert(`Reconciliation error: ${err.message}`);
    } finally {
      setIsReconciling(false);
    }
  };

  const filteredEntries = ledgerEntries.filter(e => {
    if (filterAccountType !== 'all' && e.accountType !== filterAccountType) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        e.id.toLowerCase().includes(q) ||
        e.accountId.toLowerCase().includes(q) ||
        e.referenceId.toLowerCase().includes(q) ||
        e.transactionType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (!report) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace Revenue Settlement & Financial Ledger"
        subtitle="Server-authoritative append-only financial ledger, double-entry validation, revenue recognition, and settlement reconciliation."
        breadcrumbs={[
          { label: 'Finance', href: '#' },
          { label: 'Marketplace Settlement' }
        ]}
      />

      {/* Hero Financial Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Gross Sales */}
        <Card variant="editorial" className="p-5 bg-slate-900/80 border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Gross Volume</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-100">
            {formatINR(report.grossMarketplaceSalesMinor / 100)}
          </div>
          <p className="mt-2 text-[10px] text-slate-400 font-mono">
            Total sales volume captured via payment adapters
          </p>
        </Card>

        {/* Card 2: Net Platform Revenue */}
        <Card variant="editorial" className="p-5 bg-slate-900/80 border-amber-500/30">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Platform Fee (Commission)</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-amber-400">
            {formatINR(report.platformRevenueMinor / 100)}
          </div>
          <p className="mt-2 text-[10px] text-slate-400 font-mono">
            Platform share snapshot (20% default split)
          </p>
        </Card>

        {/* Card 3: Reporter Royalty Payable */}
        <Card variant="editorial" className="p-5 bg-slate-900/80 border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Reporter Payable Pool</span>
            <Coins className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-sky-300">
            {formatINR(report.reporterPayableMinor / 100)}
          </div>
          <p className="mt-2 text-[10px] text-slate-400 font-mono">
            Accumulated reporter royalties in ledger
          </p>
        </Card>

        {/* Card 4: Source Org Payable */}
        <Card variant="editorial" className="p-5 bg-slate-900/80 border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Source Org Shares</span>
            <PieChart className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-purple-300">
            {formatINR(report.sourceOrgPayableMinor / 100)}
          </div>
          <p className="mt-2 text-[10px] text-slate-400 font-mono">
            Publishing house & source org syndication split
          </p>
        </Card>
      </div>

      {/* Reconciliation Action Bar */}
      <Card variant="editorial" className="p-4 bg-slate-900/60 border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
          <div>
            <span className="text-xs font-bold text-slate-200 font-mono">Double-Entry Financial Integrity</span>
            <p className="text-[11px] text-slate-400">
              Total Credits === Total Debits enforced on every settlement event. No floating point math.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunReconciliation}
            disabled={isReconciling}
            className="text-xs font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isReconciling ? 'animate-spin' : ''}`} />
            Run Reconciliation Scan
          </Button>
        </div>
      </Card>

      {/* Reconciliation Findings Banner if any */}
      {findings.length > 0 && (
        <Card variant="editorial" className="p-4 bg-amber-950/40 border-amber-800 text-amber-200 text-xs">
          <div className="flex items-center gap-2 font-mono font-bold mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Reconciliation Findings Detected ({findings.length})</span>
          </div>
          <ul className="space-y-1 font-mono text-[11px] list-disc list-inside">
            {findings.map(f => (
              <li key={f.id}>{f.description}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Ledger Transactions Table with Filters */}
      <Card variant="editorial" className="overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              Append-Only Immutable Financial Ledger ({filteredEntries.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={filterAccountType}
              onChange={e => setFilterAccountType(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg text-xs px-2.5 py-1.5 text-slate-300 font-mono"
            >
              <option value="all">All Accounts</option>
              <option value="PLATFORM">PLATFORM</option>
              <option value="REPORTER">REPORTER</option>
              <option value="SOURCE_ORGANIZATION">SOURCE_ORGANIZATION</option>
              <option value="PUBLISHER">PUBLISHER</option>
              <option value="REFUND_RESERVE">REFUND_RESERVE</option>
            </select>

            <Input
              type="text"
              placeholder="Filter ledger entries..."
              value={searchTerm}
              onChange={e => setSearchType(e.target.value)}
              className="w-48 text-xs py-1.5"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Entry ID</th>
                <th className="p-3.5">Account ID</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Direction</th>
                <th className="p-3.5">Amount (INR)</th>
                <th className="p-3.5">Txn Type</th>
                <th className="p-3.5">Reference ID</th>
                <th className="p-3.5">Occurred At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                    No financial ledger entries match filters.
                  </td>
                </tr>
              ) : (
                filteredEntries.map(e => (
                  <tr key={e.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3.5 font-bold text-slate-200">{e.id}</td>
                    <td className="p-3.5 text-slate-400">{e.accountId}</td>
                    <td className="p-3.5">
                      <Badge variant="outline" size="sm">
                        {e.accountType}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <span className={e.direction === 'CREDIT' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {e.direction}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-100">
                      {formatINR(e.amountMinor / 100)}
                    </td>
                    <td className="p-3.5 text-amber-400/90">{e.transactionType}</td>
                    <td className="p-3.5 text-slate-400">{e.referenceId}</td>
                    <td className="p-3.5 text-slate-400">{formatDateTime(e.occurredAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
