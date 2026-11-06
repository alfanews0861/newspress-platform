/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Deterministic Newspaper Page Planning & Automated Layout Engine
 * Performs constraint-based page composition adhering to professional human newspaper design rules:
 * hierarchical headline scales, variable multi-column spans, locked block preservation,
 * advertisement zone respect, and preflight balance verification.
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

    // 1. Initialize page structures
    const pages: NewspaperPage[] = [];
    for (let pNum = 1; pNum <= totalPages; pNum++) {
      const pageId = `page-${edition.editionId}-${pNum}`;
      pages.push({
        pageId,
        editionId: edition.editionId,
        tenantId: edition.tenantId,
        pageNumber: pNum,
        sectionName: pNum === 1 ? 'Front Page' : pNum === 2 ? 'National & State' : 'Regional & Editorial',
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
        const mastheadRows = Math.ceil((template.headerHeightMm * GridCalculationService.MM_TO_PX_RATIO || 68) / grid.baselineGrid);
        initialSlots.push({
          columnStart: 1,
          columnSpan: grid.columnCount,
          rowStart: 0,
          rowSpan: mastheadRows,
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
    const scoredStories = candidates.map((story) => {
      const pOverride = storyPriorities[story.articleId];
      const editorialPriority = pOverride?.editorialPriority ?? (story.editorialStatus === 'approved' ? 8 : 6);
      const isBreaking = pOverride?.breakingStatus ?? (story.category === 'Front Page (A1)' || story.headline.toLowerCase().includes('breaking'));
      const hasImage = !!story.heroImageUrl || !!(story as any).imageUrl;
      const wordCount = story.wordCount || 800;

      let score = editorialPriority * 15;
      if (isBreaking) score += 200;
      if (hasImage) score += 50;
      if (wordCount >= 1000) score += 40;
      if (story.category === 'Front Page (A1)') score += 120;
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

    // 5. Assign Roles & Place Stories Onto Pages
    // Maximum baseline rows per page (leaving 3 rows safety margin for header/footer)
    const maxRowsPerPage = Math.max(25, Math.floor(grid.contentHeight / grid.baselineGrid) - 3);

    for (let i = 0; i < scoredStories.length; i++) {
      const { story, priority } = scoredStories[i];
      let role: StoryLayoutRole = 'STANDARD';
      let targetColSpan = 2;
      let targetRowSpan = 14;
      let headlineSizePt = 16;
      let bodyFontSizePt = 9.5;
      let imagePlacement: 'top' | 'left' | 'right' | 'bottom' | 'hero' | 'none' = priority.hasImage ? 'top' : 'none';

      // Professional human-like hierarchy rules based on ranking
      if (i === 0 && !leadStoryId) {
        role = 'LEAD';
        leadStoryId = story.articleId;
        // On 8-col grid: 5 cols; on 6-col grid: 4 cols; on 5-col grid: 3 cols; on 4-col: 3 cols
        targetColSpan = grid.columnCount >= 8 ? 5 : grid.columnCount >= 6 ? 4 : 3;
        targetRowSpan = Math.min(maxRowsPerPage - 6, 26);
        headlineSizePt = 36;
        bodyFontSizePt = 10;
        imagePlacement = priority.hasImage ? 'hero' : 'none';
      } else if (i === 1) {
        role = 'SECONDARY_LEAD';
        targetColSpan = grid.columnCount >= 8 ? 3 : grid.columnCount >= 6 ? 2 : 2;
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

      // Check for editor overrides from previous draft if applicable
      const prevDraft = existingPlacements.find((p) => p.newsId === story.articleId);
      if (prevDraft && prevDraft.editorOverride?.isOverridden) {
        if (prevDraft.editorOverride.columnSpan) targetColSpan = prevDraft.editorOverride.columnSpan;
        if (prevDraft.editorOverride.layoutRole) role = prevDraft.editorOverride.layoutRole;
        if (prevDraft.editorOverride.headlineSize) headlineSizePt = prevDraft.editorOverride.headlineSize;
        if (prevDraft.editorOverride.bodyFontSize) bodyFontSizePt = prevDraft.editorOverride.bodyFontSize;
        if (prevDraft.editorOverride.imagePlacement) imagePlacement = prevDraft.editorOverride.imagePlacement;
      }

      // Find an available slot across pages (starting from Page 1)
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

        // Fallback constraint relaxing: if story doesn't fit, try reducing column span or rows before giving up
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

          // Fit Headline deterministically
          const headlineFit = HeadlineFittingService.fitHeadline({
            headlineText: story.headline,
            availableWidthPx: colBounds.width,
            maxLines: role === 'LEAD' ? 3 : 2,
            minFontSizePt: Math.max(12, headlineSizePt - 6),
            maxFontSizePt: headlineSizePt,
          });

          // Fit Body text
          const bodyFit = BodyTextFittingService.fitBodyText({
            bodyText: story.bodyContent || story.leadParagraph || '',
            columnWidthPx: grid.columnWidth,
            columnSpan: targetColSpan,
            availableHeightPx: Math.max(40, rowBounds.height - headlineFit.estimatedHeightPx - 30),
            fontSizePt: bodyFontSizePt,
          });

          // Compute Image
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
            imageUrl: story.heroImageUrl || (story as any).imageUrl || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80',
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

          // Mark occupied
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
}
