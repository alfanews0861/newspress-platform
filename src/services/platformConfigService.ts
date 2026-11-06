/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Platform — Phase 17 Platform Configuration Management Service
 */

import { PlatformConfig, PlatformConfigHistoryEntry } from '../types/platformPhase17';
import { AuditService } from './auditService';

export const INITIAL_PLATFORM_CONFIG: PlatformConfig = {
  version: 1,
  availablePlans: ['BASIC', 'STANDARD', 'PREMIUM'],
  trialPolicies: {
    defaultTrialDays: 14,
    gracePeriodDays: 3,
    autoCancelOnTrialEnd: false,
    requirePaymentMethodForTrial: false,
  },
  featureAvailability: {
    aiCopyFittingEnabled: true,
    marketplaceWireEnabled: true,
    physicalPrintDispatchEnabled: false, // Explicitly false for mock/sandbox until live vendor contracts
    mobileFieldReportingEnabled: true,
    apiDeveloperPortalEnabled: true,
    executiveAnalyticsEnabled: true,
  },
  rateLimitTiers: {
    tierBasicRpm: 60,
    tierStandardRpm: 300,
    tierPremiumRpm: 1200,
    burstMultiplier: 2.0,
  },
  marketplacePricing: {
    minListingPriceMinorUnits: 5000, // ₹50.00
    maxListingPriceMinorUnits: 5000000, // ₹50,000.00
    defaultSyndicationFeePercent: 15,
    reporterRoyaltiesPercent: 70,
    platformFeePercent: 15,
    settlementHoldDays: 7,
  },
  productionQueueLimits: {
    maxConcurrentJobsPerTenant: 3,
    maxJobRetryAttempts: 3,
    workerLeaseDurationSeconds: 900,
    backlogAlertThreshold: 25,
  },
  supportedFormats: ['BROADSHEET', 'TABLOID', 'BERLINER', 'COMPACT'],
  supportedLanguages: ['en', 'te', 'hi', 'ta', 'kn', 'mr', 'bn'],
  supportedFonts: ['Newsreader', 'Cinzel', 'Inter', 'Playfair Display', 'Plus Jakarta Sans', 'Public Sans'],
  notificationTemplates: {
    PAYMENT_SUCCEEDED: {
      subject: 'Payment Confirmation — NewsPress Platform',
      template: 'Your payment of {{amount}} for subscription {{planId}} has been successfully processed.',
    },
    PAYMENT_FAILED: {
      subject: 'Action Required: Payment Processing Failed',
      template: 'We were unable to process payment for {{tenantName}}. A {{gracePeriodDays}}-day grace period is active.',
    },
    PAYOUT_DISBURSED: {
      subject: 'Marketplace Payout Disbursed',
      template: 'Payout of {{amount}} has been credited to your verified bank account.',
    },
    BREAKING_INSERTION: {
      subject: 'Urgent: Breaking News Inserted Into Active Edition',
      template: 'Editor {{editorName}} has inserted breaking story "{{headline}}" into edition {{editionNumber}}.',
    },
  },
  supportEscalationPolicies: {
    sev1SlaHours: 1,
    sev2SlaHours: 4,
    sev3SlaHours: 24,
    sev4SlaHours: 72,
    autoEscalateAfterHours: 2,
  },
  lastModifiedBy: 'system_bootstrap',
  lastModifiedAt: '2026-10-01T00:00:00.000Z',
  changeReason: 'Initial platform baseline configuration',
};

// High-impact keys that require explicit administrator confirmation
const HIGH_IMPACT_KEYS = new Set([
  'marketplacePricing.reporterRoyaltiesPercent',
  'marketplacePricing.platformFeePercent',
  'marketplacePricing.settlementHoldDays',
  'rateLimitTiers.tierBasicRpm',
  'rateLimitTiers.tierStandardRpm',
  'rateLimitTiers.tierPremiumRpm',
  'featureAvailability.physicalPrintDispatchEnabled',
  'productionQueueLimits.workerLeaseDurationSeconds',
]);

// Banned secret patterns that must never be stored in client configuration
const BANNED_SECRET_PATTERNS = [
  /password/i,
  /secret/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /bearer/i,
  /auth_token/i,
  /sk_live/i,
  /rzp_live/i,
];

export class PlatformConfigService {
  private static currentConfig: PlatformConfig = { ...INITIAL_PLATFORM_CONFIG };
  private static configHistory: PlatformConfigHistoryEntry[] = [];
  private static versionSnapshots: Map<number, PlatformConfig> = new Map();

  static {
    this.versionSnapshots.set(1, { ...INITIAL_PLATFORM_CONFIG });
  }

  public static resetConfig(): void {
    this.currentConfig = JSON.parse(JSON.stringify(INITIAL_PLATFORM_CONFIG));
    this.configHistory = [];
    this.versionSnapshots.clear();
    this.versionSnapshots.set(1, { ...INITIAL_PLATFORM_CONFIG });
  }

  public static getConfig(): PlatformConfig {
    return JSON.parse(JSON.stringify(this.currentConfig));
  }

