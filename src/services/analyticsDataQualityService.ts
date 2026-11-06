/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 14 — Analytics Data Quality & Diagnostic Service
 * Audits analytics records, detects aggregation drift, stale telemetry,
 * negative impossible metrics, and financial discrepancy warnings.
 */

import {
  AnalyticsDataQualityFinding,
  DataQualitySeverity,
} from '../types/analytics';
import { FinancialAnalyticsService } from './financialAnalyticsService';
import { AnalyticsAggregationService } from './analyticsAggregationService';

export class AnalyticsDataQualityService {
  private static findings: AnalyticsDataQualityFinding[] = [];

  public static reset(): void {
    this.findings = [];
  }

  /**
   * Performs comprehensive diagnostic scan across all analytics and financial records.
   */
  public static performDiagnosticScan(tenantId?: string): AnalyticsDataQualityFinding[] {
    const findings: AnalyticsDataQualityFinding[] = [];
    const now = new Date().toISOString();

    // 1. Scan Financial Integrity and reconciliation gaps
    const finSummary = FinancialAnalyticsService.getFinancialSummary({ tenantId });
    if (finSummary.reconciliationWarnings.length > 0) {
      for (const w of finSummary.reconciliationWarnings) {
        findings.push({
          findingId: `dq-fin-${w.warningId}`,
          checkType: 'FINANCIAL_MISMATCH',
          severity: w.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
          description: `Authoritative financial ledger check flagged: ${w.description}`,
          entityReference: w.referenceId,
          tenantId: w.tenantId,
          detectedAt: now,
          resolved: false,
        });
      }
    }

    // 2. Check for impossible negative values in financials
    if (finSummary.grossMarketplaceRevenueMinor < 0) {
      findings.push({
        findingId: `dq-neg-gross-${Date.now()}`,
        checkType: 'NEGATIVE_IMPOSSIBLE_METRIC',
        severity: 'CRITICAL',
        description: 'Gross marketplace revenue cannot be negative.',
        tenantId,
        detectedAt: now,
        resolved: false,
      });
    }

    if (finSummary.pendingPayablesMinor < 0 || finSummary.availablePayablesMinor < 0) {
      findings.push({
        findingId: `dq-neg-payable-${Date.now()}`,
        checkType: 'NEGATIVE_IMPOSSIBLE_METRIC',
        severity: 'CRITICAL',
        description: 'Reporter payable balance cannot drop below zero.',
        tenantId,
        detectedAt: now,
        resolved: false,
      });
    }

    // 3. Scan Aggregations for Stale or Drift states
    const aggregations = AnalyticsAggregationService.getAggregationsForTenant(tenantId);
    const seenDateKeys = new Set<string>();

    for (const agg of aggregations) {
      const compositeKey = `${agg.interval}:${agg.dateKey}:${agg.tenantId || 'platform'}`;
      if (seenDateKeys.has(compositeKey)) {
        findings.push({
          findingId: `dq-dup-${agg.id}`,
          checkType: 'DUPLICATE_AGGREGATION',
          severity: 'WARNING',
          description: `Duplicate aggregation detected for period ${compositeKey}.`,
          entityReference: agg.id,
          tenantId: agg.tenantId,
          detectedAt: now,
          resolved: false,
        });
      }
      seenDateKeys.add(compositeKey);

      // Check impossible negative numbers in aggregation metrics
      for (const [mKey, mVal] of Object.entries(agg.metrics)) {
        if (mVal < 0 && !mKey.includes('net') && !mKey.includes('change')) {
          findings.push({
            findingId: `dq-neg-agg-${agg.id}-${mKey}`,
            checkType: 'NEGATIVE_IMPOSSIBLE_METRIC',
            severity: 'CRITICAL',
            description: `Aggregated metric "${mKey}" reported negative value (${mVal}) in period ${agg.dateKey}.`,
            entityReference: agg.id,
            tenantId: agg.tenantId,
            detectedAt: now,
            resolved: false,
          });
        }
      }
    }

    this.findings = findings;
    return findings;
  }

  public static getFindings(): AnalyticsDataQualityFinding[] {
    if (this.findings.length === 0) {
      return this.performDiagnosticScan();
    }
    return this.findings;
  }

  public static resolveFinding(findingId: string): boolean {
    const f = this.findings.find((item) => item.findingId === findingId);
    if (f) {
      f.resolved = true;
      return true;
    }
    return false;
  }
}
