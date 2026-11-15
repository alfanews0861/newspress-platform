/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Strict Constraint-Based Newspaper Grid Calculation Service
 * Handles deterministic column geometries, snapping, boundary verification, and collision detection.
 */

import { PageGrid, NewspaperTemplate, NewspaperBrand, PaperSizeFormat } from '../types/edition';

// Standard 96 DPI pixel-to-millimeter ratio (1 inch = 25.4 mm = 96 px => ~3.7795 px/mm)
// For editorial canvas: 2.0x for compact preview, 3.78x for true high-density 8-column broadsheet (Eenadu/Sakshi standard).
export const MM_TO_PX_RATIO = 2.0;
export const TRUE_BROADSHEET_SCALE = 3.78;

export interface PhysicalPageSpec {
  format: 'A4' | 'Broadsheet' | 'Tabloid' | 'Custom';
  widthMm: number;
  heightMm: number;
  defaultColumns: number;
}

export const PHYSICAL_PAGE_PRESETS: Record<string, PhysicalPageSpec> = {
  A4: {
    format: 'A4',
    widthMm: 210,
    heightMm: 297,
    defaultColumns: 4,
  },
  Broadsheet: {
    format: 'Broadsheet',
    widthMm: 350,
    heightMm: 540,
    defaultColumns: 8,
  },
  Tabloid: {
    format: 'Tabloid',
    widthMm: 280,
    heightMm: 380,
    defaultColumns: 5,
  },
  Berliner: {
    format: 'Custom',
    widthMm: 315,
    heightMm: 470,
    defaultColumns: 6,
  },
  A3: {
    format: 'Custom',
    widthMm: 297,
    heightMm: 420,
    defaultColumns: 6,
  },
};

export class GridCalculationService {
  public static readonly MM_TO_PX_RATIO = MM_TO_PX_RATIO;
  public static readonly TRUE_BROADSHEET_SCALE = TRUE_BROADSHEET_SCALE;

  /**
   * Resolves the appropriate rendering scale factor for a physical paper format.
   */
  public static getScaleForFormat(format?: string, widthMm?: number): number {
    const f = (format || '').toLowerCase();
    if (f.includes('broadsheet')) return 3.78;
    if (f.includes('tabloid')) return 3.2;
    if (f.includes('berliner')) return 3.4;
    if (f.includes('a3')) return 3.2;
    if (f.includes('a4')) return 3.5;
    if (widthMm) {
      if (widthMm >= 340) return 3.78;
      if (widthMm >= 300) return 3.4;
      if (widthMm >= 260) return 3.2;
      return 3.5;
    }
    return 3.2;
  }

