/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MarketplaceHomePage Component
 * Route: /marketplace
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Package,
  SlidersHorizontal,
  RotateCcw,
  Newspaper,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MarketplaceStoryCard } from '../../components/marketplace/MarketplaceStoryCard';
import { MarketplacePurchaseModal } from '../../components/marketplace/MarketplacePurchaseModal';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { marketplaceService } from '../../services/marketplaceService';
import { wireFeedService } from '../../services/wireFeedService';
import { MarketplaceListing, MarketplaceEntitlement } from '../../types/marketplace';
import { navigateTo } from '../../utils/navigation';

export const LANGUAGE_FILTER_OPTIONS = [
  { id: 'all', label: 'All Languages' },
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'Hindi' },
  { id: 'te', label: 'Telugu' },
  { id: 'ta', label: 'Tamil' },
  { id: 'kn', label: 'Kannada' },
  { id: 'ml', label: 'Malayalam' },
  { id: 'mr', label: 'Marathi' },
  { id: 'bn', label: 'Bengali' },
  { id: 'gu', label: 'Gujarati' },
  { id: 'or', label: 'Odia' },
  { id: 'pa', label: 'Punjabi' },
];

export const STORY_TYPE_FILTER_OPTIONS = [
  { id: 'all', label: 'All Story Types' },
  { id: 'spot_news', label: 'Spot News' },
  { id: 'investigative', label: 'Investigative' },
  { id: 'general', label: 'Feature' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'satirical', label: 'Satire' },
  { id: 'exclusive', label: 'Exclusive' },
];

export const WORD_COUNT_FILTER_OPTIONS = [
  { id: 'all', label: 'Any Length' },
  { id: '100-150', label: '100 – 150 words' },
  { id: '150-250', label: '150 – 250 words' },
  { id: '250-500', label: '250 – 500 words' },
  { id: '500+', label: '500+ words' },
];

export const MEDIA_FILTER_OPTIONS = [
  { id: 'all', label: 'All Media' },
  { id: 'with_photo', label: 'With Photos' },
  { id: 'without_photo', label: 'Text Only' },
  { id: 'video_news', label: 'With Video' },
];

const PRESET_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'Politics', label: 'Politics' },
  { id: 'Crime & Justice', label: 'Crime' },
  { id: 'Health & Science', label: 'Health' },
  { id: 'Sports', label: 'Sports' },
  { id: 'Business & Economy', label: 'Business' },
  { id: 'Agriculture & Rural', label: 'Rural' },
  { id: 'Infrastructure & Transit', label: 'Transit' },
  { id: 'Culture & Entertainment', label: 'Culture' },
  { id: 'Technology & Science', label: 'Tech' },
];

