/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Marketplace, Licensing & Revenue Engine Domain Models
 * Phase 3 — News Marketplace, Licensing & Reporter Revenue Engine
 */

export type ListingType =
  | 'STANDARD'
  | 'PREMIUM'
  | 'EXCLUSIVE'
  | 'FEATURE'
  | 'INVESTIGATION';

export type PricingModel =
  | 'INDIVIDUAL_PURCHASE'
  | 'SUBSCRIPTION_ENTITLEMENT'
  | 'PREMIUM_PURCHASE'
  | 'EXCLUSIVE_PURCHASE';

export type ListingAvailability =
  | 'AVAILABLE'
  | 'LICENSED_EXCLUSIVE'
  | 'UNDER_OFFER'
  | 'WITHDRAWN'
  | 'ARCHIVED';

export type ListingStatus =
  | 'ACTIVE'
  | 'DRAFT'
  | 'SUSPENDED'
  | 'ARCHIVED';

export type LicenseType =
  | 'DIGITAL_ONLY'
  | 'PRINT_ONLY'
  | 'DIGITAL_AND_PRINT'
  | 'SINGLE_EDITION'
  | 'MULTI_EDITION'
  | 'REGIONAL'
  | 'NATIONAL'
  | 'EXCLUSIVE';

export type PurchaseStatus =
  | 'pending'
  | 'authorized'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'disputed';

export interface LicenseTerms {
  type: LicenseType;
  scope: string; // e.g., 'digital_web', 'print_broadsheet', 'regional_syndication'
  territory: string; // e.g., 'Nellore District', 'Andhra Pradesh', 'National', 'Worldwide'
  durationDays: number; // e.g. 7, 30, 365, or -1 for perpetual
  allowedMedia: string[];
  allowedEditions: number; // e.g. 1 for SINGLE_EDITION, -1 for unlimited
  exclusivity: boolean;
  resaleAllowed: boolean;
  derivativeEditingAllowed: boolean;
  attributionRequired: boolean;
}

export interface MarketplaceListing {
  listingId: string;
  newsId: string;
  reporterId: string;
  reporterName?: string;
  reporterByline?: string;
  sourceTenantId?: string;
  sourceTenantName?: string;
  title: string;
  shortDescription: string;
  category: string;
  district?: string;
  state?: string;
  publishedAt: string;
  listingType: ListingType;
  pricingModel: PricingModel;
  price: number; // e.g., 5, 10, 25, 50, 100 in INR
  currency: string; // 'INR'
  licenseOptions: LicenseType[];
  availability: ListingAvailability;
  status: ListingStatus;
  
  // Editorial and original reporting metrics
  wordCount?: number;
  hasPhotography?: boolean;
  photoCount?: number;
  originalityStatus?: string;
  originalityScorePercent?: number;

  // Commercial tracking
  viewsCount?: number;
  purchasesCount?: number;
  grossRevenue?: number;
  netRevenue?: number;

  createdAt: string;
  updatedAt: string;
}

export interface MarketplacePurchase {
  purchaseId: string;
  idempotencyKey: string;
  buyerTenantId: string;
  buyerTenantName?: string;
  buyerUserId: string;
  buyerUserName?: string;
  listingId: string;
  newsId: string;
  reporterId: string;
  reporterName?: string;
  sourceTenantId?: string;
  sourceTenantName?: string;
  licenseId: string;
  pricingModel: PricingModel;
  grossAmount: number;
  platformFee: number;
  reporterShare: number;
  sourceOrganizationShare: number;
  currency: string;
  status: PurchaseStatus;
  purchasedAt: string;
  entitlementId?: string;
  
  // Denormalized story metadata for fast buyer indexing
  articleTitle?: string;
  licenseType?: LicenseType;
}

export interface NewsLicense {
  licenseId: string;
  purchaseId?: string;
  listingId?: string;
  newsId: string;
  articleTitle: string;
  buyerTenantId: string;
  buyerTenantName?: string;
  buyerUserId: string;
  sellerReporterId: string;
  sellerReporterName?: string;
  sourceTenantId?: string;
  sellerTenantId?: string; // alias for sourceTenantId
  type: LicenseType;
  scope: string;
  territory: string;
  durationDays: number;
  allowedMedia: string[];
  allowedEditions: number;
  exclusivity: boolean;
  resaleAllowed: boolean;
  derivativeEditingAllowed: boolean;
  allowDerivativeEditing?: boolean; // alias for derivativeEditingAllowed
  attributionRequired: boolean;
  attributionRequirement?: boolean; // alias for attributionRequired
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  grantedAt: string;
  purchasedAt?: string;
  expiresAt?: string;
  pricePaidCents?: number;
}

export interface ExclusiveLock {
  lockId: string;
  newsId: string;
  listingId: string;
  buyerTenantId: string;
  territory: string;
  scope: string;
  validFrom: string;
  validUntil: string;
  active: boolean;
  purchaseId: string;
  createdAt: string;
}

export interface MarketplaceSubscriptionPlan {
  planId: string;
  name: string;
  monthlyPrice: number;
  currency: string;
  includedStandardNews: number; // e.g. 100, 250, 500
  premiumDiscountPercent: number; // e.g. 15
  allowedCategories: string[]; // ['*'] for all
  allowedRegions: string[]; // ['*'] for all
  rolloverPolicy: 'none' | 'rollover_one_month' | 'perpetual';
  validityDays: number;
  active: boolean;
}

export interface EntitlementRedemption {
  redemptionId: string;
  entitlementId: string;
  newsId: string;
  listingId: string;
  buyerTenantId: string;
  buyerUserId: string;
  redeemedAt: string;
  unitsUsed: number;
}

export interface MarketplaceEntitlement {
  entitlementId: string;
  subscriptionId: string;
  buyerTenantId: string;
  entitlementType: 'MONTHLY_STANDARD_NEWS_PACK';
  totalUnits: number;
  usedUnits: number;
  remainingUnits: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'exhausted' | 'expired';
  redemptions: EntitlementRedemption[];
}

export interface PlatformRevenueConfig {
  platformFeePercent: number; // e.g. 20%
  freelanceReporterSharePercent: number; // e.g. 80% (when no source org)
  staffReporterSharePercent: number; // e.g. 50%
  sourceOrganizationSharePercent: number; // e.g. 30%
  standardPricingTiers: number[]; // [5, 10]
  allowedPremiumPricingLimits: { min: number; max: number }; // min: 15, max: 1000
  minPayoutAmount: number; // e.g. 100
}

export type PayoutStatus =
  | 'requested'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'completed'
  | 'failed';

export interface PayoutRequest {
  payoutId: string;
  reporterId: string;
  reporterName?: string;
  requestedAmount: number;
  eligibleAmount: number;
  currency: string;
  status: PayoutStatus;
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  payoutMethod?: string;
}