  public static getConfigHistory(): PlatformConfigHistoryEntry[] {
    return [...this.configHistory];
  }

  public static getSnapshotByVersion(version: number): PlatformConfig | undefined {
    const snap = this.versionSnapshots.get(version);
    return snap ? JSON.parse(JSON.stringify(snap)) : undefined;
  }

  /**
   * Validates that updates do not contain secrets or forbidden types.
   */
  private static validateNoSecrets(obj: any, path = ''): void {
    if (!obj || typeof obj !== 'object') return;
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;
      for (const pattern of BANNED_SECRET_PATTERNS) {
        if (pattern.test(key)) {
          throw new Error(
            `Configuration Security Violation: Potential secret detected in key "${fullPath}". Platform configuration must never store credentials, API secrets, or passwords.`
          );
        }
      }
      if (typeof value === 'string') {
        if (value.startsWith('sk_') || value.startsWith('rzp_') || value.includes('BEGIN PRIVATE KEY')) {
          throw new Error(
            `Configuration Security Violation: Secret-like string value detected at "${fullPath}". Refusing to store secrets in platform configuration documents.`
          );
        }
      }
      if (typeof value === 'object') {
        this.validateNoSecrets(value, fullPath);
      }
    }
  }

  /**
   * Updates platform configuration with validation, high-impact safety checks, and immutable history logging.
   */
  public static updateConfig(params: {
    category: string;
    settingKey: string;
    newValue: any;
    reason: string;
    adminId: string;
    adminEmail: string;
    confirmHighImpact?: boolean;
  }): PlatformConfig {
    if (!params.reason || params.reason.trim().length < 5) {
      throw new Error('Mandatory justification reason (at least 5 characters) required for platform configuration changes.');
    }

    // 1. Prevent secret leakage
    this.validateNoSecrets({ [params.settingKey]: params.newValue });

    // 2. High-impact financial/security validation
    const isHighImpact = HIGH_IMPACT_KEYS.has(params.settingKey);
    if (isHighImpact && !params.confirmHighImpact) {
      throw new Error(
        `High-impact configuration change detected for "${params.settingKey}". Explicit administrator confirmation ('confirmHighImpact: true') is required to prevent accidental financial or operational disruption.`
      );
    }

    // 3. Domain validation
    if (params.settingKey === 'marketplacePricing.reporterRoyaltiesPercent' || params.settingKey === 'marketplacePricing.platformFeePercent') {
      const numVal = Number(params.newValue);
      if (isNaN(numVal) || numVal < 0 || numVal > 100) {
        throw new Error('Percentage must be a numeric value between 0 and 100.');
      }
      // Split check
      const currentSplit = { ...this.currentConfig.marketplacePricing };
      if (params.settingKey === 'marketplacePricing.reporterRoyaltiesPercent') {
        currentSplit.reporterRoyaltiesPercent = numVal;
      } else {
        currentSplit.platformFeePercent = numVal;
      }
      if (currentSplit.reporterRoyaltiesPercent + currentSplit.platformFeePercent > 100) {
        throw new Error('Total royalties plus platform fee cannot exceed 100% of marketplace transaction value.');
      }
    }

    if (params.settingKey.startsWith('rateLimitTiers.')) {
      const numVal = Number(params.newValue);
      if (isNaN(numVal) || numVal <= 0) {
        throw new Error('Rate limit RPM must be a positive integer.');
      }
    }

    // 4. Resolve previous value
    const parts = params.settingKey.split('.');
    let prev: any = this.currentConfig;
    let target: any = this.currentConfig;
    for (let i = 0; i < parts.length - 1; i++) {
      target = target[parts[i]];
    }
    const lastKey = parts[parts.length - 1];
    const previousValue = target[lastKey];

    // 5. Apply change prospectively
    target[lastKey] = params.newValue;
    this.currentConfig.version += 1;
    this.currentConfig.lastModifiedBy = params.adminEmail;
    this.currentConfig.lastModifiedAt = new Date().toISOString();
    this.currentConfig.changeReason = params.reason;

    // 6. Record version snapshot
    this.versionSnapshots.set(this.currentConfig.version, JSON.parse(JSON.stringify(this.currentConfig)));

    // 7. Record changelog entry
    const historyEntry: PlatformConfigHistoryEntry = {
      entryId: `cfg_hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      version: this.currentConfig.version,
      timestamp: this.currentConfig.lastModifiedAt,
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      category: params.category,
      settingKey: params.settingKey,
      previousValue,
      newValue: params.newValue,
      reason: params.reason,
      isHighImpact,
      confirmedByAdmin: !!params.confirmHighImpact,
    };
    this.configHistory.unshift(historyEntry);

    // 8. Audit log
    AuditService.log({
      action: 'platform_config.update',
      resourceType: 'platform_config',
      resourceId: `v${this.currentConfig.version}`,
      userId: params.adminId,
      details: {
        settingKey: params.settingKey,
        previousValue,
        newValue: params.newValue,
        reason: params.reason,
        isHighImpact,
      },
    });

    return JSON.parse(JSON.stringify(this.currentConfig));
  }
}
