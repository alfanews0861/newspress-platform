/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Marketplace Purchase Flow & Idempotency Service
 * Phase 12 — Public Marketplace, Publisher Acquisition Portal & Licensed Content Workspace
 */

import { MarketplaceListing, LicenseType, MarketplacePurchase, NewsLicense } from '../types/marketplace';
import { marketplaceService } from './marketplaceService';
import { PaymentProviderFactory } from './payment/PaymentProviderFactory';
import { exclusivityValidationService } from './exclusivityValidationService';
import { auditService } from './auditService';

export interface PurchaseCheckoutRequest {
  checkoutId: string;
  listingId: string;
  buyerTenantId: string;
  buyerTenantName?: string;
  buyerUserId: string;
  buyerUserName?: string;
  selectedLicense: LicenseType;
  territory?: string;
  durationDays?: number;
  paymentMethod?: 'mock' | 'stripe' | 'razorpay';
  paymentToken?: string;
  useSubscriptionEntitlement?: boolean;
}

export interface PurchaseValidationResult {
  valid: boolean;
  reasons: string[];
  listing?: MarketplaceListing;
  canUseSubscription: boolean;
  duplicateWarning?: string;
}

export class MarketplacePurchaseFlowService {
  /**
   * Generates deterministic idempotency key for purchase requests.
   */
  public generateIdempotencyKey(tenantId: string, listingId: string, checkoutId: string): string {
    return `marketplace_purchase_${tenantId}_${listingId}_${checkoutId}`;
  }

  /**
   * Validates buyer eligibility, listing status, duplicate purchases, and exclusivity prior to checkout.
   */
  public validatePurchase(req: PurchaseCheckoutRequest): PurchaseValidationResult {
    const reasons: string[] = [];
    const listing = marketplaceService.getListingById(req.listingId);

    if (!listing) {
      return { valid: false, reasons: ['Listing not found.'], canUseSubscription: false };
    }

    if (listing.status !== 'ACTIVE') {
      reasons.push(`Listing is not active (status: ${listing.status}).`);
    }

    if (listing.availability === 'WITHDRAWN' || listing.availability === 'ARCHIVED') {
      reasons.push(`Listing is ${listing.availability} and unavailable for acquisition.`);
    }

    if (listing.price <= 0) {
      reasons.push('Invalid listing price. Free stories are prohibited on the marketplace.');
    }

    // Duplicate purchase protection
    const existingLicenses = marketplaceService.getLicenses(req.buyerTenantId);
    const activeLicenseForStory = existingLicenses.find(
      lic => lic.listingId === req.listingId && lic.status === 'ACTIVE'
    );

    let duplicateWarning: string | undefined = undefined;

    if (activeLicenseForStory) {
      if (
        activeLicenseForStory.type === 'DIGITAL_AND_PRINT' ||
        activeLicenseForStory.type === 'EXCLUSIVE' ||
        activeLicenseForStory.type === req.selectedLicense
      ) {
        reasons.push(
          `Organization already holds an active "${activeLicenseForStory.type}" license for this story. Unnecessary duplicate purchase blocked.`
        );
      } else {
        duplicateWarning = `Note: Organization already holds a "${activeLicenseForStory.type}" license for this story.`;
      }
    }

    // Exclusivity collision check
    if (req.selectedLicense === 'EXCLUSIVE') {
      const now = new Date();
      const validFrom = now.toISOString();
      const durationDays = req.durationDays || 7;
      const validUntil = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      const collision = exclusivityValidationService.checkCollision({
        newsId: listing.newsId,
        territory: req.territory || listing.district || 'National',
        validFrom,
        validUntil,
        candidateBuyerTenantId: req.buyerTenantId
      });

      if (collision.hasCollision) {
        reasons.push(`Exclusive rights collision: ${collision.reason}`);
      }
    }

    // Subscription entitlement availability
    const entitlement = marketplaceService.getTenantEntitlement(req.buyerTenantId);
    const canUseSubscription = Boolean(
      listing.listingType === 'STANDARD' &&
      entitlement &&
      entitlement.status === 'active' &&
      entitlement.remainingUnits > 0
    );

    return {
      valid: reasons.length === 0,
      reasons,
      listing,
      canUseSubscription,
      duplicateWarning
    };
  }

  /**
   * Executes multi-step payment and content entitlement acquisition.
   */
  public async executePurchase(req: PurchaseCheckoutRequest): Promise<{
    purchase: MarketplacePurchase;
    license: NewsLicense;
  }> {
    const validation = this.validatePurchase(req);
    if (!validation.valid) {
      throw new Error(`Purchase Preflight Failed: ${validation.reasons.join(' ')}`);
    }

    const idempotencyKey = this.generateIdempotencyKey(req.buyerTenantId, req.listingId, req.checkoutId);
    const listing = validation.listing!;

    // 1. If subscription redemption requested and available
    if (req.useSubscriptionEntitlement && validation.canUseSubscription) {
      const redemptionRes = await marketplaceService.redeemSubscriptionEntitlement({
        idempotencyKey,
        buyerTenantId: req.buyerTenantId,
        buyerTenantName: req.buyerTenantName,
        buyerUserId: req.buyerUserId,
        buyerUserName: req.buyerUserName,
        listingId: req.listingId
      });

      return {
        purchase: {
          purchaseId: redemptionRes.redemption.redemptionId,
          idempotencyKey,
          buyerTenantId: req.buyerTenantId,
          buyerUserId: req.buyerUserId,
          listingId: req.listingId,
          newsId: listing.newsId,
          reporterId: listing.reporterId,
          licenseId: redemptionRes.license.licenseId,
          pricingModel: 'SUBSCRIPTION_ENTITLEMENT',
          grossAmount: 0,
          platformFee: 0,
          reporterShare: 0,
          sourceOrganizationShare: 0,
          currency: listing.currency,
          status: 'completed',
          purchasedAt: redemptionRes.redemption.redeemedAt,
          articleTitle: listing.title,
          licenseType: redemptionRes.license.type
        },
        license: redemptionRes.license
      };
    }

    // 2. Otherwise process payment via Phase 7 Payment Provider
    const providerType = req.paymentMethod === 'stripe' ? 'STRIPE' : req.paymentMethod === 'razorpay' ? 'RAZORPAY' : 'MOCK';
    const paymentProvider = PaymentProviderFactory.getProvider(providerType);

    // Create checkout session / customer
    await paymentProvider.createCustomer({
      tenantId: req.buyerTenantId,
      name: req.buyerTenantName || 'Buyer Tenant',
      email: `${req.buyerUserId}@newspress.local`
    });

    // 3. Complete purchase & license creation
    const purchaseResult = await marketplaceService.purchaseNews({
      idempotencyKey,
      listingId: req.listingId,
      buyerTenantId: req.buyerTenantId,
      buyerTenantName: req.buyerTenantName,
      buyerUserId: req.buyerUserId,
      buyerUserName: req.buyerUserName,
      selectedLicense: req.selectedLicense,
      territory: req.territory,
      durationDays: req.durationDays
    });

    return {
      purchase: purchaseResult.purchase,
      license: purchaseResult.license
    };
  }
}

export const marketplacePurchaseFlowService = new MarketplacePurchaseFlowService();
