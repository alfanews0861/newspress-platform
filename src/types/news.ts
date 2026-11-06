/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress News Article and Editorial Domain Models
 * Phase 2 Extended
 */

import { OriginalityStatus, ReporterDeclaration } from './originality';

export type ArticleEditorialStatus =
  | 'draft'
  | 'submitted'
  | 'originality_check'
  | 'editorial_review'
  | 'in_review'
  | 'fact_checking'
  | 'revision_requested'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'rejected'
  | 'archived'
  | 'marketplace_listed';

export type ArticleOriginalityVerdict =
  | 'pending'
  | 'verified_original'
  | 'first_recorded'
  | 'independent_report'
  | 'secondary_report'
  | 'possible_duplicate'
  | 'duplicate_confirmed'
  | 'flagged_plagiarism'
  | 'disputed';

export interface NewsArticle {
  articleId: string;
  tenantId: string;
  headline: string;
  title?: string; // alias for headline
  subheadline?: string;
  slug: string;
  leadParagraph: string;
  bodyContent: string;
  content?: string; // alias for bodyContent
  summary?: string;
  synopsis?: string; // alias for summary
  byline: string;
  authorId: string; // Reporter userId or personId
  authorUserId?: string; // alias for authorId
  authorType: 'staff' | 'freelance' | 'syndicated';
  reporterType?: 'staff' | 'freelance' | 'syndicated' | string;
  category: string;
  subcategory?: string;
  deskId?: string;
  beat?: string;
  freelanceDeclaration?: boolean;
  location?: string;
  district?: string;
  state?: string;
  eventDateTime?: string;
  sourceType?: string;
  tags: string[];
  coverImageUrl?: string;
  coverImageCaption?: string;
  heroImageUrl?: string;
  imageUrl?: string; // alias for coverImageUrl/heroImageUrl
  hasPhotography?: boolean;
  imageCaption?: string;
  isBreaking?: boolean;
  
  // Phase 2 Originality & Submission Architecture
  reporterDeclaration?: ReporterDeclaration;
  originalityStatus?: OriginalityStatus;
  originalityVerdict: ArticleOriginalityVerdict;
  originalityScorePercent?: number;
  originalityScore?: number; // alias for originalityScorePercent
  contentFingerprint?: string;
  submissionId?: string;
  firstRecordedSubmissionId?: string;
  eventGroupId?: string;
  evidenceReferences?: string[];
  clientCapturedAt?: string;
  serverSubmittedAt?: string; // Authoritative server timestamp

  // Editorial Lifecycle
  editorialStatus: ArticleEditorialStatus;
  wordCount: number;
  assignedEditorId?: string;
  reviewNotes?: string;
  targetEditionId?: string;
  printPageSection?: string;
  
  // Marketplace Readiness Gate
  isMarketplaceListed: boolean;
  isMarketplaceEligible: boolean;
  isMarketplaceSyndicated?: boolean;
  marketplaceIneligibilityReason?: string;
  askingPriceCents?: number;

  // Phase 6/8/9 Fact Integrity
  factIntegrity?: {
    status: string;
    hasUnresolvedDiscrepancy?: boolean;
    confidenceScore?: number;
    discrepancySummary?: string;
    verifiedFactsCount?: number;
    unverifiedFactsCount?: number;
  };

  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EditorialReviewItem {
  reviewId: string;
  tenantId: string;
  articleId: string;
  submissionId?: string;
  headline: string;
  authorName: string;
  authorId?: string;
  submissionDate: string;
  serverSubmittedAt?: string;
  priority: 'urgent' | 'high' | 'standard' | 'routine';
  status: ArticleEditorialStatus;
  originalityStatus?: OriginalityStatus;
  urgencyDeadline?: string;
  desk: string;
  wordCount: number;
  evidenceCount?: number;
  similarityScore?: number;
  eventGroupId?: string;
}
