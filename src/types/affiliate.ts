/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Affiliate, Referral & Strategic Partner Program Domain Models
 */

export type AffiliatePartnerTier = 'SILVER' | 'GOLD' | 'PLATINUM';

export type ReferralLeadStatus = 'SIGNED_UP' | 'ACTIVE_SUBSCRIPTION' | 'PAYG_ACTIVE' | 'CHURNED';

export type CommissionType = 'RECURRING_SUBSCRIPTION' | 'PAYG_WALLET' | 'MILESTONE_BONUS';

export type CommissionStatus = 'PENDING' | 'CLEARED' | 'PAID' | 'REVERSED';

export type PayoutRequestStatus = 'PENDING' | 'COMPLETED' | 'REJECTED';

export interface AffiliatePartner {
  affiliateId: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  referralCode: string; // e.g. "NEWS_TELUGU", "ALFA_PRO"
  referralLink: string; // e.g. "https://newspress.app/r/NEWS_TELUGU"
  tier: AffiliatePartnerTier;
  commissionRatePercent: number; // 20% for Silver, 25% for Gold, 30% for Platinum
  upiId?: string;
  panNumber?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  totalEarnings: number;
  availableBalance: number;
  paidEarnings: number;
  activeReferralsCount: number;
  clicksCount: number;
  conversionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralLead {
  leadId: string;
  affiliateId: string;
  tenantId: string;
  organizationName: string;
  contactPerson: string;
  email: string;
  currentPlanId: string;
  status: ReferralLeadStatus;
  monthlyRevenue: number;
  commissionEarnedToDate: number;
  firstClickAt: string;
  joinedAt: string;
  lastPaymentAt?: string;
}

export interface AffiliateCommission {
  commissionId: string;
  affiliateId: string;
  tenantId: string;
  organizationName: string;
  invoiceId: string;
  orderAmount: number;
  commissionRatePercent: number;
  commissionAmount: number;
  commissionType: CommissionType;
  status: CommissionStatus;
  createdAt: string;
  clearedAt?: string;
  paidAt?: string;
}

export interface AffiliatePayoutRequest {
  payoutId: string;
  affiliateId: string;
  grossAmount: number;
  tdsRatePercent: number; // 5% TDS under Section 194H
  tdsAmount: number;
  netPayoutAmount: number;
  payoutMethod: 'UPI' | 'BANK_TRANSFER';
  upiId?: string;
  bankDetails?: {
    accountNumber: string;
    ifsc: string;
    beneficiaryName: string;
  };
  status: PayoutRequestStatus;
  utrNumber?: string;
  requestedAt: string;
  processedAt?: string;
  notes?: string;
}

export interface AffiliateMarketingAsset {
  assetId: string;
  title: string;
  category: 'WHATSAPP' | 'BROCHURE' | 'SOCIAL_BANNER' | 'EMAIL_TEMPLATE';
  language: 'te' | 'en' | 'hi';
  languageLabel: string;
  content: string;
  previewUrl?: string;
  suggestedCaption?: string;
}
