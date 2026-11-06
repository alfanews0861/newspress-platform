/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Revenue Split Configuration & Snapshot Service
 * Phase 11 — Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine
 */

import {
  RevenueSplitConfiguration,
  RevenueSplitSnapshot,
  RoundingPolicy
} from '../types/financePhase11';

export const DEFAULT_PLATFORM_SPLIT_CONFIG: RevenueSplitConfiguration = {
  id: 'split-default-platform',
  version: 1,
  reporterPercent: 60,
  sourcePercent: 20,
  platformPercent: 20,
  roundingPolicy: 'ROUND_REPORTER',
  active: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z'
};

export const FREELANCE_DEFAULT_SPLIT_CONFIG: RevenueSplitConfiguration = {
  id: 'split-default-freelance',
  version: 1,
  reporterPercent: 80,
  sourcePercent: 0,
  platformPercent: 20,
  roundingPolicy: 'ROUND_REPORTER',
  active: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z'
};

export interface CalculatedSplitMinor {
  grossAmountMinor: number;
  reporterShareMinor: number;
  sourceShareMinor: number;
  platformShareMinor: number;
  roundingAdjustmentMinor: number;
  currency: string;
}

export class RevenueSplitService {
  private configurations: Map<string, RevenueSplitConfiguration> = new Map();
  private snapshots: Map<string, RevenueSplitSnapshot> = new Map();

  constructor() {
    this.configurations.set(DEFAULT_PLATFORM_SPLIT_CONFIG.id, DEFAULT_PLATFORM_SPLIT_CONFIG);
    this.configurations.set(FREELANCE_DEFAULT_SPLIT_CONFIG.id, FREELANCE_DEFAULT_SPLIT_CONFIG);
  }

  /**
   * Validates that split percentages strictly total 100% and have no negative values.
   */
  validateConfiguration(config: Partial<RevenueSplitConfiguration>): { valid: boolean; error?: string } {
    const reporter = config.reporterPercent ?? 0;
    const source = config.sourcePercent ?? 0;
    const platform = config.platformPercent ?? 0;

    if (reporter < 0 || source < 0 || platform < 0) {
      return { valid: false, error: 'Percentages cannot be negative.' };
    }

    if (reporter > 100 || source > 100 || platform > 100) {
      return { valid: false, error: 'No single percentage can exceed 100%.' };
    }

    let otherTotal = 0;
    if (config.otherShares && Array.isArray(config.otherShares)) {
      for (const share of config.otherShares) {
        if (share.percent < 0) return { valid: false, error: 'Other share percent cannot be negative.' };
        otherTotal += share.percent;
      }
    }

    const total = reporter + source + platform + otherTotal;
    if (Math.abs(total - 100) > 0.0001) {
      return {
        valid: false,
        error: `Revenue split percentages must total exactly 100% (current total: ${total}%).`
      };
    }

    return { valid: true };
  }

  /**
   * Registers or updates a revenue split configuration.
   */
  registerConfiguration(config: RevenueSplitConfiguration): RevenueSplitConfiguration {
    const validation = this.validateConfiguration(config);
    if (!validation.valid) {
      throw new Error(`Invalid Revenue Split Configuration: ${validation.error}`);
    }

    const existing = this.configurations.get(config.id);
    const newVersion = existing ? existing.version + 1 : config.version || 1;

    const saved: RevenueSplitConfiguration = {
      ...config,
      version: newVersion,
      updatedAt: new Date().toISOString()
    };

    this.configurations.set(saved.id, saved);
    return saved;
  }

