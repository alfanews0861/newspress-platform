/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Affiliate, Referral & Strategic Partner Program Service
 */

import {
  AffiliatePartner,
  ReferralLead,
  AffiliateCommission,
  AffiliatePayoutRequest,
  AffiliateMarketingAsset,
  AffiliatePartnerTier,
} from '../types/affiliate';

export class AffiliateService {
  private static partners: Map<string, AffiliatePartner> = new Map();
  private static leads: Map<string, ReferralLead[]> = new Map(); // affiliateId -> leads
  private static commissions: Map<string, AffiliateCommission[]> = new Map(); // affiliateId -> commissions
  private static payouts: Map<string, AffiliatePayoutRequest[]> = new Map(); // affiliateId -> payouts

  static {
    this.seedDefaultAffiliateData();
  }

  private static seedDefaultAffiliateData(): void {
    const demoAffiliateId = 'aff-partner-national-press';
    const demoUserId = 'usr-demo-partner-01';

    const defaultPartner: AffiliatePartner = {
      affiliateId: demoAffiliateId,
      userId: demoUserId,
      fullName: 'Vikramaditya Sharma (Media & Publishing Consultant)',
      email: 'vikram.media@newspress.in',
      phone: '+91 98480 12345',
      referralCode: 'PRESS_PARTNER',
      referralLink: 'https://newspress.in/r/PRESS_PARTNER',
      tier: 'GOLD',
      commissionRatePercent: 25,
      upiId: 'vikramaditya@upi',
      panNumber: 'ABCDE1234F',
      totalEarnings: 38450,
      availableBalance: 14250,
      paidEarnings: 24200,
      activeReferralsCount: 8,
      clicksCount: 342,
      conversionsCount: 8,
      createdAt: '2026-02-15T10:00:00.000Z',
      updatedAt: new Date().toISOString(),
    };

    this.partners.set(demoAffiliateId, defaultPartner);
    this.partners.set(demoUserId, defaultPartner);

    const demoLeads: ReferralLead[] = [
      {
        leadId: 'lead-01',
        affiliateId: demoAffiliateId,
        tenantId: 'tenant-national-chronicle',
        organizationName: 'The National Chronicle Daily',
        contactPerson: 'Srinivasa Rao (Chief Editor)',
        email: 'editor@nationalchronicle.in',
        currentPlanId: 'STANDARD',
        status: 'ACTIVE_SUBSCRIPTION',
        monthlyRevenue: 4999,
        commissionEarnedToDate: 8748,
        firstClickAt: '2026-03-01T08:00:00.000Z',
        joinedAt: '2026-03-04T11:20:00.000Z',
        lastPaymentAt: '2026-11-04T11:20:00.000Z',
      },
      {
        leadId: 'lead-02',
        affiliateId: demoAffiliateId,
        tenantId: 'tenant-deccan-bulletin',
        organizationName: 'Deccan Daily Bulletin News',
        contactPerson: 'K. Prasad (Publisher)',
        email: 'prasad@deccanbulletin.in',
        currentPlanId: 'PREMIUM',
        status: 'ACTIVE_SUBSCRIPTION',
        monthlyRevenue: 14999,
        commissionEarnedToDate: 26248,
        firstClickAt: '2026-04-10T14:30:00.000Z',
        joinedAt: '2026-04-12T09:15:00.000Z',
        lastPaymentAt: '2026-11-12T09:15:00.000Z',
      },
      {
        leadId: 'lead-03',
        affiliateId: demoAffiliateId,
        tenantId: 'tenant-vanguard-weekly',
        organizationName: 'Vanguard City Weekly News',
        contactPerson: 'M. Anjan (Managing Editor)',
        email: 'editor@vanguardweekly.org',
        currentPlanId: 'PAY_AS_YOU_GO',
        status: 'PAYG_ACTIVE',
        monthlyRevenue: 1200,
        commissionEarnedToDate: 1454,
        firstClickAt: '2026-06-18T16:00:00.000Z',
        joinedAt: '2026-06-20T10:45:00.000Z',
        lastPaymentAt: '2026-11-18T15:30:00.000Z',
      },
      {
        leadId: 'lead-04',
        affiliateId: demoAffiliateId,
        tenantId: 'tenant-prime-news-network',
        organizationName: 'Prime News Media TV',
        contactPerson: 'Suresh Varma (Head of Digital Broadcast)',
        email: 'digital@primenewsmedia.live',
        currentPlanId: 'CREATOR',
        status: 'ACTIVE_SUBSCRIPTION',
        monthlyRevenue: 1499,
        commissionEarnedToDate: 2000,
        firstClickAt: '2026-08-05T12:00:00.000Z',
        joinedAt: '2026-08-07T14:10:00.000Z',
        lastPaymentAt: '2026-11-07T14:10:00.000Z',
      },
    ];
    this.leads.set(demoAffiliateId, demoLeads);

    const demoCommissions: AffiliateCommission[] = [
      {
        commissionId: 'comm-101',
        affiliateId: demoAffiliateId,
        tenantId: 'tenant-deccan-bulletin',
        organizationName: 'Deccan Daily Bulletin News',
        invoiceId: 'inv-nov-2026-002',
        orderAmount: 14999,
        commissionRatePercent: 25,
        commissionAmount: 3749.75,
        commissionType: 'RECURRING_SUBSCRIPTION',
        status: 'CLEARED',
        createdAt: '2026-11-12T09:15:00.000Z',
        clearedAt: '2026-11-15T00:00:00.000Z',
      },
      {
        commissionId: 'comm-102',
        affiliateId: demoAffiliateId,
        tenantId: 'tenant-national-chronicle',
        organizationName: 'The National Chronicle Daily',
        invoiceId: 'inv-nov-2026-001',
        orderAmount: 4999,
        commissionRatePercent: 25,
        commissionAmount: 1249.75,
        commissionType: 'RECURRING_SUBSCRIPTION',
        status: 'CLEARED',
        createdAt: '2026-11-04T11:20:00.000Z',
        clearedAt: '2026-11-07T00:00:00.000Z',
      },
      {
        commissionId: 'comm-103',
        affiliateId: demoAffiliateId,
        tenantId: 'tenant-prime-news-network',
        organizationName: 'Prime News Media TV',
        invoiceId: 'inv-nov-2026-003',
        orderAmount: 1499,
        commissionRatePercent: 25,
        commissionAmount: 374.75,
        commissionType: 'RECURRING_SUBSCRIPTION',
        status: 'CLEARED',
        createdAt: '2026-11-07T14:10:00.000Z',
        clearedAt: '2026-11-10T00:00:00.000Z',
      },
      {
        commissionId: 'comm-104',
        affiliateId: demoAffiliateId,
        tenantId: 'tenant-vanguard-weekly',
        organizationName: 'Vanguard City Weekly (PAYG Wallet Recharge)',
        invoiceId: 'inv-payg-nov-004',
        orderAmount: 2000,
        commissionRatePercent: 10,
        commissionAmount: 200.0,
        commissionType: 'PAYG_WALLET',
        status: 'CLEARED',
        createdAt: '2026-11-18T15:30:00.000Z',
        clearedAt: '2026-11-19T00:00:00.000Z',
      },
    ];
    this.commissions.set(demoAffiliateId, demoCommissions);

    const demoPayouts: AffiliatePayoutRequest[] = [
      {
        payoutId: 'payout-oct-2026',
        affiliateId: demoAffiliateId,
        grossAmount: 12000,
        tdsRatePercent: 5,
        tdsAmount: 600,
        netPayoutAmount: 11400,
        payoutMethod: 'UPI',
        upiId: 'ramanamedia@upi',
        status: 'COMPLETED',
        utrNumber: 'UPI/261011492049/AXIS',
        requestedAt: '2026-10-05T09:00:00.000Z',
        processedAt: '2026-10-06T14:22:00.000Z',
        notes: 'Monthly partner referral settlement via RazorpayX (TDS 194H deducted)',
      },
      {
        payoutId: 'payout-sep-2026',
        affiliateId: demoAffiliateId,
        grossAmount: 12842,
        tdsRatePercent: 5,
        tdsAmount: 642,
        netPayoutAmount: 12200,
        payoutMethod: 'UPI',
        upiId: 'ramanamedia@upi',
        status: 'COMPLETED',
        utrNumber: 'UPI/260908381920/HDFC',
        requestedAt: '2026-09-05T10:15:00.000Z',
        processedAt: '2026-09-06T16:00:00.000Z',
        notes: 'Monthly partner referral settlement',
      },
    ];
    this.payouts.set(demoAffiliateId, demoPayouts);
  }

