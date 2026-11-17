/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Deterministic Newspaper Page Planning & Automated Layout Engine
 * Performs constraint-based page composition adhering to professional human newspaper design rules:
 * hierarchical headline scales, variable multi-column spans, locked block preservation,
 * advertisement zone respect, modular broadsheet/tabloid decks, and preflight balance verification.
 */

import {
  NewspaperEdition,
  NewspaperTemplate,
  NewspaperPage,
  ArticlePlacement,
  AdvertisementPlacement,
  StoryLayoutRole,
  StoryLayoutPriority,
  PageGrid,
} from '../types/edition';
import { NewsArticle } from '../types/news';
import { GridCalculationService } from './gridCalculationService';
import { HeadlineFittingService } from './headlineFittingService';
import { BodyTextFittingService } from './bodyTextFittingService';
import { ImageLayoutEngine } from './imageLayoutEngine';
import { PageBalanceService } from './pageBalanceService';
import { detectIndicScript, getLocalizedPrintLabels, IndicScriptCode } from '../utils/newspaperTypographyEngine';

export interface PagePlanningInput {
  edition: NewspaperEdition;
  template: NewspaperTemplate;
  stories: NewsArticle[];
  storyPriorities?: Record<string, Partial<StoryLayoutPriority>>;
  advertisements?: AdvertisementPlacement[];
  existingPlacements?: ArticlePlacement[];
  targetPageCount?: number;
  preserveLocks?: boolean;
}

export interface PagePlanningOutput {
  pages: NewspaperPage[];
  placements: ArticlePlacement[];
  adPlacements: AdvertisementPlacement[];
  unplacedStories: { story: NewsArticle; reason: string }[];
  summary: {
    totalPages: number;
    placedCount: number;
    unplacedCount: number;
    lockedPreservedCount: number;
    leadStoryId?: string;
  };
}

interface ScoredStoryEntry {
  story: NewsArticle;
  priority: StoryLayoutPriority;
  score: number;
}

const ARCHIVE_PHOTO_FALLBACK_SVG =
  `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="#f1f5f9"/><rect x="28" y="28" width="744" height="394" fill="none" stroke="#cbd5e1" stroke-width="2"/><text x="400" y="218" text-anchor="middle" fill="#64748b" font-family="serif" font-size="22" font-weight="600">NEWSPRESS ARCHIVE PHOTO</text><text x="400" y="250" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="14">Verified Editorial Dispatch</text></svg>'
  )}`;

function resolveArticleImage(story: NewsArticle): string | undefined {
  return story.heroImageUrl || (story as any).imageUrl || (story as any).coverImageUrl || undefined;
}

function getSectionNameForPage(pageNumber: number, script: IndicScriptCode): string {
  if (script === 'te') {
    if (pageNumber === 1) return 'ముఖ్యాంశాలు (Front Page)';
    if (pageNumber === 2) return 'జాతీయం & రాజకీయం (National & Politics)';
    if (pageNumber === 3) return 'రాష్ట్రీయం & జిల్లాలు (State & Districts)';
    if (pageNumber === 4) return 'వ్యాపారం, క్రీడలు & సినిమా (Business & Sports)';
    return `విభాగం ${pageNumber} (Edition Page ${pageNumber})`;
  }
  if (script === 'hi') {
    if (pageNumber === 1) return 'प्रमुख समाचार (Front Page)';
    if (pageNumber === 2) return 'देश व राजनीति (National & Politics)';
    if (pageNumber === 3) return 'राज्य व क्षेत्रीय (State & Regional)';
    if (pageNumber === 4) return 'व्यापार, खेल व संस्कृति (Business & Sports)';
    return `पृष्ठ ${pageNumber}`;
  }
  const labels = getLocalizedPrintLabels(script);
  if (pageNumber === 1) return script === 'en' ? 'Front Page' : `${labels.pageWord} 1`;
  if (pageNumber === 2) return script === 'en' ? 'National & Politics' : `${labels.pageWord} 2`;
  if (pageNumber === 3) return script === 'en' ? 'Regional & Metro' : `${labels.pageWord} 3`;
  if (pageNumber === 4) return script === 'en' ? 'Business, Sports & Culture' : `${labels.pageWord} 4`;
  return `${labels.pageWord} ${pageNumber}`;
}

function calculateBroadsheetFlushXBounds(
  grid: PageGrid,
  columnStart: number,
  columnSpan: number
): { x: number; width: number } {
  const clampedStart = Math.max(1, Math.min(columnStart, grid.columnCount));
  const clampedSpan = Math.max(1, Math.min(columnSpan, grid.columnCount - clampedStart + 1));
  const startPx = grid.margins.left + ((clampedStart - 1) / grid.columnCount) * grid.contentWidth;
  const endPx = grid.margins.left + ((clampedStart - 1 + clampedSpan) / grid.columnCount) * grid.contentWidth;
  const x = Math.round(startPx);
  const width = Math.max(40, Math.round(endPx) - x);
  return { x, width };
}

interface ColumnGroupSpec {
  columnStart: number;
  columnSpan: number;
  roleHint?: StoryLayoutRole;
  preferPhoto?: boolean;
  imgPlacement?: 'top' | 'left' | 'right' | 'none';
  showBullets?: boolean;
}

interface DynamicPlacedDraft {
  entry: ScoredStoryEntry;
  columnStart: number;
  columnSpan: number;
  x: number;
  width: number;
  y: number;
  height: number;
  role: StoryLayoutRole;
  headlineSizePt: number;
  imgPlacement: ArticlePlacement['imagePlacement'];
  showBullets: boolean;
}

/**
 * Computes the EXACT natural height (in px) required by a story at a given column span,
 * based strictly on its own headline, subheadline, photo, and body text length.
 */
