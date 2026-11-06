/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 14 — Financial Analytics & Reconciliation Service
 * Authoritative financial intelligence consuming Phase 11 Immutable Ledger,
 * PayableBalanceService, PayoutService, and FinancialReconciliationService.
 */

import { financialLedgerService } from './financialLedgerService';
import { payableBalanceService } from './payableBalanceService';
import { payoutService } from './payoutService';
import { financialReconciliationService } from './financialReconciliationService';
import {
  FinancialAnalyticsSummary,
  FinancialReconciliationWarning,
  DateRangeFilter,
} from '../types/analytics';

export class FinancialAnalyticsService {
  /**
   * Generates authoritative financial analytics summary.
   * All monetary figures are in integer minor units (e.g. 100 = ₹1.00).
   */
  public static getFinancialSummary(params?: {
    tenantId?: string;
    period?: DateRangeFilter;
    currency?: string;
  }): FinancialAnalyticsSummary {
    const currency = params?.currency || 'INR';
    const entries = financialLedgerService.getEntries();
    const period = params?.period || {
      preset: 'last_30_days',
      startDate: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      label: 'Last 30 Days',
    };

    const startTs = new Date(period.startDate).getTime();
    const endTs = new Date(period.endDate).getTime();

    // Filter ledger entries by tenant (if provided) and date range
    const filteredEntries = entries.filter((e) => {
      const entryTime = new Date(e.occurredAt).getTime();
      const inRange = entryTime >= startTs && entryTime <= endTs;
      const matchTenant = !params?.tenantId || e.tenantId === params.tenantId;
      const matchCurrency = !e.currency || e.currency === currency;
      return inRange && matchTenant && matchCurrency && e.status !== 'CANCELLED';
    });

    let grossMarketplaceRevenueMinor = 0;
    let platformRevenueMinor = 0;
    let reporterShareMinor = 0;
    let sourceShareMinor = 0;
    let refundsMinor = 0;
    let chargebacksMinor = 0;

    for (const e of filteredEntries) {
      if (e.transactionType === 'PURCHASE_SETTLEMENT' && e.direction === 'DEBIT') {
        grossMarketplaceRevenueMinor += e.amountMinor;
      } else if (e.transactionType === 'PLATFORM_FEE' && e.direction === 'CREDIT') {
        platformRevenueMinor += e.amountMinor;
      } else if (e.transactionType === 'REPORTER_ROYALTY' && e.direction === 'CREDIT') {
        reporterShareMinor += e.amountMinor;
      } else if (e.transactionType === 'SOURCE_ORG_SHARE' && e.direction === 'CREDIT') {
        sourceShareMinor += e.amountMinor;
      } else if (e.transactionType === 'REFUND') {
        refundsMinor += e.amountMinor;
      } else if (e.transactionType === 'CHARGEBACK') {
        chargebacksMinor += e.amountMinor;
      }
    }

    const netRevenueMinor = platformRevenueMinor - refundsMinor - chargebacksMinor;

    // Retrieve payables from PayableBalanceService across relevant accounts
    let pendingPayablesMinor = 0;
    let availablePayablesMinor = 0;

    // Scan unique reporter/source accounts from ledger
    const accountIds = Array.from(new Set(filteredEntries.map((e) => e.accountId)));
    for (const accId of accountIds) {
      if (accId.startsWith('acc_rep_') || accId.startsWith('acc_src_') || accId.startsWith('rep_')) {
        const bal = payableBalanceService.calculatePayableBalance(accId, currency);
        pendingPayablesMinor += bal.pendingHoldMinor;
        availablePayablesMinor += bal.availablePayableBalanceMinor;
      }
    }

    // Payout metrics from Phase 11 PayoutService
    const allPayoutRequests = payoutService.getAllRequests();
    let payoutsCompletedMinor = 0;
    let payoutsFailedMinor = 0;
    let payoutsReversedMinor = 0;

    for (const p of allPayoutRequests) {
      const pTime = new Date(p.requestedAt).getTime();
      const inRange = pTime >= startTs && pTime <= endTs;
      const matchTenant = !params?.tenantId || p.tenantId === params.tenantId;

      if (inRange && matchTenant) {
        if (p.status === 'COMPLETED') {
          payoutsCompletedMinor += p.amountMinor;
        } else if (p.status === 'FAILED') {
          payoutsFailedMinor += p.amountMinor;
        } else if (p.status === 'REVERSED') {
          payoutsReversedMinor += p.amountMinor;
        }
      }
    }

    // Surface reconciliation findings from Phase 11 FinancialReconciliationService
    const reconciliationFindings = financialReconciliationService.getFindings(false); // unresolved
    const warnings: FinancialReconciliationWarning[] = reconciliationFindings.map((f) => ({
      warningId: f.id,
      type: f.findingType === 'PROVIDER_MISMATCH' ? 'PAYOUT_STATUS_DISCREPANCY' : 'LEDGER_UNBALANCED',
      severity: f.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
      description: f.description,
      referenceId: f.referenceId || f.id || 'reconciliation-ref',
      tenantId: f.tenantId,
      detectedAt: f.detectedAt,
      reconciliationStage: 'Ledger',
    }));

    // Integrity check: payments vs ledger balance
    const reconciliationStatus = warnings.some((w) => w.severity === 'CRITICAL')
      ? 'DISCREPANCY_DETECTED'
      : warnings.length > 0
      ? 'WARNINGS_PRESENT'
      : 'BALANCED';

    return {
      period,
      currency,
      grossMarketplaceRevenueMinor,
      platformRevenueMinor,
      reporterShareMinor,
      sourceShareMinor,
      refundsMinor,
      chargebacksMinor,
      netRevenueMinor,
      pendingPayablesMinor,
      availablePayablesMinor,
      payoutsCompletedMinor,
      payoutsFailedMinor,
      payoutsReversedMinor,
      reconciliationWarnings: warnings,
      reconciliationStatus,
      dataFreshness: 'Updated just now from authoritative ledger',
    };
  }
}
