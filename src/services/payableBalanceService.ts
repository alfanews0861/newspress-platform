/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Payable Balance & Settlement Hold Service
 * Phase 11 — Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine
 */

import { financialLedgerService } from './financialLedgerService';

export interface PayableBalanceBreakdown {
  ownerId: string;
  currency: string;
  grossEarnedMinor: number;
  refundsMinor: number;
  chargebacksMinor: number;
  reversalsMinor: number;
  completedPayoutsMinor: number;
  reservedPayoutsMinor: number;
  pendingHoldMinor: number;
  availablePayableBalanceMinor: number;
  calculatedAt: string;
}

export class PayableBalanceService {
  private settlementHoldDays = 7;

  setSettlementHoldDays(days: number) {
    if (days < 0) throw new Error('Settlement hold days cannot be negative.');
    this.settlementHoldDays = days;
  }

  getSettlementHoldDays(): number {
    return this.settlementHoldDays;
  }

  /**
   * Computes the authoritative payable balance for a reporter or source organization account.
   */
  calculatePayableBalance(ownerId: string, currency = 'INR'): PayableBalanceBreakdown {
    const accountId = ownerId.startsWith('acc_') ? ownerId : `acc_${ownerId}`;
    const entries = financialLedgerService.getEntries({ accountId });

    const now = new Date();
    const holdCutoff = new Date(now.getTime() - this.settlementHoldDays * 24 * 60 * 60 * 1000);

    let grossEarnedMinor = 0;
    let refundsMinor = 0;
    let chargebacksMinor = 0;
    let reversalsMinor = 0;
    let completedPayoutsMinor = 0;
    let reservedPayoutsMinor = 0;
    let pendingHoldMinor = 0;

    for (const entry of entries) {
      if (entry.status === 'CANCELLED') continue;

      const entryTime = new Date(entry.occurredAt);
      const isFresh = entryTime > holdCutoff;

      if (entry.direction === 'CREDIT') {
        if (entry.transactionType === 'ROYALTY_CREDIT' || entry.transactionType === 'SOURCE_CREDIT') {
          grossEarnedMinor += entry.amountMinor;
          if (isFresh) {
            pendingHoldMinor += entry.amountMinor;
          }
        } else if (entry.transactionType === 'ADJUSTMENT' || entry.transactionType === 'HOLD_RELEASE') {
          grossEarnedMinor += entry.amountMinor;
        }
      } else if (entry.direction === 'DEBIT') {
        if (entry.transactionType === 'REFUND_DEBIT') {
          refundsMinor += entry.amountMinor;
        } else if (entry.transactionType === 'CHARGEBACK_DEBIT') {
          chargebacksMinor += entry.amountMinor;
        } else if (entry.transactionType === 'REVERSAL') {
          reversalsMinor += entry.amountMinor;
        } else if (entry.transactionType === 'PAYOUT_DISBURSEMENT') {
          completedPayoutsMinor += entry.amountMinor;
        } else if (entry.transactionType === 'PAYOUT_RESERVATION') {
          reservedPayoutsMinor += entry.amountMinor;
        }
      }
    }

    const netEarned = grossEarnedMinor - refundsMinor - chargebacksMinor - reversalsMinor;
    const netDeductions = completedPayoutsMinor + reservedPayoutsMinor + pendingHoldMinor;
    const availablePayableBalanceMinor = Math.max(0, netEarned - netDeductions);

    return {
      ownerId,
      currency,
      grossEarnedMinor,
      refundsMinor,
      chargebacksMinor,
      reversalsMinor,
      completedPayoutsMinor,
      reservedPayoutsMinor,
      pendingHoldMinor,
      availablePayableBalanceMinor,
      calculatedAt: now.toISOString()
    };
  }
}

export const payableBalanceService = new PayableBalanceService();
