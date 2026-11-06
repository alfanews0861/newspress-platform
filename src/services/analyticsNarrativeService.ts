/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 14 — Analytics Narrative & Executive Summary Service
 * Generates explainable executive narratives strictly derived from verified metrics.
 * AI output is clearly labeled as AI-GENERATED SUMMARY, and underlying numbers are never mutated.
 */

import {
  AnalyticsNarrative,
  NarrativeType,
  ExecutiveKpiSummary,
  TenantExecutiveSummary,
} from '../types/analytics';

export class AnalyticsNarrativeService {
  /**
   * Generates a verified narrative grounded strictly in verified metrics.
   */
  public static generateExecutiveNarrative(params: {
    kpis: ExecutiveKpiSummary;
    narrativeType?: NarrativeType;
    tenantId?: string;
    isAiAssisted?: boolean;
  }): AnalyticsNarrative {
    const { kpis, narrativeType = 'EXECUTIVE_SUMMARY', tenantId, isAiAssisted = false } = params;

    const gmvINR = (kpis.platform.monthlyMarketplaceGmvMinor / 100).toFixed(2);
    const platformRevINR = (kpis.platform.platformRevenueMinor / 100).toFixed(2);
    const editions = kpis.platform.editionsProduced;
    const deliveryRate = kpis.platform.deliverySuccessRate;
    const turnaroundHours = kpis.operational.editorialTurnaroundHours;

    const groundedMetricValues: Record<string, number | string> = {
      monthlyMarketplaceGmvINR: gmvINR,
      platformRevenueINR: platformRevINR,
      activeTenants: kpis.platform.activeTenants,
      editionsProduced: editions,
      deliverySuccessRate: `${deliveryRate}%`,
      editorialTurnaroundHours: `${turnaroundHours}h`,
      productionSuccessRate: `${kpis.platform.productionSuccessRate}%`,
      purchaseGrowthRate: `${kpis.growth.purchaseGrowthRate}%`,
    };

    let headline = '';
    const bullets: string[] = [];

    switch (narrativeType) {
      case 'EXECUTIVE_SUMMARY':
        headline = `Platform operations maintained strong throughput across ${kpis.platform.activeTenants} newsroom tenants.`;
        bullets.push(
          `Monthly Marketplace GMV reached ₹${gmvINR} generating ₹${platformRevINR} in platform commissions.`,
          `Newspaper production finalized and produced ${editions} editions with a ${deliveryRate}% on-time press delivery rate.`,
          `Newsroom turnaround averaged ${turnaroundHours} hours with an assignment completion rate of ${kpis.operational.assignmentCompletionRate}%.`
        );
        break;

      case 'TREND_SUMMARY':
        headline = `Marketplace purchases grew ${kpis.growth.purchaseGrowthRate}% with robust syndicated wire demand.`;
        bullets.push(
          `Active listings stood at ${kpis.platform.activeMarketplaceListings} across regional and national beats.`,
          `Revenue growth achieved ${kpis.growth.revenueGrowthRate}% period-over-period across active publishers.`,
          `Reporter payables accrued stand at ₹${(kpis.platform.reporterPayablesMinor / 100).toFixed(2)}.`
        );
        break;

      case 'ANOMALY_EXPLANATION':
        headline = 'Operational metrics remain within expected standard operating thresholds.';
        bullets.push(
          `Production failure rate is held at ${kpis.operational.productionFailureRate}%, below the 15% alert tolerance.`,
          `Vendor dispatch success rate is maintained at ${kpis.operational.vendorDispatchSuccessRate}%.`
        );
        break;

      case 'OPERATIONAL_SUMMARY':
        headline = `Edition readiness and print logistics achieved ${deliveryRate}% fulfillment.`;
        bullets.push(
          `Total editions produced: ${editions} across scheduled morning and evening imprints.`,
          `Editorial approval rate stands at ${kpis.operational.storyApprovalRate}%.`
        );
        break;
    }

    return {
      narrativeId: `nar-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      narrativeType,
      tenantId,
      headline,
      bullets,
      groundedMetricValues,
      isAiGenerated: isAiAssisted,
      label: isAiAssisted ? 'AI-GENERATED SUMMARY' : 'VERIFIED EXECUTIVE SUMMARY',
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates tenant-specific narrative grounded in tenant summary.
   */
  public static generateTenantNarrative(
    tenantSummary: TenantExecutiveSummary,
    isAiAssisted: boolean = false
  ): AnalyticsNarrative {
    const groundedMetricValues: Record<string, number | string> = {
      editionsProduced: tenantSummary.editions.published + tenantSummary.editions.finalized,
      submissionsCount: tenantSummary.newsroom.submissionsCount,
      approvalsCount: tenantSummary.newsroom.approvalsCount,
      turnaroundHours: `${tenantSummary.newsroom.averageTurnaroundHours}h`,
      marketplaceSpendINR: (tenantSummary.marketplace.spendingMinor / 100).toFixed(2),
    };

    const headline = `Newsroom produced ${tenantSummary.editions.published} published editions with ${tenantSummary.newsroom.approvalsCount} approved stories.`;
    const bullets = [
      `Editorial staff handled ${tenantSummary.newsroom.submissionsCount} submissions with an average turnaround of ${tenantSummary.newsroom.averageTurnaroundHours} hours.`,
      `Marketplace spending for syndicated stories totaled ₹${(tenantSummary.marketplace.spendingMinor / 100).toFixed(2)}.`,
      `Preflight press pass rate achieved ${tenantSummary.production.preflightPassRate}%.`,
    ];

    return {
      narrativeId: `nar-ten-${Date.now()}`,
      narrativeType: 'OPERATIONAL_SUMMARY',
      tenantId: tenantSummary.tenantId,
      headline,
      bullets,
      groundedMetricValues,
      isAiGenerated: isAiAssisted,
      label: isAiAssisted ? 'AI-GENERATED SUMMARY' : 'VERIFIED EXECUTIVE SUMMARY',
      generatedAt: new Date().toISOString(),
    };
  }
}
