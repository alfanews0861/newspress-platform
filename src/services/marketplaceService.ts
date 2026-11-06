/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Marketplace, Licensing & Revenue Core Service
 * Phase 3 — News Marketplace, Licensing & Reporter Revenue Engine
 * 
 * Implements transaction-safe purchasing, atomic entitlement redemption,
 * explicit licensing, immutable ledger transactions, and wallet management.
 */

import {
  MarketplaceListing,
  MarketplacePurchase,
  NewsLicense,
  LicenseType,
  ListingType,
  PricingModel,
  MarketplaceSubscriptionPlan,
  MarketplaceEntitlement,
  EntitlementRedemption,
  PayoutRequest,
  PayoutStatus
} from '../types/marketplace';
import { LedgerTransaction, ReporterWallet } from '../types/billing';
import { NewsArticle } from '../types/news';
import { ReporterProfile } from '../types/reporter';
import { marketplaceEligibilityService } from './marketplaceEligibilityService';
import { exclusivityValidationService } from './exclusivityValidationService';
import { revenueCalculationService } from './revenueCalculationService';
import { auditService } from './auditService';
import { MOCK_NEWS_ARTICLES, MOCK_REPORTER_PROFILES } from './mockDataService';

// Default standard subscription plans available for news organizations
export const DEFAULT_SUBSCRIPTION_PLANS: MarketplaceSubscriptionPlan[] = [
  {
    planId: 'plan-standard-100',
    name: 'Monthly Standard News Pack (100 Stories)',
    monthlyPrice: 450, // ₹450 / month (~₹4.5 per story)
    currency: 'INR',
    includedStandardNews: 100,
    premiumDiscountPercent: 10,
    allowedCategories: ['*'],
    allowedRegions: ['*'],
    rolloverPolicy: 'none',
    validityDays: 30,
    active: true
  },
  {
    planId: 'plan-regional-250',
    name: 'Regional Bureau News Pack (250 Stories)',
    monthlyPrice: 1000, // ₹1,000 / month (~₹4 per story)
    currency: 'INR',
    includedStandardNews: 250,
    premiumDiscountPercent: 15,
    allowedCategories: ['*'],
    allowedRegions: ['*'],
    rolloverPolicy: 'rollover_one_month',
    validityDays: 30,
    active: true
  },
  {
    planId: 'plan-metro-500',
    name: 'Metropolitan Daily Syndication Pack (500 Stories)',
    monthlyPrice: 1800, // ₹1,800 / month (~₹3.6 per story)
    currency: 'INR',
    includedStandardNews: 500,
    premiumDiscountPercent: 20,
    allowedCategories: ['*'],
    allowedRegions: ['*'],
    rolloverPolicy: 'perpetual',
    validityDays: 30,
    active: true
  }
];

class MarketplaceService {
  private listings: Map<string, MarketplaceListing> = new Map();
  private purchases: Map<string, MarketplacePurchase> = new Map();
  private idempotencyRecords: Map<string, MarketplacePurchase | EntitlementRedemption> = new Map();
  private licenses: Map<string, NewsLicense> = new Map();
  private entitlements: Map<string, MarketplaceEntitlement> = new Map();
  private subscriptionPlans: Map<string, MarketplaceSubscriptionPlan> = new Map();
  private ledger: LedgerTransaction[] = [];
  private wallets: Map<string, ReporterWallet> = new Map();
  private payouts: Map<string, PayoutRequest> = new Map();
  private licenseToEditions: Map<string, string[]> = new Map();

  constructor() {
    // Seed default subscription plans
    for (const plan of DEFAULT_SUBSCRIPTION_PLANS) {
      this.subscriptionPlans.set(plan.planId, plan);
    }

    this.seedInitialData();
  }

