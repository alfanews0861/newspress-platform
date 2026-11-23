/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * User Portal & Master Account Management Console
 * Alfa New Gen Platforms - Comprehensive Profile, Subscription, Credits & Statutory Governance Hub
 */

import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  CreditCard,
  Coins,
  BookOpen,
  Send,
  Youtube,
  Scale,
  Download,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Trash2,
  Sparkles,
  ChevronRight,
  QrCode,
  Check,
  Clock,
  Play,
} from 'lucide-react';
import { UserPortalService } from '../../services/userPortalService';
import { GoogleProfileOnboardingModal } from '../../components/auth/GoogleProfileOnboardingModal';
import type {
  UserPortalProfile,
  UserPortalTabKey,
  SubscriptionPlanInfo,
  CreditWalletInfo,
  DigitalEPaperItem,
  ReporterDispatchItem,
  YouTubeAutomationConfig,
} from '../../types/userPortal';

interface UserPortalPageProps {
  onNavigate?: (path: string) => void;
}

export const UserPortalPage: React.FC<UserPortalPageProps> = ({ onNavigate }) => {
  // Query param tab sync
  const [activeTab, setActiveTab] = useState<UserPortalTabKey>('profile');

  // Master State
  const [profile, setProfile] = useState<UserPortalProfile>(UserPortalService.getProfile());
  const [plan, setPlan] = useState<SubscriptionPlanInfo>(UserPortalService.getSubscriptionPlan());
  const [wallet, setWallet] = useState<CreditWalletInfo>(UserPortalService.getCreditWallet());
  const [papers, setPapers] = useState<DigitalEPaperItem[]>(UserPortalService.getDigitalEPapers());
  const [dispatches, setDispatches] = useState<ReporterDispatchItem[]>(UserPortalService.getReporterDispatches());
  const [youtubeConfig, setYoutubeConfig] = useState<YouTubeAutomationConfig>(UserPortalService.getYouTubeSettings());

  // UI Modals & Actions
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [selectedPackCredits, setSelectedPackCredits] = useState<number>(1500);
  const [selectedPackPrice, setSelectedPackPrice] = useState<number>(499);
  const [rechargeUpiRef, setRechargeUpiRef] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Sync with URL search params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as UserPortalTabKey;
    if (tabParam && ['profile', 'plan', 'credits', 'paper', 'reporter', 'youtube', 'legal'].includes(tabParam)) {
      setActiveTab(tabParam);
    }

    const unsub = UserPortalService.subscribe(() => {
      setProfile(UserPortalService.getProfile());
      setPlan(UserPortalService.getSubscriptionPlan());
      setWallet(UserPortalService.getCreditWallet());
      setPapers(UserPortalService.getDigitalEPapers());
      setDispatches(UserPortalService.getReporterDispatches());
      setYoutubeConfig(UserPortalService.getYouTubeSettings());
    });

    return () => {
      unsub();
    };
  }, []);

  const showNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const tabs = [
    {
      id: 'profile',
      label: 'Profile & KYC',
      icon: <User className="w-4 h-4 text-blue-600" />,
    },
    {
      id: 'plan',
      label: 'User Plan',
      icon: <CreditCard className="w-4 h-4 text-purple-600" />,
    },
    {
      id: 'credits',
      label: 'Balance Credits',
      icon: <Coins className="w-4 h-4 text-amber-600" />,
    },
    {
      id: 'paper',
      label: 'My ePaper',
      icon: <BookOpen className="w-4 h-4 text-emerald-600" />,
    },
    {
      id: 'reporter',
      label: 'Reporter Desk',
      icon: <Send className="w-4 h-4 text-indigo-600" />,
    },
    {
      id: 'youtube',
      label: 'YouTube Settings',
      icon: <Youtube className="w-4 h-4 text-red-600" />,
    },
    {
      id: 'legal',
      label: 'Legal & Policies',
      icon: <Scale className="w-4 h-4 text-slate-600" />,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Title & Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
            <Building2 className="w-4 h-4" />
            <span>Alfa New Gen Platforms • User Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            User Console &amp; Account Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your verified profile KYC, subscription tier, credit wallet, digital broadsheet, reporter dispatches, and YouTube automation.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsOnboardingModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Global Notification Banner */}
      {actionSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Quick Summary Pill Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">User Profile</div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{profile.displayName}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Active Plan</div>
            <div className="text-xs sm:text-sm font-bold text-purple-700 dark:text-purple-300 truncate">{plan.name}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Credits Balance</div>
            <div className="text-xs sm:text-sm font-extrabold text-amber-600 dark:text-amber-400 font-mono">
              {wallet.currentBalance.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 flex items-center justify-center shrink-0">
            <Youtube className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">YouTube Status</div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
              {youtubeConfig.isConnected ? 'Connected' : 'Not Connected'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-2 sm:space-x-3 overflow-x-auto scrollbar-none py-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as UserPortalTabKey)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* =========================================================================
         TAB 1: USER PROFILE & KYC DETAILS
         ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: User Card & Digital Press Pass */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm text-center relative overflow-hidden">
              <div className="w-20 h-20 rounded-full mx-auto overflow-hidden border-4 border-blue-500/20 shadow-md mb-3">
                <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{profile.displayName}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{profile.email}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{profile.role.toUpperCase()} • VERIFIED</span>
              </div>

              {/* Digital Press ID Card Preview (Accreditation) */}
              <div className="mt-6 p-4 rounded-2xl bg-linear-to-br from-slate-900 via-slate-800 to-indigo-950 text-white text-left shadow-lg border border-slate-700 space-y-3 relative">
                <div className="flex items-center justify-between border-b border-white/20 pb-2">
                  <div className="text-[10px] font-mono tracking-widest text-blue-300 uppercase">
                    ALFA NEW GEN PLATFORMS • PRESS PASS
                  </div>
                  <QrCode className="w-4 h-4 text-blue-300" />
                </div>
                <div className="flex items-center gap-3">
                  <img src={profile.photoURL} alt="ID" className="w-12 h-12 rounded-xl object-cover border border-white/30" />
                  <div className="min-w-0 text-xs">
                    <div className="font-bold text-white truncate">{profile.displayName}</div>
                    <div className="text-[10px] text-blue-200">Accredited Field Journalist</div>
                    <div className="text-[10px] font-mono text-slate-300 mt-0.5">ID: {profile.pressAccreditationId || 'TS-PRESS-8942'}</div>
                  </div>
                </div>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-300">
                  <span>BUREAU: {profile.district.toUpperCase()}</span>
                  <span className="text-emerald-400 font-semibold">VALID 2026-2027</span>
                </div>
              </div>
            </div>

            {/* Google Play Store Account Deletion Box */}
            <div className="bg-red-50/60 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900/40 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-red-700 dark:text-red-400 uppercase">
                <Trash2 className="w-4 h-4" />
                <span>Google Play Policy: Account Deletion</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Under Google Play Developer Policies and DPDP Act 2023, you can permanently request complete deletion of your account and personal data.
              </p>
              <button
                onClick={() => setIsDeleteAccountModalOpen(true)}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Delete Account &amp; Personal Data
              </button>
            </div>
          </div>

          {/* Right: Full Verified Profile Metadata */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Verified Profile &amp; KYC Information
                </h3>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                  KYC Verified
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Legal Full Name</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{profile.displayName}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Verified Google Email</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 font-mono">{profile.email}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Mobile Number (OTP Verified)</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 font-mono">{profile.phoneNumber}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Role &amp; Permissions</div>
                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5 capitalize">{profile.role}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Location &amp; Bureau</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {profile.mandalOrCity}, {profile.district}, {profile.state} - {profile.pincode}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Settlement UPI VPA</div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">{profile.upiId}</div>
                </div>
              </div>

              {/* Legal Consent Audit Stamp */}
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400 uppercase">
                  <Scale className="w-4 h-4" />
                  <span>Legal Consent &amp; Safe Harbor Audit</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div>Accepted Version: <strong className="text-slate-900 dark:text-white">{profile.agreementsVersion}</strong></div>
                  <div>Audit Timestamp: <strong className="text-slate-900 dark:text-white">{new Date(profile.agreementsAcceptedAt).toLocaleString()}</strong></div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>IT Act Section 79 Safe Harbor, DPDP Act 2023, and Google/YouTube Limited Use terms confirmed.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 2: USER PLAN & SUBSCRIPTION
         ========================================================================= */}
      {activeTab === 'plan' && (
        <div className="space-y-6">
          {/* Active Plan Overview Card */}
          <div className="bg-linear-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
              <div>
                <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider">
                  Active Subscription
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold mt-2">{plan.name}</h2>
                <div className="flex items-center gap-4 mt-4 text-xs text-blue-200">
                  <div>Price: <strong className="text-white text-base font-bold">₹{plan.pricePerMonthINR}</strong> / month</div>
                  <div>•</div>
                  <div>Renewal: <strong className="text-white">{new Date(plan.renewalDate).toLocaleDateString()}</strong></div>
                  <div>•</div>
                  <div>Monthly Quota: <strong className="text-white font-mono">{plan.monthlyCreditQuota} Credits</strong></div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center shrink-0">
                <div className="text-xs text-blue-200">Subscription Status</div>
                <div className="text-xl font-bold text-emerald-300 uppercase mt-0.5">{plan.status}</div>
                <button
                  onClick={() => showNotification('GST Tax Invoice downloaded successfully!')}
                  className="mt-3 px-3.5 py-1.5 bg-white text-blue-800 rounded-xl text-xs font-bold hover:bg-blue-50 transition-colors cursor-pointer flex items-center gap-1.5 mx-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>GST Invoice</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4-Tier Plan Comparison Matrix */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Select Subscription Tier
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {
                  id: 'free_reader' as const,
                  name: 'Free Reader',
                  price: 0,
                  credits: 200,
                  features: ['Browse Digital ePaper Daily', 'Read Headlines & Summaries'],
                },
                {
                  id: 'reporter_pro' as const,
                  name: 'Reporter Pro',
                  price: 499,
                  credits: 2500,
                  popular: true,
                  features: [
                    'Digital Press ID Card with QR',
                    'Wire Submissions & Plagiarism Check',
                    'Direct UPI Royalties on BroadSheets',
                    'Broadcast News Reel Creator',
                  ],
                },
                {
                  id: 'publisher_standard' as const,
                  name: 'Publisher Standard',
                  price: 2499,
                  credits: 10000,
                  features: [
                    'Multi-Edition Web Offset Night Press',
                    'Bureau Distribution & Stringer Roster',
                    'YouTube Studio Channel Auto-Publish',
                    'Full Section 194J TDS Ledger',
                  ],
                },
                {
                  id: 'enterprise_network' as const,
                  name: 'Enterprise Media',
                  price: 9999,
                  credits: 50000,
                  features: [
                    'Custom Domain & Masthead Branding',
                    'Dedicated MeitY Tier-4 Cloud Server',
                    '24x7 Statutory Legal Hotline',
                    'Neural Voice News Anchors',
                  ],
                },
              ].map((p) => {
                const isCurrent = plan.planId === p.id;
                return (
                  <div
                    key={p.id}
                    className={`p-5 rounded-3xl border-2 flex flex-col justify-between transition-all bg-white dark:bg-slate-900 ${
                      isCurrent
                        ? 'border-blue-600 ring-2 ring-blue-500/20'
                        : p.popular
                        ? 'border-purple-300 dark:border-purple-800'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      {p.popular && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 dark:bg-purple-950 px-2.5 py-0.5 rounded-full inline-block mb-2">
                          Most Popular
                        </span>
                      )}
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">{p.name}</h4>
                      <div className="mt-3">
                        <span className="text-2xl font-extrabold text-slate-900 dark:text-white">₹{p.price}</span>
                        <span className="text-xs text-slate-500"> / month</span>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400 font-mono">
                        {p.credits.toLocaleString()} Credits / mo
                      </div>

                      <ul className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                        {p.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                      {isCurrent ? (
                        <button
                          disabled
                          className="w-full py-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200"
                        >
                          Active Plan
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            UserPortalService.upgradePlan(p.id);
                            showNotification(`Successfully upgraded to ${p.name}!`);
                          }}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                        >
                          Switch to Plan
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 3: BALANCE CREDITS & WALLET
         ========================================================================= */}
      {activeTab === 'credits' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Wallet Overview */}
            <div className="bg-linear-to-br from-amber-500 via-amber-600 to-orange-600 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-100">Live Credit Wallet</span>
                  <Coins className="w-6 h-6 text-amber-200" />
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold mt-3 font-mono">
                  {wallet.currentBalance.toLocaleString()}
                </div>
                <div className="text-xs text-amber-100 mt-1">Available Service Credits</div>

                <div className="mt-5 space-y-1.5 text-xs text-amber-100 border-t border-white/20 pt-4">
                  <div className="flex justify-between">
                    <span>Lifetime Purchased:</span>
                    <strong className="font-mono">{wallet.lifetimePurchased} Credits</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Lifetime Consumed:</span>
                    <strong className="font-mono">{wallet.lifetimeConsumed} Credits</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsRechargeModalOpen(true)}
                className="mt-6 w-full py-3 bg-white hover:bg-amber-50 text-amber-900 rounded-2xl text-xs font-bold cursor-pointer transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <Coins className="w-4 h-4 text-amber-600" />
                <span>Recharge Credits Pack</span>
              </button>
            </div>

            {/* Credit Cost Guide */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Credit Consumption Matrix
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transparent service credit costs across Alfa New Gen automated cloud pipelines:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                  <div className="text-xs font-bold text-blue-900 dark:text-blue-300">Story Editorial Desk</div>
                  <div className="text-xl font-extrabold text-blue-600 font-mono mt-1">50 <span className="text-xs font-normal">Credits</span></div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Headline synthesis, plagiarism check &amp; translation.</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300">ePaper Print Plate</div>
                  <div className="text-xl font-extrabold text-emerald-600 font-mono mt-1">100 <span className="text-xs font-normal">Credits</span></div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">High-resolution vector print PDF rendering (300 DPI).</p>
                </div>
                <div className="p-4 rounded-2xl bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
                  <div className="text-xs font-bold text-red-900 dark:text-red-300">Broadcast YouTube News Reel</div>
                  <div className="text-xl font-extrabold text-red-600 font-mono mt-1">150 <span className="text-xs font-normal">Credits</span></div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Television news anchor &amp; broadcast motion graphics video.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Credit Transactions Ledger */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Wallet Transaction Ledger
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="pb-3 font-semibold">Description</th>
                    <th className="pb-3 font-semibold">Category</th>
                    <th className="pb-3 font-semibold">Amount</th>
                    <th className="pb-3 font-semibold">Balance After</th>
                    <th className="pb-3 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {wallet.transactions.map((tx) => (
                    <tr key={tx.id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-3 font-medium">
                        <div>{tx.description}</div>
                        {tx.referenceId && <div className="text-[10px] font-mono text-slate-400">{tx.referenceId}</div>}
                      </td>
                      <td className="py-3 uppercase text-[10px] font-bold text-slate-500">{tx.category}</td>
                      <td className="py-3 font-bold font-mono">
                        <span className={tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}>
                          {tx.type === 'credit' ? `+${tx.amount}` : `-${tx.amount}`}
                        </span>
                      </td>
                      <td className="py-3 font-mono font-semibold text-slate-900 dark:text-white">{tx.balanceAfter}</td>
                      <td className="py-3 text-slate-400">{new Date(tx.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 4: MY EPAPER & DIGITAL EDITIONS
         ========================================================================= */}
      {activeTab === 'paper' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Daily Digital ePaper Editions
            </h3>
            <button
              onClick={() => onNavigate ? onNavigate('/newspaper/page-designer') : window.location.assign('/newspaper/page-designer')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Open Page Designer</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {papers.map((p) => (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="h-44 overflow-hidden relative group">
                    <img src={p.thumbnailUrl} alt={p.editionTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold">
                      {p.district}
                    </div>
                    {p.isNightPressLocked && (
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Locked
                      </div>
                    )}
                  </div>

                  <div className="p-5 space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">{p.editionTitle}</h4>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Language: <strong>{p.language.toUpperCase()}</strong></span>
                      <span>Pages: <strong>{p.pageCount} Pages</strong></span>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-800/80 flex gap-2">
                  <button
                    onClick={() => {
                      if (onNavigate) onNavigate('/newspaper/page-designer');
                    }}
                    className="flex-1 py-2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold hover:bg-blue-100 cursor-pointer text-center"
                  >
                    Read ePaper
                  </button>
                  <button
                    onClick={() => {
                      const debited = UserPortalService.debitCredits(100, 'Downloaded Vector Print ePaper PDF', 'High-Resolution ePaper Print PDF Export', 'epaper_export');
                      if (debited) {
                        showNotification('100 credits debited. Vector print PDF export started!');
                      } else {
                        showNotification('Insufficient credits! Please recharge wallet.');
                      }
                    }}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1"
                    title="Download 300 DPI PDF (100 credits)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 5: AS REPORTER & NEWS DISPATCH DESK
         ========================================================================= */}
      {activeTab === 'reporter' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Reporter Desk &amp; Wire Royalties
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Submit on-ground news dispatches. Direct automated UPI royalties are settled instantly upon publication.
              </p>
            </div>
            <button
              onClick={() => setIsDispatchModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-2 shrink-0 shadow-md"
            >
              <Send className="w-4 h-4" />
              <span>Submit News Dispatch</span>
            </button>
          </div>

          {/* Submissions Table / List */}
          <div className="space-y-4">
            {dispatches.map((disp) => (
              <div
                key={disp.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                      {disp.category}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 font-medium">{disp.district} ({disp.mandal})</span>
                    <span className="text-slate-400">•</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold font-mono">
                      {disp.originalityScore}% Originality
                    </span>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {disp.headline}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {disp.bodyText}
                  </p>

                  {disp.reviewRemarks && (
                    <div className="text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 p-2 rounded-xl">
                      <strong>Editorial Remarks: </strong>{disp.reviewRemarks}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      disp.status === 'published_print'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : disp.status === 'approved'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {disp.status.replace('_', ' ')}
                  </span>

                  <div className="text-right">
                    <div className="text-xs text-slate-500">Royalty Reward</div>
                    <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      ₹{disp.royaltyEarnedINR}
                    </div>
                  </div>

                  {disp.isRoyaltyPaid ? (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Paid via UPI
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pending Review
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 6: YOUTUBE SETTINGS & VIDEO STUDIO
         ========================================================================= */}
      {activeTab === 'youtube' && (
        <div className="space-y-6">
          {/* YouTube Account Connection Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Youtube className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{youtubeConfig.channelTitle}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Connected
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono">{youtubeConfig.channelHandle} • {youtubeConfig.subscriberCount?.toLocaleString()} subscribers</div>
                <div className="text-[11px] text-slate-400 mt-1">Authorized with Google OAuth 2.0</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate ? onNavigate('/newsroom/youtube-studio') : window.location.assign('/newsroom/youtube-studio')}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Open YouTube News Studio</span>
              </button>
            </div>
          </div>

          {/* Automated Video Generation Preferences */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Automated Video Preferences
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  News Anchor Voice (Broadcast Studio)
                </label>
                <select
                  value={youtubeConfig.preferredVoice}
                  onChange={(e) => {
                    const updated = { ...youtubeConfig, preferredVoice: e.target.value };
                    setYoutubeConfig(updated);
                    UserPortalService.saveYouTubeSettings(updated);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Fenrir">Fenrir (Authoritative Prime-Time Anchor)</option>
                  <option value="Aoede">Aoede (Clear Broadcast Bulletin Voice)</option>
                  <option value="Puck">Puck (Fast-Paced Breaking News Alert)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Broadcast Presentation Style
                </label>
                <select
                  value={youtubeConfig.newsStyle}
                  onChange={(e) => {
                    const updated = { ...youtubeConfig, newsStyle: e.target.value as any };
                    setYoutubeConfig(updated);
                    UserPortalService.saveYouTubeSettings(updated);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="emotional_breaking">Emotional Breaking News</option>
                  <option value="dramatic_primetime">Dramatic Primetime Debate</option>
                  <option value="urgent_investigative">Investigative Special Report</option>
                  <option value="speed_bulletin">Speed News Bulletin</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Scrolling Ticker Speed
                </label>
                <select
                  value={youtubeConfig.scrollingTickerSpeed}
                  onChange={(e) => {
                    const updated = { ...youtubeConfig, scrollingTickerSpeed: e.target.value as any };
                    setYoutubeConfig(updated);
                    UserPortalService.saveYouTubeSettings(updated);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="normal">Normal Speed</option>
                  <option value="fast">Fast Speed</option>
                  <option value="slow">Slow Speed</option>
                </select>
              </div>
            </div>

            {/* YouTube Safe Harbor Compliance Card */}
            <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-red-700 dark:text-red-400 uppercase">
                <ShieldCheck className="w-4 h-4" />
                <span>YouTube Safe Harbor &amp; Copyright Protection</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Automatically appends the statutory intermediary safe harbor disclaimer into your YouTube video descriptions to protect against copyright claims and disputes.
              </p>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={youtubeConfig.autoInsertCopyrightDisclaimer}
                  onChange={(e) => {
                    const updated = { ...youtubeConfig, autoInsertCopyrightDisclaimer: e.target.checked };
                    setYoutubeConfig(updated);
                    UserPortalService.saveYouTubeSettings(updated);
                    showNotification('Safe Harbor disclaimer preference updated successfully');
                  }}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span>Automatically append statutory safe harbor disclaimer to all video descriptions</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 7: LEGAL & POLICIES HUB
         ========================================================================= */}
      {activeTab === 'legal' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Statutory Governance &amp; Policies Hub
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Review our statutory compliance documents under Indian IT laws, DPDP Act 2023, and Google/YouTube developer rules:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: 'Terms of Service',
                sub: 'IT Act Sec 79 & Safe Harbor Protection',
                path: '/terms',
              },
              {
                title: 'Liability & Refund Protection',
                sub: 'Damage Cap ₹0/fees & Zero Loss Indemnity',
                path: '/legal',
              },
              {
                title: 'Digital Privacy Policy (DPDP Act 2023)',
                sub: 'Personal Data Protection & MeitY Cloud',
                path: '/privacy',
              },
              {
                title: 'Google & YouTube Policies',
                sub: 'Google API Limited Use & Community Rules',
                path: '/legal',
              },
              {
                title: 'Google Play Store Policy',
                sub: 'User Data Transparency & Account Deletion',
                path: '/legal',
              },
              {
                title: 'Grievance Redressal Mechanism',
                sub: 'Rule 11 IT Rules 2021 Redressal',
                path: '/grievance',
              },
            ].map((p, idx) => (
              <div
                key={idx}
                onClick={() => onNavigate ? onNavigate(p.path) : window.location.assign(p.path)}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {p.title}
                  </h4>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{p.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
         MODAL 1: RECHARGE CREDITS PACK
         ========================================================================= */}
      {isRechargeModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase">
                <Coins className="w-4 h-4" />
                <span>Instant Credit Recharge Pack</span>
              </div>
              <button
                onClick={() => setIsRechargeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                Select Credit Pack
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { credits: 500, price: 199, label: 'Basic Pack' },
                  { credits: 1500, price: 499, label: 'Pro Pack (Best Value)' },
                  { credits: 3500, price: 999, label: 'Publisher Pack' },
                  { credits: 10000, price: 2499, label: 'Agency Pack' },
                ].map((pack) => (
                  <div
                    key={pack.credits}
                    onClick={() => {
                      setSelectedPackCredits(pack.credits);
                      setSelectedPackPrice(pack.price);
                    }}
                    className={`p-3 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                      selectedPackCredits === pack.credits
                        ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                      {pack.credits.toLocaleString()} <span className="text-xs font-normal">Credits</span>
                    </div>
                    <div className="text-xs font-bold text-amber-600">₹{pack.price}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{pack.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>Total Amount to Pay:</span>
                <strong className="text-base font-bold text-slate-900 dark:text-white">₹{selectedPackPrice}</strong>
              </div>
              <div className="text-[11px] text-slate-500">
                UPI Reference / Transaction ID:
              </div>
              <input
                type="text"
                value={rechargeUpiRef}
                onChange={(e) => setRechargeUpiRef(e.target.value)}
                placeholder="UPI-ALFA-XXXXXX"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsRechargeModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  UserPortalService.rechargeWallet(
                    selectedPackCredits,
                    selectedPackPrice,
                    rechargeUpiRef || `UPI-${Date.now().toString().slice(-6)}`
                  );
                  setIsRechargeModalOpen(false);
                  showNotification(`${selectedPackCredits} credits added to your wallet successfully!`);
                }}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Recharge Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         MODAL 2: SUBMIT FIELD NEWS DISPATCH
         ========================================================================= */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase">
                <Send className="w-4 h-4" />
                <span>Submit Field News Dispatch</span>
              </div>
              <button onClick={() => setIsDispatchModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const headline = (form.elements.namedItem('headline') as HTMLInputElement).value;
                const category = (form.elements.namedItem('category') as HTMLSelectElement).value;
                const bodyText = (form.elements.namedItem('bodyText') as HTMLTextAreaElement).value;

                UserPortalService.submitDispatch({
                  headline,
                  headlineTe: headline,
                  category,
                  district: profile.district,
                  mandal: profile.mandalOrCity,
                  bodyText,
                  originalityScore: Math.floor(Math.random() * 10) + 90,
                  photos: ['https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=600&auto=format&fit=crop&q=80'],
                  royaltyEarnedINR: 500,
                });

                setIsDispatchModalOpen(false);
                showNotification('News dispatch submitted successfully! Royalty will be released upon editorial review.');
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Headline *</label>
                <input
                  name="headline"
                  required
                  placeholder="Enter news dispatch headline..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Category</label>
                  <select name="category" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    <option value="Politics">Politics</option>
                    <option value="Development">Development &amp; Transport</option>
                    <option value="Agriculture">Agriculture</option>
                    <option value="Crime">Crime &amp; Judicial</option>
                    <option value="Entertainment">Entertainment</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">District / Bureau</label>
                  <input readOnly value={`${profile.district} (${profile.mandalOrCity})`} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Story Details *</label>
                <textarea
                  name="bodyText"
                  rows={4}
                  required
                  placeholder="Enter event details, timestamp, official statements, and facts..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-300 text-[11px] leading-relaxed">
                Only factual dispatches with verified sources and high originality are approved for broadsheet ePaper publication.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
                >
                  Submit Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
         MODAL 3: ACCOUNT DELETION CONFIRMATION (GOOGLE PLAY POLICY)
         ========================================================================= */}
      {isDeleteAccountModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 text-red-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Confirm Permanent Account Deletion</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Permanently deleting your account will purge your profile, press credentials, and credit wallet balance. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDeleteAccountModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  UserPortalService.requestAccountDeletion();
                  setIsDeleteAccountModalOpen(false);
                  showNotification('Account deletion request registered. Data will be purged within 7 business days.');
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Onboarding Modal */}
      <GoogleProfileOnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        initialName={profile.displayName}
        initialEmail={profile.email}
        initialPhotoUrl={profile.photoURL}
        onSuccess={(updated) => {
          setProfile(updated);
          showNotification('Profile details and statutory agreements updated successfully!');
        }}
      />
    </div>
  );
};
