/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Image Layout & Photo Priority Engine
 * Computes non-destructive crop geometries and multi-factor photo ranking.
 * Original reporter media is NEVER mutated.
 */

import { ImageCropConfig, StoryLayoutRole } from '../types/edition';

export interface CandidatePhoto {
  photoId: string;
  url: string;
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait' | 'square';
  isEditorialSelection?: boolean;
  relevanceScore: number; // 0 to 100
  qualityScore: number; // 0 to 100
  caption?: string;
  credit?: string;
  resolutionDpi?: number;
}

export interface PhotoRankingResult {
  photo: CandidatePhoto;
  rankScore: number;
  isEditorSelected: boolean;
  reasons: string[];
}

export interface ImageGeometryResult {
  x: number;
  y: number;
  width: number;
  height: number;
  crop: ImageCropConfig;
  placementMode: 'hero' | 'top' | 'left' | 'right' | 'bottom' | 'none';
  captionHeightPx: number;
}

export class ImageLayoutEngine {
  /**
   * Deterministically ranks candidate photos based on editorial suitability and quality.
   */
  public static rankPhotos(
    photos: CandidatePhoto[],
    targetRole: StoryLayoutRole,
    editorOverridePhotoId?: string
  ): PhotoRankingResult[] {
    if (!photos || photos.length === 0) return [];

    const scored = photos.map((p) => {
      let score = 0;
      const reasons: string[] = [];

      // 1. Editor Override has absolute priority
      if (editorOverridePhotoId && p.photoId === editorOverridePhotoId) {
        score += 10000;
        reasons.push('Selected by human editor override');
        return { photo: p, rankScore: score, isEditorSelected: true, reasons };
      }

      // 2. Editorial Desk Flag
      if (p.isEditorialSelection) {
        score += 300;
        reasons.push('Designated as primary photo by editorial desk');
      }

      // 3. Role-based orientation affinity
      const isLeadOrHero = targetRole === 'LEAD' || targetRole === 'BREAKING' || targetRole === 'PHOTO_STORY';
      if (isLeadOrHero) {
        if (p.orientation === 'landscape') {
          score += 150;
          reasons.push('Landscape orientation matches broadsheet lead banner');
        } else if (p.orientation === 'square') {
          score += 80;
        } else {
          score += 40;
        }
      } else if (targetRole === 'SIDEBAR' || targetRole === 'BRIEF') {
        if (p.orientation === 'portrait' || p.orientation === 'square') {
          score += 120;
          reasons.push('Compact orientation fits narrow column width');
        } else {
          score += 60;
        }
      } else {
        score += 100;
      }

      // 4. Quality & Relevance
      score += (p.qualityScore || 80) * 1.5;
      score += (p.relevanceScore || 80) * 1.2;

      // 5. Resolution check (at least 1200px wide preferred for print press)
      if (p.width >= 1200) {
        score += 80;
        reasons.push('High-resolution print asset (>= 1200px)');
      } else if (p.width < 600) {
        score -= 50;
        reasons.push('Low-resolution warning (< 600px)');
      }

      return {
        photo: p,
        rankScore: Math.round(score),
        isEditorSelected: false,
        reasons,
      };
    });

    return scored.sort((a, b) => b.rankScore - a.rankScore);
  }

  /**
   * Generates independent crop coordinates preserving original image integrity.
   */
  public static calculateCrop(
    photo: CandidatePhoto,
    targetWidthPx: number,
    targetHeightPx: number,
    mode: 'cover' | 'contain' | 'smart' | 'face' = 'cover'
  ): ImageCropConfig {
    const targetAspect = targetWidthPx / Math.max(1, targetHeightPx);
    const sourceAspect = photo.width / Math.max(1, photo.height);

    let cropWidth = photo.width;
    let cropHeight = photo.height;
    let cropX = 0;
    let cropY = 0;

    if (mode === 'cover' || mode === 'smart') {
      if (sourceAspect > targetAspect) {
        // Source is wider than target frame: crop sides
        cropWidth = Math.round(photo.height * targetAspect);
        cropHeight = photo.height;
        cropX = Math.round((photo.width - cropWidth) / 2);
        cropY = 0;
      } else {
        // Source is taller than target frame: crop top/bottom
        cropWidth = photo.width;
        cropHeight = Math.round(photo.width / targetAspect);
        cropX = 0;
        // In photojournalism, smart crop preserves upper third (faces/action)
        cropY = Math.round((photo.height - cropHeight) * 0.25);
      }
    } else if (mode === 'face') {
      // Face-aware abstraction: centers on upper center quadrant
      cropWidth = Math.round(Math.min(photo.width, photo.height * targetAspect));
      cropHeight = Math.round(cropWidth / targetAspect);
      cropX = Math.round((photo.width - cropWidth) / 2);
      cropY = Math.round(photo.height * 0.15);
    }

    return {
      x: Math.max(0, cropX),
      y: Math.max(0, cropY),
      width: Math.min(photo.width, cropWidth),
      height: Math.min(photo.height, cropHeight),
      scale: 1.0,
      mode,
    };
  }

  /**
   * Calculates image dimensions and placement within a story block.
   */
  public static computeImageGeometry(
    storyWidthPx: number,
    availableHeightPx: number,
    layoutRole: StoryLayoutRole,
    hasImage: boolean
  ): ImageGeometryResult | null {
    if (!hasImage) return null;

    let placementMode: 'hero' | 'top' | 'left' | 'right' | 'bottom' | 'none' = 'top';
    let width = storyWidthPx;
    let height = 0;

    switch (layoutRole) {
      case 'LEAD':
      case 'BREAKING':
      case 'PHOTO_STORY':
        placementMode = 'hero';
        width = storyWidthPx;
        // 16:9 or 3:2 ratio capped at 50% available block height
        height = Math.min(Math.round(storyWidthPx * 0.5625), Math.round(availableHeightPx * 0.52));
        break;

      case 'SECONDARY_LEAD':
      case 'FEATURE':
        placementMode = 'top';
        width = storyWidthPx;
        height = Math.min(Math.round(storyWidthPx * 0.45), Math.round(availableHeightPx * 0.4));
        break;

      case 'STANDARD':
        placementMode = 'top';
        width = storyWidthPx;
        height = Math.min(Math.round(storyWidthPx * 0.4), Math.round(availableHeightPx * 0.35));
        break;

      case 'SIDEBAR':
      case 'BRIEF':
        placementMode = 'top';
        width = storyWidthPx;
        height = Math.min(Math.round(storyWidthPx * 0.6), 110);
        break;

      case 'BOTTOM_STRIP':
        placementMode = 'left';
        width = Math.round(storyWidthPx * 0.35);
        height = Math.min(availableHeightPx - 20, 140);
        break;

      default:
        placementMode = 'top';
        width = storyWidthPx;
        height = Math.min(Math.round(storyWidthPx * 0.45), 140);
        break;
    }

    height = Math.max(60, height);

    const crop: ImageCropConfig = {
      x: 0,
      y: 0,
      width,
      height,
      scale: 1.0,
      mode: 'cover',
    };

    return {
      x: 0,
      y: 0,
      width,
      height,
      crop,
      placementMode,
      captionHeightPx: 20,
    };
  }
}
