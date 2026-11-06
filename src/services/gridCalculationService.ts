/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Strict Constraint-Based Newspaper Grid Calculation Service
 * Handles deterministic column geometries, snapping, boundary verification, and collision detection.
 */

import { PageGrid, NewspaperTemplate } from '../types/edition';

// Standard 96 DPI pixel-to-millimeter ratio (1 inch = 25.4 mm = 96 px => ~3.7795 px/mm)
// For editorial canvas, we use a calibrated 2.0x display scale factor for crisp broadsheet and tabloid rendering.
export const MM_TO_PX_RATIO = 2.0;

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
    heightMm: 430,
    defaultColumns: 5,
  },
  Compact: {
    format: 'Custom',
    widthMm: 310,
    heightMm: 470,
    defaultColumns: 6,
  },
};

export class GridCalculationService {
  public static readonly MM_TO_PX_RATIO = MM_TO_PX_RATIO;

  /**
   * Calculates precise grid coordinates from template definitions.
   */
  public static calculatePageGrid(template: NewspaperTemplate, scale: number = MM_TO_PX_RATIO): PageGrid {
    const pageWidth = Math.round(template.pageWidthMm * scale);
    const pageHeight = Math.round(template.pageHeightMm * scale);

    const margins = {
      top: Math.round(template.pageMarginsMm.top * scale),
      bottom: Math.round(template.pageMarginsMm.bottom * scale),
      left: Math.round(template.pageMarginsMm.left * scale),
      right: Math.round(template.pageMarginsMm.right * scale),
    };

    const contentWidth = Math.max(10, pageWidth - margins.left - margins.right);
    const contentHeight = Math.max(10, pageHeight - margins.top - margins.bottom);

    const columnCount = Math.max(1, template.columnCount || 6);
    const gutterWidth = Math.max(2, Math.round(template.columnGutterMm * scale));

    // contentWidth = (columnCount * columnWidth) + ((columnCount - 1) * gutterWidth)
    const totalGutterSpace = (columnCount - 1) * gutterWidth;
    const availableColSpace = Math.max(columnCount * 10, contentWidth - totalGutterSpace);
    const columnWidth = Math.floor((availableColSpace / columnCount) * 10) / 10;

    const baselineGrid = Math.max(4, Math.round((template.baselineGridPt || 8) * (scale / 1.5)));

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
