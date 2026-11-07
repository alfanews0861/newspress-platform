/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Newspaper Page Designer & Layout Engine Interface
 * Full interactive visual newspaper editor supporting multi-column broadsheet and tabloid grids,
 * deterministic AUTO LAYOUT, locked elements, ad constraints, preflight diagnostics, and senior finalization.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wand2,
  Lock,
  Unlock,
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
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
  Printer,
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

export const PageDesignerPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { can } = usePermission();

  // Active Edition, Brand & Template State
  const [brandsList, setBrandsList] = useState<NewspaperBrand[]>(() => brandManagementService.getBrands());
  const [selectedBrand, setSelectedBrand] = useState<NewspaperBrand>(() => {
    const active = brandManagementService.getActiveBrand();
    return active || TELUGU_NEWSPAPER_BRAND || MOCK_BRANDS[0];
  });
  const [selectedTemplate, setSelectedTemplate] = useState<NewspaperTemplate>(MOCK_TEMPLATES[0]);
  const [edition, setEdition] = useState<NewspaperEdition>(TELUGU_NEWSPAPER_EDITION || MOCK_CURRENT_EDITION);

  useEffect(() => {
    const handleUpdate = () => {
      const refreshed = brandManagementService.getBrands();
      setBrandsList(refreshed);
      const active = brandManagementService.getActiveBrand();
      if (active) setSelectedBrand(active);
    };
    window.addEventListener('newspress:brands-updated', handleUpdate);
    return () => window.removeEventListener('newspress:brands-updated', handleUpdate);
  }, []);

  // Multi-page layout state
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [pages, setPages] = useState<NewspaperPage[]>(() => TELUGU_PREPLANNED_PAGES || []);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Editor Viewport & Tools State
  const [zoomLevel, setZoomLevel] = useState<number>(0.75);
  const [printFormat, setPrintFormat] = useState<'broadsheet' | 'a3'>('broadsheet');
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

  // Compute Active Grid
  const grid: PageGrid = useMemo(() => {
    return GridCalculationService.calculatePageGrid(selectedTemplate);
  }, [selectedTemplate]);

  // Push new state to undo/redo history
  const pushHistoryState = useCallback((newPages: NewspaperPage[]) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, JSON.parse(JSON.stringify(newPages))];
    });
    setHistoryIndex((prev) => prev + 1);
    setIsDirty(true);
  }, [historyIndex]);

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

  // Print & PDF Export Handler with True Broadsheet / A4 Paper Setup
  const handlePrintPdf = (format: 'a4' | 'broadsheet' = 'a4') => {
    document.documentElement.setAttribute('data-print-format', format);
    setTimeout(() => {
      window.print();
    }, 120);
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
      const mastheadRows = Math.ceil((selectedTemplate.headerHeightMm * 2 || 68) / grid.baselineGrid);
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

  // Helper to group page blocks into dynamic column tracks for natural broadsheet flow
  interface ColumnTrack {
    trackKey: string;
    columnStart: number;
    columnSpan: number;
    x: number;
    width: number;
    blocks: ArticlePlacement[];
  }

  const getPageColumnTracks = (pageToRender: NewspaperPage, currentGrid: PageGrid): ColumnTrack[] => {
    const blocks = pageToRender.blocks || [];
    if (blocks.length === 0) return [];

    const trackMap = new Map<string, ColumnTrack>();

    // Sort blocks by columnStart, then by rowStart or y
    const sorted = [...blocks].sort((a, b) => {
      if (a.columnStart !== b.columnStart) return a.columnStart - b.columnStart;
      return (a.rowStart ?? a.y) - (b.rowStart ?? b.y);
    });

    for (const block of sorted) {
      const key = `${block.columnStart}_${block.columnSpan}`;
      let track = trackMap.get(key);
      if (!track) {
        const colBounds = GridCalculationService.calculateColumnBounds(
          currentGrid,
          block.columnStart,
          block.columnSpan
        );
        track = {
          trackKey: key,
          columnStart: block.columnStart,
          columnSpan: block.columnSpan,
          x: block.x ?? colBounds.x,
          width: block.width ?? colBounds.width,
          blocks: [],
        };
        trackMap.set(key, track);
      }
      track.blocks.push(block);
    }

    return Array.from(trackMap.values()).sort((a, b) => a.columnStart - b.columnStart);
  };

  // Render Page Content Elements (used for interactive canvas and print export)
  const renderPageCanvasElements = (pageToRender: NewspaperPage, isInteractive: boolean) => {
    if (!pageToRender) return null;
    const isTelugu = selectedBrand.language === 'te' || selectedBrand.brandId === TELUGU_NEWSPAPER_BRAND.brandId;
    const tracks = getPageColumnTracks(pageToRender, grid);

    const defaultContentTop = pageToRender.pageNumber === 1 ? 142 : 66;
    const footerBottomMargin = grid.margins.bottom - 10;
    const footerHeight = 20;
    const footerTop = grid.pageHeight - footerBottomMargin - footerHeight;
    const availableHeight = footerTop - defaultContentTop;

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
            className="absolute border-b-2 border-red-800 pb-1 bg-white z-5 overflow-hidden flex items-center justify-between px-2"
            style={{
              top: `${grid.margins.top}px`,
              left: `${grid.margins.left}px`,
              width: `${grid.contentWidth}px`,
              height: '38px',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                style={{ fontFamily: isTelugu ? "'Ramabhadra', 'Noto Serif Telugu', serif" : 'Cinzel, serif', letterSpacing: 'normal' }}
                className="text-red-700 font-extrabold text-[18px]"
              >
                {selectedBrand.masthead.title}
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-[10px] text-slate-600 font-medium">దినపత్రిక</span>
            </div>

            <div
              style={{ fontFamily: isTelugu ? "'Ramabhadra', 'Noto Serif Telugu', serif" : 'Cinzel, serif', letterSpacing: 'normal' }}
              className="bg-red-700 text-white font-bold text-[12px] px-4 py-0.5 rounded-xs tracking-normal shadow-xs flex items-center gap-1.5"
            >
              <span>【</span>
              <span>{pageToRender.sectionName || `పేజీ ${pageToRender.pageNumber}`}</span>
              <span>】</span>
            </div>

            <div className="text-[10px] font-semibold text-slate-700 flex items-center gap-2">
              <span>{edition.publicationDate || '30 అక్టోబర్ 2026, శుక్రవారం'}</span>
              <span className="text-slate-400">•</span>
              <span className="bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded-xs font-bold">
                పేజీ {pageToRender.pageNumber}
              </span>
            </div>
          </div>
        )}

        {/* 2. PLACED STORY COLUMNS (Broadsheet Auto-Flex Photo Architecture - Zero Cutoff, Zero White Space) */}
        {tracks.map((track, trackIdx) => {
          const hasNextTrack = trackIdx < tracks.length - 1;
          const hasAnyImageInTrack = track.blocks.some(b => !!b.imageUrl && b.imagePlacement !== 'none');

          return (
            <div
              key={track.trackKey}
              className="absolute flex flex-col justify-between"
              style={{
                top: `${defaultContentTop}px`,
                left: `${track.x}px`,
                width: `${track.width}px`,
                height: `${availableHeight}px`,
                borderRight: hasNextTrack ? '1px solid #cbd5e1' : undefined,
                paddingRight: hasNextTrack ? '8px' : '0px',
                paddingLeft: trackIdx > 0 ? '8px' : '0px',
                boxSizing: 'border-box',
              }}
            >
              {track.blocks.map((block, bIdx) => {
                const isSelected = isInteractive && block.placementId === selectedBlockId;
                const isLead = block.layoutRole === 'LEAD';
                const isAnchor = block.styleVariant === 'anchor_box';
                const isBrief = block.styleVariant === 'sidebar_brief';
                const isWide = block.columnSpan >= 3;
                const hasImage = !!block.imageUrl && block.imagePlacement !== 'none';
                const hasBullets = !!block.bulletPoints && block.bulletPoints.length > 0;
                const isLastInTrack = bIdx === track.blocks.length - 1;
                // Solution 1: Blocks with images flex to absorb vertical height; text-only blocks hug content
                const isFlexBlock = hasImage || (!hasAnyImageInTrack && isLastInTrack);

                return (
                  <div
                    key={block.placementId}
                    onClick={(e) => {
                      if (!isInteractive) return;
                      e.stopPropagation();
                      handleSelectBlock(block.placementId);
                    }}
                    className={`relative flex flex-col transition-all ${
                      isFlexBlock ? 'flex-1 min-h-0' : 'shrink-0'
                    } ${
                      isInteractive ? 'cursor-pointer group' : ''
                    } ${
                      isSelected ? 'ring-2 ring-blue-600 shadow-md z-10' : ''
                    }`}
                    style={{
                      width: '100%',
                      overflow: 'visible',
                      backgroundColor: isAnchor ? '#fffdf5' : 'transparent',
                      border: isAnchor ? '1.5px solid #d97706' : undefined,
                      borderBottom: isAnchor ? undefined : (!isLastInTrack ? '1px solid #cbd5e1' : undefined),
                      paddingBottom: isAnchor ? '8px' : (!isLastInTrack ? '8px' : '0px'),
                      marginBottom: isAnchor ? '8px' : (!isLastInTrack ? '8px' : '0px'),
                      padding: isAnchor ? '8px 10px' : undefined,
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Lock Indicator */}
                    {isInteractive && block.locked && (
                      <div className="absolute top-1 right-1 bg-blue-600 text-white p-0.5 rounded shadow-xs z-10" title="Locked block">
                        <Lock className="w-2.5 h-2.5" />
                      </div>
                    )}

                    {/* Continuation Marker (when jumped from another page) */}
                    {block.continuedFromPage && (
                      <div
                        className="inline-flex items-center text-[8.5px] font-bold text-red-900 bg-red-100 border border-red-300 px-1.5 py-0.5 mb-1 rounded-xs shrink-0 self-start shadow-2xs"
                        style={{ fontFamily: isTelugu ? "'Mallanna', sans-serif" : 'inherit', letterSpacing: '-0.01em' }}
                      >
                        <span>【 {block.continuedFromPage}వ పేజీ తరువాయి 】</span>
                      </div>
                    )}

                    {/* Headline */}
                    <h2
                      className={`mb-1 font-normal shrink-0 ${
                        isLead ? 'border-b border-red-200 pb-0.5' : ''
                      }`}
                      style={{
                        fontFamily: isTelugu
                          ? (block.headlineFont || "'Ramabhadra', 'Mallanna', serif")
                          : 'inherit',
                        fontSize: `${block.headlineSize || (isLead ? 28 : 21)}px`,
                        color: block.headlineColor || (isLead ? '#991b1b' : isAnchor ? '#78350f' : '#0f172a'),
                        lineHeight: isTelugu ? '1.14' : '1.12',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {block.articleTitle}
                    </h2>

                    {/* Subheadline */}
                    {block.subheadline && (
                      <p
                        className="text-[10px] text-slate-700 font-normal mb-1 italic shrink-0"
                        style={{
                          fontFamily: isTelugu ? "'Mallanna', sans-serif" : 'inherit',
                          lineHeight: '1.16',
                          letterSpacing: '-0.015em',
                        }}
                      >
                        {block.subheadline}
                      </p>
                    )}

                    {/* Photo Visual (Solution 1: Auto-Flex Visual Anchor - Zero White Space) */}
                    {hasImage && (
                      <div
                        className="my-1 w-full overflow-hidden rounded-xs border border-slate-200 flex-1 min-h-[75px] flex flex-col bg-slate-100"
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
                          className="w-full flex-1 min-h-0 object-cover"
                        />
                        {block.imageCaption && (
                          <div
                            className="text-[8px] text-slate-600 bg-slate-50 border-t border-slate-200 px-1 py-0.5 leading-tight font-normal shrink-0"
                            style={{
                              fontFamily: isTelugu ? "'Mallanna', sans-serif" : 'inherit',
                              letterSpacing: '-0.01em',
                            }}
                          >
                            📷 {block.imageCaption}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bullet Highlights (Clean Broadsheet Editorial Style) */}
                    {hasBullets && (
                      <div
                        className="my-1 py-1 px-1.5 bg-red-50/70 border-l-2 border-red-700 text-[9.5px] text-slate-900 rounded-r shrink-0"
                        style={{
                          fontFamily: isTelugu ? "'Mallanna', sans-serif" : 'inherit',
                          lineHeight: '1.25',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        <ul className="space-y-0.5">
                          {block.bulletPoints?.map((bp, i) => (
                            <li key={i} className="flex items-start font-normal">
                              <span className="text-red-700 mr-1.5 text-[8px] leading-relaxed select-none">■</span>
                              <span>{bp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Byline & Beat */}
                    <div
                      className="text-[8.5px] text-red-900 mb-1 italic flex items-center justify-between border-b border-slate-100 pb-0.5 shrink-0 font-normal"
                      style={{
                        fontFamily: isTelugu ? "'Mallanna', sans-serif" : 'inherit',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>✍️</span>
                        <span>{isTelugu ? (block.byline || 'ఆంధ్ర ప్రభ బ్యూరో') : `By ${block.byline || 'Staff Reporter'}`}</span>
                      </div>
                      {block.category && (
                        <span className="text-[7px] uppercase tracking-wider text-slate-500 bg-slate-100 px-1 py-0.2 rounded-xs font-normal">
                          {block.category}
                        </span>
                      )}
                    </div>

                    {/* Full Body Text & Continuation Jump-Line (Natural Flow - Zero Cutoff) */}
                    <div
                      className="text-slate-950 font-normal mt-1 shrink-0"
                      style={{
                        fontFamily: isTelugu ? "'Mallanna', sans-serif" : 'inherit',
                        fontSize: isTelugu ? `${block.bodyFontSize || 10.5}px` : '10px',
                        lineHeight: isTelugu ? '1.28' : '1.22',
                        letterSpacing: '-0.01em',
                        wordBreak: 'break-word',
                      }}
                    >
                      <div
                        style={{
                          columnCount: isWide ? 2 : 1,
                          columnGap: isWide ? '14px' : 'normal',
                          columnRule: isWide ? '1px solid #e2e8f0' : 'none',
                          textAlign: 'justify',
                        }}
                      >
                        {block.leadParagraph && (
                          <span className="text-slate-900 mr-1 inline font-normal">
                            {block.leadParagraph}{' '}
                          </span>
                        )}
                        <span>{block.bodyContent}</span>
                      </div>

                      {/* Continued Jump Line */}
                      {block.continuedOnPage && (
                        <div className="mt-1.5 text-right shrink-0">
                          <span
                            className="inline-block text-[9px] text-red-800 bg-red-50/90 border border-red-200 px-1.5 py-0.2 rounded-xs italic font-normal"
                            style={{
                              fontFamily: isTelugu ? "'Mallanna', sans-serif" : 'inherit',
                              letterSpacing: '-0.01em',
                            }}
                          >
                            (మిగతా {block.continuedOnPage}వ పేజీలో...) ➔
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* 3. PLACED ADVERTISEMENTS */}
        {(pageToRender.adPlacements || []).map((ad) => (
          <div
            key={ad.placementId}
            className="absolute bg-amber-50/70 dark:bg-amber-950/20 border-2 border-dashed border-amber-400/80 flex flex-col items-center justify-center p-2 text-center rounded-xs"
            style={{
              top: `${ad.y}px`,
              left: `${ad.x}px`,
              width: `${ad.width}px`,
              height: `${ad.height}px`,
            }}
          >
            <span className="text-[9px] font-sans uppercase font-bold text-amber-900 dark:text-amber-300 tracking-wider">
              Commercial Advertisement Zone
            </span>
            <span className="text-[8px] font-sans text-slate-600 dark:text-slate-400 italic">
              Client: {ad.sponsorLabel} • Immovable Hard Grid Constraint
            </span>
          </div>
        ))}

        {/* 4. FOOTER (Page Numbering & Imprint - Zero Overlap at Exact Base Rule) */}
        <div
          className="absolute border-t border-slate-400 pt-1 text-[9px] font-sans text-slate-700 flex justify-between px-1 bg-white z-10"
          style={{
            top: `${footerTop}px`,
            left: `${grid.margins.left}px`,
            width: `${grid.contentWidth}px`,
            height: `${footerHeight}px`,
          }}
        >
          <span className="font-bold text-red-800">{selectedBrand.name}</span>
          <span className="font-medium">
            {isTelugu
              ? `పేజీ ${pageToRender.pageNumber} / ${pages.length}`
              : selectedBrand.headerFooterRules.pageNumberFormat.replace('{n}', String(pageToRender.pageNumber)).replace('{total}', String(pages.length))}
          </span>
          <span>{edition.editionDate || edition.publicationDate || '30 అక్టోబర్ 2026'}</span>
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#f8fafd] dark:bg-[#202124] text-[#202124] dark:text-slate-100 overflow-hidden select-none font-sans">
      {/* 1. NEWSPAPER PREVIEW & PDF DOWNLOAD TOPBAR */}
      <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between z-20 shrink-0 shadow-xs print:hidden">
        {/* Left: Newspaper Name & Publication Date */}
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
                if (nextBrand.language === 'te' || nextBrand.brandId === TELUGU_NEWSPAPER_BRAND.brandId) {
                  setEdition(TELUGU_NEWSPAPER_EDITION);
                  setPages(TELUGU_PREPLANNED_PAGES);
                  setCurrentPageIndex(0);
                } else {
                  setEdition(MOCK_CURRENT_EDITION);
                  const enPlan = PagePlanningEngine.planEditionLayout({
                    edition: MOCK_CURRENT_EDITION,
                    template: selectedTemplate,
                    stories: availableStories.filter((s) => s.category !== 'జాతీయం' && s.category !== 'రాష్ట్రీయం' && s.category !== 'జిల్లా వార్తలు'),
                    targetPageCount: 2,
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

        {/* Center: Page Switcher & Zoom */}
        <div className="flex items-center space-x-3">
          {/* Page Switcher: pure 1/4 */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
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

          {/* Simple Zoom Controls */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
              className="p-0.5 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 text-center font-bold text-blue-600 dark:text-blue-400 font-mono">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.8, Number((z + 0.1).toFixed(2))))}
              className="p-0.5 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: PDF Download (A4 standard + Broadsheet Press) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePrintPdf('a4')}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs transition-colors"
            title="Download Standard A4 PDF (Universal Size)"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF (A4)</span>
          </button>
          <button
            onClick={() => handlePrintPdf('broadsheet')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-medium cursor-pointer shadow-xs transition-colors"
            title="Download Broadsheet Press PDF (350x540mm)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Broadsheet (Press PDF)</span>
          </button>
        </div>
      </div>

      {/* NEWSPAPER PAGE PREVIEW CANVAS */}
      <div className="flex-1 bg-[#d5d8de] dark:bg-[#151518] overflow-auto p-4 sm:p-6 flex flex-col items-center justify-start print:hidden">
        {/* Scrollable & Centered Physical Print Canvas Sheet Container */}
        <div
          className="shrink-0 relative transition-all duration-150 mb-10 shadow-2xl"
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

      {/* 4. FULL PRINT EDITION RENDER (All Pages for PDF Export - 100% Centered & Fitted) */}
      <div className="hidden print:block print-newspaper-export-container font-sans bg-white text-black">
        {pages.map((p) => (
          <div
            key={`print-${p.pageId}`}
            className="print-page-sheet bg-white text-slate-950"
          >
            <div className="print-page-inner">
              {renderPageCanvasElements(p, false)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