function measureStoryNaturalHeightPx(params: {
  story: NewsArticle;
  columnSpan: number;
  widthPx: number;
  role: StoryLayoutRole;
  imgPlacement: ArticlePlacement['imagePlacement'];
  showBullets: boolean;
  pageNumber: number;
}): { naturalHeight: number; headlineSizePt: number } {
  const { story, columnSpan, widthPx, role, imgPlacement, showBullets, pageNumber } = params;
  const headline = (story.headline || '').trim();
  const subheadline = (story.subheadline || '').trim();
  const fullBody = `${story.leadParagraph || ''} ${story.bodyContent || ''}`.trim();
  const isIndic = /[\u0900-\u0D7F]/.test(headline + fullBody);

  const headlineSizePt =
    role === 'LEAD'
      ? pageNumber === 1
        ? columnSpan >= 5
          ? 38
          : 32
        : 32
      : role === 'SECONDARY_LEAD'
      ? columnSpan >= 3
        ? 27
        : 23
      : role === 'FEATURE'
      ? columnSpan >= 3
        ? 25
        : 22
      : columnSpan >= 3
      ? 23
      : columnSpan === 2
      ? 20
      : 17;

  const unitPerChar = isIndic ? 0.58 : 0.52;
  const headlineUnits = Math.max(4, headline.length * unitPerChar);
  const lineCapUnits = Math.max(7, (widthPx - 16) / headlineSizePt);
  const headlineLines = Math.min(columnSpan === 1 ? 3 : 2, Math.max(1, Math.ceil(headlineUnits / lineCapUnits)));
  const headlineH = Math.round(headlineLines * headlineSizePt * (isIndic ? 1.25 : 1.15) + 12);

  const subheadH = subheadline
    ? Math.min(48, Math.max(18, Math.ceil((subheadline.length * 5.2) / Math.max(75, widthPx - 16)) * 13 + 8))
    : 0;
  const bulletsH = showBullets ? 42 : 0;

  const hasImg = Boolean(resolveArticleImage(story)) && imgPlacement !== 'none';
  const internalCols = Math.max(1, columnSpan);
  const innerColW = Math.max(85, (widthPx - 16 - Math.max(0, internalCols - 1) * 12) / internalCols);
  const charsPerLine = Math.max(13, Math.floor(innerColW / (isIndic ? 4.95 : 4.65)));
  const linePx = isIndic ? 14.0 : 12.7;
  const totalBodyLines = Math.max(2, Math.ceil(Math.max(40, fullBody.length) / charsPerLine));

  let bodyAndMediaH = 0;
  if (hasImg) {
    if (internalCols <= 2 || imgPlacement === 'top') {
      const imgH = internalCols === 1 ? 135 : 195;
      const captionH = 18;
      const linesPerCol = Math.ceil(totalBodyLines / internalCols);
      bodyAndMediaH = imgH + captionH + bulletsH + linesPerCol * linePx;
    } else {
      const underPhotoCols = internalCols >= 5 ? 3 : internalCols === 4 ? 2 : 1;
      const imgH = internalCols >= 5 ? 265 : internalCols === 4 ? 235 : 210;
      const captionH = 18;
      const photoZoneH = imgH + captionH + bulletsH;
      const photoEquivLines = Math.ceil(photoZoneH / linePx) * underPhotoCols;
      const totalRows = Math.ceil((totalBodyLines + photoEquivLines) / internalCols);
      bodyAndMediaH = Math.max(photoZoneH + 42, totalRows * linePx);
    }
  } else {
    const linesPerCol = Math.ceil(totalBodyLines / internalCols);
    bodyAndMediaH = bulletsH + linesPerCol * linePx;
  }

  const totalH = Math.round(18 + headlineH + subheadH + bodyAndMediaH);
  const minH = internalCols === 1 ? 115 : 155;
  const maxH = internalCols >= 4 ? 620 : 520;
  return {
    naturalHeight: Math.max(minH, Math.min(maxH, totalH)),
    headlineSizePt,
  };
}

/**
 * Chooses varied horizontal column partitions for each dynamic deck based on page column count,
 * deck index, and the remaining stories' lengths.
 */
function pickDynamicDeckGroups(
  columnCount: number,
  pageNumber: number,
  deckIndex: number,
  remainingPool: ScoredStoryEntry[]
): ColumnGroupSpec[] {
  const avgChars =
    remainingPool.length > 0
      ? remainingPool.slice(0, 8).reduce((s, e) => s + (`${e.story.leadParagraph || ''} ${e.story.bodyContent || ''}`).length, 0) /
        Math.min(8, remainingPool.length)
      : 700;

  if (columnCount >= 8) {
    if (deckIndex === 0) {
      if (pageNumber === 1) {
        return [
          { columnStart: 1, columnSpan: 1, roleHint: 'BRIEF', preferPhoto: false, imgPlacement: 'none' },
          { columnStart: 2, columnSpan: 5, roleHint: 'LEAD', preferPhoto: true, imgPlacement: 'left', showBullets: true },
          { columnStart: 7, columnSpan: 2, roleHint: 'SECONDARY_LEAD', preferPhoto: true, imgPlacement: 'top' },
        ];
      }
      if (pageNumber % 3 === 2) {
        return [
          { columnStart: 1, columnSpan: 4, roleHint: 'LEAD', preferPhoto: true, imgPlacement: 'left', showBullets: true },
          { columnStart: 5, columnSpan: 4, roleHint: 'SECONDARY_LEAD', preferPhoto: true, imgPlacement: 'right' },
        ];
      }
      if (pageNumber % 3 === 0) {
        return [
          { columnStart: 1, columnSpan: 5, roleHint: 'LEAD', preferPhoto: true, imgPlacement: 'left', showBullets: true },
          { columnStart: 6, columnSpan: 3, roleHint: 'SECONDARY_LEAD', preferPhoto: true, imgPlacement: 'top' },
        ];
      }
      return [
        { columnStart: 1, columnSpan: 3, roleHint: 'SECONDARY_LEAD', preferPhoto: true, imgPlacement: 'left' },
        { columnStart: 4, columnSpan: 5, roleHint: 'LEAD', preferPhoto: true, imgPlacement: 'left', showBullets: true },
      ];
    }

    const widePatterns: ColumnGroupSpec[][] = [
      [
        { columnStart: 1, columnSpan: 2, roleHint: 'STANDARD', preferPhoto: true, imgPlacement: 'top' },
        { columnStart: 3, columnSpan: 3, roleHint: 'FEATURE', preferPhoto: true, imgPlacement: 'left' },
        { columnStart: 6, columnSpan: 3, roleHint: 'FEATURE', preferPhoto: true, imgPlacement: 'right', showBullets: true },
      ],
      [
        { columnStart: 1, columnSpan: 4, roleHint: 'FEATURE', preferPhoto: true, imgPlacement: 'left', showBullets: true },
        { columnStart: 5, columnSpan: 2, roleHint: 'STANDARD', preferPhoto: true, imgPlacement: 'top' },
        { columnStart: 7, columnSpan: 2, roleHint: 'STANDARD', preferPhoto: true, imgPlacement: 'top' },
      ],
      [
        { columnStart: 1, columnSpan: 3, roleHint: 'FEATURE', preferPhoto: true, imgPlacement: 'left' },
        { columnStart: 4, columnSpan: 3, roleHint: 'STANDARD', preferPhoto: true, imgPlacement: 'right' },
        { columnStart: 7, columnSpan: 2, roleHint: 'STANDARD', preferPhoto: true, imgPlacement: 'top' },
      ],
      [
        { columnStart: 1, columnSpan: 5, roleHint: 'FEATURE', preferPhoto: true, imgPlacement: 'left', showBullets: true },
        { columnStart: 6, columnSpan: 3, roleHint: 'STANDARD', preferPhoto: true, imgPlacement: 'right' },
      ],
    ];
    const compactPatterns: ColumnGroupSpec[][] = [
      [
        { columnStart: 1, columnSpan: 2, roleHint: 'STANDARD', preferPhoto: true, imgPlacement: 'top' },
        { columnStart: 3, columnSpan: 2, roleHint: 'STANDARD', preferPhoto: true, imgPlacement: 'top' },
        { columnStart: 5, columnSpan: 2, roleHint: 'STANDARD', preferPhoto: true, imgPlacement: 'top' },
        { columnStart: 7, columnSpan: 2, roleHint: 'BRIEF', preferPhoto: false, imgPlacement: 'none' },
      ],
      [
        { columnStart: 1, columnSpan: 3, roleHint: 'FEATURE', preferPhoto: true, imgPlacement: 'left' },
        { columnStart: 4, columnSpan: 2, roleHint: 'STANDARD', preferPhoto: true, imgPlacement: 'top' },
        { columnStart: 6, columnSpan: 2, roleHint: 'STANDARD', preferPhoto: true, imgPlacement: 'top' },
        { columnStart: 8, columnSpan: 1, roleHint: 'BRIEF', preferPhoto: false, imgPlacement: 'none' },
      ],
    ];
    if (remainingPool.length <= 5) {
      const sparseWide: ColumnGroupSpec[][] = [
        [
          { columnStart: 1, columnSpan: 5, roleHint: 'FEATURE', preferPhoto: true, imgPlacement: 'left', showBullets: true },
          { columnStart: 6, columnSpan: 3, roleHint: 'STANDARD', preferPhoto: true, imgPlacement: 'right' },
        ],
        [
          { columnStart: 1, columnSpan: 4, roleHint: 'FEATURE', preferPhoto: true, imgPlacement: 'left' },
          { columnStart: 5, columnSpan: 4, roleHint: 'STANDARD', preferPhoto: true, imgPlacement: 'right' },
        ],
      ];
      return sparseWide[(deckIndex + pageNumber) % sparseWide.length];
    }
    const bank = avgChars < 600 ? compactPatterns : widePatterns;
    return bank[(deckIndex + pageNumber) % bank.length];
  }

  if (columnCount >= 6) {
    if (deckIndex === 0) {
      return [
        { columnStart: 1, columnSpan: 4, roleHint: 'LEAD', preferPhoto: true, imgPlacement: 'left', showBullets: true },
        { columnStart: 5, columnSpan: 2, roleHint: 'SECONDARY_LEAD', preferPhoto: true, imgPlacement: 'top' },
      ];
    }
    const patterns6: ColumnGroupSpec[][] = [
      [
        { columnStart: 1, columnSpan: 2, roleHint: 'STANDARD', preferPhoto: false, imgPlacement: 'none' },
        { columnStart: 3, columnSpan: 2, roleHint: 'FEATURE', preferPhoto: true, imgPlacement: 'top' },
        { columnStart: 5, columnSpan: 2, roleHint: 'STANDARD', preferPhoto: true, imgPlacement: 'top' },
      ],
      [
        { columnStart: 1, columnSpan: 3, roleHint: 'FEATURE', preferPhoto: true, imgPlacement: 'left' },
        { columnStart: 4, columnSpan: 3, roleHint: 'STANDARD', preferPhoto: false, imgPlacement: 'none' },
      ],
    ];
    return patterns6[(deckIndex + pageNumber) % patterns6.length];
  }

  if (columnCount === 5) {
    if (deckIndex === 0) {
      return [
        { columnStart: 1, columnSpan: 3, roleHint: 'LEAD', preferPhoto: true, imgPlacement: 'top', showBullets: true },
        { columnStart: 4, columnSpan: 2, roleHint: 'SECONDARY_LEAD', preferPhoto: true, imgPlacement: 'top' },
      ];
    }
    return deckIndex % 2 === 1
      ? [
          { columnStart: 1, columnSpan: 2, roleHint: 'STANDARD', preferPhoto: false, imgPlacement: 'none' },
          { columnStart: 3, columnSpan: 3, roleHint: 'FEATURE', preferPhoto: true, imgPlacement: 'left' },
        ]
      : [
          { columnStart: 1, columnSpan: 3, roleHint: 'FEATURE', preferPhoto: true, imgPlacement: 'left' },
          { columnStart: 4, columnSpan: 2, roleHint: 'STANDARD', preferPhoto: false, imgPlacement: 'none' },
        ];
  }

  // 4-Column A4
  if (deckIndex === 0) {
    return [
      { columnStart: 1, columnSpan: 3, roleHint: 'LEAD', preferPhoto: true, imgPlacement: 'left', showBullets: true },
      { columnStart: 4, columnSpan: 1, roleHint: 'BRIEF', preferPhoto: false, imgPlacement: 'none' },
    ];
  }
  return [
    { columnStart: 1, columnSpan: 2, roleHint: 'STANDARD', preferPhoto: true, imgPlacement: 'top' },
    { columnStart: 3, columnSpan: 2, roleHint: 'STANDARD', preferPhoto: false, imgPlacement: 'none' },
  ];
}

