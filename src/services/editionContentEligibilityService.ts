/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Edition Content Eligibility & Legal Rights Verification Service
 * Guarantees that only organization-owned approved stories or actively licensed
 * marketplace news can be composed into a print newspaper edition.
 */

import { NewsArticle } from '../types/news';
import { NewsLicense } from '../types/marketplace';

export interface EligibilityResult {
  isEligible: boolean;
  sourceType: 'IN_HOUSE_APPROVED' | 'MARKETPLACE_LICENSED' | 'INELIGIBLE';
  licenseId?: string;
  attributionRequired: boolean;
  requiredByline?: string;
  rejectionReason?: string;
}

export class EditionContentEligibilityService {
  /**
   * Validates legal entitlement and editorial readiness of a news article for newspaper placement.
   */
  public static checkArticleEligibility(
    targetTenantId: string,
    article: NewsArticle,
    existingLicenses: NewsLicense[] = []
  ): EligibilityResult {
    if (!targetTenantId || !article) {
      return {
        isEligible: false,
        sourceType: 'INELIGIBLE',
        attributionRequired: false,
        rejectionReason: 'Invalid tenant context or article reference.',
      };
    }

    // 1. IN-HOUSE ARTICLE CHECK
    if (article.tenantId === targetTenantId) {
      const isApprovedOrPublished =
        article.editorialStatus === 'approved' || article.editorialStatus === 'published';

      if (!isApprovedOrPublished) {
        return {
          isEligible: false,
          sourceType: 'INELIGIBLE',
          attributionRequired: false,
          rejectionReason: `Internal article is currently in "${article.editorialStatus}" status. Only approved or published articles may be placed in a print edition.`,
        };
      }

      return {
        isEligible: true,
        sourceType: 'IN_HOUSE_APPROVED',
        attributionRequired: false,
        requiredByline: article.byline,
      };
    }

    // 2. EXTERNAL / MARKETPLACE ARTICLE CHECK
    // Must hold an active, non-expired license for this newsId
    const activeLicense = existingLicenses.find(
      (lic) =>
        lic.buyerTenantId === targetTenantId &&
        lic.newsId === article.articleId &&
        lic.status === 'ACTIVE'
    );

    if (!activeLicense) {
      return {
        isEligible: false,
        sourceType: 'INELIGIBLE',
        attributionRequired: false,
        rejectionReason:
          'Unlicensed marketplace news: Publisher does not hold an active syndication license for this foreign article. Story cannot be placed in a print edition without licensing.',
      };
    }

    // Check expiration if set
    if (activeLicense.expiresAt) {
      const expirationDate = new Date(activeLicense.expiresAt);
      if (expirationDate.getTime() < Date.now()) {
        return {
          isEligible: false,
          sourceType: 'INELIGIBLE',
          attributionRequired: false,
          rejectionReason: `Syndication license expired on ${activeLicense.expiresAt}. Renew license to place in edition.`,
        };
      }
    }

    // Check print permission
    if (activeLicense.type === 'DIGITAL_ONLY') {
      return {
        isEligible: false,
        sourceType: 'INELIGIBLE',
        attributionRequired: false,
        rejectionReason: 'The held license is DIGITAL_ONLY and strictly prohibits print press reproduction.',
      };
    }

    return {
      isEligible: true,
      sourceType: 'MARKETPLACE_LICENSED',
      licenseId: activeLicense.licenseId,
      attributionRequired: activeLicense.attributionRequired ?? true,
      requiredByline: article.byline,
    };
  }

  /**
   * Batch filter a list of candidate news stories for a newspaper edition.
   */
  public static filterEligibleArticles(
    targetTenantId: string,
    articles: NewsArticle[],
    existingLicenses: NewsLicense[] = []
  ): { eligible: { article: NewsArticle; eligibility: EligibilityResult }[]; ineligible: { article: NewsArticle; eligibility: EligibilityResult }[] } {
    const eligible: { article: NewsArticle; eligibility: EligibilityResult }[] = [];
    const ineligible: { article: NewsArticle; eligibility: EligibilityResult }[] = [];

    for (const article of articles) {
      const eligibility = this.checkArticleEligibility(targetTenantId, article, existingLicenses);
      if (eligibility.isEligible) {
        eligible.push({ article, eligibility });
      } else {
        ineligible.push({ article, eligibility });
      }
    }

    return { eligible, ineligible };
  }
}