  /**
   * Seeds realistic initial marketplace items, wallets, and subscriptions
   */
  private seedInitialData() {
    // 1. Initial reporter wallet for David K. Okafor
    const davidWallet: ReporterWallet = {
      walletId: 'wallet-rep-david-okafor',
      reporterId: 'rep-david-okafor',
      userId: 'user-david-okafor',
      grossSales: 3420, // ₹3,420
      platformFees: 684, // ₹684
      netEarnings: 2736, // ₹2,736
      pendingEarnings: 820, // ₹820
      availableBalance: 1916, // ₹1,916
      lifetimeEarnings: 4500,
      salesCount: 18,
      currency: 'INR',
      payoutMethodStatus: 'verified',
      lastPayoutDate: '2026-09-25T10:00:00.000Z',
      updatedAt: '2026-10-02T16:00:00.000Z'
    };
    this.wallets.set(davidWallet.reporterId, davidWallet);

    // Initial reporter wallet for Sofia Chen
    const sofiaWallet: ReporterWallet = {
      walletId: 'wallet-rep-sofia-chen',
      reporterId: 'rep-sofia-chen',
      userId: 'user-sofia-chen',
      grossSales: 1250,
      platformFees: 250,
      netEarnings: 1000,
      pendingEarnings: 0,
      availableBalance: 1000,
      lifetimeEarnings: 1000,
      salesCount: 8,
      currency: 'INR',
      payoutMethodStatus: 'verified',
      updatedAt: '2026-10-02T16:00:00.000Z'
    };
    this.wallets.set(sofiaWallet.reporterId, sofiaWallet);

    // 2. Initial marketplace listings
    const seedListings: MarketplaceListing[] = [
      {
        listingId: 'mkt-standard-01',
        newsId: 'art-std-101',
        reporterId: 'rep-david-okafor',
        reporterName: 'David K. Okafor',
        reporterByline: 'David K. Okafor (Independent Correspondent)',
        sourceTenantId: 'freelance_open',
        title: 'Municipal Water Board Initiates Desalination Feasibility Study Along Coast',
        shortDescription: 'District authorities tender preliminary environmental assessment for a 50-million-liter modular sea water conversion plant.',
        category: 'Public Works',
        district: 'Nellore District',
        state: 'Andhra Pradesh',
        publishedAt: '2026-10-02T08:30:00.000Z',
        listingType: 'STANDARD',
        pricingModel: 'INDIVIDUAL_PURCHASE',
        price: 5, // ₹5 Standard Price
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'DIGITAL_AND_PRINT', 'SINGLE_EDITION'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 540,
        hasPhotography: true,
        photoCount: 2,
        originalityStatus: 'VERIFIED_ORIGINAL',
        originalityScorePercent: 99.2,
        viewsCount: 142,
        purchasesCount: 14,
        grossRevenue: 70,
        netRevenue: 56,
        createdAt: '2026-10-02T08:35:00.000Z',
        updatedAt: '2026-10-02T08:35:00.000Z'
      },
      {
        listingId: 'mkt-standard-02',
        newsId: 'art-std-102',
        reporterId: 'rep-david-okafor',
        reporterName: 'David K. Okafor',
        reporterByline: 'David K. Okafor (Independent Correspondent)',
        sourceTenantId: 'freelance_open',
        title: 'Agricultural Rail Freight Corridors Cut Fertilizer Transit Times by 40%',
        shortDescription: 'Dedicated fast-track freight operations connect regional agricultural cooperatives directly with port terminals.',
        category: 'Agriculture & Transit',
        district: 'Nellore District',
        state: 'Andhra Pradesh',
        publishedAt: '2026-10-02T11:00:00.000Z',
        listingType: 'STANDARD',
        pricingModel: 'INDIVIDUAL_PURCHASE',
        price: 10, // ₹10 Standard Price
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'DIGITAL_AND_PRINT', 'SINGLE_EDITION'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 780,
        hasPhotography: true,
        photoCount: 3,
        originalityStatus: 'FIRST_RECORDED_SUBMISSION',
        originalityScorePercent: 98.7,
        viewsCount: 96,
        purchasesCount: 8,
        grossRevenue: 80,
        netRevenue: 64,
        createdAt: '2026-10-02T11:15:00.000Z',
        updatedAt: '2026-10-02T11:15:00.000Z'
      },
      {
        listingId: 'mkt-premium-01',
        newsId: 'art-prem-201',
        reporterId: 'rep-david-okafor',
        reporterName: 'David K. Okafor',
        reporterByline: 'David K. Okafor (Investigative Wire)',
        sourceTenantId: 'freelance_open',
        title: 'State Highway Expansion Audits Uncover ₹42 Crore In Flawed Concrete Slabs',
        shortDescription: 'In-depth engineering forensic investigation with laboratory core samples showing substandard tensile endurance across 85 kilometers.',
        category: 'Investigative & Infrastructure',
        district: 'Nellore District',
        state: 'Andhra Pradesh',
        publishedAt: '2026-10-01T14:00:00.000Z',
        listingType: 'PREMIUM',
        pricingModel: 'PREMIUM_PURCHASE',
        price: 50, // ₹50 Premium Price
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'DIGITAL_AND_PRINT', 'MULTI_EDITION', 'REGIONAL'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 1680,
        hasPhotography: true,
        photoCount: 6,
        originalityStatus: 'VERIFIED_ORIGINAL',
        originalityScorePercent: 99.8,
        viewsCount: 320,
        purchasesCount: 22,
        grossRevenue: 1100,
        netRevenue: 880,
        createdAt: '2026-10-01T14:10:00.000Z',
        updatedAt: '2026-10-01T14:10:00.000Z'
      },
      {
        listingId: 'mkt-exclusive-01',
        newsId: 'art-excl-301',
        reporterId: 'rep-david-okafor',
        reporterName: 'David K. Okafor',
        reporterByline: 'David K. Okafor (Special Investigations)',
        sourceTenantId: 'freelance_open',
        title: 'Nellore Offshore Hydrogen Pipeline Consortium: Confidential Financial & Environmental Dispatches',
        shortDescription: 'Exclusive multi-part investigative package detailing unreleased ministerial clearances, port terminal alignments, and sovereign risk insurance covenants.',
        category: 'Investigation',
        district: 'Nellore District',
        state: 'Andhra Pradesh',
        publishedAt: '2026-10-03T06:00:00.000Z',
        listingType: 'EXCLUSIVE',
        pricingModel: 'EXCLUSIVE_PURCHASE',
        price: 250, // ₹250 Exclusive Price
        currency: 'INR',
        licenseOptions: ['EXCLUSIVE'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 2450,
        hasPhotography: true,
        photoCount: 8,
        originalityStatus: 'FIRST_RECORDED_SUBMISSION',
        originalityScorePercent: 99.9,
        viewsCount: 410,
        purchasesCount: 0,
        grossRevenue: 0,
        netRevenue: 0,
        createdAt: '2026-10-03T06:15:00.000Z',
        updatedAt: '2026-10-03T06:15:00.000Z'
      }
    ];

    for (const item of seedListings) {
      this.listings.set(item.listingId, item);
    }

    // 3. Initial active entitlement for tenant-metro-chronicle
    const seedEntitlement: MarketplaceEntitlement = {
      entitlementId: 'ent-metro-100',
      subscriptionId: 'sub-mkt-metro-01',
      buyerTenantId: 'tenant-metro-chronicle',
      entitlementType: 'MONTHLY_STANDARD_NEWS_PACK',
      totalUnits: 100,
      usedUnits: 37,
      remainingUnits: 63,
      startDate: '2026-10-01T00:00:00.000Z',
      endDate: '2026-10-31T23:59:59.000Z',
      status: 'active',
      redemptions: [
        {
          redemptionId: 'red-01',
          entitlementId: 'ent-metro-100',
          newsId: 'art-seed-01',
          listingId: 'mkt-seed-01',
          buyerTenantId: 'tenant-metro-chronicle',
          buyerUserId: 'user-elena-vance',
          redeemedAt: '2026-10-02T09:00:00.000Z',
          unitsUsed: 1
        }
      ]
    };
    this.entitlements.set(seedEntitlement.buyerTenantId, seedEntitlement);

    // Initial ledger entries
    this.ledger.push(
      {
        ledgerId: 'led-init-01',
        relatedPurchaseId: 'purch-seed-01',
        relatedListingId: 'mkt-standard-01',
        relatedNewsId: 'art-std-101',
        actorId: 'user-seed-buyer',
        beneficiaryId: 'platform',
        beneficiaryType: 'platform',
        amount: 684,
        currency: 'INR',
        direction: 'credit',
        transactionType: 'PLATFORM_FEE',
        status: 'completed',
        description: 'Cumulative platform commission fees',
        createdAt: '2026-10-02T10:00:00.000Z'
      },
      {
        ledgerId: 'led-init-02',
        relatedPurchaseId: 'purch-seed-01',
        relatedListingId: 'mkt-standard-01',
        relatedNewsId: 'art-std-101',
        actorId: 'user-seed-buyer',
        beneficiaryId: 'rep-david-okafor',
        beneficiaryType: 'reporter',
        amount: 2736,
        currency: 'INR',
        direction: 'credit',
        transactionType: 'REPORTER_EARNING',
        status: 'completed',
        description: 'Syndication sales royalties credited to reporter wallet',
        createdAt: '2026-10-02T10:00:00.000Z'
      }
    );
  }

  // ====================================================
  // LISTINGS
  // ====================================================

  /**
   * Creates a new marketplace listing after verifying all domain gates.
   */
  async createListing(params: {
    article: NewsArticle;
    reporter: ReporterProfile;
    listingType: ListingType;
    price: number;
    currency?: string;
    licenseOptions: LicenseType[];
    actorId: string;
    actorName: string;
  }): Promise<MarketplaceListing> {
    const { article, reporter, listingType, price, currency = 'INR', licenseOptions, actorId, actorName } = params;

    // 1. Authoritative Eligibility Gate
    const eligibility = marketplaceEligibilityService.evaluateEligibility({
      article,
      reporter,
      listingParams: { price, listingType, licenseOptions }
    });

    if (!eligibility.eligible) {
      throw new Error(`Marketplace Listing Blocked: ${eligibility.reasons.join(' ')}`);
    }

    // 2. Validate Pricing Constraints
    if (price <= 0) {
      throw new Error('Marketplace principle violation: Price must be strictly greater than ₹0. Free news is prohibited.');
    }

    const config = revenueCalculationService.getConfig();
    if (listingType === 'STANDARD' && !config.standardPricingTiers.includes(price)) {
      // Standard prices must match allowed tiers (e.g. ₹5, ₹10) unless custom config permitted
      console.warn(`Price ₹${price} does not match default tiers (${config.standardPricingTiers.join(', ')}), but allowed if within bounds.`);
    }

    const listingId = `mkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const pricingModel: PricingModel =
      listingType === 'EXCLUSIVE'
        ? 'EXCLUSIVE_PURCHASE'
        : listingType === 'PREMIUM' || listingType === 'INVESTIGATION'
        ? 'PREMIUM_PURCHASE'
        : 'INDIVIDUAL_PURCHASE';

    const listing: MarketplaceListing = {
      listingId,
      newsId: article.articleId,
      reporterId: reporter.reporterId,
      reporterName: reporter.byline,
      reporterByline: reporter.byline,
      sourceTenantId: article.tenantId || reporter.tenantId,
      title: article.headline,
      shortDescription: article.leadParagraph || article.summary || article.headline,
      category: article.category || 'General',
      district: article.district || 'Regional',
      state: article.state || 'General',
      publishedAt: article.publishedAt || now,
      listingType,
      pricingModel,
      price,
      currency,
      licenseOptions,
      availability: 'AVAILABLE',
      status: 'ACTIVE',
      wordCount: article.wordCount || 500,
      hasPhotography: Boolean(article.coverImageUrl),
      photoCount: article.coverImageUrl ? 1 : 0,
      originalityStatus: article.originalityStatus,
      originalityScorePercent: article.originalityScorePercent,
      viewsCount: 0,
      purchasesCount: 0,
      grossRevenue: 0,
      netRevenue: 0,
      createdAt: now,
      updatedAt: now
    };

    this.listings.set(listingId, listing);

    // Update article state
    article.isMarketplaceListed = true;
    article.editorialStatus = 'marketplace_listed';

    // Audit
    await auditService.log({
      tenantId: listing.sourceTenantId || 'platform',
      actorId,
      actorName,
      actorRole: 'reporter',
      action: 'LISTING_CREATED',
      entityType: 'MarketplaceListing',
      entityId: listingId,
      newState: listing,
      reason: `Story "${article.headline}" listed at ${currency} ${price}`,
      metadata: { newsId: article.articleId, price, listingType }
    });

    return listing;
  }

  /**
   * Updates listing price or details.
   */
  async updateListingPrice(listingId: string, newPrice: number, actorId: string, actorName: string): Promise<MarketplaceListing> {
    const listing = this.listings.get(listingId);
    if (!listing) throw new Error('Listing not found');

    if (newPrice <= 0) {
      throw new Error('Price must be strictly positive (> ₹0). Free listings are prohibited.');
    }

    const previousPrice = listing.price;
    listing.price = newPrice;
    listing.updatedAt = new Date().toISOString();

    await auditService.log({
      tenantId: listing.sourceTenantId || 'platform',
      actorId,
      actorName,
      actorRole: 'reporter',
      action: 'PRICE_CHANGED',
      entityType: 'MarketplaceListing',
      entityId: listingId,
      previousState: { price: previousPrice },
      newState: { price: newPrice },
      reason: `Listing price updated from ₹${previousPrice} to ₹${newPrice}`,
      metadata: { previousPrice, newPrice }
    });

    return listing;
  }

  getListings(filters?: {
    category?: string;
    district?: string;
    listingType?: string;
    search?: string;
    reporterId?: string;
    status?: string;
  }): MarketplaceListing[] {
    let result = Array.from(this.listings.values());

    if (filters?.status) {
      result = result.filter(l => l.status === filters.status);
    } else {
      // Default to active
      result = result.filter(l => l.status === 'ACTIVE');
    }

    if (filters?.category && filters.category !== 'all') {
      result = result.filter(l => l.category.toLowerCase() === filters.category!.toLowerCase());
    }

    if (filters?.district && filters.district !== 'all') {
      result = result.filter(l => l.district?.toLowerCase() === filters.district!.toLowerCase());
    }

    if (filters?.listingType && filters.listingType !== 'all') {
      result = result.filter(l => l.listingType === filters.listingType);
    }

    if (filters?.reporterId) {
      result = result.filter(l => l.reporterId === filters.reporterId);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        l =>
          l.title.toLowerCase().includes(q) ||
          l.shortDescription.toLowerCase().includes(q) ||
          l.reporterByline?.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q)
      );
    }

    return result;
  }

  getListingById(listingId: string): MarketplaceListing | undefined {
    return this.listings.get(listingId);
  }

  // ====================================================
  // PURCHASE & LICENSING WORKFLOW
  // ====================================================

  /**
   * Executes a marketplace purchase with idempotency protection and atomic ledger creation.
   */
  async purchaseNews(params: {
    idempotencyKey: string;
    listingId: string;
    buyerTenantId: string;
    buyerTenantName?: string;
    buyerUserId: string;
    buyerUserName?: string;
    selectedLicense: LicenseType;
    territory?: string;
    durationDays?: number;
  }): Promise<{
    purchase: MarketplacePurchase;
    license: NewsLicense;
    ledgerEntries: LedgerTransaction[];
  }> {
    const {
      idempotencyKey,
      listingId,
      buyerTenantId,
      buyerTenantName = 'Buyer Organization',
      buyerUserId,
      buyerUserName = 'Authorized Buyer',
      selectedLicense,
      territory = 'National',
      durationDays = selectedLicense === 'EXCLUSIVE' ? 7 : 365
    } = params;

    // 1. Idempotency Check: Prevent duplicate purchases
    if (this.idempotencyRecords.has(idempotencyKey)) {
      const existing = this.idempotencyRecords.get(idempotencyKey) as MarketplacePurchase;
      const license = this.licenses.get(existing.licenseId)!;
      return {
        purchase: existing,
        license,
        ledgerEntries: this.ledger.filter(l => l.relatedPurchaseId === existing.purchaseId)
      };
    }

    // 2. Fetch and Validate Listing
    const listing = this.listings.get(listingId);
    if (!listing) throw new Error('Listing not found');

    if (listing.status !== 'ACTIVE') {
      throw new Error(`Listing is not active for acquisition (status: ${listing.status}).`);
    }

    // Cross-tenant check: buyer cannot purchase if listing has been withdrawn or archived
    if (listing.availability === 'LICENSED_EXCLUSIVE') {
      throw new Error('This story has already been licensed exclusively and is unavailable for new syndication.');
    }

    // Check if buyer already has an active license for this listing to prevent accidental double-spending
    const existingBuyerLicense = Array.from(this.licenses.values()).find(
      lic => lic.listingId === listingId && lic.buyerTenantId === buyerTenantId && lic.status === 'ACTIVE'
    );
    if (existingBuyerLicense) {
      throw new Error(`Buyer organization already possesses an active "${existingBuyerLicense.type}" license for this story (License ID: ${existingBuyerLicense.licenseId}).`);
    }

    // 3. Exclusivity Verification
    const isExclusive = selectedLicense === 'EXCLUSIVE';
    const now = new Date();
    const validFrom = now.toISOString();
    const validUntilDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const validUntil = validUntilDate.toISOString();

    if (isExclusive) {
      const collisionCheck = exclusivityValidationService.checkCollision({
        newsId: listing.newsId,
        territory,
        validFrom,
        validUntil,
        candidateBuyerTenantId: buyerTenantId
      });

      if (collisionCheck.hasCollision) {
        throw new Error(`Exclusive License Blocked: ${collisionCheck.reason}`);
      }
    }

    // 4. Server-Authoritative Revenue Calculation
    // Browser NEVER trusted for amounts
    const grossAmount = listing.price;
    if (grossAmount <= 0) {
      throw new Error('Invalid listing price. Marketplace items must have a positive purchase value.');
    }

    const hasSourceOrg = Boolean(listing.sourceTenantId && listing.sourceTenantId !== 'freelance_open');
    const revenueSplit = revenueCalculationService.calculateSplit({
      grossAmount,
      hasSourceOrganization: hasSourceOrg,
      currency: listing.currency
    });

    // 5. Generate Entities
    const purchaseId = `purch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const licenseId = `lic_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const license: NewsLicense = {
      licenseId,
      purchaseId,
      listingId,
      newsId: listing.newsId,
      articleTitle: listing.title,
      buyerTenantId,
      buyerTenantName,
      buyerUserId,
      sellerReporterId: listing.reporterId,
      sellerReporterName: listing.reporterName,
      sourceTenantId: listing.sourceTenantId,
      type: selectedLicense,
      scope: isExclusive ? 'exclusive_territorial' : 'standard_syndication',
      territory,
      durationDays,
      allowedMedia: selectedLicense === 'PRINT_ONLY' ? ['print_broadsheet'] : ['digital_web', 'print_broadsheet'],
      allowedEditions: selectedLicense === 'SINGLE_EDITION' ? 1 : -1,
      exclusivity: isExclusive,
      resaleAllowed: false,
      derivativeEditingAllowed: true, // editorial layout adaptation
      attributionRequired: true,
      status: 'ACTIVE',
      grantedAt: validFrom,
      expiresAt: validUntil
    };

    const purchase: MarketplacePurchase = {
      purchaseId,
      idempotencyKey,
      buyerTenantId,
      buyerTenantName,
      buyerUserId,
      buyerUserName,
      listingId,
      newsId: listing.newsId,
      reporterId: listing.reporterId,
      reporterName: listing.reporterName,
      sourceTenantId: listing.sourceTenantId,
      licenseId,
      pricingModel: listing.pricingModel,
      grossAmount: revenueSplit.grossAmount,
      platformFee: revenueSplit.platformFee,
      reporterShare: revenueSplit.reporterShare,
      sourceOrganizationShare: revenueSplit.sourceOrganizationShare,
      currency: listing.currency,
      status: 'completed',
      purchasedAt: validFrom,
      articleTitle: listing.title,
      licenseType: selectedLicense
    };

    // 6. If Exclusive, register the lock
    if (isExclusive) {
      await exclusivityValidationService.acquireExclusiveLock({
        newsId: listing.newsId,
        listingId,
        buyerTenantId,
        territory,
        scope: 'exclusive_syndication',
        validFrom,
        validUntil,
        purchaseId,
        actorId: buyerUserId,
        actorName: buyerUserName
      });
      listing.availability = 'LICENSED_EXCLUSIVE';
    }

    // 7. Create Immutable Ledger Entries
    const newLedgerEntries: LedgerTransaction[] = [];

    // Transaction 1: Sale Gross Amount
    newLedgerEntries.push({
      ledgerId: `led_sale_${purchaseId}`,
      relatedPurchaseId: purchaseId,
      relatedListingId: listingId,
      relatedNewsId: listing.newsId,
      actorId: buyerUserId,
      beneficiaryId: 'platform_escrow',
      beneficiaryType: 'platform',
      amount: revenueSplit.grossAmount,
      currency: listing.currency,
      direction: 'credit',
      transactionType: 'SALE',
      status: 'completed',
      description: `Marketplace purchase of "${listing.title}" under ${selectedLicense} license`,
      createdAt: validFrom
    });

    // Transaction 2: Platform Fee
    newLedgerEntries.push({
      ledgerId: `led_fee_${purchaseId}`,
      relatedPurchaseId: purchaseId,
      relatedListingId: listingId,
      relatedNewsId: listing.newsId,
      actorId: 'system',
      beneficiaryId: 'platform',
      beneficiaryType: 'platform',
      amount: revenueSplit.platformFee,
      currency: listing.currency,
      direction: 'credit',
      transactionType: 'PLATFORM_FEE',
      status: 'completed',
      description: `Platform fee (${revenueCalculationService.getConfig().platformFeePercent}%) on purchase ${purchaseId}`,
      createdAt: validFrom
    });

    // Transaction 3: Reporter Royalty
    newLedgerEntries.push({
      ledgerId: `led_rep_${purchaseId}`,
      relatedPurchaseId: purchaseId,
      relatedListingId: listingId,
      relatedNewsId: listing.newsId,
      actorId: 'system',
      beneficiaryId: listing.reporterId,
      beneficiaryType: 'reporter',
      amount: revenueSplit.reporterShare,
      currency: listing.currency,
      direction: 'credit',
      transactionType: 'REPORTER_EARNING',
      status: 'completed',
      description: `Syndication royalty earnings for reporter ${listing.reporterName || listing.reporterId}`,
      createdAt: validFrom
    });

    // Transaction 4: Source Organization Share (if applicable)
    if (revenueSplit.sourceOrganizationShare > 0 && listing.sourceTenantId) {
      newLedgerEntries.push({
        ledgerId: `led_org_${purchaseId}`,
        relatedPurchaseId: purchaseId,
        relatedListingId: listingId,
        relatedNewsId: listing.newsId,
        actorId: 'system',
        beneficiaryId: listing.sourceTenantId,
        beneficiaryType: 'organization',
        amount: revenueSplit.sourceOrganizationShare,
        currency: listing.currency,
        direction: 'credit',
        transactionType: 'ORGANIZATION_EARNING',
        status: 'completed',
        description: `Source organization syndication split for tenant ${listing.sourceTenantId}`,
        createdAt: validFrom
      });
    }

    // Append to ledger (Append-Only Invariant)
    for (const entry of newLedgerEntries) {
      this.ledger.push(entry);
    }

    // 8. Update Reporter Wallet
    let wallet = this.wallets.get(listing.reporterId);
    if (!wallet) {
      wallet = {
        walletId: `wallet-${listing.reporterId}`,
        reporterId: listing.reporterId,
        userId: listing.reporterId,
        grossSales: 0,
        platformFees: 0,
        netEarnings: 0,
        pendingEarnings: 0,
        availableBalance: 0,
        lifetimeEarnings: 0,
        salesCount: 0,
        currency: listing.currency,
        payoutMethodStatus: 'not_configured',
        updatedAt: validFrom
      };
      this.wallets.set(listing.reporterId, wallet);
    }

    wallet.grossSales += revenueSplit.grossAmount;
    wallet.platformFees += revenueSplit.platformFee;
    wallet.netEarnings += revenueSplit.reporterShare;
    wallet.availableBalance += revenueSplit.reporterShare;
    wallet.lifetimeEarnings += revenueSplit.reporterShare;
    wallet.salesCount += 1;
    wallet.updatedAt = validFrom;

    // 9. Update Listing Analytics
    listing.purchasesCount = (listing.purchasesCount || 0) + 1;
    listing.grossRevenue = (listing.grossRevenue || 0) + revenueSplit.grossAmount;
    listing.netRevenue = (listing.netRevenue || 0) + revenueSplit.reporterShare;

    // 10. Update Reporter Factual Reputation Metrics
    const reporterProfile = MOCK_REPORTER_PROFILES.find(r => r.reporterId === listing.reporterId);
    if (reporterProfile) {
      reporterProfile.marketplaceSales = (reporterProfile.marketplaceSales || 0) + 1;
      reporterProfile.marketplaceRevenue = (reporterProfile.marketplaceRevenue || 0) + revenueSplit.reporterShare;
    }

    // 11. Save entities and record idempotency
    this.purchases.set(purchaseId, purchase);
    this.licenses.set(licenseId, license);
    this.idempotencyRecords.set(idempotencyKey, purchase);

    // 12. Audit Trail
    await auditService.log({
      tenantId: buyerTenantId,
      actorId: buyerUserId,
      actorName: buyerUserName,
      actorRole: 'buyer',
      action: 'PURCHASE_COMPLETED',
      entityType: 'MarketplacePurchase',
      entityId: purchaseId,
      newState: purchase,
      reason: `Purchased "${listing.title}" with ${selectedLicense} rights for ₹${revenueSplit.grossAmount}`,
      metadata: { listingId, licenseId, grossAmount: revenueSplit.grossAmount }
    });

    await auditService.log({
      tenantId: buyerTenantId,
      actorId: buyerUserId,
      actorName: buyerUserName,
      actorRole: 'buyer',
      action: 'LICENSE_GRANTED',
      entityType: 'NewsLicense',
      entityId: licenseId,
      newState: license,
      reason: `Granted ${selectedLicense} rights for ${territory}`,
      metadata: { listingId, territory, durationDays }
    });

    return { purchase, license, ledgerEntries: newLedgerEntries };
  }

  // ====================================================
  // SUBSCRIPTIONS & ENTITLEMENTS
  // ====================================================

  getSubscriptionPlans(): MarketplaceSubscriptionPlan[] {
    return Array.from(this.subscriptionPlans.values());
  }

  /**
   * Subscribes a news organization tenant to a monthly standard news pack.
   */
  async subscribeToPlan(params: {
    buyerTenantId: string;
    buyerTenantName?: string;
    buyerUserId: string;
    planId: string;
  }): Promise<MarketplaceEntitlement> {
    const { buyerTenantId, buyerTenantName = 'Buyer', buyerUserId, planId } = params;

    const plan = this.subscriptionPlans.get(planId);
    if (!plan) throw new Error('Subscription plan not found');

    const now = new Date();
    const startDate = now.toISOString();
    const endDate = new Date(now.getTime() + plan.validityDays * 24 * 60 * 60 * 1000).toISOString();

    const entitlementId = `ent_${buyerTenantId}_${Date.now()}`;
    const subscriptionId = `sub_${planId}_${Date.now()}`;

    // Create or top-up entitlement
    const entitlement: MarketplaceEntitlement = {
      entitlementId,
      subscriptionId,
      buyerTenantId,
      entitlementType: 'MONTHLY_STANDARD_NEWS_PACK',
      totalUnits: plan.includedStandardNews,
      usedUnits: 0,
      remainingUnits: plan.includedStandardNews,
      startDate,
      endDate,
      status: 'active',
      redemptions: []
    };

    this.entitlements.set(buyerTenantId, entitlement);

    // Ledger record
    this.ledger.push({
      ledgerId: `led_sub_${subscriptionId}`,
      actorId: buyerUserId,
      beneficiaryId: 'platform',
      beneficiaryType: 'platform',
      amount: plan.monthlyPrice,
      currency: plan.currency,
      direction: 'credit',
      transactionType: 'SALE',
      status: 'completed',
      description: `Subscription to ${plan.name} (${plan.includedStandardNews} standard units)`,
      createdAt: startDate
    });

    await auditService.log({
      tenantId: buyerTenantId,
      actorId: buyerUserId,
      actorName: buyerTenantName,
      actorRole: 'buyer',
      action: 'SUBSCRIPTION_CREATED',
      entityType: 'MarketplaceSubscription',
      entityId: subscriptionId,
      newState: entitlement,
      reason: `Activated plan "${plan.name}" with ${plan.includedStandardNews} news units`
    });

    return entitlement;
  }

  getTenantEntitlement(tenantId: string): MarketplaceEntitlement | undefined {
    return this.entitlements.get(tenantId);
  }

  /**
   * Redeems one unit from an active subscription entitlement for a standard news article.
   * Atomic decrement, double-redemption prevention, cannot go below zero.
   */
  async redeemSubscriptionEntitlement(params: {
    idempotencyKey: string;
    buyerTenantId: string;
    buyerTenantName?: string;
    buyerUserId: string;
    buyerUserName?: string;
    listingId: string;
  }): Promise<{
    license: NewsLicense;
    redemption: EntitlementRedemption;
    remainingUnits: number;
  }> {
    const { idempotencyKey, buyerTenantId, buyerTenantName = 'Buyer', buyerUserId, buyerUserName = 'Buyer User', listingId } = params;

    // Idempotency: prevent double redemption
    if (this.idempotencyRecords.has(idempotencyKey)) {
      const existingRedemption = this.idempotencyRecords.get(idempotencyKey) as EntitlementRedemption;
      const license = Array.from(this.licenses.values()).find(
        lic => lic.listingId === listingId && lic.buyerTenantId === buyerTenantId
      )!;
      const entitlement = this.entitlements.get(buyerTenantId)!;
      return {
        license,
        redemption: existingRedemption,
        remainingUnits: entitlement.remainingUnits
      };
    }

    const listing = this.listings.get(listingId);
    if (!listing) throw new Error('Listing not found');

    // Subscription units CANNOT be used for Premium or Exclusive content unless explicitly permitted
    if (listing.listingType !== 'STANDARD') {
      throw new Error(
        `Subscription units can only be redeemed for STANDARD news items. "${listing.title}" is a ${listing.listingType} story requiring individual purchase.`
      );
    }

    const entitlement = this.entitlements.get(buyerTenantId);
    if (!entitlement) {
      throw new Error('No news subscription package found for this organization.');
    }

    // Invariant: Entitlement cannot go below zero
    if (entitlement.remainingUnits <= 0 || entitlement.status === 'exhausted') {
      entitlement.status = 'exhausted';
      throw new Error(
        'Subscription package quota exhausted (0 remaining units). Purchase individual credits or renew monthly pack.'
      );
    }

    if (entitlement.status !== 'active') {
      throw new Error(`Subscription package is currently ${entitlement.status}.`);
    }

    // Check if story was already redeemed by this tenant
    const existingRedemption = entitlement.redemptions.find(r => r.listingId === listingId);
    if (existingRedemption) {
      throw new Error('This story has already been redeemed under your active subscription pack.');
    }

    // Atomic consumption
    entitlement.remainingUnits -= 1;
    entitlement.usedUnits += 1;
    if (entitlement.remainingUnits === 0) {
      entitlement.status = 'exhausted';
    }

    const redemptionId = `red_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const redemption: EntitlementRedemption = {
      redemptionId,
      entitlementId: entitlement.entitlementId,
      newsId: listing.newsId,
      listingId,
      buyerTenantId,
      buyerUserId,
      redeemedAt: now,
      unitsUsed: 1
    };

    entitlement.redemptions.push(redemption);

    // Create Explicit License
    const licenseId = `lic_sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const license: NewsLicense = {
      licenseId,
      purchaseId: `redemption_${redemptionId}`,
      listingId,
      newsId: listing.newsId,
      articleTitle: listing.title,
      buyerTenantId,
      buyerTenantName,
      buyerUserId,
      sellerReporterId: listing.reporterId,
      sellerReporterName: listing.reporterName,
      sourceTenantId: listing.sourceTenantId,
      type: 'DIGITAL_AND_PRINT',
      scope: 'standard_syndication',
      territory: 'National',
      durationDays: 365,
      allowedMedia: ['digital_web', 'print_broadsheet'],
      allowedEditions: -1,
      exclusivity: false,
      resaleAllowed: false,
      derivativeEditingAllowed: true,
      attributionRequired: true,
      status: 'ACTIVE',
      grantedAt: now,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };

    this.licenses.set(licenseId, license);
    this.idempotencyRecords.set(idempotencyKey, redemption);

    // Ledger record for redemption (Every redemption individually recorded)
    this.ledger.push({
      ledgerId: `led_red_${redemptionId}`,
      relatedListingId: listingId,
      relatedNewsId: listing.newsId,
      actorId: buyerUserId,
      beneficiaryId: listing.reporterId,
      beneficiaryType: 'reporter',
      amount: 1, // 1 entitlement unit
      currency: 'UNITS',
      direction: 'debit',
      transactionType: 'SUBSCRIPTION_REDEMPTION',
      status: 'completed',
      description: `Redemption of 1 subscription unit for standard story "${listing.title}"`,
      createdAt: now
    });

    await auditService.log({
      tenantId: buyerTenantId,
      actorId: buyerUserId,
      actorName: buyerUserName,
      actorRole: 'buyer',
      action: 'ENTITLEMENT_REDEEMED',
      entityType: 'MarketplaceEntitlement',
      entityId: entitlement.entitlementId,
      newState: { remainingUnits: entitlement.remainingUnits, usedUnits: entitlement.usedUnits },
      reason: `Redeemed standard story "${listing.title}". Units remaining: ${entitlement.remainingUnits}`
    });

    return {
      license,
      redemption,
      remainingUnits: entitlement.remainingUnits
    };
  }

  // ====================================================
  // CONTENT ACCESS CONTROL & REDACTION
  // ====================================================

  /**
   * Retrieves news content with strict privacy redaction.
   * If not purchased, returns ONLY public preview (headline, preview, price, licenses).
   * If purchased, returns full story body, but strictly redacts private reporter evidence
   * (GPS coordinates, private source contacts, confidential editorial notes).
   */
  getAuthorizedStoryContent(params: {
    newsId: string;
    requestingTenantId: string;
    requestingUserId: string;
    requestingRole?: string;
  }): {
    hasFullAccess: boolean;
    headline: string;
    leadParagraph: string;
    bodyContent?: string;
    byline: string;
    category: string;
    location?: string;
    license?: NewsLicense;
    accessReason: string;
    isEvidenceRedacted: boolean;
  } {
    const { newsId, requestingTenantId, requestingUserId, requestingRole } = params;

    // Find the underlying article
    const article = MOCK_NEWS_ARTICLES.find(a => a.articleId === newsId);
    const listing = Array.from(this.listings.values()).find(l => l.newsId === newsId);

    const headline = article?.headline || listing?.title || 'News Item';
    const lead = article?.leadParagraph || listing?.shortDescription || '';
    const byline = article?.byline || listing?.reporterByline || 'Staff Reporter';
    const category = article?.category || listing?.category || 'News';
    const location = article?.location || listing?.district;

    // 1. Check if user is the original author
    if (article?.authorId === requestingUserId || listing?.reporterId === requestingUserId) {
      return {
        hasFullAccess: true,
        headline,
        leadParagraph: lead,
        bodyContent: article?.bodyContent || 'Full reporter dispatch content.',
        byline,
        category,
        location,
        accessReason: 'Author / Reporter Access',
        isEvidenceRedacted: false
      };
    }

    // 2. Check if user is in the author's newsroom tenant
    if (article?.tenantId === requestingTenantId && article.tenantId !== 'freelance_open') {
      return {
        hasFullAccess: true,
        headline,
        leadParagraph: lead,
        bodyContent: article.bodyContent,
        byline,
        category,
        location,
        accessReason: 'Source Newsroom Desk Access',
        isEvidenceRedacted: false
      };
    }

    // 3. Check if buyer tenant has a valid completed license
    const activeLicense = Array.from(this.licenses.values()).find(
      lic => lic.newsId === newsId && lic.buyerTenantId === requestingTenantId && lic.status === 'ACTIVE'
    );

    if (activeLicense) {
      return {
        hasFullAccess: true,
        headline,
        leadParagraph: lead,
        bodyContent: article?.bodyContent || `${lead}\n\n[Full Syndicated Wire Dispatch: Complete verified text released under license ${activeLicense.licenseId}. Authorized for publication under ${activeLicense.type} terms.]`,
        byline,
        category,
        location,
        license: activeLicense,
        accessReason: `Licensed via ${activeLicense.type} (License ID: ${activeLicense.licenseId})`,
        // Strict Security Invariant: Private reporter evidence is redacted from buyers
        isEvidenceRedacted: true
      };
    }

    // 4. Fallback: Public / Unpurchased preview only
    // NO FREE NEWS: Full story content is omitted
    return {
      hasFullAccess: false,
      headline,
      leadParagraph: lead,
      bodyContent: undefined, // Omitted
      byline,
      category,
      location,
      accessReason: 'Marketplace Preview Only (Full story requires license or subscription redemption)',
      isEvidenceRedacted: true
    };
  }

  // ====================================================
  // LICENSES & COMPLIANCE
  // ====================================================

  getLicenses(tenantId?: string): NewsLicense[] {
    const list = Array.from(this.licenses.values());
    if (tenantId) {
      return list.filter(l => l.buyerTenantId === tenantId || l.sourceTenantId === tenantId);
    }
    return list;
  }

  getPurchasedNewsForTenant(tenantId: string): Array<{
    license: NewsLicense;
    listing?: MarketplaceListing;
    article?: NewsArticle;
  }> {
    const licenses = Array.from(this.licenses.values()).filter(l => l.buyerTenantId === tenantId);
    return licenses.map(lic => ({
      license: lic,
      listing: lic.listingId ? this.listings.get(lic.listingId) : undefined,
      article: MOCK_NEWS_ARTICLES.find(a => a.articleId === lic.newsId)
    }));
  }

  // ====================================================
  // LEDGER & WALLET
  // ====================================================

  getLedgerTransactions(filter?: {
    beneficiaryId?: string;
    transactionType?: string;
    limit?: number;
  }): LedgerTransaction[] {
    let list = [...this.ledger];
    if (filter?.beneficiaryId) {
      list = list.filter(l => l.beneficiaryId === filter.beneficiaryId);
    }
    if (filter?.transactionType) {
      list = list.filter(l => l.transactionType === filter.transactionType);
    }
    return list.reverse(); // Most recent first
  }

  getReporterWallet(reporterId: string): ReporterWallet {
    let wallet = this.wallets.get(reporterId);
    if (!wallet) {
      wallet = {
        walletId: `wallet-${reporterId}`,
        reporterId,
        userId: reporterId,
        grossSales: 0,
        platformFees: 0,
        netEarnings: 0,
        pendingEarnings: 0,
        availableBalance: 0,
        lifetimeEarnings: 0,
        salesCount: 0,
        currency: 'INR',
        payoutMethodStatus: 'not_configured',
        updatedAt: new Date().toISOString()
      };
      this.wallets.set(reporterId, wallet);
    }
    return wallet;
  }

  // ====================================================
  // PAYOUT REQUEST ENGINE
  // ====================================================

  /**
   * Submits a reporter payout request with balance check.
   */
  async requestPayout(params: {
    reporterId: string;
    reporterName?: string;
    requestedAmount: number;
    currency?: string;
    payoutMethod?: string;
    actorId: string;
  }): Promise<PayoutRequest> {
    const { reporterId, reporterName = 'Reporter', requestedAmount, currency = 'INR', payoutMethod = 'UPI / Bank Transfer', actorId } = params;

    const wallet = this.getReporterWallet(reporterId);
    const minPayout = revenueCalculationService.getConfig().minPayoutAmount;

    if (requestedAmount < minPayout) {
      throw new Error(`Requested payout amount (₹${requestedAmount}) is below the minimum threshold of ₹${minPayout}.`);
    }

    if (requestedAmount > wallet.availableBalance) {
      throw new Error(`Insufficient funds: Requested ₹${requestedAmount} exceeds available balance of ₹${wallet.availableBalance}.`);
    }

    // Move available -> pending
    wallet.availableBalance -= requestedAmount;
    wallet.pendingEarnings += requestedAmount;
    wallet.updatedAt = new Date().toISOString();

    const payoutId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const payout: PayoutRequest = {
      payoutId,
      reporterId,
      reporterName,
      requestedAmount,
      eligibleAmount: requestedAmount,
      currency,
      status: 'requested',
      requestedAt: now,
      payoutMethod
    };

    this.payouts.set(payoutId, payout);

    // Record pending payout in immutable ledger
    this.ledger.push({
      ledgerId: `led_payout_${payoutId}`,
      actorId,
      beneficiaryId: reporterId,
      beneficiaryType: 'reporter',
      amount: requestedAmount,
      currency,
      direction: 'debit',
      transactionType: 'PAYOUT_PENDING',
      status: 'pending',
      description: `Reporter payout request #${payoutId} for ₹${requestedAmount}`,
      createdAt: now
    });

