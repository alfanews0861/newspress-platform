/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MarketplaceSearchPage Component
 * Route: /marketplace/search
 * Phase 12 — Public Marketplace, Publisher Acquisition Portal & Licensed Content Workspace
 */

import React, { useState, useEffect } from 'react';
import { Search, Filter, SlidersHorizontal, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { MarketplaceStoryCard } from '../../components/marketplace/MarketplaceStoryCard';
import { MarketplacePurchaseModal } from '../../components/marketplace/MarketplacePurchaseModal';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import {
  marketplaceSearchService,
  MarketplaceSearchQuery,
  MarketplaceSearchResult
} from '../../services/marketplaceSearchService';
import { MarketplaceListing, LicenseType, ListingType } from '../../types/marketplace';

export const MarketplaceSearchPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  // Parse initial query params from URL hash
  const getInitialQueryFromHash = (): string => {
    const hash = window.location.hash;
    const match = hash.match(/[?&]q=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  };

  const [keywords, setKeywords] = useState<string>(getInitialQueryFromHash());
  const [category, setCategory] = useState<string>('all');
  const [district, setDistrict] = useState<string>('all');
  const [listingType, setListingType] = useState<string>('all');
  const [licenseType, setLicenseType] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [premiumOnly, setPremiumOnly] = useState<boolean>(false);
  const [exclusiveOnly, setExclusiveOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'latest' | 'relevance' | 'price_asc' | 'price_desc'>('latest');
  const [page, setPage] = useState<number>(1);

  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [searchResult, setSearchResult] = useState<MarketplaceSearchResult>({
    items: [],
    total: 0,
    page: 1,
    limit: 6,
    totalPages: 1
  });

  const executeSearch = () => {
    const query: MarketplaceSearchQuery = {
      keywords,
      category,
      district,
      listingType: listingType as ListingType | 'all',
      licenseType: licenseType as LicenseType | 'all',
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      premiumOnly,
      exclusiveOnly,
      sortBy,
      page,
      limit: 6,
      buyerTenantId: currentTenant?.tenantId
    };

    const result = marketplaceSearchService.searchListings(query);
    setSearchResult(result);
  };

  useEffect(() => {
    executeSearch();
  }, [
    keywords,
    category,
    district,
    listingType,
    licenseType,
    minPrice,
    maxPrice,
    premiumOnly,
    exclusiveOnly,
    sortBy,
    page,
    currentTenant
  ]);

  const handleResetFilters = () => {
    setKeywords('');
    setCategory('all');
    setDistrict('all');
    setListingType('all');
    setLicenseType('all');
    setMinPrice('');
    setMaxPrice('');
    setPremiumOnly(false);
    setExclusiveOnly(false);
    setSortBy('latest');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace Advanced Search & Discovery"
        subtitle="Search and filter verified news dispatches across beats, districts, pricing models, and legal syndication rights."
        breadcrumbs={[
          { label: 'Marketplace', href: '#/marketplace' },
          { label: 'Search' }
        ]}
      />

      {/* Filter Control Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <Input
              placeholder="Search headline, reporter, keywords..."
              value={keywords}
              onChange={(e) => {
                setKeywords(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div className="w-full md:w-48">
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              options={[
                { value: 'latest', label: 'Latest First' },
                { value: 'relevance', label: 'Most Relevant' },
                { value: 'price_asc', label: 'Price: Low to High' },
                { value: 'price_desc', label: 'Price: High to Low' },
              ]}
            />
          </div>

          <Button variant="secondary" onClick={handleResetFilters} size="sm" className="shrink-0">
            <RefreshCw className="w-4 h-4 mr-1.5" /> Reset Filters
          </Button>
        </div>

        {/* Granular Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 font-sans block mb-1">Beat / Category:</label>
            <Select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              options={[
                { value: 'all', label: 'All Beats' },
                { value: 'Public Works', label: 'Public Works' },
                { value: 'Agriculture & Transit', label: 'Agriculture' },
                { value: 'Investigative & Infrastructure', label: 'Investigative' },
                { value: 'Investigation', label: 'Investigation' },
              ]}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 font-sans block mb-1">District:</label>
            <Select
              value={district}
              onChange={(e) => { setDistrict(e.target.value); setPage(1); }}
              options={[
                { value: 'all', label: 'All Districts' },
                { value: 'Nellore District', label: 'Nellore' },
                { value: 'Regional', label: 'Regional' },
              ]}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 font-sans block mb-1">Listing Type:</label>
            <Select
              value={listingType}
              onChange={(e) => { setListingType(e.target.value); setPage(1); }}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'STANDARD', label: 'STANDARD' },
                { value: 'PREMIUM', label: 'PREMIUM' },
                { value: 'EXCLUSIVE', label: 'EXCLUSIVE' },
              ]}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 font-sans block mb-1">License Scope:</label>
            <Select
              value={licenseType}
              onChange={(e) => { setLicenseType(e.target.value); setPage(1); }}
              options={[
                { value: 'all', label: 'All License Types' },
                { value: 'DIGITAL_ONLY', label: 'DIGITAL_ONLY' },
                { value: 'PRINT_ONLY', label: 'PRINT_ONLY' },
                { value: 'DIGITAL_AND_PRINT', label: 'DIGITAL_AND_PRINT' },
                { value: 'EXCLUSIVE', label: 'EXCLUSIVE' },
              ]}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 font-sans block mb-1">Min Price (₹):</label>
            <Input
              type="number"
              placeholder="Min ₹"
              value={minPrice}
              onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 font-sans block mb-1">Max Price (₹):</label>
            <Input
              type="number"
              placeholder="Max ₹"
              value={maxPrice}
              onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-sans">
        <span>
          Found <strong className="text-blue-600 dark:text-blue-400 font-semibold">{searchResult.total}</strong> verified news items
        </span>
        <span>
          Page {searchResult.page} of {searchResult.totalPages}
        </span>
      </div>

      {/* Results Cards Grid */}
      {searchResult.items.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <SlidersHorizontal className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white font-sans">No Dispatches Match Selected Filters</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-sans">
            Try broadening your search keywords, price constraints, or selecting 'All Beats'.
          </p>
          <Button variant="secondary" size="sm" onClick={handleResetFilters}>
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {searchResult.items.map(({ listing, purchaseState }) => (
            <MarketplaceStoryCard
              key={listing.listingId}
              listing={listing}
              purchaseState={purchaseState}
              onSelect={(l) => setSelectedListing(l)}
              onViewDetail={(id) => (window.location.hash = `#/marketplace/story/${id}`)}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {searchResult.totalPages > 1 && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous Page
          </Button>

          <span className="text-xs font-sans text-slate-500 dark:text-slate-400">
            Page {searchResult.page} / {searchResult.totalPages}
          </span>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.min(searchResult.totalPages, p + 1))}
            disabled={page >= searchResult.totalPages}
          >
            Next Page <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
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
          onSuccess={() => executeSearch()}
        />
      )}
    </div>
  );
};
