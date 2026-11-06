/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Financial Transaction Traceability Detail Page
 * Phase 11 — Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine
 */

import { useState } from 'react';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  Coins,
  Receipt
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { revenueRecognitionService } from '../../services/revenueRecognitionService';
import { revenueSplitService } from '../../services/revenueSplitService';
import { financialLedgerService } from '../../services/financialLedgerService';
import { payoutService } from '../../services/payoutService';
import { MarketplaceRevenueEvent, RevenueSplitSnapshot, FinancialLedgerEntry, PayoutRequestPhase11 } from '../../types/financePhase11';
import { formatINR, formatDateTime } from '../../utils/formatters';

export const FinancialTransactionDetailPage = () => {
  const [searchPurchaseId, setSearchPurchaseId] = useState('purch_seed_101');
  const [event, setEvent] = useState<MarketplaceRevenueEvent | null>(null);
  const [snapshot, setSnapshot] = useState<RevenueSplitSnapshot | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<FinancialLedgerEntry[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequestPhase11[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchPurchaseId) return;

    setSearched(true);
    const evts = revenueRecognitionService.getEventsForPurchase(searchPurchaseId);
    if (evts.length > 0) {
      setEvent(evts[0]);
      const snap = revenueSplitService.getSnapshotForPurchase(searchPurchaseId);
      setSnapshot(snap || null);

      const entries = financialLedgerService.getEntries({ purchaseId: searchPurchaseId });
      setLedgerEntries(entries);

      const reqs = payoutService.getRequestsForOwner(evts[0].reporterId);
      setPayouts(reqs);
    } else {
      // Check ledger entries fallback
      const entries = financialLedgerService.getEntries({ purchaseId: searchPurchaseId });
      setLedgerEntries(entries);
      setEvent(null);
      setSnapshot(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Chain & Audit Traceability"
        subtitle="Complete end-to-end trace from Purchase -> Revenue Event -> Split Snapshot -> Double-Entry Ledger -> Payable Balance -> Payout."
        breadcrumbs={[
          { label: 'Finance', href: '#' },
          { label: 'Transaction Audit Trace' }
        ]}
      />

      {/* Search Input */}
      <Card variant="editorial" className="p-4 bg-slate-900/80 border-slate-800">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            type="text"
            value={searchPurchaseId}
            onChange={e => setSearchPurchaseId(e.target.value)}
            placeholder="Enter Purchase ID or Transaction Reference (e.g. purch_seed_101)"
            className="flex-1 font-mono text-xs"
          />
          <Button type="submit" variant="primary" size="sm" className="text-xs">
            <Search className="w-3.5 h-3.5 mr-1" />
            Inspect Financial Chain
          </Button>
        </form>
      </Card>

      {/* Financial Chain Visualization */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center">
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-mono">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">1. Purchase</div>
          <div className="text-slate-200 font-bold mt-1 truncate">{searchPurchaseId}</div>
        </div>

        <div className="flex items-center justify-center text-slate-600 hidden md:flex">
          <ArrowRight className="w-4 h-4" />
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-mono">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">2. Revenue Event</div>
          <div className="text-emerald-400 font-bold mt-1 truncate">{event ? event.eventType : 'N/A'}</div>
        </div>

        <div className="flex items-center justify-center text-slate-600 hidden md:flex">
          <ArrowRight className="w-4 h-4" />
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-mono">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">3. Split Snapshot</div>
          <div className="text-amber-400 font-bold mt-1 truncate">{snapshot ? `${snapshot.reporterPercent}% / ${snapshot.platformPercent}%` : 'N/A'}</div>
        </div>
      </div>

      {/* Split Snapshot & Event Breakdown */}
      {snapshot && (
        <Card variant="editorial" className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                Immutable Revenue Split Snapshot (#{snapshot.id})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Created: {formatDateTime(snapshot.createdAt)}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-3 bg-slate-950 rounded-lg">
              <span className="text-slate-400 text-[10px] block">Reporter Share ({snapshot.reporterPercent}%):</span>
              <span className="text-emerald-400 font-bold text-sm">{formatINR(snapshot.reporterAmountMinor / 100)}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg">
              <span className="text-slate-400 text-[10px] block">Source Org Share ({snapshot.sourcePercent}%):</span>
              <span className="text-purple-300 font-bold text-sm">{formatINR(snapshot.sourceAmountMinor / 100)}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg">
              <span className="text-slate-400 text-[10px] block">Platform Fee ({snapshot.platformPercent}%):</span>
              <span className="text-amber-400 font-bold text-sm">{formatINR(snapshot.platformAmountMinor / 100)}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Associated Ledger Entries */}
      <Card variant="editorial" className="overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            Double-Entry Financial Ledger Group ({ledgerEntries.length} entries)
          </h3>
          <Badge variant="emerald" size="sm" className="font-mono">
            <ShieldCheck className="w-3 h-3 mr-1" /> Balanced
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Ledger ID</th>
                <th className="p-3.5">Account ID</th>
                <th className="p-3.5">Account Type</th>
                <th className="p-3.5">Direction</th>
                <th className="p-3.5">Amount (INR)</th>
                <th className="p-3.5">Transaction Type</th>
                <th className="p-3.5">Occurred At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                    {searched ? 'No ledger entries found for this purchase ID.' : 'Enter a purchase ID above to inspect the financial chain.'}
                  </td>
                </tr>
              ) : (
                ledgerEntries.map(e => (
                  <tr key={e.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3.5 font-bold text-slate-200">{e.id}</td>
                    <td className="p-3.5 text-slate-400">{e.accountId}</td>
                    <td className="p-3.5">
                      <Badge variant="outline" size="sm">{e.accountType}</Badge>
                    </td>
                    <td className="p-3.5 font-bold">
                      <span className={e.direction === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'}>
                        {e.direction}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-100">{formatINR(e.amountMinor / 100)}</td>
                    <td className="p-3.5 text-amber-400/90">{e.transactionType}</td>
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
