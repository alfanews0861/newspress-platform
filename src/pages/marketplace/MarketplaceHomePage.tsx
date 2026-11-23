/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MarketplaceHomePage Component
 * Route: /marketplace
 * Phase 12 — Public Marketplace, Publisher Acquisition Portal & Licensed Content Workspace
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Sparkles,
  TrendingUp,
  Package,
  Shield,
  Layers,
  Filter,
  List,
  LayoutGrid,
  RotateCcw,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Globe,
  FileText,
  AlignLeft,
  Camera,
  Video,
  CheckCircle2,
  Newspaper
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MarketplaceStoryCard } from '../../components/marketplace/MarketplaceStoryCard';
import { MarketplacePurchaseModal } from '../../components/marketplace/MarketplacePurchaseModal';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { marketplaceService } from '../../services/marketplaceService';
import { MarketplaceListing, MarketplaceEntitlement } from '../../types/marketplace';
import { navigateTo } from '../../utils/navigation';

export const LANGUAGE_FILTER_OPTIONS = [
  { id: 'all', label: 'All Languages' },
  { id: 'te', label: 'Telugu' },
  { id: 'ta', label: 'Tamil (தமிழ்)' },
  { id: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
  { id: 'bn', label: 'Bengali (বাংলা)' },
  { id: 'or', label: 'Odia (ଓଡ଼ିଆ)' },
  { id: 'hi', label: 'Hindi (हिन्दी)' },
  { id: 'en', label: 'English' },
  { id: 'ml', label: 'Malayalam (മലയാളം)' },
  { id: 'mr', label: 'Marathi (मराठी)' },
  { id: 'gu', label: 'Gujarati (ગુજરાતી)' },
  { id: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' },
];

export const STORY_TYPE_FILTER_OPTIONS = [
  { id: 'all', label: 'All Story Types' },
  { id: 'spot_news', label: 'Spot News (Breaking)' },
  { id: 'investigative', label: 'Investigative Story' },
  { id: 'general', label: 'General / Feature Story' },
  { id: 'editorial', label: 'Editorial / Op-Ed' },
  { id: 'satirical', label: 'Satirical / Humor' },
  { id: 'exclusive', label: 'Exclusive Investigation' },
];

export const WORD_COUNT_FILTER_OPTIONS = [
  { id: 'all', label: 'All Word Counts' },
  { id: '100-150', label: '100 – 150 words (Flash News)' },
  { id: '150-250', label: '150 – 250 words (Short Story)' },
  { id: '250-500', label: '250 – 500 words (Medium Story)' },
  { id: '500+', label: '500+ words (In-Depth / Long Form)' },
];

export const MEDIA_FILTER_OPTIONS = [
  { id: 'all', label: 'All Media Assets' },
  { id: 'with_photo', label: 'With Photos (High-Res)' },
  { id: 'without_photo', label: 'Without Photo (Text Only)' },
  { id: 'video_news', label: 'Video News / Broadcast' },
];

const PRESET_CATEGORIES = [
  { id: 'all', label: 'All Dispatches' },
  { id: 'Politics', label: 'Politics' },
  { id: 'Crime & Justice', label: 'Crime & Justice' },
  { id: 'Health & Science', label: 'Health & Science' },
  { id: 'Sports', label: 'Sports' },
  { id: 'Business & Economy', label: 'Business & Economy' },
  { id: 'Agriculture & Rural', label: 'Agriculture & Rural' },
  { id: 'Infrastructure & Transit', label: 'Infrastructure & Transit' },
  { id: 'Culture & Entertainment', label: 'Culture & Entertainment' },
  { id: 'Technology & Science', label: 'Technology' },
];

export const MarketplaceHomePage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  // Core & Advanced Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedStoryType, setSelectedStoryType] = useState<string>('all');
  const [selectedWordCount, setSelectedWordCount] = useState<string>('all');
  const [selectedMedia, setSelectedMedia] = useState<string>('all');
  const [listingTypeFilter, setListingTypeFilter] = useState<'all' | 'EXCLUSIVE' | 'PREMIUM' | 'STANDARD'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'price_asc' | 'price_desc' | 'words_desc' | 'words_asc'>('latest');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [entitlement, setEntitlement] = useState<MarketplaceEntitlement | undefined>(undefined);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);

  const refreshListings = () => {
    setListings(marketplaceService.getListings({ status: 'ACTIVE' }));
    if (currentTenant) {
      setEntitlement(marketplaceService.getTenantEntitlement(currentTenant.tenantId));
    }
  };

  useEffect(() => {
    refreshListings();

    // Set page title & OpenGraph metadata for SEO
    document.title = 'NewsPress Wire | B2B News Syndication & Licensing Marketplace';
  }, [currentTenant]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleViewDetail = (listingId: string) => {
    navigateTo(`/marketplace/story/${listingId}`);
  };

  // Dynamically union preset categories with any custom categories present in listings
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of PRESET_CATEGORIES) {
      map.set(c.id.toLowerCase(), c.label);
    }
    for (const item of listings) {
      if (item.category && !map.has(item.category.toLowerCase())) {
        map.set(item.category.toLowerCase(), item.category);
      }
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [listings]);

  const filteredListings = useMemo(() => {
    return listings
      .filter((l) => {
        // 1. Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matches =
            l.title.toLowerCase().includes(q) ||
            l.shortDescription.toLowerCase().includes(q) ||
            (l.reporterByline || l.reporterName || '').toLowerCase().includes(q) ||
            l.category.toLowerCase().includes(q) ||
            (l.district || '').toLowerCase().includes(q) ||
            (l.state || '').toLowerCase().includes(q);
          if (!matches) return false;
        }

        // 2. Category
        if (activeCategory !== 'all') {
          const cat = activeCategory.toLowerCase();
          const lCat = l.category.toLowerCase();
          if (!lCat.includes(cat) && !cat.includes(lCat)) {
            return false;
          }
        }

        // 3. Language Filter
        if (selectedLanguage !== 'all') {
          if (!l.language || l.language.toLowerCase() !== selectedLanguage.toLowerCase()) {
            return false;
          }
        }

        // 4. Story Type Filter
        if (selectedStoryType !== 'all') {
          if (!l.storyType || l.storyType.toLowerCase() !== selectedStoryType.toLowerCase()) {
            return false;
          }
        }

        // 5. Word Count Range Filter
        if (selectedWordCount !== 'all') {
          const count = l.wordCount || 0;
          if (selectedWordCount === '100-150') {
            if (count < 100 || count > 150) return false;
          } else if (selectedWordCount === '150-250') {
            if (count < 150 || count > 250) return false;
          } else if (selectedWordCount === '250-500') {
            if (count < 250 || count > 500) return false;
          } else if (selectedWordCount === '500+') {
            if (count < 500) return false;
          }
        }

        // 6. Media Filter
        if (selectedMedia !== 'all') {
          if (selectedMedia === 'with_photo') {
            if (!l.hasPhotography || (l.photoCount || 0) <= 0) return false;
          } else if (selectedMedia === 'without_photo') {
            if (l.hasPhotography && (l.photoCount || 0) > 0) return false;
          } else if (selectedMedia === 'video_news') {
            if (!l.hasVideo && (l.videoCount || 0) <= 0) return false;
          }
        }

        // 7. Licensing Type / Tier Filter
        if (listingTypeFilter !== 'all') {
          if (l.listingType !== listingTypeFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'words_desc') return (b.wordCount || 0) - (a.wordCount || 0);
        if (sortBy === 'words_asc') return (a.wordCount || 0) - (b.wordCount || 0);
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
  }, [
    listings,
    searchQuery,
    activeCategory,
    selectedLanguage,
    selectedStoryType,
    selectedWordCount,
    selectedMedia,
    listingTypeFilter,
    sortBy
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    activeCategory !== 'all' ||
    selectedLanguage !== 'all' ||
    selectedStoryType !== 'all' ||
    selectedWordCount !== 'all' ||
    selectedMedia !== 'all' ||
    listingTypeFilter !== 'all' ||
    sortBy !== 'latest';

  const resetFilters = () => {
    setSearchQuery('');
    setActiveCategory('all');
    setSelectedLanguage('all');
    setSelectedStoryType('all');
    setSelectedWordCount('all');
    setSelectedMedia('all');
    setListingTypeFilter('all');
    setSortBy('latest');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="News Marketplace"
        subtitle="Buy verified stories when your edition needs more news — or publish independent stories for every publisher to buy."
        breadcrumbs={[
          { label: 'Marketplace', href: '/marketplace' },
          { label: 'Browse Wire' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigateTo('/marketplace/licensed')}>
              My Purchased Stories
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigateTo('/marketplace/my-listings')}>
              Sell / My Listings
            </Button>
          </div>
        }
      />

      {/* SEO Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'NewsPress Wire Marketplace',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'All',
            description: 'Public news marketplace and publisher acquisition workspace for licensing verified dispatches.'
          })
        }}
      />

      {/* Hero Banner & Search Bar */}
      <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-50/80 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850 border border-blue-100 dark:border-slate-800 shadow-xs space-y-6 relative overflow-hidden">
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              VERIFIED B2B NEWS WIRE
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">Zero Unverified Content</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white font-sans leading-tight">
            License Original Dispatches & Investigative Packages
          </h2>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl font-sans">
            Acquire broadsheet print and digital web publishing rights directly from accredited correspondents and regional newsrooms.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3 max-w-2xl relative z-10">
          <div className="flex-1 w-full">
            <Input
              placeholder="Search by headline, beat, district, or reporter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>
          <Button type="submit" variant="primary" className="w-full sm:w-auto shrink-0">
            Search Wire
          </Button>
        </form>

        {/* Subscription Entitlement Status */}
        {currentTenant && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-sans relative z-10 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>
                Standard News Pack Status: <strong className="text-slate-900 dark:text-white font-semibold">{entitlement?.remainingUnits || 0}</strong> / {entitlement?.totalUnits || 0} units remaining
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigateTo('/marketplace/search')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" /> Advanced Search & Filters →
            </button>
          </div>
        )}
      </div>

      {/* Filter and Control Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5 font-sans">
        {/* Row 1: Category Rail (Interactive Quick Pills) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>News Beats & Desks:</span>
            {activeCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Clear Category
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeCategory.toLowerCase() === cat.id.toLowerCase()
                    ? 'bg-blue-600 text-white font-semibold shadow-xs ring-2 ring-blue-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-medium border border-slate-200 dark:border-slate-700/60'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Comprehensive Multi-Filter Bar (Language, Type, Word Count, Media, Tier, Sort) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* 1. Language Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Globe className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Language:</span>
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
            >
              {LANGUAGE_FILTER_OPTIONS.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Story Type Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <FileText className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              <span>Story Type:</span>
            </label>
            <select
              value={selectedStoryType}
              onChange={(e) => setSelectedStoryType(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
            >
              {STORY_TYPE_FILTER_OPTIONS.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Word Count Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <AlignLeft className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Word Count:</span>
            </label>
            <select
              value={selectedWordCount}
              onChange={(e) => setSelectedWordCount(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
            >
              {WORD_COUNT_FILTER_OPTIONS.map((wc) => (
                <option key={wc.id} value={wc.id}>
                  {wc.label}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Media Assets Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Camera className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>Media Assets:</span>
            </label>
            <select
              value={selectedMedia}
              onChange={(e) => setSelectedMedia(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
            >
              {MEDIA_FILTER_OPTIONS.map((med) => (
                <option key={med.id} value={med.id}>
                  {med.label}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Licensing Tier */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>Licensing Tier:</span>
            </label>
            <select
              value={listingTypeFilter}
              onChange={(e) => setListingTypeFilter(e.target.value as any)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
            >
              <option value="all">All Tiers (Standard + Premium + Exclusive)</option>
              <option value="EXCLUSIVE">Exclusive Rights Only</option>
              <option value="PREMIUM">Premium Wire</option>
              <option value="STANDARD">Standard News Pack</option>
            </select>
          </div>

          {/* 6. Sort By */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-slate-500" />
              <span>Sort By:</span>
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
            >
              <option value="latest">Latest Dispatches</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="words_desc">Word Count: High to Low</option>
              <option value="words_asc">Word Count: Low to High</option>
            </select>
          </div>
        </div>

        {/* Row 3: Active Filter Chips & View Mode Switcher */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          {/* Active Chips Strip */}
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            {hasActiveFilters ? (
              <>
                <span className="text-[11px] font-semibold text-slate-400">Active Filters:</span>
                {searchQuery.trim() && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                    Query: "{searchQuery}"
                    <button type="button" onClick={() => setSearchQuery('')} className="hover:text-red-500 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {activeCategory !== 'all' && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/60">
                    Desk: {categories.find(c => c.id.toLowerCase() === activeCategory.toLowerCase())?.label || activeCategory}
                    <button type="button" onClick={() => setActiveCategory('all')} className="hover:text-red-500 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedLanguage !== 'all' && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/60">
                    Lang: {LANGUAGE_FILTER_OPTIONS.find((l) => l.id === selectedLanguage)?.label || selectedLanguage}
                    <button type="button" onClick={() => setSelectedLanguage('all')} className="hover:text-red-500 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedStoryType !== 'all' && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800/60">
                    Type: {STORY_TYPE_FILTER_OPTIONS.find((st) => st.id === selectedStoryType)?.label || selectedStoryType}
                    <button type="button" onClick={() => setSelectedStoryType('all')} className="hover:text-red-500 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedWordCount !== 'all' && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                    Words: {WORD_COUNT_FILTER_OPTIONS.find((wc) => wc.id === selectedWordCount)?.label || selectedWordCount}
                    <button type="button" onClick={() => setSelectedWordCount('all')} className="hover:text-red-500 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedMedia !== 'all' && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800/60">
                    Media: {MEDIA_FILTER_OPTIONS.find((m) => m.id === selectedMedia)?.label || selectedMedia}
                    <button type="button" onClick={() => setSelectedMedia('all')} className="hover:text-red-500 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {listingTypeFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60">
                    Tier: {listingTypeFilter}
                    <button type="button" onClick={() => setListingTypeFilter('all')} className="hover:text-red-500 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:underline px-2 py-0.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer font-semibold ml-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset All</span>
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Showing syndication dispatches across all languages & beats. Use filters above to narrow your query.</span>
              </span>
            )}
          </div>

          {/* View Mode Toggle Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
              }`}
              title="Compact List Items"
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Count Banner */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 font-sans">
        <span>
          Showing <strong className="text-slate-900 dark:text-slate-100 font-bold">{filteredListings.length}</strong> of {listings.length} dispatches
          {hasActiveFilters && ' (filtered)'}
        </span>
        <span className="text-[11px] text-slate-400">
          Format: {viewMode === 'list' ? 'Compact List Items' : 'Standard Grid Cards'}
        </span>
      </div>

      {/* Dispatches Feed */}
      {filteredListings.length === 0 ? (
        <div className="text-center py-16 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-sans">
          <Newspaper className="w-12 h-12 mx-auto text-slate-400 mb-3 stroke-1" />
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No marketplace stories found matching your filter criteria
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Try choosing a different language, word count range, or clearing filters to view all available wire packages.
          </p>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Clear All Filters
            </Button>
          </div>
        </div>
      ) : (
        <div className={viewMode === 'list' ? 'space-y-3 font-sans' : 'grid grid-cols-1 md:grid-cols-2 gap-5 font-sans'}>
          {filteredListings.map((item) => (
            <MarketplaceStoryCard
              key={item.listingId}
              listing={item}
              viewMode={viewMode}
              onSelect={(l) => setSelectedListing(l)}
              onViewDetail={handleViewDetail}
            />
          ))}
        </div>
      )}

      {/* Interactive Purchase Modal */}
      {selectedListing && currentTenant && user && (
        <MarketplacePurchaseModal
          isOpen={Boolean(selectedListing)}
          onClose={() => setSelectedListing(null)}
          listing={selectedListing}
          buyerTenantId={currentTenant.tenantId}
          buyerTenantName={currentTenant.organizationName}
          buyerUserId={user.uid}
          buyerUserName={user.displayName}
          onSuccess={() => refreshListings()}
        />
      )}
    </div>
  );
};
