/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MarketplaceStoryCard Component
 * Displays verified reporter and syndicated wire stories with lead photography,
 * clean unboxed metadata, and subscriber-included ₹0 claim support.
 */

import React, { useState } from 'react';
import { Camera, Video, CheckCircle2, Clock, AlertTriangle, Newspaper } from 'lucide-react';
import { MarketplaceListing } from '../../types/marketplace';
import { PurchaseState } from '../../services/marketplaceSearchService';
import { formatINR, formatDate } from '../../utils/formatters';
import { sanitizeImageUrl } from '../../utils/urlSafety';

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  te: 'Telugu',
  ta: 'Tamil',
  kn: 'Kannada',
  bn: 'Bengali',
  or: 'Odia',
  hi: 'Hindi',
  ml: 'Malayalam',
  mr: 'Marathi',
  gu: 'Gujarati',
  pa: 'Punjabi',
};

const STORY_TYPE_LABELS: Record<string, string> = {
  spot_news: 'Spot News',
  investigative: 'Investigative',
  general: 'Feature',
  editorial: 'Editorial',
  satirical: 'Satire',
  exclusive: 'Exclusive',
};

interface MarketplaceStoryCardProps {
  listing: MarketplaceListing;
  purchaseState?: PurchaseState;
  onSelect?: (listing: MarketplaceListing) => void;
  onViewDetail?: (listingId: string) => void;
  showDetailLink?: boolean;
  viewMode?: 'grid' | 'list';
}

