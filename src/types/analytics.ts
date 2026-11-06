/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 14 — Advanced Analytics, MIS & Executive Intelligence Types
 */

export type AggregationType =
  | 'COUNT'
  | 'SUM'
  | 'AVERAGE'
  | 'MEDIAN'
  | 'MIN'
  | 'MAX'
  | 'RATE'
  | 'PERCENTAGE'
  | 'RATIO'
  | 'DISTINCT_COUNT'
  | 'DURATION';

export type MetricCategory =
  | 'platform'
  | 'growth'
  | 'newsroom'
  | 'reporter'
  | 'marketplace'
  | 'license'
  | 'subscription'
  | 'financial'
  | 'edition'
  | 'production'
  | 'vendor'
  | 'regional'
  | 'mobile'
  | 'ai';

export type MetricVisibility =
  | 'public'
  | 'tenant'
  | 'executive'
  | 'reporter'
  | 'platform_admin';

export interface AnalyticsMetricDefinition {
  metricId: string;
  name: string;
  description: string;
  category: MetricCategory;
  unit: string;
  aggregationType: AggregationType;
  source: string;
  calculationDefinition: string;
  visibility: MetricVisibility;
  version: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'current_month'
  | 'previous_month'
  | 'quarter'
  | 'year'
  | 'custom';

export interface DateRangeFilter {
  preset: DateRangePreset;
  startDate: string; // ISO string
  endDate: string; // ISO string
  label: string;
}

// -------------------------------------------------------------
// Core Executive KPI Sets
// -------------------------------------------------------------

export interface PlatformKpiSet {
  activeTenants: number;
  activePublishers: number;
  activeReporters: number;
  activeMarketplaceListings: number;
  monthlyMarketplaceGmvMinor: number;
  platformRevenueMinor: number;
  reporterPayablesMinor: number;
  sourceOrgPayablesMinor: number;
  payoutVolumeMinor: number;
  editionsProduced: number;
  productionSuccessRate: number; // percentage
  deliverySuccessRate: number; // percentage
}

export interface GrowthKpiSet {
  newTenants: number;
  newReporters: number;
  newPublishers: number;
  newMarketplaceListings: number;
  purchaseGrowthRate: number; // percentage
  revenueGrowthRate: number; // percentage
  subscriptionGrowthRate: number; // percentage
}

export interface OperationalKpiSet {
  assignmentCompletionRate: number; // percentage
  storyApprovalRate: number; // percentage
  editorialTurnaroundHours: number; // hours
  editionReadinessRate: number; // percentage
  productionFailureRate: number; // percentage
  vendorDispatchSuccessRate: number; // percentage
  deliverySuccessRate: number; // percentage
  reprintRate: number; // percentage
}

export interface ExecutiveKpiSummary {
  period: DateRangeFilter;
  platform: PlatformKpiSet;
  growth: GrowthKpiSet;
  operational: OperationalKpiSet;
  generatedAt: string;
  dataFreshness: string;
}

// -------------------------------------------------------------
// Tenant Executive Analytics Summary
// -------------------------------------------------------------

export interface TenantExecutiveSummary {
  tenantId: string;
  period: DateRangeFilter;
  newsroom: {
    assignmentsCount: number;
    submissionsCount: number;
    approvalsCount: number;
    rejectionsCount: number;
    revisionsCount: number;
    averageTurnaroundHours: number;
  };
  marketplace: {
    purchasesCount: number;
    spendingMinor: number;
    licensedContentCount: number;
    subscriptionRedemptionsCount: number;
  };
  editions: {
    planned: number;
    finalized: number;
    published: number;
    averageStoriesPerEdition: number;
  };
  production: {
    pdfsGenerated: number;
    preflightPassRate: number;
    vendorDispatchesCount: number;
    printCompletedCount: number;
    deliveryRate: number;
  };
  finance: {
    marketplaceSpendMinor: number;
    contentRoyaltyEarnedMinor: number;
    pendingPayablesMinor: number;
    availablePayablesMinor: number;
  };
  dataFreshness: string;
}

// -------------------------------------------------------------
// Reporter Analytics & Productivity Models
// -------------------------------------------------------------

export interface ReporterProductivityMetrics {
  assignmentAcceptanceRate: number; // Accepted / Received * 100
  assignmentCompletionRate: number; // Completed / Accepted * 100
  onTimeSubmissionRate: number; // Submitted on time / Total due * 100
  averageSubmissionTurnaroundHours: number;
  revisionRequestRate: number; // Revision requested / Submissions * 100
  approvalRate: number; // Approved / Submissions * 100
  marketplaceListingRate: number; // Listed / Approved * 100
  marketplacePurchaseRate: number; // Purchased / Listed * 100
}

export interface ReporterAnalyticsSummary {
  reporterId: string;
  tenantId?: string;
  assignmentsReceived: number;
  assignmentsAccepted: number;
  assignmentsCompleted: number;
  assignmentsOverdue: number;
  storiesSubmitted: number;
  storiesApproved: number;
  storiesRejected: number;
  revisionsRequested: number;
  marketplaceListedStories: number;
  marketplacePurchases: number;
  grossSalesAttributableMinor: number;
  reporterEarningsMinor: number;
  pendingEarningsMinor: number;
  availableEarningsMinor: number;
  payoutsCompletedMinor: number;
  productivity: ReporterProductivityMetrics;
  formulaDefinitions: Record<string, string>;
  dataFreshness: string;
}

// -------------------------------------------------------------
// Newsroom & Originality Analytics Models
// -------------------------------------------------------------

export interface NewsroomAnalyticsSummary {
  tenantId?: string;
  period: DateRangeFilter;
  storiesSubmitted: number;
  storiesApproved: number;
  storiesRejected: number;
  revisionRequests: number;
  storiesByDesk: Record<string, number>;
  storiesByBeat: Record<string, number>;
  storiesByDistrict: Record<string, number>;
  storiesByCategory: Record<string, number>;
  averageEditorialTurnaroundHours: number;
  pendingEditorialQueueCount: number;
  overdueAssignmentsCount: number;
  breakingNewsCount: number;
  originality: OriginalityAnalyticsSummary;
  dataFreshness: string;
}

export interface OriginalityAnalyticsSummary {
  totalAssessed: number;
  statusCounts: {
    ORIGINAL_FIELD_REPORT: number;
    FIRST_RECORDED_SUBMISSION: number;
    INDEPENDENT_REPORT: number;
    SECONDARY_REPORT: number;
    POSSIBLE_DUPLICATE: number;
    DUPLICATE_CONFIRMED: number;
    DISPUTED: number;
    VERIFIED_ORIGINAL: number;
  };
  duplicateRate: number; // (POSSIBLE_DUPLICATE + DUPLICATE_CONFIRMED) / total * 100
  verificationTurnaroundHours: number;
  disputedCasesCount: number;
  evidenceBackedSubmissionsCount: number;
  evidenceBackedRate: number; // Evidence backed / total * 100
}

// -------------------------------------------------------------
// Marketplace, Funnel & License Analytics Models
// -------------------------------------------------------------

export interface MarketplaceFunnelStage {
  stage:
    | 'LISTING_PUBLISHED'
    | 'LISTING_VIEWED'
    | 'LICENSE_VIEWED'
    | 'PURCHASE_INITIATED'
    | 'PAYMENT_COMPLETED'
    | 'LICENSE_ISSUED'
    | 'CONTENT_ADDED_TO_EDITION';
  count: number;
  conversionFromPrevious: number; // percentage
  overallConversion: number; // percentage
}

export interface LicenseAnalyticsSummary {
  activeLicenses: number;
  expiringLicenses: number;
  expiredLicenses: number;
  revokedLicenses: number;
  licenseTypeDistribution: {
    digitalOnly: number;
    printOnly: number;
    digitalAndPrint: number;
    exclusive: number;
  };
  scopeDistribution: {
    singleEdition: number;
    multiEdition: number;
    regional: number;
    national: number;
    global: number;
  };
  averageLicenseValueMinor: number;
  contentUsageRate: number; // Licenses used in editions / Total active licenses * 100
  unusedPurchasedCount: number;
  renewalActivityCount: number;
}

export interface MarketplaceAnalyticsSummary {
  period: DateRangeFilter;
  activeListings: number;
  newListings: number;
  purchasesCount: number;
  purchaseConversionRate: number; // percentage
  grossMarketplaceSalesMinor: number;
  refundsMinor: number;
  chargebacksMinor: number;
  netSalesMinor: number;
  averagePurchaseValueMinor: number;
  categoryDistribution: Record<string, number>;
  geographicDemand: Record<string, number>;
  sellerDistribution: Record<string, number>;
  funnel: MarketplaceFunnelStage[];
  licenses: LicenseAnalyticsSummary;
  dataFreshness: string;
}

// -------------------------------------------------------------
// Subscription & Plan Utilization Models
// -------------------------------------------------------------

export interface SubscriptionAnalyticsSummary {
  activeSubscriptions: number;
  trialSubscriptions: number;
  churnCount: number;
  churnRate: number; // percentage
  upgradeCount: number;
  downgradeCount: number;
  renewalCount: number;
  planDistribution: Record<string, number>;
  aiUsageByPlan: Record<string, number>;
  editionUsageByPlan: Record<string, number>;
  unusedEntitlementUnits: number;
  totalEntitlementUnits: number;
  entitlementConsumptionRate: number; // percentage
}

export interface PlanUtilizationSummary {
  tenantId: string;
  currentPlanId: string;
  status: string;
  editionLimit: number;
  editionsUsed: number;
  editionsRemaining: number;
  aiLimit: number;
  aiUsed: number;
  aiRemaining: number;
  newsProcessingLimit: number;
  newsProcessed: number;
  newsRemaining: number;
  storageLimitMb: number;
  storageUsedMb: number;
  marketplaceAccess: boolean;
  featureUtilizationScore: number; // percentage of enabled features used
}

// -------------------------------------------------------------
// Financial Analytics & Reconciliation Models
// -------------------------------------------------------------

export interface FinancialReconciliationWarning {
  warningId: string;
  type: 'PAYMENT_MISMATCH' | 'PURCHASE_EVENT_GAP' | 'LEDGER_UNBALANCED' | 'PAYABLE_DRIFT' | 'PAYOUT_STATUS_DISCREPANCY';
  severity: 'CRITICAL' | 'WARNING';
  description: string;
  referenceId: string;
  tenantId?: string;
  detectedAt: string;
  reconciliationStage: 'Payments' | 'Purchases' | 'RevenueEvents' | 'Ledger' | 'Payables' | 'Payouts';
}

export interface FinancialAnalyticsSummary {
  period: DateRangeFilter;
  currency: string;
  grossMarketplaceRevenueMinor: number;
  platformRevenueMinor: number;
  reporterShareMinor: number;
  sourceShareMinor: number;
  refundsMinor: number;
  chargebacksMinor: number;
  netRevenueMinor: number;
  pendingPayablesMinor: number;
  availablePayablesMinor: number;
  payoutsCompletedMinor: number;
  payoutsFailedMinor: number;
  payoutsReversedMinor: number;
  reconciliationWarnings: FinancialReconciliationWarning[];
  reconciliationStatus: 'BALANCED' | 'WARNINGS_PRESENT' | 'DISCREPANCY_DETECTED';
  dataFreshness: string;
}

// -------------------------------------------------------------
// Edition Analytics & Content Utilization Models
// -------------------------------------------------------------

export interface ContentUtilizationSummary {
  storiesSubmitted: number;
  storiesApproved: number;
  storiesPublished: number;
  storiesPlacedInEditions: number;
  unusedApprovedStories: number;
  marketplaceStoriesUsed: number;
  inHouseStoriesUsed: number;
  freelanceStoriesUsed: number;
  contentUtilizationRate: number; // Stories Used in Published Editions / Eligible Approved Stories * 100
  formula: string;
}

export interface EditionAnalyticsSummary {
  tenantId?: string;
  period: DateRangeFilter;
  editionsPlanned: number;
  editionsOpened: number;
  editionsFinalized: number;
  editionsPublished: number;
  editionsCancelled: number;
  editionsSuperseded: number;
  averageStoriesPerEdition: number;
  averagePagesPerEdition: number;
  sectionCoveragePercentage: number;
  frontPageLeadUsageRate: number;
  editionReadinessRate: number; // percentage passing readiness on first attempt
  blockedReadinessCasesCount: number;
  lateFinalizationCount: number;
  contentUtilization: ContentUtilizationSummary;
  dataFreshness: string;
}

// -------------------------------------------------------------
// Production, Print Vendor & Regional Analytics Models
// -------------------------------------------------------------

export interface ProductionAnalyticsSummary {
  tenantId?: string;
  period: DateRangeFilter;
  totalProductionJobs: number;
  pdfGenerationSuccessRate: number; // percentage
  preflightPassRate: number; // percentage
  preflightFailureRate: number; // percentage
  averageProductionApprovalMinutes: number;
  vendorDispatchSuccessRate: number; // percentage
  averageVendorAcknowledgementMinutes: number;
  averagePrintCompletionMinutes: number;
  reprintRate: number; // percentage
  deliverySuccessRate: number; // percentage
  totalCopiesPlanned: number;
  totalCopiesDelivered: number;
  totalCopiesWasted: number;
  dataFreshness: string;
}

export interface PrintVendorAnalyticsSummary {
  vendorId: string;
  vendorName: string;
  tenantId?: string;
  assignedJobs: number;
  acceptedJobs: number;
  rejectedJobs: number;
  averageAcknowledgementMinutes: number;
  averagePrintCompletionMinutes: number;
  delayedJobsCount: number;
  failedJobsCount: number;
  reprintsCount: number;
  deliverySuccessRate: number; // percentage
  operationalKpis: {
    acknowledgementCompliance: number; // percentage within SLA
    printSpeedIndex: number;
    reprintFrequencyRate: number; // percentage
  };
}

export interface RegionalAnalyticsSummary {
  regionId: string;
  regionName: string;
  tenantId?: string;
  editionsCount: number;
  printQuantity: number;
  distributionQuantity: number;
  deliveredQuantity: number;
  failedDeliveryQuantity: number;
  partialDeliveryQuantity: number;
  wastageQuantity: number;
  reprintQuantity: number;
  fulfillmentRate: number; // percentage delivered
}

// -------------------------------------------------------------
// Mobile Operations Analytics
// -------------------------------------------------------------

export interface MobileOperationsAnalyticsSummary {
  tenantId?: string;
  activeMobileReporters: number;
  offlineSessionsCount: number;
  syncSuccessRate: number; // percentage
  syncFailuresCount: number;
  evidenceUploadSuccessRate: number; // percentage
  uploadRetryRate: number; // percentage
  averageSyncDurationSeconds: number;
  notificationDeliveryRate: number; // percentage
  notificationOpenRate: number; // percentage
  dataFreshness: string;
}

// -------------------------------------------------------------
// AI Usage Analytics Models
// -------------------------------------------------------------

export interface AIUsageAnalyticsSummary {
  tenantId?: string;
  period: DateRangeFilter;
  totalRequests: number;
  totalSuggestions: number;
  acceptedSuggestions: number;
  rejectedSuggestions: number;
  acceptanceRate: number; // Accepted / Total * 100
  aiUsageByPlan: Record<string, number>;
  aiUsageByTenant: Record<string, number>;
  modelUsageDistribution: Record<string, number>;
  featureUtilization: Record<string, number>;
  tokenUnitsConsumed: number;
  confidentialPromptsRedacted: boolean;
  dataFreshness: string;
}

// -------------------------------------------------------------
// Customer Health Models
// -------------------------------------------------------------

export type TenantHealthIndicator =
  | 'ACTIVE'
  | 'LOW_USAGE'
  | 'LIMIT_NEAR'
  | 'PAYMENT_RISK'
  | 'PRODUCTION_RISK'
  | 'INACTIVE';

export interface TenantHealthStatus {
  tenantId: string;
  organizationName: string;
  indicator: TenantHealthIndicator;
  explanation: string;
  metricsSnapshot: {
    lastActivityDaysAgo: number;
    activeUsersCount: number;
    editionsCreatedThisMonth: number;
    marketplacePurchasesCount: number;
    subscriptionStatus: string;
    editionLimitUtilization: number; // percentage
    productionFailureRate: number; // percentage
  };
  evaluationRulesApplied: string[];
  evaluatedAt: string;
}

// -------------------------------------------------------------
// Alerts & Deterministic Anomaly Detection
// -------------------------------------------------------------

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface AnalyticsAlert {
  alertId: string;
  tenantId?: string; // undefined means platform-wide
  metric: string;
  severity: AlertSeverity;
  threshold: number;
  currentValue: number;
  previousValue: number;
  percentageChange?: number;
  reason: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface DeterministicAnomaly {
  anomalyId: string;
  tenantId?: string;
  metric: string;
  baselineValue: number;
  observedValue: number;
  deviationPercent: number;
  ruleTriggered: string;
  severity: AlertSeverity;
  detectedAt: string;
}

// -------------------------------------------------------------
// MIS Custom Report Builder & Saved Reports
// -------------------------------------------------------------

export type ReportGrouping =
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'tenant'
  | 'desk'
  | 'beat'
  | 'category'
  | 'district'
  | 'licenseType'
  | 'vendor'
  | 'region';

export interface ReportFilter {
  field: string;
  operator: 'EQUALS' | 'IN' | 'GREATER_THAN' | 'LESS_THAN' | 'BETWEEN';
  value: any;
}

export type ReportSchedule = 'daily' | 'weekly' | 'monthly' | 'none';

export type ReportExportFormat = 'CSV' | 'XLSX' | 'PDF_JSON';

export interface SavedAnalyticsReport {
  id: string;
  tenantId: string;
  createdBy: string;
  name: string;
  description: string;
  metricIds: string[];
  dimensions: string[];
  filters: ReportFilter[];
  grouping: ReportGrouping;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  schedule: ReportSchedule;
  recipients: string[];
  format: ReportExportFormat;
  active: boolean;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsReportSnapshot {
  snapshotId: string;
  tenantId: string;
  reportDefinitionId: string;
  reportName: string;
  metricVersions: Record<string, number>;
  dateRange: DateRangeFilter;
  generationTimestamp: string;
  dataHash: string; // SHA-256 integrity hash
  dataRows: Array<Record<string, any>>;
  summaryMetrics: Record<string, any>;
  createdBy: string;
}

// -------------------------------------------------------------
// Aggregation & Jobs Models
// -------------------------------------------------------------

export type AggregationInterval = 'DAILY' | 'MONTHLY';

export interface AnalyticsAggregation {
  id: string;
  tenantId?: string;
  interval: AggregationInterval;
  dateKey: string; // '2026-10-07' or '2026-10'
  metrics: Record<string, number>;
  dimensions?: Record<string, any>;
  aggregatedAt: string;
  version: number;
}

export type AnalyticsJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface AnalyticsJob {
  jobId: string;
  jobType: 'DAILY_AGGREGATION' | 'MONTHLY_AGGREGATION' | 'HISTORICAL_BACKFILL' | 'DATA_QUALITY_SCAN';
  tenantId?: string;
  status: AnalyticsJobStatus;
  progressPercent: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  recordsProcessed: number;
  metadata?: Record<string, any>;
}

export interface BackfillJobConfig {
  startDate: string;
  endDate: string;
  tenantId?: string;
  metricSets: string[];
}

// -------------------------------------------------------------
// Data Quality Models
// -------------------------------------------------------------

export type DataQualitySeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface AnalyticsDataQualityFinding {
  findingId: string;
  checkType:
    | 'MISSING_DIMENSION'
    | 'DUPLICATE_AGGREGATION'
    | 'STALE_AGGREGATION'
    | 'NEGATIVE_IMPOSSIBLE_METRIC'
    | 'FINANCIAL_MISMATCH'
    | 'ORPHANED_RECORD'
    | 'MISSING_TENANT_ID'
    | 'INVALID_CURRENCY'
    | 'AGGREGATION_DRIFT';
  severity: DataQualitySeverity;
  description: string;
  entityReference?: string;
  tenantId?: string;
  detectedAt: string;
  resolved: boolean;
}

// -------------------------------------------------------------
// Narrative & Executive Summary Models
// -------------------------------------------------------------

export type NarrativeType =
  | 'EXECUTIVE_SUMMARY'
  | 'TREND_SUMMARY'
  | 'ANOMALY_EXPLANATION'
  | 'OPERATIONAL_SUMMARY';

export interface AnalyticsNarrative {
  narrativeId: string;
  narrativeType: NarrativeType;
  tenantId?: string;
  headline: string;
  bullets: string[];
  groundedMetricValues: Record<string, number | string>;
  isAiGenerated: boolean;
  label: 'AI-GENERATED SUMMARY' | 'VERIFIED EXECUTIVE SUMMARY';
  generatedAt: string;
}
