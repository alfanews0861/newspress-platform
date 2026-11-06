/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Marketplace Eligibility Domain Service
 * Phase 3 — News Marketplace, Licensing & Reporter Revenue Engine
 * 
 * Centralized, authoritative gatekeeper for marketplace entry.
 * Enforces Phase 2 editorial & originality checks, reporter privileges,
 * pricing boundaries (NO FREE NEWS), and tenant syndication permissions.
 */

import { NewsArticle } from '../types/news';
import { ReporterProfile } from '../types/reporter';
import { LicenseType, ListingType } from '../types/marketplace';
import { canArticleEnterMarketplace } from './newsLifecycle';

export interface EligibilityEvaluationParams {
  article: Partial<NewsArticle>;
  reporter?: Partial<ReporterProfile>;
  listingParams?: {
    price?: number;
    listingType?: ListingType;
    licenseOptions?: LicenseType[];
  };
  tenantPolicy?: {
    allowStaffMarketplaceSales?: boolean;
  };
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  isOriginalityEligible: boolean;
  isEditorialEligible: boolean;
  isReporterEligible: boolean;
  isPricingValid: boolean;
  isLicensingValid: boolean;
  isTenantPermitted: boolean;
}

export class MarketplaceEligibilityService {
  /**
   * Authoritative gate for marketplace listing eligibility.
   * Centralizes all domain constraints so UI components never duplicate logic.
   */
  evaluateEligibility(params: EligibilityEvaluationParams): EligibilityResult {
    const { article, reporter, listingParams, tenantPolicy } = params;
    const reasons: string[] = [];

    let isOriginalityEligible = false;
    let isEditorialEligible = false;
    let isReporterEligible = false;
    let isPricingValid = false;
    let isLicensingValid = false;
    let isTenantPermitted = false;

    // 1. Phase 2 Editorial & Originality Gate Check
    const phase2Gate = canArticleEnterMarketplace(article);
    if (!phase2Gate.eligible) {
      reasons.push(phase2Gate.reason || 'Article does not meet Phase 2 originality or editorial gate.');
    } else {
      isOriginalityEligible = true;
      isEditorialEligible = true;
    }

    // Specific check: Not rejected
    if (article.editorialStatus === 'rejected') {
      reasons.push('Rejected articles cannot enter the marketplace.');
      isEditorialEligible = false;
    }

    // Specific check: Disputed or confirmed duplicates are barred
    if (article.originalityStatus === 'DISPUTED' || article.originalityVerdict === 'disputed') {
      reasons.push('Stories under dispute are barred from marketplace listing.');
      isOriginalityEligible = false;
    }
    if (article.originalityStatus === 'DUPLICATE_CONFIRMED' || article.originalityVerdict === 'duplicate_confirmed') {
      reasons.push('Stories confirmed as duplicates cannot be monetized on the marketplace.');
      isOriginalityEligible = false;
    }

    // 2. Reporter Account & Privilege Verification
    if (!reporter) {
      reasons.push('Valid reporter profile is required for marketplace listing.');
    } else {
      if (reporter.verificationStatus === 'suspended') {
        reasons.push('Reporter account has been suspended from platform privileges.');
      } else {
        isReporterEligible = true;
      }
    }

    // 3. Pricing Validation: THERE ARE NO FREE MARKETPLACE NEWS ITEMS
    if (listingParams && listingParams.price !== undefined) {
      if (listingParams.price <= 0) {
        reasons.push('Marketplace principle violation: There are no free marketplace news items (price must be greater than ₹0).');
      } else {
        isPricingValid = true;
      }
    } else {
      // If price not yet provided in draft phase, considered conditionally valid
      isPricingValid = true;
    }

    // 4. Licensing Information Validation
    if (listingParams && listingParams.licenseOptions !== undefined) {
      if (!Array.isArray(listingParams.licenseOptions) || listingParams.licenseOptions.length === 0) {
        reasons.push('At least one valid licensing option must be selected.');
      } else {
        isLicensingValid = true;
      }
    } else {
      isLicensingValid = true;
    }

    // 5. Tenant / Source Organization Syndication Permissions
    if (reporter && reporter.reporterType === 'staff_reporter' && article.tenantId && article.tenantId !== 'freelance_open') {
      if (tenantPolicy && tenantPolicy.allowStaffMarketplaceSales === false) {
        reasons.push('Source news organization policy restricts staff reporters from external syndication.');
      } else {
        isTenantPermitted = true;
      }
    } else {
      // Freelance or independent reporters have inherent syndication rights
      isTenantPermitted = true;
    }

    const eligible =
      isOriginalityEligible &&
      isEditorialEligible &&
      isReporterEligible &&
      isPricingValid &&
      isLicensingValid &&
      isTenantPermitted;

    return {
      eligible,
      reasons,
      isOriginalityEligible,
      isEditorialEligible,
      isReporterEligible,
      isPricingValid,
      isLicensingValid,
      isTenantPermitted
    };
  }

  /**
   * Fast boolean check for article eligibility
   */
  canListArticle(article: Partial<NewsArticle>, reporter?: Partial<ReporterProfile>): boolean {
    const res = this.evaluateEligibility({ article, reporter });
    return res.eligible;
  }
}

export const marketplaceEligibilityService = new MarketplaceEligibilityService();
