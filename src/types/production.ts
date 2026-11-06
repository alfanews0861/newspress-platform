/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Production & Print Engine Types (Phase 5)
 * Defines models for ProductionSnapshots, ProductionJobs, Preflight Reports,
 * Font Registry, Image Derivatives, and Queue Scheduling.
 */

import { NewspaperBrand, NewspaperTemplate, NewspaperPage, AdvertisementPlacement } from './edition';

export type ProductionJobStatus =
  | 'FINALIZED'
  | 'QUEUED'
  | 'CLAIMED'
  | 'PROCESSING'
  | 'RENDERING'
  | 'PREFLIGHT_CHECK'
  | 'READY'
  // Phase 10 Lifecycle Stages & Terminal States
  | 'PRODUCTION_QUEUED'
  | 'PDF_GENERATING'
  | 'PDF_GENERATED'
  | 'PREFLIGHT_PENDING'
  | 'PREFLIGHT_PASSED'
  | 'PRODUCTION_APPROVED'
  | 'VENDOR_DISPATCH_PENDING'
  | 'SENT_TO_VENDOR'
  | 'VENDOR_ACKNOWLEDGED'
  | 'PRINTING'
  | 'PRINT_COMPLETED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'FAILED'
  | 'REJECTED_BY_VENDOR'
  | 'CANCELLED'
  | 'SUPERSEDED'
  | 'REPRINT_REQUIRED'
  | 'RETRY_SCHEDULED';

export type ProductionProgressStage =
  | 'QUEUED'
  | 'PREPARING'
  | 'RENDERING'
  | 'IMAGE_PROCESSING'
  | 'FONT_EMBEDDING'
  | 'PREFLIGHT'
  | 'PACKAGING'
  | 'READY'
  | 'APPROVED'
  | 'DISPATCHED'
  | 'PRINTING'
  | 'DISTRIBUTING'
  | 'DELIVERED';

export type FailureClassification =
  | 'TRANSIENT'
  | 'PERMANENT'
  | 'CONTENT_ERROR'
  | 'RENDER_ERROR'
  | 'STORAGE_ERROR'
  | 'VENDOR_ERROR'
  | 'CHECKSUM_MISMATCH'
  | 'UNKNOWN';

export interface FrozenArticle {
  newsId: string;
  headline: string;
  subheadline?: string;
  byline: string;
  leadParagraph?: string;
  bodyContent: string;
  category?: string;
  licenseId?: string;
  attributionText?: string;
  heroImageUrl?: string;
  wordCount?: number;
}

export interface ProductionSnapshot {
  snapshotId: string;
  tenantId: string;
  editionId: string;
  editionCode: string;
  brandId: string;
  brandName: string;
  templateId: string;
  revisionId: string;
  version: number;
  publicationDate: string;
  publicationTimezone: string; // e.g. "Asia/Kolkata", "America/New_York"
  brand: NewspaperBrand;
  template: NewspaperTemplate;
  pages: NewspaperPage[];
  articlesSnapshot: Record<string, FrozenArticle>;
  advertisementsSnapshot: AdvertisementPlacement[];
  pressSpecs: {
    format: 'broadsheet' | 'tabloid' | 'berliner' | 'A4';
    colorMode: 'cmyk' | 'spot' | 'grayscale' | 'rgb';
    bleedMm: number;
    dpi: number;
    safeAreaMarginMm: number;
  };
  checksum: string; // SHA-256 hash of frozen content
  finalizedBy: {
    userId: string;
    userRole: string;
    displayName?: string;
  };
  finalizedAt: string;
  createdAt: string;
}

export interface ProductionOutputFile {
  printPdfUrl?: string;
  digitalPdfUrl?: string;
  printPdfDataUri?: string;
  digitalPdfDataUri?: string;
  printChecksum?: string;
  digitalChecksum?: string;
  printSizeBytes?: number;
  digitalSizeBytes?: number;
  pageCount?: number;
  colorProfile?: string;
  generatedAt?: string;
  outputVersion?: number;
}