  /**
   * Creates or resolves the exact NewspaperTemplate corresponding to a user brand's Paper Settings.
   * Dynamically tailors dimensions (mm), column counts, gutters, margins, and masthead heights.
   */
  public static getTemplateForBrand(brand?: Partial<NewspaperBrand> | null): NewspaperTemplate {
    const paperSize: PaperSizeFormat = brand?.paperSize || 'broadsheet';
    const isTelugu = brand?.language === 'te' || brand?.name?.includes('తెలుగు') || brand?.brandId?.includes('andhra') || brand?.brandId === 'brand-telugu-standard' || true;
    
    const cols = brand?.defaultColumnCount || (
      paperSize === 'broadsheet' ? 8 :
      paperSize === 'tabloid' ? 5 :
      paperSize === 'berliner' ? 6 :
      paperSize === 'a3' ? 6 :
      paperSize === 'a4' ? 4 : 8
    );

    const typography = {
      headlineFont: isTelugu ? "'Ramabhadra', 'Noto Serif Telugu', serif" : 'Newsreader, serif',
      bodyFont: isTelugu ? "'Mallanna', 'Noto Sans Telugu', sans-serif" : 'Inter, sans-serif',
      accentFont: isTelugu ? "'Ramabhadra', serif" : 'Cinzel, serif',
      baseFontSizePt: paperSize === 'a4' ? 9.5 : 10.5,
      lineHeights: { headline: 1.3, body: 1.45, caption: 1.2 },
    };

    const sectionStyles = {
      'ముఖ్యాంశాలు': { name: 'ముఖ్యాంశాలు (Front Page)', headingFont: "'Ramabhadra', serif", accentColor: '#991b1b', dividerStyle: 'thick_thin' },
      'జాతీయం': { name: 'జాతీయం (National)', headingFont: "'Ramabhadra', serif", accentColor: '#0f172a', dividerStyle: 'solid' },
      'రాష్ట్రీయం': { name: 'రాష్ట్రీయం (State News)', headingFont: "'Ramabhadra', serif", accentColor: '#047857', dividerStyle: 'double' },
      'జిల్లా స్రవంతి': { name: 'జిల్లా స్రవంతి (District Round-up)', headingFont: "'Ramabhadra', serif", accentColor: '#b45309', dividerStyle: 'solid' },
    };

    switch (paperSize) {
      case 'tabloid':
        return {
          templateId: `tmpl-tabloid-${cols}col`,
          tenantId: brand?.tenantId || 'tenant-metro-chronicle',
          name: `${brand?.name || 'Newspaper'} ట్యాబ్లాయిడ్ (${cols}-కాలమ్స్ Tabloid)`,
          description: `Compact Tabloid layout (280×380mm, ${cols} columns) for metro & evening editions`,
          pageSize: 'Tabloid',
          format: 'tabloid',
          pageOrientation: 'portrait',
          pageWidthMm: 280,
          pageHeightMm: 380,
          pageMarginsMm: { top: 10, bottom: 10, left: 10, right: 10 },
          columnCount: cols,
          columnsCount: cols,
          columnGutterMm: 3.2,
          gridGutterMm: 3.2,
          baselineGridPt: 8,
          headerHeightMm: 32,
          footerHeightMm: 8,
          scale: 3.2,
          allowedModules: ['masthead', 'headline', 'subheadline', 'bodyText', 'image', 'imageCaption', 'byline', 'divider', 'advertisement'],
          defaultTypography: typography,
          sectionStyles,
          advertisementZones: [],
          imageTreatmentRules: { maxHeroHeightPercent: 50, defaultAspectRatio: '16:9', allowGrayscale: false, borderStyle: 'thin_black' },
          isDefault: false,
          createdAt: '2024-03-01T00:00:00.000Z',
          updatedAt: new Date().toISOString(),
        };

      case 'berliner':
        return {
          templateId: `tmpl-berliner-${cols}col`,
          tenantId: brand?.tenantId || 'tenant-metro-chronicle',
          name: `${brand?.name || 'Newspaper'} బెర్లినర్ (${cols}-కాలమ్స్ Berliner)`,
          description: `Berliner format (315×470mm, ${cols} columns)`,
          pageSize: 'Berliner' as any,
          format: 'berliner',
          pageOrientation: 'portrait',
          pageWidthMm: 315,
          pageHeightMm: 470,
          pageMarginsMm: { top: 10, bottom: 10, left: 10, right: 10 },
          columnCount: cols,
          columnsCount: cols,
          columnGutterMm: 3.0,
          gridGutterMm: 3.0,
          baselineGridPt: 8,
          headerHeightMm: 36,
          footerHeightMm: 8,
          scale: 3.4,
          allowedModules: ['masthead', 'headline', 'subheadline', 'bodyText', 'image', 'imageCaption', 'byline', 'divider', 'advertisement'],
          defaultTypography: typography,
          sectionStyles,
          advertisementZones: [],
          imageTreatmentRules: { maxHeroHeightPercent: 50, defaultAspectRatio: '16:9', allowGrayscale: false, borderStyle: 'thin_black' },
          isDefault: false,
          createdAt: '2024-03-01T00:00:00.000Z',
          updatedAt: new Date().toISOString(),
        };

      case 'a3':
        return {
          templateId: `tmpl-a3-${cols}col`,
          tenantId: brand?.tenantId || 'tenant-metro-chronicle',
          name: `${brand?.name || 'Newspaper'} A3 కాంపాక్ట్ (${cols}-కాలమ్స్ A3)`,
          description: `A3 compact print format (297×420mm, ${cols} columns)`,
          pageSize: 'A3' as any,
          format: 'a3',
          pageOrientation: 'portrait',
          pageWidthMm: 297,
          pageHeightMm: 420,
          pageMarginsMm: { top: 10, bottom: 10, left: 10, right: 10 },
          columnCount: cols,
          columnsCount: cols,
          columnGutterMm: 3.0,
          gridGutterMm: 3.0,
          baselineGridPt: 8,
          headerHeightMm: 32,
          footerHeightMm: 8,
          scale: 3.2,
          allowedModules: ['masthead', 'headline', 'subheadline', 'bodyText', 'image', 'imageCaption', 'byline', 'divider', 'advertisement'],
          defaultTypography: typography,
          sectionStyles,
          advertisementZones: [],
          imageTreatmentRules: { maxHeroHeightPercent: 50, defaultAspectRatio: '16:9', allowGrayscale: false, borderStyle: 'thin_black' },
          isDefault: false,
          createdAt: '2024-03-01T00:00:00.000Z',
          updatedAt: new Date().toISOString(),
        };

      case 'a4':
        return {
          templateId: `tmpl-a4-${cols}col`,
          tenantId: brand?.tenantId || 'tenant-metro-chronicle',
          name: `${brand?.name || 'Newspaper'} A4 ఎడిషన్ (${cols}-కాలమ్స్ A4)`,
          description: `A4 standard format (210×297mm, ${cols} columns)`,
          pageSize: 'A4',
          format: 'a4',
          pageOrientation: 'portrait',
          pageWidthMm: 210,
          pageHeightMm: 297,
          pageMarginsMm: { top: 8, bottom: 8, left: 8, right: 8 },
          columnCount: cols,
          columnsCount: cols,
          columnGutterMm: 3.0,
          gridGutterMm: 3.0,
          baselineGridPt: 6,
          headerHeightMm: 24,
          footerHeightMm: 8,
          scale: 3.5,
          allowedModules: ['masthead', 'headline', 'subheadline', 'bodyText', 'image', 'imageCaption', 'byline', 'divider', 'advertisement'],
          defaultTypography: typography,
          sectionStyles,
          advertisementZones: [],
          imageTreatmentRules: { maxHeroHeightPercent: 40, defaultAspectRatio: '16:9', allowGrayscale: false, borderStyle: 'thin_black' },
          isDefault: false,
          createdAt: '2024-03-01T00:00:00.000Z',
          updatedAt: new Date().toISOString(),
        };

      case 'broadsheet':
      default:
        return {
          templateId: cols === 8 ? 'tmpl-broadsheet-8col' : `tmpl-broadsheet-${cols}col`,
          tenantId: brand?.tenantId || 'tenant-metro-chronicle',
          name: `${brand?.name || 'ఈనాడు / సాక్షి'} స్టాండర్డ్ ${cols}-కాలమ్ బ్రాడ్‌షీట్`,
          description: `Authentic ${cols}-column high-density broadsheet press layout (350×540mm)`,
          pageSize: 'Broadsheet',
          format: 'broadsheet',
          pageOrientation: 'portrait',
          pageWidthMm: 350,
          pageHeightMm: 540,
          pageMarginsMm: { top: 9.5, bottom: 9.5, left: 10, right: 10 },
          columnCount: cols,
          columnsCount: cols,
          columnGutterMm: 2.38,
          gridGutterMm: 2.38,
          baselineGridPt: 8,
          headerHeightMm: 42.3,
          footerHeightMm: 8,
          scale: 3.78,
          allowedModules: ['masthead', 'headline', 'subheadline', 'bodyText', 'image', 'imageCaption', 'byline', 'divider', 'advertisement', 'weather', 'stockTicker'],
          defaultTypography: typography,
          sectionStyles,
          advertisementZones: [
            { zoneId: 'ad-strip-front', name: 'Front Page Display Slot', columnStart: Math.max(1, cols - 1), columnSpan: 2, rowStart: 72, rowSpan: 12, rateInr: 50000, sponsor: 'లలితా జ్యువెలరీ' },
          ],
          imageTreatmentRules: { maxHeroHeightPercent: 50, defaultAspectRatio: '16:9', allowGrayscale: false, borderStyle: 'thin_black' },
          isDefault: cols === 8,
          createdAt: '2024-03-01T00:00:00.000Z',
          updatedAt: new Date().toISOString(),
        };
    }
  }

