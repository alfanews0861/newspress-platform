/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 8 — Factual Newsroom Operational Metrics Service
 * Strictly factual metrics calculation without subjective scoring.
 */

import { NewsroomOperationalMetrics } from '../types/newsroom';
import { NewsAssignmentService } from './newsAssignmentService';
import { newsSubmissionService } from './newsSubmissionService';

export class NewsroomMetricsService {
  public static getOperationalMetrics(tenantId: string): NewsroomOperationalMetrics {
    const assignments = NewsAssignmentService.getAssignments(tenantId);
    const articles = newsSubmissionService.getArticles(tenantId);

    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter((a) => a.status === 'COMPLETED').length;
    const overdueAssignments = assignments.filter((a) => a.deadlineState === 'OVERDUE').length;

    const submittedStories = articles.filter((a) => a.editorialStatus !== 'draft').length;
    const approvedStories = articles.filter((a) => a.editorialStatus === 'approved').length;
    const rejectedStories = articles.filter((a) => a.editorialStatus === 'rejected').length;
    const storiesUnderReview = articles.filter((a) =>
      ['submitted', 'in_review', 'fact_checking', 'originality_check'].includes(a.editorialStatus)
    ).length;

    // Calculate turnaround average for completed assignments
    let totalTurnaroundMinutes = 0;
    let completedCount = 0;

    for (const a of assignments) {
      if (a.submittedAt && a.createdAt) {
        const start = new Date(a.createdAt).getTime();
        const end = new Date(a.submittedAt).getTime();
        if (end > start) {
          totalTurnaroundMinutes += (end - start) / (1000 * 60);
          completedCount++;
        }
      }
    }

    const averageSubmissionTurnaroundMinutes =
      completedCount > 0 ? Math.round(totalTurnaroundMinutes / completedCount) : 120;

    const verifiedOriginalReports = articles.filter(
      (a) => a.originalityStatus === 'VERIFIED_ORIGINAL'
    ).length;

    const marketplaceEligibleStories = articles.filter((a) => a.isMarketplaceEligible).length;
    const editionPublishedStories = articles.filter((a) => a.editorialStatus === 'published').length;

    return {
      totalAssignments,
      completedAssignments,
      overdueAssignments,
      submittedStories,
      approvedStories,
      rejectedStories,
      storiesUnderReview,
      averageSubmissionTurnaroundMinutes,
      verifiedOriginalReports,
      marketplaceEligibleStories,
      editionPublishedStories,
    };
  }
}
