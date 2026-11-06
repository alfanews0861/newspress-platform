/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 13 — Mobile Marketplace Screen
 * Lightweight mobile marketplace wire browsing, syndicated story previews,
 * license status check, and quick addition to today's print edition.
 */

import React, { useState } from 'react';
import { ShoppingCart, Search, Filter, ShieldCheck, Check, Sparkles, Newspaper, ExternalLink } from 'lucide-react';
import { marketplaceService } from '../../services/marketplaceService';
import { marketplaceSearchService } from '../../services/marketplaceSearchService';
import { MarketplaceListing } from '../../types/marketplace';
import { useTenant } from '../../hooks/useTenant';

export const MobileMarketplaceScreen: React.FC = () => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.tenantId || 'tenant-metro-chronicle';

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  const searchResults = marketplaceSearchService.searchListings({
    keywords: searchQuery || undefined,
  });

  const listings = searchResults.items.map((i) => i.listing);

  const handleAddToEdition = (listing: MarketplaceListing) => {
    setAddedMessage(`Story "${listing.title.slice(0, 25)}..." queued for today's print edition!`);
    setTimeout(() => setAddedMessage(null), 3000);
  };

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-sky-400" />
            <span>Marketplace Syndication Wire</span>
          </h2>
          <p className="text-xs text-slate-400">Acquire accredited articles & investigative pieces</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by topic, beat, keyword..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
        />
      </div>

      {addedMessage && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center space-x-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{addedMessage}</span>
        </div>
      )}

      {/* Listings Wire */}
      <div className="space-y-3">
        {listings.map((item) => (
          <div
            key={item.listingId}
            className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 hover:border-slate-700 transition"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1 pr-2">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                    {item.category}
                  </span>
                  <span className="text-[10px] text-slate-400">• {item.wordCount} words</span>
                </div>
                <h3 className="font-bold text-sm text-slate-100">{item.title}</h3>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-amber-400">
                  {item.currency} {item.price.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-400">Licensed</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              {item.shortDescription}
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
              <span className="flex items-center space-x-1 text-emerald-400 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{item.originalityStatus}</span>
              </span>

              <button
                type="button"
                onClick={() => handleAddToEdition(item)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold rounded-lg text-xs transition"
              >
                <Newspaper className="w-3.5 h-3.5" />
                <span>Add to Edition</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
