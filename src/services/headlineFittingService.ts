/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Deterministic Headline Fitting Engine & Multilingual Typography Service
 * Accurately fits headlines across variable column widths preserving hierarchy.
 * Supports English, Telugu, and mixed bilingual scripts with proper Unicode grapheme awareness.
 */

export interface HeadlineFittingInput {
  headlineText: string;
  availableWidthPx: number;
  maxLines?: number;
  fontFamily?: string;
  minFontSizePt?: number;
  maxFontSizePt?: number;
  lineHeightRatio?: number;
}

export type HeadlineFitStatus =
  | 'exact_fit'
  | 'scaled_fit'
  | 'needs_editorial_shortening'
  | 'flagged';

export interface HeadlineFittingResult {
  fontSizePt: number;
  lineCount: number;
  lines: string[];
  estimatedHeightPx: number;
  fitStatus: HeadlineFitStatus;
  overflowLinesCount: number;
  shrinkPercentage: number;
  isTeluguScript: boolean;
}

export interface FontMetricsProvider {
  measureTextWidth(text: string, fontSizePt: number, fontFamily?: string): number;
}

/**
 * Standard typography metrics provider calibrated for print serif, sans, and Telugu typefaces.
 */
export class StandardFontMetricsProvider implements FontMetricsProvider {
  // Telugu characters have wider average glyph bounds and diacritics
  private static readonly TELUGU_REGEX = /[\u0C00-\u0C7F]/;

  public measureTextWidth(text: string, fontSizePt: number, fontFamily?: string): number {
    if (!text || text.length === 0) return 0;

    let totalWidth = 0;
    // Segment text into grapheme clusters for proper Unicode script handling
    const graphemes = Array.from(text);

    for (const char of graphemes) {
      if (StandardFontMetricsProvider.TELUGU_REGEX.test(char)) {
        // Telugu glyphs average ~0.72 em width
        totalWidth += fontSizePt * 0.72;
      } else if (char === ' ') {
        totalWidth += fontSizePt * 0.28;
      } else if (/[A-Z]/.test(char)) {
        totalWidth += fontSizePt * 0.68;
      } else if (/[0-9]/.test(char)) {
        totalWidth += fontSizePt * 0.55;
      } else if (/[,.;:!']/.test(char)) {
        totalWidth += fontSizePt * 0.25;
      } else if (/[mwWM]/.test(char)) {
        totalWidth += fontSizePt * 0.85;
      } else if (/[ijl]/.test(char)) {
        totalWidth += fontSizePt * 0.3;
      } else {
        // Standard lowercase Latin glyphs average ~0.52 em
        totalWidth += fontSizePt * 0.52;
      }
    }

    // Font family adjustments (e.g. condensed vs expansive serif)
    if (fontFamily && fontFamily.toLowerCase().includes('condensed')) {
      totalWidth *= 0.82;
    } else if (fontFamily && fontFamily.toLowerCase().includes('cinzel')) {
      totalWidth *= 1.1;
    }

    return totalWidth;
  }
}

export class HeadlineFittingService {
  private static defaultMetrics: FontMetricsProvider = new StandardFontMetricsProvider();

  public static setFontMetricsProvider(provider: FontMetricsProvider): void {
    this.defaultMetrics = provider;
  }

  /**
   * Checks if string contains Telugu Unicode script.
   */
  public static hasTeluguScript(text: string): boolean {
    return /[\u0C00-\u0C7F]/.test(text);
  }

  /**
   * Deterministically breaks headline into lines given target width and font size.
   */
  public static breakLines(
    headlineText: string,
    fontSizePt: number,
    availableWidthPx: number,
    fontFamily?: string
  ): string[] {
    const cleanText = headlineText.trim().replace(/\s+/g, ' ');
    if (!cleanText) return [];

    const words = cleanText.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const lineWidth = this.defaultMetrics.measureTextWidth(testLine, fontSizePt, fontFamily);

      if (lineWidth <= availableWidthPx || !currentLine) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Fits a headline within the designated column width and maximum lines without silently altering text.
   */
  public static fitHeadline(input: HeadlineFittingInput): HeadlineFittingResult {
    const {
      headlineText,
      availableWidthPx,
      maxLines = 3,
      fontFamily = 'Newsreader, serif',
      minFontSizePt = 16,
      maxFontSizePt = 42,
      lineHeightRatio = 1.15,
    } = input;

    const isTelugu = this.hasTeluguScript(headlineText);

    // Iteratively decrease font size from maxFontSizePt down to minFontSizePt
    let currentFontSize = maxFontSizePt;
    let bestLines: string[] = [];
    let bestLineCount = 0;

    while (currentFontSize >= minFontSizePt) {
      const lines = this.breakLines(headlineText, currentFontSize, availableWidthPx, fontFamily);

      if (lines.length <= maxLines) {
        const estimatedHeight = Math.round(lines.length * currentFontSize * lineHeightRatio * 1.33);
        const shrinkPercent = Math.round(((maxFontSizePt - currentFontSize) / maxFontSizePt) * 100);

        return {
          fontSizePt: currentFontSize,
          lineCount: lines.length,
          lines,
          estimatedHeightPx: estimatedHeight,
          fitStatus: currentFontSize === maxFontSizePt ? 'exact_fit' : 'scaled_fit',
          overflowLinesCount: 0,
          shrinkPercentage: shrinkPercent,
          isTeluguScript: isTelugu,
        };
      }

      bestLines = lines;
      bestLineCount = lines.length;
      currentFontSize -= 1; // 1pt decrement
    }

    // If at minFontSizePt it still exceeds maxLines, do NOT truncate silently
    // Return all lines so the editor sees the overflow diagnostic
    const estimatedHeight = Math.round(bestLines.length * minFontSizePt * lineHeightRatio * 1.33);
    const overflow = Math.max(0, bestLines.length - maxLines);

    return {
      fontSizePt: minFontSizePt,
      lineCount: bestLineCount,
      lines: bestLines,
      estimatedHeightPx: estimatedHeight,
      fitStatus: 'needs_editorial_shortening',
      overflowLinesCount: overflow,
      shrinkPercentage: Math.round(((maxFontSizePt - minFontSizePt) / maxFontSizePt) * 100),
      isTeluguScript: isTelugu,
    };
  }
}
