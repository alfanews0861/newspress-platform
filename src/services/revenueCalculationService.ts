/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Revenue Calculation Engine
 * Phase 3 — News Marketplace, Licensing & Reporter Revenue Engine
 * 
 * Computes platform fees, reporter royalties, and newsroom organization splits.
 * Server-authoritative logic. Browser is never trusted for financial amounts.
 */

import { PlatformRevenueConfig } from '../types/marketplace';

export const DEFAULT_PLATFORM_REVENUE_CONFIG: PlatformRevenueConfig = {
  platformFeePercent: 20, // 20% platform infrastructure fee
  freelanceReporterSharePercent: 80, // 80% direct to freelance reporter (100% of net pool)
  staffReporterSharePercent: 50, // 50% of net pool to staff reporter
  sourceOrganizationSharePercent: 50, // 50% of net pool to publishing house/source org
  standardPricingTiers: [5, 10], // ₹5, ₹10 standard price points
  allowedPremiumPricingLimits: { min: 15, max: 2000 },
  minPayoutAmount: 100 // ₹100 minimum payout threshold
};

export interface RevenueSplitResult {
  grossAmount: number;
  platformFee: number;
  distributablePool: number;
  reporterShare: number;
  sourceOrganizationShare: number;
  currency: string;
  isFreelance: boolean;
}

export class RevenueCalculationService {
  private config: PlatformRevenueConfig = { ...DEFAULT_PLATFORM_REVENUE_CONFIG };

  /**
   * Sets or updates platform revenue configuration after strict mathematical validation.
   */
  setConfig(newConfig: Partial<PlatformRevenueConfig>): { success: boolean; error?: string } {
    const candidate: PlatformRevenueConfig = {
      ...this.config,
      ...newConfig
    };

    const validation = this.validateConfig(candidate);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    this.config = candidate;
    return { success: true };
  }

  getConfig(): PlatformRevenueConfig {
    return { ...this.config };
  }

  /**
   * Validates that revenue distribution configurations strictly balance to 100%.
   */
  validateConfig(config: PlatformRevenueConfig): { valid: boolean; error?: string } {
    if (config.platformFeePercent < 0 || config.platformFeePercent > 100) {
      return { valid: false, error: 'Platform fee percentage must be between 0% and 100%.' };
    }

    // For staff reporters, reporter share + organization share must total 100% of the distributable pool
    const staffTotal = config.staffReporterSharePercent + config.sourceOrganizationSharePercent;
    if (staffTotal !== 100) {
      return {
        valid: false,
        error: `Staff distribution shares must total exactly 100% of distributable pool (current sum: ${staffTotal}%).`
      };
    }

    if (config.standardPricingTiers.some(p => p <= 0)) {
      return { valid: false, error: 'Standard pricing tiers must all be strictly positive (> ₹0).' };
    }

    return { valid: true };
  }

  /**
   * Authoritatively computes revenue splits for any gross sale amount.
   * Invariant: platformFee + reporterShare + sourceOrganizationShare === grossAmount.
   */
  calculateSplit(params: {
    grossAmount: number;
    hasSourceOrganization: boolean;
    currency?: string;
  }): RevenueSplitResult {
    const { grossAmount, hasSourceOrganization, currency = 'INR' } = params;

    if (grossAmount <= 0) {
      throw new Error(`Gross sale amount must be strictly greater than 0 (received: ${grossAmount}).`);
    }

    // 1. Calculate platform fee
    // Use Math.round to maintain integer currency units (Rupees/cents)
    const platformFee = Math.round((grossAmount * this.config.platformFeePercent) / 100);
    const distributablePool = grossAmount - platformFee;

    let reporterShare = 0;
    let sourceOrganizationShare = 0;

    if (!hasSourceOrganization) {
      // Freelance / independent reporter receives 100% of the distributable pool
      reporterShare = distributablePool;
      sourceOrganizationShare = 0;
    } else {
      // Staff reporter + source newsroom split
      reporterShare = Math.round(
        (distributablePool * this.config.staffReporterSharePercent) / 100
      );
      sourceOrganizationShare = distributablePool - reporterShare;
    }

    // Mathematical conservation check
    const totalAllocated = platformFee + reporterShare + sourceOrganizationShare;
    if (totalAllocated !== grossAmount) {
      // Adjust any rounding delta onto reporterShare
      const delta = grossAmount - totalAllocated;
      reporterShare += delta;
    }

    return {
      grossAmount,
      platformFee,
      distributablePool,
      reporterShare,
      sourceOrganizationShare,
      currency,
      isFreelance: !hasSourceOrganization
    };
  }
}

export const revenueCalculationService = new RevenueCalculationService();
