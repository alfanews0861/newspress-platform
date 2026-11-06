/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Payout Eligibility Engine
 * Phase 11 — Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine
 */

import { PayoutEligibility } from '../types/financePhase11';
import { payoutProfileService } from './payoutProfileService';
import { payableBalanceService } from './payableBalanceService';

export class PayoutEligibilityService {
  private defaultMinThresholdMinor = 10000; // ₹100 = 10000 paise

  setMinThresholdMinor(amountMinor: number) {
    if (amountMinor <= 0) throw new Error('Minimum threshold must be strictly positive.');
    this.defaultMinThresholdMinor = amountMinor;
  }

  getMinThresholdMinor(): number {
    return this.defaultMinThresholdMinor;
  }

  /**
   * Evaluates payout eligibility for a reporter or source organization owner.
   */
  evaluateEligibility(ownerId: string, requestedAmountMinor?: number, currency = 'INR'): PayoutEligibility {
    const now = new Date().toISOString();
    const reasons: string[] = [];

    const profile = payoutProfileService.getProfile(ownerId);
    if (!profile) {
      reasons.push('ERR_NO_PAYOUT_PROFILE: Payout profile not configured.');
    } else {
      if (profile.status !== 'ACTIVE') {
        reasons.push(`ERR_PROFILE_INACTIVE: Payout profile is ${profile.status}.`);
      }

      if (profile.verificationStatus !== 'VERIFIED' && profile.verificationStatus !== 'NOT_REQUIRED') {
        reasons.push(`ERR_VERIFICATION_PENDING: Payout profile verification status is ${profile.verificationStatus}.`);
      }

      if (profile.currency !== currency) {
        reasons.push(`ERR_CURRENCY_MISMATCH: Profile currency (${profile.currency}) does not match requested currency (${currency}).`);
      }
    }

    const balanceBreakdown = payableBalanceService.calculatePayableBalance(ownerId, currency);
    const availableMinor = balanceBreakdown.availablePayableBalanceMinor;

    const minThreshold = this.defaultMinThresholdMinor;

    if (availableMinor < minThreshold) {
      reasons.push(`ERR_BELOW_MIN_THRESHOLD: Available balance (${availableMinor} paise) is below minimum threshold (${minThreshold} paise).`);
    }

    if (requestedAmountMinor !== undefined) {
      if (requestedAmountMinor < minThreshold) {
        reasons.push(`ERR_REQUESTED_BELOW_MIN: Requested amount (${requestedAmountMinor} paise) is below minimum threshold (${minThreshold} paise).`);
      }
      if (requestedAmountMinor > availableMinor) {
        reasons.push(`ERR_INSUFFICIENT_FUNDS: Requested amount (${requestedAmountMinor} paise) exceeds available payable balance (${availableMinor} paise).`);
      }
    }

    if (balanceBreakdown.chargebacksMinor > 0 && availableMinor <= 0) {
      reasons.push('ERR_UNRESOLVED_CHARGEBACK: Outstanding chargeback holds prevent payout.');
    }

    const status = reasons.length === 0 ? 'ELIGIBLE' : 'INELIGIBLE';

    return {
      ownerId,
      status,
      availableBalanceMinor: availableMinor,
      minimumThresholdMinor: minThreshold,
      currency,
      reasons,
      checkedAt: now
    };
  }
}

export const payoutEligibilityService = new PayoutEligibilityService();
