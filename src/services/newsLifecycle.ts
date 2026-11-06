/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress News Lifecycle & Marketplace Eligibility State Machine
 * Phase 2 — News Submission & Reporter Originality Engine
 * 
 * Strict lifecycle:
 * draft -> submitted -> originality_check -> editorial_review -> approved / rejected -> published -> marketplace_listed
 * 
 * Prevents arbitrary status manipulation from client and enforces marketplace eligibility gates.
 */

import { ArticleEditorialStatus, NewsArticle } from '../types/news';
import { OriginalityAssessment, OriginalityStatus } from '../types/originality';

// Allowed state transitions mapped by current state
const ALLOWED_TRANSITIONS: Record<ArticleEditorialStatus, ArticleEditorialStatus[]> = {
  draft: ['submitted', 'archived'],
  submitted: ['originality_check', 'draft'],
  originality_check: ['editorial_review', 'rejected'],
  editorial_review: ['in_review', 'fact_checking', 'revision_requested', 'approved', 'rejected'],
  in_review: ['fact_checking', 'revision_requested', 'approved', 'rejected', 'editorial_review'],
  fact_checking: ['revision_requested', 'approved', 'rejected', 'in_review'],
  revision_requested: ['submitted', 'in_review', 'draft', 'rejected'],
  approved: ['scheduled', 'published', 'marketplace_listed', 'rejected'],
  scheduled: ['published', 'approved'],
  published: ['marketplace_listed', 'archived'],
  rejected: ['draft', 'archived'],
  marketplace_listed: ['published', 'archived'],
  archived: ['draft']
};

/**
 * Validates whether a state transition is legal and whether the role is authorized.
 */
export function validateStatusTransition(
  current: ArticleEditorialStatus,
  target: ArticleEditorialStatus,
  userRole: { isReporter: boolean; isEditor: boolean; isAdmin: boolean }
): { allowed: boolean; error?: string } {
  if (current === target) {
    return { allowed: true };
  }

  // Check state machine graph
  const validNextStates = ALLOWED_TRANSITIONS[current] || [];
  if (!validNextStates.includes(target)) {
    return {
      allowed: false,
      error: `Illegal state transition from "${current}" to "${target}". Permitted transitions: ${validNextStates.join(', ')}`
    };
  }

  // Reporter role can ONLY submit drafts or return rejected stories to draft, or submit revision
  if (userRole.isReporter && !userRole.isEditor && !userRole.isAdmin) {
    const reporterAllowedTransitions: Array<[ArticleEditorialStatus, ArticleEditorialStatus]> = [
      ['draft', 'submitted'],
      ['rejected', 'draft'],
      ['revision_requested', 'submitted']
    ];

    const isAuthorized = reporterAllowedTransitions.some(
      ([from, to]) => from === current && to === target
    );

    if (!isAuthorized) {
      return {
        allowed: false,
        error: `Reporters cannot transition story from "${current}" to "${target}". Editorial authorization required.`
      };
    }
  }

  // Only editors and admins can approve or reject
  if ((target === 'approved' || target === 'rejected') && !userRole.isEditor && !userRole.isAdmin) {
    return {
      allowed: false,
      error: `Approval and rejection actions require an authorized editorial role.`
    };
  }

  return { allowed: true };
}

/**
 * Validates whether a NewsArticle meets all domain constraints to enter the News Marketplace.
 * 
 * Critical Requirements:
 * - A submitted article must not immediately become marketplace-ready.
 * - Editorial approval is required.
 * - A story with DRAFT, SUBMITTED, POSSIBLE_DUPLICATE, DUPLICATE_CONFIRMED, or DISPUTED must NOT automatically become marketplace-listed.
 */
export function canArticleEnterMarketplace(
  article: Partial<NewsArticle>,
  assessment?: Partial<OriginalityAssessment>
): { eligible: boolean; reason?: string } {
  // 1. Must be Approved or Published
  if (article.editorialStatus !== 'approved' && article.editorialStatus !== 'published') {
    return {
      eligible: false,
      reason: `Article must have editorial approval (current status: ${article.editorialStatus || 'unknown'}).`
    };
  }

  // 2. Check Originality Status
  const originalityStatus = assessment?.status || article.originalityStatus;

  if (!originalityStatus) {
    return {
      eligible: false,
      reason: 'Originality assessment has not been evaluated.'
    };
  }

  const blockedStatuses: OriginalityStatus[] = [
    'UNVERIFIED',
    'POSSIBLE_DUPLICATE',
    'DUPLICATE_CONFIRMED',
    'DISPUTED'
  ];

  if (blockedStatuses.includes(originalityStatus)) {
    return {
      eligible: false,
      reason: `Stories with originality status "${originalityStatus}" are barred from marketplace syndication.`
    };
  }

  // 3. Permitted originality statuses:
  const allowedStatuses: OriginalityStatus[] = [
    'VERIFIED_ORIGINAL',
    'ORIGINAL_FIELD_REPORT',
    'INDEPENDENT_REPORT',
    'FIRST_RECORDED_SUBMISSION'
  ];

  if (!allowedStatuses.includes(originalityStatus)) {
    return {
      eligible: false,
      reason: `Originality status "${originalityStatus}" does not meet syndication standards.`
    };
  }

  return { eligible: true };
}
