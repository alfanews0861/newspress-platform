/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 7 — Subscription Upgrade & Downgrade Service
 */

import {
  PublishingPlanId,
  PublisherSubscription,
  SubscriptionEntitlementSnapshot,
} from '../types/billing';
import { PlanCatalogService } from './planCatalogService';
import { SubscriptionEntitlementService } from './subscriptionEntitlementService';
import { AuditService } from './auditService';

export interface RemediationCheckResult {
  exceedsLimits: boolean;
  violations: Array<{
    metric: string;
    currentValue: number;
    targetLimit: number;
  }>;
}

export class SubscriptionUpgradeService {
  /**
   * Check if current tenant usage exceeds target plan limits before downgrade
   */
  public static checkRemediationNeeded(
    tenantId: string,
    targetPlanId: PublishingPlanId,
    currentStats?: {
      staffCount?: number;
      reporterCount?: number;
      storageMb?: number;
      activeEditionsCount?: number;
    }
  ): RemediationCheckResult {
    const targetPlan = PlanCatalogService.getPlan(targetPlanId);
    if (!targetPlan) {
      throw new Error(`Target plan ${targetPlanId} not found.`);
    }

    const violations: RemediationCheckResult['violations'] = [];
    const limits = targetPlan.limits;

    if (currentStats) {
      if (
        limits.staffMemberLimit > 0 &&
        currentStats.staffCount !== undefined &&
        currentStats.staffCount > limits.staffMemberLimit
      ) {
        violations.push({
          metric: 'staffMemberLimit',
          currentValue: currentStats.staffCount,
          targetLimit: limits.staffMemberLimit,
        });
      }

      if (
        limits.reporterLimit > 0 &&
        currentStats.reporterCount !== undefined &&
        currentStats.reporterCount > limits.reporterLimit
      ) {
        violations.push({
          metric: 'reporterLimit',
          currentValue: currentStats.reporterCount,
          targetLimit: limits.reporterLimit,
        });
      }

      if (
        limits.storageLimitMb > 0 &&
        currentStats.storageMb !== undefined &&
        currentStats.storageMb > limits.storageLimitMb
      ) {
        violations.push({
          metric: 'storageLimitMb',
          currentValue: currentStats.storageMb,
          targetLimit: limits.storageLimitMb,
        });
      }
    }

    return {
      exceedsLimits: violations.length > 0,
      violations,
    };
  }

  /**
   * Execute or schedule Plan Upgrade
   */
  public static upgradePlan(
    tenantId: string,
    targetPlanId: PublishingPlanId,
    actorId: string = 'user-admin',
    actorName: string = 'Publisher Admin',
    actorRole: string = 'administrator'
  ): { subscription: PublisherSubscription; snapshot: SubscriptionEntitlementSnapshot } {
    const targetPlan = PlanCatalogService.getPlan(targetPlanId);
    if (!targetPlan) throw new Error(`Target plan ${targetPlanId} not found.`);

    const { subscription: existingSub } = SubscriptionEntitlementService.getOrCreateSubscription(tenantId);

    const now = new Date().toISOString();
    const updatedSub: PublisherSubscription = {
      ...existingSub,
      planId: targetPlan.planId,
      planVersion: targetPlan.version,
      price: targetPlan.price,
      currency: targetPlan.currency,
      status: 'ACTIVE',
      remediationRequired: false,
      remediationReason: undefined,
      pendingDowngradePlanId: undefined,
      updatedAt: now,
    };

    const result = SubscriptionEntitlementService.setSubscription(
      tenantId,
      updatedSub,
      targetPlan.features,
      targetPlan.limits
    );

    AuditService.logEvent({
      tenantId,
      actorId,
      actorName,
      actorRole,
      action: 'PLAN_UPGRADED',
      entityType: 'PublisherSubscription',
      entityId: updatedSub.subscriptionId,
      previousState: { planId: existingSub.planId, price: existingSub.price },
      newState: { planId: updatedSub.planId, price: updatedSub.price },
      reason: `Upgraded subscription to ${targetPlanId}`,
    });

    return result;
  }

  /**
   * Execute or schedule Plan Downgrade
   */
  public static downgradePlan(
    tenantId: string,
    targetPlanId: PublishingPlanId,
    options: {
      immediate?: boolean;
      currentStats?: {
        staffCount?: number;
        reporterCount?: number;
        storageMb?: number;
      };
      actorId?: string;
      actorName?: string;
      actorRole?: string;
    } = {}
  ): { subscription: PublisherSubscription; snapshot: SubscriptionEntitlementSnapshot } {
    const targetPlan = PlanCatalogService.getPlan(targetPlanId);
    if (!targetPlan) throw new Error(`Target plan ${targetPlanId} not found.`);

    const { subscription: existingSub } = SubscriptionEntitlementService.getOrCreateSubscription(tenantId);
    const remediation = this.checkRemediationNeeded(tenantId, targetPlanId, options.currentStats);

    const now = new Date().toISOString();

    if (options.immediate) {
      const updatedSub: PublisherSubscription = {
        ...existingSub,
        planId: targetPlan.planId,
        planVersion: targetPlan.version,
        price: targetPlan.price,
        remediationRequired: remediation.exceedsLimits,
        remediationReason: remediation.exceedsLimits
          ? `Current usage exceeds ${targetPlanId} plan limits: ${remediation.violations.map((v) => `${v.metric} (${v.currentValue} > ${v.targetLimit})`).join(', ')}`
          : undefined,
        updatedAt: now,
      };

      const result = SubscriptionEntitlementService.setSubscription(
        tenantId,
        updatedSub,
        targetPlan.features,
        targetPlan.limits
      );

      AuditService.logEvent({
        tenantId,
        actorId: options.actorId || 'user-admin',
        actorName: options.actorName || 'Publisher Admin',
        actorRole: options.actorRole || 'administrator',
        action: 'PLAN_DOWNGRADED',
        entityType: 'PublisherSubscription',
        entityId: updatedSub.subscriptionId,
        previousState: { planId: existingSub.planId },
        newState: { planId: updatedSub.planId, remediationRequired: updatedSub.remediationRequired },
        reason: `Immediate downgrade to ${targetPlanId}`,
      });

      return result;
    } else {
      // Default: schedule at period end
      const updatedSub: PublisherSubscription = {
        ...existingSub,
        pendingDowngradePlanId: targetPlanId,
        remediationRequired: remediation.exceedsLimits,
        remediationReason: remediation.exceedsLimits
          ? `Pending downgrade to ${targetPlanId} will require cleanup before renewal.`
          : undefined,
        updatedAt: now,
      };

      const result = SubscriptionEntitlementService.setSubscription(tenantId, updatedSub);

      AuditService.logEvent({
        tenantId,
        actorId: options.actorId || 'user-admin',
        actorName: options.actorName || 'Publisher Admin',
        actorRole: options.actorRole || 'administrator',
        action: 'PLAN_DOWNGRADED',
        entityType: 'PublisherSubscription',
        entityId: updatedSub.subscriptionId,
        newState: { pendingDowngradePlanId: targetPlanId },
        reason: `Downgrade scheduled at period end to ${targetPlanId}`,
      });

      return result;
    }
  }
}