  /**
   * Calculates precise grid coordinates from template definitions.
   * If scale is omitted, automatically applies TRUE_BROADSHEET_SCALE (3.78) for 8-column broadsheets,
   * or dynamically derives scale from format specifications.
   */
  public static calculatePageGrid(template: NewspaperTemplate, scale?: number): PageGrid {
    const effectiveScale = scale !== undefined
      ? scale
      : ((template as any).scale || (template.templateId === 'tmpl-broadsheet-8col' || template.columnCount === 8 ? TRUE_BROADSHEET_SCALE : (template.pageSize === 'Tabloid' || template.format === 'tabloid' ? 3.2 : template.pageSize === 'A4' || template.format === 'a4' ? 3.5 : MM_TO_PX_RATIO)));

    const pageWidth = Math.round(template.pageWidthMm * effectiveScale);
    const pageHeight = Math.round(template.pageHeightMm * effectiveScale);

    const margins = {
      top: Math.round(template.pageMarginsMm.top * effectiveScale),
      bottom: Math.round(template.pageMarginsMm.bottom * effectiveScale),
      left: Math.round(template.pageMarginsMm.left * effectiveScale),
      right: Math.round(template.pageMarginsMm.right * effectiveScale),
    };

    const contentWidth = Math.max(10, pageWidth - margins.left - margins.right);
    const contentHeight = Math.max(10, pageHeight - margins.top - margins.bottom);

    const columnCount = Math.max(1, template.columnCount || 6);
    const gutterWidth = Math.max(2, Math.round(template.columnGutterMm * effectiveScale));

    // contentWidth = (columnCount * columnWidth) + ((columnCount - 1) * gutterWidth)
    const totalGutterSpace = (columnCount - 1) * gutterWidth;
    const availableColSpace = Math.max(columnCount * 10, contentWidth - totalGutterSpace);
    const columnWidth = Math.floor((availableColSpace / columnCount) * 10) / 10;

    const baselineGrid = Math.max(4, Math.round((template.baselineGridPt || 8) * (effectiveScale / 1.5)));

    return {
      pageWidth,
      pageHeight,
      margins,
      contentWidth,
      contentHeight,
      columnCount,
      columnWidth,
      gutterWidth,
      baselineGrid,
    };
  }

