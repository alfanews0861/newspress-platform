/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Revenue Recognition Engine
 * Phase 11 — Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine
 */

import { MarketplaceRevenueEvent, FinancialLedgerEntry } from '../types/financePhase11';
import { revenueSplitService } from './revenueSplitService';
import { financialLedgerService } from './financialLedgerService';
import { auditService } from './auditService';

export class RevenueRecognitionService {
  private events: Map<string, MarketplaceRevenueEvent> = new Map();
  private idempotencyRecords: Map<string, MarketplaceRevenueEvent> = new Map();

  /**
   * Authoritatively recognizes marketplace revenue upon payment confirmation.
   */
  async recognizeMarketplaceRevenue(params: {
    tenantId: string;
    purchaseId: string;
    marketplaceListingId: string;
    newsArticleId: string;
    reporterId: string;
    sourceOrganizationId?: string;
    publisherTenantId: string;
    grossAmountMinor: number;
    taxAmountMinor?: number;
    currency?: string;
    paymentProvider: string;
    providerTransactionId: string;
    paymentStatus: string;
    idempotencyKey: string;
  }): Promise<{ event: MarketplaceRevenueEvent; snapshotId: string }> {
    const {
      tenantId,
      purchaseId,
      marketplaceListingId,
      newsArticleId,
      reporterId,
      sourceOrganizationId,
      publisherTenantId,
      grossAmountMinor,
      taxAmountMinor = 0,
      currency = 'INR',
      paymentProvider,
      providerTransactionId,
      paymentStatus,
      idempotencyKey
    } = params;

    // 1. Idempotency Check
    if (this.idempotencyRecords.has(idempotencyKey)) {
      const existing = this.idempotencyRecords.get(idempotencyKey)!;
      const snapshot = revenueSplitService.getSnapshotForPurchase(purchaseId);
      return { event: existing, snapshotId: snapshot?.id || '' };
    }

    // 2. Validate Payment Confirmation State
    if (paymentStatus !== 'CAPTURED' && paymentStatus !== 'AUTHORIZED' && paymentStatus !== 'completed') {
      throw new Error(`Revenue recognition rejected: Payment status "${paymentStatus}" is not captured or authorized.`);
    }

    if (grossAmountMinor <= 0) {
      throw new Error(`Revenue recognition rejected: Gross amount must be strictly positive (received ${grossAmountMinor}).`);
    }

    // 3. Resolve Split Configuration & Create Immutable Snapshot
    const hasSourceOrg = Boolean(sourceOrganizationId && sourceOrganizationId !== 'freelance_open');
    const splitConfig = revenueSplitService.resolveConfiguration({
      tenantId,
      listingId: marketplaceListingId,
      sourceOrganizationId,
      reporterId,
      hasSourceOrganization: hasSourceOrg
    });

    const snapshot = revenueSplitService.createSnapshot({
      tenantId,
      purchaseId,
      grossAmountMinor,
      config: splitConfig,
      currency
    });

    const now = new Date().toISOString();
    const eventId = `rev_evt_${purchaseId}`;

    const event: MarketplaceRevenueEvent = {
      id: eventId,
      tenantId,
      purchaseId,
      marketplaceListingId,
      newsArticleId,
      reporterId,
      sourceOrganizationId,
      publisherTenantId,
      eventType: 'PURCHASE_CONFIRMED',
      grossAmountMinor,
      currency,
      taxAmountMinor,
      platformFeeMinor: snapshot.platformAmountMinor,
      reporterShareMinor: snapshot.reporterAmountMinor,
      sourceShareMinor: snapshot.sourceAmountMinor,
      netDistributableMinor: snapshot.reporterAmountMinor + snapshot.sourceAmountMinor,
      paymentProvider,
      providerTransactionId,
      idempotencyKey,
      occurredAt: now,
      createdAt: now
    };

    // 4. Create Double-Entry Financial Ledger Entries (Credits == Debits)
    const ledgerGroup: FinancialLedgerEntry[] = [
      // Buyer Debit
      {
        id: `fin_led_${purchaseId}_buyer`,
        tenantId: publisherTenantId,
        accountId: `acc_pub_${publisherTenantId}`,
        accountType: 'PUBLISHER' as const,
        direction: 'DEBIT' as const,
        amountMinor: grossAmountMinor,
        currency,
        transactionType: 'PURCHASE_SETTLEMENT',
        referenceType: 'PURCHASE' as const,
        referenceId: purchaseId,
        purchaseId,
        marketplaceListingId,
        providerTransactionId,
        idempotencyKey,
        status: 'COMPLETED' as const,
        occurredAt: now,
        createdAt: now
      },
      // Platform Fee Credit
      {
        id: `fin_led_${purchaseId}_platform`,
        tenantId,
        accountId: 'acc_platform',
        accountType: 'PLATFORM' as const,
        direction: 'CREDIT' as const,
        amountMinor: snapshot.platformAmountMinor,
        currency,
        transactionType: 'PLATFORM_FEE',
        referenceType: 'PURCHASE' as const,
        referenceId: purchaseId,
        purchaseId,
        marketplaceListingId,
        providerTransactionId,
        idempotencyKey,
        status: 'COMPLETED' as const,
        occurredAt: now,
        createdAt: now
      },
      // Reporter Royalty Credit
      {
        id: `fin_led_${purchaseId}_reporter`,
        tenantId,
        accountId: `acc_${reporterId}`,
        accountType: 'REPORTER' as const,
        direction: 'CREDIT' as const,
        amountMinor: snapshot.reporterAmountMinor,
        currency,
        transactionType: 'ROYALTY_CREDIT',
        referenceType: 'PURCHASE' as const,
        referenceId: purchaseId,
        purchaseId,
        marketplaceListingId,
        providerTransactionId,
        idempotencyKey,
        status: 'COMPLETED' as const,
        occurredAt: now,
        createdAt: now
      }
    ];

    // Source Org Share (if applicable)
    if (snapshot.sourceAmountMinor > 0 && sourceOrganizationId) {
      ledgerGroup.push({
        id: `fin_led_${purchaseId}_source`,
        tenantId,
        accountId: `acc_${sourceOrganizationId}`,
        accountType: 'SOURCE_ORGANIZATION' as const,
        direction: 'CREDIT' as const,
        amountMinor: snapshot.sourceAmountMinor,
        currency,
        transactionType: 'SOURCE_CREDIT',
        referenceType: 'PURCHASE' as const,
        referenceId: purchaseId,
        purchaseId,
        marketplaceListingId,
        providerTransactionId,
        idempotencyKey,
        status: 'COMPLETED' as const,
        occurredAt: now,
        createdAt: now
      });
    }

    financialLedgerService.appendTransactionGroup(ledgerGroup, idempotencyKey);

    this.events.set(eventId, event);
    this.idempotencyRecords.set(idempotencyKey, event);

    await auditService.log({
      tenantId,
      actorId: 'system',
      actorName: 'Revenue Recognition Service',
      actorRole: 'system',
      action: 'REVENUE_RECOGNIZED',
      entityType: 'MarketplaceRevenueEvent',
      entityId: eventId,
      newState: event,
      reason: `Recognized revenue for purchase ${purchaseId}: Gross ${currency} ${(grossAmountMinor / 100).toFixed(2)}`
    });

    return { event, snapshotId: snapshot.id };
  }

  getEvent(eventId: string): MarketplaceRevenueEvent | undefined {
    return this.events.get(eventId);
  }

  getEventsForPurchase(purchaseId: string): MarketplaceRevenueEvent[] {
    return Array.from(this.events.values()).filter(e => e.purchaseId === purchaseId);
  }

  getAllEvents(): MarketplaceRevenueEvent[] {
    return Array.from(this.events.values()).reverse();
  }
}

export const revenueRecognitionService = new RevenueRecognitionService();
