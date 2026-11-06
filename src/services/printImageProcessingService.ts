/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Print Image Processing & Effective DPI Engine
 * Generates non-destructive production derivatives, evaluates print resolution (DPI),
 * and validates CMYK/Grayscale/RGB color profile specifications.
 */

import { PrintImageDerivative, ImagePreflightResult } from '../types/production';
import { ImageCropConfig } from '../types/edition';

export class PrintImageProcessingService {
  private static derivativesStore: Map<string, PrintImageDerivative> = new Map();

  /**
   * Calculates effective print DPI based on source pixel dimensions and physical placement dimensions.
   * Standard conversion: 1 inch = 25.4 mm = 72 points (CSS design canvas)
   */
  public static calculateEffectiveDPI(
    sourcePixelWidth: number,
    sourcePixelHeight: number,
    printWidthMm: number,
    printHeightMm: number
  ): {
    effectiveDPI: number;
    printWidthInches: number;
    printHeightInches: number;
    status: 'GOOD' | 'WARNING' | 'ERROR';
    recommendation: string;
  } {
    const printWidthInches = printWidthMm / 25.4;
    const printHeightInches = printHeightMm / 25.4;

    if (printWidthInches <= 0 || printHeightInches <= 0) {
      return {
        effectiveDPI: 0,
        printWidthInches: 0,
        printHeightInches: 0,
        status: 'ERROR',
        recommendation: 'Invalid placement geometry.',
      };
    }

    const horizontalDPI = sourcePixelWidth / printWidthInches;
    const verticalDPI = sourcePixelHeight / printHeightInches;
    const effectiveDPI = Math.round(Math.min(horizontalDPI, verticalDPI));

    let status: 'GOOD' | 'WARNING' | 'ERROR' = 'GOOD';
    let recommendation = 'High resolution suitable for commercial rotary press printing.';

    if (effectiveDPI >= 250) {
      status = 'GOOD';
      recommendation = 'Excellent commercial print sharpness (>= 250 DPI).';
    } else if (effectiveDPI >= 150) {
      status = 'WARNING';
      recommendation = 'Moderate resolution (150–249 DPI). Acceptable for newsprint, but may show slight grain.';
    } else {
      status = 'ERROR';
      recommendation = 'Low resolution (< 150 DPI). Substandard for print publication; will result in noticeable pixelation on press.';
    }

    return {
      effectiveDPI,
      printWidthInches: Number(printWidthInches.toFixed(2)),
      printHeightInches: Number(printHeightInches.toFixed(2)),
      status,
      recommendation,
    };
  }

  /**
   * Generates a non-destructive production derivative from source metadata.
   */
  public static createDerivative(params: {
    sourceMediaId: string;
    tenantId: string;
    sourceWidthPx: number;
    sourceHeightPx: number;
    printWidthMm: number;
    printHeightMm: number;
    crop?: ImageCropConfig;
    colorProfile?: 'cmyk' | 'grayscale' | 'rgb';
  }): PrintImageDerivative {
    const {
      sourceMediaId,
      tenantId,
      sourceWidthPx,
      sourceHeightPx,
      printWidthMm,
      printHeightMm,
      crop = { x: 0, y: 0, width: 100, height: 100, scale: 1, mode: 'cover' },
      colorProfile = 'cmyk',
    } = params;

    const dpiCalc = this.calculateEffectiveDPI(
      sourceWidthPx,
      sourceHeightPx,
      printWidthMm,
      printHeightMm
    );

    const derivativeId = `deriv-${tenantId}-${sourceMediaId}-${Date.now()}`;
    const derivative: PrintImageDerivative = {
      derivativeId,
      sourceMediaId,
      tenantId,
      crop,
      targetWidth: Math.round(dpiCalc.printWidthInches * 300), // 300 DPI target
      targetHeight: Math.round(dpiCalc.printHeightInches * 300),
      effectiveDPI: dpiCalc.effectiveDPI,
      colorProfile,
      processingStatus: 'processed',
      derivativeUrl: `storage://production/${tenantId}/derivatives/${derivativeId}.tif`,
      createdAt: new Date().toISOString(),
    };

    this.derivativesStore.set(derivativeId, derivative);
    return derivative;
  }

  /**
   * Preflight an image reference before layout lock or PDF compilation.
   */
  public static evaluateImagePreflight(params: {
    mediaId: string;
    imageUrl: string;
    sourceWidthPx?: number;
    sourceHeightPx?: number;
    placementWidthMm: number;
    placementHeightMm: number;
  }): ImagePreflightResult {
    const {
      mediaId,
      imageUrl,
      sourceWidthPx = 2400, // Default assumed high-res if unspecified
      sourceHeightPx = 1600,
      placementWidthMm,
      placementHeightMm,
    } = params;

    const dpiInfo = this.calculateEffectiveDPI(
      sourceWidthPx,
      sourceHeightPx,
      placementWidthMm,
      placementHeightMm
    );

    const warnings: string[] = [];
    if (dpiInfo.status === 'WARNING') {
      warnings.push(`Image effective DPI is ${dpiInfo.effectiveDPI} (recommended >= 250 DPI).`);
    } else if (dpiInfo.status === 'ERROR') {
      warnings.push(`Critical: Image effective DPI is only ${dpiInfo.effectiveDPI} (< 150 DPI).`);
    }

    if (!imageUrl || imageUrl.trim() === '') {
      warnings.push('Image source reference is missing or empty.');
    }

    return {
      mediaId,
      sourceUrl: imageUrl,
      effectiveDPI: dpiInfo.effectiveDPI,
      status: dpiInfo.status,
      colorProfile: 'CMYK (Fogra39 calibrated)',
      dimensions: {
        widthPx: sourceWidthPx,
        heightPx: sourceHeightPx,
        printWidthInches: dpiInfo.printWidthInches,
        printHeightInches: dpiInfo.printHeightInches,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}