export interface ProductionJob {
  productionJobId: string;
  tenantId: string;
  editionId: string;
  snapshotId: string;
  editionDate: string;
  brandId: string;
  priority: number; // 1 (Highest) to 10 (Lowest)
  queuePosition: number;
  status: ProductionJobStatus;
  stage: ProductionProgressStage;
  progressPercent: number;
  attemptCount: number;
  maxAttempts: number;
  scheduledFor: string; // ISO 8601 string
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  failureCode?: string;
  failureMessage?: string;
  failureType?: FailureClassification;
  workerId?: string;
  leaseExpiresAt?: string;
  outputFiles?: ProductionOutputFile;
  preflightReportId?: string;
  preflightResult?: 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL';
  createdAt: string;
  updatedAt: string;
  // Phase 10 Extended Operations Fields
  productionVersion?: number;
  printArtifactId?: string;
  digitalArtifactId?: string;
  publicationTimezone?: string;
  productionDeadline?: string;
  vendorDispatchDeadline?: string;
  currentStatus?: ProductionJobStatus;
  assignedVendorId?: string;
  assignedRegionId?: string;
  lastError?: string;
  approvedAt?: string;
  approvedBy?: {
    userId: string;
    userRole: string;
    displayName?: string;
  };
  dispatchedAt?: string;
  acknowledgedAt?: string;
  printedAt?: string;
  deliveredAt?: string;
  reprintReason?: string;
  supersededByJobId?: string;
  correctionVersion?: number;
}

// -------------------------------------------------------------
// Phase 10 Models
// -------------------------------------------------------------

export type ArtifactType =
  | 'PRINT_PDF'
  | 'DIGITAL_PDF'
  | 'PAGE_PDF'
  | 'THUMBNAIL'
  | 'PREFLIGHT_REPORT'
  | 'VENDOR_PROOF'
  | 'CORRECTED_PRINT_PDF';

export interface PrintProductionArtifact {
  id: string;
  tenantId: string;
  editionId: string;
  productionJobId: string;
  snapshotId: string;
  version: number;
  artifactType: ArtifactType;
  storagePath: string;
  fileName: string;
  fileSize: number;
  checksum: string; // Cryptographic SHA-256
  pageCount: number;
  dimensions: {
    widthMm: number;
    heightMm: number;
    format: string;
  };
  colorMode: string; // 'cmyk' | 'spot' | 'grayscale' | 'rgb'
  bleedStatus: 'VALID' | 'WARNING' | 'INVALID';
  fontEmbeddingStatus: 'EMBEDDED' | 'SUBSETTED' | 'MISSING';
  dpiStatus: 'COMPLIANT' | 'WARNING' | 'LOW_RES';
  preflightStatus: 'PASS' | 'WARNING' | 'BLOCKED';
  generatedAt: string;
  supersededAt?: string;
  createdBy: {
    userId: string;
    userRole: string;
    displayName?: string;
  };
  immutable: boolean;
  downloadUrl?: string;
}

export type VendorType = 'INTERNAL_PRINT_UNIT' | 'EXTERNAL_PRINT_VENDOR' | 'CONTRACT_PRINT_VENDOR';

export interface PrintVendor {
  id: string;
  tenantId: string;
  name: string;
  legalName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  regions: string[]; // Regional IDs/Codes served
  supportedFormats: ('broadsheet' | 'tabloid' | 'berliner' | 'A4')[];
  supportedColorProfiles: ('cmyk' | 'spot' | 'grayscale' | 'rgb')[];
  supportedPaperSizes: string[];
  dailyCapacity: number;
  active: boolean;
  priority: number;
  vendorType: VendorType;
  createdAt: string;
  updatedAt: string;
}

export interface PrintVendorCapability {
  vendorId: string;
  tenantId: string;
  paperSizes: string[];
  pageCounts: {
    min: number;
    max: number;
  };
  supportsColor: boolean;
  supportsMonochrome: boolean;
  printProfiles: string[];
  bleedRequirementsMm: number;
  acceptedFileFormats: string[];
  maximumDailyCapacity: number;
  regionalServiceArea: string[];
  productionCutoffTime: string; // "HH:MM" e.g. "23:00"
  dispatchCutoffTime: string; // "HH:MM" e.g. "01:00"
  emergencyReprintSupport: boolean;
}

