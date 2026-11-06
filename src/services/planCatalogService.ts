/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 7 — Central Plan Catalog Service
 */

import {
  PlanRecord,
  PlanVersion,
  PublishingPlanId,
  PlanLimits,
  PlanFeatures,
} from '../types/billing';
import { AuditService } from './auditService';

export const DEFAULT_PLAN_CONFIGS: Record<PublishingPlanId, PlanRecord> = {
  BASIC: {
    planId: 'BASIC',
    version: 1,
    name: 'Free Starter / Basic Publishing Plan',
    description: 'Free starter tier for independent local dispatches. Deterministic layout, manual editorial editing, and basic PDF output with zero generative AI.',
    status: 'ACTIVE',
    billingInterval: 'MONTHLY',
    currency: 'INR',
    price: 0,
    trialDays: 0,
    limits: {
      staffMemberLimit: 3,
      reporterLimit: 5,
      editionLimit: 2,
      monthlyNewsProcessingLimit: 50,
      monthlyAIUsageLimit: 0,
      storageLimitMb: 1000, // 1GB
      imageProcessingLimit: 10,
    },
    features: {
      aiTier: 'NONE',
      generativeAiAllowed: false,
      marketplaceAccess: false,
      newspaperGeneration: true,
      printPdfGeneration: true,
      digitalPdfGeneration: true,
      customBranding: false,
      headlineAssistant: false,
      summaryGeneration: false,
      copyFittingSuggestions: false,
      copyRestructuring: false,
      captionAssistance: false,
      sectionClassification: false,
      prioritySuggestions: false,
      intelligentPhotoSelection: false,
      imageEnhancement: false,
      supportLevel: 'COMMUNITY',
      priorityLevel: 'NORMAL',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  STANDARD: {
    planId: 'STANDARD',
    version: 1,
    name: 'Standard Newsroom Plan',
    description: 'Standard publisher tier for active newsrooms. Light AI assistance for headlines, summaries, copy fitting, and marketplace syndication access.',
    status: 'ACTIVE',
    billingInterval: 'MONTHLY',
    currency: 'INR',
    price: 4999,
    trialDays: 14,
    limits: {
      staffMemberLimit: 10,
      reporterLimit: 25,
      editionLimit: 20,
      monthlyNewsProcessingLimit: 500,
      monthlyAIUsageLimit: 500,
      storageLimitMb: 20000, // 20GB
      imageProcessingLimit: 100,
    },
    features: {
      aiTier: 'LIGHT',
      generativeAiAllowed: true,
      marketplaceAccess: true,
      newspaperGeneration: true,
      printPdfGeneration: true,
      digitalPdfGeneration: true,
      customBranding: true,
      headlineAssistant: true,
      summaryGeneration: true,
      copyFittingSuggestions: true,
      copyRestructuring: false,
      captionAssistance: false,
      sectionClassification: true,
      prioritySuggestions: true,
      intelligentPhotoSelection: false,
      imageEnhancement: false,
      supportLevel: 'STANDARD',
      priorityLevel: 'NORMAL',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  PREMIUM: {
    planId: 'PREMIUM',
    version: 1,
    name: 'Premium Media Enterprise Plan',
    description: 'Advanced newsroom enterprise tier with high-capacity AI desk, advanced copy restructuring, optical photo diagnostics, priority processing, and expanded limits.',
    status: 'ACTIVE',
    billingInterval: 'MONTHLY',
    currency: 'INR',
    price: 14999,
    trialDays: 14,
    limits: {
      staffMemberLimit: 50,
      reporterLimit: 100,
      editionLimit: 100,
      monthlyNewsProcessingLimit: 5000,
      monthlyAIUsageLimit: 2500,
      storageLimitMb: 100000, // 100GB
      imageProcessingLimit: 1000,
    },
    features: {
      aiTier: 'ADVANCED',
      generativeAiAllowed: true,
      marketplaceAccess: true,
      newspaperGeneration: true,
      printPdfGeneration: true,
      digitalPdfGeneration: true,
      customBranding: true,
      headlineAssistant: true,
      summaryGeneration: true,
      copyFittingSuggestions: true,
      copyRestructuring: true,
      captionAssistance: true,
      sectionClassification: true,
      prioritySuggestions: true,
      intelligentPhotoSelection: true,
      imageEnhancement: true,
      supportLevel: 'PRIORITY',
      priorityLevel: 'HIGH',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
};

export class PlanCatalogService {
  private static plansStore: Map<string, PlanRecord> = new Map();
  private static versionsStore: Map<string, PlanVersion[]> = new Map();

  static {
    this.initializeDefaultPlans();
  }

  public static resetStore(): void {
    this.plansStore.clear();
    this.versionsStore.clear();
    this.initializeDefaultPlans();
  }

  private static initializeDefaultPlans(): void {
    Object.values(DEFAULT_PLAN_CONFIGS).forEach((plan) => {
      this.plansStore.set(plan.planId, { ...plan });
      const versionRecord: PlanVersion = {
        versionId: `ver-${plan.planId}-v${plan.version}`,
        planId: plan.planId,
        version: plan.version,
        effectiveFrom: plan.createdAt,
        snapshot: { ...plan },
        createdBy: 'system_init',
      };
      this.versionsStore.set(plan.planId, [versionRecord]);
    });
  }

  public static getAllPlans(): PlanRecord[] {
    return Array.from(this.plansStore.values());
  }

  public static getActivePlans(): PlanRecord[] {
    return this.getAllPlans().filter((p) => p.status === 'ACTIVE');
  }

  public static getPlan(planId: PublishingPlanId): PlanRecord | null {
    return this.plansStore.get(planId) || null;
  }

  public static getPlanVersion(planId: PublishingPlanId, version: number): PlanVersion | null {
    const versions = this.versionsStore.get(planId) || [];
    return versions.find((v) => v.version === version) || null;
  }

  public static updatePlanConfig(
    planId: PublishingPlanId,
    updates: Partial<Omit<PlanRecord, 'planId' | 'version'>>,
    actorId: string = 'system',
    actorName: string = 'Super Admin',
    actorRole: string = 'super_admin'
  ): { plan: PlanRecord; version: PlanVersion } {
    const existing = this.getPlan(planId);
    if (!existing) {
      throw new Error(`Plan ${planId} not found in catalog.`);
    }

    const newVersionNum = existing.version + 1;
    const now = new Date().toISOString();

    const updatedPlan: PlanRecord = {
      ...existing,
      ...updates,
      planId,
      version: newVersionNum,
      updatedAt: now,
    };

    if (updates.limits) {
      updatedPlan.limits = { ...existing.limits, ...updates.limits };
    }
    if (updates.features) {
      updatedPlan.features = { ...existing.features, ...updates.features };
    }

    this.plansStore.set(planId, updatedPlan);

    const newVersion: PlanVersion = {
      versionId: `ver-${planId}-v${newVersionNum}`,
      planId,
      version: newVersionNum,
      effectiveFrom: now,
      snapshot: { ...updatedPlan },
      createdBy: actorId,
    };

    const existingVersions = this.versionsStore.get(planId) || [];
    existingVersions.push(newVersion);
    this.versionsStore.set(planId, existingVersions);

    AuditService.logEvent({
      tenantId: 'platform',
      actorId,
      actorName,
      actorRole,
      action: 'PLAN_VERSION_CREATED',
      entityType: 'PlanRecord',
      entityId: planId,
      previousState: existing,
      newState: updatedPlan,
      reason: `Plan ${planId} updated to version ${newVersionNum}`,
    });

    return { plan: updatedPlan, version: newVersion };
  }

  public static setPlanStatus(
    planId: PublishingPlanId,
    status: PlanRecord['status'],
    actorId: string = 'system',
    actorName: string = 'Super Admin',
    actorRole: string = 'super_admin'
  ): PlanRecord {
    const existing = this.getPlan(planId);
    if (!existing) throw new Error(`Plan ${planId} not found.`);

    existing.status = status;
    existing.updatedAt = new Date().toISOString();
    this.plansStore.set(planId, existing);

    AuditService.logEvent({
      tenantId: 'platform',
      actorId,
      actorName,
      actorRole,
      action: status === 'ACTIVE' ? 'PLAN_ACTIVATED' : 'PLAN_DEACTIVATED',
      entityType: 'PlanRecord',
      entityId: planId,
      newState: { status },
      reason: `Plan status changed to ${status}`,
    });

    return existing;
  }
}
