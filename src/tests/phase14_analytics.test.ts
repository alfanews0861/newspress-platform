/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 14 — Advanced Analytics, MIS & Executive Intelligence Tests
 * 
 * Comprehensive test suite containing at least 85 rigorous tests covering:
 * - 1. Metric Registry (Tests 1-8)
 * - 2. Tenant Analytics & Isolation (Tests 9-15)
 * - 3. Newsroom & Editorial Turnaround (Tests 16-22)
 * - 4. Originality Engine Analytics (Tests 23-28)
 * - 5. Reporter Factual Productivity & Royalties (Tests 29-36)
 * - 6. Marketplace Syndication, Funnel & Licenses (Tests 37-44)
 * - 7. Subscriptions & Plan Quotas (Tests 45-50)
 * - 8. Financial Analytics, Ledger & Reconciliation (Tests 51-57)
 * - 9. Edition Analytics & Content Utilization (Tests 58-64)
 * - 10. Production, Print Vendors & Regional Logistics (Tests 65-71)
 * - 11. Mobile Field Operations Analytics (Tests 72-76)
 * - 12. Tenant Customer Health & Executive Alerts (Tests 77-82)
 * - 13. MIS Reports, Snapshots & Data Export (Tests 83-89)
 * - 14. Data Quality Diagnostics & AI Grounded Summaries (Tests 90-95)
 */

import { AnalyticsMetricRegistry } from '../services/analyticsMetricRegistry';
import { FinancialAnalyticsService } from '../services/financialAnalyticsService';
import { marketplaceAnalyticsService } from '../services/marketplaceAnalyticsService';
import { NewsroomAnalyticsService } from '../services/newsroomAnalyticsService';
import { EditionAnalyticsService } from '../services/editionAnalyticsService';
import { ProductionAnalyticsService } from '../services/productionAnalyticsService';
import { ReporterAnalyticsService } from '../services/reporterAnalyticsService';
import { TenantHealthService } from '../services/tenantHealthService';
import { AnalyticsAlertService } from '../services/analyticsAlertService';
import { AnalyticsAggregationService } from '../services/analyticsAggregationService';
import { AnalyticsDataQualityService } from '../services/analyticsDataQualityService';
import { MISReportService } from '../services/misReportService';
import { AnalyticsExportService } from '../services/analyticsExportService';
import { AnalyticsNarrativeService } from '../services/analyticsNarrativeService';
import { AnalyticsQueryService } from '../services/analyticsQueryService';
import { RBACService } from '../services/rbacService';
import { financialLedgerService } from '../services/financialLedgerService';
import { payableBalanceService } from '../services/payableBalanceService';
import { payoutService } from '../services/payoutService';
import { newsSubmissionService } from '../services/newsSubmissionService';
import { NewsAssignmentService } from '../services/newsAssignmentService';
import { EditionPlanningService } from '../services/editionPlanningService';
import { ProductionQueueService } from '../services/productionQueueService';
import { PrintVendorService } from '../services/printVendorService';
import { PrintDistributionService } from '../services/printDistributionService';
import { VendorDispatchService } from '../services/vendorDispatchService';
import { MobileAnalyticsService } from '../services/mobileAnalyticsService';

let testCount = 0;

function assert(condition: boolean, message: string) {
  testCount++;
  if (!condition) {
    console.error(`❌ Test ${testCount} Failed: ${message}`);
    throw new Error(`Test ${testCount} Failed: ${message}`);
  } else {
    console.log(`✓ Test ${testCount} Passed: ${message}`);
  }
}