export interface ProductionRegion {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  timezone: string;
  geographicCoverage: string[];
  defaultVendorId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DispatchStatus =
  | 'PENDING'
  | 'DISPATCHING'
  | 'SENT'
  | 'ACKNOWLEDGED'
  | 'REJECTED'
  | 'FAILED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface PrintVendorDispatch {
  id: string;
  tenantId: string;
  editionId: string;
  productionJobId: string;
  vendorId: string;
  regionId: string;
  artifactId: string;
  dispatchVersion: number;
  checksum: string;
  dispatchStatus: DispatchStatus;
  dispatchedAt?: string;
  acknowledgedAt?: string;
  vendorReferenceNumber?: string;
  vendorMessage?: string;
  acceptedChecksum?: string;
  acceptedVersion?: number;
  expectedPrintCompletionAt?: string;
  actualPrintCompletionAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  retryCount: number;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export type ProofStatus = 'PENDING' | 'RECEIVED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export interface VendorProof {
  id: string;
  tenantId: string;
  editionId: string;
  vendorDispatchId: string;
  artifactId: string;
  storagePath: string;
  checksum: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: {
    userId: string;
    userRole: string;
    displayName?: string;
  };
  status: ProofStatus;
  rejectionReason?: string;
}

export type DeliveryStatus =
  | 'PLANNED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'PARTIALLY_DELIVERED'
  | 'FAILED';

export interface PrintDistribution {
  id: string;
  tenantId: string;
  editionId: string;
  vendorDispatchId?: string;
  regionId: string;
  quantity: number;
  wastageQuantity?: number;
  reprintQuantity?: number;
  dispatchDate?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  carrier?: string;
  trackingReference?: string;
  deliveryStatus: DeliveryStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PagePreflightResult {
  pageNumber: number;
  dimensionsValid: boolean;
  overflowDetected: boolean;
  collisionDetected: boolean;
  safeAreaViolations: string[];
  errors: string[];
  warnings: string[];
}

export interface FontPreflightResult {
  fontFamily: string;
  script: string;
  isAvailable: boolean;
  embeddingAllowed: boolean;
  status: 'embedded' | 'restricted' | 'missing';
}

export interface ImagePreflightResult {
  mediaId: string;
  sourceUrl: string;
  effectiveDPI: number;
  status: 'GOOD' | 'WARNING' | 'ERROR';
  colorProfile: string;
  dimensions: {
    widthPx: number;
    heightPx: number;
    printWidthInches: number;
    printHeightInches: number;
  };
  warnings?: string[];
}

export interface ProductionPreflightReport {
  reportId: string;
  productionJobId: string;
  snapshotId: string;
  tenantId: string;
  result: 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL';
  errors: string[];
  warnings: string[];
  pageResults: PagePreflightResult[];
  fontResults: FontPreflightResult[];
  imageResults: ImagePreflightResult[];
  createdAt: string;
}

export interface RegisteredFont {
  fontId: string;
  fontFamily: string;
  fontStyle: 'normal' | 'italic' | 'oblique';
  fontWeight: number | string;
  fontFileReference: string;
  supportedScripts: ('latin' | 'telugu' | 'devanagari' | 'symbols')[];
  embeddingAllowed: boolean;
  licenseTerms: string;
  status: 'active' | 'restricted' | 'deprecated';
}

export interface PrintImageDerivative {
  derivativeId: string;
  sourceMediaId: string;
  tenantId: string;
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
    mode: string;
  };
  targetWidth: number;
  targetHeight: number;
  effectiveDPI: number;
  colorProfile: 'cmyk' | 'grayscale' | 'rgb';
  processingStatus: 'processed' | 'pending' | 'failed';
  derivativeUrl?: string;
  createdAt: string;
}

export interface InternalNotification {
  notificationId: string;
  tenantId: string;
  type: 'edition_finalized' | 'production_started' | 'production_ready' | 'production_failed' | 'correction_required';
  editionId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
