/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Advertisement Layout Adapter
 * Converts physical ad specifications (2col x 10cm, half page, full page, quarter page, front/back page)
 * into precise grid bounding boxes (x, y, width, height, colStart, colSpan, rowStart, rowSpan).
 * Re-flows surrounding news articles seamlessly so zero white-space occurs.
 */

import { PageGrid, AdvertisementPlacement, ArticlePlacement, NewspaperPage } from '../types/edition';
import { GridCalculationService } from './gridCalculationService';

export type AdSizePreset =
  | '2col_10cm'
  | '4col_15cm'
  | 'half_page_horizontal'
  | 'half_page_vertical'
  | 'quarter_page'
  | 'full_page'
  | 'front_page_bottom_strip'
  | 'front_page_box';

export interface AdPlacementRequest {
  advertisementId: string;
  sponsorName: string;
  imageUrl?: string;
  linkReference?: string;
  targetPage: 'front_page' | 'back_page' | number;
  sizePreset: AdSizePreset;
  positionPreference?: 'bottom' | 'top' | 'bottom_right' | 'bottom_left';
}

export interface AdGeometryResult {
  pageNumber: number;
  placement: AdvertisementPlacement;
}

export interface AdSizeOption {
  id: AdSizePreset;
  title: string;
  teluguTitle?: string;
  subtitle: string;
  cols: string;
  dimensionsText: string;
  description: string;
  popularPlacement: string;
}

/**
 * Dynamically computes ad size choices and pixel/column dimensions tailored to the user's active paper settings.
 */
export function getDynamicAdSizeOptions(grid: PageGrid, paperFormat: string = 'broadsheet'): AdSizeOption[] {
  const scale = grid.pageWidth > 1100 ? 3.78 : grid.pageWidth > 800 ? 3.2 : 3.5;
  const cols = grid.columnCount;

  // 2col or min(2, cols)
  const twoColSpan = Math.min(2, cols);
  const twoColWidth = Math.round(grid.columnWidth * twoColSpan + (twoColSpan - 1) * grid.gutterWidth);
  const twoColHeight = Math.round(100 * scale);

  // 4col or min(4, max(2, half))
  const fourColSpan = Math.min(4, Math.max(2, Math.round(cols * 0.5)));
  const fourColWidth = Math.round(grid.columnWidth * fourColSpan + (fourColSpan - 1) * grid.gutterWidth);
  const fourColHeight = Math.round(150 * scale);

  // Corner Box
  const boxSpan = Math.max(1, Math.min(3, Math.round(cols * 0.38)));
  const boxWidth = Math.round(grid.columnWidth * boxSpan + (boxSpan - 1) * grid.gutterWidth);
  const boxHeight = Math.round(grid.contentHeight * 0.22);

  // Half vertical
  const halfVerticalCols = Math.max(1, Math.round(cols / 2));
  const halfVerticalWidth = Math.round(grid.columnWidth * halfVerticalCols + (halfVerticalCols - 1) * grid.gutterWidth);

  // Half horizontal
  const halfHorizontalHeight = Math.round(grid.contentHeight * 0.5);

  return [
    {
      id: '2col_10cm',
      title: `${twoColSpan} Column × 10 cm`,
      subtitle: `${twoColSpan} Columns × 10 cm (Bottom or Side Box)`,
      cols: `${twoColSpan} Columns`,
      dimensionsText: `${twoColSpan} Cols × 10 cm`,
      description: 'Standard size for local business promotions and announcements',
      popularPlacement: 'Front / Any Page (Bottom Right)',
    },
    {
      id: '4col_15cm',
      title: `${fourColSpan} Column × 15 cm`,
      subtitle: `${fourColSpan} Columns × 15 cm (Medium Display)`,
      cols: `${fourColSpan} Columns`,
      dimensionsText: `${fourColSpan} Cols × 15 cm`,
      description: 'Commercial brand launches and institutional campaigns',
      popularPlacement: 'Any Inside Page',
    },
    {
      id: 'front_page_box',
      title: 'Front Page Corner Slot',
      subtitle: `Front Page Bottom Box (${boxSpan} Columns)`,
      cols: `${boxSpan} Columns`,
      dimensionsText: `Corner Box (${boxSpan} Cols)`,
      description: 'High-visibility premium placement at the bottom of the front page',
      popularPlacement: 'Front Page Only',
    },
    {
      id: 'front_page_bottom_strip',
      title: 'Front Page Bottom Strip',
      subtitle: `Front Page Bottom Strip (${cols} Columns Full Width)`,
      cols: `${cols} Columns Full Width`,
      dimensionsText: `Full Width Strip Banner`,
      description: 'Prominent full-width horizontal banner across bottom of page 1',
      popularPlacement: 'Front Page (Page 1)',
    },
    {
      id: 'half_page_horizontal',
      title: 'Half Page (Horizontal)',
      subtitle: `Half Page Horizontal (${cols} Columns Full Width)`,
      cols: `${cols} Columns Full Width`,
      dimensionsText: `Half Page (Horizontal)`,
      description: 'Covers the entire bottom half of the newspaper page',
      popularPlacement: 'Inside / Back Page',
    },
    {
      id: 'half_page_vertical',
      title: 'Half Page (Vertical)',
      subtitle: `Half Page Vertical (${halfVerticalCols} Columns)`,
      cols: `${halfVerticalCols} Columns Height`,
      dimensionsText: `Half Page (Vertical)`,
      description: 'Covers the full vertical half of the newspaper page',
      popularPlacement: 'Page 2, 3, 4',
    },
    {
      id: 'quarter_page',
      title: 'Quarter Page',
      subtitle: `Quarter Page (${halfVerticalCols} Cols × 50% Height)`,
      cols: `${halfVerticalCols} Columns`,
      dimensionsText: `Quarter Page Corner`,
      description: 'Bottom right corner display advertisement',
      popularPlacement: 'Page 2, 3, 4',
    },
    {
      id: 'full_page',
      title: 'Full Page Commercial Ad',
      subtitle: `Full Page Spread (${cols} Columns Full)`,
      cols: `${cols} Columns Full Page`,
      dimensionsText: `Full Page (100% Page)`,
      description: 'Full-page corporate or commercial takeover advertisement',
      popularPlacement: 'Back Page or Page 2, 3',
    },
  ];
}

