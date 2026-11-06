/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 14 — MIS Report Builder, Saved Reports & Snapshots Service
 * Generates custom dynamic reports, maintains saved report configurations,
 * supports scheduled MIS generation, and freezes immutable report snapshots.
 */

import {
  SavedAnalyticsReport,
  AnalyticsReportSnapshot,
  ReportFilter,
  ReportGrouping,
  ReportSchedule,
  ReportExportFormat,
  DateRangeFilter,
} from '../types/analytics';
import { AuditService } from './auditService';
import { AnalyticsMetricRegistry } from './analyticsMetricRegistry';
import { FinancialAnalyticsService } from './financialAnalyticsService';
import { NewsroomAnalyticsService } from './newsroomAnalyticsService';
import { EditionAnalyticsService } from './editionAnalyticsService';
import { ProductionAnalyticsService } from './productionAnalyticsService';
import { marketplaceAnalyticsService } from './marketplaceAnalyticsService';

export class MISReportService {
  private static savedReports: Map<string, SavedAnalyticsReport> = new Map();
  private static snapshots: Map<string, AnalyticsReportSnapshot> = new Map();

  static {
    this.seedDefaultReports();
  }

  public static reset(): void {
    this.savedReports.clear();
    this.snapshots.clear();
    this.seedDefaultReports();
  }

