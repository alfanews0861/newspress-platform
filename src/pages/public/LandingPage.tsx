/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UnifiedPlatformHeader } from '../../components/navigation/UnifiedPlatformHeader';
import { INDIAN_MEDIA } from '../../data/indianMediaAssets';
import {
  ArrowRight,
  ChevronRight,
  Check,
  Printer,
  Coins,
  Radio,
  FileText,
  Sun,
  Moon,
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('newspress_theme');
      return saved === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });

  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('newspress_theme', theme);
  }, [theme]);

  const navigateTo = (path: string) => onNavigate(path);

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1c1e] text-[#202124] dark:text-[#f8f9fa] font-sans selection:bg-[#e8f0fe] selection:text-[#1a73e8] transition-colors">
      <UnifiedPlatformHeader currentPath="/" onNavigate={navigateTo} />

      {/* 1. HERO */}
      <section
        id="hero"
        className="google-hero-glow pt-8 pb-12 sm:pt-14 sm:pb-20 border-b border-[#e0e3e7] dark:border-[#3c4043]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <p className="text-xs sm:text-sm font-medium text-[#5f6368] dark:text-[#bdc1c6]">
              <span className="text-[#1a73e8] dark:text-[#8ab4f8] font-semibold">Pan-India Newsroom Suite</span>
              <span className="mx-2 text-[#bdc1c6]" aria-hidden="true">·</span>
              <span>Print, Field &amp; Broadcast</span>
            </p>

            <h1 className="text-3xl sm:text-5xl lg:text-[3.5rem] font-bold text-[#202124] dark:text-[#f8f9fa] tracking-tight leading-[1.12]">
              Modern newspaper publishing,{' '}
              <span className="text-[#1a73e8] dark:text-[#8ab4f8]">built</span>{' '}
              <span className="text-[#ea4335] dark:text-[#f28b82]">for</span>{' '}
              <span className="text-[#e37400] dark:text-[#fdd663]">India&apos;s</span>{' '}
              <span className="text-[#1e8e3e] dark:text-[#81c995]">newsrooms.</span>
            </h1>

            <p className="text-sm sm:text-base text-[#5f6368] dark:text-[#bdc1c6] max-w-xl mx-auto leading-relaxed">
              Manage field stories, design 8-column print editions, and publish digital video bulletins from one workspace.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigateTo('/dashboard')}
                className="min-h-[46px] px-7 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span>Open Newsroom</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigateTo('/marketplace')}
                className="min-h-[46px] px-6 rounded-full border border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#242629] hover:bg-[#f1f6fe] dark:hover:bg-[#2e3135] text-[#1a73e8] dark:text-[#8ab4f8] font-semibold text-sm transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>Browse Marketplace</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Visual Showcase Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            <div
              onClick={() => navigateTo('/dashboard')}
              className="lg:col-span-7 relative rounded-2xl sm:rounded-3xl overflow-hidden border border-[#d2e3fc] dark:border-[#3c4043] bg-[#eef4ff] dark:bg-[#242629] min-h-[240px] sm:min-h-[340px] lg:min-h-[400px] group cursor-pointer"
            >
              <img
                src={INDIAN_MEDIA.heroNewsroom}
                alt="Indian journalists collaborating in a modern newsroom"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-5 sm:p-7 text-white space-y-1">
                <div className="text-xs text-white/80">Print &amp; Digital Newsroom</div>
                <h2 className="text-lg sm:text-2xl font-bold text-white leading-snug max-w-lg">
                  From field dispatches to midnight press runs.
                </h2>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-3 sm:gap-4">
              {HERO_TILES.map((tile) => (
                <div
                  key={tile.title}
                  onClick={() => navigateTo(tile.route)}
                  className={`rounded-2xl overflow-hidden border ${tile.surfaceClass} flex flex-col justify-between group cursor-pointer`}
                >
                  <div className="relative h-28 sm:h-36 overflow-hidden">
                    <img
                      src={tile.image}
                      alt={tile.alt}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-3 sm:p-4">
                    <div className={`text-[11px] font-semibold ${tile.labelColor}`}>{tile.kicker}</div>
                    <div className="text-xs sm:text-sm font-bold text-[#202124] dark:text-[#f8f9fa] leading-snug mt-0.5">
                      {tile.title}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4-Column Metric Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-6 border-t border-[#e0e3e7] dark:border-[#3c4043]">
            {IMPACT_STATS.map((stat) => (
              <div key={stat.label} className="space-y-0.5">
                <div className={`text-2xl sm:text-3xl font-bold tabular-nums ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-[#202124] dark:text-[#f8f9fa]">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. FOUR CONNECTED DESKS */}
      <section
        id="suite"
        className="py-12 sm:py-18 bg-[#f8fafd] dark:bg-[#16181a] border-b border-[#e0e3e7] dark:border-[#3c4043]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="max-w-xl space-y-1.5">
            <p className="text-xs sm:text-sm font-semibold text-[#1a73e8] dark:text-[#8ab4f8]">
              Platform Suite
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#202124] dark:text-[#f8f9fa] tracking-tight">
              Four tools built for daily publishing.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {DESK_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  onClick={() => navigateTo(card.route)}
                  className={`rounded-2xl border ${card.surfaceClass} overflow-hidden flex flex-col justify-between group cursor-pointer`}
                >
                  <div className="p-5 sm:p-6 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${card.accentText}`}>
                        {card.number} · {card.kicker}
                      </span>
                      <Icon className={`w-4 h-4 ${card.accentText}`} />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#202124] dark:text-[#f8f9fa]">
                      {card.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#3c4043] dark:text-[#dadce0] leading-relaxed">
                      {card.summary}
                    </p>
                    <div className={`inline-flex items-center gap-1 text-xs sm:text-sm font-semibold pt-1 ${card.accentText}`}>
                      <span>{card.cta}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                  <div className="px-5 sm:px-6">
                    <div className="h-40 sm:h-48 rounded-t-xl overflow-hidden border-t border-x border-black/5 dark:border-white/10">
                      <img
                        src={card.image}
                        alt={card.alt}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. SIMPLE PRICING */}
      <section
        id="pricing"
        className="py-12 sm:py-18 bg-white dark:bg-[#1a1c1e] border-b border-[#e0e3e7] dark:border-[#3c4043]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-semibold text-[#1e8e3e] dark:text-[#81c995]">
                Pricing
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#202124] dark:text-[#f8f9fa] tracking-tight">
                Simple plans for every publication.
              </h2>
            </div>

            <div className="inline-flex self-start sm:self-auto items-center p-1 rounded-full bg-[#f1f3f4] dark:bg-[#242629] border border-[#e0e3e7] dark:border-[#3c4043]">
              <button
                type="button"
                onClick={() => setBillingPeriod('monthly')}
                className={`min-h-[36px] px-4 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  billingPeriod === 'monthly'
                    ? 'bg-white dark:bg-[#1a73e8] text-[#202124] dark:text-white shadow-xs'
                    : 'text-[#5f6368] dark:text-[#bdc1c6]'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod('annual')}
                className={`min-h-[36px] px-4 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  billingPeriod === 'annual'
                    ? 'bg-white dark:bg-[#1a73e8] text-[#202124] dark:text-white shadow-xs'
                    : 'text-[#5f6368] dark:text-[#bdc1c6]'
                }`}
              >
                Annual (-20%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {PRICING_PLANS.map((plan) => {
              const price = billingPeriod === 'annual' ? plan.annualPrice : plan.monthlyPrice;
              const displayPrice = price === 0 ? '₹0' : `₹${price.toLocaleString('en-IN')}`;
              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl bg-[#f8fafd] dark:bg-[#242629] overflow-hidden flex flex-col justify-between border ${
                    plan.featured
                      ? 'border-2 border-[#1a73e8]'
                      : 'border-[#e0e3e7] dark:border-[#3c4043]'
                  }`}
                >
                  <div>
                    <div className={`h-1 w-full ${plan.barColor}`} />
                    <div className="p-5 sm:p-6 space-y-4">
                      <div>
                        <div className={`text-xs font-semibold ${plan.labelColor}`}>
                          {plan.audience}
                        </div>
                        <h3 className="text-lg font-bold text-[#202124] dark:text-[#f8f9fa] mt-0.5">
                          {plan.name}
                        </h3>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold tabular-nums text-[#202124] dark:text-[#f8f9fa]">
                          {displayPrice}
                        </span>
                        <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                          {plan.unit}
                        </span>
                      </div>

                      <ul className="space-y-2 pt-3 border-t border-[#e0e3e7] dark:border-[#3c4043] text-xs sm:text-sm text-[#3c4043] dark:text-[#e8eaed]">
                        {plan.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-2">
                            <Check className={`w-4 h-4 shrink-0 mt-0.5 ${plan.labelColor}`} />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 pt-0">
                    <button
                      type="button"
                      onClick={() => navigateTo(plan.route)}
                      className={`w-full min-h-[44px] px-4 rounded-full text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        plan.featured
                          ? 'bg-[#1a73e8] hover:bg-[#1557b0] text-white'
                          : 'border border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#1a1c1e] hover:bg-[#f1f6fe] dark:hover:bg-[#2e3135] text-[#1a73e8] dark:text-[#8ab4f8]'
                      }`}
                    >
                      {plan.cta}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. QUIET FOOTER */}
      <footer className="bg-[#f8f9fa] dark:bg-[#1f2124] text-[#5f6368] dark:text-[#bdc1c6] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="2.5" y="3.5" width="19" height="17" rx="4" stroke="#4285f4" strokeWidth="2.2" />
                  <line x1="6.5" y1="8.5" x2="12.5" y2="8.5" stroke="#ea4335" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1="6.5" y1="12.5" x2="17.5" y2="12.5" stroke="#fbbc04" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1="6.5" y1="16.5" x2="14.5" y2="16.5" stroke="#34a853" strokeWidth="2.2" strokeLinecap="round" />
                  <circle cx="16.2" cy="8.5" r="1.6" fill="#4285f4" />
                </svg>
                <span className="font-bold text-lg tracking-tight text-[#202124] dark:text-[#f8f9fa]">
                  NewsPress
                </span>
              </div>
              <p className="text-xs max-w-sm">
                Newspaper publishing, field reporter wire, and broadcast studio for Indian media teams.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium">
              <button type="button" onClick={() => navigateTo('/dashboard')} className="hover:text-[#1a73e8] cursor-pointer py-1">
                Console
              </button>
              <button type="button" onClick={() => navigateTo('/marketplace')} className="hover:text-[#1a73e8] cursor-pointer py-1">
                Marketplace
              </button>
              <button type="button" onClick={() => navigateTo('/newspaper/page-designer')} className="hover:text-[#1a73e8] cursor-pointer py-1">
                Page Designer
              </button>
              <button type="button" onClick={() => navigateTo('/legal')} className="hover:text-[#1a73e8] cursor-pointer py-1">
                Legal &amp; Privacy
              </button>
              <button
                type="button"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#242629] text-xs font-medium text-[#3c4043] dark:text-[#e8eaed] cursor-pointer"
              >
                {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-[#fbbc04]" />}
                <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
              </button>
            </div>
          </div>

          <div className="border-t border-[#e0e3e7] dark:border-[#3c4043] pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <span>© 2026 NewsPress India</span>
            <span>desk@newspress-india.org</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const HERO_TILES = [
  {
    kicker: 'Field Beats',
    title: 'Live Dispatches',
    route: '/newsroom/reporters',
    image: INDIAN_MEDIA.femaleFieldReporter,
    alt: 'Field journalist reporting live',
    surfaceClass: 'google-surface-blue',
    labelColor: 'text-[#1a73e8] dark:text-[#8ab4f8]',
  },
  {
    kicker: 'Broadcast',
    title: 'News Bulletins',
    route: '/newsroom/youtube-studio',
    image: INDIAN_MEDIA.broadcastStudio,
    alt: 'Television broadcast news studio',
    surfaceClass: 'google-surface-red',
    labelColor: 'text-[#d93025] dark:text-[#f28b82]',
  },
  {
    kicker: 'Print Editions',
    title: '8-Col Broadsheet',
    route: '/newspaper/page-designer',
    image: INDIAN_MEDIA.peopleReadingPaper,
    alt: 'Readers enjoying morning newspaper',
    surfaceClass: 'google-surface-yellow',
    labelColor: 'text-[#b06000] dark:text-[#fdd663]',
  },
  {
    kicker: 'Wire Market',
    title: 'Instant UPI Pay',
    route: '/marketplace',
    image: INDIAN_MEDIA.maleFieldReporter,
    alt: 'District photojournalist in local market',
    surfaceClass: 'google-surface-green',
    labelColor: 'text-[#137333] dark:text-[#81c995]',
  },
];

const IMPACT_STATS = [
  { value: '48+', label: 'Indian Dailies', color: 'text-[#1a73e8] dark:text-[#8ab4f8]' },
  { value: '1.24M+', label: 'Daily Circulation', color: 'text-[#1e8e3e] dark:text-[#81c995]' },
  { value: '99.98%', label: 'On-Time Press Lock', color: 'text-[#e37400] dark:text-[#fdd663]' },
  { value: '₹4.2 Cr+', label: 'Reporter Royalties', color: 'text-[#d93025] dark:text-[#f28b82]' },
];

const DESK_CARDS = [
  {
    number: '01',
    kicker: 'Editorial Desk',
    title: 'Stories & Copy Review',
    summary: 'Review field dispatches across 11 Indian languages and approve stories in one tap.',
    cta: 'Open Stories',
    route: '/newsroom/news',
    icon: FileText,
    image: INDIAN_MEDIA.heroNewsroom,
    alt: 'Editors reviewing stories together',
    surfaceClass: 'google-surface-blue',
    accentText: 'text-[#1a73e8] dark:text-[#8ab4f8]',
  },
  {
    number: '02',
    kicker: 'Print Studio',
    title: '8-Column Page Designer',
    summary: 'Assemble daily editions and export 300 DPI print-ready PDF plates cleanly.',
    cta: 'Open Designer',
    route: '/newspaper/page-designer',
    icon: Printer,
    image: INDIAN_MEDIA.peopleReadingPaper,
    alt: 'Printed daily newspaper edition',
    surfaceClass: 'google-surface-green',
    accentText: 'text-[#137333] dark:text-[#81c995]',
  },
  {
    number: '03',
    kicker: 'Marketplace',
    title: 'Verified Reporter Wire',
    summary: 'License original district stories with instant UPI payouts to accredited reporters.',
    cta: 'Browse Wire',
    route: '/marketplace',
    icon: Coins,
    image: INDIAN_MEDIA.maleFieldReporter,
    alt: 'Field correspondent covering local story',
    surfaceClass: 'google-surface-yellow',
    accentText: 'text-[#b06000] dark:text-[#fdd663]',
  },
  {
    number: '04',
    kicker: 'Broadcast',
    title: 'Digital Video Studio',
    summary: 'Turn approved news stories into broadcast-ready bulletins with tickers and studio audio.',
    cta: 'Open Studio',
    route: '/newsroom/youtube-studio',
    icon: Radio,
    image: INDIAN_MEDIA.broadcastStudio,
    alt: 'Digital television news studio',
    surfaceClass: 'google-surface-red',
    accentText: 'text-[#c5221f] dark:text-[#f28b82]',
  },
];

const PRICING_PLANS = [
  {
    id: 'payg',
    audience: 'Weekly & Indie Press',
    name: 'Pay As You Go',
    monthlyPrice: 0,
    annualPrice: 0,
    unit: '/ month (Prepaid)',
    features: [
      '₹49 per 300 DPI Print Plate',
      '₹29 per Video Bulletin',
      '₹500 minimum UPI wallet top-up',
    ],
    cta: 'Start Free',
    route: '/login',
    featured: false,
    barColor: 'bg-[#34a853]',
    labelColor: 'text-[#1e8e3e] dark:text-[#81c995]',
  },
  {
    id: 'state',
    audience: 'Most Popular',
    name: 'State Pro',
    monthlyPrice: 14999,
    annualPrice: 11999,
    unit: '/ month',
    features: [
      '12 District Editions & Pullouts',
      'Unlimited Reporter Seats',
      '120 Broadcast Bulletins / month',
    ],
    cta: 'Launch State Pro',
    route: '/dashboard',
    featured: true,
    barColor: 'bg-[#4285f4]',
    labelColor: 'text-[#1a73e8] dark:text-[#8ab4f8]',
  },
  {
    id: 'district',
    audience: 'Independent Dailies',
    name: 'District Starter',
    monthlyPrice: 4999,
    annualPrice: 3999,
    unit: '/ month',
    features: [
      '2 Regional Daily Editions',
      '25 Accredited Reporter Seats',
      '300 DPI Vector PDF Export',
    ],
    cta: 'Start 14-Day Trial',
    route: '/login',
    featured: false,
    barColor: 'bg-[#fbbc04]',
    labelColor: 'text-[#b06000] dark:text-[#fdd663]',
  },
];
