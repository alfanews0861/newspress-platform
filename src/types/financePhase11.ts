/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 11 — Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine Types
 */

export type FinancialAccountType =
  | 'PLATFORM'
  | 'REPORTER'
  | 'SOURCE_ORGANIZATION'
  | 'PUBLISHER'
  | 'REFUND_RESERVE'
  | 'ADJUSTMENT';

export type FinancialDirection = 'CREDIT' | 'DEBIT';

export type RevenueEventType =
  | 'PURCHASE_CONFIRMED'
  | 'SUBSCRIPTION_CONTENT_CONSUMED'
  | 'REFUND'
  | 'PARTIAL_REFUND'
  | 'CHARGEBACK'
  | 'REVERSAL'
  | 'ADJUSTMENT';

export type PaymentConfirmationStatus =
  | 'CREATED'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'CHARGEBACK'
  | 'CANCELLED';

export type RoundingPolicy = 'ROUND_REPORTER' | 'ROUND_PLATFORM' | 'ROUND_SOURCE';

export type PayoutOwnerType = 'REPORTER' | 'SOURCE_ORGANIZATION';

export type PayoutMethod = 'BANK_TRANSFER' | 'UPI' | 'STRIPE_CONNECT' | 'RAZORPAY_X';

export type VerificationStatus = 'NOT_REQUIRED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

export type PayoutProfileStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type PayoutRequestStatus =
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REVERSED';

export type PayoutReservationStatus = 'RESERVED' | 'DISBURSED' | 'RELEASED';

export type PayoutCallbackEventType =
  | 'PAYOUT_CREATED'
  | 'PAYOUT_PROCESSING'
  | 'PAYOUT_COMPLETED'
  | 'PAYOUT_FAILED'
  | 'PAYOUT_REVERSED';

export type ReconciliationFindingType =
  | 'MISSING_PAYMENT'
  | 'MISSING_REVENUE_EVENT'
  | 'DUPLICATE_REVENUE'
  | 'LEDGER_IMBALANCE'
  | 'PAYOUT_MISMATCH'
  | 'PROVIDER_MISMATCH'
  | 'UNRESOLVED_REFUND'
  | 'UNRESOLVED_CHARGEBACK';

export interface MarketplaceRevenueEvent {
  id: string;
  tenantId: string;
  purchaseId: string;
  marketplaceListingId: string;
  newsArticleId: string;
  reporterId: string;
  sourceOrganizationId?: string;
  publisherTenantId: string;
  eventType: RevenueEventType;
  grossAmountMinor: number;
  currency: string;
  taxAmountMinor: number;
  platformFeeMinor: number;
  reporterShareMinor: number;
  sourceShareMinor: number;
  netDistributableMinor: number;
  paymentProvider: string;
  providerTransactionId: string;
  idempotencyKey: string;
  occurredAt: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface ShareRecipientConfig {
  name: string;
  percent: number;
  accountId: string;
}

export interface RevenueSplitConfiguration {
  id: string;
  tenantId?: string;
  listingId?: string;
  sourceOrganizationId?: string;
  reporterId?: string;
  version: number;
  reporterPercent: number;
  sourcePercent: number;
  platformPercent: number;
  otherShares?: ShareRecipientConfig[];
  roundingPolicy: RoundingPolicy;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RevenueSplitSnapshot {
  id: string;
  tenantId: string;
  purchaseId: string;
  configurationId: string;
  configurationVersion: number;
  reporterPercent: number;
  sourcePercent: number;
  platformPercent: number;
  reporterAmountMinor: number;
  sourceAmountMinor: number;
  platformAmountMinor: number;
  roundingAdjustmentMinor: number;
  currency: string;
  effectiveAt: string;
  createdAt: string;
}

export interface FinancialLedgerEntry {
  id: string;
  tenantId: string;
  accountId: string;
  accountType: FinancialAccountType;
  direction: FinancialDirection;
  amountMinor: number;
  currency: string;
  transactionType: string;
  referenceType: 'PURCHASE' | 'PAYOUT_REQUEST' | 'REFUND' | 'SUBSCRIPTION' | 'ADJUSTMENT' | 'CHARGEBACK';
  referenceId: string;
  purchaseId?: string;
  marketplaceListingId?: string;
  providerTransactionId?: string;
  idempotencyKey: string;
  status: 'COMPLETED' | 'PENDING' | 'REVERSED' | 'CANCELLED';
  occurredAt: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface PayoutProfile {
  id: string;
  tenantId: string;
  ownerType: PayoutOwnerType;
  ownerId: string;
  legalName: string;
  displayName: string;
  country: string;
  currency: string;
  payoutMethod: PayoutMethod;
  bankAccountToken?: string;
  UPIReference?: string;
  taxIdReference?: string;
  verificationStatus: VerificationStatus;
  status: PayoutProfileStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutEligibility {
  ownerId: string;
  status: 'ELIGIBLE' | 'INELIGIBLE';
  availableBalanceMinor: number;
  minimumThresholdMinor: number;
  currency: string;
  reasons: string[];
  checkedAt: string;
}

export interface PayoutRequestPhase11 {
  id: string;
  tenantId: string;
  ownerType: PayoutOwnerType;
  ownerId: string;
  amountMinor: number;
  currency: string;
  payoutProfileId: string;
  requestedAt: string;
  requestedBy: string;
  status: PayoutRequestStatus;
  eligibilitySnapshotId?: string;
  ledgerReservationId?: string;
  provider: 'MOCK' | 'RAZORPAY_X' | 'STRIPE_CONNECT';
  providerPayoutId?: string;
  failureReason?: string;
  approvedAt?: string;
  approvedBy?: string;
  submittedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutReservation {
  id: string;
  tenantId: string;
  payoutRequestId: string;
  ownerId: string;
  reservedAmountMinor: number;
  currency: string;
  status: PayoutReservationStatus;
  reservedAt: string;
  updatedAt: string;
}

export interface FinancialReconciliationFinding {
  id: string;
  findingType: ReconciliationFindingType;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  referenceId?: string;
  tenantId?: string;
  detectedAt: string;
  resolved: boolean;
  resolutionNotes?: string;
}

export interface SubscriptionAllocationConfig {
  id: string;
  tenantId: string;
  perArticleAllocationMinor: number;
  currency: string;
  active: boolean;
}

export interface FinancialAuditEvent {
  id: string;
  tenantId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  eventType: string;
  referenceType: string;
  referenceId: string;
  amountMinor?: number;
  currency?: string;
  reason?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}