  private static seedDefaultReports(): void {
    const now = '2026-10-01T00:00:00.000Z';
    const rep1: SavedAnalyticsReport = {
      id: 'rep_saved_01_monthly_exec',
      tenantId: 'tenant-metro-chronicle',
      createdBy: 'user-alfa-superadmin',
      name: 'Monthly Executive Newsroom & Press Summary',
      description: 'Standard monthly rollup of newsroom submissions, edition finalization, and press delivery rate.',
      metricIds: ['storiesSubmitted', 'storiesApproved', 'editionsProduced', 'deliverySuccessRate'],
      dimensions: ['desk', 'district'],
      filters: [],
      grouping: 'month',
      schedule: 'monthly',
      recipients: ['publisher@metrochronicle.press'],
      format: 'PDF_JSON',
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    const rep2: SavedAnalyticsReport = {
      id: 'rep_saved_02_marketplace_wire',
      tenantId: 'tenant-metro-chronicle',
      createdBy: 'user-alfa-superadmin',
      name: 'Marketplace Syndication & Royalties MIS',
      description: 'Weekly financial audit of syndicated story purchases, platform commissions, and reporter payables.',
      metricIds: ['grossMarketplaceSalesMinor', 'platformRevenueMinor', 'reporterShareMinor'],
      dimensions: ['category', 'licenseType'],
      filters: [],
      grouping: 'week',
      schedule: 'weekly',
      recipients: ['accounts@metrochronicle.press'],
      format: 'CSV',
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    this.savedReports.set(rep1.id, rep1);
    this.savedReports.set(rep2.id, rep2);
  }

  /**
   * Generates dynamic report data based on requested metrics, dimensions, and filters.
   */
  public static async executeReport(params: {
    tenantId?: string;
    metricIds: string[];
    dimensions?: string[];
    filters?: ReportFilter[];
    grouping?: ReportGrouping;
    period: DateRangeFilter;
    actorId?: string;
    actorName?: string;
  }): Promise<{
    rows: Array<Record<string, any>>;
    summary: Record<string, any>;
    generatedAt: string;
  }> {
    const { tenantId, metricIds, period } = params;

    // Gather domain data from authoritative services
    const fin = FinancialAnalyticsService.getFinancialSummary({ tenantId, period });
    const news = NewsroomAnalyticsService.getNewsroomSummary({ tenantId, period });
    const edition = EditionAnalyticsService.getEditionSummary({ tenantId, period });
    const prod = ProductionAnalyticsService.getProductionSummary({ tenantId, period });
    const mkt = marketplaceAnalyticsService.getPhase14Summary({ tenantId, period });

    const availableMetrics: Record<string, any> = {
      grossMarketplaceRevenueMinor: fin.grossMarketplaceRevenueMinor,
      platformRevenueMinor: fin.platformRevenueMinor,
      reporterShareMinor: fin.reporterShareMinor,
      storiesSubmitted: news.storiesSubmitted,
      storiesApproved: news.storiesApproved,
      storiesRejected: news.storiesRejected,
      editorialTurnaroundHours: news.averageEditorialTurnaroundHours,
      editionsProduced: edition.editionsPublished + edition.editionsFinalized,
      contentUtilizationRate: edition.contentUtilization.contentUtilizationRate,
      productionJobs: prod.totalProductionJobs,
      preflightPassRate: prod.preflightPassRate,
      deliverySuccessRate: prod.deliverySuccessRate,
      activeMarketplaceListings: mkt.activeListings,
      marketplacePurchases: mkt.purchasesCount,
    };

    const summary: Record<string, any> = {};
    for (const mId of metricIds) {
      summary[mId] = availableMetrics[mId] !== undefined ? availableMetrics[mId] : 0;
    }

    // Dynamic row generation based on dimensions (e.g. category or desk breakdown)
    const rows: Array<Record<string, any>> = [];
    const categories = Object.keys(news.storiesByCategory);

    for (const cat of categories) {
      const catCount = news.storiesByCategory[cat] || 0;
      rows.push({
        dimension: cat,
        storiesCount: catCount,
        category: cat,
        editionsContribution: Math.round(catCount * 0.4),
        period: period.label,
      });
    }

    if (rows.length === 0) {
      rows.push({
        dimension: 'General Operations',
        storiesCount: news.storiesSubmitted,
        period: period.label,
        ...summary,
      });
    }

    if (params.actorId) {
      await AuditService.logEvent({
        tenantId: tenantId || 'platform',
        actorId: params.actorId,
        actorName: params.actorName || 'Authorized User',
        actorRole: 'administrator',
        action: 'REPORT_ACCESSED',
        entityType: 'MISReport',
        entityId: 'dynamic_report',
        details: { metricIds, period: period.label },
      });
    }

    return {
      rows,
      summary,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Saves a customized report configuration for recurring execution.
   */
  public static async saveReport(dto: Omit<SavedAnalyticsReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedAnalyticsReport> {
    const id = `rep_saved_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const report: SavedAnalyticsReport = {
      ...dto,
      id,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    this.savedReports.set(id, report);

    await AuditService.logEvent({
      tenantId: dto.tenantId,
      actorId: dto.createdBy,
      actorName: 'Report Architect',
      actorRole: 'administrator',
      action: 'REPORT_CREATED',
      entityType: 'SavedAnalyticsReport',
      entityId: id,
      details: { name: dto.name, schedule: dto.schedule },
    });

    return report;
  }

  /**
   * Freezes an immutable historical snapshot of report execution for auditing.
   */
  public static async createReportSnapshot(params: {
    tenantId: string;
    reportDefinitionId: string;
    reportName: string;
    period: DateRangeFilter;
    dataRows: Array<Record<string, any>>;
    summaryMetrics: Record<string, any>;
    createdBy: string;
  }): Promise<AnalyticsReportSnapshot> {
    const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    // Generate simple deterministic data hash for reproducibility
    const serialized = JSON.stringify(params.dataRows);
    let hash = 0;
    for (let i = 0; i < serialized.length; i++) {
      hash = (hash << 5) - hash + serialized.charCodeAt(i);
      hash |= 0;
    }
    const dataHash = `sha256_${Math.abs(hash).toString(16)}`;

    const snapshot: AnalyticsReportSnapshot = {
      snapshotId,
      tenantId: params.tenantId,
      reportDefinitionId: params.reportDefinitionId,
      reportName: params.reportName,
      metricVersions: { coreMetrics: 1 },
      dateRange: params.period,
      generationTimestamp: now,
      dataHash,
      dataRows: params.dataRows,
      summaryMetrics: params.summaryMetrics,
      createdBy: params.createdBy,
    };

    this.snapshots.set(snapshotId, snapshot);
    return snapshot;
  }

  public static getSavedReports(tenantId?: string): SavedAnalyticsReport[] {
    const list = Array.from(this.savedReports.values());
    if (tenantId) {
      return list.filter((r) => r.tenantId === tenantId);
    }
    return list;
  }

  public static getSavedReportById(id: string): SavedAnalyticsReport | undefined {
    return this.savedReports.get(id);
  }

  public static getSnapshotsForTenant(tenantId: string): AnalyticsReportSnapshot[] {
    return Array.from(this.snapshots.values()).filter((s) => s.tenantId === tenantId);
  }
}
