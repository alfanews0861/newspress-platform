/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * User Portal & Legal Compliance Types
 * Alfa New Gen Platforms - Comprehensive User Hub & Statutory Models
 */

export type UserRoleType = 'reader' | 'reporter' | 'publisher' | 'creator';

export interface ExtendedUserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  phoneNumber: string;
  isPhoneVerified: boolean;
  role: UserRoleType;
  organizationName?: string;
  state: string;
  district: string;
  mandalOrCity: string;
  pincode: string;
  // Journalist / Reporter specific KYC
  pressAccreditationId?: string;
  pressCardImageUrl?: string;
  govtIdMasked?: string; // Aadhaar / Voter / PAN last 4 digits
  // Payment settlement details
  upiId: string;
  bankAccountHolderName?: string;
  bankAccountNumberMasked?: string;
  bankIfsc?: string;
  // Statutory Legal Agreement Consent (Alfa New Gen Platforms)
  hasAcceptedLegalAgreements: boolean;
  agreementsAcceptedAt: string;
  agreementsVersion: string;
  acceptedPolicies: {
    termsOfService: boolean;
    privacyPolicyDPDP: boolean;
    googleApiUserPolicy: boolean;
    youtubeTermsOfService: boolean;
    playStoreUserPolicy: boolean;
    pciEthicsCode: boolean;
  };
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscriptionPlan {
  planId: 'free_reader' | 'reporter_pro' | 'publisher_standard' | 'enterprise_network';
  name: string;
  nameTe?: string;
  pricePerMonthINR: number;
  billingCycle: 'monthly' | 'annual';
  status: 'active' | 'trialing' | 'past_due' | 'cancelled';
  startDate: string;
  renewalDate: string;
  monthlyCreditQuota: number;
  features: string[];
  featuresTe?: string[];
  maxEditions: number;
  maxReporters: number;
  hasYouTubeAutomation: boolean;
}

export interface UserCreditTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  balanceAfter: number;
  description: string;
  descriptionTe?: string;
  category: 'recharge' | 'ai_generation' | 'epaper_export' | 'youtube_render' | 'wire_royalty';
  timestamp: string;
  referenceId?: string;
}

export interface UserCreditWallet {
  currentBalance: number;
  lifetimePurchased: number;
  lifetimeConsumed: number;
  lastRechargeAt?: string;
  transactions: UserCreditTransaction[];
}

export interface UserPaperBookmark {
  id: string;
  editionTitle: string;
  editionDate: string;
  district: string;
  language: 'Telugu' | 'English' | 'Hindi';
  pageCount: number;
  pdfDownloadUrl?: string;
  thumbnailUrl: string;
  isNightPressLocked: boolean;
}

export interface UserReporterDispatch {
  id: string;
  headline: string;
  headlineTe?: string;
  district: string;
  mandal: string;
  category: string;
  bodyText: string;
  originalityScore: number;
  photos: string[];
  status: 'draft' | 'under_review' | 'approved' | 'published_print' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewRemarks?: string;
  royaltyEarnedINR: number;
  isRoyaltyPaid: boolean;
  upiPaymentRef?: string;
}

export interface UserYouTubeSettingsConfig {
  isConnected: boolean;
  channelId?: string;
  channelTitle?: string;
  channelHandle?: string;
  subscriberCount?: number;
  connectedAt?: string;
  // Automation settings
  autoPublishReels: boolean;
  preferredVoice: string; // 'ravi_shankar' | 'lakshmi_devi' | 'priya_news'
  voiceLanguage: 'te-IN' | 'en-IN' | 'hi-IN';
  newsStyle: 'emotional_breaking' | 'dramatic_primetime' | 'urgent_investigative' | 'speed_bulletin';
  scrollingTickerSpeed: 'normal' | 'fast' | 'slow';
  overlayWatermark: boolean;
  channelLogoUrl?: string;
  // Legal & YouTube Community Compliance
  communityGuidelinesConsent: boolean;
  autoInsertCopyrightDisclaimer: boolean;
  safeHarborExemptionAcknowledged: boolean;
  defaultDescriptionDisclaimer: string;
}
