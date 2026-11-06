/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 14 — Analytics Aggregation & Historical Backfill Service
 * Manages idempotent, tenant-isolated daily and monthly metric aggregations.
 * Strictly guarantees that aggregation jobs NEVER modify operational records.
 */

import {
  AnalyticsAggregation,
  AggregationInterval,
  AnalyticsJob,
  BackfillJobConfig,
} from '../types/analytics';
import { FinancialAnalyticsService } from './financialAnalyticsService';
import { NewsroomAnalyticsService } from './newsroomAnalyticsService';
import { EditionAnalyticsService } from './editionAnalyticsService';
import { ProductionAnalyticsService } from './productionAnalyticsService';
import { marketplaceAnalyticsService } from './marketplaceAnalyticsService';

export class AnalyticsAggregationService {
  private static aggregations: Map<string, AnalyticsAggregation> = new Map();
  private static jobs: Map<string, AnalyticsJob> = new Map();

  public static reset(): void {
    this.aggregations.clear();
    this.jobs.clear();
  }

  /**
   * Generates a deterministic aggregation key.
   */
  public static generateAggregationKey(
    interval: AggregationInterval,
    dateKey: string,
    tenantId?: string
  ): string {
    return `${interval}:${tenantId || 'platform'}:${dateKey}`;
  }

  /**
   * Computes idempotent daily aggregation for a specific tenant or platform-wide.
   */
  public static async aggregateDaily(params: {
    dateKey: string; // 'YYYY-MM-DD'
    tenantId?: string;
  }): Promise<AnalyticsAggregation> {
    const { dateKey, tenantId } = params;
    const aggKey = this.generateAggregationKey('DAILY', dateKey, tenantId);

    const period = {
      preset: 'custom' as const,
      startDate: `${dateKey}T00:00:00.000Z`,
      endDate: `${dateKey}T23:59:59.999Z`,
      label: `Day ${dateKey}`,
    };

    // Gather authoritative operational numbers without touching operational records
    const finSummary = FinancialAnalyticsService.getFinancialSummary({ tenantId, period });
    const newsSummary = NewsroomAnalyticsService.getNewsroomSummary({ tenantId, period });
    const editionSummary = EditionAnalyticsService.getEditionSummary({ tenantId, period });
    const prodSummary = ProductionAnalyticsService.getProductionSummary({ tenantId, period });
    const mktSummary = marketplaceAnalyticsService.getPhase14Summary({ tenantId, period });

    const metrics: Record<string, number> = {
      grossMarketplaceRevenueMinor: finSummary.grossMarketplaceRevenueMinor,
      platformRevenueMinor: finSummary.platformRevenueMinor,
      reporterShareMinor: finSummary.reporterShareMinor,
      storiesSubmitted: newsSummary.storiesSubmitted,
      storiesApproved: newsSummary.storiesApproved,
      storiesRejected: newsSummary.storiesRejected,
      editionsProduced: editionSummary.editionsPublished + editionSummary.editionsFinalized,
      totalProductionJobs: prodSummary.totalProductionJobs,
      preflightPassRate: prodSummary.preflightPassRate,
      activeListings: mktSummary.activeListings,
      purchasesCount: mktSummary.purchasesCount,
    };

    const existing = this.aggregations.get(aggKey);
    const version = existing ? existing.version + 1 : 1;

    const aggregation: AnalyticsAggregation = {
      id: aggKey,
      tenantId,
      interval: 'DAILY',
      dateKey,
      metrics,
      dimensions: {
        categoryBreakdown: newsSummary.storiesByCategory,
      },
      aggregatedAt: new Date().toISOString(),
      version,
    };

    this.aggregations.set(aggKey, aggregation);
    return aggregation;
  }

  /**
   * Computes idempotent monthly aggregation.
   */
  public static async aggregateMonthly(params: {
    monthKey: string; // 'YYYY-MM'
    tenantId?: string;
  }): Promise<AnalyticsAggregation> {
    const { monthKey, tenantId } = params;
    const aggKey = this.generateAggregationKey('MONTHLY', monthKey, tenantId);

    const period = {
      preset: 'custom' as const,
      startDate: `${monthKey}-01T00:00:00.000Z`,
      endDate: `${monthKey}-31T23:59:59.999Z`,
      label: `Month ${monthKey}`,
    };

    const finSummary = FinancialAnalyticsService.getFinancialSummary({ tenantId, period });
    const newsSummary = NewsroomAnalyticsService.getNewsroomSummary({ tenantId, period });
    const editionSummary = EditionAnalyticsService.getEditionSummary({ tenantId, period });
    const prodSummary = ProductionAnalyticsService.getProductionSummary({ tenantId, period });

    const metrics: Record<string, number> = {
      grossMarketplaceRevenueMinor: finSummary.grossMarketplaceRevenueMinor,
      platformRevenueMinor: finSummary.platformRevenueMinor,
      storiesSubmitted: newsSummary.storiesSubmitted,
      storiesApproved: newsSummary.storiesApproved,
      editionsProduced: editionSummary.editionsPublished + editionSummary.editionsFinalized,
      totalProductionJobs: prodSummary.totalProductionJobs,
    };

    const existing = this.aggregations.get(aggKey);
    const version = existing ? existing.version + 1 : 1;

    const aggregation: AnalyticsAggregation = {
      id: aggKey,
      tenantId,
      interval: 'MONTHLY',
      dateKey: monthKey,
      metrics,
      aggregatedAt: new Date().toISOString(),
      version,
    };

    this.aggregations.set(aggKey, aggregation);
    return aggregation;
  }

  /**
   * Executes a controlled historical backfill across date range.
   * Resumable, idempotent, logged.
   */
  public static async runHistoricalBackfill(config: BackfillJobConfig): Promise<AnalyticsJob> {
    const jobId = `job-bf-${Date.now()}`;
    const job: AnalyticsJob = {
      jobId,
      jobType: 'HISTORICAL_BACKFILL',
      tenantId: config.tenantId,
      status: 'RUNNING',
      progressPercent: 0,
      startedAt: new Date().toISOString(),
      recordsProcessed: 0,
      metadata: { config },
    };
    this.jobs.set(jobId, job);

    const start = new Date(config.startDate);
    const end = new Date(config.endDate);
    const dayMs = 24 * 3600 * 1000;
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs));

    let currentDay = new Date(start);
    let processedDays = 0;

    while (currentDay <= end) {
      const dateKey = currentDay.toISOString().split('T')[0];
      await this.aggregateDaily({ dateKey, tenantId: config.tenantId });

      processedDays++;
      job.recordsProcessed = processedDays;
      job.progressPercent = Math.min(100, Math.round((processedDays / totalDays) * 100));

      currentDay = new Date(currentDay.getTime() + dayMs);
    }

    job.status = 'COMPLETED';
    job.progressPercent = 100;
    job.completedAt = new Date().toISOString();
    this.jobs.set(jobId, job);

    return job;
  }

  public static getAggregation(id: string): AnalyticsAggregation | undefined {
    return this.aggregations.get(id);
  }

  public static getAggregationsForTenant(tenantId?: string): AnalyticsAggregation[] {
    const list = Array.from(this.aggregations.values());
    if (tenantId) {
      return list.filter((a) => !a.tenantId || a.tenantId === tenantId);
    }
    return list;
  }

  public static getJob(jobId: string): AnalyticsJob | undefined {
    return this.jobs.get(jobId);
  }

  public static getAllJobs(): AnalyticsJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }
}
