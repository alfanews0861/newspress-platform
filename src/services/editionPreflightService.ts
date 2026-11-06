/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Edition Preflight Service
 * Rigorously inspects newspaper layout state before finalization.
 * Separates blocking hard errors from non-blocking editorial warnings.
 */

import {
  NewspaperEdition,
  NewspaperPage,
  NewspaperTemplate,
  NewspaperBrand,
  ArticlePlacement,
} from '../types/edition';
import { NewsArticle } from '../types/news';
import { NewsLicense } from '../types/marketplace';
import { GridCalculationService } from './gridCalculationService';
import { PageBalanceService } from './pageBalanceService';
import { EditionContentEligibilityService } from './editionContentEligibilityService';
import { FontRegistryService } from './fontRegistryService';

export interface PreflightCheckResult {
  canFinalize: boolean;
  hasWarnings: boolean;
  hardErrors: string[];
  warnings: string[];
  pageBreakdown: {
    pageNumber: number;
    hardErrors: string[];
    warnings: string[];
    articleCount: number;
    adCount: number;
    occupancyPercent: number;
  }[];
  summary: {
    totalPages: number;
    totalStories: number;
    totalAdvertisements: number;
    verifiedOriginalStories: number;
    marketplaceLicensedStories: number;
  };
}

export class EditionPreflightService {
  /**
   * Evaluates complete edition preflight checks before finalization.
   */
  public static validateForFinalization(params: {
    edition: NewspaperEdition;
    pages: NewspaperPage[];
    template: NewspaperTemplate;
    brand: NewspaperBrand;
    articles?: NewsArticle[];
    licenses?: NewsLicense[];
  }): PreflightCheckResult {
    const { edition, pages, template, brand, articles = [], licenses = [] } = params;

    const hardErrors: string[] = [];
    const warnings: string[] = [];
    const pageBreakdown: PreflightCheckResult['pageBreakdown'] = [];

    // 1. Validate Template & Page Dimensions
    if (!template || template.pageWidthMm <= 0 || template.pageHeightMm <= 0) {
      hardErrors.push('Invalid template configuration: Page dimensions must be positive non-zero values.');
    }

    if (!pages || pages.length === 0) {
      hardErrors.push('The edition has no pages to finalize.');
    }

    const grid = GridCalculationService.calculatePageGrid(template);

    let totalStories = 0;
    let totalAdvertisements = 0;
    let verifiedOriginalStories = 0;
    let marketplaceLicensedStories = 0;

    const articleMap = new Map<string, NewsArticle>();
    for (const art of articles) {
      articleMap.set(art.articleId, art);
    }

    // 2. Validate Every Page
    for (const page of pages) {
      const pageErrors: string[] = [];
      const pageWarnings: string[] = [];
      const placements = page.blocks || [];
      const ads = page.adPlacements || [];

      totalStories += placements.length;
      totalAdvertisements += ads.length;

      // Check empty page
      if (placements.length === 0 && ads.length === 0) {
        pageWarnings.push(`Page ${page.pageNumber} is currently empty.`);
      }

      // Check Page Balance & Collisions
      const diag = PageBalanceService.evaluatePage(grid, placements, ads);
      for (const err of diag.errors) {
        // Hard errors: overflow or collision
        pageErrors.push(`Page ${page.pageNumber}: ${err}`);
      }
      for (const warn of diag.warnings) {
        pageWarnings.push(`Page ${page.pageNumber}: ${warn}`);
      }

      // Check Story Placements on this page
      for (const pl of placements) {
        // Check text fitting diagnostics
        if (pl.diagnostics && !pl.diagnostics.headlineFits) {
          pageWarnings.push(`Headline may be truncated for "${pl.articleTitle || pl.newsId}" on Page ${page.pageNumber}.`);
        }
        if (pl.diagnostics && !pl.diagnostics.bodyFits) {
          pageWarnings.push(`Body copy exceeds allocated column depth for "${pl.articleTitle || pl.newsId}" on Page ${page.pageNumber}.`);
        }

        // Check Font & Script support (Telugu / English)
        const headlineText = pl.articleTitle || '';
        const bodyText = pl.bodyContent || '';
        const headlineFont = brand.defaultFonts.headlineFont || template.defaultTypography.headlineFont;
        const fontCheck = FontRegistryService.validateFontForText(headlineFont, headlineText);
        if (!fontCheck.isValid) {
          pageErrors.push(`Typography Error for "${headlineText.slice(0, 20)}...": ${fontCheck.reason}`);
        }

        // Check Content & Licensing Eligibility
        const sourceArt = articleMap.get(pl.newsId);
        if (sourceArt) {
          if (sourceArt.originalityStatus === 'VERIFIED_ORIGINAL') {
            verifiedOriginalStories++;
          }
          if (sourceArt.authorId !== edition.tenantId && sourceArt.isMarketplaceListed) {
            marketplaceLicensedStories++;
          }

          const eligibility = EditionContentEligibilityService.checkArticleEligibility(
            edition.tenantId,
            sourceArt,
            licenses
          );

          if (!eligibility.isEligible) {
            pageErrors.push(`Content Licensing Violation: Story "${sourceArt.headline.slice(0, 30)}..." on Page ${page.pageNumber} cannot be printed. Reason: ${eligibility.rejectionReason}`);
          }
        }

        // Check Byline & Required Attribution
        if (!pl.byline || pl.byline.trim() === '') {
          pageWarnings.push(`Missing reporter byline for story "${pl.articleTitle || pl.newsId}" on Page ${page.pageNumber}.`);
        }

        // Check Missing Image Reference if image placement is active
        if (pl.imagePlacement !== 'none' && (!pl.imageUrl || pl.imageUrl.trim() === '')) {
          pageWarnings.push(`Image slot enabled for "${pl.articleTitle || pl.newsId}", but no image URL is provided.`);
        }
      }

      // Check Advertisements
      for (const ad of ads) {
        if (!ad.sponsorLabel || ad.sponsorLabel.trim() === '') {
          pageWarnings.push(`Advertisement on Page ${page.pageNumber} (col ${ad.columnStart}) is missing a sponsor label.`);
        }
        if (ad.columnStart < 1 || ad.columnStart + ad.columnSpan - 1 > grid.columnCount) {
          pageErrors.push(`Advertisement on Page ${page.pageNumber} extends beyond the column grid boundary.`);
        }
      }

      hardErrors.push(...pageErrors);
      warnings.push(...pageWarnings);

      pageBreakdown.push({
        pageNumber: page.pageNumber,
        hardErrors: pageErrors,
        warnings: pageWarnings,
        articleCount: placements.length,
        adCount: ads.length,
        occupancyPercent: diag.occupiedAreaPercent,
      });
    }

    // Must have at least 1 placed story in the edition
    if (totalStories === 0) {
      hardErrors.push('The edition must have at least one placed story before it can be finalized for print.');
    }

    return {
      canFinalize: hardErrors.length === 0,
      hasWarnings: warnings.length > 0,
      hardErrors,
      warnings,
      pageBreakdown,
      summary: {
        totalPages: pages.length,
        totalStories,
        totalAdvertisements,
        verifiedOriginalStories,
        marketplaceLicensedStories,
      },
    };
  }
}
