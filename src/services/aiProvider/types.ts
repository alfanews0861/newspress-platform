/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress AI Editorial Provider Abstraction
 * Phase 6 — Pluggable Multi-Provider Architecture
 */

import {
  AIModelTier,
  HeadlineOption,
  SummaryOption,
} from '../../types/editorialAi';

export interface CopyEditResult {
  suggestedHeadline?: string;
  suggestedSubheadline?: string;
  suggestedLeadParagraph?: string;
  suggestedBodyContent: string;
  changeSummary: string;
  edits: Array<{
    type: 'SPELLING' | 'GRAMMAR' | 'PUNCTUATION' | 'READABILITY' | 'STYLE' | 'CONCISENESS';
    original: string;
    suggested: string;
    reason: string;
  }>;
}

export interface ShortenCopyResult {
  suggestedBodyContent: string;
  originalWordCount: number;
  suggestedWordCount: number;
  reductionPercent: number;
  expectedHeightReductionMm: number;
  summary: string;
}

export interface RestructureResult {
  restructuredHeadline: string;
  invertedPyramidLead: string;
  structuredBody: string;
  sectionBreakdowns: string[];
}

export interface CaptionResult {
  caption: string;
  confidence: number;
  identityConfirmationNeeded: boolean;
  notes?: string;
}

export interface SectionClassificationResult {
  suggestedSection: string;
  suggestedSubcategory?: string;
  confidence: number;
  alternativeSections: string[];
}

export interface PrioritySuggestionResult {
  suggestedPriority: 'LEAD' | 'SECONDARY_LEAD' | 'FEATURE' | 'STANDARD' | 'BRIEF';
  reason: string;
  priorityScore: number;
}

export interface PhotoSuggestionResult {
  selectedPhotoId: string;
  rankScore: number;
  rationale: string;
  suggestedPlacement: 'hero' | 'top' | 'inline' | 'sidebar';
}

export interface IAIEditorialProvider {
  readonly providerName: string;

  generateHeadline(params: {
    originalHeadline: string;
    leadParagraph: string;
    category?: string;
    modelTier: AIModelTier;
    targetColumnCount?: number;
    promptVersion?: string;
  }): Promise<HeadlineOption[]>;

  generateSubheadline(params: {
    headline: string;
    leadParagraph: string;
    bodyContent: string;
    modelTier: AIModelTier;
    promptVersion?: string;
  }): Promise<string[]>;

  summarize(params: {
    headline: string;
    leadParagraph: string;
    bodyContent: string;
    modelTier: AIModelTier;
    targetWordCounts?: Array<30 | 50 | 60 | 80>;
    promptVersion?: string;
  }): Promise<SummaryOption[]>;

  copyEdit(params: {
    headline: string;
    subheadline?: string;
    leadParagraph: string;
    bodyContent: string;
    category?: string;
    modelTier: AIModelTier;
    promptVersion?: string;
  }): Promise<CopyEditResult>;

  shorten(params: {
    headline: string;
    bodyContent: string;
    currentWordCount: number;
    targetWordCount?: number;
    targetHeightReductionPercent?: number;
    modelTier: AIModelTier;
    promptVersion?: string;
  }): Promise<ShortenCopyResult>;

  restructure(params: {
    headline: string;
    leadParagraph: string;
    bodyContent: string;
    category?: string;
    modelTier: AIModelTier;
    promptVersion?: string;
  }): Promise<RestructureResult>;

  generateCaption(params: {
    headline: string;
    leadParagraph: string;
    imageContext?: string;
    modelTier: AIModelTier;
    promptVersion?: string;
  }): Promise<CaptionResult>;

  classifySection(params: {
    headline: string;
    leadParagraph: string;
    bodyContent: string;
    modelTier: AIModelTier;
    promptVersion?: string;
  }): Promise<SectionClassificationResult>;

  suggestPriority(params: {
    headline: string;
    leadParagraph: string;
    bodyContent: string;
    category?: string;
    breakingStatus?: boolean;
    modelTier: AIModelTier;
    promptVersion?: string;
  }): Promise<PrioritySuggestionResult>;

  suggestPhoto(params: {
    headline: string;
    leadParagraph: string;
    availablePhotos: Array<{ photoId: string; caption?: string; width: number; height: number; tags?: string[] }>;
    modelTier: AIModelTier;
    promptVersion?: string;
  }): Promise<PhotoSuggestionResult>;
}
