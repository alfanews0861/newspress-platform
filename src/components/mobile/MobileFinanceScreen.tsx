/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 13 — Mobile Finance & Earnings Screen
 * Reporter royalty balance, pending payouts, settlement ledger, and withdrawal status.
 */

import React, { useState } from 'react';
import { Wallet, TrendingUp, Clock, CheckCircle2, ArrowDownRight, ShieldCheck, DollarSign } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';

export const MobileFinanceScreen: React.FC = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const [requestedPayout, setRequestedPayout] = useState<boolean>(false);

  const earnings = {
    availableBalance: 34500,
    pendingBalance: 12000,
    lifetimeEarnings: 185000,
    currency: 'INR',
    payoutHistory: [
      { id: 'pay_001', date: '2026-09-30', amount: 25000, status: 'COMPLETED', method: 'Stripe Connect' },
      { id: 'pay_002', date: '2026-08-31', amount: 40000, status: 'COMPLETED', method: 'RazorpayX' },
      { id: 'pay_003', date: '2026-07-31', amount: 32000, status: 'COMPLETED', method: 'Direct Bank' },
    ],
  };

  const handleRequestPayout = () => {
    setRequestedPayout(true);
    setTimeout(() => setRequestedPayout(false), 3500);
  };

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            <span>Reporter Royalty & Wallet</span>
          </h2>
          <p className="text-xs text-slate-400">Syndication revenue & assignment disbursements</p>
        </div>
      </div>

      {/* Available Balance Card */}
      <div className="p-5 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
            Available for Payout
          </span>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>

        <div>
          <h3 className="text-3xl font-black text-slate-100">
            ₹{earnings.availableBalance.toLocaleString()}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            + ₹{earnings.pendingBalance.toLocaleString()} in 14-day escrow hold
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleRequestPayout}
            disabled={requestedPayout}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-950/40"
          >
            {requestedPayout ? 'Payout Request Submitted to Controller' : 'Request Instant Payout Transfer'}
          </button>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <p className="text-slate-400 text-[10px]">Pending Escrow</p>
          <p className="font-bold text-slate-200 text-sm">₹{earnings.pendingBalance.toLocaleString()}</p>
        </div>
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <p className="text-slate-400 text-[10px]">Lifetime Recognized</p>
          <p className="font-bold text-slate-200 text-sm">₹{earnings.lifetimeEarnings.toLocaleString()}</p>
        </div>
      </div>

      {/* Payout History */}
      <div className="space-y-2 pt-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Settlement History</h3>
        <div className="space-y-2">
          {earnings.payoutHistory.map((p) => (
            <div
              key={p.id}
              className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
            >
              <div>
                <p className="font-bold text-slate-200">₹{p.amount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">{p.date} • {p.method}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                {p.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
