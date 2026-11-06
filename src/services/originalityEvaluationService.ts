/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Originality Priority & Evaluation Service
 * Phase 2 — News Submission & Reporter Originality Engine
 * 
 * PRIORITY EVALUATION MODEL:
 * 1. Verified original field evidence
 * 2. Earliest verified submission
 * 3. Supporting media metadata (EXIF, device info, capture timestamps)
 * 4. Source declaration consistency
 * 5. Content similarity analysis
 * 6. Editorial verification
 * 
 * IMPORTANT ARCHITECTURAL PRINCIPLE:
 * The platform distinguishes between "first recorded submission" and "verified original field report".
 * First submission alone must NOT automatically establish legal ownership.
 * The system must never expose a misleading single "truth score"; editors see the multi-factor breakdown.
 */

import {
  OriginalityAssessment,
  OriginalityStatus,
  ReporterDeclaration,
  ReporterEvidence,
  SimilarityMatch
} from '../types/originality';

export interface EvaluationInput {
  newsId: string;
  submissionId: string;
  tenantId: string;
  declaration: ReporterDeclaration;
  serverSubmittedAt: string;
  clientCapturedAt?: string;
  evidenceItems: ReporterEvidence[];
  similarityMatches: SimilarityMatch[];
  isEarliestInEventGroup: boolean;
  isBreakingStoryActive: boolean;
  existingAssessment?: Partial<OriginalityAssessment>;
}

export class OriginalityEvaluationService {
  /**
   * Evaluates all originality factors and generates a multi-dimensional assessment.
   */
  evaluate(input: EvaluationInput): OriginalityAssessment {
    const {
      newsId,
      submissionId,
      tenantId,
      declaration,
      evidenceItems,
      similarityMatches,
      isEarliestInEventGroup,
      isBreakingStoryActive
    } = input;

    // 1. Evidence Score (0 - 100)
    let evidenceScore = 0;
    let hasFieldEvidence = false;
    let hasDeviceMetadata = false;
    let hasGpsCoords = false;

    if (evidenceItems && evidenceItems.length > 0) {
      for (const item of evidenceItems) {
        if (item.evidenceType === 'original_photo' || item.evidenceType === 'original_video') {
          evidenceScore += 30;
          hasFieldEvidence = true;
        } else if (item.evidenceType === 'audio_note') {
          evidenceScore += 20;
          hasFieldEvidence = true;
        } else if (item.evidenceType === 'field_note' || item.evidenceType === 'source_note') {
          evidenceScore += 15;
          hasFieldEvidence = true;
        } else if (item.evidenceType === 'document') {
          evidenceScore += 15;
        }

        if (item.deviceMetadata && Object.keys(item.deviceMetadata).length > 0) {
          hasDeviceMetadata = true;
          evidenceScore += 10;
        }

        if (item.gpsCoords && item.gpsCoords.latitude && item.gpsCoords.longitude) {
          hasGpsCoords = true;
          evidenceScore += 15;
        }
      }
    }
    evidenceScore = Math.min(100, evidenceScore);

    // 2. Metadata Score (0 - 100)
    let metadataScore = 0;
    if (hasDeviceMetadata) metadataScore += 45;
    if (hasGpsCoords) metadataScore += 45;
    if (input.clientCapturedAt) metadataScore += 10;
    metadataScore = Math.min(100, metadataScore);

    // 3. Similarity Score (highest similarity found)
    let maxSimilarity = 0;
    let isExactDuplicate = false;
    let isSubstantialDuplicate = false;

    if (similarityMatches && similarityMatches.length > 0) {
      for (const match of similarityMatches) {
        if (!match.isSameEventDifferentAngle) {
          maxSimilarity = Math.max(maxSimilarity, match.overallSimilarityPercent);
          if (match.matchType === 'exact_duplicate' || match.overallSimilarityPercent >= 90) {
            isExactDuplicate = true;
          } else if (match.matchType === 'lightly_edited' || match.overallSimilarityPercent >= 70) {
            isSubstantialDuplicate = true;
          }
        }
      }
    }

    // 4. Declaration vs Evidence Alignment Check
    let declarationMatchesEvidence = true;
    if (declaration === 'original_field_report' && !hasFieldEvidence) {
      declarationMatchesEvidence = false;
    }

    // 5. Determine Derived Originality Status
    let status: OriginalityStatus = 'UNVERIFIED';

    if (isExactDuplicate) {
      status = 'DUPLICATE_CONFIRMED';
    } else if (isSubstantialDuplicate) {
      status = 'POSSIBLE_DUPLICATE';
    } else if (declaration === 'secondary_source' || declaration === 'aggregated') {
      status = 'SECONDARY_REPORT';
    } else if (hasFieldEvidence && isEarliestInEventGroup && evidenceScore >= 40) {
      // Distinction: It is an original field report candidate, or if verified earliest
      status = 'ORIGINAL_FIELD_REPORT';
    } else if (isEarliestInEventGroup && maxSimilarity < 30) {
      status = 'FIRST_RECORDED_SUBMISSION';
    } else if (!isEarliestInEventGroup && maxSimilarity < 50 && hasFieldEvidence) {
      status = 'INDEPENDENT_REPORT';
    } else if (maxSimilarity >= 60) {
      status = 'POSSIBLE_DUPLICATE';
    } else {
      status = 'UNVERIFIED';
    }

    // 6. Overall Confidence Score (multi-factor aggregate)
    // Weight factors:
    // + Evidence factor (35%)
    // + Metadata factor (20%)
    // + Uniqueness factor (inverse of similarity) (35%)
    // + Timestamp precedence (10%)
    const uniquenessScore = Math.max(0, 100 - maxSimilarity);
    const precedenceScore = isEarliestInEventGroup ? 100 : 50;

    let confidenceScore = Math.round(
      evidenceScore * 0.35 +
      metadataScore * 0.20 +
      uniquenessScore * 0.35 +
      precedenceScore * 0.10
    );

    // If duplicate detected, confidence in originality drops to near zero
    if (isExactDuplicate) {
      confidenceScore = Math.min(10, confidenceScore);
    } else if (isSubstantialDuplicate) {
      confidenceScore = Math.min(30, confidenceScore);
    }

    return {
      assessmentId: input.existingAssessment?.assessmentId || `assess_${Date.now()}_${newsId}`,
      newsId,
      submissionId,
      tenantId,
      status: input.existingAssessment?.status || status,
      confidenceScore,
      firstRecordedSubmission: isEarliestInEventGroup,
      evidenceScore,
      similarityScore: maxSimilarity,
      metadataScore,
      similarityMatches,
      factors: {
        hasFieldEvidence,
        hasDeviceMetadata,
        hasGpsCoords,
        isEarliestInEventGroup,
        declarationMatchesEvidence,
        similarityWarning: maxSimilarity >= 65,
        breakingStoryActive: isBreakingStoryActive
      },
      verificationStatus: input.existingAssessment?.verificationStatus || 'unverified',
      reviewedBy: input.existingAssessment?.reviewedBy,
      reviewedByName: input.existingAssessment?.reviewedByName,
      reviewedAt: input.existingAssessment?.reviewedAt,
      editorialNotes: input.existingAssessment?.editorialNotes,
      createdAt: input.existingAssessment?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

export const originalityEvaluator = new OriginalityEvaluationService();
