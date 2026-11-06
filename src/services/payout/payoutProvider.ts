/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Payout Provider Abstraction Interface
 * Phase 11 — Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine
 */

export interface PayoutCreateResult {
  success: boolean;
  providerPayoutId?: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  failureReason?: string;
  rawResponse?: any;
}

export interface PayoutStatusResult {
  providerPayoutId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  failureReason?: string;
  completedAt?: string;
}

export interface IPayoutProvider {
  providerName: string;
  createPayout(params: {
    payoutRequestId: string;
    ownerId: string;
    amountMinor: number;
    currency: string;
    payoutMethod: string;
    idempotencyKey: string;
    payoutProfileRef?: string;
    narration?: string;
  }): Promise<PayoutCreateResult>;

  getPayoutStatus(providerPayoutId: string): Promise<PayoutStatusResult>;

  cancelPayout(providerPayoutId: string, reason?: string): Promise<{ success: boolean; message?: string }>;
}