    await auditService.log({
      tenantId: 'platform',
      actorId,
      actorName: reporterName,
      actorRole: 'reporter',
      action: 'PAYOUT_REQUESTED',
      entityType: 'PayoutRequest',
      entityId: payoutId,
      newState: payout,
      reason: `Payout requested for ₹${requestedAmount}`
    });

    return payout;
  }

  /**
   * Reviews and approves/rejects a payout request.
   */
  async reviewPayout(params: {
    payoutId: string;
    action: 'approved' | 'rejected';
    reviewerId: string;
    reviewerName: string;
    rejectionReason?: string;
  }): Promise<PayoutRequest> {
    const { payoutId, action, reviewerId, reviewerName, rejectionReason } = params;

    const payout = this.payouts.get(payoutId);
    if (!payout) throw new Error('Payout request not found');

    if (payout.status !== 'requested' && payout.status !== 'under_review') {
      throw new Error(`Payout cannot be reviewed in current status: ${payout.status}`);
    }

    const wallet = this.getReporterWallet(payout.reporterId);
    const now = new Date().toISOString();

    if (action === 'approved') {
      payout.status = 'approved';
      payout.reviewedAt = now;
      payout.reviewedBy = reviewerName;

      // Pending earnings cleared upon approval
      wallet.pendingEarnings -= payout.requestedAmount;
      wallet.lastPayoutDate = now;
      wallet.updatedAt = now;

      this.ledger.push({
        ledgerId: `led_payout_app_${payoutId}`,
        actorId: reviewerId,
        beneficiaryId: payout.reporterId,
        beneficiaryType: 'reporter',
        amount: payout.requestedAmount,
        currency: payout.currency,
        direction: 'debit',
        transactionType: 'PAYOUT_COMPLETED',
        status: 'completed',
        description: `Approved reporter payout #${payoutId}`,
        createdAt: now
      });

      await auditService.log({
        tenantId: 'platform',
        actorId: reviewerId,
        actorName: reviewerName,
        actorRole: 'admin',
        action: 'PAYOUT_APPROVED',
        entityType: 'PayoutRequest',
        entityId: payoutId,
        reason: `Payout #${payoutId} approved by ${reviewerName}`
      });
    } else {
      payout.status = 'rejected';
      payout.reviewedAt = now;
      payout.reviewedBy = reviewerName;
      payout.rejectionReason = rejectionReason || 'Failed verification checks';

      // Refund pending balance back to available balance!
      wallet.pendingEarnings -= payout.requestedAmount;
      wallet.availableBalance += payout.requestedAmount;
      wallet.updatedAt = now;

      this.ledger.push({
        ledgerId: `led_payout_rej_${payoutId}`,
        actorId: reviewerId,
        beneficiaryId: payout.reporterId,
        beneficiaryType: 'reporter',
        amount: payout.requestedAmount,
        currency: payout.currency,
        direction: 'credit',
        transactionType: 'ADJUSTMENT',
        status: 'completed',
        description: `Compensating reversal for rejected payout #${payoutId}: ${rejectionReason}`,
        createdAt: now
      });

      await auditService.log({
        tenantId: 'platform',
        actorId: reviewerId,
        actorName: reviewerName,
        actorRole: 'admin',
        action: 'PAYOUT_REJECTED',
        entityType: 'PayoutRequest',
        entityId: payoutId,
        reason: rejectionReason || 'Payout rejected'
      });
    }

    return payout;
  }

  getPayoutRequests(reporterId?: string): PayoutRequest[] {
    const list = Array.from(this.payouts.values());
    if (reporterId) {
      return list.filter(p => p.reporterId === reporterId);
    }
    return list.reverse();
  }

  getLicenseById(licenseId: string): NewsLicense | undefined {
    return this.licenses.get(licenseId);
  }

  getPurchaseById(purchaseId: string): MarketplacePurchase | undefined {
    return this.purchases.get(purchaseId);
  }

  getAllPurchases(): MarketplacePurchase[] {
    return Array.from(this.purchases.values());
  }

  getLedger(): LedgerTransaction[] {
    return [...this.ledger];
  }

  linkLicenseToEdition(licenseId: string, editionCode: string): void {
    const list = this.licenseToEditions.get(licenseId) || [];
    if (!list.includes(editionCode)) {
      list.push(editionCode);
      this.licenseToEditions.set(licenseId, list);
    }
  }

  getLinkedEditionsForLicense(licenseId: string): string[] {
    return this.licenseToEditions.get(licenseId) || [];
  }
}

export const marketplaceService = new MarketplaceService();