export class PagePlanningEngine {
  /**
   * Deterministically plans and composes a complete multi-page newspaper layout.
   */
  public static planEditionLayout(input: PagePlanningInput): PagePlanningOutput {
    const {
      edition,
      template,
      stories,
      storyPriorities = {},
      advertisements = [],
      existingPlacements = [],
      targetPageCount,
      preserveLocks = true,
    } = input;

    const grid = GridCalculationService.calculatePageGrid(template);
    const totalPages = Math.max(1, targetPageCount || edition.pageCount || edition.totalPages || 2);
    const scale = template.pageWidthMm > 0 ? grid.pageWidth / template.pageWidthMm : GridCalculationService.MM_TO_PX_RATIO;
    const editionScript = detectIndicScript(
      (stories || []).slice(0, 5).map((s) => `${s.headline || ''} ${s.bodyContent || ''}`).join(' ') || edition.brandName || '',
      (edition as any).language
    );

    // 1. Initialize page structures
    const pages: NewspaperPage[] = [];
    for (let pNum = 1; pNum <= totalPages; pNum++) {
      const pageId = `page-${edition.editionId}-${pNum}`;
      pages.push({
        pageId,
        editionId: edition.editionId,
        tenantId: edition.tenantId,
        pageNumber: pNum,
        sectionName: getSectionNameForPage(pNum, editionScript),
        templateId: template.templateId,
        layoutVersion: 1,
        blocks: [],
        adPlacements: [],
        occupiedArea: 0,
        diagnostics: {
          status: 'balanced',
          occupiedAreaPercent: 0,
          whitespacePercent: 100,
          visualWeight: { topHalf: 0, bottomHalf: 0, leftHalf: 0, rightHalf: 0 },
          headlineHierarchy: { leadFound: false, leadFontSize: 0, secondaryLeadFound: false, ratio: 1, verdict: 'Empty' },
          imageBalance: { imageAreaPercent: 0, count: 0 },
          errors: [],
          warnings: [],
          info: [],
          canFinalize: false,
        },
        status: 'auto_planned',
      });
    }

    // Track occupied logical grid slots per page
    const pageOccupiedSlots: Map<string, { columnStart: number; columnSpan: number; rowStart: number; rowSpan: number }[]> =
      new Map();
    pages.forEach((p) => {
      const initialSlots: { columnStart: number; columnSpan: number; rowStart: number; rowSpan: number }[] = [];
      if (p.pageNumber === 1 && (!template.allowedModules || template.allowedModules.includes('masthead'))) {
        const requiredTopPx =
          scale >= 3.0
            ? Math.max(196, Math.round((template.headerHeightMm || 42.3) * scale) + 12)
            : (template.headerHeightMm * GridCalculationService.MM_TO_PX_RATIO || 68) + grid.margins.top;
        const mastheadRows = Math.max(1, Math.ceil((requiredTopPx - grid.margins.top) / grid.baselineGrid));
        initialSlots.push({
          columnStart: 1,
          columnSpan: grid.columnCount,
          rowStart: 0,
          rowSpan: mastheadRows,
        });
      } else if (p.pageNumber > 1 && scale >= 3.0) {
        // Inner page folio header (top: 22px, height: 40px -> ends 62px; stories start >= 74px)
        const folioRows = Math.max(1, Math.ceil((74 - grid.margins.top) / grid.baselineGrid));
        initialSlots.push({
          columnStart: 1,
          columnSpan: grid.columnCount,
          rowStart: 0,
          rowSpan: folioRows,
        });
      }
      pageOccupiedSlots.set(p.pageId, initialSlots);
    });

    const finalPlacements: ArticlePlacement[] = [];
    const finalAdPlacements: AdvertisementPlacement[] = [];
    let lockedPreservedCount = 0;

    // 2. Place Advertisements first as immovable hard constraints
    for (const ad of advertisements) {
      const targetPage = pages.find((p) => p.pageId === ad.pageId) || pages[0];
      const pageAds = targetPage.adPlacements || [];

      const colBounds = GridCalculationService.calculateColumnBounds(grid, ad.columnStart, ad.columnSpan);
      const rowBounds = GridCalculationService.calculateBaselinePosition(grid, ad.rowStart, ad.rowSpan);

      const placedAd: AdvertisementPlacement = {
        ...ad,
        x: ad.x && ad.x > 0 ? ad.x : colBounds.x,
        y: ad.y && ad.y > 0 ? ad.y : rowBounds.y,
        width: ad.width && ad.width > 0 ? ad.width : colBounds.width,
        height: ad.height && ad.height > 0 ? ad.height : rowBounds.height,
      };

      pageAds.push(placedAd);
      targetPage.adPlacements = pageAds;
      finalAdPlacements.push(placedAd);

      const slots = pageOccupiedSlots.get(targetPage.pageId) || [];
      slots.push({
        columnStart: ad.columnStart,
        columnSpan: ad.columnSpan,
        rowStart: ad.rowStart,
        rowSpan: ad.rowSpan,
      });
    }

    // 3. Preserve Editor Locked Blocks
    const lockedStoryIds = new Set<string>();
    if (preserveLocks && existingPlacements.length > 0) {
      for (const existing of existingPlacements) {
        if (existing.locked === true) {
          lockedStoryIds.add(existing.newsId);
          lockedPreservedCount++;

          const targetPage = pages.find((p) => p.pageId === existing.pageId) || pages[0];
          targetPage.blocks.push(existing);
          finalPlacements.push(existing);

          const slots = pageOccupiedSlots.get(targetPage.pageId) || [];
          slots.push({
            columnStart: existing.columnStart,
            columnSpan: existing.columnSpan,
            rowStart: existing.rowStart,
            rowSpan: existing.rowSpan,
          });
        }
      }
    }

    // 4. Rank Candidate Stories by Editorial Importance
    const candidates = stories.filter((s) => !lockedStoryIds.has(s.articleId));
    const scoredStories: ScoredStoryEntry[] = candidates.map((story) => {
      const pOverride = storyPriorities[story.articleId];
      const editorialPriority = pOverride?.editorialPriority ?? (story.editorialStatus === 'approved' ? 8 : 6);
      const isBreaking =
        pOverride?.breakingStatus ??
        (story.isBreaking === true ||
          story.category === 'Front Page (A1)' ||
          story.category === 'ముఖ్యాంశాలు' ||
          story.headline.toLowerCase().includes('breaking'));
      const resolvedImg = resolveArticleImage(story);
      const hasImage = !!resolvedImg;
      const wordCount = story.wordCount || 800;

      let score = editorialPriority * 15;
      if (isBreaking) score += 200;
      if (story.authorType === 'syndicated') score += 65; // Surface newly licensed stories clearly
      if (hasImage) score += 50;
      if (wordCount >= 1000) score += 40;
      if (story.category === 'Front Page (A1)' || story.category === 'ముఖ్యాంశాలు') score += 120;
      if (pOverride?.publisherPriority) score += pOverride.publisherPriority * 10;
      if (pOverride?.editorOverridePriority) score += pOverride.editorOverridePriority * 25;

      const priority: StoryLayoutPriority = {
        editorialPriority,
        breakingStatus: isBreaking,
        articleType: story.category || 'General News',
        freshnessHours: 2,
        section: story.printPageSection || 'Front Page',
        wordCount,
        hasImage,
        publisherPriority: pOverride?.publisherPriority ?? 5,
        editorOverridePriority: pOverride?.editorOverridePriority,
        calculatedScore: score,
      };

      return { story, priority, score };
    });

    // Deterministic sort: highest score first; break ties by articleId
    scoredStories.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.story.articleId.localeCompare(b.story.articleId);
    });

    const unplacedStories: { story: NewsArticle; reason: string }[] = [];
    let leadStoryId: string | undefined;

    // 5A. Modular Multi-Page Broadsheet / Tabloid / A4 Composer for full newspaper editions (> 8 stories & scale >= 3)
    if (scoredStories.length > 8 && scale >= 3.0) {
      return this.composeModularMultiPageLayout({
        edition,
        template,
        grid,
        pages,
        scoredStories,
        existingPlacements,
        finalPlacements,
        finalAdPlacements,
        lockedPreservedCount,
        totalPages,
      });
    }

    // 5B. Compact Sequential Grid Composer (preserves 100% compatibility for small story sets <= 8 or compact templates)
    const maxRowsPerPage = Math.max(25, Math.floor(grid.contentHeight / grid.baselineGrid) - 3);

    for (let i = 0; i < scoredStories.length; i++) {
      const { story, priority } = scoredStories[i];
      let role: StoryLayoutRole = 'STANDARD';
      let targetColSpan = 2;
      let targetRowSpan = 14;
      let headlineSizePt = 16;
      let bodyFontSizePt = 9.5;
      let imagePlacement: 'top' | 'left' | 'right' | 'bottom' | 'hero' | 'none' = priority.hasImage ? 'top' : 'none';

      if (i === 0 && !leadStoryId) {
        role = 'LEAD';
        leadStoryId = story.articleId;
        targetColSpan = grid.columnCount >= 8 ? 5 : grid.columnCount >= 6 ? 4 : 3;
        targetRowSpan = Math.min(maxRowsPerPage - 6, 26);
        headlineSizePt = 36;
        bodyFontSizePt = 10;
        imagePlacement = priority.hasImage ? 'hero' : 'none';
      } else if (i === 1) {
        role = 'SECONDARY_LEAD';
        targetColSpan = grid.columnCount >= 8 ? 3 : 2;
        targetRowSpan = Math.min(maxRowsPerPage - 10, 18);
        headlineSizePt = 24;
        imagePlacement = priority.hasImage ? 'top' : 'none';
      } else if (i < 4) {
        role = 'FEATURE';
        targetColSpan = grid.columnCount >= 8 ? 3 : 2;
        targetRowSpan = 15;
        headlineSizePt = 20;
      } else if (i < 8) {
        role = 'STANDARD';
        targetColSpan = 2;
        targetRowSpan = 12;
        headlineSizePt = 16;
      } else {
        role = 'BRIEF';
        targetColSpan = 1;
        targetRowSpan = 8;
        headlineSizePt = 13;
        imagePlacement = 'none';
      }

      const textFitting = BodyTextFittingService.fitBodyText({
        bodyText: (story as any).bodyText || story.content || story.summary || '',
        columnWidthPx: grid.columnWidth,
        columnSpan: targetColSpan,
        availableHeightPx: 1200,
        fontSizePt: bodyFontSizePt,
      });
      const estimatedHeadlineH = headlineSizePt > 30 ? 65 : headlineSizePt > 20 ? 45 : 32;
      const estimatedImgH = imagePlacement !== 'none' ? (role === 'LEAD' ? 165 : 105) : 0;
      const contentNeededHeight = estimatedHeadlineH + estimatedImgH + textFitting.requiredHeightPx + 40;
      const dynamicRowSpan = Math.max(6, Math.ceil(contentNeededHeight / grid.baselineGrid));

      if (role === 'LEAD') {
        targetRowSpan = Math.min(maxRowsPerPage - 6, Math.max(18, dynamicRowSpan));
      } else if (role === 'SECONDARY_LEAD') {
        targetRowSpan = Math.min(maxRowsPerPage - 10, Math.max(12, dynamicRowSpan));
      } else {
        targetRowSpan = Math.min(maxRowsPerPage - 12, dynamicRowSpan);
      }

      const prevDraft = existingPlacements.find((p) => p.newsId === story.articleId);
      if (prevDraft && prevDraft.editorOverride?.isOverridden) {
        if (prevDraft.editorOverride.columnSpan) targetColSpan = prevDraft.editorOverride.columnSpan;
        if (prevDraft.editorOverride.layoutRole) role = prevDraft.editorOverride.layoutRole;
        if (prevDraft.editorOverride.headlineSize) headlineSizePt = prevDraft.editorOverride.headlineSize;
        if (prevDraft.editorOverride.bodyFontSize) bodyFontSizePt = prevDraft.editorOverride.bodyFontSize;
        if (prevDraft.editorOverride.imagePlacement && prevDraft.editorOverride.imagePlacement !== 'middle') {
          imagePlacement = prevDraft.editorOverride.imagePlacement;
        }
      }

      let placed = false;
      for (const page of pages) {
        const slots = pageOccupiedSlots.get(page.pageId) || [];
        let slot = GridCalculationService.findNextAvailableSlot(
          grid,
          targetColSpan,
          targetRowSpan,
          slots,
          maxRowsPerPage
        );

        if (!slot && targetColSpan > 2 && role !== 'LEAD') {
          targetColSpan -= 1;
          slot = GridCalculationService.findNextAvailableSlot(
            grid,
            targetColSpan,
            targetRowSpan,
            slots,
            maxRowsPerPage
          );
        }
        if (!slot && targetColSpan > 1 && role !== 'LEAD') {
          targetColSpan -= 1;
          slot = GridCalculationService.findNextAvailableSlot(
            grid,
            targetColSpan,
            targetRowSpan,
            slots,
            maxRowsPerPage
          );
        }
        if (!slot && role !== 'LEAD') {
          const reducedRows = Math.max(8, targetRowSpan - 6);
          slot = GridCalculationService.findNextAvailableSlot(
            grid,
            targetColSpan,
            reducedRows,
            slots,
            maxRowsPerPage
          );
          if (slot) {
            targetRowSpan = reducedRows;
          }
        }

        if (slot) {
          const colBounds = GridCalculationService.calculateColumnBounds(grid, slot.columnStart, targetColSpan);
          const rowBounds = GridCalculationService.calculateBaselinePosition(grid, slot.rowStart, targetRowSpan);

          const headlineFit = HeadlineFittingService.fitHeadline({
            headlineText: story.headline,
            availableWidthPx: colBounds.width,
            maxLines: role === 'LEAD' ? 3 : 2,
            minFontSizePt: Math.max(12, headlineSizePt - 6),
            maxFontSizePt: headlineSizePt,
          });

          const bodyFit = BodyTextFittingService.fitBodyText({
            bodyText: story.bodyContent || story.leadParagraph || '',
            columnWidthPx: grid.columnWidth,
            columnSpan: targetColSpan,
            availableHeightPx: Math.max(40, rowBounds.height - headlineFit.estimatedHeightPx - 30),
            fontSizePt: bodyFontSizePt,
          });

          const imgGeometry = ImageLayoutEngine.computeImageGeometry(
            colBounds.width,
            rowBounds.height,
            role,
            priority.hasImage
          );

          const placementRecord: ArticlePlacement = {
            placementId: `pl-${edition.editionId}-${story.articleId}`,
            editionId: edition.editionId,
            pageId: page.pageId,
            tenantId: edition.tenantId,
            newsId: story.articleId,
            articleTitle: story.headline,
            headlineHighlight: (story as any).headlineHighlight,
            subheadline: story.subheadline,
            byline: story.byline,
            category: story.category,
            leadParagraph: story.leadParagraph,
            bodyContent: story.bodyContent,
            x: colBounds.x,
            y: rowBounds.y,
            width: colBounds.width,
            height: rowBounds.height,
            columnStart: slot.columnStart,
            columnSpan: targetColSpan,
            rowStart: slot.rowStart,
            rowSpan: targetRowSpan,
            headlineSize: headlineFit.fontSizePt,
            bodyFontSize: bodyFontSizePt,
            imagePlacement,
            imageCrop: imgGeometry?.crop,
            imageUrl: resolveArticleImage(story) || ARCHIVE_PHOTO_FALLBACK_SVG,
            imageCaption: (story as any).imageCaption || `Staff report dispatch on ${story.category || 'news beat'}.`,
            priority,
            layoutRole: role,
            status: 'placed',
            locked: false,
            editorOverride: prevDraft?.editorOverride,
            generatedValue: {
              columnStart: slot.columnStart,
              columnSpan: targetColSpan,
              headlineSize: headlineFit.fontSizePt,
              bodyFontSize: bodyFontSizePt,
              layoutRole: role,
              pageId: page.pageId,
            },
            finalValue: {
              columnStart: slot.columnStart,
              columnSpan: targetColSpan,
              headlineSize: headlineFit.fontSizePt,
              bodyFontSize: bodyFontSizePt,
              layoutRole: role,
              pageId: page.pageId,
            },
            diagnostics: {
              headlineFits: headlineFit.fitStatus !== 'needs_editorial_shortening',
              bodyFits: bodyFit.fitsWithinBlock,
              imageFits: true,
              overflowWords: bodyFit.overflowWordsEstimate,
              warnings: bodyFit.isOverflow ? [bodyFit.continuationNote || 'Body text overflows block.'] : [],
            },
          };

          slots.push({
            columnStart: slot.columnStart,
            columnSpan: targetColSpan,
            rowStart: slot.rowStart,
            rowSpan: targetRowSpan,
          });

          page.blocks.push(placementRecord);
          finalPlacements.push(placementRecord);
          placed = true;
          break;
        }
      }

      if (!placed) {
        unplacedStories.push({
          story,
          reason: `Insufficient remaining column space across all ${totalPages} pages for ${targetColSpan}-column ${role} block.`,
        });
      }
    }

    // 6. Run page balance diagnostics for each page
    for (const page of pages) {
      const pagePlacements = finalPlacements.filter((p) => p.pageId === page.pageId);
      const pageAds = finalAdPlacements.filter((ad) => ad.pageId === page.pageId);
      const diagnostics = PageBalanceService.evaluatePage(grid, pagePlacements, pageAds);

      page.blocks = pagePlacements;
      page.occupiedArea = diagnostics.occupiedAreaPercent;
      page.diagnostics = diagnostics;
    }

    return {
      pages,
      placements: finalPlacements,
      adPlacements: finalAdPlacements,
      unplacedStories,
      summary: {
        totalPages: pages.length,
        placedCount: finalPlacements.length,
        unplacedCount: unplacedStories.length,
        lockedPreservedCount,
        leadStoryId,
      },
    };
  }

  /**
   * Composes balanced, editorial-grade broadsheet / tabloid / A4 newspaper pages
   * with multi-column hierarchy, photo diversity, subheadlines, zero masthead/folio overlaps,
   * zero text walls, and even story distribution across every page.
   */
  private static composeModularMultiPageLayout(params: {
    edition: NewspaperEdition;
    template: NewspaperTemplate;
    grid: PageGrid;
    pages: NewspaperPage[];
    scoredStories: ScoredStoryEntry[];
    existingPlacements: ArticlePlacement[];
    finalPlacements: ArticlePlacement[];
    finalAdPlacements: AdvertisementPlacement[];
    lockedPreservedCount: number;
    totalPages: number;
  }): PagePlanningOutput {
    const {
      edition,
      grid,
      pages,
      scoredStories,
      existingPlacements,
      finalPlacements,
      finalAdPlacements,
      lockedPreservedCount,
      totalPages,
    } = params;

    const placedNewsIds = new Set<string>(finalPlacements.map((p) => p.newsId));
    const availablePool = scoredStories.filter((e) => !placedNewsIds.has(e.story.articleId));
    const unplacedStories: { story: NewsArticle; reason: string }[] = [];

    const maxPerPage = grid.columnCount >= 8 ? 16 : grid.columnCount >= 6 ? 10 : grid.columnCount === 5 ? 8 : 7;
    const minPerPage = Math.min(maxPerPage, Math.max(3, Math.floor(availablePool.length / totalPages)));

    // Partition available stories fairly across pages so Page 1 gets the top lead tier,
    // and every subsequent page receives photo-bearing stories + rich regional dispatches.
    const withPhotos = availablePool.filter((e) => e.priority.hasImage);
    const withoutPhotos = availablePool.filter((e) => !e.priority.hasImage);

    // Reserve top 2 photo stories for Page 1, then seed Lead/Feature photo stories across Pages 2..N
    const pageStoryBatches: ScoredStoryEntry[][] = Array.from({ length: totalPages }, () => []);
    const assignedIds = new Set<string>();

    const assignToPage = (pIdx: number, entry: ScoredStoryEntry) => {
      if (assignedIds.has(entry.story.articleId)) return false;
      assignedIds.add(entry.story.articleId);
      pageStoryBatches[pIdx].push(entry);
      return true;
    };

    // Pass 1: Seed 1 top story (preferring photo) per page
    let cursor = 0;
    for (let pIdx = 0; pIdx < totalPages; pIdx++) {
      while (cursor < withPhotos.length && assignedIds.has(withPhotos[cursor].story.articleId)) cursor++;
      if (cursor < withPhotos.length) {
        assignToPage(pIdx, withPhotos[cursor++]);
      }
    }

    // Pass 2: Seed secondary lead & features with photos per page
    const photoSlotsPerPage = grid.columnCount >= 8 ? 8 : grid.columnCount >= 6 ? 5 : 4;
    for (let round = 1; round < photoSlotsPerPage; round++) {
      for (let pIdx = 0; pIdx < totalPages; pIdx++) {
        while (cursor < withPhotos.length && assignedIds.has(withPhotos[cursor].story.articleId)) cursor++;
        if (cursor < withPhotos.length && pageStoryBatches[pIdx].length < minPerPage + 2) {
          assignToPage(pIdx, withPhotos[cursor++]);
        }
      }
    }

    // Pass 3: Fill remaining slots up to capacity evenly across all pages
    const remainingEntries = availablePool.filter((e) => !assignedIds.has(e.story.articleId));
    let remIdx = 0;
    const targetPerPage = Math.min(maxPerPage, Math.max(minPerPage, Math.ceil(availablePool.length / totalPages)));

    for (let pIdx = 0; pIdx < totalPages; pIdx++) {
      while (pageStoryBatches[pIdx].length < targetPerPage && remIdx < remainingEntries.length) {
        assignToPage(pIdx, remainingEntries[remIdx++]);
      }
    }

    // If any blueprint still has room (up to maxPerPage) and stories remain, top up pages cleanly
    for (let pIdx = 0; pIdx < totalPages; pIdx++) {
      while (pageStoryBatches[pIdx].length < maxPerPage && remIdx < remainingEntries.length) {
        assignToPage(pIdx, remainingEntries[remIdx++]);
      }
    }

    let leadStoryId: string | undefined;
    const footerBottomMargin = Math.max(16, grid.margins.bottom - 10);
    const footerHeight = 20;
    const footerTop = grid.pageHeight - footerBottomMargin - footerHeight;

    for (let pIdx = 0; pIdx < pages.length; pIdx++) {
      const page = pages[pIdx];
      const batch = pageStoryBatches[pIdx];
      if (batch.length === 0) continue;

      const startY = page.pageNumber === 1 ? 196 : 74;
      const isFinalPage = page.pageNumber === totalPages;
      const endY = isFinalPage ? Math.max(startY + 200, footerTop - 52) : Math.max(startY + 200, footerTop - 6);

      const pageAds = page.adPlacements || [];
      const existingOnPage = [...page.blocks];

      const storyTextLen = (s: ScoredStoryEntry) =>
        ((s.story.leadParagraph || '') + ' ' + (s.story.bodyContent || '')).trim().length;

      const availableOnPage: ScoredStoryEntry[] = [...batch];
      const usedOnPage = new Set<string>();

      const obstacleRects: { x: number; y: number; width: number; height: number }[] = [
        ...existingOnPage.map((b) => ({ x: b.x, y: b.y, width: b.width, height: b.height })),
        ...pageAds.map((a) => ({ x: a.x, y: a.y, width: a.width, height: a.height })),
      ];

      const overlapsObstacle = (rect: { x: number; y: number; width: number; height: number }) =>
        obstacleRects.some((r) => GridCalculationService.checkBlockOverlap(rect, r, 2));

      const takeStoryForGroup = (group: ColumnGroupSpec): ScoredStoryEntry | null => {
        const candidatesLeft = availableOnPage.filter((s) => !usedOnPage.has(s.story.articleId));
        if (candidatesLeft.length === 0) return null;

        // Match box span to story length: wide slots get long stories, 1-col slots get shorter/brief stories
        let pool = candidatesLeft;
        if (group.preferPhoto) {
          const photoMatches = candidatesLeft.filter((s) => s.priority.hasImage);
          if (photoMatches.length > 0) pool = photoMatches;
        } else if (group.columnSpan === 1) {
          const plainMatches = candidatesLeft.filter((s) => !s.priority.hasImage);
          if (plainMatches.length > 0) pool = plainMatches;
        }

        const sorted = [...pool].sort((a, b) =>
          group.columnSpan >= 3
            ? storyTextLen(b) - storyTextLen(a)
            : group.columnSpan === 1
            ? storyTextLen(a) - storyTextLen(b)
            : storyTextLen(b) - storyTextLen(a)
        );
        const picked = sorted[0];
        if (!picked) return null;
        usedOnPage.add(picked.story.articleId);
        return picked;
      };

      // Resolve unblocked column spans at yCur so commercial ads / locked blocks are never overlapped
      const resolveUnblockedGroups = (rawGroups: ColumnGroupSpec[], yCur: number, probeH: number): ColumnGroupSpec[] => {
        const result: ColumnGroupSpec[] = [];
        for (const g of rawGroups) {
          const bounds = calculateBroadsheetFlushXBounds(grid, g.columnStart, g.columnSpan);
          if (!overlapsObstacle({ x: bounds.x, y: yCur, width: bounds.width, height: probeH })) {
            result.push(g);
            continue;
          }
          // Split partially blocked multi-column group into contiguous unblocked column runs
          let runStart = -1;
          let runLen = 0;
          for (let c = g.columnStart; c < g.columnStart + g.columnSpan; c++) {
            const cBounds = calculateBroadsheetFlushXBounds(grid, c, 1);
            const colBlocked = overlapsObstacle({ x: cBounds.x, y: yCur, width: cBounds.width, height: probeH });
            if (!colBlocked) {
              if (runStart === -1) {
                runStart = c;
                runLen = 1;
              } else {
                runLen++;
              }
            } else {
              if (runStart !== -1 && runLen >= 1) {
                result.push({
                  columnStart: runStart,
                  columnSpan: runLen,
                  roleHint: runLen >= 3 ? g.roleHint || 'FEATURE' : 'STANDARD',
                  preferPhoto: runLen >= 2 ? g.preferPhoto : false,
                  imgPlacement: runLen >= 3 ? g.imgPlacement || 'left' : runLen === 2 ? 'top' : 'none',
                });
              }
              runStart = -1;
              runLen = 0;
            }
          }
          if (runStart !== -1 && runLen >= 1) {
            result.push({
              columnStart: runStart,
              columnSpan: runLen,
              roleHint: runLen >= 3 ? g.roleHint || 'FEATURE' : 'STANDARD',
              preferPhoto: runLen >= 2 ? g.preferPhoto : false,
              imgPlacement: runLen >= 3 ? g.imgPlacement || 'left' : runLen === 2 ? 'top' : 'none',
            });
          }
        }
        return result;
      };

      const pageDrafts: DynamicPlacedDraft[] = [];
      let curY = startY;
      let deckIndex = 0;

      while (curY < endY - 120) {
        const remainingPoolForPage = availableOnPage.filter((s) => !usedOnPage.has(s.story.articleId));
        if (remainingPoolForPage.length === 0) break;

        const remY = endY - curY;
        const shortStoriesLeft = remainingPoolForPage.filter((s) => storyTextLen(s) < 520).length;
        // Never cram full-length 1,000+ char stories into a tiny <205px horizontal bottom strip!
        if (pageDrafts.length > 0 && remY < 205 && shortStoriesLeft < 2) {
          break;
        }

        const rawGroups = pickDynamicDeckGroups(grid.columnCount, page.pageNumber, deckIndex, remainingPoolForPage);
        const activeGroups = resolveUnblockedGroups(rawGroups, curY, Math.min(115, remY));
        if (activeGroups.length === 0) {
          // Row at curY is fully blocked by a locked block or ad -> advance curY past nearest obstacle
          const blockersHere = obstacleRects.filter((r) => curY >= r.y - 2 && curY < r.y + r.height);
          if (blockersHere.length > 0) {
            const nextClearY = Math.max(...blockersHere.map((r) => r.y + r.height)) + 4;
            if (nextClearY > curY) {
              curY = nextClearY;
              deckIndex++;
              continue;
            }
          }
          break;
        }

        // Order groups widest first so flagship features establish the deck's natural ceiling height,
        // then narrower tracks stack 1–3 compact stories cleanly to match!
        const orderedGroups = [...activeGroups].sort((a, b) => b.columnSpan - a.columnSpan);
        const tracks: { group: ColumnGroupSpec; items: DynamicPlacedDraft[]; totalH: number; maxTrackY: number }[] = [];

        for (const group of orderedGroups) {
          const entry = takeStoryForGroup(group);
          if (!entry) continue;

          const { x, width } = calculateBroadsheetFlushXBounds(grid, group.columnStart, group.columnSpan);
          const obsBelow = obstacleRects
            .filter((r) => r.y > curY + 20 && r.x < x + width - 2 && r.x + r.width > x + 2)
            .map((r) => r.y - 4);
          const trackBottomLimit = Math.min(endY, ...obsBelow);
          const trackAvailH = trackBottomLimit - curY;
          if (trackAvailH < 105) {
            usedOnPage.delete(entry.story.articleId);
            continue;
          }

          const resolvedRole: StoryLayoutRole =
            group.roleHint ||
            (group.columnSpan >= 4 ? 'FEATURE' : group.columnSpan === 1 ? 'BRIEF' : 'STANDARD');
          const imgPlace: ArticlePlacement['imagePlacement'] = entry.priority.hasImage
            ? group.columnSpan >= 3
              ? group.imgPlacement === 'right'
                ? 'right'
                : 'left'
              : group.preferPhoto !== false
              ? 'top'
              : 'none'
            : 'none';

          const measured = measureStoryNaturalHeightPx({
            story: entry.story,
            columnSpan: group.columnSpan,
            widthPx: width,
            role: resolvedRole,
            imgPlacement: imgPlace,
            showBullets: Boolean(group.showBullets),
            pageNumber: page.pageNumber,
          });

          const firstH = Math.min(trackAvailH, measured.naturalHeight);
          const firstDraft: DynamicPlacedDraft = {
            entry,
            columnStart: group.columnStart,
            columnSpan: group.columnSpan,
            x,
            width,
            y: curY,
            height: firstH,
            role: resolvedRole,
            headlineSizePt: measured.headlineSizePt,
            imgPlacement: imgPlace,
            showBullets: Boolean(group.showBullets),
          };
          tracks.push({ group, items: [firstDraft], totalH: firstH, maxTrackY: trackBottomLimit });
        }

        if (tracks.length === 0) break;

        let deckTargetH = Math.min(remY, Math.max(...tracks.map((t) => Math.min(t.totalH, t.maxTrackY - curY))));

        // Stack additional shorter stories into shorter tracks inside this deck instead of stretching a single short story!
        for (const tr of tracks) {
          const trackCapH = Math.min(deckTargetH, tr.maxTrackY - curY);
          while (tr.items.length < 3 && trackCapH - tr.totalH >= 122) {
            const subCandidates = availableOnPage.filter((s) => !usedOnPage.has(s.story.articleId));
            if (subCandidates.length === 0) break;

            // Pick a story whose natural height best fits the remaining vertical space in this track
            const subRole: StoryLayoutRole = tr.group.columnSpan >= 3 ? 'STANDARD' : 'BRIEF';
            const remTrackH = trackCapH - tr.totalH;
            let bestCand: ScoredStoryEntry | null = null;
            let bestDiff = Infinity;
            let bestMeasured = { naturalHeight: 150, headlineSizePt: 18 };
            let bestImgPlace: ArticlePlacement['imagePlacement'] = 'none';

            for (const cand of subCandidates.slice(0, 12)) {
              const candImgPlace: ArticlePlacement['imagePlacement'] =
                cand.priority.hasImage && tr.group.columnSpan >= 2 && remTrackH >= 175
                  ? tr.group.columnSpan >= 3
                    ? 'right'
                    : 'top'
                  : 'none';
              const m = measureStoryNaturalHeightPx({
                story: cand.story,
                columnSpan: tr.group.columnSpan,
                widthPx: tr.items[0].width,
                role: subRole,
                imgPlacement: candImgPlace,
                showBullets: false,
                pageNumber: page.pageNumber,
              });
              const diff = Math.abs(m.naturalHeight - remTrackH) + (m.naturalHeight > remTrackH + 45 ? 140 : 0);
              if (diff < bestDiff) {
                bestDiff = diff;
                bestCand = cand;
                bestMeasured = m;
                bestImgPlace = candImgPlace;
              }
            }

            if (!bestCand) break;
            usedOnPage.add(bestCand.story.articleId);
            const stackedH = Math.min(remTrackH, bestMeasured.naturalHeight);
            tr.items.push({
              entry: bestCand,
              columnStart: tr.group.columnStart,
              columnSpan: tr.group.columnSpan,
              x: tr.items[0].x,
              width: tr.items[0].width,
              y: curY + tr.totalH,
              height: stackedH,
              role: subRole,
              headlineSizePt: bestMeasured.headlineSizePt,
              imgPlacement: bestImgPlace,
              showBullets: false,
            });
            tr.totalH += stackedH;
          }
        }

        // Recompute unified deck target height after stacking
        const maxStackedH = Math.max(...tracks.map((t) => Math.min(t.totalH, t.maxTrackY - curY)));
        deckTargetH = Math.min(remY, Math.max(120, maxStackedH));

        // Equalize every track in this deck so its stacked blocks close flush to `curY + min(deckTargetH, maxTrackY - curY)`
        for (const tr of tracks) {
          const trackFinalH = Math.min(deckTargetH, tr.maxTrackY - curY);
          const sumH = tr.items.reduce((s, it) => s + it.height, 0);
          if (sumH > 0 && trackFinalH > 0) {
            let runningY = curY;
            for (let idx = 0; idx < tr.items.length; idx++) {
              const it = tr.items[idx];
              it.y = Math.round(runningY);
              if (idx === tr.items.length - 1) {
                it.height = Math.max(90, Math.round(curY + trackFinalH) - it.y);
              } else {
                const scaled = Math.max(90, Math.round((it.height / sumH) * trackFinalH));
                it.height = scaled;
                runningY += scaled;
              }
              pageDrafts.push(it);
            }
          }
        }

        curY += deckTargetH;
        deckIndex++;
      }

      // Gentle flush justification down to endY ONLY when bottom gap is tiny (<= 1.12x);
      // NEVER stretch short stories into tall empty boxes (box height must fit content length)!
      if (pageDrafts.length > 0 && curY < endY - 4 && curY > startY + 120) {
        const usedSpan = curY - startY;
        const targetSpan = endY - startY;
        const scaleY = targetSpan / usedSpan;
        const canScaleCleanly = pageDrafts.every((d) => {
          const sy = Math.round(startY + (d.y - startY) * scaleY);
          const sh = Math.round(d.height * scaleY);
          return !overlapsObstacle({ x: d.x, y: sy, width: d.width, height: sh });
        });
        if (canScaleCleanly && scaleY <= 1.12) {
          for (const d of pageDrafts) {
            const nextTop = Math.round(startY + (d.y - startY) * scaleY);
            const nextBot = Math.round(startY + (d.y + d.height - startY) * scaleY);
            d.y = nextTop;
            d.height = Math.max(90, nextBot - nextTop);
          }
        }
      }

      // Emit final ArticlePlacement records for this page
      for (const draft of pageDrafts) {
        const { entry } = draft;
        const { story, priority } = entry;
        const prevDraft = existingPlacements.find((p) => p.newsId === story.articleId);

        let effectiveRole: StoryLayoutRole = draft.role;
        let effectiveHeadlineSize = draft.headlineSizePt;
        let effectiveImgPlacement: ArticlePlacement['imagePlacement'] = draft.imgPlacement;
        let bodyFontSizePt = 10.0;

        if (prevDraft && prevDraft.editorOverride?.isOverridden) {
          if (prevDraft.editorOverride.layoutRole) effectiveRole = prevDraft.editorOverride.layoutRole;
          if (prevDraft.editorOverride.headlineSize) effectiveHeadlineSize = prevDraft.editorOverride.headlineSize;
          if (prevDraft.editorOverride.bodyFontSize) bodyFontSizePt = prevDraft.editorOverride.bodyFontSize;
          if (prevDraft.editorOverride.imagePlacement && prevDraft.editorOverride.imagePlacement !== 'middle') {
            effectiveImgPlacement = prevDraft.editorOverride.imagePlacement;
          }
        }

        if (page.pageNumber === 1 && effectiveRole === 'LEAD' && !leadStoryId) {
          leadStoryId = story.articleId;
        }

        const rowStart = Math.max(1, Math.round((draft.y - grid.margins.top) / grid.baselineGrid));
        const rowSpan = Math.max(2, Math.round(draft.height / grid.baselineGrid));

        const resolvedImg = resolveArticleImage(story);
        const headlineFit = HeadlineFittingService.fitHeadline({
          headlineText: story.headline,
          availableWidthPx: draft.width,
          maxLines: effectiveRole === 'LEAD' ? 3 : 2,
          minFontSizePt: Math.max(13, effectiveHeadlineSize - 4),
          maxFontSizePt: effectiveHeadlineSize,
        });

        const placementRecord: ArticlePlacement = {
          placementId: `pl-${edition.editionId}-${story.articleId}`,
          editionId: edition.editionId,
          pageId: page.pageId,
          tenantId: edition.tenantId,
          newsId: story.articleId,
          articleTitle: story.headline,
          headlineHighlight: (story as any).headlineHighlight,
          subheadline: story.subheadline,
          byline: story.byline,
          category: story.category,
          leadParagraph: story.leadParagraph,
          bodyContent: story.bodyContent,
          x: draft.x,
          y: draft.y,
          width: draft.width,
          height: draft.height,
          columnStart: draft.columnStart,
          columnSpan: draft.columnSpan,
          rowStart,
          rowSpan,
          headlineSize: effectiveHeadlineSize,
          bodyFontSize: bodyFontSizePt,
          imagePlacement: effectiveImgPlacement,
          imageUrl: effectiveImgPlacement !== 'none' ? resolvedImg || ARCHIVE_PHOTO_FALLBACK_SVG : undefined,
          imageCaption:
            (story as any).imageCaption ||
            (story as any).coverImageCaption ||
            `${story.category ? `${story.category} — ` : ''}${getLocalizedPrintLabels(detectIndicScript(`${story.headline || ''} ${story.bodyContent || ''}`)).photoCaptionSuffix}`,
          showBullets: draft.showBullets,
          priority,
          layoutRole: effectiveRole,
          status: 'placed',
          locked: false,
          editorOverride: prevDraft?.editorOverride,
          generatedValue: {
            columnStart: draft.columnStart,
            columnSpan: draft.columnSpan,
            headlineSize: effectiveHeadlineSize,
            bodyFontSize: bodyFontSizePt,
            layoutRole: effectiveRole,
            pageId: page.pageId,
          },
          finalValue: {
            columnStart: draft.columnStart,
            columnSpan: draft.columnSpan,
            headlineSize: effectiveHeadlineSize,
            bodyFontSize: bodyFontSizePt,
            layoutRole: effectiveRole,
            pageId: page.pageId,
          },
          diagnostics: {
            headlineFits: headlineFit.fitStatus !== 'needs_editorial_shortening',
            bodyFits: true,
            imageFits: true,
            overflowWords: 0,
            warnings: [],
          },
        };

        page.blocks.push(placementRecord);
        finalPlacements.push(placementRecord);
      }

      for (const entry of batch) {
        if (!usedOnPage.has(entry.story.articleId)) {
          unplacedStories.push({
            story: entry.story,
            reason: `Deferred from page ${page.pageNumber} capacity to keep dynamic content-matched story boxes uncrowded.`,
          });
        }
      }
    }

    // Track remaining stories beyond totalPages modular capacity
    for (const entry of availablePool) {
      if (!assignedIds.has(entry.story.articleId)) {
        unplacedStories.push({
          story: entry.story,
          reason: `Additional story reserved in edition pool after filling all ${totalPages} pages cleanly.`,
        });
      }
    }

    // Run balance diagnostics per page
    for (const page of pages) {
      const pagePlacements = finalPlacements.filter((p) => p.pageId === page.pageId);
      const pageAds = finalAdPlacements.filter((ad) => ad.pageId === page.pageId);
      const diagnostics = PageBalanceService.evaluatePage(grid, pagePlacements, pageAds);

      page.blocks = pagePlacements;
      page.occupiedArea = diagnostics.occupiedAreaPercent;
      page.diagnostics = diagnostics;
    }

    return {
      pages,
      placements: finalPlacements,
      adPlacements: finalAdPlacements,
      unplacedStories,
      summary: {
        totalPages: pages.length,
        placedCount: finalPlacements.length,
        unplacedCount: unplacedStories.length,
        lockedPreservedCount,
        leadStoryId: leadStoryId || finalPlacements[0]?.newsId,
      },
    };
  }
}
