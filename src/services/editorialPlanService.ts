/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Editorial Plan Service
 * Phase 6 — Basic / Standard / Premium Publishing Plans & AI Entitlement Enforcement
 */

import {
  PublishingPlanId,
  AIModelTier,
  PlanFeatureConfig,
  PUBLISHING_PLAN_CONFIGS,
  AIPlanEntitlement,
  AIUsageRecord,
  AIEditorialOutputType,
  AIRequestStatus,
} from '../types/editorialAi';
import { AuditService } from './auditService';
import { SubscriptionEntitlementService } from './subscriptionEntitlementService';
import { UsageMeteringService } from './usageMeteringService';

export class EditorialPlanService {
  private static entitlementsStore: Map<string, AIPlanEntitlement> = new Map();
  private static usageRecordsStore: Map<string, AIUsageRecord[]> = new Map();

  /**
   * Reset store (useful for clean test executions)
   */
  public static resetStore(): void {
    this.entitlementsStore.clear();
    this.usageRecordsStore.clear();
    SubscriptionEntitlementService.resetStore();
    UsageMeteringService.resetStore();
  }

  /**
   * Get or initialize entitlement for a tenant
   */
  public static getTenantEntitlement(tenantId: string, defaultPlan: PublishingPlanId = 'STANDARD'): AIPlanEntitlement {
    // Sync with Phase 7 SubscriptionEntitlementService
    const { subscription: sub, snapshot } = SubscriptionEntitlementService.getOrCreateSubscription(tenantId, defaultPlan);

    let entitlement = this.entitlementsStore.get(tenantId);
    if (!entitlement || entitlement.planId !== sub.planId) {
      const planConfig = PUBLISHING_PLAN_CONFIGS[sub.planId] || PUBLISHING_PLAN_CONFIGS[defaultPlan];
      entitlement = {
        entitlementId: `entitle-${tenantId}-${sub.planId.toLowerCase()}`,
        tenantId,
        planId: sub.planId,
        allowedModelTier: snapshot.features.aiTier || planConfig.allowedModelTier,
        monthlyOperationsLimit: snapshot.limits.monthlyAIUsageLimit,
        currentMonthlyUsage: entitlement?.currentMonthlyUsage || 0,
        features: { ...planConfig },
        periodStart: sub.currentPeriodStart,
        periodEnd: sub.currentPeriodEnd,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      };
      this.entitlementsStore.set(tenantId, entitlement);
    }
    return entitlement;
  }

  /**
   * Set or change tenant publishing plan
   */
  public static setTenantPlan(
    tenantId: string,
    planId: PublishingPlanId,
    actorId: string = 'system',
    actorName: string = 'Publisher Admin',
    actorRole: string = 'administrator'
  ): AIPlanEntitlement {
    const planConfig = PUBLISHING_PLAN_CONFIGS[planId];
    const previous = this.getTenantEntitlement(tenantId);

    // Update Phase 7 SubscriptionEntitlementService
    const { subscription: sub, snapshot } = SubscriptionEntitlementService.getOrCreateSubscription(tenantId, planId);
    sub.planId = planId;
    sub.updatedAt = new Date().toISOString();
    SubscriptionEntitlementService.setSubscription(tenantId, sub);

    const now = new Date();
    const updated: AIPlanEntitlement = {
      ...previous,
      planId,
      allowedModelTier: planConfig.allowedModelTier,
      monthlyOperationsLimit: planConfig.monthlyOperationsLimit,
      features: { ...planConfig },
      updatedAt: now.toISOString(),
    };

    this.entitlementsStore.set(tenantId, updated);

    AuditService.logEvent({
      tenantId,
      actorId,
      actorName,
      actorRole,
      action: 'PLAN_ENTITLEMENT_UPDATED',
      entityType: 'AIPlanEntitlement',
      entityId: updated.entitlementId,
      previousState: { planId: previous.planId, limit: previous.monthlyOperationsLimit },
      newState: { planId: updated.planId, limit: updated.monthlyOperationsLimit },
      reason: `Publishing plan changed to ${planId}`,
    });

    return updated;
  }

