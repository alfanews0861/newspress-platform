/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 7 — Usage Metering Service
 */

import {
  UsageRecord,
  UsageMetric,
  PublishingPlanId,
} from '../types/billing';

export class UsageMeteringService {
  private static usageStore: Map<string, UsageRecord[]> = new Map(); // tenantId -> records
  private static idempotencyKeys: Set<string> = new Set();

  public static resetStore(): void {
    this.usageStore.clear();
    this.idempotencyKeys.clear();
  }

  /**
   * Record usage with idempotency check
   */
  public static recordUsage(params: {
    tenantId: string;
    subscriptionId: string;
    planId: PublishingPlanId;
    metric: UsageMetric;
    quantity: number;
    unit: string;
    sourceEntityType?: string;
    sourceEntityId?: string;
    provider?: string;
    model?: string;
    idempotencyKey?: string;
    metadata?: Record<string, any>;
  }): UsageRecord {
    if (params.idempotencyKey) {
      const fullKey = `${params.tenantId}:${params.idempotencyKey}`;
      if (this.idempotencyKeys.has(fullKey)) {
        // Return existing record if found
        const tenantRecords = this.usageStore.get(params.tenantId) || [];
        const existing = tenantRecords.find((r) => r.idempotencyKey === params.idempotencyKey);
        if (existing) return existing;
      }
      this.idempotencyKeys.add(fullKey);
    }

    const usageId = `use-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const record: UsageRecord = {
      usageId,
      tenantId: params.tenantId,
      subscriptionId: params.subscriptionId,
      planId: params.planId,
      metric: params.metric,
      quantity: Math.max(0, params.quantity),
      unit: params.unit,
      sourceEntityType: params.sourceEntityType,
      sourceEntityId: params.sourceEntityId,
      provider: params.provider,
      model: params.model,
      timestamp: new Date().toISOString(),
      idempotencyKey: params.idempotencyKey,
      metadata: params.metadata,
    };

    const records = this.usageStore.get(params.tenantId) || [];
    records.push(record);
    this.usageStore.set(params.tenantId, records);

    return record;
  }

  /**
   * Calculate aggregated usage for a metric within a specific period
   */
  public static getUsageForPeriod(
    tenantId: string,
    metric: UsageMetric | UsageMetric[],
    periodStart: string,
    periodEnd: string
  ): number {
    const records = this.usageStore.get(tenantId) || [];
    const metricsToInclude = Array.isArray(metric) ? metric : [metric];

    const startTs = new Date(periodStart).getTime();
    const endTs = new Date(periodEnd).getTime();

    return records
      .filter((r) => {
        const t = new Date(r.timestamp).getTime();
        return metricsToInclude.includes(r.metric) && t >= startTs && t <= endTs;
      })
      .reduce((sum, r) => sum + r.quantity, 0);
  }

  /**
   * Get all usage records for a tenant
   */
  public static getTenantUsageRecords(tenantId: string): UsageRecord[] {
    return this.usageStore.get(tenantId) || [];
  }
}
