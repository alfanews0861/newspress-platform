/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Mock Payout Provider
 * Phase 11 — Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine
 */

import { IPayoutProvider, PayoutCreateResult, PayoutStatusResult } from './payoutProvider';

export class MockPayoutProvider implements IPayoutProvider {
  public providerName = 'MOCK';
  private payouts: Map<string, PayoutStatusResult> = new Map();

  async createPayout(params: {
    payoutRequestId: string;
    ownerId: string;
    amountMinor: number;
    currency: string;
    payoutMethod: string;
    idempotencyKey: string;
    payoutProfileRef?: string;
    narration?: string;
  }): Promise<PayoutCreateResult> {
    const { payoutRequestId, amountMinor, currency } = params;

    // Simulate validation
    if (amountMinor <= 0) {
      return {
        success: false,
        status: 'FAILED',
        failureReason: 'Invalid payout amount minor.'
      };
    }

    const providerPayoutId = `mock_pout_${payoutRequestId}_${Date.now()}`;
    const statusResult: PayoutStatusResult = {
      providerPayoutId,
      status: 'COMPLETED',
      completedAt: new Date().toISOString()
    };

    this.payouts.set(providerPayoutId, statusResult);

    return {
      success: true,
      providerPayoutId,
      status: 'COMPLETED',
      rawResponse: { provider: 'MOCK', amountMinor, currency, providerPayoutId }
    };
  }

  async getPayoutStatus(providerPayoutId: string): Promise<PayoutStatusResult> {
    const found = this.payouts.get(providerPayoutId);
    if (!found) {
      return {
        providerPayoutId,
        status: 'FAILED',
        failureReason: 'Payout transaction not found on Mock Provider.'
      };
    }
    return found;
  }

  async cancelPayout(providerPayoutId: string, reason?: string): Promise<{ success: boolean; message?: string }> {
    const found = this.payouts.get(providerPayoutId);
    if (found) {
      found.status = 'REVERSED';
      found.failureReason = reason || 'Cancelled by admin';
      return { success: true, message: 'Payout cancelled on Mock Provider.' };
    }
    return { success: false, message: 'Payout not found.' };
  }
}

export const mockPayoutProvider = new MockPayoutProvider();
