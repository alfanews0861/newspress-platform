/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * User Portal Service
 * Alfa New Gen Platforms - State Management & Operations for User Hub
 */

import {
  ExtendedUserProfile,
  UserSubscriptionPlan,
  UserCreditWallet,
  UserCreditTransaction,
  UserPaperBookmark,
  UserReporterDispatch,
  UserYouTubeSettingsConfig,
  UserRoleType,
} from '../types/userPortal';

const STORAGE_KEYS = {
  PROFILE: 'alfanewgen_user_profile_v1',
  PLAN: 'alfanewgen_user_plan_v1',
  WALLET: 'alfanewgen_user_wallet_v1',
  PAPERS: 'alfanewgen_user_papers_v1',
  DISPATCHES: 'alfanewgen_user_dispatches_v1',
  YOUTUBE: 'alfanewgen_user_youtube_v1',
};

const DEFAULT_PROFILE: ExtendedUserProfile = {
  uid: 'usr_alfa_101',
  displayName: 'K. Shiva Prasad',
  email: 'shiva.prasad@alfanewgen.com',
  photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  phoneNumber: '+91 98480 22334',
  isPhoneVerified: true,
  role: 'reporter',
  organizationName: 'Alfa New Gen Regional Newsroom',
  state: 'Telangana',
  district: 'Hyderabad',
  mandalOrCity: 'HITEC City',
  pincode: '500081',
  pressAccreditationId: 'TS-PIB-2026-8942',
  govtIdMasked: 'XXXX-XXXX-4589',
  upiId: 'shivaprasad@okhdfcbank',
  bankAccountHolderName: 'K. Shiva Prasad',
  bankAccountNumberMasked: 'XXXXXXXX7890',
  bankIfsc: 'HDFC0001234',
  hasAcceptedLegalAgreements: true,
  agreementsAcceptedAt: '2026-10-15T09:30:00.000Z',
  agreementsVersion: 'Alfa-v3.0-2026',
  acceptedPolicies: {
    termsOfService: true,
    privacyPolicyDPDP: true,
    googleApiUserPolicy: true,
    youtubeTermsOfService: true,
    playStoreUserPolicy: true,
    pciEthicsCode: true,
  },
  onboardingCompleted: true,
  createdAt: '2026-10-15T09:30:00.000Z',
  updatedAt: '2026-11-22T12:00:00.000Z',
};

const DEFAULT_PLAN: UserSubscriptionPlan = {
  planId: 'reporter_pro',
  name: 'Reporter Pro & Digital Newsroom',
  pricePerMonthINR: 499,
  billingCycle: 'monthly',
  status: 'active',
  startDate: '2026-11-01T00:00:00.000Z',
  renewalDate: '2026-12-01T00:00:00.000Z',
  monthlyCreditQuota: 2500,
  features: [
    'Digital Press ID Card with QR Verification',
    'Unlimited Wire Story Submissions with Plagiarism Check',
    'Direct UPI Royalties on Published BroadSheets',
    'High-Resolution ePaper BroadSheet Downloads',
    'Broadcast News-to-Video Reel Creator (10 videos/mo)',
    'Full Legal Intermediary Safe Harbor & Statutory Protection',
  ],
  maxEditions: 5,
  maxReporters: 3,
  hasYouTubeAutomation: true,
};

const DEFAULT_WALLET: UserCreditWallet = {
  currentBalance: 1850,
  lifetimePurchased: 4500,
  lifetimeConsumed: 2650,
  lastRechargeAt: '2026-11-10T14:20:00.000Z',
  transactions: [
    {
      id: 'tx_alfa_101',
      type: 'credit',
      amount: 1500,
      balanceAfter: 1850,
      description: 'UPI Recharge - Pro Credit Pack',
      category: 'recharge',
      timestamp: '2026-11-10T14:20:00.000Z',
      referenceId: 'UPI-ALFA-991823',
    },
    {
      id: 'tx_alfa_102',
      type: 'debit',
      amount: 150,
      balanceAfter: 350,
      description: 'Broadcast YouTube News Reel Produced',
      category: 'youtube_render',
      timestamp: '2026-11-18T18:45:00.000Z',
      referenceId: 'YT-JOB-88219',
    },
    {
      id: 'tx_alfa_103',
      type: 'debit',
      amount: 100,
      balanceAfter: 500,
      description: 'High-Res Vector Print ePaper Plate Generated (Page 1 & 2)',
      category: 'epaper_export',
      timestamp: '2026-11-20T08:15:00.000Z',
      referenceId: 'EPAPER-GEN-4412',
    },
    {
      id: 'tx_alfa_104',
      type: 'credit',
      amount: 500,
      balanceAfter: 600,
      description: 'Wire Story Royalty Reward - Published in City Edition',
      category: 'wire_royalty',
      timestamp: '2026-11-21T11:00:00.000Z',
      referenceId: 'ROYALTY-DISP-7721',
    },
  ],
};