  /**
   * Validate if an AI operation is allowed by the tenant's current plan and usage
   */
  public static validateOperationEligibility(
    tenantId: string,
    operation: AIEditorialOutputType,
    requestedTier?: AIModelTier
  ): {
    allowed: boolean;
    reason?: string;
    entitlement: AIPlanEntitlement;
  } {
    const entitlement = this.getTenantEntitlement(tenantId);
    const { planId, features, monthlyOperationsLimit, currentMonthlyUsage } = entitlement;

    // Rule 1: BASIC plan blocks all generative AI
    if (planId === 'BASIC' || !features.generativeAiAllowed) {
      return {
        allowed: false,
        reason: 'Basic plan does not permit Generative AI editorial assistance. Upgrade to Standard or Premium for AI capabilities.',
        entitlement,
      };
    }

    // Rule 2: Monthly limit check
    if (monthlyOperationsLimit > 0 && currentMonthlyUsage >= monthlyOperationsLimit) {
      return {
        allowed: false,
        reason: `Monthly AI operation limit of ${monthlyOperationsLimit} reached for current billing cycle.`,
        entitlement,
      };
    }

    // Rule 3: Model Tier check
    if (requestedTier === 'ADVANCED' && entitlement.allowedModelTier !== 'ADVANCED') {
      return {
        allowed: false,
        reason: 'Advanced model tier features require the Premium Publishing Plan.',
        entitlement,
      };
    }

    // Rule 4: Feature-specific gates
    switch (operation) {
      case 'HEADLINE_SUGGESTION':
      case 'SUBHEADLINE_SUGGESTION':
        if (!features.headlineAssistant) {
          return { allowed: false, reason: 'Headline assistant is not enabled for your plan.', entitlement };
        }
        break;
      case 'SUMMARY':
        if (!features.summaryGeneration) {
          return { allowed: false, reason: 'Summary generation is not enabled for your plan.', entitlement };
        }
        break;
      case 'SHORTENED_COPY':
      case 'COPY_EDIT':
        if (!features.copyFittingSuggestions) {
          return { allowed: false, reason: 'Copy-fitting suggestions are not enabled for your plan.', entitlement };
        }
        break;
      case 'RESTRUCTURED_COPY':
        if (!features.copyRestructuring) {
          return { allowed: false, reason: 'Copy restructuring is a Premium plan capability.', entitlement };
        }
        break;
      case 'CAPTION_SUGGESTION':
        if (!features.captionAssistance) {
          return { allowed: false, reason: 'AI caption assistance is a Premium plan capability.', entitlement };
        }
        break;
      case 'SECTION_SUGGESTION':
        if (!features.sectionClassification) {
          return { allowed: false, reason: 'Section classification is not enabled for your plan.', entitlement };
        }
        break;
      case 'PRIORITY_SUGGESTION':
        if (!features.prioritySuggestions) {
          return { allowed: false, reason: 'Priority suggestions are not enabled for your plan.', entitlement };
        }
        break;
      case 'PHOTO_SELECTION':
        if (!features.intelligentPhotoSelection) {
          return { allowed: false, reason: 'Intelligent photo selection is a Premium plan capability.', entitlement };
        }
        break;
      case 'IMAGE_ENHANCEMENT':
        if (!features.imageEnhancement) {
          return { allowed: false, reason: 'Image enhancement is a Premium plan capability.', entitlement };
        }
        break;
    }

    return {
      allowed: true,
      entitlement,
    };
  }

  /**
   * Record AI Usage and increment counters
   */
  public static recordUsage(params: {
    tenantId: string;
    userId: string;
    newsId?: string;
    operation: AIEditorialOutputType | string;
    modelTier: AIModelTier;
    provider: string;
    model: string;
    inputTokenEstimate: number;
    outputTokenEstimate: number;
    processingTimeMs: number;
    status: AIRequestStatus;
    errorMessage?: string;
  }): AIUsageRecord {
    const usageId = `ai-use-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const record: AIUsageRecord = {
      usageId,
      ...params,
      createdAt: new Date().toISOString(),
    };

    const tenantRecords = this.usageRecordsStore.get(params.tenantId) || [];
    tenantRecords.push(record);
    this.usageRecordsStore.set(params.tenantId, tenantRecords);

    // Sync with Phase 7 UsageMeteringService
    const sub = SubscriptionEntitlementService.getSubscription(params.tenantId);
    if (sub) {
      UsageMeteringService.recordUsage({
        tenantId: params.tenantId,
        subscriptionId: sub.subscriptionId,
        planId: sub.planId,
        metric: params.operation === 'HEADLINE_SUGGESTION' ? 'AI_HEADLINE' : params.operation === 'SUMMARY' ? 'AI_SUMMARY' : 'AI_COPY_EDIT',
        quantity: 1,
        unit: 'OPERATIONS',
        sourceEntityType: 'NewsArticle',
        sourceEntityId: params.newsId,
        provider: params.provider,
        model: params.model,
      });
    }

    // If successful, increment tenant monthly counter
    if (params.status === 'COMPLETED') {
      const entitlement = this.getTenantEntitlement(params.tenantId);
      entitlement.currentMonthlyUsage += 1;
      entitlement.updatedAt = new Date().toISOString();
      this.entitlementsStore.set(params.tenantId, entitlement);
    }

    return record;
  }

  /**
   * Get tenant AI usage history
   */
  public static getUsageRecords(tenantId: string): AIUsageRecord[] {
    return this.usageRecordsStore.get(tenantId) || [];
  }

  /**
   * Get usage summary & stats
   */
  public static getUsageStats(tenantId: string) {
    const entitlement = this.getTenantEntitlement(tenantId);
    const records = this.getUsageRecords(tenantId);

    const completed = records.filter((r) => r.status === 'COMPLETED');
    const totalInputTokens = completed.reduce((sum, r) => sum + r.inputTokenEstimate, 0);
    const totalOutputTokens = completed.reduce((sum, r) => sum + r.outputTokenEstimate, 0);
    const avgLatencyMs = completed.length > 0 ? Math.round(completed.reduce((s, r) => s + r.processingTimeMs, 0) / completed.length) : 0;

    const remainingOperations = Math.max(0, entitlement.monthlyOperationsLimit - entitlement.currentMonthlyUsage);

    return {
      planId: entitlement.planId,
      allowedModelTier: entitlement.allowedModelTier,
      monthlyOperationsLimit: entitlement.monthlyOperationsLimit,
      currentMonthlyUsage: entitlement.currentMonthlyUsage,
      remainingOperations,
      totalOperationsRecorded: records.length,
      successfulOperations: completed.length,
      failedOperations: records.filter((r) => r.status === 'FAILED').length,
      blockedOperations: records.filter((r) => r.status === 'BLOCKED_BY_PLAN').length,
      totalInputTokens,
      totalOutputTokens,
      avgLatencyMs,
    };
  }
}