  /**
   * Resolves the appropriate active split configuration based on context.
   * Specificity order: Listing > Reporter Agreement > Source Org > Tenant > Default (Staff or Freelance)
   */
  resolveConfiguration(context: {
    tenantId?: string;
    listingId?: string;
    sourceOrganizationId?: string;
    reporterId?: string;
    hasSourceOrganization: boolean;
  }): RevenueSplitConfiguration {
    const { listingId, reporterId, sourceOrganizationId, tenantId, hasSourceOrganization } = context;

    // Check listing level
    if (listingId) {
      const listingConfig = Array.from(this.configurations.values()).find(
        c => c.listingId === listingId && c.active
      );
      if (listingConfig) return listingConfig;
    }

    // Check reporter level
    if (reporterId) {
      const reporterConfig = Array.from(this.configurations.values()).find(
        c => c.reporterId === reporterId && c.active
      );
      if (reporterConfig) return reporterConfig;
    }

    // Check source org level
    if (sourceOrganizationId) {
      const orgConfig = Array.from(this.configurations.values()).find(
        c => c.sourceOrganizationId === sourceOrganizationId && c.active
      );
      if (orgConfig) return orgConfig;
    }

    // Check tenant level
    if (tenantId) {
      const tenantConfig = Array.from(this.configurations.values()).find(
        c => c.tenantId === tenantId && !c.listingId && !c.reporterId && !c.sourceOrganizationId && c.active
      );
      if (tenantConfig) return tenantConfig;
    }

    // Default fallback
    return hasSourceOrganization ? DEFAULT_PLATFORM_SPLIT_CONFIG : FREELANCE_DEFAULT_SPLIT_CONFIG;
  }

  /**
   * Computes revenue shares in integer minor units with deterministic rounding.
   */
  calculateSplitMinor(
    grossAmountMinor: number,
    config: RevenueSplitConfiguration,
    currency = 'INR'
  ): CalculatedSplitMinor {
    if (grossAmountMinor <= 0) {
      throw new Error(`Gross amount must be greater than 0 minor units (received: ${grossAmountMinor}).`);
    }

    let reporterShare = Math.floor((grossAmountMinor * config.reporterPercent) / 100);
    let sourceShare = Math.floor((grossAmountMinor * config.sourcePercent) / 100);
    let platformShare = Math.floor((grossAmountMinor * config.platformPercent) / 100);

    const calculatedSum = reporterShare + sourceShare + platformShare;
    const remainder = grossAmountMinor - calculatedSum;

    if (remainder !== 0) {
      switch (config.roundingPolicy) {
        case 'ROUND_PLATFORM':
          platformShare += remainder;
          break;
        case 'ROUND_SOURCE':
          if (config.sourcePercent > 0) {
            sourceShare += remainder;
          } else {
            reporterShare += remainder;
          }
          break;
        case 'ROUND_REPORTER':
        default:
          reporterShare += remainder;
          break;
      }
    }

    // Sanity invariant
    if (reporterShare + sourceShare + platformShare !== grossAmountMinor) {
      throw new Error('Double-entry calculation invariant broken: sum of shares does not equal gross amount.');
    }

    return {
      grossAmountMinor,
      reporterShareMinor: reporterShare,
      sourceShareMinor: sourceShare,
      platformShareMinor: platformShare,
      roundingAdjustmentMinor: remainder,
      currency
    };
  }

  /**
   * Creates an immutable RevenueSplitSnapshot at the moment of revenue recognition.
   */
  createSnapshot(params: {
    tenantId: string;
    purchaseId: string;
    grossAmountMinor: number;
    config: RevenueSplitConfiguration;
    currency?: string;
  }): RevenueSplitSnapshot {
    const { tenantId, purchaseId, grossAmountMinor, config, currency = 'INR' } = params;

    const split = this.calculateSplitMinor(grossAmountMinor, config, currency);
    const now = new Date().toISOString();
    const snapshotId = `split_snap_${purchaseId}_v${config.version}`;

    const snapshot: RevenueSplitSnapshot = {
      id: snapshotId,
      tenantId,
      purchaseId,
      configurationId: config.id,
      configurationVersion: config.version,
      reporterPercent: config.reporterPercent,
      sourcePercent: config.sourcePercent,
      platformPercent: config.platformPercent,
      reporterAmountMinor: split.reporterShareMinor,
      sourceAmountMinor: split.sourceShareMinor,
      platformAmountMinor: split.platformShareMinor,
      roundingAdjustmentMinor: split.roundingAdjustmentMinor,
      currency,
      effectiveAt: now,
      createdAt: now
    };

    this.snapshots.set(snapshotId, snapshot);
    return snapshot;
  }

  getSnapshot(snapshotId: string): RevenueSplitSnapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  getSnapshotForPurchase(purchaseId: string): RevenueSplitSnapshot | undefined {
    return Array.from(this.snapshots.values()).find(s => s.purchaseId === purchaseId);
  }
}

export const revenueSplitService = new RevenueSplitService();
