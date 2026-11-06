/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 7 — Publisher Subscription, Billing, Entitlements & Usage Types
 */

import { PublishingPlanId, AIModelTier } from './editorialAi';

export type { PublishingPlanId, AIModelTier };

export type LedgerTransactionType =
  | 'SALE'
  | 'PLATFORM_FEE'
  | 'REPORTER_EARNING'
  | 'ORGANIZATION_EARNING'
  | 'SUBSCRIPTION_REDEMPTION'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'PAYOUT_PENDING'
  | 'PAYOUT_COMPLETED';

export interface LedgerTransaction {
  ledgerId: string;
  relatedPurchaseId?: string;
  relatedListingId?: string;
  relatedNewsId?: string;
  actorId: string;
  beneficiaryId: string;
  beneficiaryType: 'reporter' | 'organization' | 'platform' | 'buyer';
  amount: number;
  currency: string; // 'INR' | 'UNITS'
  direction: 'credit' | 'debit';
  transactionType: LedgerTransactionType;
  status: 'completed' | 'pending' | 'reversed';
  description: string;
  createdAt: string;
}

export type BillingInterval = 'MONTHLY' | 'ANNUAL';

export interface ReporterWallet {
  walletId: string;
  reporterId: string;
  userId: string;
  grossSales: number;
  platformFees: number;
  netEarnings: number;
  pendingEarnings: number;
  availableBalance: number;
  lifetimeEarnings: number;
  salesCount: number;
  currency: string;
  payoutMethodStatus: 'not_configured' | 'verified' | 'action_required';
  lastPayoutDate?: string;
  updatedAt: string;
}

export interface Subscription {
  subscriptionId: string;
  tenantId: string;
  planId: PublishingPlanId;
  planName?: string;
  status: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  seatsUsed?: number;
  seatsAllocated?: number;
  monthlyPriceCents?: number;
  currency?: string;
  billingCycleAnchor?: string;
  editionsUsedThisCycle?: number;
  editionsPerMonthLimit?: number;
  createdAt: string;
  updatedAt: string;
}

export type PlanStatus = 'ACTIVE' | 'INACTIVE' | 'DEPRECATED' | 'DRAFT';

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'GRACE_PERIOD'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'SUSPENDED';

export type OveragePolicy = 'BLOCK' | 'ALLOW' | 'METERED';

export type PaymentProviderType = 'MOCK' | 'RAZORPAY' | 'STRIPE';

export type SupportLevel = 'COMMUNITY' | 'STANDARD' | 'PRIORITY' | 'DEDICATED';

export type PriorityLevel = 'NORMAL' | 'HIGH' | 'URGENT';

export interface PlanLimits {
  staffMemberLimit: number; // e.g. 3, 10, 50, -1 for unlimited
  reporterLimit: number; // e.g. 5, 25, 100
  editionLimit: number; // e.g. 2, 20, 100 per month
  monthlyNewsProcessingLimit: number; // e.g. 50, 500, 5000
  monthlyAIUsageLimit: number; // e.g. 0, 500, 2500 operations
  storageLimitMb: number; // e.g. 1000 (1GB), 20000 (20GB), 100000 (100GB)
  imageProcessingLimit: number; // e.g. 10, 100, 1000 per month
}

export interface PlanFeatures {
  aiTier: AIModelTier; // NONE, LIGHT, ADVANCED
  generativeAiAllowed: boolean;
  marketplaceAccess: boolean;
  newspaperGeneration: boolean;
  printPdfGeneration: boolean;
  digitalPdfGeneration: boolean;
  customBranding: boolean;
  headlineAssistant: boolean;
  summaryGeneration: boolean;
  copyFittingSuggestions: boolean;
  copyRestructuring: boolean;
  captionAssistance: boolean;
  sectionClassification: boolean;
  prioritySuggestions: boolean;
  intelligentPhotoSelection: boolean;
  imageEnhancement: boolean;
  supportLevel: SupportLevel;
  priorityLevel: PriorityLevel;
}

export interface PlanRecord {
  planId: PublishingPlanId;
  version: number;
  name: string;
  description: string;
  status: PlanStatus;
  billingInterval: BillingInterval;
  currency: string; // e.g. 'INR', 'USD'
  price: number; // e.g. 0, 4999, 14999
  trialDays: number; // e.g. 0, 14
  features: PlanFeatures;
  limits: PlanLimits;
  createdAt: string;
  updatedAt: string;
}

export interface PlanVersion {
  versionId: string;
  planId: PublishingPlanId;
  version: number;
  effectiveFrom: string;
  effectiveTo?: string;
  snapshot: PlanRecord;
  createdBy: string;
}

export interface SubscriptionEntitlementSnapshot {
  snapshotId: string;
  tenantId: string;
  subscriptionId: string;
  planId: PublishingPlanId;
  planVersion: number;
  features: PlanFeatures;
  limits: PlanLimits;
  capturedAt: string;
}