  public static getAffiliateProfile(userId?: string): AffiliatePartner {
    const defaultId = 'aff-partner-national-press';
    if (userId && this.partners.has(userId)) {
      return this.partners.get(userId)!;
    }
    const defaultPartner = this.partners.get(defaultId);
    if (defaultPartner) {
      return defaultPartner;
    }
    const firstPartner = this.partners.values().next().value;
    if (firstPartner) {
      return firstPartner;
    }
    this.seedDefaultAffiliateData();
    return this.partners.get(defaultId)!;
  }

  public static updateProfile(
    affiliateId: string,
    updates: Partial<AffiliatePartner>
  ): AffiliatePartner {
    const partner = this.partners.get(affiliateId);
    if (!partner) {
      throw new Error('Affiliate partner profile not found.');
    }

    const updated = {
      ...partner,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Auto-upgrade tier based on active referrals
    if (updated.activeReferralsCount >= 21) {
      updated.tier = 'PLATINUM';
      updated.commissionRatePercent = 30;
    } else if (updated.activeReferralsCount >= 6) {
      updated.tier = 'GOLD';
      updated.commissionRatePercent = 25;
    } else {
      updated.tier = 'SILVER';
      updated.commissionRatePercent = 20;
    }

    this.partners.set(affiliateId, updated);
    if (partner.userId) {
      this.partners.set(partner.userId, updated);
    }
    return updated;
  }

  public static getLeads(affiliateId: string): ReferralLead[] {
    return this.leads.get(affiliateId) || [];
  }

  public static getCommissions(affiliateId: string): AffiliateCommission[] {
    return this.commissions.get(affiliateId) || [];
  }

  public static getPayoutHistory(affiliateId: string): AffiliatePayoutRequest[] {
    return this.payouts.get(affiliateId) || [];
  }

  public static requestPayout(
    affiliateId: string,
    requestedAmount: number,
    upiId: string,
    panNumber?: string
  ): AffiliatePayoutRequest {
    const partner = this.partners.get(affiliateId);
    if (!partner) throw new Error('Affiliate partner not found');

    if (requestedAmount < 1000) {
      throw new Error('Minimum withdrawal amount is ₹1,000');
    }

    if (requestedAmount > partner.availableBalance) {
      throw new Error('Insufficient available balance in your wallet');
    }

    // Indian Income Tax Section 194H: 5% TDS with PAN, 20% without PAN
    const tdsRate = panNumber && panNumber.trim().length === 10 ? 5 : 20;
    const tdsAmount = Math.round((requestedAmount * tdsRate) / 100);
    const netPayout = requestedAmount - tdsAmount;

    const payout: AffiliatePayoutRequest = {
      payoutId: `payout-${Date.now()}`,
      affiliateId,
      grossAmount: requestedAmount,
      tdsRatePercent: tdsRate,
      tdsAmount,
      netPayoutAmount: netPayout,
      payoutMethod: 'UPI',
      upiId,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
      notes: `TDS (${tdsRate}% under 194H): ₹${tdsAmount} deducted. Net ₹${netPayout} to ${upiId}`,
    };

    partner.availableBalance -= requestedAmount;
    partner.paidEarnings += requestedAmount;
    partner.updatedAt = new Date().toISOString();

    const currentPayouts = this.payouts.get(affiliateId) || [];
    currentPayouts.unshift(payout);
    this.payouts.set(affiliateId, currentPayouts);

    return payout;
  }

  public static getMarketingAssets(affiliateCode: string = 'PRESS_PARTNER'): AffiliateMarketingAsset[] {
    const refLink = `https://newspress.in/r/${affiliateCode}`;

    return [
      {
        assetId: 'asset-wa-national-01',
        title: 'WhatsApp Broadcast (For Publishers, Printers & Media Houses)',
        category: 'WHATSAPP',
        language: 'en',
        languageLabel: 'English',
        content: `Greetings! 🙏\n\nLooking to modernize your newspaper production & digital newsroom?\n\nIntroducing *NewsPress Platform* — India's leading digital publishing suite:\n\n✨ *Key Highlights:*\n• 1-Click 300+ DPI print-ready vector PDF broadsheet plates\n• Professional headline drafting and dynamic copy-fitting tools\n• Broadcast YouTube News Studio with automated video synthesis\n• Affordable Pay-As-You-Go plan (starting from just ₹49 per edition!)\n\nSign up with my link to claim a 15% discount or ₹500 welcome credits on your first plan:\n👉 ${refLink}\n\nCoupon Code: *${affiliateCode}*`,
      },
      {
        assetId: 'asset-wa-en-02',
        title: 'WhatsApp Message (For Editors & Digital Broadcast Creators)',
        category: 'WHATSAPP',
        language: 'en',
        languageLabel: 'English',
        content: `Hi there!\n\nAre you looking to modernize your newspaper production & YouTube news desk?\n\nCheck out *NewsPress Platform* — India's leading multi-tenant newspaper SaaS & Wire service:\n\n📰 Print-ready 300+ DPI vector PDF plates with Indic typography\n⚡ Headline Desk, Copy-fitting & High-energy broadcast news anchors\n💰 Flexible Pay As You Go model (No monthly commitment!)\n\nSign up using my link for an instant 15% discount or ₹500 welcome credits:\n👉 ${refLink}\n\nUse Code: *${affiliateCode}*`,
      },
      {
        assetId: 'asset-pitch-dtp-03',
        title: 'Email & Letter Pitch (For Printing Presses & DTP Centers)',
        category: 'EMAIL_TEMPLATE',
        language: 'en',
        languageLabel: 'English',
        content: `Subject: Modernizing Daily Layout Production with NewsPress Publishing Platform\n\nDear Publisher / Press Owner,\n\nEliminate late-night layout delays and complex DTP bottlenecks with NewsPress.\n\nBenefits:\n1. Cuts layout design and plate generation time by over 70%.\n2. Automated copy-fitting aligns articles neatly into columns without manual tweaking.\n3. Native support for broadsheets and district tabloids at crisp 300 DPI.\n\nExplore interactive demo: ${refLink}`,
      },
    ];
  }
}
