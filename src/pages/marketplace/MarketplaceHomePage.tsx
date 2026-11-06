/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MarketplaceHomePage Component
 * Route: /marketplace
 * Phase 12 — Public Marketplace, Publisher Acquisition Portal & Licensed Content Workspace
 */

import React, { useState, useEffect } from 'react';
import { Search, Sparkles, TrendingUp, Package, Shield, Layers, Filter } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MarketplaceStoryCard } from '../../components/marketplace/MarketplaceStoryCard';
import { MarketplacePurchaseModal } from '../../components/marketplace/MarketplacePurchaseModal';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { marketplaceService } from '../../services/marketplaceService';
import { MarketplaceListing, MarketplaceEntitlement } from '../../types/marketplace';

export const MarketplaceHomePage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
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
    if (searchQuery.trim()) {
      window.location.hash = `#/marketplace/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const handleViewDetail = (listingId: string) => {
    window.location.hash = `#/marketplace/story/${listingId}`;
  };

  const categories = [
    'all',
    'Public Works',
    'Agriculture & Transit',
    'Investigative & Infrastructure',
    'Investigation',
    'Politics',
    'Business',
    'Sports'
  ];

  const filteredListings = listings.filter(l => {
    if (activeCategory !== 'all' && l.category.toLowerCase() !== activeCategory.toLowerCase()) {
      return false;
    }
    return true;
  });

  const featuredListings = listings.filter(l => l.listingType === 'EXCLUSIVE' || l.listingType === 'PREMIUM');
  const standardListings = filteredListings.filter(l => l.listingType === 'STANDARD');

  return (
    <div className="space-y-8">
      <PageHeader
        title="NewsPress Syndication Wire & Public Marketplace"
        subtitle="B2B news acquisition platform for publishers. Discover, inspect, and license verified dispatches, investigations, and exclusive field reporting."
        breadcrumbs={[
          { label: 'Marketplace', href: '#/marketplace' },
          { label: 'Wire Discovery' }
        ]}
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
              onClick={() => (window.location.hash = '#/marketplace/search')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline flex items-center gap-1 font-medium"
            >
              <Filter className="w-3.5 h-3.5" /> Advanced Search & Filters →
            </button>
          </div>
        )}
      </div>

      {/* Category Rail (Segmented interactive buttons) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeCategory === cat
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
            }`}
          >
            {cat === 'all' ? 'All Dispatches' : cat}
          </button>
        ))}
      </div>

      {/* Featured & Exclusive Section */}
      {featuredListings.length > 0 && activeCategory === 'all' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white font-sans flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Exclusive Investigations & Premium Wire</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">
              Territorial rights & high-impact investigative packages
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {featuredListings.map((item) => (
              <MarketplaceStoryCard
                key={item.listingId}
                listing={item}
                onSelect={(l) => setSelectedListing(l)}
                onViewDetail={handleViewDetail}
              />
            ))}
          </div>
        </div>
      )}

      {/* Standard Dispatches Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white font-sans flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Latest Standard Dispatches</span>
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">
            Redeemable with monthly pack or individual invoice
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {standardListings.map((item) => (
            <MarketplaceStoryCard
              key={item.listingId}
              listing={item}
              onSelect={(l) => setSelectedListing(l)}
              onViewDetail={handleViewDetail}
            />
          ))}
        </div>
      </div>

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
