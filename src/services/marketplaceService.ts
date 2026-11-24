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
import { newsSubmissionService } from './newsSubmissionService';
import { hasLocalStorage, readLocalJson, writeLocalJson } from '../utils/localStore';

const MARKETPLACE_STORAGE_KEY = 'newspress_marketplace_state_v1';

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
  private wireArticleCache: Map<string, NewsArticle> = new Map();

  constructor() {
    // Seed default subscription plans
    for (const plan of DEFAULT_SUBSCRIPTION_PLANS) {
      this.subscriptionPlans.set(plan.planId, plan);
    }

    this.seedInitialData();
    this.hydrateFromStorage();
  }

  private persistState() {
    if (!hasLocalStorage()) return;
    writeLocalJson(MARKETPLACE_STORAGE_KEY, {
      listings: Array.from(this.listings.values()),
      purchases: Array.from(this.purchases.values()),
      licenses: Array.from(this.licenses.values()),
      entitlements: Array.from(this.entitlements.values()),
      wallets: Array.from(this.wallets.values()),
      payouts: Array.from(this.payouts.values()),
      ledger: this.ledger,
      licenseToEditions: Array.from(this.licenseToEditions.entries()),
    });
  }

  private hydrateFromStorage() {
    if (!hasLocalStorage()) return;
    const saved = readLocalJson<{
      listings?: MarketplaceListing[];
      purchases?: MarketplacePurchase[];
      licenses?: NewsLicense[];
      entitlements?: MarketplaceEntitlement[];
      wallets?: ReporterWallet[];
      payouts?: PayoutRequest[];
      ledger?: LedgerTransaction[];
      licenseToEditions?: Array<[string, string[]]>;
    } | null>(MARKETPLACE_STORAGE_KEY, null);
    if (!saved) return;
    if (saved.listings) {
      for (const l of saved.listings) {
        const existing = this.listings.get(l.listingId);
        if (existing) {
          this.listings.set(l.listingId, {
            ...existing,
            ...l,
            language: l.language || existing.language,
            storyType: l.storyType || existing.storyType,
            hasVideo: l.hasVideo ?? existing.hasVideo,
            videoCount: l.videoCount ?? existing.videoCount,
          });
        } else {
          this.listings.set(l.listingId, l);
        }
      }
    }
    if (saved.purchases) {
      for (const p of saved.purchases) this.purchases.set(p.purchaseId, p);
    }
    if (saved.licenses) {
      for (const lic of saved.licenses) this.licenses.set(lic.licenseId, lic);
    }
    if (saved.entitlements) {
      for (const ent of saved.entitlements) this.entitlements.set(ent.buyerTenantId, ent);
    }
    if (saved.wallets) {
      for (const w of saved.wallets) this.wallets.set(w.reporterId, w);
    }
    if (saved.payouts) {
      for (const po of saved.payouts) this.payouts.set(po.payoutId, po);
    }
    if (saved.ledger && saved.ledger.length > this.ledger.length) {
      this.ledger = saved.ledger;
    }
    if (saved.licenseToEditions) {
      for (const [k, v] of saved.licenseToEditions) this.licenseToEditions.set(k, v);
    }
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
        category: 'Public Works & Infrastructure',
        language: 'en',
        storyType: 'general',
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
        hasVideo: false,
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
        category: 'Agriculture & Rural',
        language: 'en',
        storyType: 'general',
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
        hasVideo: false,
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
        category: 'Infrastructure & Transit',
        language: 'en',
        storyType: 'investigative',
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
        hasVideo: false,
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
        category: 'Politics',
        language: 'en',
        storyType: 'exclusive',
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
        hasVideo: false,
        originalityStatus: 'FIRST_RECORDED_SUBMISSION',
        originalityScorePercent: 99.9,
        viewsCount: 410,
        purchasesCount: 0,
        grossRevenue: 0,
        netRevenue: 0,
        createdAt: '2026-10-03T06:15:00.000Z',
        updatedAt: '2026-10-03T06:15:00.000Z'
      },

      // --- TELUGU DISPATCHES ---
      {
        listingId: 'mkt-te-pol-01',
        newsId: 'art-te-101',
        reporterId: 'rep-k-venkat',
        reporterName: 'K. Venkateshwara Rao',
        reporterByline: 'కె. వెంకటేశ్వరరావు (State Political Bureau)',
        sourceTenantId: 'freelance_open',
        title: 'గోదావరి-కృష్ణా నదుల అనుసంధాన ప్రాజెక్టుపై కాగ్ తాజా ఆడిట్ నివేదిక: వ్యయం అంచనాలు రెట్టింపు',
        shortDescription: 'గోదావరి నీటిని కృష్ణా డెల్టాకు మళ్లించే ఎత్తిపోతల పథకాల్లో నిధుల నిర్వహణ మరియు సాంకేతిక లోపాలపై కాగ్ వెలువరించిన సమగ్ర విశ్లేషణ.',
        category: 'Politics',
        language: 'te',
        storyType: 'investigative',
        district: 'Vijayawada Bureau',
        state: 'Andhra Pradesh',
        publishedAt: '2026-10-04T09:00:00.000Z',
        listingType: 'PREMIUM',
        pricingModel: 'PREMIUM_PURCHASE',
        price: 25,
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'DIGITAL_AND_PRINT', 'REGIONAL'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 420, // 250-500 words
        hasPhotography: true,
        photoCount: 3,
        hasVideo: false,
        originalityStatus: 'VERIFIED_ORIGINAL',
        originalityScorePercent: 99.4,
        viewsCount: 215,
        purchasesCount: 5,
        grossRevenue: 125,
        netRevenue: 100,
        createdAt: '2026-10-04T09:05:00.000Z',
        updatedAt: '2026-10-04T09:05:00.000Z'
      },
      {
        listingId: 'mkt-te-crime-02',
        newsId: 'art-te-102',
        reporterId: 'rep-m-satya',
        reporterName: 'M. Satyanarayana',
        reporterByline: 'ఎం. సత్యనారాయణ (Crime Beat)',
        sourceTenantId: 'freelance_open',
        title: 'హైదరాబాద్ డ్రగ్స్ పట్టివేత: అంతర్రాష్ట్ర ముఠా గుట్టురట్టు, రూ. 5 కోట్ల విలువైన ఎండీఎంఏ స్వాధీనం',
        shortDescription: 'నగర శివార్లలో నార్కోటిక్స్ ఎన్‌ఫోర్స్ మెంట్ బ్యూరో మెరుపు దాడులు. ముగ్గురు కీలక నిందితుల అరెస్ట్, విదేశీ నెట్‌వర్క్ లింకులు బయటపడ్డాయి.',
        category: 'Crime & Justice',
        language: 'te',
        storyType: 'spot_news',
        district: 'Hyderabad Central',
        state: 'Telangana',
        publishedAt: '2026-10-04T12:30:00.000Z',
        listingType: 'STANDARD',
        pricingModel: 'INDIVIDUAL_PURCHASE',
        price: 15,
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'DIGITAL_AND_PRINT', 'SINGLE_EDITION'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 140, // 100-150 words
        hasPhotography: true,
        photoCount: 2,
        hasVideo: true, // Video News
        videoCount: 1,
        originalityStatus: 'FIRST_RECORDED_SUBMISSION',
        originalityScorePercent: 99.1,
        viewsCount: 380,
        purchasesCount: 12,
        grossRevenue: 180,
        netRevenue: 144,
        createdAt: '2026-10-04T12:35:00.000Z',
        updatedAt: '2026-10-04T12:35:00.000Z'
      },
      {
        listingId: 'mkt-te-health-03',
        newsId: 'art-te-103',
        reporterId: 'rep-dr-ramesh',
        reporterName: 'Dr. P. Ramesh',
        reporterByline: 'డా. పి. రమేష్ (Health Desk Editorial)',
        sourceTenantId: 'freelance_open',
        title: 'గ్రామీణ ప్రాథమిక ఆరోగ్య కేంద్రాల ఆధునీకరణపై ప్రత్యేక సంపాదకీయం: మందుల కొరతను అధిగమించే మార్గాలు',
        shortDescription: 'ప్రాథమిక ఆరోగ్య కేంద్రాల్లో నిపుణులైన వైద్యులు, అత్యవసర మందుల లభ్యతపై విధాన నిర్ణేతలకు సమగ్ర సూచనలతో కూడిన సంపాదకీయ వ్యాసం.',
        category: 'Health & Science',
        language: 'te',
        storyType: 'editorial',
        district: 'Amaravati Bureau',
        state: 'Andhra Pradesh',
        publishedAt: '2026-10-03T16:00:00.000Z',
        listingType: 'STANDARD',
        pricingModel: 'INDIVIDUAL_PURCHASE',
        price: 10,
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'DIGITAL_AND_PRINT'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 220, // 150-250 words
        hasPhotography: false, // Without photo / text only
        photoCount: 0,
        hasVideo: false,
        originalityStatus: 'VERIFIED_ORIGINAL',
        originalityScorePercent: 98.9,
        viewsCount: 110,
        purchasesCount: 4,
        grossRevenue: 40,
        netRevenue: 32,
        createdAt: '2026-10-03T16:10:00.000Z',
        updatedAt: '2026-10-03T16:10:00.000Z'
      },
      {
        listingId: 'mkt-te-satire-04',
        newsId: 'art-te-104',
        reporterId: 'rep-sekhar-cartoons',
        reporterName: 'Sekhar & Team',
        reporterByline: 'శేఖర్ కార్టూన్ & వ్యంగ్యాస్త్రం',
        sourceTenantId: 'freelance_open',
        title: 'రాజకీయ రంగులరాట్నం: పల్లెల్లో నేతల నవరత్నాల హామీల ప్రహసనంపై వ్యంగ్య కార్టూన్ విశ్లేషణ',
        shortDescription: 'ఎన్నికల హామీలు, ఓటర్ల అమాయకత్వం మరియు గ్రామీణ నేతల సరికొత్త ప్రచార నాటకాలపై సునిశిత రాజకీయ వ్యంగ్యాస్త్రం.',
        category: 'Politics',
        language: 'te',
        storyType: 'satirical',
        district: 'Guntur Rural',
        state: 'Andhra Pradesh',
        publishedAt: '2026-10-04T07:15:00.000Z',
        listingType: 'STANDARD',
        pricingModel: 'INDIVIDUAL_PURCHASE',
        price: 15,
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'SINGLE_EDITION'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 180, // 150-250 words
        hasPhotography: true,
        photoCount: 1,
        hasVideo: false,
        originalityStatus: 'VERIFIED_ORIGINAL',
        originalityScorePercent: 99.6,
        viewsCount: 290,
        purchasesCount: 9,
        grossRevenue: 135,
        netRevenue: 108,
        createdAt: '2026-10-04T07:20:00.000Z',
        updatedAt: '2026-10-04T07:20:00.000Z'
      },

      // --- TAMIL DISPATCHES ---
      {
        listingId: 'mkt-ta-spot-01',
        newsId: 'art-ta-101',
        reporterId: 'rep-s-kumar',
        reporterName: 'S. Kumaravel',
        reporterByline: 'எஸ். குமரவேல் (Sports Bureau Chennai)',
        sourceTenantId: 'freelance_open',
        title: 'சென்னை சேப்பாக்கம் மைதானத்தில் ஐபிஎல் டிக்கெட் விற்பனை விறுவிறுப்பு: நள்ளிரவு முதல் காத்திருக்கும் ரசிகர்கள்',
        shortDescription: 'சேப்பாக்கம் ஸ்டேடியம் கவுண்ட்டர்களில் டிக்கெட் பெற நீண்ட வரிசையில் காத்திருக்கும் கிரிக்கெட் ரசிகர்கள். சிறப்பு மெட்ரோ ரயில் ஏற்பாடுகள்.',
        category: 'Sports',
        language: 'ta',
        storyType: 'spot_news',
        district: 'Chennai City',
        state: 'Tamil Nadu',
        publishedAt: '2026-10-04T08:00:00.000Z',
        listingType: 'STANDARD',
        pricingModel: 'INDIVIDUAL_PURCHASE',
        price: 10,
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'SINGLE_EDITION'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 135, // 100-150 words
        hasPhotography: true,
        photoCount: 2,
        hasVideo: false,
        originalityStatus: 'VERIFIED_ORIGINAL',
        originalityScorePercent: 99.0,
        viewsCount: 180,
        purchasesCount: 7,
        grossRevenue: 70,
        netRevenue: 56,
        createdAt: '2026-10-04T08:05:00.000Z',
        updatedAt: '2026-10-04T08:05:00.000Z'
      },
      {
        listingId: 'mkt-ta-pol-02',
        newsId: 'art-ta-102',
        reporterId: 'rep-r-meenakshi',
        reporterName: 'R. Meenakshi',
        reporterByline: 'ஆர். மீனாட்சி (State Political Desk)',
        sourceTenantId: 'freelance_open',
        title: 'தமிழக பட்ஜெட் கூட்டத்தொடரில் முக்கிய உள்கட்டமைப்பு திட்டங்களுக்கு நிதி ஒதுக்கீடு: துறைமுக விரிவாக்க அறிவிப்பு',
        shortDescription: 'தூத்துக்குடி மற்றும் எண்ணூர் துறைமுகங்களின் சரக்கு கையாளுதல் திறனை இரட்டிப்பாக்க புதிய மூலதன நிதி ஒதுக்கீடு குறித்த சட்டசபை விவாதம்.',
        category: 'Politics',
        language: 'ta',
        storyType: 'general',
        district: 'Secretariat Bureau',
        state: 'Tamil Nadu',
        publishedAt: '2026-10-03T15:20:00.000Z',
        listingType: 'PREMIUM',
        pricingModel: 'PREMIUM_PURCHASE',
        price: 20,
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'REGIONAL'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 380, // 250-500 words
        hasPhotography: true,
        photoCount: 3,
        hasVideo: true, // Video News
        videoCount: 1,
        originalityStatus: 'VERIFIED_ORIGINAL',
        originalityScorePercent: 99.3,
        viewsCount: 240,
        purchasesCount: 11,
        grossRevenue: 220,
        netRevenue: 176,
        createdAt: '2026-10-03T15:25:00.000Z',
        updatedAt: '2026-10-03T15:25:00.000Z'
      },

      // --- KANNADA DISPATCHES ---
      {
        listingId: 'mkt-kn-crime-01',
        newsId: 'art-kn-101',
        reporterId: 'rep-b-prashanth',
        reporterName: 'B. Prashanth',
        reporterByline: 'ಬಿ. ಪ್ರಶಾಂತ್ (Bengaluru Cyber Cell)',
        sourceTenantId: 'freelance_open',
        title: 'ಬೆಂಗಳೂರು ಸೈಬರ್ ಕ್ರೈಂ: ವೃದ್ಧ ದಂಪತಿಗೆ 2 ಕೋಟಿ ವಂಚಿಸಿದ ಡಿಜಿಟಲ್ ಅರೆಸ್ಟ್ ಗ್ಯಾಂಗ್ ಸೆರೆ',
        shortDescription: 'ಸಿಬಿಐ ಅಧಿಕಾರಿಗಳ ಸೋಗಿನಲ್ಲಿ ಕರೆ ಮಾಡಿ ವಿಡಿಯೋ ಕಾಲ್ ಮೂಲಕ ಹಣ ವರ್ಗಾವಣೆ ಮಾಡಿಸಿಕೊಂಡ ಅಂತರರಾಜ್ಯ ವಂಚಕರ ತಂಡವನ್ನು ಸೈಬರ್ ಪೊಲೀಸರು ಬಂಧಿಸಿದ್ದಾರೆ.',
        category: 'Crime & Justice',
        language: 'kn',
        storyType: 'spot_news',
        district: 'Bengaluru Urban',
        state: 'Karnataka',
        publishedAt: '2026-10-04T10:15:00.000Z',
        listingType: 'STANDARD',
        pricingModel: 'INDIVIDUAL_PURCHASE',
        price: 10,
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'SINGLE_EDITION'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 145, // 100-150 words
        hasPhotography: false, // Text Only
        photoCount: 0,
        hasVideo: false,
        originalityStatus: 'VERIFIED_ORIGINAL',
        originalityScorePercent: 99.5,
        viewsCount: 165,
        purchasesCount: 6,
        grossRevenue: 60,
        netRevenue: 48,
        createdAt: '2026-10-04T10:20:00.000Z',
        updatedAt: '2026-10-04T10:20:00.000Z'
      },
      {
        listingId: 'mkt-kn-tech-02',
        newsId: 'art-kn-102',
        reporterId: 'rep-g-hegde',
        reporterName: 'G. Hegde',
        reporterByline: 'ಜಿ. ಹೆಗಡೆ (Tech & Auto Desk)',
        sourceTenantId: 'freelance_open',
        title: 'ಕರ್ನಾಟಕ ಎಲೆಕ್ಟ್ರಿಕ್ ವಾಹನ ನೀತಿ: ಚಾರ್ಜಿಂಗ್ ನೆಟ್‌ವರ್ಕ್ ಕೊರತೆ ಮತ್ತು ಗ್ರಾಹಕರ ಸವಾಲುಗಳ ಕುರಿತ ತನಿಖಾ ವರದಿ',
        shortDescription: 'ರಾಜ್ಯ ಹೆದ್ದಾರಿಗಳಲ್ಲಿ ಇವಿ ಚಾರ್ಜಿಂಗ್ ಕೇಂದ್ರಗಳ ಅಸಮರ್ಪಕ ನಿರ್ವಹಣೆ ಹಾಗೂ ಬ್ಯಾಟರಿ ಸ್ವಾಪಿಂಗ್ ನೀತಿಯ ಅನುಷ್ಠಾನದಲ್ಲಿನ ವಿಳಂಬದ ವಾಸ್ತವ ಚಿತ್ರಣ.',
        category: 'Technology & Science',
        language: 'kn',
        storyType: 'investigative',
        district: 'Mysuru Division',
        state: 'Karnataka',
        publishedAt: '2026-10-03T11:45:00.000Z',
        listingType: 'PREMIUM',
        pricingModel: 'PREMIUM_PURCHASE',
        price: 30,
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'MULTI_EDITION'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 460, // 250-500 words
        hasPhotography: true,
        photoCount: 4,
        hasVideo: false,
        originalityStatus: 'VERIFIED_ORIGINAL',
        originalityScorePercent: 99.7,
        viewsCount: 310,
        purchasesCount: 8,
        grossRevenue: 240,
        netRevenue: 192,
        createdAt: '2026-10-03T11:50:00.000Z',
        updatedAt: '2026-10-03T11:50:00.000Z'
      },

      // --- BENGALI DISPATCHES ---
      {
        listingId: 'mkt-bn-cult-01',
        newsId: 'art-bn-101',
        reporterId: 'rep-s-banerjee',
        reporterName: 'Subir Banerjee',
        reporterByline: 'সুবীর ব্যানার্জী (Culture & Heritage)',
        sourceTenantId: 'freelance_open',
        title: 'কলকাতা আন্তর্জাতিক বইমেলায় তরুণ সাহিত্যিকদের নতুন দিগন্ত: ডিজিটাল প্রকাশনা বনাম মুদ্রিত বই',
        shortDescription: 'ঐতিহ্যবাহী বইমেলার প্রাঙ্গণে নতুন প্রজন্মের লেখকদের স্বতঃস্ফূর্ত অংশগ্রহণ এবং সাহিত্য চর্চায় ডিজিটাল প্রযুক্তির ইতিবাচক প্রভাব নিয়ে বিশেষ সম্পাদকীয়।',
        category: 'Culture & Entertainment',
        language: 'bn',
        storyType: 'editorial',
        district: 'Kolkata Metropolitan',
        state: 'West Bengal',
        publishedAt: '2026-10-04T06:30:00.000Z',
        listingType: 'STANDARD',
        pricingModel: 'INDIVIDUAL_PURCHASE',
        price: 15,
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'SINGLE_EDITION'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 240, // 150-250 words
        hasPhotography: true,
        photoCount: 2,
        hasVideo: false,
        originalityStatus: 'VERIFIED_ORIGINAL',
        originalityScorePercent: 99.1,
        viewsCount: 195,
        purchasesCount: 8,
        grossRevenue: 120,
        netRevenue: 96,
        createdAt: '2026-10-04T06:35:00.000Z',
        updatedAt: '2026-10-04T06:35:00.000Z'
      },
      {
        listingId: 'mkt-bn-health-02',
        newsId: 'art-bn-102',
        reporterId: 'rep-a-ganguly',
        reporterName: 'Ananya Ganguly',
        reporterByline: 'অনন্যা গাঙ্গুলী (Coastal Environment Desk)',
        sourceTenantId: 'freelance_open',
        title: 'সুন্দরবন উপকূলবর্তী দ্বীপাঞ্চলে ডেঙ্গু ও জলবাহিত রোগ প্রতিরোধে ভ্রাম্যমাণ স্বাস্থ্য দলের বিশেষ অভিযান',
        shortDescription: 'বর্ষা-পরবর্তী উপকূলীয় জনবসতিতে বিশুদ্ধ পানীয় জল সরবরাহ এবং স্বাস্থ্য শিবিরের মাধ্যমে বিনামূল্যে ওষুধ বিতরণের মাঠপর্যায়ের বিবরণ।',
        category: 'Health & Science',
        language: 'bn',
        storyType: 'general',
        district: 'South 24 Parganas',
        state: 'West Bengal',
        publishedAt: '2026-10-03T13:10:00.000Z',
        listingType: 'STANDARD',
        pricingModel: 'INDIVIDUAL_PURCHASE',
        price: 20,
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'SINGLE_EDITION'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 320, // 250-500 words
        hasPhotography: true,
        photoCount: 3,
        hasVideo: true, // Video News
        videoCount: 1,
        originalityStatus: 'VERIFIED_ORIGINAL',
        originalityScorePercent: 99.4,
        viewsCount: 275,
        purchasesCount: 10,
        grossRevenue: 200,
        netRevenue: 160,
        createdAt: '2026-10-03T13:15:00.000Z',
        updatedAt: '2026-10-03T13:15:00.000Z'
      },

      // --- ODIA DISPATCHES ---
      {
        listingId: 'mkt-or-agri-01',
        newsId: 'art-or-101',
        reporterId: 'rep-b-mohapatra',
        reporterName: 'B. Mohapatra',
        reporterByline: 'ବି. ମହାପାତ୍ର (Agriculture Reporter)',
        sourceTenantId: 'freelance_open',
        title: 'ଓଡ଼ିଶା ଉପକୂଳରେ ଧାନ ଅମଳ ପରେ ଶସ୍ୟ ସଂରକ୍ଷଣ ସମସ୍ୟା: ମଣ୍ଡି ବ୍ୟବସ୍ଥାରେ ଶୀଘ୍ର ସଂସ୍କାର ଦାବି କଲେ କୃଷକ',
        shortDescription: 'ପ୍ରବଳ ବର୍ଷା ଆଶଙ୍କା ମଧ୍ୟରେ ଅମଳ ଧାନ ରଖିବାକୁ ପର୍ଯ୍ୟାପ୍ତ ଗୋଦାମ ଘର ଅଭାବ। ସରକାରୀ ମଣ୍ଡି ଖୋଲିବାରେ ବିଳମ୍ବ ନେଇ ଚିନ୍ତାରେ ଚାଷୀ।',
        category: 'Agriculture & Rural',
        language: 'or',
        storyType: 'general',
        district: 'Puri Coastal Bureau',
        state: 'Odisha',
        publishedAt: '2026-10-04T05:45:00.000Z',
        listingType: 'STANDARD',
        pricingModel: 'INDIVIDUAL_PURCHASE',
        price: 15,
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'SINGLE_EDITION'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 290, // 250-500 words
        hasPhotography: true,
        photoCount: 2,
        hasVideo: false,
        originalityStatus: 'VERIFIED_ORIGINAL',
        originalityScorePercent: 99.3,
        viewsCount: 145,
        purchasesCount: 5,
        grossRevenue: 75,
        netRevenue: 60,
        createdAt: '2026-10-04T05:50:00.000Z',
        updatedAt: '2026-10-04T05:50:00.000Z'
      },
      {
        listingId: 'mkt-or-spot-02',
        newsId: 'art-or-102',
        reporterId: 'rep-s-das',
        reporterName: 'S. Das',
        reporterByline: 'ଏସ୍. ଦାସ (Sports Desk)',
        sourceTenantId: 'freelance_open',
        title: 'ଭୁବନେଶ୍ୱର କଳିଙ୍ଗ ଷ୍ଟାଡିୟମରେ ଜାତୀୟ ହକି ଚାମ୍ପିଅନସିପ୍ ଉଦ୍‌ଘାଟିତ: ପ୍ରଥମ ମ୍ୟାଚରେ ଓଡ଼ିଶା ଦଳର ବିଜୟ',
        shortDescription: 'ରୋମାଞ୍ଚକର ପ୍ରଥମ ମ୍ୟାଚରେ ଓଡ଼ିଶା ହକି ଦଳ ୪-୨ ଗୋଲରେ ପ୍ରତିଦ୍ୱନ୍ଦ୍ୱୀ ଦଳକୁ ପରାସ୍ତ କରି ସେମିଫାଇନାଲରେ ପ୍ରବେଶ କଲା।',
        category: 'Sports',
        language: 'or',
        storyType: 'spot_news',
        district: 'Bhubaneswar Capital',
        state: 'Odisha',
        publishedAt: '2026-10-04T13:00:00.000Z',
        listingType: 'STANDARD',
        pricingModel: 'INDIVIDUAL_PURCHASE',
        price: 10,
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'SINGLE_EDITION'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 120, // 100-150 words
        hasPhotography: true,
        photoCount: 3,
        hasVideo: false,
        originalityStatus: 'VERIFIED_ORIGINAL',
        originalityScorePercent: 99.0,
        viewsCount: 130,
        purchasesCount: 4,
        grossRevenue: 40,
        netRevenue: 32,
        createdAt: '2026-10-04T13:05:00.000Z',
        updatedAt: '2026-10-04T13:05:00.000Z'
      },

      // --- HINDI DISPATCHES ---
      {
        listingId: 'mkt-hi-pol-01',
        newsId: 'art-hi-101',
        reporterId: 'rep-v-sharma',
        reporterName: 'Vikas Sharma',
        reporterByline: 'विकास शर्मा (Parliament Bureau New Delhi)',
        sourceTenantId: 'freelance_open',
        title: 'संसद सत्र: डिजिटल सुरक्षा विधेयक पर तीखी बहस, पक्ष-विपक्ष में सहमति के लिए समिति गठित',
        shortDescription: 'संसदीय कार्यमंत्री ने डेटा गोपनीयता और राष्ट्रीय सुरक्षा प्रावधानों पर विपक्ष के संशय दूर करने हेतु संयुक्त संसदीय समिति को प्रस्ताव सौंपा।',
        category: 'Politics',
        language: 'hi',
        storyType: 'spot_news',
        district: 'New Delhi National',
        state: 'Delhi',
        publishedAt: '2026-10-04T11:20:00.000Z',
        listingType: 'STANDARD',
        pricingModel: 'INDIVIDUAL_PURCHASE',
        price: 15,
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'SINGLE_EDITION'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 140, // 100-150 words
        hasPhotography: false, // Text only
        photoCount: 0,
        hasVideo: true, // Video News
        videoCount: 1,
        originalityStatus: 'VERIFIED_ORIGINAL',
        originalityScorePercent: 99.2,
        viewsCount: 420,
        purchasesCount: 15,
        grossRevenue: 225,
        netRevenue: 180,
        createdAt: '2026-10-04T11:25:00.000Z',
        updatedAt: '2026-10-04T11:25:00.000Z'
      },
      {
        listingId: 'mkt-hi-health-02',
        newsId: 'art-hi-102',
        reporterId: 'rep-p-mishra',
        reporterName: 'Priya Mishra',
        reporterByline: 'प्रिया मिश्रा (Health & Environment Special)',
        sourceTenantId: 'freelance_open',
        title: 'राजधानी क्षेत्र में मौसमी प्रदूषण और बच्चों के श्वसन स्वास्थ्य पर ग्राउंड रिपोर्ट: अस्पतालों में ओपीडी 30% बढ़ी',
        shortDescription: 'पीएम 2.5 स्तर खतरनाक सीमा पार। बाल रोग विशेषज्ञों ने स्कूलों में आउटडोर गतिविधियों पर तत्काल रोक लगाने की सिफारिश की।',
        category: 'Health & Science',
        language: 'hi',
        storyType: 'investigative',
        district: 'NCR Corridor',
        state: 'Uttar Pradesh',
        publishedAt: '2026-10-03T09:30:00.000Z',
        listingType: 'PREMIUM',
        pricingModel: 'PREMIUM_PURCHASE',
        price: 40,
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'REGIONAL'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 580, // 500+ words
        hasPhotography: true,
        photoCount: 4,
        hasVideo: false,
        originalityStatus: 'VERIFIED_ORIGINAL',
        originalityScorePercent: 99.8,
        viewsCount: 350,
        purchasesCount: 14,
        grossRevenue: 560,
        netRevenue: 448,
        createdAt: '2026-10-03T09:35:00.000Z',
        updatedAt: '2026-10-03T09:35:00.000Z'
      },
      {
        listingId: 'mkt-hi-satire-03',
        newsId: 'art-hi-103',
        reporterId: 'rep-vyangya-dal',
        reporterName: 'Vyangya Mitra',
        reporterByline: 'राजनीतिक व्यंग्य स्तंभ',
        sourceTenantId: 'freelance_open',
        title: 'चुनावी मौसम में वादों की बरसात और जनता का सूखा छाता: नेताओं के भाषणों पर तीखा व्यंग्य',
        shortDescription: 'सड़कें कागज पर बन चुकी हैं और पानी के पाइप नलों से पहले विज्ञापनों में लग चुके हैं। एक आम मतदाता की डायरी से चुटीले अंश।',
        category: 'Culture & Entertainment',
        language: 'hi',
        storyType: 'satirical',
        district: 'Varanasi Central',
        state: 'Uttar Pradesh',
        publishedAt: '2026-10-04T07:40:00.000Z',
        listingType: 'STANDARD',
        pricingModel: 'INDIVIDUAL_PURCHASE',
        price: 15,
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'SINGLE_EDITION'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 190, // 150-250 words
        hasPhotography: true,
        photoCount: 1,
        hasVideo: false,
        originalityStatus: 'VERIFIED_ORIGINAL',
        originalityScorePercent: 99.0,
        viewsCount: 220,
        purchasesCount: 7,
        grossRevenue: 105,
        netRevenue: 84,
        createdAt: '2026-10-04T07:45:00.000Z',
        updatedAt: '2026-10-04T07:45:00.000Z'
      },

      // --- MORE ENGLISH DISPATCHES ---
      {
        listingId: 'mkt-en-crime-01',
        newsId: 'art-en-101',
        reporterId: 'rep-alex-turner',
        reporterName: 'Alex Turner',
        reporterByline: 'Alex Turner (Financial Crime Desk)',
        sourceTenantId: 'freelance_open',
        title: 'Financial Intelligence Unit Freezes ₹65 Crore in Multilevel Offshore Crypto Scam',
        shortDescription: 'Enforcement Directorate uncovers bogus algorithmic trading apps operated across overseas cloud servers targeting retail investors.',
        category: 'Crime & Justice',
        language: 'en',
        storyType: 'spot_news',
        district: 'Mumbai Financial',
        state: 'Maharashtra',
        publishedAt: '2026-10-04T12:00:00.000Z',
        listingType: 'STANDARD',
        pricingModel: 'INDIVIDUAL_PURCHASE',
        price: 10,
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'SINGLE_EDITION'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 125, // 100-150 words
        hasPhotography: false, // Text Only
        photoCount: 0,
        hasVideo: false,
        originalityStatus: 'VERIFIED_ORIGINAL',
        originalityScorePercent: 99.4,
        viewsCount: 290,
        purchasesCount: 12,
        grossRevenue: 120,
        netRevenue: 96,
        createdAt: '2026-10-04T12:05:00.000Z',
        updatedAt: '2026-10-04T12:05:00.000Z'
      },
      {
        listingId: 'mkt-en-sports-02',
        newsId: 'art-en-102',
        reporterId: 'rep-r-choudhury',
        reporterName: 'Rohit Choudhury',
        reporterByline: 'Rohit Choudhury (National Sports Wire)',
        sourceTenantId: 'freelance_open',
        title: 'National Badminton Championship: Junior Prodigy Stuns World No. 14 in Straight Sets',
        shortDescription: '17-year-old unseeded shuttler produces immaculate baseline defense and cross-court drops to seal a historic quarterfinal victory in Hyderabad.',
        category: 'Sports',
        language: 'en',
        storyType: 'general',
        district: 'Hyderabad Sports Complex',
        state: 'Telangana',
        publishedAt: '2026-10-04T14:15:00.000Z',
        listingType: 'STANDARD',
        pricingModel: 'INDIVIDUAL_PURCHASE',
        price: 20,
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'SINGLE_EDITION'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 210, // 150-250 words
        hasPhotography: true,
        photoCount: 3,
        hasVideo: true, // Video News
        videoCount: 1,
        originalityStatus: 'VERIFIED_ORIGINAL',
        originalityScorePercent: 99.6,
        viewsCount: 340,
        purchasesCount: 16,
        grossRevenue: 320,
        netRevenue: 256,
        createdAt: '2026-10-04T14:20:00.000Z',
        updatedAt: '2026-10-04T14:20:00.000Z'
      },
      {
        listingId: 'mkt-en-edit-03',
        newsId: 'art-en-103',
        reporterId: 'rep-c-merchant',
        reporterName: 'Claire Merchant',
        reporterByline: 'Claire Merchant (Chief Macroeconomic Analyst)',
        sourceTenantId: 'freelance_open',
        title: 'Editorial: Central Bank Policy Rates and the Looming Industrial CapEx Dilemma',
        shortDescription: 'Why liquidity buffers alone will not stimulate private manufacturing capital expenditure without reciprocal trade tariff clarity.',
        category: 'Business & Economy',
        language: 'en',
        storyType: 'editorial',
        district: 'National Bureau',
        state: 'New Delhi',
        publishedAt: '2026-10-03T18:00:00.000Z',
        listingType: 'STANDARD',
        pricingModel: 'INDIVIDUAL_PURCHASE',
        price: 15,
        currency: 'INR',
        licenseOptions: ['DIGITAL_ONLY', 'PRINT_ONLY', 'SINGLE_EDITION'],
        availability: 'AVAILABLE',
        status: 'ACTIVE',
        wordCount: 350, // 250-500 words
        hasPhotography: false, // Text Only
        photoCount: 0,
        hasVideo: false,
        originalityStatus: 'VERIFIED_ORIGINAL',
        originalityScorePercent: 99.7,
        viewsCount: 180,
        purchasesCount: 9,
        grossRevenue: 135,
        netRevenue: 108,
        createdAt: '2026-10-03T18:05:00.000Z',
        updatedAt: '2026-10-03T18:05:00.000Z'
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
    newsSubmissionService.markArticleListedInMarketplace(article.articleId);
    this.persistState();

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
    this.persistState();

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
    this.persistState();

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
    this.persistState();

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

  /**
   * Merges live syndicated wire listings published to Firestore by the GCE e2-micro worker.
   */
  upsertLiveWireListings(wireListings: MarketplaceListing[]): void {
    let changed = false;
    for (const item of wireListings) {
      if (!item.listingId) continue;
      const existing = this.listings.get(item.listingId);
      if (!existing || existing.updatedAt !== item.updatedAt || existing.featuredImageUrl !== item.featuredImageUrl) {
        this.listings.set(item.listingId, {
          ...existing,
          ...item,
        });
        changed = true;
      }
    }
    if (changed) {
      this.persistState();
    }
  }

  /**
   * Caches a full rewritten article fetched from Firestore /news/{newsId}.
   */
  cacheWireArticle(article: NewsArticle): void {
    if (!article?.articleId) return;
    this.wireArticleCache.set(article.articleId, article);
  }

  /**
   * Claims a subscriber-included wire story at ₹0 without consuming paid pack units.
   * Requires an active Marketplace subscription entitlement on the buyer tenant.
   */
  async claimSubscriberIncludedStory(params: {
    idempotencyKey: string;
    buyerTenantId: string;
    buyerTenantName?: string;
    buyerUserId: string;
    buyerUserName?: string;
    listingId: string;
  }): Promise<{
    purchase: MarketplacePurchase;
    license: NewsLicense;
  }> {
    const {
      idempotencyKey,
      buyerTenantId,
      buyerTenantName = 'Subscriber Organization',
      buyerUserId,
      buyerUserName = 'Subscriber Editor',
      listingId,
    } = params;

    const listing = this.listings.get(listingId);
    if (!listing) throw new Error('Listing not found');

    const isSubscriberIncluded = Boolean(
      listing.includedInSubscription ||
        (listing.sourceType === 'WIRE_FEED' && listing.pricingModel === 'SUBSCRIPTION_ENTITLEMENT' && listing.price === 0)
    );
    if (!isSubscriberIncluded) {
      throw new Error('This listing is not eligible for zero-cost subscriber wire claims.');
    }

    const entitlement = this.entitlements.get(buyerTenantId);
    if (!entitlement || entitlement.status !== 'active') {
      throw new Error('An active Marketplace subscription is required to claim included wire stories.');
    }

    // Reuse existing active license if already claimed
    const existingLicense = Array.from(this.licenses.values()).find(
      (lic) => lic.listingId === listingId && lic.buyerTenantId === buyerTenantId && lic.status === 'ACTIVE'
    );
    const now = new Date().toISOString();

    if (existingLicense) {
      const existingPurchase: MarketplacePurchase = {
        purchaseId: existingLicense.purchaseId || `wire_claim_${Date.now()}`,
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
        licenseId: existingLicense.licenseId,
        pricingModel: 'SUBSCRIPTION_ENTITLEMENT',
        grossAmount: 0,
        platformFee: 0,
        reporterShare: 0,
        sourceOrganizationShare: 0,
        currency: listing.currency || 'INR',
        status: 'completed',
        purchasedAt: existingLicense.grantedAt,
        articleTitle: listing.title,
        licenseType: existingLicense.type,
      };
      return { purchase: existingPurchase, license: existingLicense };
    }

    const purchaseId = `wire_claim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const licenseId = `lic_wire_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

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
      type: 'DIGITAL_AND_PRINT',
      scope: 'subscriber_wire_syndication',
      territory: listing.state || 'National',
      durationDays: 365,
      allowedMedia: ['digital_web', 'print_broadsheet'],
      allowedEditions: -1,
      exclusivity: false,
      resaleAllowed: false,
      derivativeEditingAllowed: true,
      attributionRequired: true,
      status: 'ACTIVE',
      grantedAt: now,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
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
      pricingModel: 'SUBSCRIPTION_ENTITLEMENT',
      grossAmount: 0,
      platformFee: 0,
      reporterShare: 0,
      sourceOrganizationShare: 0,
      currency: listing.currency || 'INR',
      status: 'completed',
      purchasedAt: now,
      entitlementId: entitlement.entitlementId,
      articleTitle: listing.title,
      licenseType: 'DIGITAL_AND_PRINT',
    };

    listing.purchasesCount = (listing.purchasesCount || 0) + 1;
    this.purchases.set(purchaseId, purchase);
    this.licenses.set(licenseId, license);
    this.idempotencyRecords.set(idempotencyKey, purchase);
    this.persistState();

    await auditService.log({
      tenantId: buyerTenantId,
      actorId: buyerUserId,
      actorName: buyerUserName,
      actorRole: 'buyer',
      action: 'SUBSCRIBER_WIRE_CLAIMED',
      entityType: 'NewsLicense',
      entityId: licenseId,
      newState: license,
      reason: `Claimed subscriber-included wire story "${listing.title}" at ₹0`,
      metadata: { listingId, newsId: listing.newsId, entitlementId: entitlement.entitlementId },
    });

    return { purchase, license };
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
    featuredImageUrl?: string;
    imageCaption?: string;
    byline: string;
    category: string;
    location?: string;
    license?: NewsLicense;
    accessReason: string;
    isEvidenceRedacted: boolean;
  } {
    const { newsId, requestingTenantId, requestingUserId, requestingRole } = params;

    // Find the underlying article from live wire cache, dynamic newsSubmissionService, then seed articles
    const article =
      this.wireArticleCache.get(newsId) ||
      newsSubmissionService.getArticle(newsId) ||
      MOCK_NEWS_ARTICLES.find(a => a.articleId === newsId);
    const listing = Array.from(this.listings.values()).find(l => l.newsId === newsId);

    const headline = article?.headline || listing?.title || 'News Item';
    const lead = article?.leadParagraph || listing?.shortDescription || '';
    const byline = article?.byline || listing?.reporterByline || 'Staff Reporter';
    const category = article?.category || listing?.category || 'News';
    const location = article?.location || listing?.district;
    const featuredImageUrl =
      article?.coverImageUrl || article?.heroImageUrl || article?.imageUrl || listing?.featuredImageUrl;
    const imageCaption = article?.coverImageCaption || article?.imageCaption || listing?.imageCaption;

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
        featuredImageUrl,
        imageCaption,
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
    return {
      hasFullAccess: false,
      headline,
      leadParagraph: lead,
      bodyContent: undefined, // Omitted
      featuredImageUrl,
      imageCaption,
      byline,
      category,
      location,
      accessReason: listing?.includedInSubscription
        ? 'Subscriber Wire Preview (Claim free with your active Marketplace subscription)'
        : 'Marketplace Preview Only (Full story requires license or subscription redemption)',
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
      article:
        this.wireArticleCache.get(lic.newsId) ||
        newsSubmissionService.getArticle(lic.newsId) ||
        MOCK_NEWS_ARTICLES.find(a => a.articleId === lic.newsId)
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
      this.persistState();
    }
  }

  getLinkedEditionsForLicense(licenseId: string): string[] {
    return this.licenseToEditions.get(licenseId) || [];
  }
}

export const marketplaceService = new MarketplaceService();
