/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress News Submission & Originality Engine Service
 * Phase 2 — Comprehensive Implementation
 * 
 * Core Architectural Guarantees:
 * - Server timestamp is authoritative (client clock is never trusted for official submission ordering)
 * - Immutable news submission records
 * - Technical content fingerprinting and similarity detection
 * - Real-world event grouping (distinguishes independent co-coverage from plagiarism)
 * - Multi-factor originality evaluation (evidence, metadata, timing, declaration)
 * - Breaking Story Lock workflow
 * - Full audit trail integration
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { isFirebaseConfigured } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';
import { sanitizeFirestore } from '../utils/sanitizeFirestore';
import { NewsArticle, EditorialReviewItem } from '../types/news';
import {
  EventGroup,
  NewsSubmission,
  OriginalityAssessment,
  OriginalityStatus,
  ReporterDeclaration,
  ReporterEvidence,
  SimilarityMatch
} from '../types/originality';
import { ReporterProfile } from '../types/reporter';
import {
  generateContentFingerprint,
  generateMediaFingerprint
} from './contentFingerprintService';
import { originalityDetector, ArticleComparisonTarget } from './originalityDetectionService';
import { originalityEvaluator } from './originalityEvaluationService';
import { eventGroupService } from './eventGroupService';
import { auditService } from './auditService';
import { canArticleEnterMarketplace, validateStatusTransition } from './newsLifecycle';
import { MOCK_NEWS_ARTICLES, MOCK_REPORTER_PROFILES } from './mockDataService';

// Local storage stores for offline / development / reactive UI sync
const memoryArticles: Map<string, NewsArticle> = new Map();
const memorySubmissions: Map<string, NewsSubmission> = new Map();
const memoryEvidence: Map<string, ReporterEvidence> = new Map();
const memoryAssessments: Map<string, OriginalityAssessment> = new Map();
const memoryEventGroups: Map<string, EventGroup> = new Map();
const memoryReporters: Map<string, ReporterProfile> = new Map();

// Initialize memory store with Phase 1 mock seed data to ensure zero regressions
function initMemoryStore() {
  if (memoryArticles.size === 0) {
    for (const art of MOCK_NEWS_ARTICLES) {
      const enhanced: NewsArticle = {
        ...art,
        summary: art.leadParagraph,
        originalityStatus: 'VERIFIED_ORIGINAL',
        isMarketplaceEligible: art.editorialStatus === 'approved',
        contentFingerprint: generateContentFingerprint(art.headline, art.bodyContent),
        serverSubmittedAt: art.createdAt,
        evidenceReferences: []
      };
      memoryArticles.set(art.articleId, enhanced);
    }
  }

  if (memoryReporters.size === 0) {
    for (const rep of MOCK_REPORTER_PROFILES) {
      const enhanced: ReporterProfile = {
        ...rep,
        originalFieldReports: rep.articlesPublishedCount > 50 ? 42 : 12,
        verifiedOriginalReports: rep.articlesPublishedCount > 50 ? 38 : 10,
        independentReports: 8,
        duplicateReports: 1,
        confirmedDuplicates: 0,
        disputedReports: 0,
        corrections: 1,
        marketplaceSales: rep.marketplaceListingsCount
      };
      memoryReporters.set(rep.userId, enhanced);
      memoryReporters.set(rep.reporterId, enhanced);
    }
  }

  // Pre-seed an Event Group demonstration
  if (memoryEventGroups.size === 0) {
    const demoEvent: EventGroup = {
      eventId: 'evt-transit-modernization',
      tenantId: 'tenant-metro-chronicle',
      title: 'Metro Subway Modernization Overhaul Testing',
      summary: 'Multi-artery signaling tests and track automation upgrades',
      category: 'Metro & Transit',
      district: 'Manhattan & Queens',
      state: 'New York',
      location: '14 Key Transit Arteries',
      firstReportedAt: '2026-10-03T05:30:00.000Z',
      firstSubmissionId: 'sub-art-001',
      firstReporterId: 'user-sofia-chen',
      firstReporterName: 'Sofia Chen',
      reportCount: 1,
      submissionIds: ['sub-art-001'],
      articleIds: ['art-001'],
      isBreakingStoryLocked: false,
      status: 'active',
      createdAt: '2026-10-03T05:30:00.000Z',
      updatedAt: '2026-10-03T05:30:00.000Z'
    };
    memoryEventGroups.set(demoEvent.eventId, demoEvent);
  }
}
initMemoryStore();

