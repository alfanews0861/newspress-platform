/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Deterministic Body Text Fitting Service
 * Estimates line counts, column distribution, height requirements, and overflow status
 * without silently deleting or truncating editorial content.
 */

export interface BodyFittingInput {
  bodyText: string;
  columnWidthPx: number;
  columnSpan: number; // Number of columns the story spans
  availableHeightPx: number;
  fontSizePt?: number;
  lineHeightRatio?: number;
  hasSubColumns?: boolean;
}

export interface BodyFittingResult {
  totalWords: number;
  totalCharacters: number;
  avgCharsPerLine: number;
  totalLinesCount: number;
  linesPerColumn: number;
  requiredHeightPx: number;
  availableHeightPx: number;
  fitsWithinBlock: boolean;
  isOverflow: boolean;
  overflowLinesCount: number;
  overflowWordsEstimate: number;
  suggestedHeightPx: number;
  recommendedActions: ('expand_height' | 'increase_column_span' | 'move_to_next_page' | 'insert_continuation_jump' | 'editorial_trim')[];
  continuationJumpSuggested: boolean;
  continuationNote?: string;
}

export class BodyTextFittingService {
  /**
   * Evaluates how story body text flows into the given column geometry.
   */
  public static fitBodyText(input: BodyFittingInput): BodyFittingResult {
    const {
      bodyText,
      columnWidthPx,
      columnSpan,
      availableHeightPx,
      fontSizePt = 9.5,
      lineHeightRatio = 1.25,
      hasSubColumns = true,
    } = input;

    const cleanText = (bodyText || '').trim();
    if (!cleanText) {
      return {
        totalWords: 0,
        totalCharacters: 0,
        avgCharsPerLine: 0,
        totalLinesCount: 0,
        linesPerColumn: 0,
        requiredHeightPx: 0,
        availableHeightPx,
        fitsWithinBlock: true,
        isOverflow: false,
        overflowLinesCount: 0,
        overflowWordsEstimate: 0,
        suggestedHeightPx: 0,
        recommendedActions: [],
        continuationJumpSuggested: false,
      };
    }

    const words = cleanText.split(/\s+/).filter(Boolean);
    const totalWords = words.length;
    const totalCharacters = cleanText.length;

    // Line height in pixels: 1 pt = 1.33 px
    const lineHeightPx = fontSizePt * 1.333 * lineHeightRatio;

    // In print journalism, 1 column width (~40-60mm / 80-150px) fits about 30-45 characters per line
    // Font glyph average width is ~0.48em for body serif
    const effectiveCharWidth = fontSizePt * 0.52;
    const effectiveColWidth = Math.max(50, columnWidthPx);
    const avgCharsPerLine = Math.max(15, Math.floor(effectiveColWidth / effectiveCharWidth));
    const avgWordsPerLine = Math.max(3, Math.floor(avgCharsPerLine / 5.5));

    // Calculate total lines required
    const totalLinesCount = Math.ceil(totalWords / avgWordsPerLine);

    // If story spans multiple columns, text flows down each column
    const effectiveColumns = hasSubColumns ? Math.max(1, columnSpan) : 1;
    const linesPerColumn = Math.ceil(totalLinesCount / effectiveColumns);

    const requiredHeightPx = Math.round(linesPerColumn * lineHeightPx);
    const isOverflow = requiredHeightPx > availableHeightPx + 4; // 4px margin of tolerance
    const maxLinesAllowedPerCol = Math.floor(availableHeightPx / lineHeightPx);
    const totalLinesAllowed = maxLinesAllowedPerCol * effectiveColumns;
    const overflowLines = Math.max(0, totalLinesCount - totalLinesAllowed);
    const overflowWords = Math.round(overflowLines * avgWordsPerLine);

    const recommendedActions: ('expand_height' | 'increase_column_span' | 'move_to_next_page' | 'insert_continuation_jump' | 'editorial_trim')[] = [];

    if (isOverflow) {
      if (columnSpan < 6) {
        recommendedActions.push('increase_column_span');
      }
      recommendedActions.push('expand_height');
      if (overflowWords > 150) {
        recommendedActions.push('insert_continuation_jump');
        recommendedActions.push('move_to_next_page');
      } else {
        recommendedActions.push('editorial_trim');
      }
    }

    const continuationJumpSuggested = isOverflow && overflowWords > 120;
    const continuationNote = continuationJumpSuggested
      ? `(Story continues on Page 2 — ${overflowWords} words remaining)`
      : undefined;

    return {
      totalWords,
      totalCharacters,
      avgCharsPerLine,
      totalLinesCount,
      linesPerColumn,
      requiredHeightPx,
      availableHeightPx,
      fitsWithinBlock: !isOverflow,
      isOverflow,
      overflowLinesCount: overflowLines,
      overflowWordsEstimate: overflowWords,
      suggestedHeightPx: requiredHeightPx,
      recommendedActions,
      continuationJumpSuggested,
      continuationNote,
    };
  }
}