const DEFAULT_PAPERS: UserPaperBookmark[] = [
  {
    id: 'paper-hyd-morning',
    editionTitle: 'Alfa Daily - Hyderabad City Main Edition',
    editionDate: '2026-11-22',
    district: 'Hyderabad / Secunderabad',
    language: 'Telugu',
    pageCount: 16,
    pdfDownloadUrl: '#',
    thumbnailUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80',
    isNightPressLocked: true,
  },
  {
    id: 'paper-wgl-morning',
    editionTitle: 'Alfa Express - Warangal & North Telangana Tabloid',
    editionDate: '2026-11-22',
    district: 'Warangal Urban & Rural',
    language: 'Telugu',
    pageCount: 12,
    pdfDownloadUrl: '#',
    thumbnailUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=80',
    isNightPressLocked: true,
  },
  {
    id: 'paper-state-financial',
    editionTitle: 'Alfa New Gen Financial & Commerce BroadSheet',
    editionDate: '2026-11-21',
    district: 'Statewide Business Edition',
    language: 'English',
    pageCount: 8,
    pdfDownloadUrl: '#',
    thumbnailUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&auto=format&fit=crop&q=80',
    isNightPressLocked: true,
  },
];

const DEFAULT_DISPATCHES: UserReporterDispatch[] = [
  {
    id: 'disp-hyd-01',
    headline: 'Metro Phase-3 Elevated Corridor Geotechnical Soil Testing Begins at Financial District',
    district: 'Hyderabad',
    mandal: 'Serilingampally',
    category: 'Development & Transport',
    bodyText: 'HMRL officials initiated geotechnical core drilling today along the 12-kilometer IT corridor stretch. The survey involves 45-meter core sampling to assess bedrock density before pylon erection.',
    originalityScore: 94,
    photos: ['https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600&auto=format&fit=crop&q=80'],
    status: 'published_print',
    submittedAt: '2026-11-21T14:30:00.000Z',
    reviewedAt: '2026-11-21T18:40:00.000Z',
    reviewRemarks: 'Corroborated with HMRL Chief Engineer press release. Approved for Page 3 City Lead.',
    royaltyEarnedINR: 500,
    isRoyaltyPaid: true,
    upiPaymentRef: 'UPI-ALFA-DISP-7721',
  },
  {
    id: 'disp-hyd-02',
    headline: 'Solar Powered Cold Storage Facility Inaugurated for Organic Mango Farmers in Rangareddy',
    district: 'Rangareddy',
    mandal: 'Shabad',
    category: 'Agriculture & Rural',
    bodyText: 'A state-of-the-art 500 MT decentralized solar cold storage warehouse opened today, eliminating middlemen distress selling during seasonal bumper harvests.',
    originalityScore: 98,
    photos: ['https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=600&auto=format&fit=crop&q=80'],
    status: 'under_review',
    submittedAt: '2026-11-22T10:15:00.000Z',
    reviewRemarks: 'Under desk verification by Senior Agricultural Editor.',
    royaltyEarnedINR: 650,
    isRoyaltyPaid: false,
  },
];

const DEFAULT_YOUTUBE: UserYouTubeSettingsConfig = {
  isConnected: true,
  channelId: 'UC_ALFA_NEW_GEN_24X7',
  channelTitle: 'Alfa New Gen Live News',
  channelHandle: '@AlfaNewGenNews',
  subscriberCount: 84500,
  connectedAt: '2026-10-18T10:00:00.000Z',
  autoPublishReels: true,
  preferredVoice: 'ravi_shankar',
  voiceLanguage: 'te-IN',
  newsStyle: 'emotional_breaking',
  scrollingTickerSpeed: 'normal',
  overlayWatermark: true,
  channelLogoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
  communityGuidelinesConsent: true,
  autoInsertCopyrightDisclaimer: true,
  safeHarborExemptionAcknowledged: true,
  defaultDescriptionDisclaimer:
    'DISCLAIMER & SAFE HARBOR: This video broadcast is powered by Alfa New Gen Platforms technology stack. All editorial reporting, voice commentary, and visuals are published under Section 79 of the Information Technology Act 2000 and YouTube Community Guidelines. Alfa New Gen Platforms holds zero liability for publisher-generated claims or third-party content. For grievances, contact grievance@alfanewgen.com.',
};

