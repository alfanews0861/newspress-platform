/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 7 — Authoritative Subscription & Entitlement Engine
 */

import {
  PublisherSubscription,
  SubscriptionEntitlementSnapshot,
  PublishingPlanId,
  PlanFeatures,
  PlanLimits,
  UsageMetric,
} from '../types/billing';
import { PlanCatalogService } from './planCatalogService';
import { UsageMeteringService } from './usageMeteringService';
import { EntitlementGrantService } from './entitlementGrantService';
import { AuditService } from './auditService';

export class SubscriptionEntitlementService {
  private static subscriptionStore: Map<string, PublisherSubscription> = new Map(); // tenantId -> sub
  private static snapshotStore: Map<string, SubscriptionEntitlementSnapshot> = new Map(); // tenantId -> snapshot

  public static resetStore(): void {
    this.subscriptionStore.clear();
    this.snapshotStore.clear();
  }

  /**
   * Get or initialize a subscription for a tenant.
   * If none exists, creates a default BASIC or trial subscription and freezes an entitlement snapshot.
   */
  public static getOrCreateSubscription(
    tenantId: string,
    defaultPlan: PublishingPlanId = 'BASIC'
  ): { subscription: PublisherSubscription; snapshot: SubscriptionEntitlementSnapshot } {
    let sub = this.subscriptionStore.get(tenantId);
    let snapshot = this.snapshotStore.get(tenantId);

    if (!sub || !snapshot) {
      const plan = PlanCatalogService.getPlan(defaultPlan) || PlanCatalogService.getPlan('BASIC')!;
      const now = new Date();
      const periodStart = now.toISOString();

      const isTrial = plan.trialDays > 0;
      const periodEnd = new Date(now);
      if (isTrial) {
        periodEnd.setDate(now.getDate() + plan.trialDays);
      } else {
        periodEnd.setMonth(now.getMonth() + 1);
      }

      sub = {
        subscriptionId: `sub-${tenantId}-${Date.now()}`,
        tenantId,
        planId: plan.planId,
        planVersion: plan.version,
        status: isTrial ? 'TRIALING' : 'ACTIVE',
        billingInterval: plan.billingInterval,
        currency: plan.currency,
        price: plan.price,
        provider: 'MOCK',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd.toISOString(),
        trialStart: isTrial ? periodStart : undefined,
        trialEnd: isTrial ? periodEnd.toISOString() : undefined,
        cancelAtPeriodEnd: false,
        overagePolicy: 'BLOCK',
        createdAt: periodStart,
        updatedAt: periodStart,
      };

      snapshot = {
        snapshotId: `snap-${tenantId}-v${plan.version}`,
        tenantId,
        subscriptionId: sub.subscriptionId,
        planId: plan.planId,
        planVersion: plan.version,
        features: { ...plan.features },
        limits: { ...plan.limits },
        capturedAt: periodStart,
      };

      this.subscriptionStore.set(tenantId, sub);
      this.snapshotStore.set(tenantId, snapshot);
    }

    return { subscription: sub, snapshot };
  }

  /**
   * Directly set or replace tenant subscription (used by checkout, migration, upgrades, admin)
   */
  public static setSubscription(
    tenantId: string,
    sub: PublisherSubscription,
    features?: PlanFeatures,
    limits?: PlanLimits
  ): { subscription: PublisherSubscription; snapshot: SubscriptionEntitlementSnapshot } {
    const plan = PlanCatalogService.getPlanVersion(sub.planId, sub.planVersion)?.snapshot ||
      PlanCatalogService.getPlan(sub.planId) ||
      PlanCatalogService.getPlan('BASIC')!;

    const snapshot: SubscriptionEntitlementSnapshot = {
      snapshotId: `snap-${tenantId}-v${sub.planVersion}-${Date.now()}`,
      tenantId,
      subscriptionId: sub.subscriptionId,
      planId: sub.planId,
      planVersion: sub.planVersion,
      features: features ? { ...features } : { ...plan.features },
      limits: limits ? { ...limits } : { ...plan.limits },
      capturedAt: new Date().toISOString(),
    };

    this.subscriptionStore.set(tenantId, sub);
    this.snapshotStore.set(tenantId, snapshot);

    return { subscription: sub, snapshot };
  }

  public static getSubscription(tenantId: string): PublisherSubscription | null {
    return this.subscriptionStore.get(tenantId) || null;
  }

  public static getSnapshot(tenantId: string): SubscriptionEntitlementSnapshot | null {
    return this.snapshotStore.get(tenantId) || null;
  }

