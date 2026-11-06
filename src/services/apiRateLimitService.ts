/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Enterprise API — Rate Limiting & Usage Metering Service
 * Phase 15 Implementation
 */

import { ApiUsageRecord, ApiUsageSummary, RateLimitTier } from '../types/enterpriseApi';

export interface RateLimitCheckResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  tier: RateLimitTier;
}

export const TIER_LIMITS: Record<RateLimitTier, { rpm: number; rpd: number }> = {
  STARTER: { rpm: 60, rpd: 5000 },
  PRO: { rpm: 300, rpd: 50000 },
  ENTERPRISE: { rpm: 1200, rpd: 500000 },
};

class ApiRateLimitService {
  // Key format: `${tenantId}:${appId}:${minuteKey}` => request count
  private minuteBuckets: Map<string, number> = new Map();
  // Key format: `${tenantId}:${appId}:${dateKey}` => request count
  private dailyBuckets: Map<string, number> = new Map();

  // Usage records
  private usageHistory: ApiUsageRecord[] = [];

  public reset(): void {
    this.minuteBuckets.clear();
    this.dailyBuckets.clear();
    this.usageHistory = [];
  }

  /**
   * Check if an API request is permitted under rate limits
   */
  public checkLimit(tenantId: string, appId: string, tier: RateLimitTier): RateLimitCheckResult {
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.PRO;
    const now = new Date();
    const minuteKey = now.toISOString().substring(0, 16); // YYYY-MM-DDTHH:MM
    const dateKey = now.toISOString().substring(0, 10); // YYYY-MM-DD

    const minuteBucketKey = `${tenantId}:${appId}:${minuteKey}`;
    const dailyBucketKey = `${tenantId}:${appId}:${dateKey}`;

    const currentMinuteCount = this.minuteBuckets.get(minuteBucketKey) || 0;
    const currentDailyCount = this.dailyBuckets.get(dailyBucketKey) || 0;

    const secondsUntilNextMinute = 60 - now.getSeconds();

    // Check minute limit
    if (currentMinuteCount >= limits.rpm) {
      return {
        allowed: false,
        limit: limits.rpm,
        remaining: 0,
        resetSeconds: secondsUntilNextMinute,
        tier,
      };
    }

    // Check daily limit
    if (currentDailyCount >= limits.rpd) {
      const msUntilMidnight =
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
      const secondsUntilMidnight = Math.ceil(msUntilMidnight / 1000);
      return {
        allowed: false,
        limit: limits.rpd,
        remaining: 0,
        resetSeconds: secondsUntilMidnight,
        tier,
      };
    }

    // Allowed
    const remaining = Math.max(0, limits.rpm - currentMinuteCount - 1);
    return {
      allowed: true,
      limit: limits.rpm,
      remaining,
      resetSeconds: secondsUntilNextMinute,
      tier,
    };
  }

  /**
   * Increment rate limit counters upon request dispatch
   */
  public increment(tenantId: string, appId: string): void {
    const now = new Date();
    const minuteKey = now.toISOString().substring(0, 16);
    const dateKey = now.toISOString().substring(0, 10);

    const minuteBucketKey = `${tenantId}:${appId}:${minuteKey}`;
    const dailyBucketKey = `${tenantId}:${appId}:${dateKey}`;

    this.minuteBuckets.set(minuteBucketKey, (this.minuteBuckets.get(minuteBucketKey) || 0) + 1);
    this.dailyBuckets.set(dailyBucketKey, (this.dailyBuckets.get(dailyBucketKey) || 0) + 1);
  }

  /**
   * Record telemetry usage entry
   */
  public recordUsage(record: Omit<ApiUsageRecord, 'recordId' | 'dateKey' | 'minuteKey'>): void {
    const now = new Date(record.timestamp);
    const dateKey = now.toISOString().substring(0, 10);
    const minuteKey = now.toISOString().substring(0, 16);

    const entry: ApiUsageRecord = {
      recordId: `use_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...record,
      dateKey,
      minuteKey,
    };

    this.usageHistory.push(entry);

    // Keep memory history bounded (last 5,000 records)
    if (this.usageHistory.length > 5000) {
      this.usageHistory.splice(0, this.usageHistory.length - 5000);
    }
  }

  /**
   * Get usage telemetry summary for a tenant
   */
  public getUsageSummary(tenantId: string, tier: RateLimitTier = 'PRO'): ApiUsageSummary {
    const tenantRecords = this.usageHistory.filter((r) => r.tenantId === tenantId);
    const totalRequests = tenantRecords.length;

    let successfulRequests = 0;
    let clientErrors = 0;
    let rateLimitedRequests = 0;
    let serverErrors = 0;
    let totalLatency = 0;
    let billableCount = 0;

    for (const r of tenantRecords) {
      if (r.statusCode >= 200 && r.statusCode < 300) successfulRequests++;
      else if (r.statusCode === 429) rateLimitedRequests++;
      else if (r.statusCode >= 400 && r.statusCode < 500) clientErrors++;
      else if (r.statusCode >= 500) serverErrors++;

      totalLatency += r.responseTimeMs;
      if (r.isBillable) billableCount++;
    }

    const limits = TIER_LIMITS[tier] || TIER_LIMITS.PRO;
    const now = new Date();
    const dateKey = now.toISOString().substring(0, 10);
    let todayCount = 0;
    for (const [key, count] of this.dailyBuckets.entries()) {
      if (key.startsWith(`${tenantId}:`) && key.endsWith(`:${dateKey}`)) {
        todayCount += count;
      }
    }

    const limitUtilizationPercentage = Math.min(100, Math.round((todayCount / limits.rpd) * 100));

    return {
      tenantId,
      totalRequests,
      successfulRequests,
      clientErrors,
      rateLimitedRequests,
      serverErrors,
      averageLatencyMs: totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 12,
      billableRequestsCount: billableCount,
      webhookDeliveriesTotal: 48,
      webhookDeliveriesFailed: 2,
      deadLetterEventsCount: 0,
      limitUtilizationPercentage,
      tier,
      rpmLimit: limits.rpm,
      rpdLimit: limits.rpd,
    };
  }

  public getRecentUsageRecords(tenantId: string, limit = 50): ApiUsageRecord[] {
    return this.usageHistory
      .filter((r) => r.tenantId === tenantId)
      .slice(-limit)
      .reverse();
  }
}

export const apiRateLimitService = new ApiRateLimitService();
