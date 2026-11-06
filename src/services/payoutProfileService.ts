/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Payout Profile & KYC Verification Service
 * Phase 11 — Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine
 */

import { PayoutProfile, PayoutOwnerType, VerificationStatus } from '../types/financePhase11';

export class PayoutProfileService {
  private profiles: Map<string, PayoutProfile> = new Map();

  constructor() {
    this.seedInitialProfiles();
  }

  private seedInitialProfiles() {
    const davidProfile: PayoutProfile = {
      id: 'pop_rep-david-okafor',
      tenantId: 'freelance_open',
      ownerType: 'REPORTER',
      ownerId: 'rep-david-okafor',
      legalName: 'David K. Okafor',
      displayName: 'David K. Okafor',
      country: 'IN',
      currency: 'INR',
      payoutMethod: 'UPI',
      UPIReference: 'david.okafor@okaxis',
      taxIdReference: 'PAN-ABCDE1234F',
      verificationStatus: 'VERIFIED',
      status: 'ACTIVE',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    };

    const sofiaProfile: PayoutProfile = {
      id: 'pop_rep-sofia-chen',
      tenantId: 'freelance_open',
      ownerType: 'REPORTER',
      ownerId: 'rep-sofia-chen',
      legalName: 'Sofia Chen',
      displayName: 'Sofia Chen',
      country: 'IN',
      currency: 'INR',
      payoutMethod: 'BANK_TRANSFER',
      bankAccountToken: 'tok_bank_acc_sofia_9876',
      taxIdReference: 'PAN-XYZ987654K',
      verificationStatus: 'VERIFIED',
      status: 'ACTIVE',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    };

    this.profiles.set(davidProfile.ownerId, davidProfile);
    this.profiles.set(sofiaProfile.ownerId, sofiaProfile);
  }

  /**
   * Upserts a payout profile with tokenized credentials.
   * Invariant: Raw passwords, CVVs, or full account secrets are NEVER stored in Firestore.
   */
  saveProfile(params: {
    tenantId: string;
    ownerType: PayoutOwnerType;
    ownerId: string;
    legalName: string;
    displayName: string;
    country?: string;
    currency?: string;
    payoutMethod: 'BANK_TRANSFER' | 'UPI' | 'STRIPE_CONNECT' | 'RAZORPAY_X';
    bankAccountToken?: string;
    UPIReference?: string;
    taxIdReference?: string;
  }): PayoutProfile {
    const {
      tenantId,
      ownerType,
      ownerId,
      legalName,
      displayName,
      country = 'IN',
      currency = 'INR',
      payoutMethod,
      bankAccountToken,
      UPIReference,
      taxIdReference
    } = params;

    const existing = this.profiles.get(ownerId);
    const now = new Date().toISOString();

    const profile: PayoutProfile = {
      id: existing ? existing.id : `pop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      ownerType,
      ownerId,
      legalName,
      displayName,
      country,
      currency,
      payoutMethod,
      bankAccountToken,
      UPIReference,
      taxIdReference,
      verificationStatus: existing ? existing.verificationStatus : 'VERIFIED',
      status: 'ACTIVE',
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };

    this.profiles.set(ownerId, profile);
    return profile;
  }

  getProfile(ownerId: string): PayoutProfile | undefined {
    return this.profiles.get(ownerId);
  }

  updateVerificationStatus(ownerId: string, status: VerificationStatus): PayoutProfile {
    const profile = this.profiles.get(ownerId);
    if (!profile) throw new Error(`Payout profile not found for owner ${ownerId}`);

    profile.verificationStatus = status;
    profile.updatedAt = new Date().toISOString();
    return profile;
  }
}

export const payoutProfileService = new PayoutProfileService();
