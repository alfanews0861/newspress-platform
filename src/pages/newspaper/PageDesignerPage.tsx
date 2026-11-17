/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Newspaper Page Designer & Layout Engine Interface
 * Full interactive visual newspaper editor supporting multi-column broadsheet and tabloid grids,
 * deterministic AUTO LAYOUT, locked elements, ad constraints, preflight diagnostics, and senior finalization.
 */

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
import { newsSubmissionService } from '../../services/newsSubmissionService';
import { marketplaceService } from '../../services/marketplaceService';
import { marketplaceContentWorkspaceService } from '../../services/marketplaceContentWorkspaceService';
import { readLocalString, writeLocalString } from '../../utils/localStore';

const NEWSPAPER_PHOTO_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="#e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="22" font-weight="600">NewsPress Photo Archive</text></svg>'
  );
import {
  detectIndicScript,
  getHeadlineFontForScript,
  getBodyFontForScript,
  getLocalizedPrintLabels,
  computeBalancedHeadline,
  computeVariedHeadlineSize,
  getBlockHeadlineDesignVariant,
  getBlockSubheadlineVariant,
  getDynamicPhotoPlacement,
  allocatePageSpecialBlocks,
  getUniqueCompleteStorySentences,
  getRealStorySentences,
} from '../../utils/newspaperTypographyEngine';

/**
 * DOM-Calibrated Headline Line that awaits webfont loading and sizes strictly within safe inner padding
 * without horizontal stretching (>1.0 scaleX) or start/end character clipping across all Indic/Latin scripts.
 */
const AutoFitHeadlineLine: React.FC<{
  baseFontSizePx: number;
  lineHeight: string;
  isLeftAligned: boolean;
  isMainBottomLine: boolean;
  isSingleLine: boolean;
  textKey: string;
  children: React.ReactNode;
}> = ({
  baseFontSizePx,
  lineHeight,
  isLeftAligned,
  isMainBottomLine,
  isSingleLine,
  textKey,
  children,
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const boxEl = boxRef.current;
    const spanEl = spanRef.current;
    if (!boxEl || !spanEl) return;

    const measureAndFit = () => {
      spanEl.style.transform = 'scaleX(1)';
      spanEl.style.fontSize = `${baseFontSizePx}px`;

      const boxW = boxEl.clientWidth;
      const naturalW = spanEl.scrollWidth || spanEl.offsetWidth;
      if (boxW <= 24 || naturalW <= 5) return;

      // 10px horizontal clearance prevents Telugu/Indic vowel swashes & overhanging matras from clipping
      const safeMaxW = Math.max(36, boxW - 10);
      let finalFontPx = baseFontSizePx;

      if (naturalW < safeMaxW * 0.94 && (isSingleLine || isMainBottomLine)) {
        const maxFontGrowFactor = isSingleLine ? 1.18 : 1.08;
        const neededFactor = (safeMaxW * 0.96) / naturalW;
        const fontGrow = Math.min(maxFontGrowFactor, neededFactor);
        finalFontPx = Math.round(baseFontSizePx * fontGrow * 10) / 10;
        spanEl.style.fontSize = `${finalFontPx}px`;
      }

      // Step down font size cleanly if natural width exceeds safeMaxW
      let currentW = spanEl.scrollWidth || spanEl.offsetWidth;
      if (currentW > safeMaxW) {
        const ratio = safeMaxW / currentW;
        finalFontPx = Math.max(11, Math.floor(finalFontPx * ratio * 10) / 10);
        spanEl.style.fontSize = `${finalFontPx}px`;
        currentW = spanEl.scrollWidth || spanEl.offsetWidth;
        // Fine step guard in case webfont glyph metrics round slightly wider
        while (currentW > safeMaxW && finalFontPx > 11) {
          finalFontPx = Math.max(11, Math.round((finalFontPx - 0.5) * 10) / 10);
          spanEl.style.fontSize = `${finalFontPx}px`;
          currentW = spanEl.scrollWidth || spanEl.offsetWidth;
        }
      }

      // Emergency scaleX clamp strictly <= 1.0 only if 11px is still slightly wider than narrow column
      if (currentW > safeMaxW && currentW > 5) {
        const clampScale = Math.max(0.72, Math.min(1.0, Math.floor((safeMaxW / currentW) * 1000) / 1000));
        spanEl.style.transform = `scaleX(${clampScale})`;
      } else {
        spanEl.style.transform = 'scaleX(1)';
      }

      spanEl.dataset.baseFontSize = String(finalFontPx);
      spanEl.dataset.boxWidth = String(boxW);
    };

    measureAndFit();

    const resizeObs =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measureAndFit()) : null;
    resizeObs?.observe(boxEl);

    let cancelled = false;
    const onFontsDone = () => {
      if (!cancelled) measureAndFit();
    };
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(onFontsDone).catch(() => {});
      document.fonts.addEventListener?.('loadingdone', onFontsDone);
    }

    return () => {
      cancelled = true;
      resizeObs?.disconnect();
      if (typeof document !== 'undefined' && document.fonts) {
        document.fonts.removeEventListener?.('loadingdone', onFontsDone);
      }
    };
  }, [baseFontSizePx, lineHeight, isLeftAligned, isMainBottomLine, isSingleLine, textKey]);

  return (
    <div
      ref={boxRef}
      className="w-full flex items-center"
      style={{
        overflow: 'visible',
        justifyContent: isLeftAligned ? 'flex-start' : 'center',
        padding: '2px 5px',
      }}
    >
      <span
        ref={spanRef}
        data-headline-line="true"
        className="inline-block whitespace-nowrap"
        style={{
          fontSize: `${baseFontSizePx}px`,
          lineHeight,
          transformOrigin: isLeftAligned ? 'left center' : 'center center',
        }}
      >
        {children}
      </span>
    </div>
  );
};

/**
 * Grows headline font size inside a story block to consume remaining vertical whitespace
 * without EVER enlarging body text fontSize/lineHeight or clipping headline edges.
 */
function growHeadlineToFillWhitespace(
  blockRoot: HTMLElement | null,
  fitsCleanly: () => boolean,
  getRemainingSpacePx: () => number,
  resetTextFlow?: () => void
) {
  if (!blockRoot) return;
  const headlineSpans = Array.from(
    blockRoot.querySelectorAll('span[data-headline-line="true"]')
  ) as HTMLSpanElement[];
  if (headlineSpans.length === 0) return;

  const applyDelta = (deltaPx: number): boolean => {
    let fitsWidth = true;
    for (const sp of headlineSpans) {
      const basePx = parseFloat(sp.dataset.baseFontSize || sp.style.fontSize || '18');
      const boxW = parseFloat(sp.dataset.boxWidth || String(sp.parentElement?.clientWidth || 0));
      const safeMaxW = Math.max(36, boxW - 10);
      const nextPx = Math.round((basePx + deltaPx) * 10) / 10;
      sp.style.transform = 'scaleX(1)';
      sp.style.fontSize = `${nextPx}px`;
      if (boxW > 24) {
        const natW = sp.scrollWidth || sp.offsetWidth;
        if (natW > safeMaxW) {
          fitsWidth = false;
          if (deltaPx === 0 && natW > 5) {
            const clampSx = Math.max(0.72, Math.min(1.0, Math.floor((safeMaxW / natW) * 1000) / 1000));
            sp.style.transform = `scaleX(${clampSx})`;
          }
        }
      }
    }
    if (resetTextFlow) resetTextFlow();
    return fitsWidth;
  };

  applyDelta(0);
  if (getRemainingSpacePx() <= 16) return;

  let bestDelta = 0;
  for (let d = 1.5; d <= 9; d += 1.5) {
    const fitsW = applyDelta(d);
    if (fitsW && fitsCleanly()) {
      bestDelta = d;
      if (getRemainingSpacePx() <= 16) break;
    } else {
      applyDelta(bestDelta);
      break;
    }
  }
}

/**
 * DOM-Calibrated Multi-Column Story Flow (Single Unified Multi-Column Zone).
 * Binary-searches over complete, non-repeating journalistic sentences so that:
 * 1. Every column is filled to the bottom (ZERO white spaces!).
 * 2. The story NEVER overflows into a hidden column and NEVER cuts off mid-sentence!
 */
const FittedSingleZoneMultiColStory: React.FC<{
  sentences: string[];
  columnCount: number;
  columnGap?: string;
  baseFontSizePx: number;
  baseLineHeight: number;
  fontFamily: string;
  leadingElements?: React.ReactNode;
  datelineElement?: React.ReactNode;
  trailingElements?: React.ReactNode;
  pinnedBadge?: React.ReactNode;
  allowFullStoryFit?: boolean;
  layoutKey: string;
}> = ({
  sentences,
  columnCount,
  columnGap = '12px',
  baseFontSizePx,
  baseLineHeight,
  fontFamily,
  leadingElements,
  datelineElement,
  trailingElements,
  pinnedBadge,
  allowFullStoryFit = true,
  layoutKey,
}) => {
  const colRef = useRef<HTMLDivElement>(null);
  const textSpanRef = useRef<HTMLSpanElement>(null);
  const endMarkerRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const colEl = colRef.current;
    const textSpan = textSpanRef.current;
    const markerEl = endMarkerRef.current;
    if (!colEl || !textSpan || sentences.length === 0) return;

    const blockRoot = colEl.closest('[data-story-block-root="true"]') as HTMLElement | null;
    const photoImg = blockRoot?.querySelector('img[data-story-photo="true"]') as HTMLImageElement | null;

    const runFit = () => {
    const rawBasePhotoH = photoImg
      ? parseFloat(photoImg.dataset.baseHeight || String(photoImg.getBoundingClientRect().height || 110))
      : 0;
    const rawBaseMaxW = photoImg
      ? parseFloat(photoImg.dataset.baseMaxWidth || '92')
      : 92;

    // Lock uniform paper-wide body typography (NEVER increase or shrink body font size or line-height!)
    colEl.style.lineHeight = String(baseLineHeight);
    colEl.style.fontSize = `${baseFontSizePx}px`;
    colEl.style.columnFill = 'auto';

    if (colEl.clientWidth <= 10 || colEl.clientHeight <= 10) {
      textSpan.textContent = sentences.join(' ');
      return;
    }

    let effectiveBasePhotoH = rawBasePhotoH;
    const isPhotoInsideCol = Boolean(photoImg && colEl.contains(photoImg));
    if (photoImg && effectiveBasePhotoH > 0) {
      photoImg.style.maxHeight = `${effectiveBasePhotoH}px`;
      photoImg.style.maxWidth = `${rawBaseMaxW}%`;
      if (isPhotoInsideCol && photoImg.parentElement) {
        const photoBoxRect = photoImg.parentElement.getBoundingClientRect();
        const imgRect = photoImg.getBoundingClientRect();
        const chromeH = Math.max(0, photoBoxRect.height - imgRect.height);
        if (photoBoxRect.height > colEl.clientHeight - 14) {
          effectiveBasePhotoH = Math.max(60, Math.floor(colEl.clientHeight - chromeH - 14));
          photoImg.style.maxHeight = `${effectiveBasePhotoH}px`;
        }
      }
    }

    const fitsCleanly = () =>
      colEl.clientWidth > 10 &&
      colEl.clientHeight > 10 &&
      colEl.scrollWidth <= colEl.clientWidth + 2 &&
      colEl.scrollHeight <= colEl.clientHeight + 2;

    const getRemainingSpacePx = () => {
      if (!markerEl) return 0;
      const colRect = colEl.getBoundingClientRect();
      const markerRect = markerEl.getBoundingClientRect();
      if (colRect.width <= 0 || colRect.height <= 0) return 0;
      const colStep = colRect.width / Math.max(1, columnCount);
      const markerColIdx = Math.min(
        Math.max(0, columnCount - 1),
        Math.max(0, Math.floor((markerRect.left - colRect.left + 4) / colStep))
      );
      const emptyColsAfter = Math.max(0, columnCount - 1 - markerColIdx);
      const remInMarkerCol = Math.max(0, colRect.bottom - markerRect.bottom);
      return emptyColsAfter * colRect.height + remInMarkerCol;
    };

    const tryGrowPhotoToFill = (startPhotoH: number) => {
      // Scale photo up proportionally within full column width with zero cropping
      if (!photoImg || isPhotoInsideCol || startPhotoH <= 0 || !markerEl) return;
      let remaining = getRemainingSpacePx();
      if (remaining <= 8) return;

      const blockRect = blockRoot?.getBoundingClientRect();
      const maxPhotoH = Math.min(
        startPhotoH + 260,
        Math.max(startPhotoH, Math.round((blockRect?.height || colEl.clientHeight + startPhotoH) * 0.68))
      );

      let bestPhotoH = startPhotoH;
      let bestMaxW = rawBaseMaxW;
      for (let hTry = startPhotoH + 6; hTry <= maxPhotoH; hTry += 6) {
        const wTry = Math.min(100, Math.max(rawBaseMaxW, 96) + Math.round(((hTry - startPhotoH) / 6) * 2));
        photoImg.style.maxHeight = `${hTry}px`;
        photoImg.style.maxWidth = `${Math.min(100, wTry)}%`;
        if (colEl.clientHeight < 38) {
          photoImg.style.maxHeight = `${bestPhotoH}px`;
          photoImg.style.maxWidth = `${bestMaxW}%`;
          break;
        }
        if (fitsCleanly()) {
          bestPhotoH = hTry;
          bestMaxW = Math.min(100, wTry);
          remaining = getRemainingSpacePx();
          if (remaining <= 8) break;
        } else {
          photoImg.style.maxHeight = `${bestPhotoH}px`;
          photoImg.style.maxWidth = `${bestMaxW}%`;
          break;
        }
      }
    };

    const expandPhotoOrHeadline = () => {
      // Priority 1: Grow uncropped photo size proportionally
      tryGrowPhotoToFill(effectiveBasePhotoH);
      // Priority 2: Grow headline size (NEVER body text fontSize or lineHeight)
      if (getRemainingSpacePx() > 16) {
        growHeadlineToFillWhitespace(blockRoot, fitsCleanly, getRemainingSpacePx);
      }
      // Balance trailing multi-column endings evenly so no single column ends raggedly higher
      if (columnCount > 1 && getRemainingSpacePx() > 6) {
        colEl.style.columnFill = 'balance';
      }
    };

    if (allowFullStoryFit) {
      // 1. Try fitting 100% of the real story text at uniform paper-wide typography
      textSpan.textContent = sentences.join(' ');

      if (fitsCleanly()) {
        expandPhotoOrHeadline();
        return;
      }

      // 2. If real story slightly overflows at uniform typography, gently reduce maxHeight first (never shrink body font or crop!)
      if (photoImg && effectiveBasePhotoH > 76) {
        const minPhotoH = Math.max(70, effectiveBasePhotoH - 36);
        let fittedWithSmallerPhoto = false;
        for (let hTry = effectiveBasePhotoH - 4; hTry >= minPhotoH; hTry -= 4) {
          photoImg.style.maxHeight = `${hTry}px`;
          if (fitsCleanly()) {
            fittedWithSmallerPhoto = true;
            break;
          }
        }
        if (fittedWithSmallerPhoto) {
          if (getRemainingSpacePx() > 16) {
            growHeadlineToFillWhitespace(blockRoot, fitsCleanly, getRemainingSpacePx);
          }
          return;
        }
        photoImg.style.maxHeight = `${effectiveBasePhotoH}px`;
      }
    }

    // Binary search for the maximum number of complete sentences that fit cleanly at uniform paper-wide typography
    let low = 1;
    let high = sentences.length;
    let bestK = 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      textSpan.textContent = sentences.slice(0, mid).join(' ');
      if (fitsCleanly()) {
        bestK = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    textSpan.textContent = sentences.slice(0, bestK).join(' ');

    // If even 1 sentence slightly overflowed in a tiny box, trim to the last word that fits cleanly
    if (bestK === 1 && !fitsCleanly()) {
      const words = sentences[0].split(' ');
      let wLow = 4;
      let wHigh = words.length;
      let bestW = words.length;
      while (wLow <= wHigh) {
        const wMid = Math.floor((wLow + wHigh) / 2);
        textSpan.textContent = `${words.slice(0, wMid).join(' ')}.`;
        if (fitsCleanly()) {
          bestW = wMid;
          wLow = wMid + 1;
        } else {
          wHigh = wMid - 1;
        }
      }
      textSpan.textContent = `${words.slice(0, bestW).join(' ').replace(/[.,;:!?]+$/, '')}.`;
    }

    // Priority 1: Grow uncropped photo size; Priority 2: Grow headline size (NEVER body fontSize or lineHeight)
    expandPhotoOrHeadline();
    };

    runFit();
    if (photoImg && !photoImg.complete) {
      photoImg.addEventListener('load', runFit);
      return () => photoImg.removeEventListener('load', runFit);
    }
  }, [sentences, columnCount, baseFontSizePx, baseLineHeight, allowFullStoryFit, layoutKey]);

  return (
    <div
      className="text-slate-950 font-normal mt-0.5 flex-1 min-h-0 overflow-hidden flex flex-col justify-between relative w-full"
      style={{
        fontFamily,
        fontSize: `${baseFontSizePx}px`,
        lineHeight: String(baseLineHeight),
        letterSpacing: 'normal',
        overflowWrap: 'break-word',
        fontWeight: 400,
        fontSynthesis: 'none',
      }}
    >
      <div
        ref={colRef}
        data-story-col-flow="true"
        className="overflow-hidden flex-1 min-h-0 relative w-full h-full"
        style={{
          position: 'absolute',
          inset: 0,
          columnCount,
          columnGap,
          columnRule: columnCount >= 2 ? '1px solid #e2e8f0' : 'none',
          columnFill: 'auto',
          textAlign: 'justify',
          textJustify: 'inter-word',
        }}
      >
        {leadingElements}
        {datelineElement}
        <span ref={textSpanRef} data-story-text-span="true">{sentences.slice(0, 6).join(' ')}</span>
        {trailingElements}
        <span ref={endMarkerRef} className="inline-block w-0 h-0 overflow-hidden" />
      </div>
      {pinnedBadge}
    </div>
  );
};