  /**
   * Snaps a coordinate or dimension to the baseline grid.
   */
  public static snapToGrid(value: number, baselineStep: number): number {
    if (baselineStep <= 0) return Math.round(value);
    return Math.round(value / baselineStep) * baselineStep;
  }

  /**
   * Computes horizontal pixel bounds for given 1-indexed column range.
   */
  public static calculateColumnBounds(
    grid: PageGrid,
    columnStart: number,
    columnSpan: number
  ): { x: number; width: number } {
    const clampedColStart = Math.max(1, Math.min(columnStart, grid.columnCount));
    const maxSpan = grid.columnCount - clampedColStart + 1;
    const clampedSpan = Math.max(1, Math.min(columnSpan, maxSpan));

    // Zero-indexed index for offset math
    const colIndex = clampedColStart - 1;
    const x = grid.margins.left + colIndex * (grid.columnWidth + grid.gutterWidth);
    const width = clampedSpan * grid.columnWidth + (clampedSpan - 1) * grid.gutterWidth;

    return { x: Math.round(x), width: Math.round(width) };
  }

  /**
   * Computes vertical pixel bounds from baseline rows.
   */
  public static calculateBaselinePosition(
    grid: PageGrid,
    rowStart: number,
    rowSpan: number
  ): { y: number; height: number } {
    const y = grid.margins.top + rowStart * grid.baselineGrid;
    const height = Math.max(grid.baselineGrid, rowSpan * grid.baselineGrid);
    return { y: Math.round(y), height: Math.round(height) };
  }

  /**
   * Converts vertical height in pixels to number of grid row units.
   */
  public static heightToRowSpan(heightPx: number, baselineGrid: number): number {
    return Math.max(1, Math.ceil(heightPx / baselineGrid));
  }

