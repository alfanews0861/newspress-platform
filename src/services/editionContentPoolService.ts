/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 9 — Edition Content Pool Service
 * Aggregates, validates, and filters newsroom stories, freelance contributions, and marketplace acquisitions.
 */

import { NewsArticle } from '../types/news';
import { NewsLicense } from '../types/marketplace';
import {
  ContentPoolStory,
  EditionContentSourceType,
  EditionStoryPriority,
} from '../types/editionWorkflow';
import { EditionContentEligibilityService } from './editionContentEligibilityService';

export interface ContentPoolFilterOptions {
  searchQuery?: string;
  sourceType?: EditionContentSourceType;
  section?: string;
  priority?: EditionStoryPriority;
  desk?: string;
  reporterId?: string;
  onlyEligible?: boolean;
  hasImage?: boolean;
  minOriginality?: number;
}

export class EditionContentPoolService {
  /**
   * Determine the concrete source type for an article in tenant context.
   */
  public static resolveSourceType(
    tenantId: string,
    article: NewsArticle,
    license?: NewsLicense
  ): EditionContentSourceType {
    if (license || article.isMarketplaceSyndicated || article.tenantId !== tenantId) {
      return 'MARKETPLACE_PURCHASE';
    }

    if (article.category?.toLowerCase().includes('editorial') || article.category?.toLowerCase().includes('opinion')) {
      return 'EDITORIAL';
    }

    if (article.byline?.toLowerCase().includes('agency') || article.byline?.toLowerCase().includes('reuters') || article.byline?.toLowerCase().includes('pti')) {
      return 'AGENCY';
    }

    if (article.reporterType === 'freelance') {
      return 'FREELANCE_REPORTER';
    }

    if (article.tenantId === tenantId) {
      return 'STAFF_REPORTER';
    }

    return 'IN_HOUSE';
  }

  /**
   * Generates proper attribution and reporter credit line.
   */
  public static resolveAttribution(
    article: NewsArticle,
    sourceType: EditionContentSourceType,
    license?: NewsLicense
  ): {
    creditLine: string;
    sourceType: EditionContentSourceType;
    reporterName?: string;
    agencyName?: string;
    isDerivativeAllowed: boolean;
  } {
    let creditLine = article.byline || 'By Staff Reporter';
    let isDerivativeAllowed = true;

    if (license) {
      if (license.attributionRequirement) {
        creditLine = `${article.byline || 'Syndicated Dispatch'} / ${license.sellerTenantId || 'Marketplace Syndicate'}`;
      }
      isDerivativeAllowed = license.allowDerivativeEditing !== false;
    } else if (sourceType === 'STAFF_REPORTER') {
      creditLine = article.byline ? `By ${article.byline}` : 'By Staff Reporter';
    } else if (sourceType === 'FREELANCE_REPORTER') {
      creditLine = article.byline ? `By ${article.byline} (Special to the News)` : 'Special Correspondent';
    }

    return {
      creditLine,
      sourceType,
      reporterName: article.byline,
      isDerivativeAllowed,
    };
  }

  /**
   * Aggregates and verifies stories from newsroom and marketplace.
   */
  public static aggregateContentPool(
    tenantId: string,
    articles: NewsArticle[],
    licenses: NewsLicense[] = [],
    filter?: ContentPoolFilterOptions
  ): ContentPoolStory[] {
    const pool: ContentPoolStory[] = [];

    for (const article of articles) {
      // Find matching license if foreign article
      const license = licenses.find(
        (lic) =>
          lic.buyerTenantId === tenantId &&
          lic.newsId === article.articleId &&
          lic.status === 'ACTIVE'
      );

      // Check eligibility using Phase 3 / Phase 8 eligibility engine
      const eligibility = EditionContentEligibilityService.checkArticleEligibility(
        tenantId,
        article,
        licenses
      );

      const sourceType = this.resolveSourceType(tenantId, article, license);
      const attribution = this.resolveAttribution(article, sourceType, license);

      // Determine default placement priority (editorial decision decoupled from originality score)
      let suggestedPriority: EditionStoryPriority = 'STANDARD';
      if (article.isBreaking) {
        suggestedPriority = 'FRONT_PAGE_LEAD';
      } else if (article.wordCount < 150) {
        suggestedPriority = 'BRIEF';
      } else if (article.wordCount > 1000) {
        suggestedPriority = 'FEATURE';
      } else if (article.originalityScore && article.originalityScore > 90 && article.wordCount > 600) {
        suggestedPriority = 'SECTION_LEAD';
      }

      const item: ContentPoolStory = {
        article,
        sourceType,
        isEligible: eligibility.isEligible,
        ineligibilityReason: eligibility.rejectionReason,
        suggestedPriority,
        suggestedSection: article.category,
        license,
        attribution,
      };

      // Apply filtering if provided
      if (filter) {
        if (filter.onlyEligible && !item.isEligible) continue;
        if (filter.sourceType && item.sourceType !== filter.sourceType) continue;
        if (filter.section && item.suggestedSection?.toLowerCase() !== filter.section.toLowerCase()) continue;
        if (filter.priority && item.suggestedPriority !== filter.priority) continue;
        if (filter.hasImage && !article.hasPhotography && !article.imageUrl) continue;
        if (filter.minOriginality && (article.originalityScore || 0) < filter.minOriginality) continue;
        if (filter.reporterId && article.authorId !== filter.reporterId && article.authorUserId !== filter.reporterId) continue;
        if (filter.searchQuery) {
          const q = filter.searchQuery.toLowerCase();
          const matchTitle = (article.title || article.headline || '').toLowerCase().includes(q);
          const matchByline = article.byline?.toLowerCase().includes(q);
          const matchSynopsis = (article.synopsis || article.summary || article.leadParagraph || '').toLowerCase().includes(q);
          if (!matchTitle && !matchByline && !matchSynopsis) continue;
        }
      }

      pool.push(item);
    }

    return pool;
  }
}