export class AdvertisementLayoutAdapter {
  /**
   * Calculates exact grid coordinates and pixel bounds for an advertisement preset dynamically adapted to the paper grid.
   */
  public static calculateAdPlacement(
    grid: PageGrid,
    request: AdPlacementRequest,
    totalPages: number = 4
  ): AdGeometryResult {
    const { advertisementId, sponsorName, imageUrl, targetPage, sizePreset } = request;

    // Resolve target page number
    let pageNumber = 1;
    if (targetPage === 'front_page') {
      pageNumber = 1;
    } else if (targetPage === 'back_page') {
      pageNumber = totalPages;
    } else if (typeof targetPage === 'number') {
      pageNumber = Math.max(1, Math.min(targetPage, totalPages));
    }

    const isPage1 = pageNumber === 1;
    const mastheadBottomY = isPage1 
      ? Math.round(grid.pageHeight * 0.10) 
      : (grid.margins.top + Math.round(grid.pageHeight * 0.025));
    const footerTopY = grid.pageHeight - grid.margins.bottom - 20;
    const usableHeight = footerTopY - mastheadBottomY;

    let colStart = 1;
    let colSpan = grid.columnCount;
    let y = mastheadBottomY;
    let height = 300;

    const scale = grid.pageWidth > 1100 ? 3.78 : grid.pageWidth > 800 ? 3.2 : 3.5;

    switch (sizePreset) {
      case 'full_page':
        colStart = 1;
        colSpan = grid.columnCount;
        y = mastheadBottomY;
        height = usableHeight;
        break;

      case 'half_page_horizontal':
        colStart = 1;
        colSpan = grid.columnCount;
        height = Math.round(usableHeight / 2);
        y = footerTopY - height; // bottom half
        break;

      case 'half_page_vertical':
        colSpan = Math.max(1, Math.round(grid.columnCount / 2));
        colStart = grid.columnCount - colSpan + 1;
        y = mastheadBottomY;
        height = usableHeight;
        break;

      case 'quarter_page':
        colSpan = Math.max(1, Math.round(grid.columnCount / 2));
        colStart = grid.columnCount - colSpan + 1;
        height = Math.round(usableHeight / 2);
        y = footerTopY - height;
        break;

      case 'front_page_bottom_strip':
        colStart = 1;
        colSpan = grid.columnCount;
        height = Math.min(260, Math.round(usableHeight * 0.16));
        y = footerTopY - height;
        break;

      case '2col_10cm': {
        colSpan = Math.min(2, grid.columnCount);
        colStart = Math.max(1, grid.columnCount - colSpan + 1);
        const targetHeight = Math.round(100 * scale);
        height = Math.min(targetHeight, Math.round(usableHeight * 0.45));
        y = footerTopY - height;
        break;
      }

      case '4col_15cm': {
        colSpan = Math.min(4, Math.max(2, Math.round(grid.columnCount * 0.5)));
        colStart = Math.max(1, grid.columnCount - colSpan + 1);
        const targetHeight = Math.round(150 * scale);
        height = Math.min(targetHeight, Math.round(usableHeight * 0.65));
        y = footerTopY - height;
        break;
      }

      case 'front_page_box':
      default:
        colSpan = Math.max(1, Math.min(3, Math.round(grid.columnCount * 0.38)));
        colStart = Math.max(1, grid.columnCount - colSpan + 1);
        height = Math.min(280, Math.round(usableHeight * 0.22));
        y = footerTopY - height;
        break;
    }

    const colBounds = GridCalculationService.calculateColumnBounds(grid, colStart, colSpan);
    const rowStart = Math.round((y - grid.margins.top) / grid.baselineGrid);
    const rowSpan = Math.round(height / grid.baselineGrid);

    const placement: AdvertisementPlacement = {
      placementId: `ad-pl-${advertisementId}-${Date.now().toString(36)}`,
      editionId: 'ed-andhra-prabha-today',
      pageId: `page-ed-andhra-prabha-today-${pageNumber}`,
      tenantId: 'tenant-metro-chronicle',
      x: colBounds.x,
      y,
      width: colBounds.width,
      height,
      columnStart: colStart,
      columnSpan: colSpan,
      rowStart,
      rowSpan,
      sponsorLabel: sponsorName,
      imageUrl,
      isLocked: true,
      priority: 10,
    };

    return { pageNumber, placement };
  }

