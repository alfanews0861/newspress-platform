/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 6 — AI Editorial Engine & Publishing Plan Domain Models
 * 
 * CORE PRODUCT PRINCIPLES:
 * 1. AI assists journalists and editors; it NEVER replaces editorial authority.
 * 2. Original reporter content remains preserved and immutable.
 * 3. Separate states for SOURCE CONTENT, AI SUGGESTION, EDITOR DECISION, FINAL CONTENT.
 * 4. Fact integrity: Factual entities (names, dates, numbers, quotes, titles) are guarded.
 */

export type PublishingPlanId = 'BASIC' | 'STANDARD' | 'PREMIUM';
export type AIModelTier = 'NONE' | 'LIGHT' | 'ADVANCED';

export interface PlanFeatureConfig {
  generativeAiAllowed: boolean;
  allowedModelTier: AIModelTier;
  monthlyOperationsLimit: number;
  headlineAssistant: boolean;
  advancedHeadlineHierarchy: boolean;
  summaryGeneration: boolean;
  copyFittingSuggestions: boolean;
  copyRestructuring: boolean;
  conciseNewspaperRewrite: boolean;
  intelligentPhotoSelection: boolean;
  imageAnalysis: boolean;
  imageEnhancement: boolean;
  captionAssistance: boolean;
  sectionClassification: boolean;
  prioritySuggestions: boolean;
}

export const PUBLISHING_PLAN_CONFIGS: Record<PublishingPlanId, PlanFeatureConfig> = {
  BASIC: {
    generativeAiAllowed: false,
    allowedModelTier: 'NONE',
    monthlyOperationsLimit: 0,
    headlineAssistant: false,
    advancedHeadlineHierarchy: false,
    summaryGeneration: false,
    copyFittingSuggestions: false,
    copyRestructuring: false,
    conciseNewspaperRewrite: false,
    intelligentPhotoSelection: false,
    imageAnalysis: false,
    imageEnhancement: false,
    captionAssistance: false,
    sectionClassification: false,
    prioritySuggestions: false,
  },
  STANDARD: {
    generativeAiAllowed: true,
    allowedModelTier: 'LIGHT',
    monthlyOperationsLimit: 500,
    headlineAssistant: true,
    advancedHeadlineHierarchy: false,
    summaryGeneration: true,
    copyFittingSuggestions: true,
    copyRestructuring: false,
    conciseNewspaperRewrite: false,
    intelligentPhotoSelection: false,
    imageAnalysis: false,
    imageEnhancement: false,
    captionAssistance: false,
    sectionClassification: true,
    prioritySuggestions: true,
  },
  PREMIUM: {
    generativeAiAllowed: true,
    allowedModelTier: 'ADVANCED',
    monthlyOperationsLimit: 2500,
    headlineAssistant: true,
    advancedHeadlineHierarchy: true,
    summaryGeneration: true,
    copyFittingSuggestions: true,
    copyRestructuring: true,
    conciseNewspaperRewrite: true,
    intelligentPhotoSelection: true,
    imageAnalysis: true,
    imageEnhancement: true,
    captionAssistance: true,
    sectionClassification: true,
    prioritySuggestions: true,
  },
};