export interface PublisherSubscription {
  subscriptionId: string;
  tenantId: string;
  planId: PublishingPlanId;
  planVersion: number;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  currency: string;
  price: number;
  provider: PaymentProviderType;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart?: string;
  trialEnd?: string;
  gracePeriodStart?: string;
  gracePeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  endedAt?: string;
  overagePolicy: OveragePolicy;
  remediationRequired?: boolean;
  remediationReason?: string;
  pendingDowngradePlanId?: PublishingPlanId;
  createdAt: string;
  updatedAt: string;
}

export type UsageMetric =
  | 'AI_HEADLINE'
  | 'AI_SUMMARY'
  | 'AI_COPY_EDIT'
  | 'AI_RESTRUCTURE'
  | 'AI_CAPTION'
  | 'AI_SECTION_CLASSIFICATION'
  | 'AI_PHOTO_ANALYSIS'
  | 'IMAGE_ENHANCEMENT'
  | 'PDF_GENERATION'
  | 'STORAGE_BYTES'
  | 'NEWS_PROCESSED'
  | 'EDITION_CREATED';

export interface UsageRecord {
  usageId: string;
  tenantId: string;
  subscriptionId: string;
  planId: PublishingPlanId;
  metric: UsageMetric;
  quantity: number;
  unit: string; // e.g., 'OPERATIONS', 'BYTES', 'EDITIONS', 'ARTICLES'
  sourceEntityType?: string;
  sourceEntityId?: string;
  provider?: string;
  model?: string;
  timestamp: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export type InvoiceStatus = 'DRAFT' | 'OPEN' | 'PAID' | 'FAILED' | 'VOID' | 'REFUNDED';

export interface InvoiceLineItem {
  itemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceTaxDetail {
  taxType: string; // e.g. 'GST', 'IGST', 'CGST', 'SGST', 'VAT'
  ratePercent: number;
  amount: number;
}

export interface Invoice {
  invoiceId: string;
  tenantId: string;
  subscriptionId: string;
  provider: PaymentProviderType;
  providerInvoiceId?: string;
  invoiceNumber: string;
  currency: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  taxDetails: InvoiceTaxDetail[];
  discount: number;
  total: number;
  status: InvoiceStatus;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
  invoiceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaxConfiguration {
  taxConfigId: string;
  taxType: string; // 'GST', 'VAT', 'SALES_TAX'
  ratePercent: number; // e.g., 18
  country: string; // e.g., 'IN'
  state?: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

export type EntitlementGrantSource = 'ADMIN' | 'PROMOTION' | 'PARTNER' | 'MIGRATION' | 'COMPENSATION';

export interface EntitlementGrant {
  grantId: string;
  tenantId: string;
  planId?: PublishingPlanId;
  source: EntitlementGrantSource;
  reason: string;
  grantedBy: string;
  startsAt: string;
  endsAt: string;
  features?: Partial<PlanFeatures>;
  limits?: Partial<PlanLimits>;
  createdAt: string;
}

export interface PaymentTransaction {
  transactionId: string;
  tenantId: string;
  subscriptionId: string;
  invoiceId?: string;
  provider: PaymentProviderType;
  providerTransactionId: string;
  amount: number;
  currency: string;
  status: 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
  paymentMethod: string;
  errorMessage?: string;
  createdAt: string;
}

export interface PaymentWebhookEvent {
  webhookEventId: string;
  provider: PaymentProviderType;
  providerEventId: string;
  eventType: string;
  signatureVerified: boolean;
  receivedAt: string;
  processedAt?: string;
  processingStatus: 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'DUPLICATE';
  payloadHash: string;
  attemptCount: number;
  errorCode?: string;
  payload: any;
}

export type BillingAuditEventType =
  | 'PLAN_CREATED'
  | 'PLAN_VERSION_CREATED'
  | 'PLAN_ACTIVATED'
  | 'PLAN_DEACTIVATED'
  | 'SUBSCRIPTION_CREATED'
  | 'SUBSCRIPTION_ACTIVATED'
  | 'SUBSCRIPTION_RENEWED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'SUBSCRIPTION_PAUSED'
  | 'SUBSCRIPTION_RESUMED'
  | 'PAYMENT_CAPTURED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUNDED'
  | 'INVOICE_CREATED'
  | 'INVOICE_PAID'
  | 'ENTITLEMENT_GRANTED'
  | 'ENTITLEMENT_REVOKED'
  | 'USAGE_LIMIT_REACHED'
  | 'PLAN_UPGRADED'
  | 'PLAN_DOWNGRADED'
  | 'TRIAL_STARTED'
  | 'TRIAL_EXPIRED';

export interface BillingAuditEvent {
  auditId: string;
  tenantId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: BillingAuditEventType;
  entityType: string;
  entityId: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  timestamp: string;
}
