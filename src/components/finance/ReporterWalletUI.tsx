/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Reporter Wallet & Royalty Settlement UI Component
 * Phase 11 — Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine
 */

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Coins,
  ArrowUpRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  ShieldCheck,
  Building2,
  FileText
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { payableBalanceService, PayableBalanceBreakdown } from '../../services/payableBalanceService';
import { payoutEligibilityService } from '../../services/payoutEligibilityService';
import { payoutProfileService } from '../../services/payoutProfileService';
import { payoutService } from '../../services/payoutService';
import { PayoutProfile, PayoutRequestPhase11, PayoutEligibility } from '../../types/financePhase11';
import { formatINR, formatDateTime } from '../../utils/formatters';

interface ReporterWalletUIProps {
  reporterId: string;
  reporterName: string;
  tenantId?: string;
}

export const ReporterWalletUI: React.FC<ReporterWalletUIProps> = ({
  reporterId,
  reporterName,
  tenantId = 'freelance_open'
}) => {
  const [balance, setBalance] = useState<PayableBalanceBreakdown | null>(null);
  const [eligibility, setEligibility] = useState<PayoutEligibility | null>(null);
  const [profile, setProfile] = useState<PayoutProfile | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequestPhase11[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [requestAmountRupees, setRequestAmountRupees] = useState('');
  const [legalName, setLegalName] = useState('');
  const [upiRef, setUpiRef] = useState('');
  const [taxIdRef, setTaxIdRef] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'UPI' | 'BANK_TRANSFER'>('UPI');
  const [bankToken, setBankToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const refreshData = () => {
    const bal = payableBalanceService.calculatePayableBalance(reporterId);
    setBalance(bal);

    const elig = payoutEligibilityService.evaluateEligibility(reporterId);
    setEligibility(elig);

    const prof = payoutProfileService.getProfile(reporterId);
    setProfile(prof || null);

    if (prof) {
      setLegalName(prof.legalName);
      setUpiRef(prof.UPIReference || '');
      setTaxIdRef(prof.taxIdReference || '');
      setPayoutMethod(prof.payoutMethod === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'UPI');
      setBankToken(prof.bankAccountToken || '');
    }

    const reqs = payoutService.getRequestsForOwner(reporterId);
    setPayouts(reqs);
  };

  useEffect(() => {
    refreshData();
  }, [reporterId]);

  const handleOpenPayoutRequest = () => {
    setFeedback(null);
    if (balance) {
      setRequestAmountRupees((balance.availablePayableBalanceMinor / 100).toString());
    }
    setIsRequestModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const saved = payoutProfileService.saveProfile({
        tenantId,
        ownerType: 'REPORTER',
        ownerId: reporterId,
        legalName: legalName || reporterName,
        displayName: reporterName,
        payoutMethod,
        UPIReference: payoutMethod === 'UPI' ? upiRef : undefined,
        bankAccountToken: payoutMethod === 'BANK_TRANSFER' ? (bankToken || `tok_bank_${Date.now()}`) : undefined,
        taxIdReference: taxIdRef
      });

      setProfile(saved);
      setIsProfileModalOpen(false);
      refreshData();
      setFeedback({ type: 'success', message: 'Payout profile updated and tokenized securely.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update profile.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecutePayoutRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const rupees = parseFloat(requestAmountRupees);
      if (isNaN(rupees) || rupees <= 0) {
        throw new Error('Please enter a valid payout amount in Rupees.');
      }

      const amountMinor = Math.round(rupees * 100);
      const idempotencyKey = `pout_req_${reporterId}_${Date.now()}`;

      await payoutService.requestPayout({
        tenantId,
        ownerType: 'REPORTER',
        ownerId: reporterId,
        amountMinor,
        currency: 'INR',
        requestedBy: reporterId,
        idempotencyKey
      });

      setIsRequestModalOpen(false);
      refreshData();
      setFeedback({ type: 'success', message: `Payout request for ${formatINR(rupees)} submitted for finance approval.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Payout request failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!balance) return null;

  const availableRupees = balance.availablePayableBalanceMinor / 100;
  const pendingHoldRupees = balance.pendingHoldMinor / 100;
  const grossEarnedRupees = balance.grossEarnedMinor / 100;
  const paidRupees = balance.completedPayoutsMinor / 100;
  const reversedRupees = (balance.refundsMinor + balance.chargebacksMinor + balance.reversalsMinor) / 100;
  const minThresholdRupees = (eligibility?.minimumThresholdMinor || 10000) / 100;

  const isEligible = eligibility?.status === 'ELIGIBLE';

  return (
    <div className="space-y-6">
      {/* Feedback Notification */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-sans ${
            feedback.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/50 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-200">
            &times;
          </button>
        </div>
      )}

      {/* Main Balance Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Available Payable Balance */}
        <Card variant="editorial" className="p-5 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 border-amber-500/30">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Available Payable Balance</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-amber-400">
            {formatINR(availableRupees)}
          </div>
          <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-mono">Min Threshold: {formatINR(minThresholdRupees)}</span>
            <Button
              size="sm"
              variant="primary"
              disabled={!isEligible}
              onClick={handleOpenPayoutRequest}
              className="text-xs px-2.5 py-1"
            >
              <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
              Request Payout
            </Button>
          </div>
        </Card>

        {/* Card 2: Settlement Hold */}
        <Card variant="editorial" className="p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">7-Day Settlement Hold</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-sky-300">
            {formatINR(pendingHoldRupees)}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            Fresh sales transition to available balance after hold clearance.
          </p>
        </Card>

        {/* Card 3: Gross Lifetime Earnings */}
        <Card variant="editorial" className="p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Gross Earned</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-400">
            {formatINR(grossEarnedRupees)}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            Total net royalties credited to reporter ledger.
          </p>
        </Card>

        {/* Card 4: Disbursed & Reversed */}
        <Card variant="editorial" className="p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Paid & Reversals</span>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-mono font-bold text-slate-200">
            {formatINR(paidRupees)} <span className="text-xs text-slate-400 font-normal">paid</span>
          </div>
          {reversedRupees > 0 && (
            <p className="mt-1 text-[11px] font-mono text-rose-400">
              -{formatINR(reversedRupees)} refunds / chargebacks
            </p>
          )}
        </Card>
      </div>

      {/* Payout Profile & Eligibility Status Bar */}
      <Card variant="editorial" className="p-4 bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold shrink-0">
            KYC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">{profile?.legalName || reporterName}</span>
              <Badge variant={profile?.verificationStatus === 'VERIFIED' ? 'emerald' : 'amber'} size="sm">
                {profile?.verificationStatus || 'NOT_CONFIGURED'}
              </Badge>
              <Badge variant="outline" size="sm" className="font-mono">
                {profile?.payoutMethod || 'UPI'}
              </Badge>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              {profile?.payoutMethod === 'UPI' ? `UPI: ${profile.UPIReference || 'Not set'}` : `Bank Account: Tokenized (${profile?.bankAccountToken || 'Not set'})`}
              {profile?.taxIdReference && ` • Tax ID: ${profile.taxIdReference}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setIsProfileModalOpen(true)} className="text-xs">
            <CreditCard className="w-3.5 h-3.5 mr-1" />
            Manage Payout Profile
          </Button>
        </div>
      </Card>

      {/* Payout Requests History Table */}
      <Card variant="editorial" className="overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            Payout Settlement History
          </h3>
          <Button variant="ghost" size="sm" onClick={refreshData} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Payout ID</th>
                <th className="p-3.5">Requested Amount</th>
                <th className="p-3.5">Provider / Method</th>
                <th className="p-3.5">Requested Date</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Completed Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300 font-mono">
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                    No payout requests submitted yet.
                  </td>
                </tr>
              ) : (
                payouts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3.5 font-bold text-slate-200">{p.id}</td>
                    <td className="p-3.5 font-bold text-amber-400">
                      {formatINR(p.amountMinor / 100)}
                    </td>
                    <td className="p-3.5 text-slate-400">{p.provider}</td>
                    <td className="p-3.5 text-slate-400">{formatDateTime(p.requestedAt)}</td>
                    <td className="p-3.5 font-sans">
                      <Badge
                        variant={
                          p.status === 'COMPLETED'
                            ? 'emerald'
                            : p.status === 'APPROVED' || p.status === 'PROCESSING'
                            ? 'blue'
                            : p.status === 'FAILED' || p.status === 'REJECTED'
                            ? 'rose'
                            : 'amber'
                        }
                        size="sm"
                      >
                        {p.status}
                      </Badge>
                      {p.failureReason && (
                        <p className="text-[10px] text-rose-400 mt-0.5">{p.failureReason}</p>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {p.completedAt ? formatDateTime(p.completedAt) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Request Payout */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Request Royalty Payout"
      >
        <form onSubmit={handleExecutePayoutRequest} className="space-y-4">
          <p className="text-xs text-slate-300">
            Submit a payout request from your available balance. Approved payouts are processed via your tokenized banking or UPI profile.
          </p>

          <div className="p-3 bg-slate-900 rounded-lg text-xs font-mono space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Available Payable Balance:</span>
              <span className="text-amber-400 font-bold">{formatINR(availableRupees)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Minimum Threshold:</span>
              <span>{formatINR(minThresholdRupees)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
              Payout Amount (₹)
            </label>
            <Input
              type="number"
              step="1"
              min={minThresholdRupees}
              max={availableRupees}
              value={requestAmountRupees}
              onChange={e => setRequestAmountRupees(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Manage Payout Profile */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Payout Profile & Banking Details"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <p className="text-slate-400">
            Configure tokenized payout details. NewsPress never stores raw account credentials, PINs, or CVVs.
          </p>

          <div>
            <label className="block font-mono font-medium text-slate-300 mb-1">Legal Beneficiary Name</label>
            <Input
              type="text"
              value={legalName}
              onChange={e => setLegalName(e.target.value)}
              placeholder="Full legal name as in bank records"
              required
            />
          </div>

          <div>
            <label className="block font-mono font-medium text-slate-300 mb-1">Tax ID / PAN Reference</label>
            <Input
              type="text"
              value={taxIdRef}
              onChange={e => setTaxIdRef(e.target.value)}
              placeholder="e.g. PAN-ABCDE1234F"
            />
          </div>

          <div>
            <label className="block font-mono font-medium text-slate-300 mb-1">Payout Method</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="payoutMethod"
                  value="UPI"
                  checked={payoutMethod === 'UPI'}
                  onChange={() => setPayoutMethod('UPI')}
                />
                <span className="text-slate-200">UPI Virtual Payment Address</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="payoutMethod"
                  value="BANK_TRANSFER"
                  checked={payoutMethod === 'BANK_TRANSFER'}
                  onChange={() => setPayoutMethod('BANK_TRANSFER')}
                />
                <span className="text-slate-200">Bank Direct Transfer</span>
              </label>
            </div>
          </div>

          {payoutMethod === 'UPI' ? (
            <div>
              <label className="block font-mono font-medium text-slate-300 mb-1">UPI ID Reference</label>
              <Input
                type="text"
                value={upiRef}
                onChange={e => setUpiRef(e.target.value)}
                placeholder="reporter@upi / mobile@okaxis"
                required={payoutMethod === 'UPI'}
              />
            </div>
          ) : (
            <div>
              <label className="block font-mono font-medium text-slate-300 mb-1">Tokenized Bank Account Reference</label>
              <Input
                type="text"
                value={bankToken}
                onChange={e => setBankToken(e.target.value)}
                placeholder="e.g. tok_bank_account_reference"
                required={payoutMethod === 'BANK_TRANSFER'}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsProfileModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Profile'}
            </Button>

          </div>
        </form>
      </Modal>
    </div>
  );
};