export interface AIPlanEntitlement {
  entitlementId: string;
  tenantId: string;
  planId: PublishingPlanId;
  allowedModelTier: AIModelTier;
  monthlyOperationsLimit: number;
  currentMonthlyUsage: number;
  features: PlanFeatureConfig;
  periodStart: string; // ISO 8601
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------
// Fact Preservation & Fact Ledger
// ----------------------------------------------------

export type FactEntityType =
  | 'PERSON'
  | 'ORGANIZATION'
  | 'LOCATION'
  | 'DATE'
  | 'TIME'
  | 'NUMBER'
  | 'CURRENCY'
  | 'PERCENTAGE'
  | 'QUOTATION'
  | 'OFFICIAL_TITLE'
  | 'NAMED_PROJECT';

export interface FactEntity {
  entityId: string;
  entityType: FactEntityType;
  value: string;
  normalizedValue: string;
  sourceText: string;
  confidence: number;
  startIndex?: number;
  endIndex?: number;
}

export interface FactLedger {
  ledgerId: string;
  tenantId: string;
  newsId: string;
  versionId: string;
  entities: FactEntity[];
  extractedAt: string;
  totalEntities: number;
}

export type FactDiscrepancyType =
  | 'CHANGED_NUMBER'
  | 'CHANGED_AMOUNT'
  | 'CHANGED_DATE'
  | 'CHANGED_PERSON'
  | 'CHANGED_ORGANIZATION'
  | 'CHANGED_LOCATION'
  | 'CHANGED_QUOTE'
  | 'REMOVED_ATTRIBUTION'
  | 'UNVERIFIED_CLAIM';

export interface FactDiscrepancy {
  discrepancyType: FactDiscrepancyType;
  entityType: FactEntityType;
  originalValue: string;
  suggestedValue: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
}

export type FactIntegrityStatus = 'PASSED' | 'FLAGGED_FOR_EDITOR' | 'CRITICAL_DISCREPANCY';

export interface FactIntegrityReport {
  status: FactIntegrityStatus;
  passed: boolean;
  discrepancies: FactDiscrepancy[];
  confidenceScore: number;
  checkedAt: string;
  details: string;
}

// ----------------------------------------------------
// AI Output Types & Suggestion Storage
// ----------------------------------------------------

export type AIEditorialOutputType =
  | 'HEADLINE_SUGGESTION'
  | 'SUBHEADLINE_SUGGESTION'
  | 'SUMMARY'
  | 'COPY_EDIT'
  | 'SHORTENED_COPY'
  | 'RESTRUCTURED_COPY'
  | 'CAPTION_SUGGESTION'
  | 'SECTION_SUGGESTION'
  | 'PRIORITY_SUGGESTION'
  | 'PHOTO_SELECTION'
  | 'IMAGE_ENHANCEMENT'
  | 'LAYOUT_SUGGESTION';

export type AISuggestionEditorStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'MODIFIED';

export interface HeadlineOption {
  optionId: string;
  headline: string;
  characterCount: number;
  estimatedLines: number;
  fitVerdict: 'OPTIMAL' | 'TIGHT' | 'TOO_LONG';
  style: 'PUNCHY' | 'DESCRIPTIVE' | 'FORMAL' | 'TABLOID';
  factIntegrityStatus: FactIntegrityStatus;
}

export interface SummaryOption {
  targetWordCount: 30 | 50 | 60 | 80;
  actualWordCount: number;
  summaryText: string;
  keyPoints: string[];
}

export interface AISuggestion {
  suggestionId: string;
  tenantId: string;
  sourceNewsId: string;
  sourceVersion: number;
  sourceVersionId?: string;
  aiProvider: string;
  aiModel: string;
  modelTier: AIModelTier;
  promptId: string;
  promptVersion: string;
  outputType: AIEditorialOutputType;
  outputData: any; // HeadlineOption[], SummaryOption[], string, etc.
  confidence: number;
  factIntegrityStatus: FactIntegrityStatus;
  factDiscrepancies: FactDiscrepancy[];
  editorStatus: AISuggestionEditorStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  modifiedContent?: any;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------
// Editorial Content Versioning
// ----------------------------------------------------

export type EditorialSourceType =
  | 'REPORTER_SUBMISSION'
  | 'HUMAN_EDIT'
  | 'AI_SUGGESTION'
  | 'AI_ACCEPTED'
  | 'MARKETPLACE_SOURCE';

export interface EditorialContentVersion {
  versionId: string;
  newsId: string;
  tenantId: string;
  versionNumber: number;
  headline: string;
  subheadline?: string;
  leadParagraph: string;
  bodyContent: string;
  summary?: string;
  category: string;
  sourceType: EditorialSourceType;
  createdBy: string;
  createdAt: string;
  parentVersionId?: string;
  acceptedBy?: string;
  acceptedAt?: string;
  changeSummary: string;
  suggestionId?: string;
}

// ----------------------------------------------------
// AI Usage & Cost Tracking
// ----------------------------------------------------

export type AIRequestStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REJECTED'
  | 'BLOCKED_BY_PLAN';

export interface AIUsageRecord {
  usageId: string;
  tenantId: string;
  userId: string;
  newsId?: string;
  operation: AIEditorialOutputType | string;
  modelTier: AIModelTier;
  provider: string;
  model: string;
  inputTokenEstimate: number;
  outputTokenEstimate: number;
  processingTimeMs: number;
  status: AIRequestStatus;
  errorMessage?: string;
  createdAt: string;
}

export interface AIPromptTemplate {
  promptId: string;
  operation: AIEditorialOutputType;
  version: string;
  systemInstruction: string;
  outputSchema: Record<string, any>;
  active: boolean;
  createdAt: string;
}

// ----------------------------------------------------
// Image Intelligence & Image Enhancement Provider
// ----------------------------------------------------

export interface ImageAnalysisDiagnostics {
  resolution: {
    width: number;
    height: number;
    megapixels: number;
  };
  brightness: number; // 0 - 100
  contrast: number; // 0 - 100
  sharpness: number; // 0 - 100
  orientation: 'landscape' | 'portrait' | 'square';
  facePresence: boolean;
  faceCount: number;
  cropSuitability: {
    broadsheetLead: number; // 0 - 100
    squareThumbnail: number;
    tabloidFeature: number;
  };
  noiseEstimate: number; // 0 - 100
  printDpiSuitability: {
    effectiveDpiAt3Col: number;
    printQualityRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  };
  journalisticDisclaimer: string;
}

export type ImageEnhancementOperation =
  | 'sharpen'
  | 'brightness'
  | 'contrast'
  | 'noiseReduction'
  | 'upscale'
  | 'smartCrop';

export interface EnhancedImageDerivative {
  derivativeId: string;
  tenantId: string;
  sourceMediaId: string;
  sourceImageUrl: string;
  provider: string;
  model: string;
  operation: ImageEnhancementOperation;
  parameters: Record<string, any>;
  outputUrl: string;
  dimensions: {
    width: number;
    height: number;
  };
  dpiEstimate: number;
  createdAt: string;
  safetyIntegrityVerified: boolean;
}