export interface DraftStoryInput {
  tenantId: string;
  authorId: string;
  byline: string;
  authorType?: 'staff' | 'freelance' | 'syndicated';
  headline: string;
  subheadline?: string;
  summary?: string;
  leadParagraph: string;
  bodyContent: string;
  category: string;
  subcategory?: string;
  location?: string;
  district?: string;
  state?: string;
  eventDateTime?: string;
  sourceType?: string;
  reporterDeclaration?: ReporterDeclaration;
  tags?: string[];
  clientCapturedAt?: string;
}

export interface SubmitNewsInput {
  articleId: string;
  reporterId: string;
  declaration: ReporterDeclaration;
  clientCapturedAt?: string;
  evidenceItems?: Omit<ReporterEvidence, 'evidenceId' | 'newsId' | 'submissionId' | 'reporterId' | 'tenantId' | 'uploadedAt'>[];
}

export interface EditorialReviewAction {
  articleId: string;
  editorId: string;
  editorName: string;
  newStatus?: OriginalityStatus;
  notes?: string;
  eventGroupId?: string;
  decision:
    | 'verify_original'
    | 'mark_independent'
    | 'mark_secondary'
    | 'mark_possible_duplicate'
    | 'confirm_duplicate'
    | 'dispute'
    | 'request_evidence'
    | 'approve_publication'
    | 'reject';
}

