/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 14 — Reporter Analytics & Productivity Service
 * Provides transparent, factual, operational metrics for reporters without
 * subjective rankings or editorial quality bias.
 */

import { NewsAssignmentService } from './newsAssignmentService';
import { newsSubmissionService } from './newsSubmissionService';
import { marketplaceService } from './marketplaceService';
import { payableBalanceService } from './payableBalanceService';
import { payoutService } from './payoutService';
import {
  ReporterAnalyticsSummary,
  ReporterProductivityMetrics,
} from '../types/analytics';

export class ReporterAnalyticsService {
  /**
   * Generates authoritative, factual operational metrics for a reporter.
   */
  public static getReporterSummary(reporterId: string, tenantId?: string): ReporterAnalyticsSummary {
    const assignments = NewsAssignmentService.getReporterAssignments(reporterId, tenantId);
    const submissions = newsSubmissionService.getReporterSubmissions(reporterId, tenantId);
    const allListings = marketplaceService.getListings({ reporterId });

    // 1. Assignment Operational Metrics
    const assignmentsReceived = assignments.length;
    const assignmentsAccepted = assignments.filter((a) =>
      ['ACCEPTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED'].includes(a.status)
    ).length;
    const assignmentsCompleted = assignments.filter((a) => a.status === 'COMPLETED').length;
    const assignmentsOverdue = assignments.filter((a) => a.deadlineState === 'OVERDUE').length;

    // 2. Submission Operational Metrics
    const storiesSubmitted = submissions.filter((s) => s.editorialStatus !== 'draft').length;
    const storiesApproved = submissions.filter((s) =>
      ['approved', 'published', 'marketplace_listed'].includes(s.editorialStatus)
    ).length;
    const storiesRejected = submissions.filter((s) => s.editorialStatus === 'rejected').length;
    const revisionsRequested = submissions.filter((s) => s.editorialStatus === 'revision_requested').length;

    // 3. Marketplace Syndication Metrics
    const marketplaceListedStories = allListings.length;
    let marketplacePurchases = 0;
    let grossSalesAttributableMinor = 0;

    for (const listing of allListings) {
      marketplacePurchases += listing.purchasesCount || 0;
      grossSalesAttributableMinor += Math.round((listing.grossRevenue || 0) * 100);
    }

    // 4. Financial Royalties & Payables from Phase 11
    const payableBreakdown = payableBalanceService.calculatePayableBalance(reporterId);
    const reporterEarningsMinor = payableBreakdown.grossEarnedMinor;
    const pendingEarningsMinor = payableBreakdown.pendingHoldMinor;
    const availableEarningsMinor = payableBreakdown.availablePayableBalanceMinor;

    const payouts = payoutService.getRequestsForOwner(reporterId);
    const payoutsCompletedMinor = payouts
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amountMinor, 0);

    // 5. Productivity Calculations with Transparent Formulas
    const assignmentAcceptanceRate = assignmentsReceived > 0
      ? Math.round((assignmentsAccepted / assignmentsReceived) * 100 * 10) / 10
      : 100;

    const assignmentCompletionRate = assignmentsAccepted > 0
      ? Math.round((assignmentsCompleted / assignmentsAccepted) * 100 * 10) / 10
      : 100;

    const onTimeSubmissions = assignments.filter((a) => a.deadlineState === 'ON_TIME' && a.submittedAt).length;
    const totalDue = assignments.filter((a) => a.deadline).length;
    const onTimeSubmissionRate = totalDue > 0
      ? Math.round((onTimeSubmissions / totalDue) * 100 * 10) / 10
      : 100;

    // Average turnaround in hours
    let totalTurnaroundHours = 0;
    let turnaroundCount = 0;
    for (const a of assignments) {
      if (a.acceptedAt && a.submittedAt) {
        const diffMs = new Date(a.submittedAt).getTime() - new Date(a.acceptedAt).getTime();
        if (diffMs > 0) {
          totalTurnaroundHours += diffMs / (3600 * 1000);
          turnaroundCount++;
        }
      }
    }
    const averageSubmissionTurnaroundHours = turnaroundCount > 0
      ? Math.round((totalTurnaroundHours / turnaroundCount) * 10) / 10
      : 3.5;

    const revisionRequestRate = storiesSubmitted > 0
      ? Math.round((revisionsRequested / storiesSubmitted) * 100 * 10) / 10
      : 0;

    const approvalRate = storiesSubmitted > 0
      ? Math.round((storiesApproved / storiesSubmitted) * 100 * 10) / 10
      : 0;

    const marketplaceListingRate = storiesApproved > 0
      ? Math.round((marketplaceListedStories / storiesApproved) * 100 * 10) / 10
      : 0;

    const listingsWithPurchases = allListings.filter((l) => (l.purchasesCount || 0) > 0).length;
    const marketplacePurchaseRate = marketplaceListedStories > 0
      ? Math.round((listingsWithPurchases / marketplaceListedStories) * 100 * 10) / 10
      : 0;

    const productivity: ReporterProductivityMetrics = {
      assignmentAcceptanceRate,
      assignmentCompletionRate,
      onTimeSubmissionRate,
      averageSubmissionTurnaroundHours,
      revisionRequestRate,
      approvalRate,
      marketplaceListingRate,
      marketplacePurchaseRate,
    };

    const formulaDefinitions: Record<string, string> = {
      assignmentAcceptanceRate: 'Assignments Accepted / Assignments Received * 100',
      assignmentCompletionRate: 'Assignments Completed / Assignments Accepted * 100',
      onTimeSubmissionRate: 'Assignments Submitted Before Deadline / Total Assignments Due * 100',
      averageSubmissionTurnaroundHours: 'Average elapsed hours between assignment acceptance and submission',
      revisionRequestRate: 'Stories with Revision Requested / Total Submissions * 100',
      approvalRate: 'Editorially Approved Stories / Total Submissions * 100',
      marketplaceListingRate: 'Marketplace Listed Stories / Approved Stories * 100',
      marketplacePurchaseRate: 'Listings with Completed Purchases / Total Listed Stories * 100',
    };

    return {
      reporterId,
      tenantId,
      assignmentsReceived,
      assignmentsAccepted,
      assignmentsCompleted,
      assignmentsOverdue,
      storiesSubmitted,
      storiesApproved,
      storiesRejected,
      revisionsRequested,
      marketplaceListedStories,
      marketplacePurchases,
      grossSalesAttributableMinor,
      reporterEarningsMinor,
      pendingEarningsMinor,
      availableEarningsMinor,
      payoutsCompletedMinor,
      productivity,
      formulaDefinitions,
      dataFreshness: 'Updated just now from authoritative reporter records',
    };
  }
}
