/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Marketplace Search Service
 * Phase 12 — Public Marketplace, Publisher Acquisition Portal & Licensed Content Workspace
 */

import { MarketplaceListing, LicenseType, ListingType, PricingModel } from '../types/marketplace';
import { marketplaceService } from './marketplaceService';

export interface MarketplaceSearchQuery {
  keywords?: string;
  category?: string;
  district?: string;
  state?: string;
  reporterId?: string;
  sourceTenantId?: string;
  listingType?: ListingType | 'all';
  licenseType?: LicenseType | 'all';
  minPrice?: number;
  maxPrice?: number;
  premiumOnly?: boolean;
  exclusiveOnly?: boolean;
  startDate?: string;
  endDate?: string;
  sortBy?: 'latest' | 'relevance' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
  buyerTenantId?: string;
}

export type PurchaseState =
  | 'AVAILABLE'
  | 'OWNED'
  | 'SUBSCRIPTION_AVAILABLE'
  | 'LICENSE_EXPIRED'
  | 'NOT_AVAILABLE';

export interface SearchResultItem {
  listing: MarketplaceListing;
  purchaseState: PurchaseState;
  relevanceScore?: number;
}

export interface MarketplaceSearchResult {
  items: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class MarketplaceSearchService {
  /**
   * Executes paginated, filtered search over marketplace listings.
   */
  public searchListings(query: MarketplaceSearchQuery): MarketplaceSearchResult {
    const {
      keywords,
      category,
      district,
      state,
      reporterId,
      sourceTenantId,
      listingType,
      licenseType,
      minPrice,
      maxPrice,
      premiumOnly,
      exclusiveOnly,
      startDate,
      endDate,
      sortBy = 'latest',
      page = 1,
      limit = 12,
      buyerTenantId
    } = query;

    // 1. Fetch active listings
    let allListings = marketplaceService.getListings({ status: 'ACTIVE' });

    // 2. Filter out non-eligible or non-active
    allListings = allListings.filter(l => l.status === 'ACTIVE' && l.price > 0);

    // Filter by listing type
    if (listingType && listingType !== 'all') {
      allListings = allListings.filter(l => l.listingType === listingType);
    }

    if (premiumOnly) {
      allListings = allListings.filter(l => l.listingType === 'PREMIUM' || l.listingType === 'INVESTIGATION');
    }

    if (exclusiveOnly) {
      allListings = allListings.filter(l => l.listingType === 'EXCLUSIVE');
    }

    // Filter by license type
    if (licenseType && licenseType !== 'all') {
      allListings = allListings.filter(l => l.licenseOptions.includes(licenseType as LicenseType));
    }

    // Filter by category
    if (category && category !== 'all') {
      allListings = allListings.filter(l => l.category.toLowerCase() === category.toLowerCase());
    }

    // Filter by location
    if (district && district !== 'all') {
      allListings = allListings.filter(l => l.district?.toLowerCase() === district.toLowerCase());
    }

    if (state && state !== 'all') {
      allListings = allListings.filter(l => l.state?.toLowerCase() === state.toLowerCase());
    }

    // Filter by reporter / source
    if (reporterId) {
      allListings = allListings.filter(l => l.reporterId === reporterId);
    }

    if (sourceTenantId) {
      allListings = allListings.filter(l => l.sourceTenantId === sourceTenantId);
    }

    // Filter by price range
    if (minPrice !== undefined) {
      allListings = allListings.filter(l => l.price >= minPrice);
    }

    if (maxPrice !== undefined) {
      allListings = allListings.filter(l => l.price <= maxPrice);
    }

    // Date range
    if (startDate) {
      const start = new Date(startDate).getTime();
      allListings = allListings.filter(l => new Date(l.publishedAt).getTime() >= start);
    }

    if (endDate) {
      const end = new Date(endDate).getTime();
      allListings = allListings.filter(l => new Date(l.publishedAt).getTime() <= end);
    }

    // Keyword relevance scoring
    let scoredItems: { listing: MarketplaceListing; score: number }[] = [];
    const qLower = keywords?.trim().toLowerCase() || '';

    if (qLower) {
      const terms = qLower.split(/\s+/);
      for (const listing of allListings) {
        let score = 0;
        const titleLower = listing.title.toLowerCase();
        const descLower = listing.shortDescription.toLowerCase();
        const reporterLower = (listing.reporterByline || '').toLowerCase();
        const catLower = listing.category.toLowerCase();

        for (const term of terms) {
          if (titleLower.includes(term)) score += 10;
          if (descLower.includes(term)) score += 5;
          if (reporterLower.includes(term)) score += 3;
          if (catLower.includes(term)) score += 4;
        }

        if (score > 0) {
          scoredItems.push({ listing, score });
        }
      }
    } else {
      scoredItems = allListings.map(listing => ({ listing, score: 1 }));
    }

    // Sort order
    if (sortBy === 'relevance' && qLower) {
      scoredItems.sort((a, b) => b.score - a.score);
    } else if (sortBy === 'price_asc') {
      scoredItems.sort((a, b) => a.listing.price - b.listing.price);
    } else if (sortBy === 'price_desc') {
      scoredItems.sort((a, b) => b.listing.price - a.listing.price);
    } else {
      // Default: latest
      scoredItems.sort(
        (a, b) => new Date(b.listing.publishedAt).getTime() - new Date(a.listing.publishedAt).getTime()
      );
    }

    const total = scoredItems.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const pageItems = scoredItems.slice(startIndex, startIndex + limit);

    // Derive purchase state for each item if buyer tenant provided
    const tenantLicenses = buyerTenantId ? marketplaceService.getLicenses(buyerTenantId) : [];
    const tenantEntitlement = buyerTenantId ? marketplaceService.getTenantEntitlement(buyerTenantId) : undefined;

    const items: SearchResultItem[] = pageItems.map(({ listing, score }) => {
      let state: PurchaseState = 'AVAILABLE';

      if (buyerTenantId) {
        const activeLicense = tenantLicenses.find(
          lic => lic.listingId === listing.listingId && lic.buyerTenantId === buyerTenantId && lic.status === 'ACTIVE'
        );
        const expiredLicense = tenantLicenses.find(
          lic => lic.listingId === listing.listingId && lic.buyerTenantId === buyerTenantId && lic.status === 'EXPIRED'
        );

        if (activeLicense) {
          state = 'OWNED';
        } else if (expiredLicense) {
          state = 'LICENSE_EXPIRED';
        } else if (
          listing.listingType === 'STANDARD' &&
          tenantEntitlement &&
          tenantEntitlement.status === 'active' &&
          tenantEntitlement.remainingUnits > 0
        ) {
          state = 'SUBSCRIPTION_AVAILABLE';
        }
      }

      if (listing.availability === 'WITHDRAWN' || listing.availability === 'ARCHIVED') {
        state = 'NOT_AVAILABLE';
      }

      return {
        listing,
        purchaseState: state,
        relevanceScore: score
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages
    };
  }
}

export const marketplaceSearchService = new MarketplaceSearchService();
