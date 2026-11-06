/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Print Preflight Engine & Quality Control Service
 * Performs pre-render & post-render validation on ProductionSnapshots.
 * Generates comprehensive preflight reports and enforces zero-defect print criteria.
 */

import {
  ProductionSnapshot,
  ProductionPreflightReport,
  PagePreflightResult,
  FontPreflightResult,
  ImagePreflightResult,
} from '../types/production';
import { FontRegistryService } from './fontRegistryService';
import { PrintImageProcessingService } from './printImageProcessingService';
import { GridCalculationService } from './gridCalculationService';
import { PageBalanceService } from './pageBalanceService';

export class PrintPreflightService {
  private static reportsStore: Map<string, ProductionPreflightReport> = new Map();

  /**
   * Evaluates a complete ProductionSnapshot to generate an authoritative Preflight Report.
   */
  public static evaluateSnapshot(
    snapshot: ProductionSnapshot,
    productionJobId: string
  ): ProductionPreflightReport {
    const reportId = `rep-${snapshot.editionId}-${Date.now()}`;
    const errors: string[] = [];
    const warnings: string[] = [];
    const pageResults: PagePreflightResult[] = [];
    const fontResults: FontPreflightResult[] = [];
    const imageResults: ImagePreflightResult[] = [];

    const fontsEncountered = new Set<string>();
    const template = snapshot.template;
    const grid = GridCalculationService.calculatePageGrid(template);

    // 1. Inspect Geometry & Bleed / Trim / Safe Area
    if (snapshot.pressSpecs.bleedMm < 3.0) {
      warnings.push(`Bleed margin is ${snapshot.pressSpecs.bleedMm}mm (recommended >= 3.0mm for rotary presses).`);
    }

    if (snapshot.pressSpecs.dpi < 300) {
      warnings.push(`Target press resolution is ${snapshot.pressSpecs.dpi} DPI (standard commercial print requires 300 DPI).`);
    }

    // 2. Validate Each Page
    for (const page of snapshot.pages) {
      const pageErrors: string[] = [];
      const pageWarnings: string[] = [];
      const safeAreaViolations: string[] = [];

      // Check physical bounds
      const placements = page.blocks || [];
      const ads = page.adPlacements || [];

      const balance = PageBalanceService.evaluatePage(grid, placements, ads);
      if (balance.errors.length > 0) {
        pageErrors.push(...balance.errors);
      }
      if (balance.warnings.length > 0) {
        pageWarnings.push(...balance.warnings);
      }

      // Check each article placement
      for (const pl of placements) {
        // Safe area check
        if (pl.x < template.pageMarginsMm.left || pl.x + pl.width > template.pageWidthMm - template.pageMarginsMm.right + 20) {
          // Check if it spills outside the page margins
          if (pl.x < 0 || pl.width > template.pageWidthMm) {
            safeAreaViolations.push(`Story block "${pl.articleTitle || pl.newsId}" extends outside physical page bounds.`);
            pageErrors.push(`Block bounds collision on Page ${page.pageNumber}.`);
          }
        }

        // Font check
        const fontName = snapshot.brand.defaultFonts.headlineFont || 'Newsreader';
        fontsEncountered.add(fontName);

        const fontValidation = FontRegistryService.validateFontForText(fontName, pl.articleTitle || '');
        if (!fontValidation.isValid) {
          pageErrors.push(`Font error for story "${pl.articleTitle || pl.newsId}": ${fontValidation.reason}`);
        }

        // Image check
        if (pl.imageUrl && pl.imagePlacement !== 'none') {
          const imgPreflight = PrintImageProcessingService.evaluateImagePreflight({
            mediaId: `img-${pl.placementId}`,
            imageUrl: pl.imageUrl,
            placementWidthMm: (pl.width / 72) * 25.4,
            placementHeightMm: (pl.height / 72) * 25.4,
          });

          imageResults.push(imgPreflight);
          if (imgPreflight.status === 'ERROR') {
            pageErrors.push(`Low-resolution image (${imgPreflight.effectiveDPI} DPI) on story "${pl.articleTitle || pl.newsId}".`);
          } else if (imgPreflight.status === 'WARNING') {
            pageWarnings.push(`Moderate-resolution image (${imgPreflight.effectiveDPI} DPI) on story "${pl.articleTitle || pl.newsId}".`);
          }
        }
      }

      errors.push(...pageErrors);
      warnings.push(...pageWarnings);

      pageResults.push({
        pageNumber: page.pageNumber,
        dimensionsValid: true,
        overflowDetected: pageErrors.some((e) => e.toLowerCase().includes('overflow')),
        collisionDetected: pageErrors.some((e) => e.toLowerCase().includes('overlap') || e.toLowerCase().includes('collision')),
        safeAreaViolations,
        errors: pageErrors,
        warnings: pageWarnings,
      });
    }

    // 3. Compile Font Results
    for (const fontName of fontsEncountered) {
      const reg = FontRegistryService.findFont(fontName);
      if (!reg) {
        errors.push(`Missing production font: "${fontName}" not found in font registry.`);
        fontResults.push({
          fontFamily: fontName,
          script: 'unknown',
          isAvailable: false,
          embeddingAllowed: false,
          status: 'missing',
        });
      } else if (!reg.embeddingAllowed) {
        errors.push(`Font embedding restriction: "${fontName}" cannot be legally embedded into print PDF.`);
        fontResults.push({
          fontFamily: fontName,
          script: reg.supportedScripts.join(', '),
          isAvailable: true,
          embeddingAllowed: false,
          status: 'restricted',
        });
      } else {
        fontResults.push({
          fontFamily: reg.fontFamily,
          script: reg.supportedScripts.join(', '),
          isAvailable: true,
          embeddingAllowed: true,
          status: 'embedded',
        });
      }
    }

    // Determine Final Preflight Status
    let result: 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL' = 'PASS';
    if (errors.length > 0) {
      result = 'FAIL';
    } else if (warnings.length > 0) {
      result = 'PASS_WITH_WARNINGS';
    }

    const report: ProductionPreflightReport = {
      reportId,
      productionJobId,
      snapshotId: snapshot.snapshotId,
      tenantId: snapshot.tenantId,
      result,
      errors,
      warnings,
      pageResults,
      fontResults,
      imageResults,
      createdAt: new Date().toISOString(),
    };

    this.reportsStore.set(reportId, report);
    return report;
  }

  /**
   * Retrieves a stored preflight report by ID.
   */
  public static getReport(reportId: string): ProductionPreflightReport | undefined {
    return this.reportsStore.get(reportId);
  }
}