export class NewsSubmissionService {
  /**
   * Creates a new story draft.
   */
  async createDraft(input: DraftStoryInput): Promise<NewsArticle> {
    const articleId = `art_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const fingerprint = generateContentFingerprint(input.headline, input.bodyContent);

    const article: NewsArticle = {
      articleId,
      tenantId: input.tenantId,
      headline: input.headline,
      subheadline: input.subheadline || '',
      slug: input.headline.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      summary: input.summary || input.leadParagraph,
      leadParagraph: input.leadParagraph,
      bodyContent: input.bodyContent,
      byline: input.byline,
      authorId: input.authorId,
      authorType: input.authorType || 'staff',
      category: input.category,
      subcategory: input.subcategory || '',
      location: input.location || '',
      district: input.district || '',
      state: input.state || '',
      eventDateTime: input.eventDateTime || now,
      sourceType: input.sourceType || 'field_reporting',
      tags: input.tags || [input.category],
      reporterDeclaration: input.reporterDeclaration || 'original_field_report',
      editorialStatus: 'draft',
      originalityVerdict: 'pending',
      originalityStatus: 'UNVERIFIED',
      contentFingerprint: fingerprint,
      wordCount: (input.bodyContent || input.leadParagraph).trim().split(/\s+/).filter(Boolean).length,
      isMarketplaceListed: false,
      isMarketplaceEligible: false,
      clientCapturedAt: input.clientCapturedAt || '',
      createdAt: now,
      updatedAt: now
    };

    memoryArticles.set(articleId, article);

    if (isFirebaseConfigured && db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'news', articleId), sanitizeFirestore(article));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `news/${articleId}`);
      }
    }

    await auditService.log({
      tenantId: input.tenantId,
      actorId: input.authorId,
      actorName: input.byline,
      actorRole: 'reporter',
      action: 'SAVE_DRAFT',
      entityType: 'NewsArticle',
      entityId: articleId,
      newState: article
    });

    return article;
  }

  /**
   * Updates an existing story draft.
   */
  async updateDraft(articleId: string, updates: Partial<DraftStoryInput>): Promise<NewsArticle> {
    const existing = memoryArticles.get(articleId);
    if (!existing) {
      throw new Error(`Article with id ${articleId} not found.`);
    }

    if (
      existing.editorialStatus !== 'draft' &&
      existing.editorialStatus !== 'rejected' &&
      existing.editorialStatus !== 'revision_requested'
    ) {
      throw new Error(`Cannot modify article once submitted to editorial desk.`);
    }

    const now = new Date().toISOString();
    const updatedHeadline = updates.headline ?? existing.headline;
    const updatedBody = updates.bodyContent ?? existing.bodyContent;
    const fingerprint = generateContentFingerprint(updatedHeadline, updatedBody);

    const updated: NewsArticle = {
      ...existing,
      ...updates,
      headline: updatedHeadline,
      bodyContent: updatedBody,
      summary: updates.summary ?? existing.summary,
      leadParagraph: updates.leadParagraph ?? existing.leadParagraph,
      contentFingerprint: fingerprint,
      wordCount: (updatedBody || existing.leadParagraph).trim().split(/\s+/).filter(Boolean).length,
      updatedAt: now
    };

    memoryArticles.set(articleId, updated);

    if (isFirebaseConfigured && db && auth?.currentUser) {
      try {
        await updateDoc(doc(db, 'news', articleId), sanitizeFirestore({
          ...updates,
          contentFingerprint: fingerprint,
          wordCount: updated.wordCount,
          updatedAt: now
        }));
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `news/${articleId}`);
      }
    }

    return updated;
  }

  /**
   * Checks similarity in real-time before or during submission.
   */
  checkSimilarity(candidate: {
    headline: string;
    bodyContent: string;
    location?: string;
    district?: string;
    state?: string;
    currentArticleId?: string;
  }): SimilarityMatch[] {
    const existingTargets: ArticleComparisonTarget[] = [];

    for (const art of memoryArticles.values()) {
      if (candidate.currentArticleId && art.articleId === candidate.currentArticleId) continue;
      if (art.editorialStatus === 'draft') continue;

      existingTargets.push({
        articleId: art.articleId,
        submissionId: art.submissionId,
        headline: art.headline,
        bodyContent: art.bodyContent,
        byline: art.byline,
        tenantId: art.tenantId,
        submittedAt: art.serverSubmittedAt || art.createdAt,
        location: art.location,
        district: art.district,
        state: art.state
      });
    }

    return originalityDetector.compareAgainstExistingNews(candidate, existingTargets);
  }

  /**
   * Submits a news story to the editorial desk.
   * Authoritative server timestamp is generated here!
   */
  async submitNews(input: SubmitNewsInput): Promise<{
    article: NewsArticle;
    submission: NewsSubmission;
    assessment: OriginalityAssessment;
    warning?: string;
  }> {
    const existing = memoryArticles.get(input.articleId);
    if (!existing) {
      throw new Error(`Article with id ${input.articleId} not found.`);
    }

    // Status transition validation
    const transitionCheck = validateStatusTransition(existing.editorialStatus, 'submitted', {
      isReporter: true,
      isEditor: false,
      isAdmin: false
    });
    if (!transitionCheck.allowed) {
      throw new Error(transitionCheck.error);
    }

    // Authoritative Server Timestamp (never trust client clock)
    const serverSubmittedAt = new Date().toISOString();
    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Process Attached Evidence
    const evidenceIds: string[] = [];
    const createdEvidenceList: ReporterEvidence[] = [];
    const mediaFingerprints: string[] = [];

    if (input.evidenceItems && input.evidenceItems.length > 0) {
      for (const item of input.evidenceItems) {
        const evId = `evi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const mediaFp = generateMediaFingerprint(item.fileUrl || item.originalFilename || item.title);
        mediaFingerprints.push(mediaFp);

        const ev: ReporterEvidence = {
          ...item,
          evidenceId: evId,
          newsId: input.articleId,
          submissionId,
          reporterId: input.reporterId,
          tenantId: existing.tenantId,
          uploadedAt: serverSubmittedAt,
          fileHash: item.fileHash || mediaFp,
          visibility: item.visibility || 'editorial_only'
        };

        memoryEvidence.set(evId, ev);
        createdEvidenceList.push(ev);
        evidenceIds.push(evId);

        if (isFirebaseConfigured && db && auth?.currentUser) {
          try {
            await setDoc(doc(db, 'newsEvidence', evId), sanitizeFirestore(ev));
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `newsEvidence/${evId}`);
          }
        }
      }
    }

    // 2. Similarity and Duplicate Detection
    const similarityMatches = this.checkSimilarity({
      headline: existing.headline,
      bodyContent: existing.bodyContent,
      location: existing.location,
      district: existing.district,
      state: existing.state,
      currentArticleId: existing.articleId
    });

    // 3. Event Group Matching or Creation
    let assignedEventGroup = eventGroupService.findPotentialEventGroup(
      {
        location: existing.location,
        district: existing.district,
        category: existing.category,
        headline: existing.headline
      },
      Array.from(memoryEventGroups.values())
    );

    let isFirstRecorded = false;
    let isBreakingStoryActive = false;

    if (!assignedEventGroup) {
      assignedEventGroup = eventGroupService.createEventGroup({
        tenantId: existing.tenantId,
        title: existing.headline,
        summary: existing.leadParagraph,
        category: existing.category,
        district: existing.district || 'Unassigned District',
        state: existing.state || 'National',
        location: existing.location || 'Local Desk',
        firstReportedAt: serverSubmittedAt,
        firstSubmissionId: submissionId,
        firstReporterId: input.reporterId,
        firstReporterName: existing.byline,
        initialArticleId: existing.articleId
      });
      memoryEventGroups.set(assignedEventGroup.eventId, assignedEventGroup);
      isFirstRecorded = true;
    } else {
      assignedEventGroup = eventGroupService.addReportToEventGroup(
        assignedEventGroup,
        submissionId,
        existing.articleId
      );
      memoryEventGroups.set(assignedEventGroup.eventId, assignedEventGroup);
      isBreakingStoryActive = assignedEventGroup.isBreakingStoryLocked;
    }

    // 4. Multi-Factor Originality Evaluation
    const assessment = originalityEvaluator.evaluate({
      newsId: existing.articleId,
      submissionId,
      tenantId: existing.tenantId,
      declaration: input.declaration,
      serverSubmittedAt,
      clientCapturedAt: input.clientCapturedAt,
      evidenceItems: createdEvidenceList,
      similarityMatches,
      isEarliestInEventGroup: isFirstRecorded,
      isBreakingStoryActive
    });
    memoryAssessments.set(assessment.assessmentId, assessment);

    // 5. Create Immutable NewsSubmission Record
    const submission: NewsSubmission = {
      submissionId,
      newsId: existing.articleId,
      reporterId: input.reporterId,
      tenantId: existing.tenantId,
      clientCapturedAt: input.clientCapturedAt,
      serverSubmittedAt,
      declaration: input.declaration,
      evidenceReferences: evidenceIds,
      contentFingerprint: existing.contentFingerprint || generateContentFingerprint(existing.headline, existing.bodyContent),
      mediaFingerprints,
      originalityStatus: assessment.status,
      eventGroupId: assignedEventGroup.eventId,
      isFirstRecordedSubmission: isFirstRecorded,
      version: 1
    };
    memorySubmissions.set(submissionId, submission);

    // 6. Update NewsArticle Record
    const updatedArticle: NewsArticle = {
      ...existing,
      editorialStatus: 'submitted',
      originalityStatus: assessment.status,
      submissionId,
      firstRecordedSubmissionId: isFirstRecorded ? submissionId : existing.firstRecordedSubmissionId,
      eventGroupId: assignedEventGroup.eventId,
      evidenceReferences: evidenceIds,
      clientCapturedAt: input.clientCapturedAt,
      serverSubmittedAt,
      originalityScorePercent: assessment.confidenceScore,
      reporterDeclaration: input.declaration,
      updatedAt: serverSubmittedAt
    };
    memoryArticles.set(existing.articleId, updatedArticle);

    // 7. Update Reporter Profile Factual Metrics
    const reporter = memoryReporters.get(input.reporterId);
    if (reporter) {
      const updatedReporter: ReporterProfile = {
        ...reporter,
        originalFieldReports: (input as any)['declaration'] === 'original_field_report' ? reporter.originalFieldReports + 1 : reporter.originalFieldReports,
        independentReports: (input as any)['declaration'] === 'independently_reported' ? reporter.independentReports + 1 : reporter.independentReports,
        duplicateReports: assessment.status === 'POSSIBLE_DUPLICATE' || assessment.status === 'DUPLICATE_CONFIRMED' ? reporter.duplicateReports + 1 : reporter.duplicateReports,
        updatedAt: serverSubmittedAt
      };
      memoryReporters.set(input.reporterId, updatedReporter);
    }

    // 8. Firestore Persistence with sanitization
    if (isFirebaseConfigured && db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'newsSubmissions', submissionId), sanitizeFirestore({
          ...submission,
          serverTimestamp: serverTimestamp()
        }));
        await setDoc(doc(db, 'originalityAssessments', assessment.assessmentId), sanitizeFirestore(assessment));
        await setDoc(doc(db, 'newsEvents', assignedEventGroup.eventId), sanitizeFirestore(assignedEventGroup));
        await updateDoc(doc(db, 'news', existing.articleId), sanitizeFirestore({
          editorialStatus: 'submitted',
          originalityStatus: assessment.status,
          submissionId,
          eventGroupId: assignedEventGroup.eventId,
          serverSubmittedAt,
          updatedAt: serverSubmittedAt
        }));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `newsSubmissions/${submissionId}`);
      }
    }

    // 9. Audit Logging
    await auditService.log({
      tenantId: existing.tenantId,
      actorId: input.reporterId,
      actorName: existing.byline,
      actorRole: 'reporter',
      action: 'SUBMIT',
      entityType: 'NewsSubmission',
      entityId: submissionId,
      newState: submission,
      metadata: {
        originalityStatus: assessment.status,
        eventGroupId: assignedEventGroup.eventId,
        isFirstRecorded
      }
    });

    let warning: string | undefined;
    if (similarityMatches.length > 0 && similarityMatches[0].overallSimilarityPercent >= 60) {
      const topMatch = similarityMatches[0];
      warning = `Possible duplicate detected: ${topMatch.overallSimilarityPercent}% match with "${topMatch.targetHeadline}" filed by ${topMatch.targetByline}. It has been flagged for editorial triage.`;
    }

    return {
      article: updatedArticle,
      submission,
      assessment,
      warning
    };
  }

  /**
   * High-level submission helper for mobile operations & field workflows.
   */
  async submitArticle(input: {
    tenantId: string;
    reporterId: string;
    headline: string;
    subheadline?: string;
    body: string;
    category?: string;
    location?: string;
    eventDateTime?: string;
    reporterNotes?: string;
    sourceNotes?: string;
    evidenceReferences?: string[];
    declaration?: any;
  }): Promise<{ article: NewsArticle; submissionId: string; originalityStatus: OriginalityStatus }> {
    // 1. Create draft article
    const draft = await this.createDraft({
      tenantId: input.tenantId,
      authorId: input.reporterId,
      byline: input.reporterId === 'rep_sofia_chen' ? 'Sofia Chen' : 'Field Correspondent',
      headline: input.headline,
      subheadline: input.subheadline,
      leadParagraph: input.headline,
      bodyContent: input.body,
      category: input.category || 'General',
      location: input.location,
      eventDateTime: input.eventDateTime,
      sourceType: 'field_reporting',
    });

    // 2. Submit news
    const res = await this.submitNews({
      articleId: draft.articleId,
      reporterId: input.reporterId,
      declaration: 'original_field_report',
    });

    return {
      article: res.article,
      submissionId: res.submission.submissionId,
      originalityStatus: res.assessment.status,
    };
  }

  /**
   * Editorial verification and action dispatch.
   */
  async editorialAction(action: EditorialReviewAction): Promise<{
    article: NewsArticle;
    assessment: OriginalityAssessment;
  }> {
    const article = memoryArticles.get(action.articleId);
    if (!article) {
      throw new Error(`Article ${action.articleId} not found.`);
    }

    let assessment = Array.from(memoryAssessments.values()).find(a => a.newsId === action.articleId);
    if (!assessment) {
      assessment = originalityEvaluator.evaluate({
        newsId: article.articleId,
        submissionId: article.submissionId || 'sub_init',
        tenantId: article.tenantId,
        declaration: article.reporterDeclaration || 'original_field_report',
        serverSubmittedAt: article.serverSubmittedAt || article.createdAt,
        evidenceItems: this.getEvidenceForArticle(article.articleId),
        similarityMatches: [],
        isEarliestInEventGroup: true,
        isBreakingStoryActive: false
      });
    }

    const now = new Date().toISOString();
    let updatedStatus: OriginalityStatus = assessment.status;
    let targetEditorialStatus: NewsArticle['editorialStatus'] = article.editorialStatus;
    let auditAction: import('../types/audit').AuditAction = 'STATUS_CHANGE';

    switch (action.decision) {
      case 'verify_original':
        updatedStatus = 'VERIFIED_ORIGINAL';
        auditAction = 'VERIFY_ORIGINAL';
        break;
      case 'mark_independent':
        updatedStatus = 'INDEPENDENT_REPORT';
        auditAction = 'MARK_INDEPENDENT';
        break;
      case 'mark_secondary':
        updatedStatus = 'SECONDARY_REPORT';
        auditAction = 'MARK_SECONDARY';
        break;
      case 'mark_possible_duplicate':
        updatedStatus = 'POSSIBLE_DUPLICATE';
        auditAction = 'MARK_POSSIBLE_DUPLICATE';
        break;
      case 'confirm_duplicate':
        updatedStatus = 'DUPLICATE_CONFIRMED';
        targetEditorialStatus = 'rejected';
        auditAction = 'CONFIRM_DUPLICATE';
        break;
      case 'dispute':
        updatedStatus = 'DISPUTED';
        auditAction = 'DISPUTE_ORIGINALITY';
        break;
      case 'request_evidence':
        auditAction = 'REQUEST_MORE_EVIDENCE';
        break;
      case 'approve_publication':
        targetEditorialStatus = 'approved';
        auditAction = 'APPROVE_PUBLICATION';
        break;
      case 'reject':
        targetEditorialStatus = 'rejected';
        auditAction = 'REJECT';
        break;
    }

    // Update Assessment
    const updatedAssessment: OriginalityAssessment = {
      ...assessment,
      status: updatedStatus,
      verificationStatus: action.decision === 'dispute' ? 'disputed' : 'verified_by_editor',
      reviewedBy: action.editorId,
      reviewedByName: action.editorName,
      reviewedAt: now,
      editorialNotes: action.notes || assessment.editorialNotes,
      updatedAt: now
    };
    memoryAssessments.set(updatedAssessment.assessmentId, updatedAssessment);

    // Check Marketplace Eligibility
    const marketplaceCheck = canArticleEnterMarketplace(
      { ...article, editorialStatus: targetEditorialStatus, originalityStatus: updatedStatus },
      updatedAssessment
    );

    // Update Article
    const updatedArticle: NewsArticle = {
      ...article,
      editorialStatus: targetEditorialStatus,
      originalityStatus: updatedStatus,
      originalityVerdict: updatedStatus === 'VERIFIED_ORIGINAL' ? 'verified_original' : article.originalityVerdict,
      isMarketplaceEligible: marketplaceCheck.eligible,
      marketplaceIneligibilityReason: marketplaceCheck.reason,
      reviewNotes: action.notes || article.reviewNotes,
      assignedEditorId: action.editorId,
      updatedAt: now
    };
    memoryArticles.set(article.articleId, updatedArticle);

    // Update Reporter Factual Metrics
    const reporter = memoryReporters.get(article.authorId);
    if (reporter) {
      const updatedReporter: ReporterProfile = {
        ...reporter,
        verifiedOriginalReports: updatedStatus === 'VERIFIED_ORIGINAL' ? reporter.verifiedOriginalReports + 1 : reporter.verifiedOriginalReports,
        confirmedDuplicates: updatedStatus === 'DUPLICATE_CONFIRMED' ? reporter.confirmedDuplicates + 1 : reporter.confirmedDuplicates,
        disputedReports: updatedStatus === 'DISPUTED' ? reporter.disputedReports + 1 : reporter.disputedReports,
        updatedAt: now
      };
      memoryReporters.set(article.authorId, updatedReporter);
    }

    // Firestore Sync with sanitization
    if (isFirebaseConfigured && db && auth?.currentUser) {
      try {
        await updateDoc(doc(db, 'news', article.articleId), sanitizeFirestore({
          editorialStatus: targetEditorialStatus,
          originalityStatus: updatedStatus,
          isMarketplaceEligible: marketplaceCheck.eligible,
          marketplaceIneligibilityReason: marketplaceCheck.reason || null,
          assignedEditorId: action.editorId,
          reviewNotes: action.notes || null,
          updatedAt: now
        }));
        await setDoc(doc(db, 'originalityAssessments', updatedAssessment.assessmentId), sanitizeFirestore(updatedAssessment));
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `news/${article.articleId}`);
      }
    }

    // Audit Logging
    await auditService.log({
      tenantId: article.tenantId,
      actorId: action.editorId,
      actorName: action.editorName,
      actorRole: 'editor',
      action: auditAction,
      entityType: 'NewsArticle',
      entityId: article.articleId,
      previousState: { editorialStatus: article.editorialStatus, originalityStatus: article.originalityStatus },
      newState: { editorialStatus: targetEditorialStatus, originalityStatus: updatedStatus },
      reason: action.notes
    });

    return {
      article: updatedArticle,
      assessment: updatedAssessment
    };
  }

  /**
   * Toggles the Breaking Story Lock for an Event Group.
   */
  async toggleBreakingLock(
    eventId: string,
    isLocked: boolean,
    editorId: string,
    editorName: string,
    reason?: string
  ): Promise<EventGroup> {
    const group = memoryEventGroups.get(eventId);
    if (!group) throw new Error(`Event group ${eventId} not found`);

    const updated = eventGroupService.toggleBreakingStoryLock(group, isLocked, editorId, reason);
    memoryEventGroups.set(eventId, updated);

    if (isFirebaseConfigured && db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'newsEvents', eventId), sanitizeFirestore(updated));
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `newsEvents/${eventId}`);
      }
    }

    await auditService.log({
      tenantId: group.tenantId,
      actorId: editorId,
      actorName: editorName,
      actorRole: 'editor',
      action: isLocked ? 'BREAKING_LOCK_ENGAGED' : 'BREAKING_LOCK_RELEASED',
      entityType: 'EventGroup',
      entityId: eventId,
      reason: reason || ''
    });

    return updated;
  }

  // --- Read Methods ---

  getArticles(tenantId?: string): NewsArticle[] {
    const all = Array.from(memoryArticles.values());
    if (tenantId) {
      return all.filter(a => a.tenantId === tenantId);
    }
    return all;
  }

  getArticle(articleId: string): NewsArticle | undefined {
    return memoryArticles.get(articleId);
  }

  getAssessmentForArticle(articleId: string): OriginalityAssessment | undefined {
    return Array.from(memoryAssessments.values()).find(a => a.newsId === articleId);
  }

  getEvidenceForArticle(articleId: string): ReporterEvidence[] {
    return Array.from(memoryEvidence.values()).filter(e => e.newsId === articleId);
  }

  getEventGroups(tenantId?: string): EventGroup[] {
    const all = Array.from(memoryEventGroups.values());
    if (tenantId) {
      return all.filter(g => g.tenantId === tenantId);
    }
    return all;
  }

  getReporterSubmissions(reporterId: string, tenantId?: string): NewsArticle[] {
    return Array.from(memoryArticles.values()).filter(a => {
      const matchesReporter = a.authorId === reporterId;
      const matchesTenant = !tenantId || a.tenantId === tenantId;
      return matchesReporter && matchesTenant;
    });
  }

  getReporterMetrics(reporterId: string): {
    submitted: number;
    approved: number;
    published: number;
    marketplaceEligible: number;
    verifiedOriginal: number;
    independentReports: number;
    possibleDuplicates: number;
    disputedReports: number;
  } {
    const articles = Array.from(memoryArticles.values()).filter(a => a.authorId === reporterId);

    return {
      submitted: articles.filter(a => a.editorialStatus !== 'draft').length,
      approved: articles.filter(a => a.editorialStatus === 'approved').length,
      published: articles.filter(a => a.editorialStatus === 'published').length,
      marketplaceEligible: articles.filter(a => a.isMarketplaceEligible).length,
      verifiedOriginal: articles.filter(a => a.originalityStatus === 'VERIFIED_ORIGINAL').length,
      independentReports: articles.filter(a => a.originalityStatus === 'INDEPENDENT_REPORT').length,
      possibleDuplicates: articles.filter(a => a.originalityStatus === 'POSSIBLE_DUPLICATE').length,
      disputedReports: articles.filter(a => a.originalityStatus === 'DISPUTED').length
    };
  }

  getEditorialQueueItems(tenantId: string): EditorialReviewItem[] {
    const articles = Array.from(memoryArticles.values()).filter(
      a => a.tenantId === tenantId && (a.editorialStatus === 'submitted' || a.editorialStatus === 'in_review' || a.editorialStatus === 'fact_checking')
    );

    return articles.map(a => {
      const assessment = this.getAssessmentForArticle(a.articleId);
      const evidence = this.getEvidenceForArticle(a.articleId);
      return {
        reviewId: `rev_${a.articleId}`,
        tenantId: a.tenantId,
        articleId: a.articleId,
        submissionId: a.submissionId,
        headline: a.headline,
        authorName: a.byline,
        authorId: a.authorId,
        submissionDate: a.serverSubmittedAt || a.createdAt,
        serverSubmittedAt: a.serverSubmittedAt || a.createdAt,
        priority: a.originalityStatus === 'POSSIBLE_DUPLICATE' ? 'urgent' : 'high',
        status: a.editorialStatus,
        originalityStatus: a.originalityStatus,
        desk: a.category,
        wordCount: a.wordCount,
        evidenceCount: evidence.length,
        similarityScore: assessment?.similarityScore || 0,
        eventGroupId: a.eventGroupId
      };
    });
  }

  getAllArticles(tenantId?: string): NewsArticle[] {
    return this.getArticles(tenantId);
  }

  async approveArticle(articleId: string, editorId: string, notes?: string): Promise<NewsArticle> {
    const res = await this.editorialAction({
      articleId,
      editorId,
      editorName: editorId === 'user-news-editor' ? 'News Editor' : 'Editor in Chief',
      decision: 'approve_publication',
      notes: notes || 'Approved for publication'
    });
    return res.article;
  }

  async rejectArticle(articleId: string, editorId: string, notes?: string): Promise<NewsArticle> {
    const res = await this.editorialAction({
      articleId,
      editorId,
      editorName: editorId === 'user-news-editor' ? 'News Editor' : 'Editor in Chief',
      decision: 'reject',
      notes: notes || 'Rejected by editor'
    });
    return res.article;
  }
}

export const newsSubmissionService = new NewsSubmissionService();
