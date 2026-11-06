/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Originality & Submission Domain Types
 * Phase 2 — News Submission & Reporter Originality Engine
 */

export type OriginalityStatus =
  | 'UNVERIFIED'
  | 'FIRST_RECORDED_SUBMISSION'
  | 'ORIGINAL_FIELD_REPORT'
  | 'INDEPENDENT_REPORT'
  | 'SECONDARY_REPORT'
  | 'POSSIBLE_DUPLICATE'
  | 'DUPLICATE_CONFIRMED'
  | 'DISPUTED'
  | 'VERIFIED_ORIGINAL';

export type ReporterDeclaration =
  | 'original_field_report'
  | 'independently_reported'
  | 'secondary_source'
  | 'aggregated'
  | 'unknown';

export type EvidenceType =
  | 'original_photo'
  | 'original_video'
  | 'audio_note'
  | 'field_note'
  | 'source_note'
  | 'document'
  | 'gps_capture'
  | 'timestamp_metadata';

export type EvidenceVisibility = 'editorial_only' | 'public_attribution';

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  altitudeMeters?: number;
  locationName?: string;
  capturedAt?: string;
}

export interface DeviceMetadata {
  make?: string;
  model?: string;
  software?: string;
  lensModel?: string;
  iso?: number;
  focalLength?: string;
  exposureTime?: string;
  rawExifCapturedAt?: string;
}

export interface ReporterEvidence {
  evidenceId: string;
  newsId: string;
  submissionId: string;
  reporterId: string;
  tenantId: string;
  evidenceType: EvidenceType;
  title: string;
  description?: string;
  fileUrl?: string;
  originalFilename?: string;
  fileHash?: string;
  mimeType?: string;
  sizeBytes?: number;
  capturedAt?: string;
  uploadedAt: string;
  gpsCoords?: GpsCoordinates;
  deviceMetadata?: DeviceMetadata;
  visibility: EvidenceVisibility;
  isVerifiedByEditor?: boolean;
  editorialVerificationNote?: string;
}

export interface NewsSubmission {
  submissionId: string;
  newsId: string;
  reporterId: string;
  tenantId: string;
  clientCapturedAt?: string;
  serverSubmittedAt: string; // Authoritative server timestamp (ISO 8601)
  declaration: ReporterDeclaration;
  evidenceReferences: string[]; // evidenceIds
  contentFingerprint: string;
  mediaFingerprints: string[];
  originalityStatus: OriginalityStatus;
  eventGroupId?: string;
  isFirstRecordedSubmission: boolean;
  version: number;
}

export interface SimilarityMatch {
  matchId: string;
  targetArticleId: string;
  targetSubmissionId?: string;
  targetHeadline: string;
  targetByline: string;
  targetTenantId: string;
  targetSubmittedAt: string;
  headlineSimilarityPercent: number;
  bodySimilarityPercent: number;
  overallSimilarityPercent: number;
  matchType:
    | 'exact_duplicate'
    | 'lightly_edited'
    | 'paraphrased'
    | 'copied_headline'
    | 'substantially_similar'
    | 'event_co_coverage';
  sharedEntities: string[];
  isSameEventDifferentAngle: boolean;
  summaryExplanation: string;
}

export interface OriginalityAssessment {
  assessmentId: string;
  newsId: string;
  submissionId: string;
  tenantId: string;
  status: OriginalityStatus;
  confidenceScore: number; // 0-100
  firstRecordedSubmission: boolean;
  evidenceScore: number; // 0-100
  similarityScore: number; // 0-100
  metadataScore: number; // 0-100
  similarityMatches: SimilarityMatch[];
  factors: {
    hasFieldEvidence: boolean;
    hasDeviceMetadata: boolean;
    hasGpsCoords: boolean;
    isEarliestInEventGroup: boolean;
    declarationMatchesEvidence: boolean;
    similarityWarning: boolean;
    breakingStoryActive: boolean;
  };
  verificationStatus: 'unverified' | 'verified_by_editor' | 'disputed' | 'flagged';
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  editorialNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventGroup {
  eventId: string;
  tenantId: string;
  title: string;
  summary: string;
  category: string;
  district: string;
  state: string;
  location: string;
  firstReportedAt: string;
  firstSubmissionId: string;
  firstReporterId: string;
  firstReporterName: string;
  reportCount: number;
  submissionIds: string[];
  articleIds: string[];
  isBreakingStoryLocked: boolean;
  breakingLockSetBy?: string;
  breakingLockSetAt?: string;
  breakingLockReason?: string;
  status: 'active' | 'archived' | 'disputed';
  createdAt: string;
  updatedAt: string;
}