  /**
   * Evaluate effective features and limits for tenant including active promotional grants
   */
  public static getEffectiveEntitlements(tenantId: string): {
    features: PlanFeatures;
    limits: PlanLimits;
    sub: PublisherSubscription;
  } {
    const { subscription: sub, snapshot } = this.getOrCreateSubscription(tenantId);
    let effectiveFeatures = { ...snapshot.features };
    let effectiveLimits = { ...snapshot.limits };

    // Apply active promotional grants
    const activeGrants = EntitlementGrantService.getActiveGrants(tenantId);
    for (const grant of activeGrants) {
      if (grant.features) {
        effectiveFeatures = { ...effectiveFeatures, ...grant.features };
      }
      if (grant.limits) {
        effectiveLimits = { ...effectiveLimits, ...grant.limits };
      }
    }

    return { features: effectiveFeatures, limits: effectiveLimits, sub };
  }

  /**
   * Check if subscription status is operational
   */
  public static isSubscriptionOperational(sub: PublisherSubscription): {
    operational: boolean;
    reason?: string;
  } {
    if (['ACTIVE', 'TRIALING'].includes(sub.status)) {
      return { operational: true };
    }

    if (sub.status === 'GRACE_PERIOD') {
      // Grace period permits read and restricted operations, but flag warning
      return { operational: true, reason: 'Subscription is in GRACE_PERIOD due to pending payment.' };
    }

    if (sub.status === 'PAST_DUE') {
      return { operational: true, reason: 'Subscription is PAST_DUE. Payment required.' };
    }

    return {
      operational: false,
      reason: `Subscription status '${sub.status}' does not allow billable operations. Please renew or update payment method.`,
    };
  }

  /**
   * Can tenant use a specific boolean feature?
   */
  public static canUseFeature(
    tenantId: string,
    featureKey: keyof PlanFeatures
  ): { allowed: boolean; reason?: string } {
    const { features, sub } = this.getEffectiveEntitlements(tenantId);
    const statusCheck = this.isSubscriptionOperational(sub);
    if (!statusCheck.operational) {
      return { allowed: false, reason: statusCheck.reason };
    }

    const val = features[featureKey];
    if (typeof val === 'boolean') {
      return {
        allowed: val,
        reason: val ? undefined : `Feature '${featureKey}' is not included in your ${sub.planId} plan.`,
      };
    }

    return { allowed: Boolean(val) };
  }