export const MarketplaceStoryCard: React.FC<MarketplaceStoryCardProps> = ({
  listing,
  purchaseState = 'AVAILABLE',
  onSelect,
  onViewDetail,
  showDetailLink = true,
  viewMode = 'list',
}) => {
  const [imageError, setImageError] = useState(false);

  const isExclusive = listing.listingType === 'EXCLUSIVE';
  const isPremium = listing.listingType === 'PREMIUM' || listing.listingType === 'INVESTIGATION';
  const isSubscriberIncluded = Boolean(
    listing.includedInSubscription ||
      (listing.sourceType === 'WIRE_FEED' && listing.pricingModel === 'SUBSCRIPTION_ENTITLEMENT' && listing.price === 0)
  );
  const langLabel = listing.language ? LANGUAGE_LABELS[listing.language] || listing.language.toUpperCase() : null;
  const storyTypeLabel = listing.storyType ? STORY_TYPE_LABELS[listing.storyType] : null;
  const byline = listing.reporterByline || listing.reporterName || 'Syndication Desk';
  const safeImageUrl = sanitizeImageUrl(listing.featuredImageUrl);

  const statusIndicator = () => {
    if (purchaseState === 'OWNED') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#137333] dark:text-[#81c995] shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Owned
        </span>
      );
    }
    if (isSubscriberIncluded) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#137333] dark:text-[#81c995] shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Subscriber Included
        </span>
      );
    }
    if (purchaseState === 'SUBSCRIPTION_AVAILABLE') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#137333] dark:text-[#81c995] shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />
          1 Pack Unit
        </span>
      );
    }
    if (purchaseState === 'LICENSE_EXPIRED') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#c5221f] dark:text-[#f28b82] shrink-0">
          <Clock className="w-3.5 h-3.5" />
          Expired
        </span>
      );
    }
    if (purchaseState === 'NOT_AVAILABLE') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] shrink-0">
          <AlertTriangle className="w-3.5 h-3.5" />
          Withdrawn
        </span>
      );
    }
    if (isExclusive) {
      return (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#c5221f] dark:text-[#f28b82] shrink-0">
          Exclusive
        </span>
      );
    }
    if (isPremium) {
      return (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#b06000] dark:text-[#fdd663] shrink-0">
          Premium
        </span>
      );
    }
    return null;
  };

  const renderThumbnail = (containerClass: string) => {
    if (!safeImageUrl) return null;
    if (imageError) {
      return (
        <div
          className={`${containerClass} bg-[#f1f3f4] dark:bg-[#1b1c1f] border border-[#e0e3e7] dark:border-[#3c4043] flex flex-col items-center justify-center text-[#5f6368] dark:text-[#9aa0a6] p-2 text-center`}
        >
          <Newspaper className="w-5 h-5 mb-1 opacity-70" />
          <span className="text-[10px] font-medium line-clamp-1">{listing.category}</span>
        </div>
      );
    }
    return (
      <img
        src={safeImageUrl}
        alt={listing.imageCaption || listing.title}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setImageError(true)}
        className={`${containerClass} object-cover bg-[#f1f3f4] dark:bg-[#1b1c1f]`}
      />
    );
  };

  const priceBlock = (alignRight: boolean) => (
    <div className={alignRight ? 'md:text-right' : ''}>
      <div className="text-base sm:text-lg font-bold text-[#202124] dark:text-white tabular-nums">
        {isSubscriberIncluded ? 'Included' : formatINR(listing.price)}
      </div>
      <div className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
        {isSubscriberIncluded
          ? 'Free for subscribers'
          : purchaseState === 'SUBSCRIPTION_AVAILABLE'
          ? 'or 1 pack unit'
          : 'Single license'}
      </div>
    </div>
  );

  const primaryActionLabel =
    purchaseState === 'OWNED'
      ? 'View License'
      : isSubscriberIncluded
      ? 'Claim Story'
      : 'Buy Rights';

  if (viewMode === 'list') {
    return (
      <article className="p-4 rounded-2xl border border-[#e0e3e7] dark:border-[#3c4043] bg-white dark:bg-[#242629] hover:border-[#bdc1c6] dark:hover:border-[#5f6368] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
        {safeImageUrl && (
          <div
            onClick={() => onViewDetail && onViewDetail(listing.listingId)}
            className={onViewDetail ? 'cursor-pointer shrink-0' : 'shrink-0'}
          >
            {renderThumbnail('w-full md:w-36 h-44 md:h-24 rounded-xl')}
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Unboxed metadata row */}
          <div className="flex items-center justify-between gap-2 text-xs text-[#5f6368] dark:text-[#9aa0a6]">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="font-semibold text-[#1a73e8] dark:text-[#8ab4f8]">{listing.category}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{listing.district || listing.state || 'Regional'}</span>
              {langLabel && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{langLabel}</span>
                </>
              )}
              {storyTypeLabel && (
                <>
                  <span aria-hidden="true" className="hidden sm:inline">·</span>
                  <span className="hidden sm:inline">{storyTypeLabel}</span>
                </>
              )}
            </div>
            {statusIndicator()}
          </div>

          {/* Headline */}
          <h3
            onClick={() => onViewDetail && onViewDetail(listing.listingId)}
            className={`text-[15px] sm:text-base font-semibold text-[#202124] dark:text-[#f8f9fa] leading-snug line-clamp-2 ${
              onViewDetail ? 'cursor-pointer hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors' : ''
            }`}
          >
            {listing.title}
          </h3>

          {/* Concise summary */}
          <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] leading-relaxed line-clamp-1 sm:line-clamp-2">
            {listing.shortDescription}
          </p>

          {/* Footer metadata */}
          <div className="flex items-center gap-2 text-xs text-[#5f6368] dark:text-[#9aa0a6] flex-wrap pt-0.5 tabular-nums">
            <span className="font-medium text-[#3c4043] dark:text-[#e8eaed] truncate max-w-[180px]">{byline}</span>
            <span aria-hidden="true">·</span>
            <span>{listing.wordCount || 450} words</span>
            <span aria-hidden="true">·</span>
            <span>{formatDate(listing.publishedAt)}</span>
            {listing.hasVideo && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-[#1a73e8] dark:text-[#8ab4f8] font-medium">
                  <Video className="w-3.5 h-3.5" />
                  Video
                </span>
              </>
            )}
            {!listing.hasVideo && listing.hasPhotography && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-[#3c4043] dark:text-[#bdc1c6]">
                  <Camera className="w-3.5 h-3.5" />
                  {listing.photoCount || 1} {listing.photoCount === 1 ? 'photo' : 'photos'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right / Bottom Price & Actions */}
        <div className="shrink-0 flex items-center md:flex-col md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-[#eceff1] dark:border-[#3c4043]">
          {priceBlock(true)}

          <div className="flex items-center gap-2">
            {showDetailLink && onViewDetail && (
              <button
                type="button"
                onClick={() => onViewDetail(listing.listingId)}
                className="min-h-[40px] sm:min-h-[36px] px-3 text-xs font-medium text-[#3c4043] dark:text-[#e8eaed] bg-[#f1f3f4] hover:bg-[#e8eaed] dark:bg-[#2f3136] dark:hover:bg-[#3c4043] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Preview
              </button>
            )}

            {onSelect && (
              <button
                type="button"
                onClick={() => onSelect(listing)}
                disabled={purchaseState === 'NOT_AVAILABLE'}
                className="min-h-[40px] sm:min-h-[36px] px-3.5 text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {primaryActionLabel}
              </button>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="p-4 sm:p-5 rounded-2xl border border-[#e0e3e7] dark:border-[#3c4043] bg-white dark:bg-[#242629] hover:border-[#bdc1c6] dark:hover:border-[#5f6368] transition-colors flex flex-col justify-between gap-4">
      <div className="space-y-2.5">
        {safeImageUrl && (
          <div
            onClick={() => onViewDetail && onViewDetail(listing.listingId)}
            className={onViewDetail ? 'cursor-pointer' : ''}
          >
            {renderThumbnail('w-full aspect-[4/3] rounded-xl')}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 text-xs text-[#5f6368] dark:text-[#9aa0a6]">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="font-semibold text-[#1a73e8] dark:text-[#8ab4f8]">{listing.category}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{listing.district || listing.state || 'Regional'}</span>
            {langLabel && (
              <>
                <span aria-hidden="true">·</span>
                <span>{langLabel}</span>
              </>
            )}
          </div>
          {statusIndicator()}
        </div>

        <h3
          onClick={() => onViewDetail && onViewDetail(listing.listingId)}
          className={`text-base font-semibold text-[#202124] dark:text-[#f8f9fa] leading-snug line-clamp-2 ${
            onViewDetail ? 'cursor-pointer hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors' : ''
          }`}
        >
          {listing.title}
        </h3>

        <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] leading-relaxed line-clamp-2">
          {listing.shortDescription}
        </p>

        <div className="flex items-center gap-2 text-xs text-[#5f6368] dark:text-[#9aa0a6] flex-wrap pt-0.5 tabular-nums">
          <span className="font-medium text-[#3c4043] dark:text-[#e8eaed] truncate max-w-[160px]">{byline}</span>
          <span aria-hidden="true">·</span>
          <span>{listing.wordCount || 450} words</span>
          <span aria-hidden="true">·</span>
          <span>{formatDate(listing.publishedAt)}</span>
        </div>
      </div>

      <div className="pt-3 border-t border-[#eceff1] dark:border-[#3c4043] flex items-center justify-between gap-3">
        {priceBlock(false)}

        <div className="flex items-center gap-2">
          {showDetailLink && onViewDetail && (
            <button
              type="button"
              onClick={() => onViewDetail(listing.listingId)}
              className="min-h-[40px] sm:min-h-[36px] px-3 text-xs font-medium text-[#3c4043] dark:text-[#e8eaed] bg-[#f1f3f4] hover:bg-[#e8eaed] dark:bg-[#2f3136] dark:hover:bg-[#3c4043] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Preview
            </button>
          )}

          {onSelect && (
            <button
              type="button"
              onClick={() => onSelect(listing)}
              disabled={purchaseState === 'NOT_AVAILABLE'}
              className="min-h-[40px] sm:min-h-[36px] px-3.5 text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {primaryActionLabel}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
