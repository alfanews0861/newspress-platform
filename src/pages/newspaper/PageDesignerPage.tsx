/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Newspaper Page Designer & Layout Engine Interface
 * Full interactive visual newspaper editor supporting multi-column broadsheet and tabloid grids,
 * deterministic AUTO LAYOUT, locked elements, ad constraints, preflight diagnostics, and senior finalization.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { navigateTo } from '../../utils/navigation';
import {
  Lock,
  Unlock,
  Undo,
  Redo,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Grid,
  Eye,
  Sliders,
  Layers,
  ChevronLeft,
  ChevronRight,
  Move,
  FileCheck,
  Sparkles,
  BookOpen,
  Image as ImageIcon,
  Columns,
  Type,
  LayoutGrid,
  ShieldCheck,
  History,
  CornerDownLeft,
  Download,
  Newspaper,
  Calendar,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import {
  NewspaperEdition,
  NewspaperTemplate,
  NewspaperBrand,
  NewspaperPage,
  ArticlePlacement,
  AdvertisementPlacement,
  StoryLayoutRole,
  PageGrid,
} from '../../types/edition';
import { NewsArticle } from '../../types/news';
import { NewsLicense } from '../../types/marketplace';
import {
  MOCK_BRANDS,
  MOCK_TEMPLATES,
  MOCK_CURRENT_EDITION,
  MOCK_NEWS_ARTICLES,
  TELUGU_NEWSPAPER_BRAND,
  TELUGU_NEWSPAPER_EDITION,
  TELUGU_PREPLANNED_PAGES
} from '../../services/mockDataService';
import { brandManagementService } from '../../services/brandManagementService';
import { NewspaperMastheadRenderer } from '../../components/newspaper/NewspaperMastheadRenderer';
import { GridCalculationService } from '../../services/gridCalculationService';
import { PagePlanningEngine } from '../../services/pagePlanningEngine';
import { PageBalanceService } from '../../services/pageBalanceService';
import { EditionPersistenceService } from '../../services/editionPersistenceService';
import { EditionContentEligibilityService } from '../../services/editionContentEligibilityService';
import { EditionPreflightService, PreflightCheckResult } from '../../services/editionPreflightService';
import { AdvertisementLayoutAdapter } from '../../services/advertisementLayoutAdapter';
import { EditionAdvertisementService } from '../../services/editionAdvertisementService';

export const PageDesignerPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { can } = usePermission();

  // Active Edition, Brand & Template State derived dynamically from Paper Settings
  const [brandsList, setBrandsList] = useState<NewspaperBrand[]>(() => {
    const list = brandManagementService.getBrands();
    return list.length > 0 ? list : MOCK_BRANDS;
  });
  const [selectedBrand, setSelectedBrand] = useState<NewspaperBrand>(() => {
    const active = brandManagementService.getActiveBrand();
    return active || TELUGU_NEWSPAPER_BRAND || MOCK_BRANDS[0];
  });
  const [selectedTemplate, setSelectedTemplate] = useState<NewspaperTemplate>(() => {
    const active = brandManagementService.getActiveBrand();
    return GridCalculationService.getTemplateForBrand(active);
  });
  const [edition, setEdition] = useState<NewspaperEdition>(TELUGU_NEWSPAPER_EDITION || MOCK_CURRENT_EDITION);

  // Multi-page layout state
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [pages, setPages] = useState<NewspaperPage[]>(() => TELUGU_PREPLANNED_PAGES || []);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);


  // Compute Active Grid (Must be declared before zoom and layout hooks)
  const grid: PageGrid = useMemo(() => {
    return GridCalculationService.calculatePageGrid(selectedTemplate);
  }, [selectedTemplate]);

  // Scroll ref to ensure page view always starts at top on page switch
  const canvasScrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (canvasScrollRef.current) {
      canvasScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentPageIndex]);

  // ARCHITECTURAL RULE / NOTE (DO NOT REMOVE OR REVERT IN FUTURE UPDATES):
  // 1. The sub-header must strictly contain ONLY:
  //    - Newspaper Brand dropdown (patrika peru)
  //    - Date (publication date)
  //    - Page Switcher (1/4)
  //    - Single "Download PDF" button (prints exact configured paper size)
  // 2. DO NOT restore "ముఖ్యాంశాలు (Front Page)" or section badges in the sub-header.
  // 3. DO NOT restore manual zoom buttons, presets (Fit, 55%, 75%, 100%), or +/- buttons.
  //    Canvas sizing is 100% automated & responsive based on available viewport space.
  // 4. DO NOT restore "Auto Layout" or "Saved" buttons in the sub-header.
  // 5. DO NOT restore separate dual download buttons. Keep only the single "Download PDF" button.

  // Editor Viewport & 100% Width Canvas Sizing
  // The canvas fills 100% of available container width, with proportional height enabling natural vertical scrolling.
  const [zoomLevel, setZoomLevel] = useState<number>(0.75);

  // Automated 100% Width Responsive Canvas Fitting:
  // Automatically scales the newspaper canvas to fill 100% of the available width.
  // Users scroll vertically (up and down) to view the entire authentic newspaper page.
  useEffect(() => {
    const container = canvasScrollRef.current;
    if (!container) return;

    const updateFit = () => {
      // Use clientWidth to automatically exclude vertical scrollbar width
      const padding = 24;
      const availW = Math.max(200, container.clientWidth - padding);

      if (grid.pageWidth > 0) {
        const scaleW = availW / grid.pageWidth;
        const clampedScale = Math.max(0.2, Math.min(Number(scaleW.toFixed(3)), 3.0));
        setZoomLevel(clampedScale);
      }
    };

    updateFit();

    const observer = new ResizeObserver(() => {
      updateFit();
    });
    observer.observe(container);

    window.addEventListener('resize', updateFit);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateFit);
    };
  }, [grid.pageWidth]);

  const [showGridLines, setShowGridLines] = useState<boolean>(true);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');
  const [activeTab, setActiveTab] = useState<'content' | 'inspector' | 'diagnostics' | 'revisions'>('inspector');
  const [storySearchQuery, setStorySearchQuery] = useState<string>('');
  const [storyCategoryFilter, setStoryCategoryFilter] = useState<string>('all');

  // History for Undo/Redo
  const [history, setHistory] = useState<NewspaperPage[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Dialogs & Notifications
  const [showFinalizeDialog, setShowFinalizeDialog] = useState<boolean>(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [finalizeSuccess, setFinalizeSuccess] = useState<boolean>(false);
  const [revisionsList, setRevisionsList] = useState<any[]>([]);
  const [preflightSummary, setPreflightSummary] = useState<PreflightCheckResult | null>(null);
  const [acknowledgeWarnings, setAcknowledgeWarnings] = useState<boolean>(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState<boolean>(false);
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);

  // Available candidate news stories
  const [availableStories, setAvailableStories] = useState<NewsArticle[]>(MOCK_NEWS_ARTICLES);
  const [licenses] = useState<NewsLicense[]>([]);


  // Push new state to undo/redo history
  const pushHistoryState = useCallback((newPages: NewspaperPage[]) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, JSON.parse(JSON.stringify(newPages))];
    });
    setHistoryIndex((prev) => prev + 1);
    setIsDirty(true);
  }, [historyIndex]);

  // Brand updates & advertisement placement listeners
  useEffect(() => {
    const handleUpdate = () => {
      const refreshed = brandManagementService.getBrands();
      setBrandsList(refreshed);
      const active = brandManagementService.getActiveBrand();
      if (active) {
        setSelectedBrand(active);
        const nextTemplate = GridCalculationService.getTemplateForBrand(active);
        setSelectedTemplate(nextTemplate);

        // If paper size or column count changed, adapt layout seamlessly to fit new dimensions
        if (active.paperSize !== 'broadsheet' || (active.defaultColumnCount && active.defaultColumnCount !== 8)) {
          const isTe = active.language === 'te' || active.name?.includes('తెలుగు');
          const relevantStories = isTe ? availableStories : availableStories.filter((s) => s.category !== 'జాతీయం' && s.category !== 'రాష్ట్రీయం' && s.category !== 'జిల్లా వార్తలు');
          const adaptedPlan = PagePlanningEngine.planEditionLayout({
            edition: isTe ? TELUGU_NEWSPAPER_EDITION : MOCK_CURRENT_EDITION,
            template: nextTemplate,
            stories: relevantStories,
            targetPageCount: active.pageCount || 4,
          });
          setPages(adaptedPlan.pages);
          pushHistoryState(adaptedPlan.pages);
        }
      }
    };

    // Listen for custom commercial advertisement events
    const handleAdPlaced = (e: any) => {
      const { reservation, targetPage, sizePreset } = e.detail;
      const targetPNum = typeof targetPage === 'number' ? targetPage : targetPage === 'front_page' ? 1 : 4;

      const adGeom = e.detail?.adResult || AdvertisementLayoutAdapter.calculateAdPlacement(
        grid,
        {
          advertisementId: reservation.advertisementId,
          sponsorName: reservation.sponsorName,
          imageUrl: reservation.imageUrl,
          targetPage: targetPNum,
          sizePreset: sizePreset || '2col_10cm',
        },
        pages.length
      );

      setPages((prevPages) => {
        const nextPages = AdvertisementLayoutAdapter.injectAdIntoPages(prevPages, grid, adGeom);
        pushHistoryState(nextPages);
        return nextPages;
      });

      // Switch to the target page index so user immediately sees their advertisement!
      setCurrentPageIndex(Math.max(0, targetPNum - 1));
      setIsDirty(true);
    };

    const handleAdRemoved = (e: any) => {
      const { reservationId } = e.detail;
      setPages((prevPages) => {
        return prevPages.map((p) => ({
          ...p,
          adPlacements: (p.adPlacements || []).filter((ad) => !ad.placementId.includes(reservationId)),
        }));
      });
      setIsDirty(true);
    };

    window.addEventListener('newspress:brands-updated', handleUpdate);
    window.addEventListener('newspress:advertisement-placed', handleAdPlaced);
    window.addEventListener('newspress:advertisement-removed', handleAdRemoved);

    return () => {
      window.removeEventListener('newspress:brands-updated', handleUpdate);
      window.removeEventListener('newspress:advertisement-placed', handleAdPlaced);
      window.removeEventListener('newspress:advertisement-removed', handleAdRemoved);
    };
  }, [grid, pages.length, availableStories, pushHistoryState]);

  // Initial Plan / Load on mount
  useEffect(() => {
    if (edition.editionId === TELUGU_NEWSPAPER_EDITION.editionId && TELUGU_PREPLANNED_PAGES && TELUGU_PREPLANNED_PAGES.length > 0) {
      setPages(TELUGU_PREPLANNED_PAGES);
      setHistory([JSON.parse(JSON.stringify(TELUGU_PREPLANNED_PAGES))]);
      setHistoryIndex(0);
      if (TELUGU_PREPLANNED_PAGES[0]?.blocks?.[0]) {
        setSelectedBlockId(TELUGU_PREPLANNED_PAGES[0].blocks[0].placementId);
      }
      return;
    }

    // Generate initial auto layout
    const initialPlan = PagePlanningEngine.planEditionLayout({
      edition,
      template: selectedTemplate,
      stories: availableStories,
      advertisements: selectedTemplate.advertisementZones.map((z, idx) => ({
        placementId: `ad-pl-${idx}`,
        editionId: edition.editionId,
        pageId: `page-${edition.editionId}-1`,
        tenantId: edition.tenantId,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        columnStart: z.columnStart,
        columnSpan: z.columnSpan,
        rowStart: z.rowStart,
        rowSpan: z.rowSpan,
        sponsorLabel: z.sponsor || 'Official Sponsor',
        isLocked: true,
        priority: 1,
      })),
      targetPageCount: 2,
    });

    setPages(initialPlan.pages);
    setHistory([JSON.parse(JSON.stringify(initialPlan.pages))]);
    setHistoryIndex(0);
    if (initialPlan.pages[0]?.blocks?.[0]) {
      setSelectedBlockId(initialPlan.pages[0].blocks[0].placementId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentPage = pages[currentPageIndex] || pages[0];

  // Undo Handler
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setPages(JSON.parse(JSON.stringify(history[prevIndex])));
      setIsDirty(true);
    }
  };

  // Redo Handler
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setPages(JSON.parse(JSON.stringify(history[nextIndex])));
      setIsDirty(true);
    }
  };

  // Deterministic AUTO LAYOUT Action
  const handleRunAutoLayout = () => {
    if (selectedBrand.language === 'te' || selectedBrand.brandId === TELUGU_NEWSPAPER_BRAND.brandId) {
      setPages(JSON.parse(JSON.stringify(TELUGU_PREPLANNED_PAGES)));
      pushHistoryState(TELUGU_PREPLANNED_PAGES);
      setIsDirty(true);
      return;
    }

    const currentPlacements: ArticlePlacement[] = [];
    const currentAds: AdvertisementPlacement[] = [];
    pages.forEach((p) => {
      if (p.blocks) currentPlacements.push(...p.blocks);
      if (p.adPlacements) currentAds.push(...p.adPlacements);
    });

    const output = PagePlanningEngine.planEditionLayout({
      edition,
      template: selectedTemplate,
      stories: availableStories,
      existingPlacements: currentPlacements,
      advertisements: currentAds,
      targetPageCount: pages.length,
      preserveLocks: true,
    });

    setPages(output.pages);
    pushHistoryState(output.pages);
    setIsDirty(true);
  };

  // Print & PDF Export Handler: Dynamically prints in the exact configured paper size (broadsheet, tabloid, A4, etc.)
  const handlePrintPdf = () => {
    const activeBrand = brandManagementService.getActiveBrand() || selectedBrand;
    const template = GridCalculationService.getTemplateForBrand(activeBrand);
    const paperFormat = activeBrand.paperSize || template.format || 'broadsheet';
    const widthMm = template.pageWidthMm || (paperFormat === 'tabloid' ? 280 : paperFormat === 'a4' ? 210 : paperFormat === 'a3' ? 297 : paperFormat === 'berliner' ? 315 : 350);
    const heightMm = template.pageHeightMm || (paperFormat === 'tabloid' ? 380 : paperFormat === 'a4' ? 297 : paperFormat === 'a3' ? 420 : paperFormat === 'berliner' ? 470 : 540);

    document.documentElement.setAttribute('data-print-format', paperFormat);

    // Dynamically inject @page rule for exact physical paper dimensions
    // NOTE: Do NOT use !important on properties inside @page — W3C CSS Paged Media spec forbids !important
    // inside @page rules, and browsers (Chrome/Blink) ignore declarations that contain !important.
    let styleEl = document.getElementById('newspaper-dynamic-print-page-style') as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'newspaper-dynamic-print-page-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      @media print {
        @page {
          size: ${widthMm}mm ${heightMm}mm;
          margin: 0;
        }
        @page ${paperFormat} {
          size: ${widthMm}mm ${heightMm}mm;
          margin: 0;
        }
        html, body {
          width: ${widthMm}mm !important;
          min-height: ${heightMm}mm !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .print-newspaper-export-container {
          display: block !important;
          position: static !important;
          width: ${widthMm}mm !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .print-page-sheet {
          page: ${paperFormat};
          width: ${widthMm}mm !important;
          height: ${heightMm}mm !important;
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      }
    `;

    const originalTitle = document.title;
    document.title = `${activeBrand.name || 'Newspaper'} - ${edition.publicationDate || 'Edition'} (${paperFormat.toUpperCase()})`;

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }, 150);
  };

  // Explicit Save Action
  const handleSaveLayout = async () => {
    try {
      const res = await EditionPersistenceService.saveEdition(
        edition,
        pages,
        user?.uid || 'user-editor',
        'Manual layout checkpoint'
      );
      setEdition(res.edition);
      setIsDirty(false);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      const revs = await EditionPersistenceService.getRevisions(edition.editionId);
      setRevisionsList(revs);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  // Add Page
  const handleAddPage = () => {
    const newPageNum = pages.length + 1;
    const newPageId = `page-${edition.editionId}-${newPageNum}`;
    const newPage: NewspaperPage = {
      pageId: newPageId,
      editionId: edition.editionId,
      tenantId: edition.tenantId,
      pageNumber: newPageNum,
      sectionName: `Section ${String.fromCharCode(64 + newPageNum)}`,
      templateId: selectedTemplate.templateId,
      layoutVersion: 1,
      blocks: [],
      adPlacements: [],
      occupiedArea: 0,
      diagnostics: {
        status: 'slightly_sparse',
        occupiedAreaPercent: 0,
        whitespacePercent: 100,
        visualWeight: { topHalf: 0, bottomHalf: 0, leftHalf: 0, rightHalf: 0 },
        headlineHierarchy: { leadFound: false, leadFontSize: 0, secondaryLeadFound: false, ratio: 1, verdict: 'Empty' },
        imageBalance: { imageAreaPercent: 0, count: 0 },
        errors: [],
        warnings: ['Empty page.'],
        info: [],
        canFinalize: true,
      },
      status: 'draft',
    };

    const nextPages = [...pages, newPage];
    setPages(nextPages);
    setCurrentPageIndex(nextPages.length - 1);
    pushHistoryState(nextPages);
  };

  // Select Block
  const handleSelectBlock = (blockId: string) => {
    setSelectedBlockId(blockId);
    setActiveTab('inspector');
  };

  // Toggle Block Lock
  const handleToggleLock = (blockId: string) => {
    const nextPages = pages.map((p) => {
      const nextBlocks = (p.blocks || []).map((b) => {
        if (b.placementId === blockId) {
          return { ...b, locked: !b.locked, status: !b.locked ? 'locked' : 'placed' } as ArticlePlacement;
        }
        return b;
      });
      return { ...p, blocks: nextBlocks };
    });
    setPages(nextPages);
    pushHistoryState(nextPages);
  };

  // Update Block Property (Editor Override)
  const handleUpdatePlacement = (
    blockId: string,
    updates: Partial<ArticlePlacement> & { editorOverride?: any }
  ) => {
    const nextPages = pages.map((p) => {
      const nextBlocks = (p.blocks || []).map((b) => {
        if (b.placementId === blockId) {
          const colSpan = updates.columnSpan ?? b.columnSpan;
          const colStart = updates.columnStart ?? b.columnStart;
          const colBounds = GridCalculationService.calculateColumnBounds(grid, colStart, colSpan);
          const rowBounds = GridCalculationService.calculateBaselinePosition(grid, updates.rowStart ?? b.rowStart, updates.rowSpan ?? b.rowSpan);

          return {
            ...b,
            ...updates,
            x: colBounds.x,
            width: colBounds.width,
            y: rowBounds.y,
            height: rowBounds.height,
            editorOverride: {
              ...b.editorOverride,
              ...updates.editorOverride,
              isOverridden: true,
            },
            finalValue: {
              ...b.finalValue,
              columnStart: colStart,
              columnSpan: colSpan,
              headlineSize: updates.headlineSize ?? b.headlineSize,
              bodyFontSize: updates.bodyFontSize ?? b.bodyFontSize,
              layoutRole: updates.layoutRole ?? b.layoutRole,
              pageId: b.pageId,
            },
          } as ArticlePlacement;
        }
        return b;
      });

      const updatedPage = { ...p, blocks: nextBlocks };
      const diag = PageBalanceService.evaluatePage(grid, nextBlocks, p.adPlacements || []);
      updatedPage.diagnostics = diag;
      updatedPage.occupiedArea = diag.occupiedAreaPercent;
      return updatedPage;
    });

    setPages(nextPages);
    pushHistoryState(nextPages);
  };

  // Remove block from page
  const handleRemoveBlock = (blockId: string) => {
    const nextPages = pages.map((p) => {
      const nextBlocks = (p.blocks || []).filter((b) => b.placementId !== blockId);
      const updatedPage = { ...p, blocks: nextBlocks };
      const diag = PageBalanceService.evaluatePage(grid, nextBlocks, p.adPlacements || []);
      updatedPage.diagnostics = diag;
      updatedPage.occupiedArea = diag.occupiedAreaPercent;
      return updatedPage;
    });

    setPages(nextPages);
    setSelectedBlockId(null);
    pushHistoryState(nextPages);
  };

  // Place Story onto current page
  const handlePlaceStory = (story: NewsArticle) => {
    if (!currentPage) return;

    // Validate eligibility
    const eligibility = EditionContentEligibilityService.checkArticleEligibility(
      currentTenant.tenantId,
      story,
      licenses
    );

    if (!eligibility.isEligible) {
      alert(`Cannot place story: ${eligibility.rejectionReason}`);
      return;
    }

    const targetColSpan = Math.min(3, grid.columnCount);
    const targetRowSpan = 14;

    const occupied = [
      ...(currentPage.blocks || []).map((b) => ({
        columnStart: b.columnStart,
        columnSpan: b.columnSpan,
        rowStart: b.rowStart,
        rowSpan: b.rowSpan,
      })),
      ...(currentPage.adPlacements || []).map((a) => ({
        columnStart: a.columnStart,
        columnSpan: a.columnSpan,
        rowStart: a.rowStart,
        rowSpan: a.rowSpan,
      })),
    ];

    if (currentPage.pageNumber === 1 && (!selectedTemplate.allowedModules || selectedTemplate.allowedModules.includes('masthead'))) {
      const headerMm = selectedTemplate.headerHeightMm || 42.3;
      const mastheadHeightPx = Math.round(headerMm * (grid.pageWidth / selectedTemplate.pageWidthMm));
      const mastheadRows = Math.ceil(mastheadHeightPx / grid.baselineGrid);
      occupied.push({
        columnStart: 1,
        columnSpan: grid.columnCount,
        rowStart: 0,
        rowSpan: mastheadRows,
      });
    }

    const slot = GridCalculationService.findNextAvailableSlot(grid, targetColSpan, targetRowSpan, occupied);
    if (!slot) {
      alert('No available column slot on current page. Try adding a new page or moving existing stories.');
      return;
    }

    const colBounds = GridCalculationService.calculateColumnBounds(grid, slot.columnStart, targetColSpan);
    const rowBounds = GridCalculationService.calculateBaselinePosition(grid, slot.rowStart, targetRowSpan);

    const newPlacement: ArticlePlacement = {
      placementId: `pl-${edition.editionId}-${story.articleId}-${Date.now()}`,
      editionId: edition.editionId,
      pageId: currentPage.pageId,
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
      headlineSize: 20,
      bodyFontSize: 9.5,
      imagePlacement: 'top',
      imageUrl: story.heroImageUrl || (story as any).imageUrl || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80',
      priority: {
        editorialPriority: 7,
        breakingStatus: false,
        articleType: story.category || 'General',
        freshnessHours: 1,
        section: story.printPageSection || 'Front Page',
        wordCount: story.wordCount || 800,
        hasImage: true,
        publisherPriority: 5,
        calculatedScore: 100,
      },
      layoutRole: 'STANDARD',
      status: 'placed',
      locked: false,
    };

    const nextPages = pages.map((p, idx) => {
      if (idx === currentPageIndex) {
        const nextBlocks = [...(p.blocks || []), newPlacement];
        const diag = PageBalanceService.evaluatePage(grid, nextBlocks, p.adPlacements || []);
        return { ...p, blocks: nextBlocks, diagnostics: diag, occupiedArea: diag.occupiedAreaPercent };
      }
      return p;
    });

    setPages(nextPages);
    setSelectedBlockId(newPlacement.placementId);
    pushHistoryState(nextPages);
  };

  // Open Finalize Dialog with Preflight Run
  const handleOpenFinalizeDialog = () => {
    setFinalizeError(null);
    setAcknowledgeWarnings(false);

    const summary = EditionPreflightService.validateForFinalization({
      edition,
      pages,
      template: selectedTemplate,
      brand: selectedBrand,
      articles: availableStories,
      licenses,
    });

    setPreflightSummary(summary);
    setShowFinalizeDialog(true);
  };

  // Finalize Gatekeeper Check & Snapshot Freeze
  const handleAttemptFinalize = async () => {
    setFinalizeError(null);
    setIsFinalizing(true);

    try {
      const res = await EditionPersistenceService.finalizeEdition(
        edition.editionId,
        currentTenant.tenantId,
        user?.uid || 'user-editor-in-chief',
        can('editions.finalize') ? 'editor_in_chief' : 'editor',
        selectedTemplate,
        selectedBrand,
        availableStories,
        licenses,
        {
          userDisplayName: user?.displayName || 'Editor-in-Chief',
          priority: 5,
        }
      );

      if (!res.success) {
        setFinalizeError(res.errors?.join('\n') || 'Finalization rejected by preflight validation.');
      } else {
        setEdition(res.edition!);
        setFinalizeSuccess(true);
        setShowFinalizeDialog(false);
      }
    } catch (err: any) {
      setFinalizeError(`System error during finalization: ${err.message}`);
    } finally {
      setIsFinalizing(false);
    }
  };

  // Create Correction Revision post-finalization
  const handleCreateCorrectionRevision = async () => {
    try {
      const res = await EditionPersistenceService.createCorrectionRevision(
        edition.editionId,
        currentTenant.tenantId,
        user?.uid || 'user-editor',
        can('editions.finalize') ? 'editor_in_chief' : 'editor',
        correctionReason || 'Post-finalization layout adjustment'
      );

      if (res.success && res.edition) {
        setEdition(res.edition);
        setShowCorrectionModal(false);
        setFinalizeSuccess(false);
        const revs = await EditionPersistenceService.getRevisions(edition.editionId);
        setRevisionsList(revs);
      } else {
        alert(res.errors?.join('\n') || 'Failed to create correction revision.');
      }
    } catch (err: any) {
      alert(`Correction error: ${err.message}`);
    }
  };

  // Filtered stories in content library
  const filteredStories = useMemo(() => {
    return availableStories.filter((s) => {
      const matchesSearch = s.headline.toLowerCase().includes(storySearchQuery.toLowerCase()) ||
        s.byline.toLowerCase().includes(storySearchQuery.toLowerCase());
      const matchesCat = storyCategoryFilter === 'all' || s.category === storyCategoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [availableStories, storySearchQuery, storyCategoryFilter]);

  // Selected block reference
  const selectedBlock = useMemo(() => {
    if (!selectedBlockId || !currentPage) return null;
    return (currentPage.blocks || []).find((b) => b.placementId === selectedBlockId);
  }, [selectedBlockId, currentPage]);

  // Current page diagnostics
  const pageDiagnostics = currentPage?.diagnostics || {
    status: 'balanced',
    occupiedAreaPercent: 0,
    whitespacePercent: 100,
    visualWeight: { topHalf: 50, bottomHalf: 50, leftHalf: 50, rightHalf: 50 },
    headlineHierarchy: { leadFound: true, leadFontSize: 36, secondaryLeadFound: true, ratio: 1.5, verdict: 'Optimal' },
    imageBalance: { imageAreaPercent: 20, count: 2 },
    errors: [],
    warnings: [],
    info: ['Grid calibrated.'],
    canFinalize: true,
  };

  // Render Page Content Elements (used for interactive canvas and print export)
  const renderPageCanvasElements = (pageToRender: NewspaperPage, isInteractive: boolean) => {
    if (!pageToRender) return null;
    const isTelugu =
      selectedBrand.language === 'te' ||
      selectedBrand.brandId === TELUGU_NEWSPAPER_BRAND.brandId ||
      selectedBrand.brandId === 'brand-andhra-prabha' ||
      edition.brandId === TELUGU_NEWSPAPER_BRAND.brandId ||
      edition.brandId === 'ed-andhra-prabha-today' ||
      (pageToRender.blocks || []).some((b) => /[\u0C00-\u0C7F]/.test(b.articleTitle || ''));

    const footerBottomMargin = grid.margins.bottom - 10;
    const footerHeight = 20;
    const footerTop = grid.pageHeight - footerBottomMargin - footerHeight;

    return (
      <>
        {/* 1. PRINT MASTHEAD (Page 1 Only) */}
        {pageToRender.pageNumber === 1 && (
          <div
            className="absolute z-5 overflow-hidden"
            style={{
              top: `${grid.margins.top}px`,
              left: `${grid.margins.left}px`,
              width: `${grid.contentWidth}px`,
              height: '118px',
            }}
          >
            <NewspaperMastheadRenderer
              brand={selectedBrand}
              publicationDate={edition.publicationDate || '30 అక్టోబర్ 2026, శుక్రవారం'}
              editionName={isTelugu ? (selectedBrand.editionsList?.[0] || 'హైదరాబాద్ ప్రధాన సంచిక') : 'MAIN METRO EDITION'}
            />
          </div>
        )}

        {/* 1.5. INNER PAGE FOLIO HEADER (Pages > 1) */}
        {pageToRender.pageNumber > 1 && (
          <div
            className="absolute border-b-2 border-red-800 pb-1 bg-white z-5 overflow-hidden flex items-center justify-between px-2 newspaper-telugu-content"
            style={{
              top: `${grid.margins.top}px`,
              left: `${grid.margins.left}px`,
              width: `${grid.contentWidth}px`,
              height: '38px',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontFamily: isTelugu ? "'Ramabhadra', 'Noto Serif Telugu', serif" : 'Cinzel, serif',
                  letterSpacing: 'normal',
                }}
                className="text-red-700 font-extrabold text-[18px]"
              >
                {selectedBrand.masthead?.title || selectedBrand.name}
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-[10px] text-slate-600 font-medium" style={{ letterSpacing: 'normal' }}>
                {isTelugu ? 'దినపత్రిక' : 'DAILY CHRONICLE'}
              </span>
            </div>

            <div
              style={{
                fontFamily: isTelugu ? "'Ramabhadra', 'Noto Serif Telugu', serif" : 'Cinzel, serif',
                letterSpacing: 'normal',
              }}
              className="bg-red-700 text-white font-bold text-[12px] px-4 py-0.5 rounded-xs shadow-xs flex items-center gap-1.5"
            >
              <span>【</span>
              <span>{pageToRender.sectionName || `పేజీ ${pageToRender.pageNumber}`}</span>
              <span>】</span>
            </div>

            <div className="text-[10px] font-semibold text-slate-700 flex items-center gap-2">
              <span style={{ letterSpacing: 'normal' }}>{edition.publicationDate || '30 అక్టోబర్ 2026, శుక్రవారం'}</span>
              <span className="text-slate-400">•</span>
              <span className="bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded-xs font-bold" style={{ letterSpacing: 'normal' }}>
                {isTelugu ? `పేజీ ${pageToRender.pageNumber}` : `Page ${pageToRender.pageNumber}`}
              </span>
            </div>
          </div>
        )}

        {/* 2. PLACED STORY BLOCKS (Broadsheet Multi-Column Architecture - Authentic Physical Newspaper Grid) */}
        {(pageToRender.blocks || []).map((block) => {
          const isSelected = isInteractive && block.placementId === selectedBlockId;
          const isLead = block.layoutRole === 'LEAD';
          const isAnchor = block.styleVariant === 'anchor_box';
          const isBrief = block.styleVariant === 'sidebar_brief';
          const isCartoon = block.styleVariant === 'pocket_cartoon';
          const isWide = block.columnSpan >= 3;
          const hasImage = !!block.imageUrl && block.imagePlacement !== 'none';
          const hasBullets = !!block.bulletPoints && block.bulletPoints.length > 0;

          const isBlockTelugu =
            isTelugu ||
            /[\u0C00-\u0C7F]/.test(block.articleTitle || '') ||
            /[\u0C00-\u0C7F]/.test(block.bodyContent || '');

          const headlineFontFamily = isBlockTelugu
            ? (block.headlineFont
                ? `${block.headlineFont}, 'Suranna', 'Ramabhadra', 'Noto Serif Telugu', serif`
                : "'Suranna', 'Ramabhadra', 'Noto Serif Telugu', serif")
            : (block.headlineFont || "'Cinzel', 'Playfair Display', 'Newsreader', serif");

          const bodyFontFamily = isBlockTelugu
            ? "'Mallanna', 'Noto Sans Telugu', 'Noto Serif Telugu', sans-serif"
            : "'Newsreader', 'Georgia', 'Inter', serif";

          const subheadFontFamily = isBlockTelugu
            ? "'Mallanna', 'Noto Sans Telugu', 'Noto Serif Telugu', sans-serif"
            : "'Newsreader', 'Georgia', serif";

          const imgHeight = block.imageHeight || (isLead ? 145 : 110);

          // Dedicated Pocket Cartoon Renderer (Matches Telugu Broadsheet bottom-left cartoon like Andhra Prabha "షో..!" or Velugu "తిన్నర్")
          if (isCartoon) {
            return (
              <div
                key={block.placementId}
                onClick={(e) => {
                  if (!isInteractive) return;
                  e.stopPropagation();
                  handleSelectBlock(block.placementId);
                }}
                data-lang="te"
                className={`absolute flex flex-col transition-all overflow-hidden border-2 border-slate-800 bg-[#fefce8]/60 p-2 select-none ${
                  isInteractive ? 'cursor-pointer group' : ''
                } ${isSelected ? 'ring-2 ring-blue-600 shadow-md z-10' : ''} font-telugu`}
                style={{
                  top: `${block.y}px`,
                  left: `${block.x}px`,
                  width: `${block.width}px`,
                  height: `${block.height}px`,
                  boxSizing: 'border-box',
                }}
              >
                {/* Cartoon Title Header */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-red-800 text-white font-black text-xs px-2 py-0.5 rounded-none shadow-2xs font-telugu">
                      {block.cartoon?.title || 'షో..!'}
                    </span>
                    <span className="text-[7.5px] font-bold text-slate-700">
                      {block.cartoon?.subtitle || 'ఆంధ్ర ప్రభ వ్యంగ్య చిత్రం'}
                    </span>
                  </div>
                  <span className="text-[7px] font-bold bg-slate-900 text-amber-300 px-1.5 py-0.2 rounded-xs">
                    {block.cartoon?.cartoonist || 'శేఖర్..!'}
                  </span>
                </div>

                {/* Cartoon Drawing Frame */}
                <div className="flex-1 w-full bg-white border border-slate-300 p-1 flex flex-col justify-between overflow-hidden relative rounded-xs">
                  {block.imageUrl ? (
                    <img
                      src={block.imageUrl}
                      alt="Pocket Cartoon"
                      className="w-full flex-1 object-contain"
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-2 text-center bg-amber-50/20">
                      <svg viewBox="0 0 120 60" className="w-24 h-12 opacity-80 my-0.5">
                        <circle cx="36" cy="24" r="12" fill="#fed7aa" stroke="#0f172a" strokeWidth="1.5" />
                        <circle cx="32" cy="22" r="1.5" fill="#0f172a" />
                        <circle cx="40" cy="22" r="1.5" fill="#0f172a" />
                        <path d="M34,30 Q36,33 40,30" stroke="#b91c1c" strokeWidth="1.5" fill="none" />
                        <rect x="26" y="36" width="20" height="20" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1.5" />
                        
                        <circle cx="84" cy="24" r="12" fill="#fed7aa" stroke="#0f172a" strokeWidth="1.5" />
                        <circle cx="80" cy="22" r="1.5" fill="#0f172a" />
                        <circle cx="88" cy="22" r="1.5" fill="#0f172a" />
                        <path d="M82,29 Q84,26 86,29" stroke="#0f172a" strokeWidth="1.5" fill="none" />
                        <rect x="74" y="36" width="20" height="20" fill="#fecaca" stroke="#0f172a" strokeWidth="1.5" />
                      </svg>
                      <div className="bg-slate-900 text-white text-[8px] p-1.5 rounded font-telugu shadow-xs leading-tight mt-1">
                        💬 "{block.cartoon?.dialogue || 'అక్కడెలాగో నెగ్గాం.. మరి ఇక్కడ 2047 నాటికి ఎలా గట్టెక్కేది..?!!'}"
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-[7px] text-slate-600 text-right font-medium italic mt-0.5">
                  - కార్టూన్ వ్యంగ్యాస్త్రం
                </div>
              </div>
            );
          }

          return (
            <div
              key={block.placementId}
              onClick={(e) => {
                if (!isInteractive) return;
                e.stopPropagation();
                handleSelectBlock(block.placementId);
              }}
              data-lang={isBlockTelugu ? 'te' : 'en'}
              className={`absolute flex flex-col transition-all overflow-hidden ${
                isInteractive ? 'cursor-pointer group' : ''
              } ${
                isSelected ? 'ring-2 ring-blue-600 shadow-md z-10' : ''
              } ${isBlockTelugu ? 'font-telugu newspaper-telugu-content' : ''}`}
              style={{
                top: `${block.y}px`,
                left: `${block.x}px`,
                width: `${block.width}px`,
                height: `${block.height}px`,
                backgroundColor: isAnchor ? '#fffdf5' : (block.cardBackground || '#ffffff'),
                border: isAnchor ? '1.5px solid #d97706' : undefined,
                borderRight: isAnchor ? undefined : (block.x + block.width < grid.pageWidth - grid.margins.right - 2 ? '1px solid #cbd5e1' : undefined),
                borderBottom: isAnchor ? undefined : (block.y + block.height < grid.pageHeight - grid.margins.bottom - 10 ? '1px solid #94a3b8' : undefined),
                padding: isAnchor ? '8px 10px' : '6px 8px',
                boxSizing: 'border-box',
              }}
            >
              {/* Lock Indicator - only visible when specifically selected in editor */}
              {isInteractive && block.locked && isSelected && (
                <div className="absolute top-1 right-1 bg-blue-600 text-white p-0.5 rounded shadow-xs z-10" title="Locked block">
                  <Lock className="w-2.5 h-2.5" />
                </div>
              )}

              {/* Kicker Badge - Strictly for Special Stories or Investigative Reports (Never on ordinary news) */}
              {(() => {
                const isSpecialOrInvestigative = Boolean(
                  (block as any).isSpecialStory ||
                  (block as any).isInvestigative ||
                  block.styleVariant === 'photo_feature' ||
                  /ప్రత్యేకం|ఇన్వెస్టిగేటివ్|పరిశోధనాత్మక|Special|Investigative/i.test(block.kicker || '') ||
                  /ప్రత్యేకం|ఇన్వెస్టిగేటివ్|పరిశోధనాత్మక|Special|Investigative/i.test(block.category || '')
                );

                if (!isSpecialOrInvestigative || !block.kicker) return null;

                return (
                  <div className="flex justify-center w-full mb-1">
                    <span
                      className="inline-flex items-center text-[8.5px] font-bold rounded-xs px-2 py-0.5 text-white shadow-2xs tracking-wide"
                      style={{
                        backgroundColor: block.accentColor || '#991b1b',
                        fontFamily: headlineFontFamily,
                        letterSpacing: 'normal',
                      }}
                    >
                      ★ {block.kicker} ★
                    </span>
                  </div>
                );
              })()}

              {/* Cutout Portrait Inset (politician or official headshot cutout as seen in Andhra Prabha) */}
              {block.cutoutImage && (
                <div className="float-right ml-2 mb-1 p-1 bg-white border border-slate-300 rounded shadow-2xs text-center shrink-0 w-16">
                  <img
                    src={block.cutoutImage.url}
                    alt={block.cutoutImage.name || 'Portrait'}
                    className="w-14 h-14 object-contain object-top rounded-full mx-auto border border-slate-400 bg-white"
                  />
                  {block.cutoutImage.name && (
                    <div className="text-[7px] font-bold text-slate-900 mt-0.5 leading-none truncate font-telugu">
                      {block.cutoutImage.name}
                    </div>
                  )}
                </div>
              )}

              {/* Infographic Stat Callout Card (Big numbers e.g. "24 మంది మృతి", "303 ప్రాజెక్టులు") */}
              {block.statCallout && (
                <div className="float-right ml-2 mb-1 p-1.5 rounded border-2 border-sky-600 bg-sky-50 text-center shrink-0 min-w-[70px] shadow-2xs">
                  <div className="text-xl font-black text-sky-950 leading-none font-telugu">
                    {block.statCallout.number}
                  </div>
                  <div className="text-[8px] font-bold text-sky-900 leading-tight mt-0.5 font-telugu">
                    {block.statCallout.label}
                  </div>
                  {block.statCallout.unit && (
                    <div className="text-[6.5px] text-slate-600 font-semibold font-telugu">
                      {block.statCallout.unit}
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic Headline & Layout Sizing - Center Aligned Headings, Flexible Photo Columns, Uncropped Natural Photos */}
              {(() => {
                const effectiveHeadlineSize = block.headlineSize || (
                  isLead ? 44 :
                  block.columnSpan >= 5 ? 34 :
                  block.columnSpan >= 4 ? 28 :
                  block.columnSpan === 3 ? 24 :
                  block.columnSpan === 2 ? (block.height >= 400 ? 27 : 21) :
                  (block.height >= 300 ? 20 : 18)
                );

                // Should bullets show? Only for lead, anchor or special stories
                const shouldShowBullets = hasBullets && (isLead || isAnchor || (block as any).showBullets || (block as any).isSpecialStory || block.styleVariant === 'anchor_box');

                // Inline jump markers
                const inlineContinuedFrom = block.continuedFromPage ? (
                  <span className="text-red-700 font-bold mr-1 inline font-telugu text-[10px] select-none">
                    【{block.continuedFromPage}వ పేజీ తరువాయి】{' '}
                  </span>
                ) : null;

                const inlineContinuedOn = block.continuedOnPage ? (
                  <span className="font-bold text-red-700 whitespace-nowrap ml-1 font-telugu text-[9.5px] inline select-none">
                    (మిగతా {block.continuedOnPage}వ పేజీలో...) ➔
                  </span>
                ) : null;

                // Flexible Photo Column configuration:
                // Photo can span 1, 1.5, 2, 2.5, or 3 columns without rigid constraints
                const photoColSpan = (block as any).photoColumnSpan || (
                  block.columnSpan >= 5 ? 2.5 :
                  block.columnSpan === 4 ? 2 :
                  block.columnSpan === 3 ? (block.imagePlacement === 'left' || block.imagePlacement === 'right' ? 1.5 : 2) :
                  block.columnSpan === 2 ? 1 : 1
                );
                const photoWidthPercent = Math.min(85, Math.max(35, Math.round((photoColSpan / block.columnSpan) * 100)));

                return (
                  <>
                    {/* 1. Main Headline - Center Aligned with Two-Tone Punchline */}
                    <h2
                      className={`mb-1 font-bold shrink-0 text-center mx-auto ${
                        isLead ? 'border-b-2 border-red-600 pb-1 font-extrabold' : ''
                      }`}
                      style={{
                        fontFamily: headlineFontFamily,
                        fontSize: `${effectiveHeadlineSize}px`,
                        color: block.headlineColor || (isLead ? '#991b1b' : isAnchor ? '#78350f' : '#0f172a'),
                        lineHeight: isBlockTelugu ? (effectiveHeadlineSize > 26 ? '1.18' : '1.24') : '1.18',
                        letterSpacing: 'normal',
                        textAlign: 'center',
                      }}
                    >
                      {block.headlineHighlight && block.articleTitle?.includes(block.headlineHighlight) ? (
                        <>
                          <span>{block.articleTitle.split(block.headlineHighlight)[0]}</span>
                          <span className="text-red-700 font-black">{block.headlineHighlight}</span>
                          <span>{block.articleTitle.split(block.headlineHighlight)[1]}</span>
                        </>
                      ) : block.articleTitle?.includes(':') ? (
                        <>
                          <span className="text-slate-950">{block.articleTitle.split(':')[0]}: </span>
                          <span className={isLead ? 'text-red-700 font-black' : 'text-sky-800 font-black'}>
                            {block.articleTitle.split(':')[1]}
                          </span>
                        </>
                      ) : (
                        block.articleTitle
                      )}
                    </h2>

                    {/* 2. Subheadline - Distinct Font, Contrasting Size & Medium Weight, Center Aligned */}
                    {block.subheadline && (
                      <p
                        className="text-slate-700 dark:text-slate-600 font-medium mb-1.5 text-center shrink-0 px-2 mx-auto"
                        style={{
                          fontFamily: subheadFontFamily,
                          fontSize: isBlockTelugu ? '11px' : '10px',
                          lineHeight: isBlockTelugu ? '1.35' : '1.25',
                          letterSpacing: 'normal',
                          textAlign: 'center',
                        }}
                      >
                        {block.subheadline}
                      </p>
                    )}

                    {/* 3. Byline & Beat */}
                    <div
                      className="text-[8px] text-red-900 mb-1 italic flex items-center justify-between border-b border-slate-100 pb-0.5 shrink-0 font-normal"
                      style={{ fontFamily: bodyFontFamily }}
                    >
                      <div className="flex items-center gap-1">
                        <span>✍️</span>
                        <span>{isBlockTelugu ? (block.byline || 'ఆంధ్ర ప్రభ బ్యూరో') : `By ${block.byline || 'Staff Reporter'}`}</span>
                      </div>
                      {block.category && (
                        <span className="text-[6.5px] uppercase tracking-wider text-slate-500 bg-slate-100 px-1 py-0.2 rounded-xs font-normal">
                          {block.category}
                        </span>
                      )}
                    </div>

                    {/* 4. CONTENT & PHOTO FLOW - Natural Uncropped Photos, Zero Cropping, Seamless Text Wrapping */}
                    {hasImage && block.imagePlacement !== 'top' && block.imagePlacement !== 'middle' ? (
                      /* A. UNIFIED NATURAL FLOAT TEXT WRAP (Zero White Space Beside Photo, Continuous Story Flow Across Full Height) */
                      <div
                        className="text-slate-950 font-normal mt-0.5 flex-1 overflow-hidden flex flex-col justify-between text-justify"
                        style={{
                          fontFamily: bodyFontFamily,
                          fontSize: isBlockTelugu ? `${block.bodyFontSize || (isLead ? 10.5 : 10)}px` : '9.5px',
                          lineHeight: isBlockTelugu ? (isLead ? '1.5' : '1.45') : '1.35',
                          textAlign: 'justify',
                          textJustify: 'inter-word',
                        }}
                      >
                        <div className="overflow-hidden flex-1">
                          {/* Floated Photo - Zero Cropping, Natural Aspect Ratio, True Float Wrap */}
                          <div
                            className={`${
                              block.imagePlacement === 'right' ? 'float-right ml-2.5 mb-1.5' : 'float-left mr-2.5 mb-1.5'
                            } shrink-0`}
                            style={{
                              width: `${photoWidthPercent}%`,
                              maxWidth: '100%',
                            }}
                          >
                            <img
                              src={block.imageUrl}
                              alt={block.articleTitle}
                              loading="eager"
                              onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                target.onerror = null;
                                target.src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=80';
                              }}
                              className="w-full h-auto object-contain block mx-auto"
                            />
                            {block.imageCaption && (
                              <div
                                className="text-[7.5px] text-slate-700 pt-0.5 leading-tight font-normal text-left"
                                style={{ fontFamily: bodyFontFamily }}
                              >
                                📷 {block.imageCaption}
                              </div>
                            )}
                          </div>

                          {/* Bullet Highlights directly in the flow beside the photo */}
                          {shouldShowBullets && (
                            <div
                              className="mb-1.5 p-1 bg-red-50/90 border-l-2 border-red-700 text-[8.5px] text-slate-900 rounded-r overflow-hidden"
                              style={{ fontFamily: bodyFontFamily }}
                            >
                              <ul className="space-y-0.5">
                                {block.bulletPoints?.map((bp, i) => (
                                  <li key={i} className="flex items-start font-normal">
                                    <span className="text-red-700 mr-1 text-[6.5px] leading-relaxed select-none">■</span>
                                    <span>{bp}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {inlineContinuedFrom}
                          {block.leadParagraph && (
                            <span className="text-slate-950 mr-1 inline font-semibold">
                              {block.leadParagraph}{' '}
                            </span>
                          )}
                          <span>{block.bodyContent}</span>
                          {inlineContinuedOn}
                        </div>
                      </div>
                    ) : hasImage && block.imagePlacement === 'middle' ? (
                      /* B. MIDDLE PHOTO STORY (Opening paragraph above photo, photo in middle, remainder below) */
                      <div
                        className="text-slate-950 font-normal mt-0.5 flex-1 overflow-hidden flex flex-col justify-between text-justify"
                        style={{
                          fontFamily: bodyFontFamily,
                          fontSize: isBlockTelugu ? `${block.bodyFontSize || 10}px` : '9.5px',
                          lineHeight: isBlockTelugu ? '1.5' : '1.35',
                          textAlign: 'justify',
                          textJustify: 'inter-word',
                        }}
                      >
                        <div className="overflow-hidden flex-1">
                          {inlineContinuedFrom}
                          {block.leadParagraph && (
                            <p className="text-slate-950 font-semibold mb-1">
                              {block.leadParagraph}
                            </p>
                          )}

                          <div className="my-1.5 w-full flex flex-col">
                            <img
                              src={block.imageUrl}
                              alt={block.articleTitle}
                              loading="eager"
                              onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                target.onerror = null;
                                target.src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=80';
                              }}
                              className="w-full h-auto object-contain block mx-auto"
                            />
                            {block.imageCaption && (
                              <div
                                className="text-[7.5px] text-slate-700 pt-0.5 leading-tight font-normal text-left"
                                style={{ fontFamily: bodyFontFamily }}
                              >
                                📷 {block.imageCaption}
                              </div>
                            )}
                          </div>

                          <span>{block.bodyContent}</span>
                          {inlineContinuedOn}
                        </div>
                      </div>
                    ) : (
                      /* C. TOP IMAGE OR MULTI-COLUMN TEXT FLOW (Natural Uncropped Photo, Full Height Content Justification) */
                      <>
                        {hasImage && (
                          <div className="my-1 w-full overflow-hidden shrink-0 flex flex-col">
                            <img
                              src={block.imageUrl}
                              alt={block.articleTitle}
                              loading="eager"
                              onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                target.onerror = null;
                                target.src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=80';
                              }}
                              className="w-full h-auto object-contain block mx-auto"
                            />
                            {block.imageCaption && (
                              <div
                                className="text-[7.5px] text-slate-700 pt-0.5 leading-tight font-normal shrink-0"
                                style={{ fontFamily: bodyFontFamily }}
                              >
                                📷 {block.imageCaption}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Multi-Column Body Flow with 1-Column Bullet Highlights */}
                        <div
                          className="text-slate-950 font-normal mt-0.5 flex-1 overflow-hidden flex flex-col justify-between"
                          style={{
                            fontFamily: bodyFontFamily,
                            fontSize: isBlockTelugu ? `${block.bodyFontSize || 10.5}px` : '10px',
                            lineHeight: isBlockTelugu ? '1.5' : '1.35',
                            letterSpacing: 'normal',
                            wordBreak: 'break-word',
                          }}
                        >
                          <div
                            className="overflow-hidden flex-1"
                            style={{
                              columnCount: isWide ? (block.columnSpan >= 5 ? 3 : 2) : 1,
                              columnGap: isWide ? '14px' : 'normal',
                              columnRule: isWide ? '1px solid #cbd5e1' : 'none',
                              columnFill: 'balance',
                              textAlign: 'justify',
                              textJustify: 'inter-word',
                            }}
                          >
                            {/* Single Column Bullets - Never stretches across multiple columns */}
                            {shouldShowBullets && (
                              <div
                                className="mb-1.5 p-1 bg-red-50/70 border-l-2 border-red-700 text-[8.5px] text-slate-900 rounded-r max-w-[210px]"
                                style={{
                                  fontFamily: bodyFontFamily,
                                  breakInside: 'avoid',
                                }}
                              >
                                <ul className="space-y-0.5">
                                  {block.bulletPoints?.map((bp, i) => (
                                    <li key={i} className="flex items-start font-normal">
                                      <span className="text-red-700 mr-1 text-[6.5px] leading-relaxed select-none">■</span>
                                      <span>{bp}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {inlineContinuedFrom}
                            {block.leadParagraph && (
                              <span className="text-slate-950 mr-1 inline font-semibold">
                                {block.leadParagraph}{' '}
                              </span>
                            )}
                            <span>{block.bodyContent}</span>
                            {inlineContinuedOn}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          );
        })}

        {/* 3. PLACED ADVERTISEMENTS (Supports Custom Uploaded Image & Presets) */}
        {(pageToRender.adPlacements || []).map((ad) => (
          <div
            key={ad.placementId}
            className="absolute bg-white border border-amber-500 shadow-xs flex flex-col items-center justify-center overflow-hidden z-10"
            style={{
              top: `${ad.y}px`,
              left: `${ad.x}px`,
              width: `${ad.width}px`,
              height: `${ad.height}px`,
              boxSizing: 'border-box',
            }}
          >
            {ad.imageUrl ? (
              <div className="w-full h-full relative group">
                <img
                  src={ad.imageUrl}
                  alt={ad.sponsorLabel || 'Commercial Advertisement'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-1 right-1 bg-black/70 text-white text-[8px] font-sans px-1.5 py-0.5 rounded uppercase tracking-wider backdrop-blur-xs">
                  ప్రకటన / Ad
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-white text-[8px] px-2 py-0.5 truncate text-center">
                  {ad.sponsorLabel}
                </div>
              </div>
            ) : (
              <div className="w-full h-full bg-amber-50/90 border-2 border-dashed border-amber-400 p-2 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                  వాణిజ్య ప్రకటన / Advertisement
                </span>
                <span className="text-[11px] font-bold text-slate-800 mt-1">
                  {ad.sponsorLabel}
                </span>
                <span className="text-[8px] text-slate-500 italic mt-0.5">
                  కమర్షియల్ యాడ్ జోన్ ({ad.columnSpan} Cols)
                </span>
              </div>
            )}
          </div>
        ))}

        {/* 4. FOOTER (Page Numbering, Imprint & Authentic CMYK Print Calibration Strip) */}
        <div
          className="absolute border-t-2 border-slate-400 pt-1 text-[9px] font-sans text-slate-700 flex items-center justify-between px-2 bg-white z-10"
          style={{
            top: `${footerTop}px`,
            left: `${grid.margins.left}px`,
            width: `${grid.contentWidth}px`,
            height: `${footerHeight}px`,
          }}
        >
          {/* Left: Brand Name & CMYK Calibration Dots (as in Prajasakti / Velugu broadsheets) */}
          <div className="flex items-center gap-3">
            <span className="font-bold text-red-900" style={{ letterSpacing: 'normal' }}>
              {selectedBrand.name}
            </span>
            <div className="flex items-center gap-1.5" title="Press Registration & CMYK Calibration">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block border border-slate-400 shadow-2xs" title="Cyan"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block border border-slate-400 shadow-2xs" title="Magenta"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block border border-slate-400 shadow-2xs" title="Yellow"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-950 inline-block border border-slate-400 shadow-2xs" title="Key/Black"></span>
              <span className="text-[7px] font-mono text-slate-500 uppercase tracking-widest pl-1 font-bold">CMYK</span>
            </div>
          </div>

          {/* Center: Page Numbering */}
          <span className="font-bold text-slate-900" style={{ letterSpacing: 'normal' }}>
            {isTelugu
              ? `పేజీ ${pageToRender.pageNumber} / ${pages.length}`
              : selectedBrand.headerFooterRules?.pageNumberFormat?.replace('{n}', String(pageToRender.pageNumber)).replace('{total}', String(pages.length)) || `PAGE ${pageToRender.pageNumber} OF ${pages.length}`}
          </span>

          {/* Right: Imprint / Date */}
          <div className="flex items-center gap-2">
            <span className="text-[7.5px] font-mono text-slate-600 font-semibold">{selectedBrand.imprint?.rniNumber || 'RNI: AP/TEL/1894/01'}</span>
            <span>•</span>
            <span className="font-medium" style={{ letterSpacing: 'normal' }}>{edition.editionDate || edition.publicationDate || '14 నవంబర్ 2026, శనివారం'}</span>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#f8fafd] dark:bg-[#202124] text-[#202124] dark:text-slate-100 overflow-hidden select-none font-sans">
      {/* 1. NEWSPAPER PREVIEW & PDF DOWNLOAD TOPBAR */}
      <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between z-20 shrink-0 shadow-xs print:hidden">
        {/* Left: Newspaper Brand & Publication Date */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-red-600 text-white shadow-xs">
              <Newspaper className="w-4 h-4" />
            </span>
            <select
              value={selectedBrand.brandId}
              onChange={(e) => {
                const nextBrand = brandsList.find((b) => b.brandId === e.target.value) || brandsList[0];
                setSelectedBrand(nextBrand);
                brandManagementService.setActiveBrandId(nextBrand.brandId);
                const nextTemplate = GridCalculationService.getTemplateForBrand(nextBrand);
                setSelectedTemplate(nextTemplate);

                if (nextBrand.paperSize === 'broadsheet' && (nextBrand.language === 'te' || nextBrand.brandId === TELUGU_NEWSPAPER_BRAND.brandId || nextBrand.brandId === 'brand-andhra-prabha')) {
                  setEdition(TELUGU_NEWSPAPER_EDITION);
                  setPages(TELUGU_PREPLANNED_PAGES);
                  setCurrentPageIndex(0);
                } else {
                  const isTe = nextBrand.language === 'te' || nextBrand.name?.includes('తెలుగు');
                  const relevantStories = isTe ? availableStories : availableStories.filter((s) => s.category !== 'జాతీయం' && s.category !== 'రాష్ట్రీయం' && s.category !== 'జిల్లా వార్తలు');
                  const enPlan = PagePlanningEngine.planEditionLayout({
                    edition: isTe ? TELUGU_NEWSPAPER_EDITION : MOCK_CURRENT_EDITION,
                    template: nextTemplate,
                    stories: relevantStories,
                    targetPageCount: nextBrand.pageCount || 4,
                  });
                  setPages(enPlan.pages);
                  setCurrentPageIndex(0);
                }
              }}
              className="font-sans font-bold text-sm bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {brandsList.map((b) => (
                <option key={b.brandId} value={b.brandId}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Date */}
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
            <Calendar className="w-3.5 h-3.5 text-red-600" />
            <span>{edition.publicationDate || '30 అక్టోబర్ 2026, శుక్రవారం'}</span>
          </div>
        </div>

        {/* Center: Page Switcher (Pure 1 / 4) */}
        <div className="flex items-center">
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 shadow-2xs">
            <button
              onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentPageIndex === 0}
              className="p-1 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 rounded cursor-pointer transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-bold text-xs text-slate-800 dark:text-slate-100 font-mono tracking-wide">
              {currentPageIndex + 1} / {pages.length}
            </span>
            <button
              onClick={() => setCurrentPageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
              disabled={currentPageIndex === pages.length - 1}
              className="p-1 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 rounded cursor-pointer transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Single Download PDF Button (Dynamic Print Size: Broadsheet, Tabloid, etc.) */}
        <div className="flex items-center">
          <button
            onClick={handlePrintPdf}
            className="flex items-center space-x-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs transition-colors"
            title={`Download PDF in ${selectedBrand.paperSize?.toUpperCase() || 'BROADSHEET'} format`}
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* NEWSPAPER PAGE PREVIEW CANVAS - 100% WIDTH WITH NATURAL VERTICAL SCROLL */}
      <div
        ref={canvasScrollRef}
        className="flex-1 bg-[#d5d8de] dark:bg-[#151518] overflow-y-auto overflow-x-hidden p-3 flex flex-col items-center justify-start print:hidden"
      >
        {/* 100% Width Responsive Centered Canvas Sheet Container */}
        <div
          className="shrink-0 relative transition-all duration-100 shadow-2xl mx-auto my-3"
          style={{
            width: `${Math.round(grid.pageWidth * zoomLevel)}px`,
            height: `${Math.round(grid.pageHeight * zoomLevel)}px`,
          }}
        >
          <div
            className="bg-white text-slate-950 shadow-2xl border border-slate-300 dark:border-slate-800 absolute top-0 left-0"
            style={{
              width: `${grid.pageWidth}px`,
              height: `${grid.pageHeight}px`,
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top left',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            }}
          >
            {/* Page Elements (Masthead/Folio, Placed Stories, Ads, Footer) - Interactive Canvas */}
            {currentPage && renderPageCanvasElements(currentPage, true)}
          </div>
        </div>
      </div>

      {/* 4. FULL PRINT EDITION RENDER (All Pages for PDF Export - 100% Centered & Fitted to Configured Paper Size) */}
      <div className="hidden print:block print-newspaper-export-container font-sans bg-white text-black">
        {pages.map((p) => {
          const activeBrand = brandManagementService.getActiveBrand() || selectedBrand;
          const template = GridCalculationService.getTemplateForBrand(activeBrand);
          const paperFormat = activeBrand.paperSize || template.format || 'broadsheet';
          const widthMm = template.pageWidthMm || (paperFormat === 'tabloid' ? 280 : paperFormat === 'a4' ? 210 : paperFormat === 'a3' ? 297 : paperFormat === 'berliner' ? 315 : 350);
          const heightMm = template.pageHeightMm || (paperFormat === 'tabloid' ? 380 : paperFormat === 'a4' ? 297 : paperFormat === 'a3' ? 420 : paperFormat === 'berliner' ? 470 : 540);
          const targetPxWidth = widthMm * 3.779527559;
          const printScale = grid.pageWidth > 0 ? (targetPxWidth / grid.pageWidth) : 1;

          return (
            <div
              key={`print-${p.pageId}`}
              className="print-page-sheet bg-white text-slate-950"
              style={{
                width: `${widthMm}mm`,
                height: `${heightMm}mm`,
                page: paperFormat,
              }}
            >
              <div
                className="print-page-inner"
                style={{
                  width: `${grid.pageWidth}px`,
                  height: `${grid.pageHeight}px`,
                  transform: `scale(${printScale})`,
                  transformOrigin: 'top left',
                }}
              >
                {renderPageCanvasElements(p, false)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