  /**
   * Can tenant use AI operation?
   */
  public static canUseAI(
    tenantId: string,
    operationType?: string,
    requestedTier?: 'NONE' | 'LIGHT' | 'ADVANCED'
  ): { allowed: boolean; reason?: string } {
    const { features, limits, sub } = this.getEffectiveEntitlements(tenantId);
    const statusCheck = this.isSubscriptionOperational(sub);
    if (!statusCheck.operational) {
      return { allowed: false, reason: statusCheck.reason };
    }

    if (!features.generativeAiAllowed || sub.planId === 'BASIC' || features.aiTier === 'NONE') {
      return {
        allowed: false,
        reason: 'Basic plan does not permit Generative AI editorial assistance. Upgrade to Standard or Premium.',
      };
    }

    if (requestedTier === 'ADVANCED' && features.aiTier !== 'ADVANCED') {
      return {
        allowed: false,
        reason: 'Advanced model tier features require the Premium Publishing Plan.',
      };
    }

    // Monthly AI quota check
    const usedAI = UsageMeteringService.getUsageForPeriod(
      tenantId,
      [
        'AI_HEADLINE',
        'AI_SUMMARY',
        'AI_COPY_EDIT',
        'AI_RESTRUCTURE',
        'AI_CAPTION',
        'AI_SECTION_CLASSIFICATION',
        'AI_PHOTO_ANALYSIS',
      ],
      sub.currentPeriodStart,
      sub.currentPeriodEnd
    );

    if (limits.monthlyAIUsageLimit > 0 && usedAI >= limits.monthlyAIUsageLimit) {
      AuditService.logEvent({
        tenantId,
        actorId: 'system',
        actorName: 'Entitlement Engine',
        actorRole: 'system',
        action: 'USAGE_LIMIT_REACHED',
        entityType: 'PublisherSubscription',
        entityId: sub.subscriptionId,
        reason: `Monthly AI operation limit of ${limits.monthlyAIUsageLimit} reached.`,
      });

      return {
        allowed: false,
        reason: `Monthly AI operation limit of ${limits.monthlyAIUsageLimit} reached for current billing cycle.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Can tenant create a newspaper edition?
   */
  public static canCreateEdition(tenantId: string): { allowed: boolean; reason?: string } {
    const { limits, sub } = this.getEffectiveEntitlements(tenantId);
    const statusCheck = this.isSubscriptionOperational(sub);
    if (!statusCheck.operational) {
      return { allowed: false, reason: statusCheck.reason };
    }

    const usedEditions = UsageMeteringService.getUsageForPeriod(
      tenantId,
      'EDITION_CREATED',
      sub.currentPeriodStart,
      sub.currentPeriodEnd
    );

    if (limits.editionLimit > 0 && usedEditions >= limits.editionLimit) {
      return {
        allowed: false,
        reason: `Monthly newspaper edition creation limit of ${limits.editionLimit} reached for current plan. Upgrade plan for higher capacity.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Can tenant add another staff member?
   */
  public static canAddStaffMember(
    tenantId: string,
    currentStaffCount: number
  ): { allowed: boolean; reason?: string } {
    const { limits, sub } = this.getEffectiveEntitlements(tenantId);
    if (limits.staffMemberLimit > 0 && currentStaffCount >= limits.staffMemberLimit) {
      return {
        allowed: false,
        reason: `Staff member limit of ${limits.staffMemberLimit} reached for ${sub.planId} plan.`,
      };
    }
    return { allowed: true };
  }

  /**
   * Can tenant add another reporter?
   */
  public static canAddReporter(
    tenantId: string,
    currentReporterCount: number
  ): { allowed: boolean; reason?: string } {
    const { limits, sub } = this.getEffectiveEntitlements(tenantId);
    if (limits.reporterLimit > 0 && currentReporterCount >= limits.reporterLimit) {
      return {
        allowed: false,
        reason: `Reporter limit of ${limits.reporterLimit} reached for ${sub.planId} plan.`,
      };
    }
    return { allowed: true };
  }

  /**
   * Can tenant generate print / digital PDF?
   */
  public static canGeneratePDF(
    tenantId: string,
    pdfType: 'print' | 'digital' = 'print'
  ): { allowed: boolean; reason?: string } {
    const { features, sub } = this.getEffectiveEntitlements(tenantId);
    const statusCheck = this.isSubscriptionOperational(sub);
    if (!statusCheck.operational) return { allowed: false, reason: statusCheck.reason };

    if (pdfType === 'print' && !features.printPdfGeneration) {
      return { allowed: false, reason: 'Print PDF generation is not enabled for your plan.' };
    }
    if (pdfType === 'digital' && !features.digitalPdfGeneration) {
      return { allowed: false, reason: 'Digital PDF generation is not enabled for your plan.' };
    }
    return { allowed: true };
  }

  /**
   * Can tenant use news marketplace?
   */
  public static canUseMarketplace(tenantId: string): { allowed: boolean; reason?: string } {
    const { features, sub } = this.getEffectiveEntitlements(tenantId);
    if (!features.marketplaceAccess) {
      return { allowed: false, reason: 'Marketplace syndication access is not enabled on your current plan.' };
    }
    return { allowed: true };
  }

  /**
   * Calculate remaining usage for a given metric
   */
  public static getRemainingUsage(
    tenantId: string,
    metric: UsageMetric
  ): { used: number; limit: number; remaining: number } {
    const { limits, sub } = this.getEffectiveEntitlements(tenantId);

    let limit = 0;
    let metricsToSum: UsageMetric[] = [metric];

    switch (metric) {
      case 'AI_HEADLINE':
      case 'AI_SUMMARY':
      case 'AI_COPY_EDIT':
      case 'AI_RESTRUCTURE':
      case 'AI_CAPTION':
      case 'AI_SECTION_CLASSIFICATION':
      case 'AI_PHOTO_ANALYSIS':
        limit = limits.monthlyAIUsageLimit;
        metricsToSum = [
          'AI_HEADLINE',
          'AI_SUMMARY',
          'AI_COPY_EDIT',
          'AI_RESTRUCTURE',
          'AI_CAPTION',
          'AI_SECTION_CLASSIFICATION',
          'AI_PHOTO_ANALYSIS',
        ];
        break;
      case 'EDITION_CREATED':
        limit = limits.editionLimit;
        break;
      case 'NEWS_PROCESSED':
        limit = limits.monthlyNewsProcessingLimit;
        break;
      case 'IMAGE_ENHANCEMENT':
        limit = limits.imageProcessingLimit;
        break;
      case 'STORAGE_BYTES':
        limit = limits.storageLimitMb * 1024 * 1024;
        break;
      default:
        limit = 0;
    }

    const used = UsageMeteringService.getUsageForPeriod(
      tenantId,
      metricsToSum,
      sub.currentPeriodStart,
      sub.currentPeriodEnd
    );

    const remaining = limit <= 0 ? (limit === -1 ? Infinity : 0) : Math.max(0, limit - used);

    return { used, limit, remaining };
  }
}
