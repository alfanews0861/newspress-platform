/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Marketplace Content Workspace Service & Newsroom Adapter
 * Phase 12 — Public Marketplace, Publisher Acquisition Portal & Licensed Content Workspace
 */

import { NewsLicense, MarketplaceListing } from '../types/marketplace';
import { NewsArticle } from '../types/news';
import { marketplaceService } from './marketplaceService';

export interface LicensedWorkspaceItem {
  license: NewsLicense;
  listing?: MarketplaceListing;
  articlePreview: {
    headline: string;
    leadParagraph: string;
    byline: string;
    category: string;
    location?: string;
    sourceTenantName?: string;
    derivativeEditingAllowed: boolean;
    attributionRequired: boolean;
  };
  usageStatus: {
    status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'REVOKED' | 'CONSUMED' | 'PARTIALLY_CONSUMED';
    daysRemaining: number;
    usedInEditionsCount: number;
    linkedEditionCodes: string[];
  };
}

export interface EditorialDerivative {
  versionId: string;
  originalNewsId: string;
  originalByline: string;
  sourceOrganization?: string;
  licenseId: string;
  headline: string;
  bodyContent: string;
  isEdited: boolean;
  createdAt: string;
}

export class MarketplaceContentWorkspaceService {
  private editorialDerivatives: Map<string, EditorialDerivative[]> = new Map();

  /**
   * Retrieves all licensed stories for a publisher tenant formatted for workspace view.
   */
  public getLicensedWorkspaceItems(tenantId: string): LicensedWorkspaceItem[] {
    const purchased = marketplaceService.getPurchasedNewsForTenant(tenantId);
    const now = new Date();

    return purchased.map(({ license, listing }) => {
      const granted = new Date(license.grantedAt).getTime();
      const expires = license.expiresAt ? new Date(license.expiresAt).getTime() : granted + 365 * 24 * 60 * 60 * 1000;
      const msRemaining = expires - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

      let status: LicensedWorkspaceItem['usageStatus']['status'] = 'ACTIVE';
      if (license.status === 'EXPIRED' || daysRemaining <= 0) {
        status = 'EXPIRED';
      } else if (daysRemaining <= 7) {
        status = 'EXPIRING_SOON';
      } else if (license.status === 'REVOKED') {
        status = 'REVOKED';
      }

      // Check linked editions from marketplace service / edition service
      const linkedEditions = marketplaceService.getLinkedEditionsForLicense(license.licenseId) || [];
      if (linkedEditions.length > 0 && status === 'ACTIVE') {
        status = 'CONSUMED';
      }

      return {
        license,
        listing,
        articlePreview: {
          headline: license.articleTitle,
          leadParagraph: listing?.shortDescription || 'Licensed wire dispatch content.',
          byline: license.sellerReporterName || 'Correspondent',
          category: listing?.category || 'News',
          location: listing?.district,
          sourceTenantName: license.sourceTenantId,
          derivativeEditingAllowed: license.derivativeEditingAllowed ?? true,
          attributionRequired: license.attributionRequired ?? true
        },
        usageStatus: {
          status,
          daysRemaining,
          usedInEditionsCount: linkedEditions.length,
          linkedEditionCodes: linkedEditions
        }
      };
    });
  }

  /**
   * Creates an editorial derivative of a licensed marketplace article if permitted.
   * Preserves mandatory source attribution and original article reference.
   */
  public createEditorialDerivative(params: {
    tenantId: string;
    userId: string;
    licenseId: string;
    editedHeadline: string;
    editedBody: string;
  }): EditorialDerivative {
    const { tenantId, userId, licenseId, editedHeadline, editedBody } = params;

    const license = marketplaceService.getLicenseById(licenseId);
    if (!license) throw new Error('License not found');

    if (license.buyerTenantId !== tenantId) {
      throw new Error('Unauthorized: Tenant does not hold this license.');
    }

    if (license.status !== 'ACTIVE') {
      throw new Error(`Cannot create derivative version. License status is ${license.status}.`);
    }

    // Check Derivative Editing Permission Gate
    if (license.derivativeEditingAllowed === false) {
      throw new Error(
        'Derivative editing blocked by license terms. The licensor strictly requires verbatim publication without textual alteration.'
      );
    }

    const versionId = `deriv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const derivative: EditorialDerivative = {
      versionId,
      originalNewsId: license.newsId,
      originalByline: license.sellerReporterName || 'Original Author',
      sourceOrganization: license.sourceTenantId,
      licenseId,
      headline: editedHeadline,
      bodyContent: editedBody,
      isEdited: true,
      createdAt: new Date().toISOString()
    };

    const list = this.editorialDerivatives.get(license.newsId) || [];
    list.push(derivative);
    this.editorialDerivatives.set(license.newsId, list);

    return derivative;
  }

  /**
   * Adapts a licensed marketplace story into the newsroom submission format
   * without duplicating the original marketplace record.
   */
  public adaptToNewsroomStory(params: {
    licenseId: string;
    tenantId: string;
    userId: string;
  }): Partial<NewsArticle> {
    const { licenseId, tenantId, userId } = params;

    const license = marketplaceService.getLicenseById(licenseId);
    if (!license) throw new Error('License not found');

    if (license.buyerTenantId !== tenantId) {
      throw new Error('Unauthorized tenant access to license.');
    }

    const fullContent = marketplaceService.getAuthorizedStoryContent({
      newsId: license.newsId,
      requestingTenantId: tenantId,
      requestingUserId: userId
    });

    return {
      articleId: `syndicated_${license.newsId}`,
      tenantId,
      headline: fullContent.headline,
      leadParagraph: fullContent.leadParagraph,
      bodyContent: fullContent.bodyContent || fullContent.leadParagraph,
      byline: `${fullContent.byline} (${license.sourceTenantId || 'Syndicated Wire'})`,
      category: fullContent.category,
      district: fullContent.location,
      editorialStatus: 'approved', // Pre-approved syndicated content
      isMarketplaceListed: false,
      isMarketplaceEligible: false,
      publishedAt: license.grantedAt,
      createdAt: license.grantedAt,
      updatedAt: new Date().toISOString()
    };
  }
}

export const marketplaceContentWorkspaceService = new MarketplaceContentWorkspaceService();
