/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Marketplace Access Control & Public/Private Separation Service
 * Phase 12 — Public Marketplace, Publisher Acquisition Portal & Licensed Content Workspace
 */

import { MarketplaceListing } from '../types/marketplace';
import { marketplaceService } from './marketplaceService';

export interface PublicListingPreview {
  listingId: string;
  newsId: string;
  title: string;
  shortDescription: string;
  category: string;
  district?: string;
  state?: string;
  publishedAt: string;
  listingType: string;
  price: number;
  currency: string;
  licenseOptions: string[];
  reporterByline?: string;
  wordCount?: number;
  hasPhotography?: boolean;
  photoCount?: number;
  originalityStatus?: string;
}

export type ModerationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN' | 'EXPIRED';

export class MarketplaceAccessControlService {
  /**
   * Generates public-safe listing preview for unauthenticated or browsing users.
   * Strictly redacts private evidence, internal financial ledger info, and full body content.
   */
  public getPublicListingPreview(listingId: string): PublicListingPreview | undefined {
    const listing = marketplaceService.getListingById(listingId);
    if (!listing || listing.status !== 'ACTIVE') return undefined;

    return {
      listingId: listing.listingId,
      newsId: listing.newsId,
      title: listing.title,
      shortDescription: listing.shortDescription,
      category: listing.category,
      district: listing.district,
      state: listing.state,
      publishedAt: listing.publishedAt,
      listingType: listing.listingType,
      price: listing.price,
      currency: listing.currency,
      licenseOptions: listing.licenseOptions,
      reporterByline: listing.reporterByline,
      wordCount: listing.wordCount,
      hasPhotography: listing.hasPhotography,
      photoCount: listing.photoCount,
      originalityStatus: listing.originalityStatus
    };
  }

  /**
   * Updates moderation status of a listing (Admin only).
   */
  public moderateListing(params: {
    listingId: string;
    newStatus: ModerationStatus;
    reason: string;
    adminUserId: string;
  }): MarketplaceListing {
    const { listingId, newStatus, reason, adminUserId } = params;

    const listing = marketplaceService.getListingById(listingId);
    if (!listing) throw new Error('Listing not found');

    if (newStatus === 'ACTIVE') {
      listing.status = 'ACTIVE';
      listing.availability = 'AVAILABLE';
    } else if (newStatus === 'SUSPENDED') {
      listing.status = 'SUSPENDED';
    } else if (newStatus === 'WITHDRAWN') {
      listing.status = 'ARCHIVED';
      listing.availability = 'WITHDRAWN';
    } else if (newStatus === 'EXPIRED') {
      listing.status = 'ARCHIVED';
      listing.availability = 'ARCHIVED';
    }

    listing.updatedAt = new Date().toISOString();
    return listing;
  }
}

export const marketplaceAccessControlService = new MarketplaceAccessControlService();
