/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Financial Reporting Engine
 * Phase 11 — Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine
 */

import { financialLedgerService } from './financialLedgerService';
import { payableBalanceService } from './payableBalanceService';
import { revenueRecognitionService } from './revenueRecognitionService';

export interface PlatformFinancialReport {
  grossMarketplaceSalesMinor: number;
  platformRevenueMinor: number;
  reporterPayableMinor: number;
  sourceOrgPayableMinor: number;
  totalRefundsMinor: number;
  totalChargebacksMinor: number;
  netPlatformRevenueMinor: number;
  currency: string;
  generatedAt: string;
}

export interface ReporterFinancialReport {
  reporterId: string;
  currency: string;
  grossEarnedMinor: number;
  pendingHoldMinor: number;
  availablePayableMinor: number;
  paidMinor: number;
  reversedMinor: number;
  salesCount: number;
  generatedAt: string;
}

export interface MarketplaceSalesBreakdownReport {
  totalListingsCount: number;
  totalCompletedPurchases: number;
  grossVolumeMinor: number;
  platformCommissionMinor: number;
  salesByLicenseType: Record<string, number>;
  salesByCategory: Record<string, number>;
  currency: string;
  generatedAt: string;
}

export class RevenueReportingService {
  /**
   * Generates platform-wide financial executive report derived directly from ledger.
   */
  generatePlatformReport(currency = 'INR'): PlatformFinancialReport {
    const entries = financialLedgerService.getEntries();
    const now = new Date().toISOString();

    let grossMarketplaceSalesMinor = 0;
    let platformRevenueMinor = 0;
    let reporterPayableMinor = 0;
    let sourceOrgPayableMinor = 0;
    let totalRefundsMinor = 0;
    let totalChargebacksMinor = 0;

    for (const entry of entries) {
      if (entry.status !== 'COMPLETED') continue;

      if (entry.direction === 'CREDIT') {
        if (entry.accountType === 'PLATFORM' && entry.transactionType === 'PLATFORM_FEE') {
          platformRevenueMinor += entry.amountMinor;
        } else if (entry.accountType === 'REPORTER' && entry.transactionType === 'ROYALTY_CREDIT') {
          reporterPayableMinor += entry.amountMinor;
          grossMarketplaceSalesMinor += entry.amountMinor;
        } else if (entry.accountType === 'SOURCE_ORGANIZATION' && entry.transactionType === 'SOURCE_CREDIT') {
          sourceOrgPayableMinor += entry.amountMinor;
          grossMarketplaceSalesMinor += entry.amountMinor;
        }
      } else if (entry.direction === 'DEBIT') {
        if (entry.transactionType === 'REFUND_DEBIT') {
          totalRefundsMinor += entry.amountMinor;
        } else if (entry.transactionType === 'CHARGEBACK_DEBIT') {
          totalChargebacksMinor += entry.amountMinor;
        }
      }
    }

    grossMarketplaceSalesMinor += platformRevenueMinor;
    const netPlatformRevenueMinor = platformRevenueMinor - totalRefundsMinor - totalChargebacksMinor;

    return {
      grossMarketplaceSalesMinor,
      platformRevenueMinor,
      reporterPayableMinor,
      sourceOrgPayableMinor,
      totalRefundsMinor,
      totalChargebacksMinor,
      netPlatformRevenueMinor,
      currency,
      generatedAt: now
    };
  }

  /**
   * Generates reporter-specific earnings and payout status report.
   */
  generateReporterReport(reporterId: string, currency = 'INR'): ReporterFinancialReport {
    const breakdown = payableBalanceService.calculatePayableBalance(reporterId, currency);
    const events = revenueRecognitionService.getAllEvents().filter(e => e.reporterId === reporterId);

    return {
      reporterId,
      currency,
      grossEarnedMinor: breakdown.grossEarnedMinor,
      pendingHoldMinor: breakdown.pendingHoldMinor,
      availablePayableMinor: breakdown.availablePayableBalanceMinor,
      paidMinor: breakdown.completedPayoutsMinor,
      reversedMinor: breakdown.refundsMinor + breakdown.chargebacksMinor + breakdown.reversalsMinor,
      salesCount: events.length,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generates marketplace sales breakdown by license type, category, etc.
   */
  generateMarketplaceBreakdownReport(currency = 'INR'): MarketplaceSalesBreakdownReport {
    const events = revenueRecognitionService.getAllEvents();
    const now = new Date().toISOString();

    let grossVolumeMinor = 0;
    let platformCommissionMinor = 0;
    const salesByLicenseType: Record<string, number> = {};
    const salesByCategory: Record<string, number> = {};

    for (const evt of events) {
      grossVolumeMinor += evt.grossAmountMinor;
      platformCommissionMinor += evt.platformFeeMinor;

      const license = (evt.metadata?.licenseType || 'STANDARD') as string;
      salesByLicenseType[license] = (salesByLicenseType[license] || 0) + 1;

      const category = (evt.metadata?.category || 'General') as string;
      salesByCategory[category] = (salesByCategory[category] || 0) + 1;
    }

    return {
      totalListingsCount: events.length,
      totalCompletedPurchases: events.length,
      grossVolumeMinor,
      platformCommissionMinor,
      salesByLicenseType,
      salesByCategory,
      currency,
      generatedAt: now
    };
  }
}

export const revenueReportingService = new RevenueReportingService();
