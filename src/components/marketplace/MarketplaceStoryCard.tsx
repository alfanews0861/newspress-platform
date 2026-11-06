/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MarketplaceStoryCard Component
 * Phase 12 — Public Marketplace, Publisher Acquisition Portal & Licensed Content Workspace
 */

import React from 'react';
import { Camera, Lock, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { MarketplaceListing, LicenseType } from '../../types/marketplace';
import { PurchaseState } from '../../services/marketplaceSearchService';
import { formatINR, formatDate } from '../../utils/formatters';

interface MarketplaceStoryCardProps {
  listing: MarketplaceListing;
  purchaseState?: PurchaseState;
  onSelect?: (listing: MarketplaceListing) => void;
  onViewDetail?: (listingId: string) => void;
  showDetailLink?: boolean;
}

export const MarketplaceStoryCard: React.FC<MarketplaceStoryCardProps> = ({
  listing,
  purchaseState = 'AVAILABLE',
  onSelect,
  onViewDetail,
  showDetailLink = true
}) => {
  const isExclusive = listing.listingType === 'EXCLUSIVE';
  const isPremium = listing.listingType === 'PREMIUM' || listing.listingType === 'INVESTIGATION';

  return (
    <div
      className={`p-5 rounded-xl border flex flex-col justify-between transition-all space-y-4 font-sans bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 ${
        isExclusive
          ? 'border-t-3 border-t-rose-500 border-x-slate-200 border-b-slate-200 dark:border-x-slate-800 dark:border-b-slate-800'
          : isPremium
          ? 'border-t-3 border-t-amber-500 border-x-slate-200 border-b-slate-200 dark:border-x-slate-800 dark:border-b-slate-800'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="space-y-3">
        {/* Header Metadata */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-sans flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                isExclusive
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                  : isPremium
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
              }`}
            >
              {listing.listingType}
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{listing.category}</span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <span>{listing.district || 'Regional'}</span>
          </div>

          {/* Purchase State Badge */}
          <div>
            {purchaseState === 'OWNED' && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Owned / Licensed
              </span>
            )}
            {purchaseState === 'SUBSCRIPTION_AVAILABLE' && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Pack Unit Redeemable
              </span>
            )}
            {purchaseState === 'LICENSE_EXPIRED' && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800/60">
                <Clock className="w-3 h-3 text-rose-600 dark:text-rose-400" /> License Expired
              </span>
            )}
            {purchaseState === 'NOT_AVAILABLE' && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                <AlertTriangle className="w-3 h-3" /> Withdrawn
              </span>
            )}
          </div>
        </div>

        {/* Headline */}
        <h3
          onClick={() => onViewDetail && onViewDetail(listing.listingId)}
          className={`text-base font-semibold text-slate-900 dark:text-white font-sans leading-snug ${
            onViewDetail ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors' : ''
          }`}
        >
          {listing.title}
        </h3>

        {/* Summary */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 font-sans">
          {listing.shortDescription}
        </p>

        {/* Details line */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-sans pt-1 flex-wrap">
          <span>{listing.wordCount || 500} words</span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
          <span>Published {formatDate(listing.publishedAt)}</span>
          {listing.hasPhotography && (
            <>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                <Camera className="w-3.5 h-3.5" /> {listing.photoCount || 1} High-Res Images
              </span>
            </>
          )}
        </div>

        {/* Rights tags */}
        <div className="pt-2">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1.5 font-sans">
            Available License Rights:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {listing.licenseOptions.map(lic => (
              <span
                key={lic}
                className="text-[11px] font-sans px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap"
              >
                {lic.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer: Byline, Price & Action */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 font-sans">
        <div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Byline:</span>
          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[160px] block">
            {listing.reporterByline || listing.reporterName || 'Correspondent'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-lg font-bold font-sans text-slate-900 dark:text-white">
              {formatINR(listing.price)}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">
              {purchaseState === 'SUBSCRIPTION_AVAILABLE' ? 'or 1 pack unit' : 'cash / invoice'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {showDetailLink && onViewDetail && (
              <button
                type="button"
                onClick={() => onViewDetail(listing.listingId)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Inspect
              </button>
            )}

            {onSelect && (
              <button
                type="button"
                onClick={() => onSelect(listing)}
                disabled={purchaseState === 'NOT_AVAILABLE'}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {purchaseState === 'OWNED' ? 'View License' : 'Acquire Rights'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