/**
 * DOM-Calibrated Broadsheet Photo-Wrap + Full-Width Balanced Multi-Column Story:
 * Top Row: Photo Zone (width = photoZoneWidthPercent%) + Equal-Height Side Columns (filling the exact height of the photo).
 * Bottom Row: Full-width multi-column zone spanning ALL `totalCols` below the photo with balanced column endings.
 * Eliminates asymmetric half-empty right/left columns: grows uncropped photo first, balances columns, and lets live box compaction hug content cleanly.
 */
const FittedTwoZonePhotoStory: React.FC<{
  sentences: string[];
  isPhotoRight: boolean;
  photoZoneWidthPercent: number;
  totalCols: number;
  sideCols: number;
  baseFontSizePx: number;
  baseLineHeight: number;
  fontFamily: string;
  photoHeaderElements: React.ReactNode;
  underPhotoLeadingElements?: React.ReactNode;
  datelineElement?: React.ReactNode;
  sideZoneLeadingElements?: React.ReactNode;
  trailingElements?: React.ReactNode;
  pinnedBadge?: React.ReactNode;
  allowFullStoryFit?: boolean;
  layoutKey: string;
}> = ({
  sentences,
  isPhotoRight,
  photoZoneWidthPercent,
  totalCols,
  sideCols,
  baseFontSizePx,
  baseLineHeight,
  fontFamily,
  photoHeaderElements,
  underPhotoLeadingElements,
  datelineElement,
  sideZoneLeadingElements,
  trailingElements,
  pinnedBadge,
  allowFullStoryFit = true,
  layoutKey,
}) => {
  const photoZoneRef = useRef<HTMLDivElement>(null);
  const sideColRef = useRef<HTMLDivElement>(null);
  const sideTextSpanRef = useRef<HTMLSpanElement>(null);
  const sideEndMarkerRef = useRef<HTMLSpanElement>(null);
  const bottomWrapRef = useRef<HTMLDivElement>(null);
  const bottomColRef = useRef<HTMLDivElement>(null);
  const bottomTextSpanRef = useRef<HTMLSpanElement>(null);
  const bottomEndMarkerRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const photoZoneEl = photoZoneRef.current;
    const sideEl = sideColRef.current;
    const sideSpan = sideTextSpanRef.current;
    const sideMarker = sideEndMarkerRef.current;
    const bottomWrapEl = bottomWrapRef.current;
    const bottomEl = bottomColRef.current;
    const bottomSpan = bottomTextSpanRef.current;
    const bottomMarker = bottomEndMarkerRef.current;
    if (!photoZoneEl || !sideEl || !sideSpan || !bottomWrapEl || !bottomEl || !bottomSpan || sentences.length === 0) return;

    const blockRoot = photoZoneEl.closest('[data-story-block-root="true"]') as HTMLElement | null;
    const photoImg = photoZoneEl.querySelector('img[data-story-photo="true"]') as HTMLImageElement | null;

    const runFit = () => {
      photoZoneEl.style.width = `${photoZoneWidthPercent}%`;
      bottomWrapEl.style.display = 'block';

      const basePhotoH = photoImg
        ? parseFloat(photoImg.dataset.baseHeight || String(photoImg.getBoundingClientRect().height || 160))
        : 0;
      const baseMaxW = photoImg ? parseFloat(photoImg.dataset.baseMaxWidth || '100') : 100;
      if (photoImg && basePhotoH > 0) {
        photoImg.style.maxHeight = `${basePhotoH}px`;
        photoImg.style.maxWidth = `${baseMaxW}%`;
      }

      const fullText = sentences.join(' ');
      const allWords = fullText.split(' ');

      const fitAtUniformTypography = (): {
        splitIdx: number;
        remainingSentences: string[];
        allFit: boolean;
        hasBottom: boolean;
        bestS: number;
      } => {
        sideEl.style.fontSize = `${baseFontSizePx}px`;
        sideEl.style.lineHeight = String(baseLineHeight);
        sideEl.style.columnFill = 'auto';
        bottomEl.style.fontSize = `${baseFontSizePx}px`;
        bottomEl.style.lineHeight = String(baseLineHeight);
        bottomEl.style.columnFill = 'auto';

        bottomWrapEl.style.display = 'block';
        const sideW = sideEl.clientWidth;
        const sideH = sideEl.clientHeight;

        let splitWordIdx = 0;
        if (sideW > 15 && sideH > 18) {
          let wLow = 1;
          let wHigh = allWords.length;
          let bestW = 0;
          while (wLow <= wHigh) {
            const wMid = Math.floor((wLow + wHigh) / 2);
            sideSpan.textContent = allWords.slice(0, wMid).join(' ');
            const overflows = sideEl.scrollWidth > sideW + 2 || sideEl.scrollHeight > sideH + 2;
            if (!overflows) {
              bestW = wMid;
              wLow = wMid + 1;
            } else {
              wHigh = wMid - 1;
            }
          }
          splitWordIdx = bestW;
          sideSpan.textContent = splitWordIdx > 0 ? allWords.slice(0, splitWordIdx).join(' ') : '';
        } else {
          sideSpan.textContent = '';
        }

        const remainingText = allWords.slice(splitWordIdx).join(' ').trim();
        if (!remainingText) {
          bottomSpan.textContent = '';
          bottomWrapEl.style.display = 'none';
          return { splitIdx: splitWordIdx, remainingSentences: [], allFit: true, hasBottom: false, bestS: 0 };
        }

        const bottomW = bottomEl.clientWidth;
        const bottomH = bottomEl.clientHeight;
        const minBottomLineH = Math.ceil(baseFontSizePx * baseLineHeight * 1.3);

        if (bottomW <= 12 || bottomH < minBottomLineH) {
          bottomSpan.textContent = '';
          bottomWrapEl.style.display = 'none';
          return { splitIdx: splitWordIdx, remainingSentences: [], allFit: false, hasBottom: false, bestS: 0 };
        }

        const remainingSentences = remainingText
          .replace(/\.{2,}/g, '__ELLIPSIS__')
          .replace(/(రూ|డా|శ్రీ|ప్రొ|కి\.మీ|Mr|Mrs|Ms|Dr|Prof)\.\s+/g, '$1__DOT__ ')
          .split(/(?<=[.!?।])\s+/)
          .map((s) => s.replace(/__DOT__/g, '.').replace(/__ELLIPSIS__/g, '..').trim())
          .filter((s) => s.length > 0);

        if (remainingSentences.length === 0) {
          bottomSpan.textContent = '';
          bottomWrapEl.style.display = 'none';
          return { splitIdx: splitWordIdx, remainingSentences: [], allFit: true, hasBottom: false, bestS: 0 };
        }

        // Check if ALL remaining text fits cleanly across all bottom columns
        bottomSpan.textContent = remainingSentences.join(' ');
        if (bottomEl.scrollWidth <= bottomW + 2 && bottomEl.scrollHeight <= bottomH + 2) {
          return { splitIdx: splitWordIdx, remainingSentences, allFit: true, hasBottom: true, bestS: remainingSentences.length };
        }

        let sLow = 1;
        let sHigh = remainingSentences.length;
        let bestS = 1;
        while (sLow <= sHigh) {
          const sMid = Math.floor((sLow + sHigh) / 2);
          bottomSpan.textContent = remainingSentences.slice(0, sMid).join(' ');
          const overflows = bottomEl.scrollWidth > bottomW + 2 || bottomEl.scrollHeight > bottomH + 2;
          if (!overflows) {
            bestS = sMid;
            sLow = sMid + 1;
          } else {
            sHigh = sMid - 1;
          }
        }
        bottomSpan.textContent = remainingSentences.slice(0, bestS).join(' ');
        return { splitIdx: splitWordIdx, remainingSentences, allFit: false, hasBottom: true, bestS };
      };

      const getRemainingSpacePx = (hasBottom: boolean) => {
        if (hasBottom && bottomMarker && bottomSpan.textContent) {
          const rect = bottomEl.getBoundingClientRect();
          const mRect = bottomMarker.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return 0;
          const colStep = rect.width / Math.max(1, totalCols);
          const colIdx = Math.min(
            Math.max(0, totalCols - 1),
            Math.max(0, Math.floor((mRect.left - rect.left + 4) / colStep))
          );
          const emptyCols = Math.max(0, totalCols - 1 - colIdx);
          const remInCol = Math.max(0, rect.bottom - mRect.bottom);
          return emptyCols * rect.height + remInCol;
        }
        if (sideMarker && sideSpan.textContent) {
          const sRect = sideEl.getBoundingClientRect();
          const mRect = sideMarker.getBoundingClientRect();
          const bRect = bottomWrapEl.getBoundingClientRect();
          const remSide = Math.max(0, sRect.bottom - mRect.bottom);
          const remBottom = bottomWrapEl.style.display === 'none' ? 0 : bRect.height;
          return remSide + remBottom;
        }
        return 0;
      };

      let result = fitAtUniformTypography();
      let activePhotoH = basePhotoH;

      // 1. If full story overflows slightly, gently step down photo maxHeight so all columns fit cleanly (never shrink body font)
      if (allowFullStoryFit && !result.allFit && photoImg && basePhotoH > 96) {
        const minPhotoH = Math.max(82, Math.round(basePhotoH * 0.56));
        for (let hTry = basePhotoH - 6; hTry >= minPhotoH; hTry -= 6) {
          photoImg.style.maxHeight = `${hTry}px`;
          const attempt = fitAtUniformTypography();
          if (attempt.allFit) {
            result = attempt;
            activePhotoH = hTry;
            break;
          }
        }
        if (!result.allFit) {
          photoImg.style.maxHeight = `${basePhotoH}px`;
          result = fitAtUniformTypography();
        }
      }

      // 2. Grow uncropped photo size & photo zone width to fill leftover bottom/side whitespace cleanly
      if (photoImg && activePhotoH > 0) {
        const blockRect = blockRoot?.getBoundingClientRect();
        const maxPhotoH = Math.min(
          activePhotoH + 260,
          Math.max(activePhotoH, Math.round((blockRect?.height || 540) * 0.68))
        );
        const remaining = getRemainingSpacePx(result.hasBottom);

        if (result.allFit && remaining > 10) {
          let bestPhotoH = activePhotoH;
          let bestZonePct = photoZoneWidthPercent;

          for (let step = 1; step <= 26; step++) {
            const hTry = Math.min(maxPhotoH, activePhotoH + step * 8);
            const zTry = Math.min(68, photoZoneWidthPercent + step * 0.65);
            photoImg.style.maxHeight = `${hTry}px`;
            photoImg.style.maxWidth = '100%';
            photoZoneEl.style.width = `${zTry}%`;

            const attempt = fitAtUniformTypography();
            if (attempt.allFit) {
              bestPhotoH = hTry;
              bestZonePct = zTry;
              result = attempt;
              if (getRemainingSpacePx(attempt.hasBottom) <= 10 && attempt.hasBottom) break;
            } else {
              photoImg.style.maxHeight = `${bestPhotoH}px`;
              photoZoneEl.style.width = `${bestZonePct}%`;
              result = fitAtUniformTypography();
              break;
            }
          }
        } else if (!result.hasBottom && sideMarker && sideSpan.textContent) {
          // All text fit beside photo: widen photo slightly if side text ended much higher than photo bottom
          const sRect = sideEl.getBoundingClientRect();
          const mRect = sideMarker.getBoundingClientRect();
          if (sRect.bottom - mRect.bottom > 22) {
            let bestZonePct = photoZoneWidthPercent;
            for (let zTry = photoZoneWidthPercent + 2; zTry <= 68; zTry += 2) {
              photoZoneEl.style.width = `${zTry}%`;
              const attempt = fitAtUniformTypography();
              if (attempt.allFit) {
                bestZonePct = zTry;
                result = attempt;
                const sr2 = sideEl.getBoundingClientRect();
                const mr2 = sideMarker.getBoundingClientRect();
                if (sr2.bottom - mr2.bottom <= 16) break;
              } else {
                photoZoneEl.style.width = `${bestZonePct}%`;
                result = fitAtUniformTypography();
                break;
              }
            }
          }
        }
      }

      // 3. Grow headline size gently if bottom whitespace still remains (NEVER alter body fontSize or lineHeight)
      if (result.hasBottom && getRemainingSpacePx(true) > 16) {
        growHeadlineToFillWhitespace(
          blockRoot,
          () => {
            const check = fitAtUniformTypography();
            return result.allFit ? check.allFit : check.bestS >= result.bestS;
          },
          () => getRemainingSpacePx(result.hasBottom),
          () => {
            result = fitAtUniformTypography();
          }
        );
      }

      // 4. Balance trailing multi-column endings across ALL columns so every column ends on the same level
      if (result.hasBottom && totalCols > 1 && getRemainingSpacePx(true) > 6) {
        bottomEl.style.columnFill = 'balance';
      } else if (!result.hasBottom && sideCols > 1) {
        sideEl.style.columnFill = 'balance';
      }
    };

    runFit();
    if (photoImg && !photoImg.complete) {
      photoImg.addEventListener('load', runFit);
      return () => photoImg.removeEventListener('load', runFit);
    }
  }, [sentences, isPhotoRight, photoZoneWidthPercent, totalCols, sideCols, baseFontSizePx, baseLineHeight, allowFullStoryFit, layoutKey]);

  return (
    <div
      className="text-slate-950 font-normal mt-0.5 flex-1 min-h-0 overflow-hidden flex flex-col text-justify relative w-full"
      style={{
        fontFamily,
        fontSize: `${baseFontSizePx}px`,
        lineHeight: String(baseLineHeight),
        textAlign: 'justify',
        textJustify: 'inter-word',
        fontWeight: 400,
        fontSynthesis: 'none',
      }}
    >
      {/* TOP BAND: Photo Zone (left or right) + Equal-Height Side Columns */}
      <div
        data-top-photo-row="true"
        className={`shrink-0 flex ${isPhotoRight ? 'flex-row-reverse' : 'flex-row'} gap-3 items-stretch w-full`}
      >
        <div
          ref={photoZoneRef}
          data-photo-zone="true"
          className="shrink-0 flex flex-col overflow-hidden"
          style={{ width: `${photoZoneWidthPercent}%` }}
        >
          {photoHeaderElements}
        </div>

        <div className="flex-1 min-w-0 relative overflow-hidden">
          <div
            ref={sideColRef}
            data-story-col-flow="true"
            className="overflow-hidden w-full h-full"
            style={{
              position: 'absolute',
              inset: 0,
              columnCount: sideCols,
              columnGap: '12px',
              columnRule: sideCols >= 2 ? '1px solid #e2e8f0' : 'none',
              columnFill: 'auto',
              textAlign: 'justify',
              textJustify: 'inter-word',
            }}
          >
            {datelineElement}
            {sideZoneLeadingElements}
            {underPhotoLeadingElements}
            <span ref={sideTextSpanRef} data-story-text-span="true">{sentences.slice(0, 3).join(' ')}</span>
            <span ref={sideEndMarkerRef} className="inline-block w-0 h-0 overflow-hidden" />
          </div>
        </div>
      </div>

      {/* BOTTOM BAND: Full-Width Balanced Flow Across All Columns Under Photo */}
      <div ref={bottomWrapRef} className="flex-1 min-h-0 relative overflow-hidden w-full mt-1.5">
        <div
          ref={bottomColRef}
          data-story-col-flow="true"
          className="overflow-hidden w-full h-full"
          style={{
            position: 'absolute',
            inset: 0,
            columnCount: totalCols,
            columnGap: '12px',
            columnRule: totalCols >= 2 ? '1px solid #e2e8f0' : 'none',
            columnFill: 'auto',
            textAlign: 'justify',
            textJustify: 'inter-word',
          }}
        >
          <span ref={bottomTextSpanRef} data-story-text-span="true">{sentences.slice(3, 9).join(' ')}</span>
          {trailingElements}
          <span ref={bottomEndMarkerRef} className="inline-block w-0 h-0 overflow-hidden" />
        </div>
      </div>
      {pinnedBadge}
    </div>
  );
};

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
  const [edition, setEdition] = useState<NewspaperEdition>(() => {
    const savedId = readLocalString('newspress_active_edition_id_v1', '');
    if (savedId) {
      const found = EditionPersistenceService.getAllEditions().find((e) => e.editionId === savedId);
      if (found) return found;
    }
    return TELUGU_NEWSPAPER_EDITION || MOCK_CURRENT_EDITION;
  });

  // Multi-page layout state (never allow 0-page empty state)
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [pages, setPages] = useState<NewspaperPage[]>(() => {
    const savedId = readLocalString('newspress_active_edition_id_v1', '');
    if (savedId) {
      const savedPages = EditionPersistenceService.getPagesForEdition(savedId);
      if (savedPages && savedPages.length > 0 && savedPages.some((p) => (p.blocks?.length || 0) > 0)) {
        return savedPages;
      }
    }
    return TELUGU_PREPLANNED_PAGES || [];
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [designerNotice, setDesignerNotice] = useState<string | null>(null);


  // Compute Active Grid (Must be declared before zoom and layout hooks)
  const grid: PageGrid = useMemo(() => {
    return GridCalculationService.calculatePageGrid(selectedTemplate);
  }, [selectedTemplate]);

  // Scroll ref to ensure page view always starts at top on page switch
  const canvasScrollRef = React.useRef<HTMLDivElement>(null);
  const interactiveSheetRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (canvasScrollRef.current) {
      canvasScrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
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
      const padding = 24;
      const availW = Math.max(240, container.clientWidth - padding);

      if (grid.pageWidth > 0) {
        const scaleW = availW / grid.pageWidth;
        const clampedScale = Math.max(0.25, Math.min(Number(scaleW.toFixed(3)), 3.0));
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

  // Live DOM Box-Height Compaction:
  // Whenever a story's content does not fill its planned box height (leaving >= 24px unused whitespace at bottom),
  // shrink the box height cleanly to hug its text/photo and pull directly stacked blocks upward to close vertical gaps.
  useLayoutEffect(() => {
    const compactSheetBlocks = (sheetEl: HTMLElement | null) => {
      if (!sheetEl) return;
      const blockEls = Array.from(
        sheetEl.querySelectorAll('[data-story-block-root="true"]')
      ) as HTMLElement[];
      if (blockEls.length === 0 || sheetEl.offsetWidth <= 100) return;

      const sheetRect = sheetEl.getBoundingClientRect();
      const scale = sheetEl.offsetWidth > 0 ? sheetRect.width / sheetEl.offsetWidth : 1;
      if (scale <= 0.05) return;

      interface BlockGeom {
        el: HTMLElement;
        px: number;
        py: number;
        pw: number;
        ph: number;
        newY: number;
        newH: number;
      }

      const items: BlockGeom[] = blockEls.map((el) => {
        const px = parseFloat(el.dataset.plannedX || '0');
        const py = parseFloat(el.dataset.plannedY || '0');
        const pw = parseFloat(el.dataset.plannedW || '0');
        const ph = parseFloat(el.dataset.plannedH || '0');
        el.style.top = `${py}px`;
        el.style.height = `${ph}px`;
        return { el, px, py, pw, ph, newY: py, newH: ph };
      });

      for (const item of items) {
        if (item.ph <= 95) continue;
        const bRect = item.el.getBoundingClientRect();
        let maxContentBottomLocal = 0;

        // 1. Measure headline, subheadline & photo container bottoms
        const solidEls = item.el.querySelectorAll(
          '[data-story-headline="true"], [data-story-subhead="true"], [data-story-photo-wrap="true"]'
        );
        solidEls.forEach((node) => {
          const r = node.getBoundingClientRect();
          if (r.height > 0) {
            maxContentBottomLocal = Math.max(maxContentBottomLocal, (r.bottom - bRect.top) / scale);
          }
        });

        // 2. Measure exact lowest rendered text line across ALL multi-column fragments via Range.getClientRects()
        const textSpans = item.el.querySelectorAll('[data-story-text-span="true"]');
        textSpans.forEach((span) => {
          if (!span.textContent?.trim()) return;
          try {
            const range = document.createRange();
            range.selectNodeContents(span);
            const rects = range.getClientRects();
            for (let i = 0; i < rects.length; i++) {
              const r = rects[i];
              if (r.height > 0 && r.width > 0) {
                maxContentBottomLocal = Math.max(maxContentBottomLocal, (r.bottom - bRect.top) / scale);
              }
            }
          } catch {
            const r = span.getBoundingClientRect();
            if (r.height > 0) {
              maxContentBottomLocal = Math.max(maxContentBottomLocal, (r.bottom - bRect.top) / scale);
            }
          }
        });

        if (maxContentBottomLocal <= 20) continue;
        const neededH = Math.max(Math.min(item.ph, 92), Math.ceil(maxContentBottomLocal + 12));
        if (item.ph - neededH >= 14 && neededH < item.ph) {
          item.el.style.height = `${neededH}px`;
          // Guard against vertical overflow after height shrink
          const colFlows = Array.from(item.el.querySelectorAll('[data-story-col-flow="true"]')) as HTMLElement[];
          const overflowDelta = colFlows.reduce(
            (maxD, cf) => Math.max(maxD, cf.scrollHeight - cf.clientHeight),
            0
          );
          if (overflowDelta > 2) {
            const safeAdjustedH = Math.min(item.ph, neededH + Math.ceil(overflowDelta) + 4);
            if (item.ph - safeAdjustedH >= 12) {
              item.newH = safeAdjustedH;
              item.el.style.height = `${safeAdjustedH}px`;
            } else {
              item.el.style.height = `${item.ph}px`;
            }
          } else {
            item.newH = neededH;
          }
        }
      }

      // 3. Pull directly stacked sibling blocks upward whenever all preceding column-track blocks shrank cleanly
      const sorted = [...items].sort((a, b) => a.py - b.py);
      for (let i = 0; i < sorted.length; i++) {
        const cur = sorted[i];
        if (cur.py <= 210 && cur.py >= 190) continue; // Keep top row aligned cleanly beneath masthead
        const horizOverlap = sorted.filter(
          (prev) =>
            prev !== cur &&
            prev.py + prev.ph <= cur.py + 8 &&
            Math.min(prev.px + prev.pw, cur.px + cur.pw) - Math.max(prev.px, cur.px) > 12
        );
        if (horizOverlap.length === 0) continue;
        const maxOrigBottom = Math.max(...horizOverlap.map((p) => p.py + p.ph));
        const originalGap = cur.py - maxOrigBottom;
        if (originalGap < -4 || originalGap > 28) continue; // Only pull blocks immediately stacked below stories (never jump over ad slots)
        const maxPrevBottom = Math.max(...horizOverlap.map((p) => p.newY + p.newH));
        const desiredY = Math.round(maxPrevBottom + Math.max(0, originalGap));
        if (desiredY < cur.newY - 10) {
          cur.newY = desiredY;
          cur.el.style.top = `${desiredY}px`;
        }
      }
    };

    const sheetEl = interactiveSheetRef.current;
    if (!sheetEl) return;

    const runInteractiveCompaction = () => compactSheetBlocks(sheetEl);
    const rafId = requestAnimationFrame(runInteractiveCompaction);
    let cancelled = false;
    const onReady = () => {
      if (!cancelled) requestAnimationFrame(runInteractiveCompaction);
    };
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(onReady).catch(() => {});
    }

    const pendingImgs = Array.from(sheetEl.querySelectorAll('img')).filter((img) => !img.complete);
    pendingImgs.forEach((img) => img.addEventListener('load', onReady, { once: true }));

    const handleBeforePrint = () => {
      document.querySelectorAll('.print-page-inner').forEach((el) => {
        compactSheetBlocks(el as HTMLElement);
      });
    };
    window.addEventListener('beforeprint', handleBeforePrint);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      pendingImgs.forEach((img) => img.removeEventListener('load', onReady));
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, [currentPageIndex, pages, zoomLevel, selectedBrand.brandId]);

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

  // Available candidate news stories (Own approved newsroom + acquired marketplace stories)
  const [availableStories, setAvailableStories] = useState<NewsArticle[]>(() => {
    const own = newsSubmissionService.getArticles();
    return own.length > 0 ? own : MOCK_NEWS_ARTICLES;
  });
  const [licenses, setLicenses] = useState<NewsLicense[]>(() => marketplaceService.getLicenses());

  useEffect(() => {
    const tenantId = currentTenant?.tenantId;
    if (!tenantId) return;
    const own = newsSubmissionService.getArticles(tenantId);
    const tenantLicenses = marketplaceService.getLicenses(tenantId);
    setLicenses(tenantLicenses);
    const syndicated: NewsArticle[] = [];
    for (const lic of tenantLicenses) {
      if (lic.buyerTenantId === tenantId && lic.status === 'ACTIVE') {
        const adapted = marketplaceContentWorkspaceService.adaptToNewsroomStory({
          licenseId: lic.licenseId,
          tenantId,
          userId: user?.uid || 'user-editor',
        });
        if (adapted.articleId && adapted.headline) {
          syndicated.push({
            articleId: adapted.articleId,
            tenantId,
            headline: adapted.headline,
            slug: adapted.articleId,
            summary: adapted.leadParagraph || adapted.headline,
            leadParagraph: adapted.leadParagraph || '',
            bodyContent: adapted.bodyContent || adapted.leadParagraph || '',
            authorId: lic.sellerReporterId || 'wire',
            byline: adapted.byline || 'Syndicated Wire',
            authorType: 'syndicated',
            category: adapted.category || 'General',
            district: adapted.district || 'Regional',
            editorialStatus: 'approved',
            originalityVerdict: 'verified_original',
            originalityStatus: 'VERIFIED_ORIGINAL',
            wordCount: (adapted.bodyContent || '').split(/\s+/).filter(Boolean).length || 300,
            tags: [adapted.category || 'Syndicated'],
            isMarketplaceListed: false,
            isMarketplaceEligible: false,
            createdAt: adapted.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
    const merged = [...own, ...syndicated];
    if (merged.length > 0) {
      setAvailableStories(merged);
    }
  }, [currentTenant?.tenantId, user?.uid]);


  // Push new state to undo/redo history & trigger autosave
  const pushHistoryState = useCallback((newPages: NewspaperPage[]) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, JSON.parse(JSON.stringify(newPages))];
    });
    setHistoryIndex((prev) => prev + 1);
    setIsDirty(true);
    EditionPersistenceService.scheduleAutosave(edition, newPages, user?.uid || 'user-editor');
  }, [historyIndex, edition, user?.uid]);

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

        // If paper size, language, or column count changed, adapt layout dynamically across any brand/language
        if (active.paperSize !== 'broadsheet' || (active.defaultColumnCount && active.defaultColumnCount !== 8) || (active.brandId !== TELUGU_NEWSPAPER_BRAND.brandId && active.brandId !== 'brand-andhra-prabha')) {
          const brandLang = (active.language || 'en').toLowerCase().slice(0, 2);
          const isTe = brandLang === 'te' || Boolean(active.name?.includes('తెలుగు'));
          const combinedPool = availableStories.length > 0 ? availableStories : MOCK_NEWS_ARTICLES;
          const filtered = isTe
            ? combinedPool.filter((s) => /[\u0C00-\u0C7F]/.test(`${s.headline || ''} ${s.bodyContent || ''}`))
            : combinedPool.filter((s) => !/[\u0C00-\u0C7F]/.test(`${s.headline || ''} ${s.bodyContent || ''}`));
          const relevantStories = filtered.length > 0 ? filtered : combinedPool;
          const dynamicEdition: NewspaperEdition = {
            ...(isTe ? TELUGU_NEWSPAPER_EDITION : MOCK_CURRENT_EDITION),
            editionId: `ed-${active.brandId}-active`,
            brandId: active.brandId,
            brandName: active.name,
            pageCount: active.pageCount || 4,
            totalPages: active.pageCount || 4,
          };
          const adaptedPlan = PagePlanningEngine.planEditionLayout({
            edition: dynamicEdition,
            template: nextTemplate,
            stories: relevantStories,
            targetPageCount: active.pageCount || 4,
          });
          setEdition(dynamicEdition);
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

  // Initial Plan / Load on mount with automatic recovery from stale/degenerate cached layouts
  useEffect(() => {
    const isDegenerateLayout = (pgs: NewspaperPage[]): boolean => {
      if (!pgs || pgs.length === 0) return true;
      if (pgs.every((p) => (p.blocks?.length || 0) === 0)) return true;
      if (pgs.some((p) => (p.blocks?.length || 0) > 24)) return true;
      if (
        pgs.length >= 2 &&
        (pgs[0]?.blocks?.length || 0) >= 16 &&
        pgs.some((p) => (p.blocks?.length || 0) === 0)
      ) {
        return true;
      }
      if (
        grid.pageWidth >= 1000 &&
        (pgs[0]?.blocks || []).some((b) => b.y < 185 && b.y !== 154)
      ) {
        return true;
      }
      if (pgs.length > 1 && (pgs[1]?.blocks || []).some((b) => b.y < 66)) {
        return true;
      }
      // Also repair previously cached sparse broadsheet builds where short 45-word sample articles sit inside tall multi-col boxes
      const sparseTallSampleBlocks = pgs
        .flatMap((p) => p.blocks || [])
        .filter(
          (b) =>
            (b.newsId || '').startsWith('art-te-') &&
            (b.columnSpan || 1) >= 2 &&
            (b.height || 0) >= 240 &&
            (`${b.leadParagraph || ''} ${b.bodyContent || ''}`.trim().length < 750)
        );
      if (sparseTallSampleBlocks.length >= 3) {
        return true;
      }
      return false;
    };

    const savedId = readLocalString('newspress_active_edition_id_v1', '');
    if (savedId) {
      const savedPages = EditionPersistenceService.getPagesForEdition(savedId);
      if (savedPages && savedPages.length > 0) {
        if (isDegenerateLayout(savedPages)) {
          if (
            savedId === TELUGU_NEWSPAPER_EDITION.editionId &&
            TELUGU_PREPLANNED_PAGES &&
            TELUGU_PREPLANNED_PAGES.length > 0
          ) {
            setPages(TELUGU_PREPLANNED_PAGES);
            setHistory([JSON.parse(JSON.stringify(TELUGU_PREPLANNED_PAGES))]);
            setHistoryIndex(0);
            if (TELUGU_PREPLANNED_PAGES[0]?.blocks?.[0]) {
              setSelectedBlockId(TELUGU_PREPLANNED_PAGES[0].blocks[0].placementId);
            }
            EditionPersistenceService.saveEdition(
              TELUGU_NEWSPAPER_EDITION,
              TELUGU_PREPLANNED_PAGES,
              user?.uid || 'system',
              'Restored authentic Telugu broadsheet master layout'
            );
            return;
          }

          const isTe =
            selectedBrand.language === 'te' ||
            selectedBrand.name?.includes('తెలుగు') ||
            selectedBrand.name?.includes('ఆంధ్ర');
          const tenantId = currentTenant?.tenantId || edition.tenantId;
          const own = newsSubmissionService.getArticles(tenantId).filter((a) =>
            ['approved', 'published', 'marketplace_listed'].includes(a.editorialStatus)
          );
          const licensed: NewsArticle[] = [];
          for (const lic of marketplaceService.getLicenses(tenantId)) {
            if (lic.buyerTenantId === tenantId && lic.status === 'ACTIVE') {
              const adapted = marketplaceContentWorkspaceService.adaptToNewsroomStory({
                licenseId: lic.licenseId,
                tenantId,
                userId: user?.uid || 'user-editor',
              });
              if (adapted.articleId && adapted.headline) {
                licensed.push({
                  articleId: adapted.articleId,
                  tenantId,
                  headline: adapted.headline,
                  slug: adapted.articleId,
                  summary: adapted.leadParagraph || adapted.headline,
                  leadParagraph: adapted.leadParagraph || adapted.headline,
                  bodyContent: adapted.bodyContent || adapted.leadParagraph || adapted.headline,
                  authorId: lic.sellerReporterId || 'wire',
                  byline: adapted.byline || 'Syndicated Wire',
                  authorType: 'syndicated',
                  category: adapted.category || 'General',
                  district: adapted.district || 'Regional',
                  editorialStatus: 'approved',
                  originalityVerdict: 'verified_original',
                  originalityStatus: 'VERIFIED_ORIGINAL',
                  wordCount: (adapted.bodyContent || '').split(/\s+/).filter(Boolean).length || 300,
                  tags: [adapted.category || 'Syndicated'],
                  isMarketplaceListed: false,
                  isMarketplaceEligible: false,
                  createdAt: adapted.createdAt || new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }
            }
          }
          const combined = [...licensed, ...(own.length > 0 ? own : availableStories)];
          const relevant = isTe
            ? combined
            : combined.filter((s) => s.category !== 'జాతీయం' && s.category !== 'రాష్ట్రీయం' && s.category !== 'జిల్లా వార్తలు');
          const repairedPlan = PagePlanningEngine.planEditionLayout({
            edition,
            template: selectedTemplate,
            stories: relevant,
            targetPageCount: selectedBrand.pageCount || savedPages.length || 4,
          });
          setPages(repairedPlan.pages);
          setHistory([JSON.parse(JSON.stringify(repairedPlan.pages))]);
          setHistoryIndex(0);
          if (repairedPlan.pages[0]?.blocks?.[0]) {
            setSelectedBlockId(repairedPlan.pages[0].blocks[0].placementId);
          }
          EditionPersistenceService.saveEdition(
            edition,
            repairedPlan.pages,
            user?.uid || 'system',
            'Repaired broadsheet modular layout across all pages'
          );
          return;
        }

        setPages(savedPages);
        setHistory([JSON.parse(JSON.stringify(savedPages))]);
        setHistoryIndex(0);
        if (savedPages[0]?.blocks?.[0]) {
          setSelectedBlockId(savedPages[0].blocks[0].placementId);
        }
        return;
      }
    }

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

  // Synchronize @page print dimensions at top-level so both "Download PDF" and Ctrl+P print at exact 1:1 paper size
  const syncPrintPageStyleSheet = useCallback(() => {
    const activeBrand = brandManagementService.getActiveBrand() || selectedBrand;
    const template = GridCalculationService.getTemplateForBrand(activeBrand);
    const paperFormat = activeBrand.paperSize || template.format || 'broadsheet';
    const widthMm = template.pageWidthMm || (paperFormat === 'tabloid' ? 280 : paperFormat === 'a4' ? 210 : paperFormat === 'a3' ? 297 : paperFormat === 'berliner' ? 315 : 350);
    const heightMm = template.pageHeightMm || (paperFormat === 'tabloid' ? 380 : paperFormat === 'a4' ? 297 : paperFormat === 'a3' ? 420 : paperFormat === 'berliner' ? 470 : 540);

    document.documentElement.setAttribute('data-print-format', paperFormat);

    let styleEl = document.getElementById('newspaper-dynamic-print-page-style') as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'newspaper-dynamic-print-page-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      @page {
        size: ${widthMm}mm ${heightMm}mm;
        margin: 0mm !important;
      }
      @media print {
        html, body {
          width: ${widthMm}mm !important;
          min-height: ${heightMm}mm !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #root {
          display: none !important;
        }
        .print-newspaper-export-container {
          display: block !important;
          position: static !important;
          left: 0 !important;
          top: 0 !important;
          opacity: 1 !important;
          visibility: visible !important;
          width: ${widthMm}mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }
        .print-page-sheet {
          display: block !important;
          width: ${widthMm}mm !important;
          height: ${heightMm}mm !important;
          margin: 0 !important;
          padding: 0 !important;
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          overflow: hidden !important;
          position: relative !important;
          background: #ffffff !important;
        }
        .print-page-sheet:last-child {
          page-break-after: auto !important;
          break-after: auto !important;
        }
        .print-page-inner {
          position: relative !important;
          top: 0 !important;
          left: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          transform-origin: top left !important;
        }
      }
    `;
    return { activeBrand, paperFormat, widthMm, heightMm };
  }, [selectedBrand]);

  useEffect(() => {
    syncPrintPageStyleSheet();
  }, [syncPrintPageStyleSheet, selectedTemplate]);

  // Print & PDF Export Handler: Dynamically prints in the exact configured paper size (broadsheet, tabloid, A4, etc.)
  const handlePrintPdf = () => {
    const { activeBrand, paperFormat } = syncPrintPageStyleSheet();

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
      setDesignerNotice(`Cannot place story: ${eligibility.rejectionReason}`);
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
      setDesignerNotice('No available column slot on current page. Try adding a new page or moving existing stories.');
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
        setDesignerNotice(res.errors?.join(' ') || 'Failed to create correction revision.');
      }
    } catch (err: any) {
      setDesignerNotice(`Correction error: ${err.message}`);
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
    const pageSampleText = (pageToRender.blocks || [])
      .slice(0, 4)
      .map((b) => `${b.articleTitle || ''} ${b.bodyContent || ''}`)
      .join(' ');
    const pageScript = detectIndicScript(pageSampleText, selectedBrand.language);
    const pageLabels = getLocalizedPrintLabels(pageScript);
    const isTelugu =
      pageScript === 'te' ||
      selectedBrand.language === 'te' ||
      selectedBrand.brandId === TELUGU_NEWSPAPER_BRAND.brandId ||
      selectedBrand.brandId === 'brand-andhra-prabha' ||
      edition.brandId === TELUGU_NEWSPAPER_BRAND.brandId ||
      edition.brandId === 'ed-andhra-prabha-today';
    const folioHeaderFont = getHeadlineFontForScript(pageScript, 0);

    // Allocate 15% - 20% Special Block Templates for this page (guarantees every page has special blocks <= 20% area)
    const pageSpecialBlocksMap = allocatePageSpecialBlocks(pageToRender, grid);

    const footerBottomMargin = grid.margins.bottom - 10;
    const footerHeight = 20;
    const footerTop = grid.pageHeight - footerBottomMargin - footerHeight;

    return (
      <>
        {/* 1. PRINT MASTHEAD (Page 1 Only) - Positioned at top: 16px with height: 168px (ends at 184px) so top stories at y=196px have a clean 12px gap */}
        {pageToRender.pageNumber === 1 && (
          <div
            className="absolute z-10 overflow-visible"
            style={{
              top: '16px',
              left: `${grid.margins.left}px`,
              width: `${grid.contentWidth}px`,
              height: '168px',
            }}
          >
            <NewspaperMastheadRenderer
              brand={selectedBrand}
              publicationDate={edition.publicationDate || new Date().toISOString().slice(0, 10)}
              editionName={selectedBrand.editionsList?.[0] || pageLabels.dailyEdition}
            />
          </div>
        )}

        {/* 1.5. INNER PAGE FOLIO HEADER (Pages > 1) - Positioned at top: 22px with height: 40px (ends at 62px) so stories at y=74px have a clean 12px gap */}
        {pageToRender.pageNumber > 1 && (
          <div
            className={`absolute border-t-[1.5px] border-b-[2.5px] border-slate-950 bg-[#f8fafc] z-10 overflow-hidden flex items-center justify-between px-2.5 ${pageScript !== 'en' ? 'newspaper-telugu-content' : ''}`}
            style={{
              top: '22px',
              left: `${grid.margins.left}px`,
              width: `${grid.contentWidth}px`,
              height: '40px',
              fontWeight: 400,
              fontSynthesis: 'none',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontFamily: folioHeaderFont,
                  letterSpacing: 'normal',
                  fontWeight: 400,
                  fontSynthesis: 'none',
                }}
                className="text-[#0369a1] font-normal text-[21px] leading-none"
              >
                {selectedBrand.masthead?.title?.trim() || selectedBrand.name}
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-[9.5px] text-slate-700 font-normal" style={{ letterSpacing: 'normal' }}>
                {selectedBrand.editionsList?.[0] ? `${selectedBrand.editionsList[0]} • ${pageLabels.dailyEdition}` : pageLabels.dailyEdition}
              </span>
            </div>

            <div
              style={{
                fontFamily: folioHeaderFont,
                letterSpacing: 'normal',
                fontWeight: 400,
                fontSynthesis: 'none',
              }}
              className="text-white bg-red-800 font-normal text-[12.5px] px-3.5 py-0.5 flex items-center gap-1.5"
            >
              <span>✦</span>
              <span>{pageToRender.sectionName || `${pageLabels.pageWord} ${pageToRender.pageNumber}`}</span>
              <span>✦</span>
            </div>

            <div className="text-[10px] font-normal text-slate-800 flex items-center gap-2">
              <span style={{ letterSpacing: 'normal' }}>{edition.publicationDate || '30 అక్టోబర్ 2026, శుక్రవారం'}</span>
              <span className="text-slate-400">•</span>
              <span className="bg-slate-900 text-amber-300 px-2 py-0.5 rounded-xs font-normal" style={{ letterSpacing: 'normal' }}>
                {`${pageLabels.pageWord} ${pageToRender.pageNumber}`}
              </span>
            </div>
          </div>
        )}

        {/* 2. PLACED STORY BLOCKS (Broadsheet Multi-Column Architecture - Dynamic Variations & Pan-Indic Typography) */}
        {(pageToRender.blocks || []).map((block, blockIndex) => {
          const isSelected = isInteractive && block.placementId === selectedBlockId;
          const isLead = block.layoutRole === 'LEAD';
          const isCartoon = block.styleVariant === 'pocket_cartoon';
          const isContinuationBlock = Boolean(block.continuedFromPage);
          const specialTemplate = pageSpecialBlocksMap.get(block.placementId);
          const isSpecialBlock = Boolean(specialTemplate) && !isContinuationBlock;

          // Normalize Page 1 top row y/height even if an older edition state was cached in localStorage
          const effectiveBlockY =
            pageToRender.pageNumber === 1 && block.y === 154
              ? 196
              : pageToRender.pageNumber === 1 && block.y === 382 && block.height === 228
              ? 403
              : block.y;

          const effectiveBlockHeight =
            pageToRender.pageNumber === 1 && block.y === 154 && block.height === 456
              ? 414
              : pageToRender.pageNumber === 1 && (block.y === 154 || block.y === 382) && block.height === 228
              ? 207
              : block.height;

          const blockScript = detectIndicScript(
            `${block.articleTitle || ''} ${block.subheadline || ''} ${block.bodyContent || ''}`,
            selectedBrand.language
          );
          const isIndicScript = blockScript !== 'en';

          // Dynamic photo placement variation across blocks
          const effectiveImgPlacement = isContinuationBlock
            ? 'none'
            : getDynamicPhotoPlacement(block, blockIndex, pageToRender.pageNumber);
          const hasImage = !isContinuationBlock && !!block.imageUrl && effectiveImgPlacement !== 'none';
          const hasBullets = !isContinuationBlock && !!block.bulletPoints && block.bulletPoints.length > 0;

          // Varied regular-weight (400) display fonts per block so characters never clump in Indic scripts
          const headlineFontFamily = getHeadlineFontForScript(
            blockScript,
            blockIndex + pageToRender.pageNumber * 2
          );
          const bodyFontFamily = getBodyFontForScript(blockScript);
          const subheadFontFamily = getBodyFontForScript(blockScript);

          // Dedicated Pocket Cartoon Renderer
          if (isCartoon) {
            return (
              <div
                key={block.placementId}
                onClick={(e) => {
                  if (!isInteractive) return;
                  e.stopPropagation();
                  handleSelectBlock(block.placementId);
                }}
                data-lang={blockScript}
                className={`absolute flex flex-col transition-all overflow-hidden border-[1.5px] border-slate-800 bg-[#fefce8]/85 p-2 select-none ${
                  isInteractive ? 'cursor-pointer group' : ''
                } ${isSelected ? 'ring-2 ring-blue-600 shadow-md z-10' : ''} font-telugu newspaper-canvas-sheet`}
                style={{
                  top: `${effectiveBlockY}px`,
                  left: `${block.x}px`,
                  width: `${block.width}px`,
                  height: `${effectiveBlockHeight}px`,
                  boxSizing: 'border-box',
                  fontWeight: 400,
                  fontSynthesis: 'none',
                }}
              >
                {/* Cartoon Title Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-red-800 text-white font-normal text-xs px-2 py-0.5 rounded-none shadow-2xs font-telugu">
                      {block.cartoon?.title || 'షో..!'}
                    </span>
                    <span className="text-[8.5px] font-normal text-slate-800">
                      {block.cartoon?.subtitle || 'ఆంధ్ర ప్రభ వ్యంగ్య చిత్రం'}
                    </span>
                  </div>
                  <span className="text-[8px] font-normal bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded-xs">
                    {block.cartoon?.cartoonist || 'శేఖర్..!'}
                  </span>
                </div>

                {/* Cartoon Drawing Frame - Fills 100% of available height */}
                <div className="flex-1 w-full bg-white border border-slate-300 p-1.5 flex flex-col justify-between overflow-hidden relative rounded-xs">
                  {block.imageUrl ? (
                    <img
                      src={block.imageUrl}
                      alt="Pocket Cartoon"
                      className="w-full flex-1 object-contain"
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-between p-1 text-center bg-amber-50/30 w-full h-full">
                      <svg viewBox="0 0 220 95" className="w-full flex-1 max-h-[125px]" preserveAspectRatio="xMidYMid meet">
                        <rect x="4" y="4" width="212" height="87" rx="4" fill="#fffbeb" stroke="#cbd5e1" strokeWidth="1" />
                        <line x1="4" y1="76" x2="216" y2="76" stroke="#94a3b8" strokeWidth="1.5" />
                        {/* Left Politician */}
                        <circle cx="62" cy="34" r="15" fill="#fed7aa" stroke="#0f172a" strokeWidth="1.8" />
                        <circle cx="57" cy="31" r="2" fill="#0f172a" />
                        <circle cx="67" cy="31" r="2" fill="#0f172a" />
                        <path d="M56,41 Q62,46 68,41" stroke="#b91c1c" strokeWidth="1.8" fill="none" />
                        <rect x="46" y="49" width="32" height="27" rx="3" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.8" />
                        <line x1="78" y1="56" x2="98" y2="48" stroke="#0f172a" strokeWidth="2" />
                        {/* Center Podium / Files */}
                        <rect x="98" y="44" width="24" height="32" fill="#fde68a" stroke="#0f172a" strokeWidth="1.5" />
                        <text x="110" y="62" fontSize="7" fontWeight="normal" textAnchor="middle" fill="#991b1b">2047</text>
                        {/* Right Citizen / Leader */}
                        <circle cx="158" cy="34" r="15" fill="#fed7aa" stroke="#0f172a" strokeWidth="1.8" />
                        <circle cx="153" cy="31" r="2" fill="#0f172a" />
                        <circle cx="163" cy="31" r="2" fill="#0f172a" />
                        <path d="M153,42 Q158,38 163,42" stroke="#0f172a" strokeWidth="1.8" fill="none" />
                        <rect x="142" y="49" width="32" height="27" rx="3" fill="#fecaca" stroke="#0f172a" strokeWidth="1.8" />
                      </svg>
                      <div className="w-full bg-slate-900 text-white text-[8.5px] px-2 py-1 rounded font-telugu shadow-xs leading-snug shrink-0 font-normal">
                        💬 "{block.cartoon?.dialogue || 'అక్కడెలాగో నెగ్గాం.. మరి ఇక్కడ 2047 నాటికి ఎలా గట్టెక్కేది..?!!'}"
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-[7.5px] text-slate-700 flex items-center justify-between font-normal mt-0.5 shrink-0">
                  <span>సమకాలీన రాజకీయ వ్యంగ్యాస్త్రం</span>
                  <span className="italic">- శేఖర్ కార్టూన్</span>
                </div>
              </div>
            );
          }

          // Compute block container borders & background (Special 15-20% blocks vs Continuation blocks vs Standard white blocks)
          const hasRightNeighbor = block.x + block.width < grid.pageWidth - grid.margins.right - 2;
          const hasBottomNeighbor = effectiveBlockY + effectiveBlockHeight < grid.pageHeight - grid.margins.bottom - 10;

          const blockContainerStyle: React.CSSProperties = isSpecialBlock && specialTemplate
            ? {
                top: `${effectiveBlockY}px`,
                left: `${block.x}px`,
                width: `${block.width}px`,
                height: `${effectiveBlockHeight}px`,
                backgroundColor: specialTemplate.backgroundColor,
                backgroundImage: specialTemplate.gradientBackground,
                border: specialTemplate.border,
                borderTop: specialTemplate.borderTop || specialTemplate.border,
                borderBottom: specialTemplate.borderBottom || specialTemplate.border,
                borderLeft: specialTemplate.borderLeft || specialTemplate.border,
                borderRight: specialTemplate.borderRight || specialTemplate.border,
                boxShadow: specialTemplate.boxShadow,
                padding: '6px 9px',
                boxSizing: 'border-box',
                fontWeight: 400,
                fontSynthesis: 'none',
              }
            : isContinuationBlock
            ? {
                top: `${effectiveBlockY}px`,
                left: `${block.x}px`,
                width: `${block.width}px`,
                height: `${effectiveBlockHeight}px`,
                backgroundColor: '#fafafa',
                borderTop: '2px solid #991b1b',
                borderRight: hasRightNeighbor ? '1px solid #cbd5e1' : undefined,
                borderBottom: hasBottomNeighbor ? '1.5px solid #64748b' : undefined,
                padding: '5px 8px',
                boxSizing: 'border-box',
                fontWeight: 400,
                fontSynthesis: 'none',
              }
            : {
                top: `${effectiveBlockY}px`,
                left: `${block.x}px`,
                width: `${block.width}px`,
                height: `${effectiveBlockHeight}px`,
                backgroundColor: '#ffffff',
                borderRight: hasRightNeighbor ? '1px solid #cbd5e1' : undefined,
                borderBottom: hasBottomNeighbor ? '1px solid #94a3b8' : undefined,
                padding: '5px 7px',
                boxSizing: 'border-box',
                fontWeight: 400,
                fontSynthesis: 'none',
              };

          return (
            <div
              key={block.placementId}
              onClick={(e) => {
                if (!isInteractive) return;
                e.stopPropagation();
                handleSelectBlock(block.placementId);
              }}
              data-lang={blockScript}
              data-story-block-root="true"
              data-planned-x={block.x}
              data-planned-y={effectiveBlockY}
              data-planned-w={block.width}
              data-planned-h={effectiveBlockHeight}
              className={`absolute flex flex-col transition-all overflow-hidden newspaper-canvas-sheet ${
                isInteractive ? 'cursor-pointer group' : ''
              } ${
                isSelected ? 'ring-2 ring-blue-600 shadow-md z-10' : ''
              } ${isIndicScript ? 'font-telugu newspaper-telugu-content' : ''}`}
              style={blockContainerStyle}
            >
              {/* Ornamental Corner Accents for Special Blocks */}
              {isSpecialBlock && specialTemplate && (
                <>
                  <span
                    className="absolute top-0.5 left-1 text-[8px] leading-none select-none pointer-events-none"
                    style={{ color: specialTemplate.cornerOrnamentColor || specialTemplate.accentRuleColor }}
                  >
                    ❖
                  </span>
                  <span
                    className="absolute top-0.5 right-1 text-[8px] leading-none select-none pointer-events-none"
                    style={{ color: specialTemplate.cornerOrnamentColor || specialTemplate.accentRuleColor }}
                  >
                    ❖
                  </span>
                </>
              )}

              {/* Lock Indicator - only visible when specifically selected in editor */}
              {isInteractive && block.locked && isSelected && (
                <div className="absolute top-1 right-1 bg-blue-600 text-white p-0.5 rounded shadow-xs z-10" title="Locked block">
                  <Lock className="w-2.5 h-2.5" />
                </div>
              )}

              {/* Dynamic Varied Headline, Balanced Multi-Line Wrapping, Non-Strip Subheadline & Multi-Column Flow */}
              {(() => {
                const effectiveColumnCount = Math.max(1, block.columnSpan || 1);

                // Strict Grid Column Discipline:
                // - Standard blocks strictly use `block.columnSpan` internal columns so every column matches the paper's fixed 8-column grid.
                // - 3-column Special Boxes (`isSpecialBlock && effectiveColumnCount === 3`) use 2 wider internal columns.
                const effectiveInternalCols =
                  isSpecialBlock && effectiveColumnCount === 3
                    ? 2
                    : effectiveColumnCount;

                // Authentic story sentences from leadParagraph + bodyContent (without injecting unrelated filler text)
                const realStorySentences = getRealStorySentences(block);
                const uniqueStorySentences =
                  realStorySentences.length > 0
                    ? realStorySentences
                    : getUniqueCompleteStorySentences(block, blockIndex, pageToRender.pageNumber);
                const allowFullStoryFit = !block.continuedOnPage;

                // Uniform Paper-Wide Body Typography (exact same font size & line height across all blocks)
                const uniformBodyFontPx = isIndicScript ? 10.0 : 9.4;
                const uniformBodyLineHeight = isIndicScript ? 1.40 : 1.35;

                const blockLabels = getLocalizedPrintLabels(blockScript);

                // =========================================================================
                // DEDICATED CONTINUATION STORY RENDERER
                // Renders ONLY the compact continuation header + the remaining part of the story!
                // =========================================================================
                if (isContinuationBlock) {
                  return (
                    <div className="w-full h-full flex flex-col justify-between overflow-hidden">
                      {/* Compact Continuation Header Bar */}
                      <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-1 shrink-0 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="bg-red-800 text-white text-[9.5px] px-2 py-0.5 shrink-0 leading-none">
                            {blockLabels.continuedFrom(block.continuedFromPage || 1)}
                          </span>
                          <span
                            className="text-[16.5px] text-slate-950 truncate leading-tight"
                            style={{ fontFamily: headlineFontFamily }}
                          >
                            {block.articleTitle === 'భారత్ సమ్మిట్‌కు: మోకాలడ్డు'
                              ? 'హైదరాబాద్ భారత్ సమ్మిట్‌కు: కేంద్రం మోకాలడ్డు!'
                              : block.articleTitle}
                          </span>
                        </div>
                        <span className="text-[8.5px] text-red-800 shrink-0">
                          {blockLabels.remainingPart}
                        </span>
                      </div>

                      {/* Remaining Story Body in DOM-Calibrated Multi-Column Flow */}
                      <FittedSingleZoneMultiColStory
                        sentences={uniqueStorySentences}
                        columnCount={effectiveInternalCols}
                        columnGap="14px"
                        baseFontSizePx={uniformBodyFontPx}
                        baseLineHeight={uniformBodyLineHeight}
                        fontFamily={bodyFontFamily}
                        allowFullStoryFit={true}
                        datelineElement={
                          <span className="text-red-800 mr-1">
                            【{blockLabels.continuedFrom(block.continuedFromPage || 1)}】
                          </span>
                        }
                        layoutKey={`${block.placementId}-${effectiveBlockHeight}-${block.width}`}
                      />
                    </div>
                  );
                }

                // 1. Varied Headline Size across blocks on the page
                const effectiveHeadlineSize = computeVariedHeadlineSize(
                  block,
                  blockIndex,
                  pageToRender.pageNumber
                );

                // 2. Dynamic Headline & Subheadline Design Variants
                const headlineDesignVariant = getBlockHeadlineDesignVariant(
                  block,
                  blockIndex,
                  pageToRender.pageNumber,
                  isSpecialBlock
                );
                const subheadlineVariant = getBlockSubheadlineVariant(
                  block,
                  blockIndex,
                  pageToRender.pageNumber,
                  isSpecialBlock
                );

                // Show bullet points when present on lead, special blocks, or 3+ col featured stories
                const shouldShowBullets = hasBullets && (
                  isLead ||
                  isSpecialBlock ||
                  (block as any).showBullets ||
                  effectiveColumnCount >= 3
                );

                // Authentic Inline Dateline (Colored ink at Regular weight 400 — NO synthetic bold clumping)
                const formattedDateline = (() => {
                  const firstText = (block.leadParagraph || block.bodyContent || '').trim();
                  if (/^[^:]{3,38}:/.test(firstText)) return null;
                  const rawByline = (block.byline || blockLabels.bureauFallback).trim();
                  return (
                    <span
                      className="font-normal mr-1 inline"
                      style={{
                        color: isSpecialBlock && specialTemplate ? specialTemplate.headlineColor : '#991b1b',
                        fontWeight: 400,
                        fontSynthesis: 'none',
                      }}
                    >
                      {rawByline.endsWith(':') ? rawByline : `${rawByline}:`}{' '}
                    </span>
                  );
                })();

                // Single pinned continuation badge at bottom-right avoids duplicating the badge inline and pinned
                const inlineContinuedOn: React.ReactNode = null;

                const pinnedContinuedOnBadge = block.continuedOnPage ? (
                  <div
                    className="absolute bottom-0 right-0 pl-6 pr-1 py-0.5 font-normal text-red-800 text-[9.5px] select-none pointer-events-none flex items-center gap-1"
                    style={{
                      lineHeight: '1.25',
                      fontFamily: bodyFontFamily,
                      background: isSpecialBlock && specialTemplate
                        ? `linear-gradient(to left, ${specialTemplate.backgroundColor} 80%, transparent)`
                        : 'linear-gradient(to left, #ffffff 80%, transparent)',
                    }}
                  >
                    <span>➔ {blockLabels.continuedOn(block.continuedOnPage)}</span>
                    <span className="inline-flex items-center justify-center bg-red-800 text-white text-[8.5px] font-normal px-1.5 py-0.5 leading-none">
                      {block.continuedOnPage}
                    </span>
                  </div>
                ) : null;

                // Inline floated Cutout Portrait & Stat Callout Box
                const inlineCalloutElements = (
                  <>
                    {block.cutoutImage && (
                      <div
                        className={`float-right ml-1.5 mb-0.5 p-0.5 bg-white border border-slate-300 shadow-2xs text-center shrink-0 ${
                          effectiveColumnCount === 1 ? 'w-11' : 'w-14'
                        }`}
                        style={{ breakInside: 'avoid' }}
                      >
                        <img
                          src={block.cutoutImage.url}
                          alt={block.cutoutImage.name || 'Portrait'}
                          className={`w-full h-auto object-contain mx-auto bg-white block ${
                            effectiveColumnCount === 1 ? 'max-h-11' : 'max-h-14'
                          }`}
                        />
                        {block.cutoutImage.name && (
                          <div className="text-[6.8px] font-normal text-slate-900 mt-0.5 leading-none font-telugu">
                            {block.cutoutImage.name}
                          </div>
                        )}
                      </div>
                    )}
                    {block.statCallout && (
                      <div
                        className="float-right ml-2 mb-1 px-2 py-1 bg-[#334155] text-white flex items-center gap-1.5 shrink-0 shadow-2xs"
                        style={{ breakInside: 'avoid' }}
                      >
                        <div className="text-lg font-normal text-amber-300 leading-none font-sans tracking-tight">
                          {block.statCallout.number}
                        </div>
                        <div className="flex flex-col text-left">
                          <div className="text-[8px] font-normal text-white leading-tight font-telugu">
                            {block.statCallout.label}
                          </div>
                          {block.statCallout.unit && (
                            <div className="text-[6.5px] text-slate-200 font-normal font-telugu leading-none mt-0.5">
                              {block.statCallout.unit}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                );

                // Deliver uncropped high-resolution photos at their natural aspect ratio (NEVER fit=crop!)
                const getOptimizedPhotoUrl = (rawUrl: string | undefined, widthPx: number): string => {
                  if (!rawUrl) return '';
                  if (rawUrl.includes('images.unsplash.com')) {
                    const baseUrl = rawUrl.split('?')[0];
                    const w = Math.max(480, Math.min(1200, Math.round(widthPx * 2)));
                    return `${baseUrl}?w=${w}&auto=format&fit=max&q=85`;
                  }
                  return rawUrl;
                };

                // Normalize legacy short lead title if cached in localStorage
                const effectiveTitleText =
                  block.placementId === 'pl-p1-lead' && block.articleTitle === 'భారత్ సమ్మిట్‌కు: మోకాలడ్డు'
                    ? 'హైదరాబాద్ భారత్ సమ్మిట్‌కు: కేంద్రం మోకాలడ్డు!'
                    : block.articleTitle || '';

                // Render Balanced Multi-Line Headline with DOM-Verified End-to-End Scaling:
                // - Every line stretches END-TO-END (~96% of the block width) from start to end of the block!
                // - Single-line headings scale UP end-to-end!
                // - Two-line headings render Line 2 (the bottom main punchline) LARGER than Line 1 while BOTH span end-to-end!
                const renderHeadlineElement = (
                  customSizePx?: number,
                  forceAlignLeft?: boolean,
                  customAvailWidthPx?: number
                ) => {
                  const targetSizePx = customSizePx || effectiveHeadlineSize;
                  const availWidth = customAvailWidthPx || Math.max(100, block.width - 14);

                  const isLeftAligned =
                    forceAlignLeft !== undefined
                      ? forceAlignLeft
                      : headlineDesignVariant === 'left_accent_rule' ||
                        (headlineDesignVariant === 'classic_editorial' && effectiveColumnCount === 1);

                  const balanced = computeBalancedHeadline({
                    headlineText: effectiveTitleText,
                    availWidthPx: availWidth,
                    targetFontSizePx: targetSizePx,
                    script: blockScript,
                    fontFamily: headlineFontFamily,
                    maxLines: effectiveColumnCount === 1 ? 3 : 2,
                  });

                  // Varied editorial ink palette
                  const editorialInks = ['#0f172a', '#881337', '#1e3a8a', '#0f172a', '#064e3b', '#7c2d12'];
                  const baseInk =
                    isSpecialBlock && specialTemplate
                      ? specialTemplate.headlineColor
                      : isLead
                      ? '#0f172a'
                      : editorialInks[(blockIndex + pageToRender.pageNumber) % editorialInks.length];

                  const contrastInk =
                    baseInk === '#881337' || baseInk === '#b91c1c' || baseInk === '#7c2d12'
                      ? '#0f172a'
                      : '#b91c1c';

                  const colonLineIdx = balanced.lines.findIndex((l) => /[:?!]/.test(l));

                  const renderBalancedLineContent = (lineText: string, lineIdx: number, totalLines: number) => {
                    if (lineText.includes(':')) {
                      const colonIdx = lineText.indexOf(':');
                      const beforeColon = lineText.slice(0, colonIdx + 1);
                      const afterColon = lineText.slice(colonIdx + 1);
                      return (
                        <>
                          <span style={{ color: baseInk }}>{beforeColon}</span>
                          {afterColon && <span style={{ color: contrastInk }}>{afterColon}</span>}
                        </>
                      );
                    }

                    // If a previous line had a colon/clause separator, or if this is Line 2 (the main punchline), highlight cleanly in contrastInk
                    if ((colonLineIdx !== -1 && lineIdx > colonLineIdx) || (totalLines === 2 && lineIdx === 1)) {
                      return <span style={{ color: contrastInk }}>{lineText}</span>;
                    }

                    return <span style={{ color: baseInk }}>{lineText}</span>;
                  };

                  return (
                    <div
                      data-story-headline="true"
                      className={`mb-1.5 shrink-0 w-full ${isLeftAligned ? 'text-left' : 'text-center mx-auto'}`}
                      style={{
                        borderTop:
                          headlineDesignVariant === 'top_double_rule'
                            ? '3px double #334155'
                            : undefined,
                        paddingTop: headlineDesignVariant === 'top_double_rule' ? '3px' : '1px',
                        paddingBottom: '2px',
                      }}
                    >
                      <h2
                        className={`font-normal w-full ${isLeftAligned ? 'text-left' : 'text-center mx-auto'}`}
                        style={{
                          fontFamily: headlineFontFamily,
                          color: baseInk,
                          fontWeight: 400,
                          fontSynthesis: 'none',
                          letterSpacing: 'normal',
                          wordSpacing: 'normal',
                        }}
                      >
                        {balanced.lines.map((lineStr, idx) => {
                          const lineFontPx = balanced.lineFontSizesPx?.[idx] || balanced.calibratedFontSizePx;
                          const lineLh = balanced.lineHeights?.[idx] || balanced.lineHeight;
                          const isSingle = balanced.lines.length === 1;
                          const isBottomMain = balanced.lines.length >= 2 && idx === balanced.lines.length - 1;
                          return (
                            <AutoFitHeadlineLine
                              key={idx}
                              baseFontSizePx={lineFontPx}
                              lineHeight={lineLh}
                              isLeftAligned={isLeftAligned}
                              isMainBottomLine={isBottomMain}
                              isSingleLine={isSingle}
                              textKey={`${block.placementId}-${idx}-${lineStr}-${availWidth}`}
                            >
                              {renderBalancedLineContent(lineStr, idx, balanced.lines.length)}
                            </AutoFitHeadlineLine>
                          );
                        })}
                      </h2>

                      {/* Ornamental Diamond Divider for 'diamond_divider' variant */}
                      {headlineDesignVariant === 'diamond_divider' && !block.subheadline && (
                        <div className="flex items-center justify-center gap-1.5 mt-0.5">
                          <span className="h-px w-10 bg-slate-300" />
                          <span className="text-[7.5px] text-red-700 leading-none">◆</span>
                          <span className="h-px w-10 bg-slate-300" />
                        </div>
                      )}
                    </div>
                  );
                };

                // Render Subheadline (Deck) Helper — Clean unboxed editorial decks
                const renderSubheadlineElement = () => {
                  if (!block.subheadline) return null;

                  const isCompactBrief = effectiveColumnCount === 1 && effectiveBlockHeight <= 230;
                  const subFontSize = isIndicScript
                    ? isCompactBrief
                      ? '9.2px'
                      : isLead
                      ? '11.2px'
                      : '10.3px'
                    : '10px';
                  const subLineHeight = isIndicScript ? (isCompactBrief ? '1.20' : '1.30') : '1.24';
                  const deckMargin = isCompactBrief ? 'mb-0.5' : 'mb-1';
                  const cleanSubhead = block.subheadline.replace(/\u200C\s+/g, ' ').trim();

                  if (subheadlineVariant === 'left_rule_deck') {
                    return (
                      <p
                        data-story-subhead="true"
                        className={`font-normal ${deckMargin} pl-2 text-left shrink-0 w-full`}
                        style={{
                          fontFamily: subheadFontFamily,
                          fontSize: subFontSize,
                          color: isSpecialBlock && specialTemplate ? specialTemplate.subheadlineColor : '#7f1d1d',
                          lineHeight: subLineHeight,
                          borderLeft: `2.5px solid ${isSpecialBlock && specialTemplate ? specialTemplate.accentRuleColor : '#b91c1c'}`,
                          fontWeight: 400,
                          fontSynthesis: 'none',
                        }}
                      >
                        {cleanSubhead}
                      </p>
                    );
                  }

                  if (subheadlineVariant === 'hairline_framed_deck') {
                    return (
                      <p
                        data-story-subhead="true"
                        className={`font-normal ${deckMargin} py-0.5 text-center shrink-0 px-1 mx-auto w-full border-y border-slate-200`}
                        style={{
                          fontFamily: subheadFontFamily,
                          fontSize: subFontSize,
                          color: '#1e293b',
                          lineHeight: subLineHeight,
                          fontWeight: 400,
                          fontSynthesis: 'none',
                        }}
                      >
                        {cleanSubhead}
                      </p>
                    );
                  }

                  if (subheadlineVariant === 'navy_pointer_deck') {
                    return (
                      <p
                        data-story-subhead="true"
                        className={`font-normal ${deckMargin} pb-0.5 text-center shrink-0 px-0.5 mx-auto w-full border-b border-slate-200/80`}
                        style={{
                          fontFamily: subheadFontFamily,
                          fontSize: subFontSize,
                          color: '#1e3a8a',
                          lineHeight: subLineHeight,
                          fontWeight: 400,
                          fontSynthesis: 'none',
                        }}
                      >
                        <span className="text-red-700 mr-1 text-[9px]">▸</span>
                        {cleanSubhead}
                      </p>
                    );
                  }

                  return (
                    <p
                      data-story-subhead="true"
                      className={`font-normal ${deckMargin} pb-0.5 text-center shrink-0 px-0.5 mx-auto w-full border-b border-slate-200/70`}
                      style={{
                        fontFamily: subheadFontFamily,
                        fontSize: subFontSize,
                        color: isSpecialBlock && specialTemplate ? specialTemplate.subheadlineColor : '#b91c1c',
                        lineHeight: subLineHeight,
                        fontWeight: 400,
                        fontSynthesis: 'none',
                      }}
                    >
                      {cleanSubhead}
                    </p>
                  );
                };

                // Render Editorial Bullet Deck
                const renderBulletDeck = () => {
                  if (!shouldShowBullets || !block.bulletPoints?.length) return null;
                  const bulletsToShow = isLead && effectiveBlockHeight < 430
                    ? block.bulletPoints.slice(0, 2)
                    : block.bulletPoints;
                  return (
                    <div
                      className="mb-1 py-0.5 text-slate-900 shrink-0 border-b border-slate-200/80"
                      style={{
                        fontFamily: bodyFontFamily,
                        fontSize: isIndicScript ? (isLead ? '10px' : '9.4px') : '9px',
                        lineHeight: '1.32',
                        breakInside: 'avoid',
                        fontWeight: 400,
                        fontSynthesis: 'none',
                      }}
                    >
                      <ul className="space-y-0.5">
                        {bulletsToShow.map((bp, i) => (
                          <li key={i} className="flex items-start font-normal text-slate-900">
                            <span className="text-red-700 mr-1 text-[8.5px] leading-snug select-none font-normal">◆</span>
                            <span>{bp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                };

                const isTwoColTopPhotoArchetype =
                  hasImage &&
                  effectiveColumnCount === 2 &&
                  effectiveImgPlacement === 'top' &&
                  effectiveBlockHeight >= 240;

                // Use Split Lead Archetype ONLY on Page 1 Lead story (and always with Photo+Headline on the left)
                const isSplitLeadArchetype =
                  hasImage &&
                  isLead &&
                  pageToRender.pageNumber === 1 &&
                  effectiveColumnCount >= 5 &&
                  effectiveImgPlacement !== 'top' &&
                  effectiveImgPlacement !== 'middle';

                // Exact Integer Column Partitioning for Photo Zone vs Side Text Zone
                const underPhotoCols = (() => {
                  if (effectiveInternalCols <= 2) return 1;
                  if (effectiveInternalCols === 3) {
                    return (block.priority?.editorialPriority ?? 0) >= 9 && effectiveBlockHeight >= 420 ? 2 : 1;
                  }
                  if (effectiveInternalCols === 4) return 2;
                  return 3;
                })();

                const sideCols = Math.max(1, effectiveInternalCols - underPhotoCols);

                const photoZoneWidthPercent = Math.round((underPhotoCols / effectiveInternalCols) * 1000) / 10;
                const photoZoneWidthPx = Math.round(((block.width - 16) * photoZoneWidthPercent) / 100);

                // Large, commanding uncropped photo budgets filling 100% column width cleanly (zero grey margins, zero cropping)
                const photoImgH = isSplitLeadArchetype
                  ? 260
                  : effectiveBlockHeight >= 500
                  ? 290
                  : effectiveBlockHeight >= 400
                  ? 250
                  : effectiveBlockHeight >= 300
                  ? 210
                  : 160;

                const topPhotoWidthPx = Math.max(140, block.width - 16);
                const topPhotoImgH =
                  effectiveColumnCount >= 2
                    ? effectiveBlockHeight >= 400
                      ? 250
                      : effectiveBlockHeight >= 310
                      ? 215
                      : 185
                    : effectiveBlockHeight >= 260
                    ? 170
                    : 142;
                const topPhotoMaxWidthPct = 100;

                // ARCHETYPE 1: Page 1 5-Column Main Lead Story (Full-Width Headline + Subhead at Top; Top Band 3-Col Photo + 2-Col Side Text; Bottom Band 5-Col Balanced Flow)
                if (isSplitLeadArchetype) {
                  return (
                    <>
                      {renderHeadlineElement()}
                      {renderSubheadlineElement()}
                      <FittedTwoZonePhotoStory
                        sentences={uniqueStorySentences}
                        isPhotoRight={false}
                        photoZoneWidthPercent={photoZoneWidthPercent}
                        totalCols={effectiveInternalCols}
                        sideCols={sideCols}
                        baseFontSizePx={uniformBodyFontPx}
                        baseLineHeight={uniformBodyLineHeight}
                        fontFamily={bodyFontFamily}
                        allowFullStoryFit={allowFullStoryFit}
                        photoHeaderElements={
                          <div data-story-photo-wrap="true" className="w-full bg-white border border-slate-300/80 overflow-hidden flex flex-col items-center shrink-0">
                            <img
                              data-story-photo="true"
                              data-base-height={photoImgH}
                              data-base-max-width="100"
                              src={getOptimizedPhotoUrl(block.imageUrl, photoZoneWidthPx)}
                              alt={effectiveTitleText}
                              loading="eager"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                target.onerror = null;
                                target.src = NEWSPAPER_PHOTO_FALLBACK;
                              }}
                              style={{ width: '100%', maxWidth: '100%', height: 'auto', maxHeight: `${photoImgH}px` }}
                              className="w-full h-auto object-contain object-[50%_18%] block"
                            />
                            {block.imageCaption && (
                              <div
                                className="w-full text-[7.5px] text-slate-700 px-1.5 py-0.5 bg-slate-50/80 border-t border-slate-200/70 leading-tight font-normal text-left shrink-0"
                                style={{ fontFamily: bodyFontFamily }}
                              >
                                {block.imageCaption}
                              </div>
                            )}
                          </div>
                        }
                        underPhotoLeadingElements={renderBulletDeck()}
                        datelineElement={formattedDateline}
                        sideZoneLeadingElements={inlineCalloutElements}
                        trailingElements={inlineContinuedOn}
                        pinnedBadge={pinnedContinuedOnBadge}
                        layoutKey={`${block.placementId}-${effectiveBlockHeight}-${block.width}`}
                      />
                    </>
                  );
                }

                // ARCHETYPE 2: 2-Column Story with Large Top Photo + Headline + Deck + 2-Col Body Text Below
                if (isTwoColTopPhotoArchetype) {
                  return (
                    <>
                      <div data-story-photo-wrap="true" className="mb-1 w-full overflow-hidden shrink-0 flex flex-col items-center border border-slate-300/80 bg-white">
                        <img
                          data-story-photo="true"
                          data-base-height={topPhotoImgH}
                          data-base-max-width="100"
                          src={getOptimizedPhotoUrl(block.imageUrl, topPhotoWidthPx)}
                          alt={effectiveTitleText}
                          loading="eager"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.onerror = null;
                            target.src = NEWSPAPER_PHOTO_FALLBACK;
                          }}
                          style={{
                            width: '100%',
                            maxWidth: '100%',
                            height: 'auto',
                            maxHeight: `${topPhotoImgH}px`,
                          }}
                          className="w-full h-auto object-contain object-[50%_18%] block"
                        />
                        {block.imageCaption && (
                          <div
                            className="w-full text-[7.5px] text-slate-700 px-1.5 py-0.5 leading-tight font-normal text-left shrink-0 bg-slate-50/80 border-t border-slate-200/70"
                            style={{ fontFamily: bodyFontFamily }}
                          >
                            {block.imageCaption}
                          </div>
                        )}
                      </div>

                      {renderHeadlineElement()}
                      {renderSubheadlineElement()}
                      {renderBulletDeck()}

                      <FittedSingleZoneMultiColStory
                        sentences={uniqueStorySentences}
                        columnCount={effectiveInternalCols}
                        columnGap="12px"
                        baseFontSizePx={uniformBodyFontPx}
                        baseLineHeight={uniformBodyLineHeight}
                        fontFamily={bodyFontFamily}
                        allowFullStoryFit={allowFullStoryFit}
                        leadingElements={inlineCalloutElements}
                        datelineElement={formattedDateline}
                        trailingElements={inlineContinuedOn}
                        pinnedBadge={pinnedContinuedOnBadge}
                        layoutKey={`${block.placementId}-${effectiveBlockHeight}-${block.width}`}
                      />
                    </>
                  );
                }

                // ARCHETYPE 3: Multi-Column Stories (Full-Width Headline + Unboxed Deck at Top; Top Photo + Equal Side Cols + Full-Width Balanced Multi-Col Below)
                return (
                  <>
                    {/* 1. Multi-Line Main Headline */}
                    {renderHeadlineElement()}

                    {/* 2. Clean Unboxed Subheadline Deck */}
                    {renderSubheadlineElement()}

                    {/* 3. CONTENT & PHOTO FLOW - Zero wide strips, zero photo cropping, zero white spaces */}
                    {hasImage &&
                    effectiveImgPlacement !== 'top' &&
                    effectiveImgPlacement !== 'middle' &&
                    effectiveColumnCount >= 2 &&
                    effectiveBlockHeight >= 180 ? (
                      /* A1. DEDICATED PHOTO ZONE (1, 2 or 3 cols) + EQUAL-HEIGHT SIDE ZONE + FULL-WIDTH BOTTOM ZONE */
                      <FittedTwoZonePhotoStory
                        sentences={uniqueStorySentences}
                        isPhotoRight={effectiveImgPlacement === 'right'}
                        photoZoneWidthPercent={photoZoneWidthPercent}
                        totalCols={effectiveInternalCols}
                        sideCols={sideCols}
                        baseFontSizePx={uniformBodyFontPx}
                        baseLineHeight={uniformBodyLineHeight}
                        fontFamily={bodyFontFamily}
                        allowFullStoryFit={allowFullStoryFit}
                        photoHeaderElements={
                          <div data-story-photo-wrap="true" className="w-full bg-white border border-slate-300/80 overflow-hidden flex flex-col items-center shrink-0">
                            <img
                              data-story-photo="true"
                              data-base-height={photoImgH}
                              data-base-max-width="100"
                              src={getOptimizedPhotoUrl(block.imageUrl, photoZoneWidthPx)}
                              alt={effectiveTitleText}
                              loading="eager"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                target.onerror = null;
                                target.src = NEWSPAPER_PHOTO_FALLBACK;
                              }}
                              style={{ width: '100%', maxWidth: '100%', height: 'auto', maxHeight: `${photoImgH}px` }}
                              className="w-full h-auto object-contain object-[50%_18%] block"
                            />
                            {block.imageCaption && (
                              <div
                                className="w-full text-[7.5px] text-slate-700 px-1.5 py-0.5 bg-slate-50/80 border-t border-slate-200/70 leading-tight font-normal text-left shrink-0"
                                style={{ fontFamily: bodyFontFamily }}
                              >
                                {block.imageCaption}
                              </div>
                            )}
                          </div>
                        }
                        underPhotoLeadingElements={renderBulletDeck()}
                        datelineElement={formattedDateline}
                        sideZoneLeadingElements={inlineCalloutElements}
                        trailingElements={inlineContinuedOn}
                        pinnedBadge={pinnedContinuedOnBadge}
                        layoutKey={`${block.placementId}-${effectiveBlockHeight}-${block.width}`}
                      />
                    ) : (
                      /* C. FULL-WIDTH PROPORTIONAL TOP PHOTO OR TEXT-ONLY MULTI-COLUMN FLOW */
                      <>
                        {hasImage && (
                          <div data-story-photo-wrap="true" className="my-0.5 w-full overflow-hidden shrink-0 flex flex-col items-center border border-slate-300/80 bg-white">
                            <img
                              data-story-photo="true"
                              data-base-height={topPhotoImgH}
                              data-base-max-width={String(topPhotoMaxWidthPct)}
                              src={getOptimizedPhotoUrl(block.imageUrl, topPhotoWidthPx)}
                              alt={effectiveTitleText}
                              loading="eager"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                target.onerror = null;
                                target.src = NEWSPAPER_PHOTO_FALLBACK;
                              }}
                              style={{
                                width: '100%',
                                maxWidth: `${topPhotoMaxWidthPct}%`,
                                height: 'auto',
                                maxHeight: `${topPhotoImgH}px`,
                              }}
                              className="w-full max-w-full h-auto object-contain object-[50%_18%] block mx-auto"
                            />
                            {block.imageCaption && (
                              <div
                                className="w-full text-[7.5px] text-slate-700 px-1.5 py-0.5 leading-tight font-normal text-left shrink-0 bg-slate-50/80 border-t border-slate-200/70"
                                style={{ fontFamily: bodyFontFamily }}
                              >
                                {block.imageCaption}
                              </div>
                            )}
                          </div>
                        )}

                        <FittedSingleZoneMultiColStory
                          sentences={uniqueStorySentences}
                          columnCount={effectiveInternalCols}
                          columnGap="12px"
                          baseFontSizePx={uniformBodyFontPx}
                          baseLineHeight={uniformBodyLineHeight}
                          fontFamily={bodyFontFamily}
                          allowFullStoryFit={allowFullStoryFit}
                          leadingElements={
                            <>
                              {inlineCalloutElements}
                              {renderBulletDeck()}
                            </>
                          }
                          datelineElement={formattedDateline}
                          trailingElements={inlineContinuedOn}
                          pinnedBadge={pinnedContinuedOnBadge}
                          layoutKey={`${block.placementId}-${effectiveBlockHeight}-${block.width}`}
                        />
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          );
        })}

        {/* 3. REALISTIC PRINT ADVERTISEMENTS (Half-Page, Quarter-Page & Column-Centimeter Display Ads) */}
        {(pageToRender.adPlacements || []).map((ad) => {
          const isHalfPageAd = ad.columnSpan >= 6 || ad.placementId.includes('half-page');
          const isQuarterPageAd = (ad.columnSpan === 4 && ad.height >= 400) || ad.placementId.includes('quarter-page');
          const isJewelAd = ad.placementId.includes('jewel');
          const isAutoAd = ad.placementId.includes('auto');
          const isCmrAd = ad.placementId.includes('cmr');

          return (
            <div
              key={ad.placementId}
              className="absolute bg-white border-2 border-slate-900 overflow-hidden z-10 newspaper-canvas-sheet font-telugu select-none"
              style={{
                top: `${ad.y}px`,
                left: `${ad.x}px`,
                width: `${ad.width}px`,
                height: `${ad.height}px`,
                boxSizing: 'border-box',
                fontWeight: 400,
                fontSynthesis: 'none',
              }}
            >
              {/* A. HALF-PAGE MEGA DISPLAY AD (Page 3: 8 Columns × 25cm Luxury Real Estate / Villa Project Ad) */}
              {isHalfPageAd ? (
                <div className="w-full h-full flex flex-col justify-between bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white relative overflow-hidden">
                  {/* Top Sponsor Header Ribbon */}
                  <div className="bg-amber-400 text-slate-950 px-4 py-1.5 flex items-center justify-between border-b-2 border-amber-600 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="bg-red-800 text-white text-[10px] px-2 py-0.5">★ APARNA CONSTRUCTIONS ★</span>
                      <span className="text-[13px] text-slate-950">అపర్ణ కన్‌స్ట్రక్షన్స్ — 28 ఏళ్ల నమ్మకం, నాణ్యతకు మారుపేరు</span>
                    </div>
                    <span className="text-[9.5px] bg-slate-950 text-amber-300 px-2.5 py-0.5">
                      హాఫ్ పేజీ వాణిజ్య ప్రకటన / HALF-PAGE DISPLAY AD (8 COLS × 25 CM)
                    </span>
                  </div>

                  {/* Main Split Content: Left Marketing Copy & Pricing + Right Full-Bleed Architectural Photography */}
                  <div className="flex-1 min-h-0 grid grid-cols-12 gap-4 p-4 items-stretch">
                    <div className="col-span-6 flex flex-col justify-between bg-slate-900/90 border border-amber-400/50 p-4">
                      <div>
                        <div className="inline-block bg-red-700 text-amber-200 text-[11px] px-2.5 py-0.5 mb-2">
                          హైదరాబాద్ ఫైనాన్షియల్ డిస్ట్రిక్ట్ & కోకాపేట్‌లో మెగా లాంచ్!
                        </div>
                        <h3
                          className="text-[34px] text-amber-300 leading-tight mb-2"
                          style={{ fontFamily: "'Ramabhadra', serif" }}
                        >
                          అపర్ణ సన్-స్టోన్ లగ్జరీ గేటెడ్ కమ్యూనిటీ విల్లాలు & స్మార్ట్ హోమ్స్
                        </h3>
                        <p className="text-[13px] text-slate-200 leading-relaxed mb-3">
                          100 ఎకరాల విశాలమైన పచ్చని వాతావరణంలో అంతర్జాతీయ స్థాయి క్లబ్‌హౌస్, స్విమ్మింగ్ పూల్, ఇండోర్ స్టేడియం, సోలార్ రూఫ్‌టాప్ మరియు 24×7 ఐదు అంచెల భద్రతతో కూడిన 3 & 4 BHK లగ్జరీ అపార్ట్‌మెంట్లు, ట్రిప్లెక్స్ విల్లాలు.
                        </p>

                        <div className="grid grid-cols-2 gap-2.5 text-[11.5px] text-amber-100 border-t border-slate-700 pt-2.5">
                          <div>✦ HMDA & TS-RERA పూర్తి అనుమతులు</div>
                          <div>✦ 80% ఓపెన్ గ్రీన్ ల్యాండ్‌స్కేప్ గార్డెన్స్</div>
                          <div>✦ ఓఆర్ఆర్ (ORR Exit-2) కు కేవలం 3 నిమిషాలు</div>
                          <div>✦ ప్రముఖ బ్యాంకుల నుంచి 90% హోమ్ లోన్ సదుపాయం</div>
                        </div>
                      </div>

                      <div className="bg-amber-400 text-slate-950 p-2.5 flex items-center justify-between mt-3">
                        <div>
                          <div className="text-[10px] text-red-900">ప్రారంభ ధర (Starting Price):</div>
                          <div className="text-[22px] text-slate-950 leading-none">₹ 1.45 కోట్లు* <span className="text-[11px]">నుంచి మాత్రమే</span></div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-800">నేడే సైట్ విజిట్ బుక్ చేసుకోండి:</div>
                          <div className="text-[18px] font-mono text-red-900 leading-none">📞 040-4455 8899 / 91000 22334</div>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-6 h-full flex flex-col gap-2 overflow-hidden">
                      <div className="flex-1 min-h-0 relative border-2 border-amber-400/70 overflow-hidden">
                        <img
                          src={ad.imageUrl || NEWSPAPER_PHOTO_FALLBACK}
                          alt={ad.sponsorLabel}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 right-2 bg-slate-950/85 text-amber-300 text-[10px] px-2.5 py-1 border border-amber-400">
                          TS-RERA Regd. No: P02400004891 • www.aparnaconstructions.com
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Address & Offer Footer */}
                  <div className="bg-red-900 text-white px-4 py-1.5 text-[10.5px] flex items-center justify-between shrink-0">
                    <span>కార్పొరేట్ కార్యాలయం: ఆస్ట్రల్ హైట్స్, రోడ్ నెం. 1, బంజారాహిల్స్, హైదరాబాద్ - 500034</span>
                    <span className="text-amber-300">★ పండుగ బుకింగ్‌పై 10 గ్రాముల బంగారు నాణెం & జీరో రిజిస్ట్రేషన్ చార్జీలు ★</span>
                  </div>
                </div>
              ) : isQuarterPageAd ? (
                /* B. QUARTER-PAGE DISPLAY AD (Page 2: 4 Columns × 24cm State Bank of India Retail Banking Ad) */
                <div className="w-full h-full flex flex-col justify-between bg-[#f0f9ff] border border-sky-800 text-slate-950 overflow-hidden">
                  <div className="bg-[#0369a1] text-white px-3 py-1.5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-white text-[#0369a1] flex items-center justify-center text-[11px]">●</span>
                      <span className="text-[13px]">భారతీయ స్టేట్ బ్యాంక్ (STATE BANK OF INDIA)</span>
                    </div>
                    <span className="text-[8.5px] bg-amber-300 text-slate-950 px-2 py-0.5">
                      QUARTER-PAGE AD (4 COLS × 24 CM)
                    </span>
                  </div>

                  <div className="p-3 flex-1 min-h-0 flex flex-col justify-between">
                    <div className="text-center border-b border-sky-200 pb-2">
                      <div className="text-[10.5px] text-red-800">ప్రతి భారతీయుడి స్వప్నాన్ని నిజం చేసే బ్యాంక్!</div>
                      <h3 className="text-[24px] text-[#0c4a6e] leading-tight mt-0.5" style={{ fontFamily: "'Ramabhadra', serif" }}>
                        ఎస్‌బీఐ పండుగ ఉత్సవ్ — గృహ, వాహన & బంగారు రుణాల మహా మేళా
                      </h3>
                    </div>

                    <div className="grid grid-cols-12 gap-3 my-2 flex-1 min-h-0 items-center">
                      <div className="col-span-6 h-full max-h-[210px] border border-sky-300 overflow-hidden bg-white">
                        <img
                          src={ad.imageUrl || NEWSPAPER_PHOTO_FALLBACK}
                          alt="SBI Home Loan Ad"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="col-span-6 flex flex-col justify-between space-y-2 text-left">
                        <div className="bg-white border-l-4 border-red-700 p-2 shadow-2xs">
                          <div className="text-[10px] text-slate-600">ఎస్‌బీఐ హోమ్ లోన్ వడ్డీ రేటు:</div>
                          <div className="text-[20px] text-red-800 leading-none">8.35% p.a.* <span className="text-[9.5px] text-slate-700">నుంచి</span></div>
                        </div>
                        <div className="bg-white border-l-4 border-[#0369a1] p-2 shadow-2xs">
                          <div className="text-[10px] text-slate-600">కారు & ఈవీ వాహన రుణాలు:</div>
                          <div className="text-[18px] text-[#0369a1] leading-none">8.65% p.a.* • 100% ప్రాసెసింగ్ ఫీజు మాఫీ!</div>
                        </div>
                        <div className="bg-amber-100 border border-amber-400 p-1.5 text-[10px] text-slate-900">
                          ✦ YONO SBI యాప్ ద్వారా 15 నిమిషాల్లో ఇన్-ప్రిన్సిపుల్ లోన్ అప్రూవల్!
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#0c4a6e] text-white px-3 py-1.5 flex items-center justify-between text-[10px]">
                      <span>సమీప ఎస్‌బీఐ బ్రాంచ్‌ను సందర్శించండి • టోల్ ఫ్రీ: 1800 1234 / 1800 2100</span>
                      <span className="text-amber-300">bank.sbi</span>
                    </div>
                  </div>
                </div>
              ) : isJewelAd ? (
                /* C. COLUMN-CENTIMETER SOLUS AD 1 (Page 1: 3 Cols × 15cm Lalitha Jewellery Ad) */
                <div className="w-full h-full flex flex-col justify-between bg-[#fffbeb] border border-amber-600 text-slate-950 overflow-hidden">
                  <div className="bg-red-800 text-white px-2.5 py-1 flex items-center justify-between shrink-0">
                    <span className="text-[11px]">★ లలితా జ్యువెలరీ మార్ట్ (LALITHA JEWELLERY)</span>
                    <span className="text-[8px] bg-amber-300 text-slate-950 px-1.5 py-0.2">3 COL × 15 CM AD</span>
                  </div>
                  <div className="p-2 flex-1 min-h-0 flex gap-2.5 items-center">
                    <img
                      src={ad.imageUrl}
                      alt={ad.sponsorLabel}
                      className="w-[46%] h-full max-h-[210px] object-cover border border-amber-500 shrink-0"
                    />
                    <div className="flex-1 flex flex-col justify-between h-full py-0.5 text-left">
                      <div>
                        <div className="bg-amber-300 text-red-950 text-[9.5px] px-1.5 py-0.5 inline-block mb-1">
                          BIS 916 హాల్‌మార్క్ ఆభరణాల మహా మేళా
                        </div>
                        <h4 className="text-[18px] text-red-900 leading-tight mb-1" style={{ fontFamily: "'Ramabhadra', serif" }}>
                          బంగారు ఆభరణాలపై తరుగు (VA) కేవలం 4% నుంచి మాత్రమే!
                        </h4>
                        <p className="text-[9.5px] text-slate-800 leading-snug">
                          పాత బంగారం మార్పిడిపై గ్రాముకు రూ. 50/- అదనపు లాభం. వజ్రాభరణాలపై క్యారెట్‌కు రూ. 15,000/- తగ్గింపు!
                        </p>
                      </div>
                      <div className="bg-red-900 text-amber-200 px-2 py-1 text-[9px] leading-tight">
                        <div>సోమాజిగూడ • కూకట్‌పల్లి • దిల్‌సుఖ్‌నగర్ • విజయవాడ • విశాఖపట్నం</div>
                        <div className="text-white font-mono mt-0.5">📞 040-2331 1166 • www.lalithajewellery.com</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : isAutoAd ? (
                /* D. COLUMN-CENTIMETER AD 2 (Page 4: 2 Cols × 18cm Tata Motors EV / SUV Ad) */
                <div className="w-full h-full flex flex-col justify-between bg-slate-950 text-white overflow-hidden">
                  <div className="bg-sky-700 text-white px-2.5 py-1 flex items-center justify-between text-[9.5px] shrink-0">
                    <span>TATA MOTORS • టాటా మోటార్స్</span>
                    <span className="bg-amber-300 text-slate-950 px-1 py-0.2 text-[7.5px]">2 COL × 18 CM AD</span>
                  </div>
                  <div className="relative h-[155px] w-full shrink-0 overflow-hidden border-b border-sky-800">
                    <img
                      src={ad.imageUrl}
                      alt={ad.sponsorLabel}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1.5 left-1.5 bg-red-700 text-white text-[8.5px] px-2 py-0.5">
                      5-స్టార్ భారత్ NCAP సేఫ్టీ రేటింగ్
                    </div>
                  </div>
                  <div className="p-2.5 flex-1 flex flex-col justify-between text-center">
                    <div>
                      <h4 className="text-[19px] text-amber-300 leading-tight" style={{ fontFamily: "'Ramabhadra', serif" }}>
                        కొత్త టాటా కర్వ్ (TATA CURVV EV) & నెక్సాన్
                      </h4>
                      <p className="text-[9.5px] text-slate-300 mt-1 leading-snug">
                        ఒక్కసారి ఛార్జ్ చేస్తే 502 కి.మీ* మైలేజ్! పండుగ ఎక్స్ఛేంజ్ బోనస్ ₹65,000/- వరకు తగ్గింపు + ఉచిత హోమ్ ఛార్జర్.
                      </p>
                    </div>
                    <div className="bg-amber-400 text-slate-950 py-1 px-2 text-[11px]">
                      ప్రారంభ ధర: ₹ 12.49 లక్షలు* (Ex-Showroom)
                    </div>
                    <div className="text-[8.5px] text-sky-200 border-t border-slate-800 pt-1">
                      మాలిక్ కార్స్ & తేజస్వి మోటార్స్ — హైదరాబాద్ / విజయవాడ • 📞 98480 11223
                    </div>
                  </div>
                </div>
              ) : isCmrAd ? (
                /* E. COLUMN-CENTIMETER AD 3 (Page 4: 2 Cols × 18cm CMR Shopping Mall Wedding & Silk Ad) */
                <div className="w-full h-full flex flex-col justify-between bg-[#fff1f2] text-slate-950 overflow-hidden">
                  <div className="bg-rose-900 text-amber-200 px-2.5 py-1 flex items-center justify-between text-[9.5px] shrink-0">
                    <span>★ సి.ఎం.ఆర్. షాపింగ్ మాల్ (CMR)</span>
                    <span className="bg-white text-rose-950 px-1 py-0.2 text-[7.5px]">2 COL × 18 CM AD</span>
                  </div>
                  <div className="relative h-[155px] w-full shrink-0 overflow-hidden border-b border-rose-300">
                    <img
                      src={ad.imageUrl}
                      alt={ad.sponsorLabel}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1.5 right-1.5 bg-amber-300 text-rose-950 text-[8.5px] px-2 py-0.5">
                      ఆషాఢం & పండుగ మెగా ఆఫర్
                    </div>
                  </div>
                  <div className="p-2.5 flex-1 flex flex-col justify-between text-center">
                    <div>
                      <h4 className="text-[19px] text-rose-900 leading-tight" style={{ fontFamily: "'Ramabhadra', serif" }}>
                        కంచి పట్టు, ధర్మవరం & వెడ్డింగ్ కలెక్షన్స్
                      </h4>
                      <p className="text-[9.5px] text-slate-800 mt-1 leading-snug">
                        పెళ్లి పట్టు చీరలు, డిజైనర్ లెహంగాలు, మెన్స్ వెడ్డింగ్ సూట్లు మరియు కిడ్స్ వేర్‌పై 35% వరకు ప్రత్యక్ష తగ్గింపు!
                      </p>
                    </div>
                    <div className="bg-rose-800 text-white py-1 px-2 text-[10.5px]">
                      ₹10,000 షాపింగ్‌పై వెండి నాణెం ఉచితం!
                    </div>
                    <div className="text-[8.5px] text-rose-950 border-t border-rose-200 pt-1">
                      విశాఖపట్నం • విజయవాడ • హైదరాబాద్ • తిరుపతి • 📞 0891-2556677
                    </div>
                  </div>
                </div>
              ) : (
                /* F. CUSTOM UPLOADED OR GENERIC COMMERCIAL AD */
                <div className="w-full h-full relative flex flex-col justify-between bg-white">
                  {ad.imageUrl ? (
                    <img
                      src={ad.imageUrl}
                      alt={ad.sponsorLabel || 'Commercial Advertisement'}
                      className="w-full flex-1 min-h-0 object-cover bg-white"
                    />
                  ) : null}
                  <div className="bg-slate-900 text-white text-[9px] px-2 py-1 flex items-center justify-between shrink-0">
                    <span className="truncate">{ad.sponsorLabel || 'వాణిజ్య ప్రకటన'}</span>
                    <span className="text-amber-300 text-[7.5px] ml-2 shrink-0">ప్రకటన / AD ({ad.columnSpan} COLS)</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 3.5. STATUTORY PRB ACT IMPRINT BOX ON THE LAST PAGE (Page 4 / Final Page Only) */}
        {pageToRender.pageNumber === pages.length && (
          <div
            className="absolute bg-[#f8fafc] border border-slate-800 px-3 py-1 text-[8.5px] leading-tight text-slate-900 text-center z-10 flex flex-col items-center justify-center overflow-hidden newspaper-canvas-sheet font-telugu"
            style={{
              top: `${footerTop - 46}px`,
              left: `${grid.margins.left}px`,
              width: `${grid.contentWidth}px`,
              height: '42px',
              boxSizing: 'border-box',
              fontWeight: 400,
              fontSynthesis: 'none',
            }}
          >
            <div className="w-full flex items-center justify-center gap-2 border-b border-slate-300 pb-0.5 text-[8.5px] text-center whitespace-nowrap overflow-hidden">
              <span className="truncate">
                <span className="text-red-800">ఇంప్రింట్ (PRB Act):</span>{' '}
                {selectedBrand.imprint?.ownerName || 'ఆంధ్ర ప్రభ మీడియా ఎంటర్‌ప్రైజెస్ లిమిటెడ్'} తరపున ముద్రణకర్త & ప్రచురణకర్త: పి. రమణమూర్తి •{' '}
                <span className="text-red-800">సంపాదకుడు:</span> కె. వెంకటేశ్వరరావు* (*చట్టం ప్రకారం వార్తల ఎంపికకు బాధ్యులు) •{' '}
                <span className="font-mono text-[8px] text-slate-950">
                  {selectedBrand.imprint?.rniNumber || 'RNI No. TELTEL/2014/56891'} • Title Code: {selectedBrand.imprint?.titleCode || 'TELNEW00341'}
                </span>
              </span>
            </div>
            <div className="w-full flex items-center justify-center gap-2 pt-0.5 text-[8px] text-slate-800 text-center whitespace-nowrap overflow-hidden">
              <span className="truncate">
                <span className="text-red-800">ముద్రణాలయం:</span> {selectedBrand.imprint?.printingPressName || 'శ్రీ సత్యసాయి రోటరీ ఆఫ్‌సెట్ ప్రింటర్స్'}, ప్లాట్ నం. 44, ఐ.డి.ఎ. మల్లాపూర్, హైదరాబాద్ - 500076 •{' '}
                <span className="text-red-800">ప్రచురణ కార్యాలయం:</span> డోర్ నం. 8-2-293/82/A, జూబ్లీహిల్స్, హైదరాబాద్ - 500033 •{' '}
                <span className="text-slate-950">
                  <span className="text-red-800">న్యాయపరిధి:</span> హైదరాబాద్ కోర్టులకు మాత్రమే • ✉ {selectedBrand.imprint?.contactEmail || 'editor@andhraprabhapress.com'}
                </span>
              </span>
            </div>
          </div>
        )}

        {/* 4. FOOTER (Page Numbering, Imprint & Authentic CMYK Print Calibration Strip) */}
        <div
          className="absolute border-t-2 border-slate-500 pt-1 text-[9px] font-sans text-slate-800 flex items-center justify-between px-2 bg-white z-10 newspaper-canvas-sheet"
          style={{
            top: `${footerTop}px`,
            left: `${grid.margins.left}px`,
            width: `${grid.contentWidth}px`,
            height: `${footerHeight}px`,
            fontWeight: 400,
            fontSynthesis: 'none',
          }}
        >
          {/* Left: Brand Name & CMYK Calibration Dots */}
          <div className="flex items-center gap-3">
            <span className="font-normal text-red-900" style={{ letterSpacing: 'normal' }}>
              {selectedBrand.name}
            </span>
            <div className="flex items-center gap-1.5" title="Press Registration & CMYK Calibration">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block border border-slate-400 shadow-2xs" title="Cyan"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block border border-slate-400 shadow-2xs" title="Magenta"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block border border-slate-400 shadow-2xs" title="Yellow"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-950 inline-block border border-slate-400 shadow-2xs" title="Key/Black"></span>
              <span className="text-[7px] font-mono text-slate-500 uppercase tracking-widest pl-1 font-normal">CMYK</span>
            </div>
          </div>

          {/* Center: Page Numbering */}
          <span className="font-normal text-slate-900" style={{ letterSpacing: 'normal' }}>
            {selectedBrand.headerFooterRules?.pageNumberFormat && !isTelugu
              ? selectedBrand.headerFooterRules.pageNumberFormat
                  .replace('{n}', String(pageToRender.pageNumber))
                  .replace('{total}', String(pages.length))
              : `${pageLabels.pageWord} ${pageToRender.pageNumber} / ${pages.length}`}
          </span>

          {/* Right: Imprint / Date */}
          <div className="flex items-center gap-2">
            <span className="text-[7.5px] font-mono text-slate-600 font-normal">
              {selectedBrand.imprint?.rniNumber || (isTelugu ? 'RNI: TELTEL/2014/56891' : `PRESS ID: ${(selectedBrand.name?.replace(/[^A-Za-z]/g, '').slice(0, 3) || 'NP').toUpperCase()}`)}
            </span>
            <span>•</span>
            <span className="font-normal" style={{ letterSpacing: 'normal' }}>
              {edition.editionDate || edition.publicationDate || new Date().toISOString().slice(0, 10)}
            </span>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#f8fafd] dark:bg-[#202124] text-[#202124] dark:text-slate-100 overflow-hidden select-none font-sans">
      {/* 1. NEWSPAPER PREVIEW & PDF DOWNLOAD TOPBAR */}
      <div className="min-h-14 py-1.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between z-20 shrink-0 shadow-xs print:hidden">
        {/* Left: Newspaper Brand & Publication Date */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-red-600 text-white shadow-xs shrink-0">
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

                const isBuiltInTeluguSample =
                  nextBrand.paperSize === 'broadsheet' &&
                  (nextBrand.brandId === TELUGU_NEWSPAPER_BRAND.brandId || nextBrand.brandId === 'brand-andhra-prabha');

                if (isBuiltInTeluguSample) {
                  writeLocalString('newspress_active_edition_id_v1', TELUGU_NEWSPAPER_EDITION.editionId);
                  setEdition(TELUGU_NEWSPAPER_EDITION);
                  setPages(TELUGU_PREPLANNED_PAGES);
                  setCurrentPageIndex(0);
                } else {
                  const brandLang = (nextBrand.language || 'en').toLowerCase().slice(0, 2);
                  const isTe = brandLang === 'te' || Boolean(nextBrand.name?.includes('తెలుగు'));
                  const combinedPool = availableStories.length > 0 ? availableStories : MOCK_NEWS_ARTICLES;
                  const filtered = isTe
                    ? combinedPool.filter((s) => /[\u0C00-\u0C7F]/.test(`${s.headline || ''} ${s.bodyContent || ''}`))
                    : combinedPool.filter((s) => !/[\u0C00-\u0C7F]/.test(`${s.headline || ''} ${s.bodyContent || ''}`));
                  const relevantStories = filtered.length > 0 ? filtered : combinedPool;
                  const targetEd: NewspaperEdition = {
                    ...(isTe ? TELUGU_NEWSPAPER_EDITION : MOCK_CURRENT_EDITION),
                    editionId: `ed-${nextBrand.brandId}-active`,
                    brandId: nextBrand.brandId,
                    brandName: nextBrand.name,
                    pageCount: nextBrand.pageCount || 4,
                    totalPages: nextBrand.pageCount || 4,
                  };
                  const dynamicPlan = PagePlanningEngine.planEditionLayout({
                    edition: targetEd,
                    template: nextTemplate,
                    stories: relevantStories,
                    targetPageCount: nextBrand.pageCount || 4,
                  });
                  writeLocalString('newspress_active_edition_id_v1', targetEd.editionId);
                  setEdition(targetEd);
                  setPages(dynamicPlan.pages);
                  setCurrentPageIndex(0);
                  EditionPersistenceService.scheduleAutosave(targetEd, dynamicPlan.pages, user?.uid || 'user-editor');
                }
              }}
              className="font-sans font-medium text-sm bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 min-h-[38px] leading-normal text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
          <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-md whitespace-nowrap">
            <Calendar className="w-3.5 h-3.5 text-red-600 shrink-0" />
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
            <span className="px-3 font-medium text-xs text-slate-800 dark:text-slate-100 font-mono tracking-wide">
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
            className="flex items-center space-x-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium cursor-pointer shadow-xs transition-colors"
            title={`Download PDF in ${selectedBrand.paperSize?.toUpperCase() || 'BROADSHEET'} format`}
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {designerNotice && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between print:hidden">
          <span>{designerNotice}</span>
          <button
            type="button"
            onClick={() => setDesignerNotice(null)}
            className="font-semibold underline ml-3 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* NEWSPAPER PAGE PREVIEW CANVAS - 100% WIDTH WITH NATURAL VERTICAL SCROLL */}
      <div
        ref={canvasScrollRef}
        className="flex-1 min-h-0 bg-[#d5d8de] dark:bg-[#151518] overflow-y-auto overflow-x-hidden p-3 flex flex-col items-center justify-start print:hidden"
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
            ref={interactiveSheetRef}
            className="bg-white text-slate-950 shadow-2xl border border-slate-300 dark:border-slate-800 absolute top-0 left-0 newspaper-canvas-sheet"
            style={{
              width: `${grid.pageWidth}px`,
              height: `${grid.pageHeight}px`,
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top left',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
              fontWeight: 400,
              fontSynthesis: 'none',
            }}
          >
            {/* Page Elements (Masthead/Folio, Placed Stories, Ads, Footer) - Interactive Canvas */}
            {currentPage && renderPageCanvasElements(currentPage, true)}
          </div>
        </div>
      </div>

      {/* 4. FULL PRINT EDITION RENDER VIA DOCUMENT.BODY PORTAL (Guarantees 1:1 Original Size Print With Zero App Shell Offset or Clipping) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="print-newspaper-export-container font-sans bg-white text-black" aria-hidden="true">
            {pages.map((p) => {
              const activeBrand = brandManagementService.getActiveBrand() || selectedBrand;
              const template = GridCalculationService.getTemplateForBrand(activeBrand);
              const paperFormat = activeBrand.paperSize || template.format || 'broadsheet';
              const widthMm = template.pageWidthMm || (paperFormat === 'tabloid' ? 280 : paperFormat === 'a4' ? 210 : paperFormat === 'a3' ? 297 : paperFormat === 'berliner' ? 315 : 350);
              const heightMm = template.pageHeightMm || (paperFormat === 'tabloid' ? 380 : paperFormat === 'a4' ? 297 : paperFormat === 'a3' ? 420 : paperFormat === 'berliner' ? 470 : 540);
              const targetPxWidth = widthMm * 3.779527559;
              const targetPxHeight = heightMm * 3.779527559;
              const printScaleX = grid.pageWidth > 0 ? (targetPxWidth / grid.pageWidth) : 1;
              const printScaleY = grid.pageHeight > 0 ? (targetPxHeight / grid.pageHeight) : 1;
              const printScale = Math.min(printScaleX, printScaleY);

              return (
                <div
                  key={`print-${p.pageId}`}
                  className="print-page-sheet bg-white text-slate-950 newspaper-canvas-sheet"
                  style={{
                    width: `${widthMm}mm`,
                    height: `${heightMm}mm`,
                    fontWeight: 400,
                    fontSynthesis: 'none',
                  }}
                >
                  <div
                    className="print-page-inner newspaper-canvas-sheet"
                    style={{
                      width: `${grid.pageWidth}px`,
                      height: `${grid.pageHeight}px`,
                      transform: `scale(${printScale})`,
                      transformOrigin: 'top left',
                      fontWeight: 400,
                      fontSynthesis: 'none',
                    }}
                  >
                    {renderPageCanvasElements(p, false)}
                  </div>
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};
