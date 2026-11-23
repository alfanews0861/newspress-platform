/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Affiliate, Referral & Strategic Partner Program Dashboard
 */

import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  Coins,
  Users,
  TrendingUp,
  Wallet,
  Award,
  ArrowUpRight,
  QrCode,
  MessageSquare,
  Download,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Building2,
  Sparkles,
  Percent,
  CheckCircle2,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { AffiliateService } from '../../services/affiliateService';
import {
  AffiliatePartner,
  ReferralLead,
  AffiliateCommission,
  AffiliatePayoutRequest,
  AffiliateMarketingAsset,
} from '../../types/affiliate';
import { useAuth } from '../../hooks/useAuth';

export const AffiliateProgramPage: React.FC = () => {
  const { user } = useAuth();
  const [partner, setPartner] = useState<AffiliatePartner | null>(null);
  const [leads, setLeads] = useState<ReferralLead[]>([]);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayoutRequest[]>([]);
  const [assets, setAssets] = useState<AffiliateMarketingAsset[]>([]);

  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'payouts' | 'marketing'>('overview');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAssetId, setCopiedAssetId] = useState<string | null>(null);

  // Payout Modal
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(5000);
  const [payoutUpi, setPayoutUpi] = useState<string>('');
  const [payoutPan, setPayoutPan] = useState<string>('');
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  // QR Code Modal
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const loadData = () => {
    try {
      const prof = AffiliateService.getAffiliateProfile(user?.uid);
      if (prof) {
        setPartner(prof);
        setPayoutUpi(prof.upiId || '');
        setPayoutPan(prof.panNumber || '');

        setLeads(AffiliateService.getLeads(prof.affiliateId));
        setCommissions(AffiliateService.getCommissions(prof.affiliateId));
        setPayouts(AffiliateService.getPayoutHistory(prof.affiliateId));
        setAssets(AffiliateService.getMarketingAssets(prof.referralCode));
      }
    } catch (err) {
      console.error('Failed to load affiliate partner data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  if (!partner) {
    return <div className="p-8 text-slate-500">Loading Affiliate Partner Console...</div>;
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(partner.referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(partner.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyAsset = (asset: AffiliateMarketingAsset) => {
    navigator.clipboard.writeText(asset.content);
    setCopiedAssetId(asset.assetId);
    setTimeout(() => setCopiedAssetId(null), 2500);
  };

  const handleShareWhatsApp = (asset: AffiliateMarketingAsset) => {
    const encoded = encodeURIComponent(asset.content);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleRequestPayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutError(null);
    setPayoutSuccess(null);

    if (payoutAmount < 1000) {
      setPayoutError('Minimum withdrawal amount is ₹1,000');
      return;
    }
    if (payoutAmount > partner.availableBalance) {
      setPayoutError('Insufficient available balance in your partner wallet');
      return;
    }
    if (!payoutUpi.trim().includes('@')) {
      setPayoutError('Please enter a valid UPI ID (e.g. name@upi or mobile@upi)');
      return;
    }

    try {
      setIsSubmittingPayout(true);
      const res = AffiliateService.requestPayout(
        partner.affiliateId,
        payoutAmount,
        payoutUpi.trim(),
        payoutPan.trim()
      );
      setPayoutSuccess(`Payout request submitted successfully! Net ₹${res.netPayoutAmount} will be transferred to your UPI (${res.upiId}) within 24 hours.`);
      loadData();
      setTimeout(() => {
        setIsPayoutModalOpen(false);
        setPayoutSuccess(null);
      }, 2500);
    } catch (err: any) {
      setPayoutError(err.message || 'Payment request failed');
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  // Tier info calculation
  const nextTierTarget = partner.tier === 'SILVER' ? 6 : 21;
  const currentReferrals = partner.activeReferralsCount;
  const progressPercent = Math.min(100, Math.round((currentReferrals / nextTierTarget) * 100));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Banner: Partner Identity & Referral Link */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold tracking-wide uppercase flex items-center gap-1.5 border border-white/20">
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>{partner.tier} PARTNER ({partner.commissionRatePercent}% RECURRING)</span>
              </span>
              <span className="text-blue-100 text-xs hidden sm:inline">
                ID: {partner.affiliateId}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              NewsPress Strategic Partner & Affiliate Dashboard
            </h1>
            <p className="text-sm text-blue-100 max-w-2xl font-normal leading-relaxed">
              Refer newspapers, press centers, and digital creators. Earn 20% to 30% monthly recurring commissions settled directly to your UPI account.
            </p>
          </div>

          {/* Referral Link Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex flex-col gap-3 min-w-[300px] sm:min-w-[340px]">
            <div className="flex items-center justify-between text-xs text-blue-100">
              <span className="font-semibold flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-amber-300" />
                Your Exclusive Referral Link
              </span>
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                title="View QR Code"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Code</span>
              </button>
            </div>

            <div className="flex items-center gap-2 bg-white/15 px-3 py-2 rounded-xl text-xs font-mono text-white select-all border border-white/15">
              <span className="truncate">{partner.referralLink}</span>
              <button
                onClick={handleCopyLink}
                className="shrink-0 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white cursor-pointer transition-colors"
                title="Copy Referral Link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-blue-200">
              <span>Coupon Code: <strong className="text-amber-300">{partner.referralCode}</strong></span>
              <button
                onClick={handleCopyCode}
                className="underline hover:text-white cursor-pointer"
              >
                {copiedCode ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Available Balance */}
        <div className="bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5f6368] dark:text-[#8e918f]">
              Available Balance
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-[#202124] dark:text-[#f2f2f2]">
              ₹{partner.availableBalance.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[#5f6368] dark:text-[#c4c7c5] mt-1">
              Ready for instant UPI settlement
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsPayoutModalOpen(true)}
            className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs py-2 shadow-xs"
          >
            <Coins className="w-3.5 h-3.5 mr-1.5" />
            Withdraw via UPI
          </Button>
        </div>

        {/* Card 2: Total Earnings */}
        <div className="bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5f6368] dark:text-[#8e918f]">
              Lifetime Earnings
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-[#202124] dark:text-[#f2f2f2]">
              ₹{partner.totalEarnings.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[#5f6368] dark:text-[#c4c7c5] mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Settled to Date: ₹{partner.paidEarnings.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-950/40 p-2 rounded-xl border border-blue-100 dark:border-blue-900">
            Auto-deduction of 5% TDS under IT Act Section 194H
          </div>
        </div>

        {/* Card 3: Active Referrals */}
        <div className="bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5f6368] dark:text-[#8e918f]">
              Active Publications
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-[#202124] dark:text-[#f2f2f2]">
              {partner.activeReferralsCount} <span className="text-sm font-normal text-slate-500">Publications</span>
            </div>
            <div className="text-[11px] text-[#5f6368] dark:text-[#c4c7c5] mt-1">
              Consistent monthly recurring revenue
            </div>
          </div>
          <div className="text-[11px] text-purple-700 dark:text-purple-300 font-medium bg-purple-50 dark:bg-purple-950/40 p-2 rounded-xl border border-purple-100 dark:border-purple-900">
            Estimated Monthly Revenue: ~₹5,500/mo
          </div>
        </div>

        {/* Card 4: Clicks & Conversions */}
        <div className="bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5f6368] dark:text-[#8e918f]">
              Clicks & Conversion Rate
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-[#202124] dark:text-[#f2f2f2]">
              {partner.clicksCount} <span className="text-sm font-normal text-slate-500">Clicks</span>
            </div>
            <div className="text-[11px] text-[#5f6368] dark:text-[#c4c7c5] mt-1">
              Conversion Rate: <strong>2.3%</strong> (8 Subscriptions)
            </div>
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-100 dark:border-amber-900">
            Cookie Lifetime: 60 Days Validity
          </div>
        </div>
      </div>

      {/* Tier Progression Progress Card */}
      <div className="bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-[#202124] dark:text-[#f2f2f2] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Partner Tier Progression</span>
            </h3>
            <p className="text-xs text-[#5f6368] dark:text-[#c4c7c5] mt-0.5">
              You are currently on <strong>{partner.tier} ({partner.commissionRatePercent}%)</strong>. Refer <strong>{Math.max(0, nextTierTarget - currentReferrals)}</strong> more publications to unlock the next tier.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 shrink-0">
            Next Tier: PLATINUM (30% Commission)
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#f1f3f4] dark:bg-[#28292a] h-3 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 font-medium">
          <span>Silver (1-5) • 20%</span>
          <span>Gold (6-20) • 25% (Current Tier)</span>
          <span>Platinum (21+) • 30%</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#dadce0] dark:border-[#3c4043] pb-2 overflow-x-auto select-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-[#1a73e8] text-white shadow-xs'
              : 'text-[#5f6368] dark:text-[#8e918f] hover:bg-[#f1f3f4] dark:hover:bg-[#28292a]'
          }`}
        >
          Recent Commissions
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'leads'
              ? 'bg-[#1a73e8] text-white shadow-xs'
              : 'text-[#5f6368] dark:text-[#8e918f] hover:bg-[#f1f3f4] dark:hover:bg-[#28292a]'
          }`}
        >
          Referred Publications ({leads.length})
        </button>
        <button
          onClick={() => setActiveTab('payouts')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'payouts'
              ? 'bg-[#1a73e8] text-white shadow-xs'
              : 'text-[#5f6368] dark:text-[#8e918f] hover:bg-[#f1f3f4] dark:hover:bg-[#28292a]'
          }`}
        >
          UPI Payout History & TDS
        </button>
        <button
          onClick={() => setActiveTab('marketing')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'marketing'
              ? 'bg-[#1a73e8] text-white shadow-xs'
              : 'text-[#5f6368] dark:text-[#8e918f] hover:bg-[#f1f3f4] dark:hover:bg-[#28292a]'
          }`}
        >
          Promotion Kit & WhatsApp Templates
        </button>
      </div>

      {/* Tab 1: Recent Commissions */}
      {activeTab === 'overview' && (
        <Card className="rounded-3xl border border-[#dadce0] dark:border-[#3c4043] overflow-hidden">
          <div className="p-5 border-b border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#202124] dark:text-[#f2f2f2]">
                Recent Commission Credits (Monthly Recurring Earnings)
              </h3>
              <p className="text-xs text-[#5f6368] dark:text-[#c4c7c5] mt-0.5">
                Commissions credited automatically whenever your referred publications renew subscriptions or recharge pay-as-you-go wallets.
              </p>
            </div>
            <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300">
              Live Ledger
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafd] dark:bg-[#28292a] text-[#5f6368] dark:text-[#8e918f] uppercase text-[10px] tracking-wider border-b border-[#dadce0] dark:border-[#3c4043]">
                <tr>
                  <th className="py-3 px-4">Publication / Organization</th>
                  <th className="py-3 px-4">Order Type</th>
                  <th className="py-3 px-4">Order Amount</th>
                  <th className="py-3 px-4">Commission Rate</th>
                  <th className="py-3 px-4 text-right">Commission Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dadce0] dark:divide-[#3c4043]">
                {commissions.map((comm) => (
                  <tr key={comm.commissionId} className="hover:bg-[#f1f3f4]/50 dark:hover:bg-[#28292a]/50">
                    <td className="py-3.5 px-4 font-semibold text-[#202124] dark:text-[#f2f2f2]">
                      {comm.organizationName}
                    </td>
                    <td className="py-3.5 px-4">
                      {comm.commissionType === 'PAYG_WALLET' ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200">
                          PAYG Wallet Top-up
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200">
                          SaaS Monthly Subscription
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                      ₹{comm.orderAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {comm.commissionRatePercent}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                      +₹{comm.commissionAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                        CLEARED
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(comm.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2: Referred Leads */}
      {activeTab === 'leads' && (
        <Card className="rounded-3xl border border-[#dadce0] dark:border-[#3c4043] overflow-hidden">
          <div className="p-5 border-b border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#202124] dark:text-[#f2f2f2]">
                Referred Publications & Publishing Houses
              </h3>
              <p className="text-xs text-[#5f6368] dark:text-[#c4c7c5] mt-0.5">
                Recurring monthly commissions are paid for as long as these publications maintain active subscriptions.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafd] dark:bg-[#28292a] text-[#5f6368] dark:text-[#8e918f] uppercase text-[10px] tracking-wider border-b border-[#dadce0] dark:border-[#3c4043]">
                <tr>
                  <th className="py-3 px-4">Publication / Media Org</th>
                  <th className="py-3 px-4">Editor / Contact</th>
                  <th className="py-3 px-4">Active Plan</th>
                  <th className="py-3 px-4">Monthly Value</th>
                  <th className="py-3 px-4">Total Commission Earned</th>
                  <th className="py-3 px-4">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dadce0] dark:divide-[#3c4043]">
                {leads.map((lead) => (
                  <tr key={lead.leadId} className="hover:bg-[#f1f3f4]/50 dark:hover:bg-[#28292a]/50">
                    <td className="py-3.5 px-4 font-semibold text-[#202124] dark:text-[#f2f2f2]">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{lead.organizationName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      <div>{lead.contactPerson}</div>
                      <div className="text-[10px] text-slate-400">{lead.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200">
                        {lead.currentPlanId}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                      ₹{lead.monthlyRevenue.toLocaleString('en-IN')}/mo
                    </td>
                    <td className="py-3.5 px-4 font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹{lead.commissionEarnedToDate.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(lead.joinedAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Payout History & TDS */}
      {activeTab === 'payouts' && (
        <Card className="rounded-3xl border border-[#dadce0] dark:border-[#3c4043] overflow-hidden">
          <div className="p-5 border-b border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#202124] dark:text-[#f2f2f2]">
                UPI Payout History & TDS Statements
              </h3>
              <p className="text-xs text-[#5f6368] dark:text-[#c4c7c5] mt-0.5">
                Statement of funds credited to your UPI after statutory 5% TDS deduction under Income Tax Act Section 194H.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsPayoutModalOpen(true)}
              className="bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs rounded-xl"
            >
              New Payout Request
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafd] dark:bg-[#28292a] text-[#5f6368] dark:text-[#8e918f] uppercase text-[10px] tracking-wider border-b border-[#dadce0] dark:border-[#3c4043]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Gross Commission</th>
                  <th className="py-3 px-4">TDS (194H 5%)</th>
                  <th className="py-3 px-4 font-bold text-emerald-700">Net Payout Credited</th>
                  <th className="py-3 px-4">Recipient UPI ID</th>
                  <th className="py-3 px-4">Bank UTR No.</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dadce0] dark:divide-[#3c4043]">
                {payouts.map((pay) => (
                  <tr key={pay.payoutId} className="hover:bg-[#f1f3f4]/50 dark:hover:bg-[#28292a]/50">
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {new Date(pay.requestedAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                      ₹{pay.grossAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-red-600 dark:text-red-400">
                      -₹{pay.tdsAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                      ₹{pay.netPayoutAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {pay.upiId}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500">
                      {pay.utrNumber || 'PROCESSING'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        {pay.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 4: Marketing Kit */}
      {activeTab === 'marketing' && (
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-3xl p-5">
            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>WhatsApp & Social Media Promotion Kit</span>
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Ready-to-share promotional messages for press club groups, DTP operators, and newspaper publishers on WhatsApp.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assets.map((asset) => (
              <div
                key={asset.assetId}
                className="bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] rounded-3xl p-5 flex flex-col justify-between shadow-xs space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#202124] dark:text-[#f2f2f2]">
                      {asset.title}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {asset.languageLabel}
                    </Badge>
                  </div>
                  <div className="bg-[#f8fafd] dark:bg-[#28292a] p-3.5 rounded-2xl border border-[#dadce0] dark:border-[#444746] text-xs font-sans text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                    {asset.content}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleShareWhatsApp(asset)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs py-2 shadow-xs justify-center"
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                    Share via WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyAsset(asset)}
                    className="rounded-xl text-xs py-2"
                  >
                    {copiedAssetId === asset.assetId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payout Modal */}
      <Modal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        title="Request Partner Payout via UPI"
      >
        <form onSubmit={handleRequestPayoutSubmit} className="space-y-4 pt-2 text-xs">
          {payoutError && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{payoutError}</span>
            </div>
          )}
          {payoutSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{payoutSuccess}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Withdrawal Amount (INR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                min={1000}
                max={partner.availableBalance}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(Number(e.target.value))}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm"
              />
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Available Balance: ₹{partner.availableBalance.toLocaleString('en-IN')} (Minimum ₹1,000)
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Your UPI ID (PhonePe / Google Pay / Paytm / BHIM)
            </label>
            <input
              type="text"
              placeholder="e.g. mobile@upi or name@okaxis"
              value={payoutUpi}
              onChange={(e) => setPayoutUpi(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              PAN Card Number (for 5% statutory TDS compliance)
            </label>
            <input
              type="text"
              placeholder="e.g. ABCDE1234F"
              maxLength={10}
              value={payoutPan}
              onChange={(e) => setPayoutPan(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono uppercase"
            />
            <div className="text-[10px] text-slate-400 mt-0.5">
              Without PAN, 20% statutory TDS applies under IT Section 206AA. Providing PAN ensures only 5% TDS under Section 194H.
            </div>
          </div>

          {/* Breakdown Preview */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5 font-medium">
            <div className="flex justify-between">
              <span className="text-slate-500">Requested Amount:</span>
              <span className="font-mono">₹{payoutAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-red-600 dark:text-red-400">
              <span>TDS Deduction ({payoutPan.length === 10 ? '5%' : '20%'}):</span>
              <span className="font-mono">
                -₹{Math.round((payoutAmount * (payoutPan.length === 10 ? 5 : 20)) / 100).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 flex justify-between font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              <span>Net Payout to Your UPI:</span>
              <span className="font-mono">
                ₹{(payoutAmount - Math.round((payoutAmount * (payoutPan.length === 10 ? 5 : 20)) / 100)).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPayoutModalOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingPayout}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            >
              {isSubmittingPayout ? 'Processing...' : 'Submit Payout Request'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="Your Referral QR Code"
      >
        <div className="text-center py-4 space-y-4">
          <div className="inline-block p-4 bg-white rounded-2xl border border-slate-200 shadow-md">
            {/* SVG Representation of QR */}
            <div className="w-48 h-48 bg-slate-900 rounded-xl flex items-center justify-center p-3">
              <div className="w-full h-full bg-white rounded-lg p-2 flex flex-col items-center justify-center text-center">
                <QrCode className="w-28 h-28 text-slate-900" />
                <span className="text-[10px] font-mono font-bold text-slate-700 mt-1">
                  {partner.referralCode}
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-600 max-w-xs mx-auto">
            Display this QR code at press conferences, print on visiting cards, or share on digital flyers to onboard publishers directly.
          </p>
          <div className="text-xs font-mono font-bold text-blue-600">
            {partner.referralLink}
          </div>
        </div>
      </Modal>
    </div>
  );
};
