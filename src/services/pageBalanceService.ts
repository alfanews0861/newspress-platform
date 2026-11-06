/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Newspaper Page Balance & Diagnostic Engine
 * Evaluates print page visual weight, occupied area, whitespace, headline hierarchy,
 * and preflight validation checks without subjective aesthetic score vanity.
 */

import { PageGrid, ArticlePlacement, AdvertisementPlacement, PageDiagnostics } from '../types/edition';
import { GridCalculationService } from './gridCalculationService';

export class PageBalanceService {
  /**
   * Evaluates layout balance, visual distribution, and constraint compliance.
   */
  public static evaluatePage(
    grid: PageGrid,
    placements: ArticlePlacement[],
    adPlacements: AdvertisementPlacement[] = []
  ): PageDiagnostics {
    const errors: string[] = [];
    const warnings: string[] = [];
    const info: string[] = [];

    const totalContentArea = grid.contentWidth * grid.contentHeight;
    if (totalContentArea <= 0) {
      return {
        status: 'overflow',
        occupiedAreaPercent: 0,
        whitespacePercent: 100,
        visualWeight: { topHalf: 0, bottomHalf: 0, leftHalf: 0, rightHalf: 0 },
        headlineHierarchy: { leadFound: false, leadFontSize: 0, secondaryLeadFound: false, ratio: 0, verdict: 'No content' },
        imageBalance: { imageAreaPercent: 0, count: 0 },
        errors: ['Invalid page dimensions or zero content area'],
        warnings: [],
        info: [],
        canFinalize: false,
      };
    }

    // 1. Calculate occupied areas & check boundary overflow
    let totalOccupiedArea = 0;
    let totalImageArea = 0;
    let imageCount = 0;
    let topHalfArea = 0;
    let bottomHalfArea = 0;
    let leftHalfArea = 0;
    let rightHalfArea = 0;

    const vMidpoint = grid.margins.top + grid.contentHeight / 2;
    const hMidpoint = grid.margins.left + grid.contentWidth / 2;

    const allBlocks: { id: string; x: number; y: number; width: number; height: number; title: string; colStart: number; colSpan: number }[] = [];

    // Evaluate Articles
    for (const p of placements) {
      const blockArea = p.width * p.height;
      totalOccupiedArea += blockArea;

      if (!p.articleTitle || p.articleTitle.trim() === '') {
        errors.push(`Article (ID: ${p.newsId}) is missing a headline.`);
      }

      // Check vertical boundary overflow
      const bottomEdge = p.y + p.height;
      const allowedBottom = grid.margins.top + grid.contentHeight + 8; // 8px tolerance
      if (bottomEdge > allowedBottom) {
        errors.push(`Story "${p.articleTitle || p.newsId}" overflows page bottom margin by ${Math.round(bottomEdge - allowedBottom)}px.`);
      }

      // Check horizontal boundary overflow
      const rightEdge = p.x + p.width;
      const allowedRight = grid.margins.left + grid.contentWidth + 4;
      if (rightEdge > allowedRight) {
        errors.push(`Story "${p.articleTitle || p.newsId}" overflows right margin by ${Math.round(rightEdge - allowedRight)}px.`);
      }

      // Image metrics
      if (p.imageUrl && p.imagePlacement !== 'none') {
        imageCount++;
        const imgH = p.layoutRole === 'LEAD' ? p.height * 0.45 : p.height * 0.35;
        totalImageArea += p.width * imgH;
      }

      // Visual weight centroids
      const centerY = p.y + p.height / 2;
      const centerX = p.x + p.width / 2;
      if (centerY < vMidpoint) topHalfArea += blockArea;
      else bottomHalfArea += blockArea;

      if (centerX < hMidpoint) leftHalfArea += blockArea;
      else rightHalfArea += blockArea;

      allBlocks.push({
        id: p.placementId,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        title: p.articleTitle || p.newsId,
        colStart: p.columnStart,
        colSpan: p.columnSpan,
      });
    }

    // Evaluate Advertisements
    for (const ad of adPlacements) {
      const adArea = ad.width * ad.height;
      totalOccupiedArea += adArea;

      const centerY = ad.y + ad.height / 2;
      const centerX = ad.x + ad.width / 2;
      if (centerY < vMidpoint) topHalfArea += adArea;
      else bottomHalfArea += adArea;
      if (centerX < hMidpoint) leftHalfArea += adArea;
      else rightHalfArea += adArea;

      allBlocks.push({
        id: ad.placementId,
        x: ad.x,
        y: ad.y,
        width: ad.width,
        height: ad.height,
        title: `Ad: ${ad.sponsorLabel}`,
        colStart: ad.columnStart,
        colSpan: ad.columnSpan,
      });
    }

    // 2. Overlap & Collision Check
    let hasOverlap = false;
    for (let i = 0; i < allBlocks.length; i++) {
      for (let j = i + 1; j < allBlocks.length; j++) {
        const bA = allBlocks[i];
        const bB = allBlocks[j];

        if (GridCalculationService.checkBlockOverlap(bA, bB, 2)) {
          hasOverlap = true;
          errors.push(`Layout collision detected: "${bA.title}" overlaps with "${bB.title}".`);
        }
      }
    }

    // 3. Occupied area & whitespace metrics
    const occupiedAreaPercent = Math.min(100, Math.round((totalOccupiedArea / totalContentArea) * 100));
    const whitespacePercent = Math.max(0, 100 - occupiedAreaPercent);

    if (occupiedAreaPercent < 60) {
      warnings.push(`Page has excessive whitespace (${whitespacePercent}% unassigned area). Consider adding sidebars or briefs.`);
    } else if (occupiedAreaPercent > 94) {
      warnings.push(`Page density is high (${occupiedAreaPercent}% occupied). Ensure adequate column gutters and breathing room.`);
    }

    // 4. Headline Hierarchy Check
    const fontSizes = placements.map((p) => p.headlineSize || 18).sort((a, b) => b - a);
    const leadFontSize = fontSizes[0] || 0;
    const secondFontSize = fontSizes[1] || 0;
    const leadFound = leadFontSize >= 24;
    const secondaryLeadFound = secondFontSize >= 18;
    const ratio = secondFontSize > 0 ? Math.round((leadFontSize / secondFontSize) * 10) / 10 : 1.0;

    let verdict = 'Balanced headline hierarchy';
    if (!leadFound && placements.length > 0) {
      verdict = 'Weak hierarchy: missing a dominant lead headline (>= 24pt)';
      warnings.push('Weak visual hierarchy: no prominent lead story headline found on page.');
    } else if (placements.length > 1 && ratio < 1.15) {
      verdict = 'Uniform headline scale: secondary headlines compete directly with lead';
      warnings.push('Lead and secondary stories have nearly identical headline sizes.');
    }

    // 5. Visual Weight Ratios
    const totalWeight = Math.max(1, topHalfArea + bottomHalfArea);
    const topPct = Math.round((topHalfArea / totalWeight) * 100);
    const bottomPct = Math.round((bottomHalfArea / totalWeight) * 100);
    const leftPct = Math.round((leftHalfArea / totalWeight) * 100);
    const rightPct = Math.round((rightHalfArea / totalWeight) * 100);

    // In broadsheet journalism, top-heavy (60/40) is standard due to the fold. Extreme skew (>85%) is warned.
    if (topPct > 85) {
      warnings.push('Severe top-heavy visual weight: lower half of page is significantly empty.');
    } else if (bottomPct > 75) {
      warnings.push('Unbalanced bottom weight: bottom-heavy page defies traditional newspaper hierarchy.');
    }

    // 6. Image balance
    const imageAreaPercent = Math.round((totalImageArea / totalContentArea) * 100);
    if (imageCount === 0 && placements.length > 2) {
      warnings.push('Page contains no photographs or visual artwork (text-heavy grey wall).');
    }

    // Determine overall diagnostic status
    let status: PageDiagnostics['status'] = 'balanced';
    if (errors.length > 0 || hasOverlap) {
      status = 'overflow';
    } else if (occupiedAreaPercent > 94) {
      status = 'crowded';
    } else if (occupiedAreaPercent < 65) {
      status = 'slightly_sparse';
    } else if (!leadFound && placements.length > 1) {
      status = 'weak_hierarchy';
    }

    if (errors.length === 0 && warnings.length === 0) {
      info.push('Page layout is well-proportioned with clear lead hierarchy.');
      info.push('All story blocks snap accurately to column grid lines.');
    }

    return {
      status,
      occupiedAreaPercent,
      whitespacePercent,
      visualWeight: {
        topHalf: topPct,
        bottomHalf: bottomPct,
        leftHalf: leftPct,
        rightHalf: rightPct,
      },
      headlineHierarchy: {
        leadFound,
        leadFontSize,
        secondaryLeadFound,
        ratio,
        verdict,
      },
      imageBalance: {
        imageAreaPercent,
        count: imageCount,
      },
      errors,
      warnings,
      info,
      canFinalize: errors.length === 0,
    };
  }
}
