/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 14 — Analytics Metric Definition Registry
 * Authoritative registry of standard, versioned metric definitions across all platform operations.
 */

import {
  AnalyticsMetricDefinition,
  MetricCategory,
  AggregationType,
  MetricVisibility,
} from '../types/analytics';

export class AnalyticsMetricRegistry {
  private static metrics: Map<string, AnalyticsMetricDefinition> = new Map();
  private static versionHistory: Map<string, AnalyticsMetricDefinition[]> = new Map();

  static {
    this.seedStandardMetrics();
  }

  public static reset(): void {
    this.metrics.clear();
    this.versionHistory.clear();
    this.seedStandardMetrics();
  }

  /**
   * Seeds all core standardized metrics across NewsPress operational domains.
   */
  public static seedStandardMetrics(): void {
    const now = '2026-10-01T00:00:00.000Z';

    const defaultMetrics: AnalyticsMetricDefinition[] = [
      // Platform KPIs
      {
        metricId: 'plt_active_tenants',
        name: 'Active Tenants',
        description: 'Count of news organizations with active tenant workspaces',
        category: 'platform',
        unit: 'count',
        aggregationType: 'DISTINCT_COUNT',
        source: 'TenantService / TenantStore',
        calculationDefinition: 'COUNT(tenants WHERE status = "active")',
        visibility: 'platform_admin',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        metricId: 'plt_marketplace_gmv',
        name: 'Marketplace Monthly GMV',
        description: 'Gross merchandise value of all marketplace purchases in current month',
        category: 'platform',
        unit: 'inr_minor',
        aggregationType: 'SUM',
        source: 'Phase 11 Financial Ledger',
        calculationDefinition: 'SUM(purchase.grossAmountMinor WHERE status = "COMPLETED" AND date >= month_start)',
        visibility: 'platform_admin',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        metricId: 'plt_platform_revenue',
        name: 'Platform Commission Revenue',
        description: 'Net platform share from transactions in integer minor units',
        category: 'platform',
        unit: 'inr_minor',
        aggregationType: 'SUM',
        source: 'Phase 11 Financial Ledger',
        calculationDefinition: 'SUM(ledger.amountMinor WHERE transactionType = "PLATFORM_FEE" AND direction = "CREDIT")',
        visibility: 'platform_admin',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        metricId: 'plt_reporter_payables',
        name: 'Reporter Payables Outstanding',
        description: 'Total accrued earnings payable to reporters pending disbursement',
        category: 'platform',
        unit: 'inr_minor',
        aggregationType: 'SUM',
        source: 'Phase 11 PayableBalanceService',
        calculationDefinition: 'SUM(reporter.pendingHoldMinor + reporter.availablePayableBalanceMinor)',
        visibility: 'executive',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        metricId: 'plt_editions_produced',
        name: 'Editions Produced',
        description: 'Total newspaper editions finalized and published through press',
        category: 'edition',
        unit: 'count',
        aggregationType: 'COUNT',
        source: 'Phase 9 EditionPlanningService / Phase 10 Production',
        calculationDefinition: 'COUNT(editions WHERE status IN ["FINALIZED", "READY", "PUBLISHED"])',
        visibility: 'executive',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        metricId: 'plt_production_success_rate',
        name: 'Production Success Rate',
        description: 'Percentage of queued press jobs completing without fatal preflight failure',
        category: 'production',
        unit: 'percentage',
        aggregationType: 'RATE',
        source: 'Phase 5/10 ProductionQueueService',
        calculationDefinition: '(Completed Production Jobs / Total Claimed Production Jobs) * 100',
        visibility: 'executive',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        metricId: 'plt_delivery_success_rate',
        name: 'Delivery Success Rate',
        description: 'Percentage of printed copies delivered to circulation points without loss',
        category: 'production',
        unit: 'percentage',
        aggregationType: 'RATE',
        source: 'Phase 10 PrintDistributionService',
        calculationDefinition: '((Total Planned Copies - Wastage Copies) / Total Planned Copies) * 100',
        visibility: 'executive',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },

      // Reporter Productivity KPIs
      {
        metricId: 'rep_assignment_acceptance_rate',
        name: 'Assignment Acceptance Rate',
        description: 'Percentage of received assignments accepted by reporter',
        category: 'reporter',
        unit: 'percentage',
        aggregationType: 'RATE',
        source: 'Phase 8 NewsAssignmentService',
        calculationDefinition: 'Assignments Accepted / Assignments Received * 100',
        visibility: 'reporter',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        metricId: 'rep_assignment_completion_rate',
        name: 'Assignment Completion Rate',
        description: 'Percentage of accepted assignments completed by reporter',
        category: 'reporter',
        unit: 'percentage',
        aggregationType: 'RATE',
        source: 'Phase 8 NewsAssignmentService',
        calculationDefinition: 'Assignments Completed / Assignments Accepted * 100',
        visibility: 'reporter',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        metricId: 'rep_ontime_submission_rate',
        name: 'On-Time Submission Rate',
        description: 'Percentage of assignments submitted before deadline',
        category: 'reporter',
        unit: 'percentage',
        aggregationType: 'RATE',
        source: 'Phase 8 NewsAssignmentService',
        calculationDefinition: 'Assignments Submitted Before Deadline / Assignments Due * 100',
        visibility: 'reporter',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        metricId: 'rep_average_turnaround_hours',
        name: 'Average Submission Turnaround',
        description: 'Average elapsed hours between assignment acceptance and submission',
        category: 'reporter',
        unit: 'duration_hours',
        aggregationType: 'AVERAGE',
        source: 'Phase 8 NewsAssignmentService',
        calculationDefinition: 'AVG(assignment.submittedAt - assignment.acceptedAt) in hours',
        visibility: 'reporter',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        metricId: 'rep_revision_request_rate',
        name: 'Revision Request Rate',
        description: 'Percentage of submissions requiring editorial revisions',
        category: 'reporter',
        unit: 'percentage',
        aggregationType: 'RATE',
        source: 'Phase 2/8 Editorial Queue',
        calculationDefinition: 'Submissions With Revision Requests / Total Submissions * 100',
        visibility: 'reporter',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        metricId: 'rep_story_approval_rate',
        name: 'Approval Rate',
        description: 'Percentage of submitted stories approved for publication',
        category: 'reporter',
        unit: 'percentage',
        aggregationType: 'RATE',
        source: 'Phase 2/8 newsSubmissionService',
        calculationDefinition: 'Approved Stories / Total Submissions * 100',
        visibility: 'reporter',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },

      // Newsroom KPIs
      {
        metricId: 'nws_editorial_turnaround_hours',
        name: 'Editorial Turnaround Time',
        description: 'Average hours from reporter submission to editor approval or rejection',
        category: 'newsroom',
        unit: 'duration_hours',
        aggregationType: 'AVERAGE',
        source: 'Phase 2/8 Newsroom Models',
        calculationDefinition: 'AVG(article.reviewedAt - article.serverSubmittedAt) in hours',
        visibility: 'tenant',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        metricId: 'nws_duplicate_flag_rate',
        name: 'Originality Duplicate Rate',
        description: 'Percentage of submissions flagged as duplicate or disputed',
        category: 'newsroom',
        unit: 'percentage',
        aggregationType: 'RATE',
        source: 'Originality Engine / originalityEvaluator',
        calculationDefinition: '(Possible Duplicates + Confirmed Duplicates) / Total Submissions * 100',
        visibility: 'tenant',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },

      // Marketplace & Content Utilization KPIs
      {
        metricId: 'mkt_purchase_conversion_rate',
        name: 'Marketplace Purchase Conversion Rate',
        description: 'Percentage of published listings that resulted in at least one purchase',
        category: 'marketplace',
        unit: 'percentage',
        aggregationType: 'RATE',
        source: 'Phase 3/11 Marketplace Models',
        calculationDefinition: 'Listings With Purchases / Total Active Listings * 100',
        visibility: 'tenant',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        metricId: 'edt_content_utilization_rate',
        name: 'Content Utilization Rate',
        description: 'Proportion of approved eligible stories placed in published editions',
        category: 'edition',
        unit: 'percentage',
        aggregationType: 'RATE',
        source: 'Phase 9 Edition Models',
        calculationDefinition: 'Stories Placed in Published Editions / Eligible Approved Stories * 100',
        visibility: 'tenant',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        metricId: 'edt_edition_readiness_rate',
        name: 'Edition Readiness Rate',
        description: 'Percentage of editions that satisfy preflight and front-page constraints on first review',
        category: 'edition',
        unit: 'percentage',
        aggregationType: 'RATE',
        source: 'Phase 9 EditionReadinessService',
        calculationDefinition: 'Editions Passing Readiness First Pass / Total Finalized Editions * 100',
        visibility: 'tenant',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },

      // Production & Vendor KPIs
      {
        metricId: 'prd_vendor_ack_time_minutes',
        name: 'Vendor Acknowledgement Time',
        description: 'Average minutes taken by rotary print vendor to acknowledge dispatched package',
        category: 'vendor',
        unit: 'duration_minutes',
        aggregationType: 'AVERAGE',
        source: 'Phase 10 VendorDispatchService',
        calculationDefinition: 'AVG(dispatch.acknowledgedAt - dispatch.dispatchedAt) in minutes',
        visibility: 'executive',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        metricId: 'prd_reprint_rate',
        name: 'Press Reprint Rate',
        description: 'Proportion of copies requiring reprint due to press or distribution defect',
        category: 'production',
        unit: 'percentage',
        aggregationType: 'RATE',
        source: 'Phase 10 PrintDistributionService',
        calculationDefinition: 'Reprint Copies / Total Planned Copies * 100',
        visibility: 'executive',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },

      // Mobile Operations KPIs
      {
        metricId: 'mob_offline_sync_success_rate',
        name: 'Mobile Offline Sync Success Rate',
        description: 'Percentage of offline queued operations successfully synced to server',
        category: 'mobile',
        unit: 'percentage',
        aggregationType: 'RATE',
        source: 'Phase 13 MobileSyncService',
        calculationDefinition: 'Synced Queue Items / Total Queue Items * 100',
        visibility: 'executive',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        metricId: 'mob_evidence_upload_success_rate',
        name: 'Evidence Upload Success Rate',
        description: 'Percentage of photo, video, and audio uploads completing without fatal error',
        category: 'mobile',
        unit: 'percentage',
        aggregationType: 'RATE',
        source: 'Phase 13 MobileUploadManager',
        calculationDefinition: 'Successful Evidence Uploads / Total Attempted Uploads * 100',
        visibility: 'executive',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },

      // AI Usage KPIs
      {
        metricId: 'ai_suggestion_acceptance_rate',
        name: 'AI Suggestion Acceptance Rate',
        description: 'Percentage of AI headline/copy edit suggestions adopted by human editors',
        category: 'ai',
        unit: 'percentage',
        aggregationType: 'RATE',
        source: 'Phase 6 AI Usage Records',
        calculationDefinition: 'Accepted Suggestions / Total Generated Suggestions * 100',
        visibility: 'tenant',
        version: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const def of defaultMetrics) {
      this.metrics.set(def.metricId, def);
      const history = this.versionHistory.get(def.metricId) || [];
      history.push(def);
      this.versionHistory.set(def.metricId, history);
    }
  }

  /**
   * Registers a new metric or updates an existing metric by incrementing version.
   * Throws if definition is invalid.
   */
  public static registerMetric(def: Omit<AnalyticsMetricDefinition, 'version' | 'createdAt' | 'updatedAt'> & {
    version?: number;
    createdAt?: string;
    updatedAt?: string;
  }): AnalyticsMetricDefinition {
    if (!def.metricId || typeof def.metricId !== 'string' || def.metricId.trim().length === 0) {
      throw new Error('metricId is required and must be a non-empty string');
    }
    if (!def.name || def.name.trim().length === 0) {
      throw new Error('metric name is required');
    }
    if (!def.category) {
      throw new Error('metric category is required');
    }
    if (!def.aggregationType) {
      throw new Error('aggregationType is required');
    }
    if (!def.source || def.source.trim().length === 0) {
      throw new Error('source must be specified');
    }
    if (!def.calculationDefinition || def.calculationDefinition.trim().length === 0) {
      throw new Error('calculationDefinition must be explicitly specified (no hidden formulas)');
    }

    const now = new Date().toISOString();
    const existing = this.metrics.get(def.metricId);
    const newVersion = existing ? existing.version + 1 : 1;

    const fullDefinition: AnalyticsMetricDefinition = {
      ...def,
      version: newVersion,
      active: def.active !== undefined ? def.active : true,
      createdAt: existing ? existing.createdAt : def.createdAt || now,
      updatedAt: now,
    };

    this.metrics.set(def.metricId, fullDefinition);

    const history = this.versionHistory.get(def.metricId) || [];
    history.push(fullDefinition);
    this.versionHistory.set(def.metricId, history);

    return fullDefinition;
  }

  public static getMetric(metricId: string): AnalyticsMetricDefinition | undefined {
    return this.metrics.get(metricId);
  }

  public static getAllMetrics(): AnalyticsMetricDefinition[] {
    return Array.from(this.metrics.values());
  }

  public static getMetricsByCategory(category: MetricCategory): AnalyticsMetricDefinition[] {
    return Array.from(this.metrics.values()).filter((m) => m.category === category && m.active);
  }

  public static getMetricsByVisibility(visibility: MetricVisibility): AnalyticsMetricDefinition[] {
    return Array.from(this.metrics.values()).filter((m) => m.visibility === visibility && m.active);
  }

  public static getVersionHistory(metricId: string): AnalyticsMetricDefinition[] {
    return this.versionHistory.get(metricId) || [];
  }
}