export class UserPortalService {
  /**
   * Get user profile. If absent, initialize with defaults.
   */
  static getProfile(): ExtendedUserProfile {
    if (typeof window === 'undefined') return DEFAULT_PROFILE;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Error reading user profile:', e);
    }
    return DEFAULT_PROFILE;
  }

  static saveProfile(profile: ExtendedUserProfile): void {
    if (typeof window === 'undefined') return;
    try {
      const updated = { ...profile, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('alfanewgen_user_profile_updated', { detail: updated }));
    } catch (e) {
      console.warn('Error saving user profile:', e);
    }
  }

  /**
   * Complete Google Onboarding Flow
   */
  static completeOnboarding(updates: Partial<ExtendedUserProfile>): ExtendedUserProfile {
    const current = this.getProfile();
    const completed: ExtendedUserProfile = {
      ...current,
      ...updates,
      onboardingCompleted: true,
      hasAcceptedLegalAgreements: true,
      agreementsAcceptedAt: new Date().toISOString(),
      agreementsVersion: 'Alfa-v3.0-2026',
      updatedAt: new Date().toISOString(),
    };
    this.saveProfile(completed);
    return completed;
  }

  /**
   * Subscription Plan
   */
  static getPlan(): UserSubscriptionPlan {
    if (typeof window === 'undefined') return DEFAULT_PLAN;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PLAN);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Error reading plan:', e);
    }
    return DEFAULT_PLAN;
  }

  static upgradePlan(planId: UserSubscriptionPlan['planId']): UserSubscriptionPlan {
    const planCatalog: Record<UserSubscriptionPlan['planId'], Partial<UserSubscriptionPlan>> = {
      free_reader: {
        planId: 'free_reader',
        name: 'Free Reader Tier',
        pricePerMonthINR: 0,
        monthlyCreditQuota: 200,
        features: ['Browse Digital ePaper Daily', 'Read Headlines & Video Summaries'],
        maxEditions: 1,
        maxReporters: 1,
        hasYouTubeAutomation: false,
      },
      reporter_pro: {
        planId: 'reporter_pro',
        name: 'Reporter Pro & Stringer Desk',
        pricePerMonthINR: 499,
        monthlyCreditQuota: 2500,
        features: [
          'Digital Press ID Card with QR Verification',
          'Unlimited Wire Story Submissions with Plagiarism Check',
          'Direct UPI Royalties on Published BroadSheets',
          'High-Resolution ePaper BroadSheet Downloads',
          'Broadcast News-to-Video Reel Creator (10 videos/mo)',
          'Full Legal Intermediary Safe Harbor & Statutory Protection',
        ],
        maxEditions: 5,
        maxReporters: 3,
        hasYouTubeAutomation: true,
      },
      publisher_standard: {
        planId: 'publisher_standard',
        name: 'Publisher Standard Broadsheet Scale',
        pricePerMonthINR: 2499,
        monthlyCreditQuota: 10000,
        features: [
          'Multi-Edition Web Offset Night Press Lock (8-Col broadsheet)',
          'Automated Bureau Distribution & Stringer Roster',
          'Integrated YouTube Studio & Channel Auto-Syndication',
          'Full Section 194J TDS Ledger & Tax Withholding Statements',
          'Unlimited High-Resolution Vector Print PDFs',
        ],
        maxEditions: 15,
        maxReporters: 25,
        hasYouTubeAutomation: true,
      },
      enterprise_network: {
        planId: 'enterprise_network',
        name: 'Enterprise Media Network & TV Broadcaster',
        pricePerMonthINR: 9999,
        monthlyCreditQuota: 50000,
        features: [
          'Custom Multi-Tenant Domain & Masthead Branding',
          'Dedicated MeitY Tier-4 Cloud Server Cluster',
          '24x7 Statutory Legal & Grievance Representation Hotline',
          'Custom Neural Indic Voice Cloning for News Anchors',
        ],
        maxEditions: 99,
        maxReporters: 200,
        hasYouTubeAutomation: true,
      },
    };

    const current = this.getPlan();
    const updated: UserSubscriptionPlan = {
      ...current,
      ...(planCatalog[planId] || planCatalog.reporter_pro),
      startDate: new Date().toISOString(),
      renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.PLAN, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('alfanewgen_user_plan_updated', { detail: updated }));
    }
    return updated;
  }

  /**
   * Credit Wallet Management
   */
  static getWallet(): UserCreditWallet {
    if (typeof window === 'undefined') return DEFAULT_WALLET;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WALLET);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Error reading wallet:', e);
    }
    return DEFAULT_WALLET;
  }

  static rechargeWallet(amountCredits: number, priceINR: number, upiRef: string): UserCreditWallet {
    const wallet = this.getWallet();
    const newBalance = wallet.currentBalance + amountCredits;
    const newTx: UserCreditTransaction = {
      id: `tx_${Date.now()}`,
      type: 'credit',
      amount: amountCredits,
      balanceAfter: newBalance,
      description: `Recharge Pack (₹${priceINR}) - Added ${amountCredits} Credits`,
      category: 'recharge',
      timestamp: new Date().toISOString(),
      referenceId: upiRef,
    };

    const updated: UserCreditWallet = {
      ...wallet,
      currentBalance: newBalance,
      lifetimePurchased: wallet.lifetimePurchased + amountCredits,
      lastRechargeAt: new Date().toISOString(),
      transactions: [newTx, ...wallet.transactions],
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('alfanewgen_wallet_updated', { detail: updated }));
    }
    return updated;
  }

  static debitCredits(amountCredits: number, description: string, descriptionTe: string, category: UserCreditTransaction['category']): boolean {
    const wallet = this.getWallet();
    if (wallet.currentBalance < amountCredits) {
      return false;
    }
    const newBalance = wallet.currentBalance - amountCredits;
    const newTx: UserCreditTransaction = {
      id: `tx_${Date.now()}`,
      type: 'debit',
      amount: amountCredits,
      balanceAfter: newBalance,
      description,
      descriptionTe,
      category,
      timestamp: new Date().toISOString(),
    };

    const updated: UserCreditWallet = {
      ...wallet,
      currentBalance: newBalance,
      lifetimeConsumed: wallet.lifetimeConsumed + amountCredits,
      transactions: [newTx, ...wallet.transactions],
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('alfanewgen_wallet_updated', { detail: updated }));
    }
    return true;
  }

  /**
   * ePaper Management
   */
  static getPapers(): UserPaperBookmark[] {
    if (typeof window === 'undefined') return DEFAULT_PAPERS;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PAPERS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Error reading papers:', e);
    }
    return DEFAULT_PAPERS;
  }

  /**
   * Reporter Desk & Dispatches
   */
  static getDispatches(): UserReporterDispatch[] {
    if (typeof window === 'undefined') return DEFAULT_DISPATCHES;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DISPATCHES);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Error reading dispatches:', e);
    }
    return DEFAULT_DISPATCHES;
  }

  static submitDispatch(dispatch: Omit<UserReporterDispatch, 'id' | 'submittedAt' | 'status' | 'isRoyaltyPaid'>): UserReporterDispatch {
    const list = this.getDispatches();
    const newRecord: UserReporterDispatch = {
      ...dispatch,
      id: `disp_${Date.now()}`,
      submittedAt: new Date().toISOString(),
      status: 'under_review',
      isRoyaltyPaid: false,
    };
    const updated = [newRecord, ...list];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.DISPATCHES, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('alfanewgen_dispatches_updated', { detail: updated }));
    }
    return newRecord;
  }

  /**
   * YouTube Settings Management
   */
  static getYouTubeSettings(): UserYouTubeSettingsConfig {
    if (typeof window === 'undefined') return DEFAULT_YOUTUBE;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.YOUTUBE);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Error reading youtube settings:', e);
    }
    return DEFAULT_YOUTUBE;
  }

  static saveYouTubeSettings(settings: UserYouTubeSettingsConfig): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.YOUTUBE, JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent('alfanewgen_youtube_updated', { detail: settings }));
    } catch (e) {
      console.warn('Error saving youtube settings:', e);
    }
  }

  /**
   * Google Play Store Account Deletion Compliance
   */
  static requestAccountDeletion(): { success: boolean; message: string } {
    if (typeof window !== 'undefined') {
      localStorage.setItem('alfanewgen_account_deletion_requested', new Date().toISOString());
    }
    return {
      success: true,
      message: 'Account deletion request received under Google Play Developer Policy. Your personal data and profile will be completely purged within 7 business days.',
    };
  }
}