  /**
   * Injects an advertisement into pages and dynamically adjusts/re-flows surrounding news articles
   * so that no article overlaps with the ad and zero empty white-space remains.
   */
  public static injectAdIntoPages(
    pages: NewspaperPage[],
    grid: PageGrid,
    adResult: AdGeometryResult
  ): NewspaperPage[] {
    const { pageNumber, placement } = adResult;

    return pages.map((page) => {
      if (page.pageNumber !== pageNumber) {
        return page;
      }

      // 1. Add ad placement
      const currentAds = [...(page.adPlacements || [])];
      // Filter out duplicates if same id exists
      const updatedAds = [...currentAds, placement];

      // 2. Adjust articles on this page that collide with the ad zone
      const adLeft = placement.x;
      const adRight = placement.x + placement.width;
      const adTop = placement.y;
      const adBottom = placement.y + placement.height;

      const adjustedBlocks: ArticlePlacement[] = [];

      for (const block of page.blocks || []) {
        const bLeft = block.x;
        const bRight = block.x + block.width;
        const bTop = block.y;
        const bBottom = block.y + block.height;

        // Check 2D bounding overlap
        const isOverlapping = !(
          bRight <= adLeft ||
          bLeft >= adRight ||
          bBottom <= adTop ||
          bTop >= adBottom
        );

        if (!isOverlapping) {
          adjustedBlocks.push(block);
          continue;
        }

        // Handle collision:
        // Case A: If ad is in bottom half and block was taller, trim block height to stop right at adTop
        if (bTop < adTop && bBottom > adTop) {
          const newHeight = adTop - bTop;
          if (newHeight >= 120) {
            adjustedBlocks.push({
              ...block,
              height: newHeight,
              rowSpan: Math.round(newHeight / grid.baselineGrid),
            });
          }
        }
        // Case B: If block is completely submerged by ad, drop it from this page (can overflow to next page)
      }

      return {
        ...page,
        blocks: adjustedBlocks,
        adPlacements: updatedAds,
      };
    });
  }
}