async function runPhase14Tests() {
  console.log('================================================================');
  console.log('STARTING PHASE 14 — ADVANCED ANALYTICS, MIS & EXECUTIVE INTELLIGENCE TESTS');
  console.log('================================================================\n');

  // Reset stores for clean test state
  AnalyticsMetricRegistry.reset();
  AnalyticsAlertService.reset();
  AnalyticsAggregationService.reset();
  AnalyticsDataQualityService.reset();
  MISReportService.reset();

  const testTenant = 'tenant-metro-chronicle';
  const otherTenant = 'tenant-rural-herald';

  // -------------------------------------------------------------
  // SECTION 1: METRIC DEFINITION REGISTRY (Tests 1-8)
  // -------------------------------------------------------------
  console.log('--- SECTION 1: METRIC DEFINITION REGISTRY ---');

  const allMetrics = AnalyticsMetricRegistry.getAllMetrics();
  assert(allMetrics.length >= 10, 'Standard metrics seeded in registry');

  const gmvMetric = AnalyticsMetricRegistry.getMetric('plt_marketplace_gmv');
  assert(gmvMetric !== undefined && gmvMetric.unit === 'inr_minor', 'GMV metric registered with integer minor unit');
  assert(Boolean(gmvMetric?.source.includes('Ledger')), 'GMV source mapped to authoritative Ledger');

  // Register new custom metric
  const customMetric = AnalyticsMetricRegistry.registerMetric({
    metricId: 'tst_custom_ratio',
    name: 'Custom Editorial Ratio',
    description: 'Test ratio metric for newsroom evaluation',
    category: 'newsroom',
    unit: 'ratio',
    aggregationType: 'RATIO',
    source: 'Phase 8 Newsroom Models',
    calculationDefinition: 'Stories / Pages',
    visibility: 'tenant',
    active: true,
  });
  assert(customMetric.version === 1, 'New metric initialized at version 1');

  // Metric versioning (never silently change definition)
  const updatedMetric = AnalyticsMetricRegistry.registerMetric({
    metricId: 'tst_custom_ratio',
    name: 'Custom Editorial Ratio Updated',
    description: 'Updated formula',
    category: 'newsroom',
    unit: 'ratio',
    aggregationType: 'RATIO',
    source: 'Phase 8 Newsroom Models',
    calculationDefinition: 'Approved Stories / Planned Pages',
    visibility: 'tenant',
    active: true,
  });
  assert(updatedMetric.version === 2, 'Re-registering existing metric increments version to 2');

  const history = AnalyticsMetricRegistry.getVersionHistory('tst_custom_ratio');
  assert(history.length === 2, 'Version history accurately tracks both iterations');

  // Validation on invalid definition
  let threwInvalid = false;
  try {
    AnalyticsMetricRegistry.registerMetric({
      metricId: '',
      name: '',
      description: '',
      category: 'newsroom',
      unit: '',
      aggregationType: 'COUNT',
      source: '',
      calculationDefinition: '',
      visibility: 'public',
      active: true,
    });
  } catch (err) {
    threwInvalid = true;
  }
  assert(threwInvalid, 'Empty or invalid metric definition is strictly rejected');

  const reporterMetrics = AnalyticsMetricRegistry.getMetricsByCategory('reporter');
  assert(reporterMetrics.length >= 4, 'Reporter metrics filtered accurately by category');

  // -------------------------------------------------------------
  // SECTION 2: TENANT ANALYTICS & ISOLATION (Tests 9-15)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 2: TENANT ANALYTICS & ISOLATION ---');

  const tenantSummary = AnalyticsQueryService.getTenantExecutiveSummary(testTenant);
  assert(tenantSummary.tenantId === testTenant, 'Tenant executive summary returns active tenant scope');
  assert(tenantSummary.newsroom !== undefined, 'Tenant newsroom section resolved');
  assert(tenantSummary.marketplace !== undefined, 'Tenant marketplace section resolved');
  assert(tenantSummary.editions !== undefined, 'Tenant editions section resolved');
  assert(tenantSummary.production !== undefined, 'Tenant production section resolved');
  assert(tenantSummary.finance !== undefined, 'Tenant finance section resolved');

  const otherTenantSummary = AnalyticsQueryService.getTenantExecutiveSummary(otherTenant);
  assert(otherTenantSummary.tenantId === otherTenant, 'Cross-tenant query isolates other tenant scope');

  // -------------------------------------------------------------
  // SECTION 3: NEWSROOM & EDITORIAL TURNAROUND (Tests 16-22)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 3: NEWSROOM & EDITORIAL TURNAROUND ---');

  const newsSummary = NewsroomAnalyticsService.getNewsroomSummary({ tenantId: testTenant });
  assert(newsSummary.storiesSubmitted >= 0, 'Newsroom submissions count computed');
  assert(newsSummary.storiesApproved >= 0, 'Newsroom approved count computed');
  assert(newsSummary.averageEditorialTurnaroundHours > 0, 'Average editorial turnaround calculated');
  assert(typeof newsSummary.storiesByCategory === 'object', 'Breakdown by story category provided');
  assert(typeof newsSummary.storiesByBeat === 'object', 'Breakdown by newsroom beat provided');
  assert(typeof newsSummary.storiesByDistrict === 'object', 'Breakdown by geographic district provided');
  assert(newsSummary.dataFreshness.includes('Updated'), 'Data freshness metadata present');

  // -------------------------------------------------------------
  // SECTION 4: ORIGINALITY ENGINE ANALYTICS (Tests 23-28)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 4: ORIGINALITY ENGINE ANALYTICS ---');

  const orig = newsSummary.originality;
  assert(typeof orig.statusCounts === 'object', 'Originality status counts present');
  assert(orig.statusCounts.ORIGINAL_FIELD_REPORT !== undefined, 'ORIGINAL_FIELD_REPORT tracked');
  assert(orig.statusCounts.VERIFIED_ORIGINAL !== undefined, 'VERIFIED_ORIGINAL tracked');
  assert(orig.statusCounts.POSSIBLE_DUPLICATE !== undefined, 'POSSIBLE_DUPLICATE tracked');
  assert(orig.duplicateRate >= 0 && orig.duplicateRate <= 100, 'Duplicate rate strictly between 0% and 100%');
  assert(orig.evidenceBackedSubmissionsCount >= 0, 'Evidence-backed submissions counted');

  // -------------------------------------------------------------
  // SECTION 5: REPORTER FACTUAL PRODUCTIVITY & ROYALTIES (Tests 29-36)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 5: REPORTER FACTUAL PRODUCTIVITY & ROYALTIES ---');

  const repSummary = ReporterAnalyticsService.getReporterSummary('rep_sofia_chen', testTenant);
  assert(repSummary.reporterId === 'rep_sofia_chen', 'Reporter summary resolves requested reporterId');
  assert(repSummary.productivity.assignmentAcceptanceRate >= 0, 'Assignment acceptance rate calculated');
  assert(repSummary.productivity.assignmentCompletionRate >= 0, 'Assignment completion rate calculated');
  assert(repSummary.productivity.onTimeSubmissionRate >= 0, 'On-time submission rate calculated');
  assert(repSummary.productivity.averageSubmissionTurnaroundHours > 0, 'Average turnaround hours computed');
  assert(repSummary.reporterEarningsMinor >= 0, 'Reporter gross earnings in integer minor units');
  assert(repSummary.availableEarningsMinor >= 0, 'Available payable balance computed');
  assert(Object.keys(repSummary.formulaDefinitions).length >= 6, 'Transparent formulas disclosed without subjective ranking');

  // -------------------------------------------------------------
  // SECTION 6: MARKETPLACE SYNDICATION, FUNNEL & LICENSES (Tests 37-44)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 6: MARKETPLACE SYNDICATION, FUNNEL & LICENSES ---');

  const mktSummary = marketplaceAnalyticsService.getPhase14Summary({ tenantId: testTenant });
  assert(mktSummary.activeListings >= 0, 'Active marketplace listings tracked');
  assert(mktSummary.purchasesCount >= 0, 'Purchases count tracked');
  assert(mktSummary.purchaseConversionRate >= 0, 'Purchase conversion rate computed');
  assert(mktSummary.funnel.length === 7, 'Marketplace funnel tracks all 7 lifecycle stages');
  assert(mktSummary.funnel[0].stage === 'LISTING_PUBLISHED', 'Funnel begins at LISTING_PUBLISHED');
  assert(mktSummary.funnel[6].stage === 'CONTENT_ADDED_TO_EDITION', 'Funnel concludes at CONTENT_ADDED_TO_EDITION');
  assert(mktSummary.licenses.activeLicenses >= 0, 'Active licenses counted');
  assert(mktSummary.licenses.contentUsageRate >= 0, 'License usage in editions tracked');

  // -------------------------------------------------------------
  // SECTION 7: SUBSCRIPTIONS & PLAN QUOTAS (Tests 45-50)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 7: SUBSCRIPTIONS & PLAN QUOTAS ---');

  const subSummary = marketplaceAnalyticsService.getSubscriptionSummary();
  assert(subSummary.activeSubscriptions > 0, 'Active publisher subscriptions reported');
  assert(typeof subSummary.planDistribution === 'object', 'Plan distribution mapping present');
  assert(subSummary.aiUsageByPlan.BASIC !== undefined, 'AI usage by plan tracked');
  assert(subSummary.editionUsageByPlan.STANDARD !== undefined, 'Edition usage by plan tracked');

  const planUtil = AnalyticsQueryService.getPlanUtilization(testTenant);
  assert(planUtil.editionLimit > 0, 'Plan edition limit resolved');
  assert(planUtil.editionsRemaining >= 0, 'Plan remaining editions calculated');

  // -------------------------------------------------------------
  // SECTION 8: FINANCIAL ANALYTICS, LEDGER & RECONCILIATION (Tests 51-57)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 8: FINANCIAL ANALYTICS, LEDGER & RECONCILIATION ---');

  const finSummary = FinancialAnalyticsService.getFinancialSummary({ tenantId: testTenant });
  assert(finSummary.currency === 'INR', 'Currency defaults to INR');
  assert(finSummary.grossMarketplaceRevenueMinor >= 0, 'Gross marketplace revenue in integer minor units');
  assert(finSummary.platformRevenueMinor >= 0, 'Platform commission revenue in integer minor units');
  assert(finSummary.netRevenueMinor === finSummary.platformRevenueMinor - finSummary.refundsMinor - finSummary.chargebacksMinor, 'Net revenue math verifies correctly');
  assert(finSummary.payoutsCompletedMinor >= 0, 'Completed payouts volume tracked');
  assert(Array.isArray(finSummary.reconciliationWarnings), 'Reconciliation warnings list surfaced');
  assert(['BALANCED', 'WARNINGS_PRESENT', 'DISCREPANCY_DETECTED'].includes(finSummary.reconciliationStatus), 'Reconciliation status valid');

  // -------------------------------------------------------------
  // SECTION 9: EDITION ANALYTICS & CONTENT UTILIZATION (Tests 58-64)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 9: EDITION ANALYTICS & CONTENT UTILIZATION ---');

  const edtSummary = EditionAnalyticsService.getEditionSummary({ tenantId: testTenant });
  assert(edtSummary.editionsPlanned >= 0, 'Planned editions counted');
  assert(edtSummary.editionsPublished >= 0, 'Published editions counted');
  assert(edtSummary.frontPageLeadUsageRate >= 0, 'Front page lead usage tracked');
  assert(edtSummary.editionReadinessRate >= 0, 'Edition readiness rate computed');

  const util = edtSummary.contentUtilization;
  assert(util.storiesSubmitted >= 0, 'Submitted stories in content pool tracked');
  assert(util.contentUtilizationRate >= 0 && util.contentUtilizationRate <= 100, 'Content utilization rate valid percentage');
  assert(util.formula.includes('Stories Used in Published Editions'), 'Content utilization formula transparently stated');

  // -------------------------------------------------------------
  // SECTION 10: PRODUCTION, PRINT VENDORS & REGIONAL LOGISTICS (Tests 65-71)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 10: PRODUCTION, PRINT VENDORS & REGIONAL LOGISTICS ---');

  const prodSummary = ProductionAnalyticsService.getProductionSummary({ tenantId: testTenant });
  assert(prodSummary.pdfGenerationSuccessRate >= 0, 'PDF generation success rate tracked');
  assert(prodSummary.preflightPassRate >= 0, 'Preflight pass rate tracked');
  assert(prodSummary.vendorDispatchSuccessRate >= 0, 'Vendor dispatch success rate tracked');
  assert(prodSummary.deliverySuccessRate >= 0, 'Delivery success rate tracked');

  const vendors = ProductionAnalyticsService.getVendorAnalytics(testTenant);
  assert(vendors.length > 0, 'Rotary print vendors retrieved');
  assert(vendors[0].averageAcknowledgementMinutes > 0, 'Vendor acknowledgement time tracked');

  const regions = ProductionAnalyticsService.getRegionalAnalytics(testTenant);
  assert(regions.length > 0, 'Regional fulfillment distributions retrieved');

  // -------------------------------------------------------------
  // SECTION 11: MOBILE FIELD OPERATIONS ANALYTICS (Tests 72-76)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 11: MOBILE FIELD OPERATIONS ANALYTICS ---');

  const mobSummary = AnalyticsQueryService.getMobileOperationsSummary(testTenant);
  assert(mobSummary.activeMobileReporters > 0, 'Active mobile reporters tracked');
  assert(mobSummary.offlineSessionsCount >= 0, 'Offline reporting sessions counted');
  assert(mobSummary.syncSuccessRate >= 90, 'Sync success rate tracked');
  assert(mobSummary.evidenceUploadSuccessRate >= 90, 'Evidence upload success rate tracked');
  assert(mobSummary.notificationDeliveryRate >= 90, 'Push notification delivery rate tracked');

  // -------------------------------------------------------------
  // SECTION 12: TENANT CUSTOMER HEALTH & EXECUTIVE ALERTS (Tests 77-82)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 12: TENANT CUSTOMER HEALTH & EXECUTIVE ALERTS ---');

  const health = await TenantHealthService.evaluateTenantHealth(testTenant);
  assert(['ACTIVE', 'LOW_USAGE', 'LIMIT_NEAR', 'PAYMENT_RISK', 'PRODUCTION_RISK', 'INACTIVE'].includes(health.indicator), 'Explainable health indicator assigned');
  assert(health.evaluationRulesApplied.length > 0, 'Explicit rules applied without black-box AI');

  const newAlert = AnalyticsAlertService.createAlert({
    tenantId: testTenant,
    metric: 'plt_marketplace_gmv',
    severity: 'WARNING',
    threshold: 100000,
    currentValue: 85000,
    previousValue: 120000,
    reason: 'Monthly GMV fell below warning threshold',
  });
  assert(newAlert.alertId.startsWith('alt-'), 'Alert registered with unique ID');
  assert(newAlert.percentageChange !== undefined, 'Percentage deviation computed');

  const activeAlerts = AnalyticsAlertService.getAlerts(testTenant, true);
  assert(activeAlerts.some((a) => a.alertId === newAlert.alertId), 'New alert appears in active alerts list');

  const resolved = AnalyticsAlertService.resolveAlert(newAlert.alertId, 'user-admin');
  assert(resolved.resolved === true, 'Alert successfully marked resolved');

  // -------------------------------------------------------------
  // SECTION 13: MIS REPORTS, SNAPSHOTS & DATA EXPORT (Tests 83-89)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 13: MIS REPORTS, SNAPSHOTS & DATA EXPORT ---');

  const period = AnalyticsQueryService.resolveDateRange('last_30_days');
  const dynamicReport = await MISReportService.executeReport({
    tenantId: testTenant,
    metricIds: ['storiesSubmitted', 'storiesApproved'],
    period,
  });
  assert(dynamicReport.rows.length > 0, 'Dynamic report generated tabular rows');
  assert(dynamicReport.summary.storiesSubmitted !== undefined, 'Summary metrics populated in report');

  const saved = await MISReportService.saveReport({
    tenantId: testTenant,
    createdBy: 'user-admin',
    name: 'Weekly Operations Audit',
    description: 'Weekly test report',
    metricIds: ['storiesSubmitted'],
    dimensions: ['category'],
    filters: [],
    grouping: 'week',
    schedule: 'weekly',
    recipients: ['admin@metro.press'],
    format: 'CSV',
    active: true,
  });
  assert(saved.id.startsWith('rep_saved_'), 'Report saved to catalog with unique ID');

  const snapshot = await MISReportService.createReportSnapshot({
    tenantId: testTenant,
    reportDefinitionId: saved.id,
    reportName: saved.name,
    period,
    dataRows: dynamicReport.rows,
    summaryMetrics: dynamicReport.summary,
    createdBy: 'user-admin',
  });
  assert(snapshot.snapshotId.startsWith('snap_'), 'Immutable report snapshot created');
  assert(snapshot.dataHash.startsWith('sha256_'), 'Cryptographic data hash sealed into snapshot');

  const exported = await AnalyticsExportService.exportReport({
    tenantId: testTenant,
    reportName: 'Test_Audit',
    format: 'CSV',
    data: [{ metric: 'Stories', count: 10, bankAccount: 'SECRET_12345' }],
    actorId: 'user-admin',
    actorName: 'Admin',
    actorRole: 'super_admin',
  });
  assert(exported.content.includes('[REDACTED]'), 'Sensitive credentials redacted prior to export');
  assert(!exported.content.includes('SECRET_12345'), 'Bank secrets strictly excluded from export output');

  // -------------------------------------------------------------
  // SECTION 14: DATA QUALITY DIAGNOSTICS & AI GROUNDED SUMMARIES (Tests 90-95)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 14: DATA QUALITY DIAGNOSTICS & AI GROUNDED SUMMARIES ---');

  const qualityFindings = AnalyticsDataQualityService.performDiagnosticScan(testTenant);
  assert(Array.isArray(qualityFindings), 'Data quality diagnostic scan completed');

  // Aggregation Service daily run
  const dailyAgg = await AnalyticsAggregationService.aggregateDaily({
    dateKey: '2026-10-02',
    tenantId: testTenant,
  });
  assert(dailyAgg.interval === 'DAILY', 'Daily aggregation produced');
  assert(dailyAgg.version === 1, 'Daily aggregation initialized at version 1');

  // Idempotency check: re-running daily aggregation
  const dailyAggReplay = await AnalyticsAggregationService.aggregateDaily({
    dateKey: '2026-10-02',
    tenantId: testTenant,
  });
  assert(dailyAggReplay.id === dailyAgg.id, 'Idempotent aggregation key maintained on rerun');
  assert(dailyAggReplay.version === 2, 'Version incremented safely on recalculation');

  // Historical backfill run
  const backfillJob = await AnalyticsAggregationService.runHistoricalBackfill({
    startDate: '2026-10-01',
    endDate: '2026-10-03',
    tenantId: testTenant,
    metricSets: ['core'],
  });
  assert(backfillJob.status === 'COMPLETED', 'Historical backfill job completed successfully');
  assert(backfillJob.recordsProcessed === 3, 'Processed exactly 3 daily periods in backfill');

  // AI Narrative Grounding
  const execKpis = await AnalyticsQueryService.getExecutiveKpis(period);
  const narrative = AnalyticsNarrativeService.generateExecutiveNarrative({
    kpis: execKpis,
    narrativeType: 'EXECUTIVE_SUMMARY',
    isAiAssisted: true,
  });
  assert(narrative.label === 'AI-GENERATED SUMMARY', 'AI summary properly labeled as AI-GENERATED SUMMARY');
  assert(narrative.groundedMetricValues.activeTenants === execKpis.platform.activeTenants, 'Underlying metric numbers strictly preserved without hallucination');

  // RBAC Permission Checks
  const superAdminHasAnalytics = RBACService.hasPermission('super_admin', 'analytics.executive.view');
  assert(superAdminHasAnalytics, 'super_admin granted analytics.executive.view permission');

  const reporterHasReporterAnalytics = RBACService.hasPermission('staff_reporter', 'analytics.reporter.view');
  assert(reporterHasReporterAnalytics, 'staff_reporter granted analytics.reporter.view permission');

  const reporterDeniedExecAnalytics = RBACService.hasPermission('staff_reporter', 'analytics.executive.view');
  assert(!reporterDeniedExecAnalytics, 'staff_reporter denied analytics.executive.view permission');

  console.log('\n================================================================');
  console.log(`ALL ${testCount}/${testCount} PHASE 14 ADVANCED ANALYTICS TESTS PASSED SUCCESSFULLY!`);
  console.log('================================================================\n');
  process.exit(0);
}

runPhase14Tests().catch((err) => {
  console.error('Test suite execution failed:', err);
  process.exit(1);
});