  /**
   * Determines if two 2D bounding boxes overlap (using pixel coordinates).
   */
  public static checkBlockOverlap(
    blockA: { x: number; y: number; width: number; height: number },
    blockB: { x: number; y: number; width: number; height: number },
    tolerancePx: number = 1
  ): boolean {
    const aRight = blockA.x + blockA.width - tolerancePx;
    const aBottom = blockA.y + blockA.height - tolerancePx;
    const bRight = blockB.x + blockB.width - tolerancePx;
    const bBottom = blockB.y + blockB.height - tolerancePx;

    const noOverlap =
      aRight <= blockB.x + tolerancePx ||
      blockA.x >= bRight ||
      aBottom <= blockB.y + tolerancePx ||
      blockA.y >= bBottom;

    return !noOverlap;
  }

  /**
   * Checks if a candidate placement in logical grid coordinates overlaps with any existing block.
   */
  public static checkGridCollisions(
    candidate: { columnStart: number; columnSpan: number; rowStart: number; rowSpan: number },
    existingBlocks: { columnStart: number; columnSpan: number; rowStart: number; rowSpan: number }[]
  ): boolean {
    const candColEnd = candidate.columnStart + candidate.columnSpan - 1;
    const candRowEnd = candidate.rowStart + candidate.rowSpan - 1;

    for (const b of existingBlocks) {
      const bColEnd = b.columnStart + b.columnSpan - 1;
      const bRowEnd = b.rowStart + b.rowSpan - 1;

      const horizontalOverlap = !(candColEnd < b.columnStart || candidate.columnStart > bColEnd);
      const verticalOverlap = !(candRowEnd < b.rowStart || candidate.rowStart > bRowEnd);

      if (horizontalOverlap && verticalOverlap) {
        return true;
      }
    }
    return false;
  }

  /**
   * Validates if a proposed placement is strictly within page boundaries.
   */
  public static validatePlacementBounds(
    placement: { columnStart: number; columnSpan: number; rowStart?: number; rowSpan?: number; y?: number; height?: number },
    grid: PageGrid
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (placement.columnStart < 1) {
      errors.push(`Column start (${placement.columnStart}) must be at least 1`);
    }

    if (placement.columnSpan < 1) {
      errors.push(`Column span (${placement.columnSpan}) must be at least 1`);
    }

    if (placement.columnStart + placement.columnSpan - 1 > grid.columnCount) {
      errors.push(
        `Column span overflows page grid: ends at column ${placement.columnStart + placement.columnSpan - 1}, but page only has ${grid.columnCount} columns`
      );
    }

    if (placement.rowStart !== undefined && placement.rowStart < 0) {
      errors.push(`Row start (${placement.rowStart}) cannot be negative`);
    }

    if (placement.rowStart !== undefined && placement.rowSpan !== undefined) {
      const totalRowsAvailable = Math.floor(grid.contentHeight / grid.baselineGrid);
      if (placement.rowStart + placement.rowSpan > totalRowsAvailable + 2) {
        errors.push(`Block overflows vertical page content area (exceeds ${totalRowsAvailable} baseline rows)`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Deterministically finds the first available slot that fits the given dimensions.
   */
  public static findNextAvailableSlot(
    grid: PageGrid,
    requiredColumnSpan: number,
    requiredRows: number,
    occupiedBlocks: { columnStart: number; columnSpan: number; rowStart: number; rowSpan: number }[],
    maxRows: number = 80
  ): { columnStart: number; rowStart: number } | null {
    const maxColStart = grid.columnCount - requiredColumnSpan + 1;
    if (maxColStart < 1) return null;

    for (let row = 0; row < maxRows; row++) {
      for (let col = 1; col <= maxColStart; col++) {
        const candidate = {
          columnStart: col,
          columnSpan: requiredColumnSpan,
          rowStart: row,
          rowSpan: requiredRows,
        };

        if (!this.checkGridCollisions(candidate, occupiedBlocks)) {
          return { columnStart: col, rowStart: row };
        }
      }
    }

    return null;
  }
}