export const MarketplaceHomePage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user, isPlatformAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedStoryType, setSelectedStoryType] = useState<string>('all');
  const [selectedMedia, setSelectedMedia] = useState<string>('all');
  const [listingTypeFilter, setListingTypeFilter] = useState<'all' | 'EXCLUSIVE' | 'PREMIUM' | 'STANDARD'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'price_asc' | 'price_desc' | 'words_desc'>('latest');
  const [showFilters, setShowFilters] = useState<boolean>(false);

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
    document.title = 'NewsPress | News Marketplace';

    const unsubscribe = wireFeedService.subscribeLiveWireListings((liveListings) => {
      if (liveListings.length > 0) {
        marketplaceService.upsertLiveWireListings(liveListings);
        refreshListings();
      }
    });

    return () => unsubscribe();
  }, [currentTenant, user?.uid]);

  const handleViewDetail = (listingId: string) => {
    navigateTo(`/marketplace/story/${listingId}`);
  };

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

        if (activeCategory !== 'all') {
          const cat = activeCategory.toLowerCase();
          const lCat = l.category.toLowerCase();
          if (!lCat.includes(cat) && !cat.includes(lCat)) return false;
        }

        if (selectedLanguage !== 'all') {
          if (!l.language || l.language.toLowerCase() !== selectedLanguage.toLowerCase()) return false;
        }

        if (selectedStoryType !== 'all') {
          if (!l.storyType || l.storyType.toLowerCase() !== selectedStoryType.toLowerCase()) return false;
        }

        if (selectedMedia !== 'all') {
          if (selectedMedia === 'with_photo' && (!l.hasPhotography || (l.photoCount || 0) <= 0)) return false;
          if (selectedMedia === 'without_photo' && l.hasPhotography && (l.photoCount || 0) > 0) return false;
          if (selectedMedia === 'video_news' && !l.hasVideo && (l.videoCount || 0) <= 0) return false;
        }

        if (listingTypeFilter !== 'all' && l.listingType !== listingTypeFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'words_desc') return (b.wordCount || 0) - (a.wordCount || 0);
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
  }, [
    listings,
    searchQuery,
    activeCategory,
    selectedLanguage,
    selectedStoryType,
    selectedMedia,
    listingTypeFilter,
    sortBy,
  ]);

  const activeAdvancedFilterCount = [
    selectedStoryType !== 'all',
    selectedMedia !== 'all',
    listingTypeFilter !== 'all',
  ].filter(Boolean).length;

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    activeCategory !== 'all' ||
    selectedLanguage !== 'all' ||
    activeAdvancedFilterCount > 0 ||
    sortBy !== 'latest';

  const resetFilters = () => {
    setSearchQuery('');
    setActiveCategory('all');
    setSelectedLanguage('all');
    setSelectedStoryType('all');
    setSelectedMedia('all');
    setListingTypeFilter('all');
    setSortBy('latest');
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Marketplace"
        subtitle="Browse verified reporter dispatches and subscriber-included wire stories by language and category."
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {isPlatformAdmin && (
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => navigateTo('/admin/wire-feeds')}
              >
                Wire Feeds
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => navigateTo('/marketplace/licensed')}
            >
              Purchased
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => navigateTo('/marketplace/my-listings')}
            >
              Sell Story
            </Button>
          </div>
        }
      />

      {/* Compact Search, Language & Category Filter Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#242629] border border-[#e0e3e7] dark:border-[#3c4043] space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex-1">
            <Input
              placeholder="Search headline, district, or reporter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`min-h-[44px] sm:min-h-[40px] px-3.5 rounded-xl border text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                showFilters || activeAdvancedFilterCount > 0
                  ? 'border-[#1a73e8] bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#1a73e8]/15 dark:text-[#8ab4f8]'
                  : 'border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#1b1c1f] text-[#3c4043] dark:text-[#e8eaed] hover:bg-[#f8f9fa] dark:hover:bg-[#2f3136]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters{activeAdvancedFilterCount > 0 ? ` (${activeAdvancedFilterCount})` : ''}</span>
            </button>

            <select
              aria-label="Sort stories"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="min-h-[44px] sm:min-h-[40px] px-3 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#1b1c1f] text-xs font-medium text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:border-[#1a73e8] cursor-pointer"
            >
              <option value="latest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="words_desc">Longest</option>
            </select>
          </div>
        </div>

        {/* Primary Language Rail */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {LANGUAGE_FILTER_OPTIONS.map((lang) => {
            const active = selectedLanguage.toLowerCase() === lang.id.toLowerCase();
            return (
              <button
                key={lang.id}
                type="button"
                onClick={() => setSelectedLanguage(lang.id)}
                className={`min-h-[34px] px-3 text-xs rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                  active
                    ? 'border-[#1a73e8] bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#173054] dark:text-[#8ab4f8] dark:border-[#8ab4f8]/40 font-semibold'
                    : 'border-[#e0e3e7] dark:border-[#3c4043] bg-white dark:bg-[#1b1c1f] text-[#3c4043] dark:text-[#bdc1c6] hover:bg-[#f8f9fa] dark:hover:bg-[#2f3136] font-medium'
                }`}
              >
                {lang.label}
              </button>
            );
          })}
        </div>

        {/* Category Rail */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {categories.map((cat) => {
            const active = activeCategory.toLowerCase() === cat.id.toLowerCase();
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`min-h-[36px] px-3 text-xs rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#1a73e8] text-white font-semibold'
                    : 'bg-[#f1f3f4] dark:bg-[#1b1c1f] text-[#3c4043] dark:text-[#bdc1c6] hover:bg-[#e8eaed] dark:hover:bg-[#2f3136] font-medium'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Collapsible Secondary Filters */}
        {showFilters && (
          <div className="pt-3 border-t border-[#eceff1] dark:border-[#3c4043] grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <select
              aria-label="Story type"
              value={selectedStoryType}
              onChange={(e) => setSelectedStoryType(e.target.value)}
              className="min-h-[42px] sm:min-h-[38px] px-3 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#1b1c1f] text-xs font-medium text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:border-[#1a73e8] cursor-pointer"
            >
              {STORY_TYPE_FILTER_OPTIONS.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Media assets"
              value={selectedMedia}
              onChange={(e) => setSelectedMedia(e.target.value)}
              className="min-h-[42px] sm:min-h-[38px] px-3 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#1b1c1f] text-xs font-medium text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:border-[#1a73e8] cursor-pointer"
            >
              {MEDIA_FILTER_OPTIONS.map((med) => (
                <option key={med.id} value={med.id}>
                  {med.label}
                </option>
              ))}
            </select>

            <select
              aria-label="License tier"
              value={listingTypeFilter}
              onChange={(e) => setListingTypeFilter(e.target.value as typeof listingTypeFilter)}
              className="min-h-[42px] sm:min-h-[38px] px-3 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#1b1c1f] text-xs font-medium text-[#202124] dark:text-[#e8eaed] focus:outline-none focus:border-[#1a73e8] cursor-pointer"
            >
              <option value="all">All Tiers</option>
              <option value="EXCLUSIVE">Exclusive</option>
              <option value="PREMIUM">Premium</option>
              <option value="STANDARD">Standard</option>
            </select>
          </div>
        )}

        {/* Compact Status & Pack Units Line */}
        <div className="pt-2.5 border-t border-[#eceff1] dark:border-[#3c4043] flex items-center justify-between gap-2 text-xs text-[#5f6368] dark:text-[#9aa0a6] flex-wrap">
          <div className="flex items-center gap-2 tabular-nums">
            <span>
              <strong className="text-[#202124] dark:text-white font-semibold">{filteredListings.length}</strong> of {listings.length} stories
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-[#1a73e8] dark:text-[#8ab4f8] font-medium hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          {currentTenant && (
            <div className="inline-flex items-center gap-1.5 tabular-nums">
              <Package className="w-3.5 h-3.5 text-[#1a73e8] dark:text-[#8ab4f8]" />
              <span>
                Pack units:{' '}
                <strong className="text-[#202124] dark:text-white font-semibold">
                  {entitlement?.remainingUnits || 0}
                </strong>
                /{entitlement?.totalUnits || 0}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Dispatches Feed */}
      {filteredListings.length === 0 ? (
        <div className="text-center py-12 px-5 rounded-2xl border border-dashed border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#242629]">
          <Newspaper className="w-9 h-9 mx-auto text-[#9aa0a6] mb-2.5 stroke-1.5" />
          <h4 className="text-sm font-semibold text-[#202124] dark:text-white">No stories match your filters</h4>
          <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-1">
            Adjust your search or clear active filters.
          </p>
          {hasActiveFilters && (
            <div className="mt-4">
              <Button variant="secondary" size="sm" onClick={resetFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredListings.map((item) => (
            <MarketplaceStoryCard
              key={item.listingId}
              listing={item}
              viewMode="list"
              onSelect={(l) => setSelectedListing(l)}
              onViewDetail={handleViewDetail}
            />
          ))}
        </div>
      )}

      {/* Purchase Modal */}
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
