/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Revenue Reversal, Refund & Chargeback Engine
 * Phase 11 — Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine
 */

import { MarketplaceRevenueEvent, FinancialLedgerEntry } from '../types/financePhase11';
import { revenueRecognitionService } from './revenueRecognitionService';
import { revenueSplitService } from './revenueSplitService';
import { financialLedgerService } from './financialLedgerService';
import { auditService } from './auditService';
import { marketplaceService } from './marketplaceService';

export class RevenueReversalService {
  /**
   * Processes a full or partial refund or chargeback on a marketplace purchase.
   * Invariant: Never edits original entries; creates compensating entries in ledger.
   */
  async processReversal(params: {
    purchaseId: string;
    reversalType: 'REFUND' | 'PARTIAL_REFUND' | 'CHARGEBACK' | 'REVERSAL' | 'ADJUSTMENT';
    refundAmountMinor?: number; // Optional if full refund
    reason: string;
    initiatedBy: string;
    idempotencyKey: string;
  }): Promise<{ reversalEvent: MarketplaceRevenueEvent }> {
    const {
      purchaseId,
      reversalType,
      refundAmountMinor,
      reason,
      initiatedBy,
      idempotencyKey
    } = params;

    // 1. Fetch original revenue event
    const originalEvents = revenueRecognitionService.getEventsForPurchase(purchaseId);
    if (originalEvents.length === 0) {
      throw new Error(`Cannot process reversal: Original revenue event for purchase ${purchaseId} not found.`);
    }

    const orig = originalEvents[0];
    const snapshot = revenueSplitService.getSnapshotForPurchase(purchaseId);

    const actualRefundMinor = refundAmountMinor !== undefined ? refundAmountMinor : orig.grossAmountMinor;

    if (actualRefundMinor <= 0 || actualRefundMinor > orig.grossAmountMinor) {
      throw new Error(`Invalid refund amount (${actualRefundMinor} paise). Must be between 1 and ${orig.grossAmountMinor} paise.`);
    }

    const isFullRefund = actualRefundMinor === orig.grossAmountMinor;
    const ratio = actualRefundMinor / orig.grossAmountMinor;

    // Calculate proportional share reversals in minor units
    const platformRevMinor = Math.floor((orig.platformFeeMinor || 0) * ratio);
    const reporterRevMinor = Math.floor((orig.reporterShareMinor || 0) * ratio);
    const sourceRevMinor = Math.floor((orig.sourceShareMinor || 0) * ratio);

    const now = new Date().toISOString();
    const reversalEventId = `rev_rev_${purchaseId}_${Date.now()}`;

    const reversalEvent: MarketplaceRevenueEvent = {
      id: reversalEventId,
      tenantId: orig.tenantId,
      purchaseId,
      marketplaceListingId: orig.marketplaceListingId,
      newsArticleId: orig.newsArticleId,
      reporterId: orig.reporterId,
      sourceOrganizationId: orig.sourceOrganizationId,
      publisherTenantId: orig.publisherTenantId,
      eventType: reversalType,
      grossAmountMinor: actualRefundMinor,
      currency: orig.currency,
      taxAmountMinor: 0,
      platformFeeMinor: platformRevMinor,
      reporterShareMinor: reporterRevMinor,
      sourceShareMinor: sourceRevMinor,
      netDistributableMinor: reporterRevMinor + sourceRevMinor,
      paymentProvider: orig.paymentProvider,
      providerTransactionId: orig.providerTransactionId,
      idempotencyKey,
      occurredAt: now,
      createdAt: now,
      metadata: { reason, initiatedBy, isFullRefund }
    };

    // 2. Generate Compensating Double-Entry Ledger Entries
    const transactionType = reversalType === 'CHARGEBACK' ? 'CHARGEBACK_DEBIT' : 'REFUND_DEBIT';

    const compensatingGroup: FinancialLedgerEntry[] = [
      // Buyer Credit (Refund returned to buyer)
      {
        id: `fin_led_rev_${reversalEventId}_buyer`,
        tenantId: orig.publisherTenantId,
        accountId: `acc_pub_${orig.publisherTenantId}`,
        accountType: 'PUBLISHER' as const,
        direction: 'CREDIT' as const,
        amountMinor: actualRefundMinor,
        currency: orig.currency,
        transactionType,
        referenceType: 'REFUND' as const,
        referenceId: purchaseId,
        purchaseId,
        marketplaceListingId: orig.marketplaceListingId,
        providerTransactionId: orig.providerTransactionId,
        idempotencyKey,
        status: 'COMPLETED' as const,
        occurredAt: now,
        createdAt: now
      },
      // Platform Fee Debit
      {
        id: `fin_led_rev_${reversalEventId}_platform`,
        tenantId: orig.tenantId,
        accountId: 'acc_platform',
        accountType: 'PLATFORM' as const,
        direction: 'DEBIT' as const,
        amountMinor: platformRevMinor,
        currency: orig.currency,
        transactionType,
        referenceType: 'REFUND' as const,
        referenceId: purchaseId,
        purchaseId,
        marketplaceListingId: orig.marketplaceListingId,
        providerTransactionId: orig.providerTransactionId,
        idempotencyKey,
        status: 'COMPLETED' as const,
        occurredAt: now,
        createdAt: now
      },
      // Reporter Royalty Debit
      {
        id: `fin_led_rev_${reversalEventId}_reporter`,
        tenantId: orig.tenantId,
        accountId: `acc_${orig.reporterId}`,
        accountType: 'REPORTER' as const,
        direction: 'DEBIT' as const,
        amountMinor: reporterRevMinor,
        currency: orig.currency,
        transactionType,
        referenceType: 'REFUND' as const,
        referenceId: purchaseId,
        purchaseId,
        marketplaceListingId: orig.marketplaceListingId,
        providerTransactionId: orig.providerTransactionId,
        idempotencyKey,
        status: 'COMPLETED' as const,
        occurredAt: now,
        createdAt: now
      }
    ];

    if (sourceRevMinor > 0 && orig.sourceOrganizationId) {
      compensatingGroup.push({
        id: `fin_led_rev_${reversalEventId}_source`,
        tenantId: orig.tenantId,
        accountId: `acc_${orig.sourceOrganizationId}`,
        accountType: 'SOURCE_ORGANIZATION' as const,
        direction: 'DEBIT' as const,
        amountMinor: sourceRevMinor,
        currency: orig.currency,
        transactionType,
        referenceType: 'REFUND' as const,
        referenceId: purchaseId,
        purchaseId,
        marketplaceListingId: orig.marketplaceListingId,
        providerTransactionId: orig.providerTransactionId,
        idempotencyKey,
        status: 'COMPLETED' as const,
        occurredAt: now,
        createdAt: now
      });
    }

    financialLedgerService.appendTransactionGroup(compensatingGroup, idempotencyKey);

    // 3. Revoke Content License on Full Refund or Chargeback
    if (isFullRefund || reversalType === 'CHARGEBACK') {
      const licenses = marketplaceService.getLicenses(orig.publisherTenantId);
      const targetLicense = licenses.find(l => l.purchaseId === purchaseId || l.newsId === orig.newsArticleId);
      if (targetLicense) {
        targetLicense.status = 'REVOKED';
      }
    }

    await auditService.log({
      tenantId: orig.tenantId,
      actorId: initiatedBy,
      actorName: initiatedBy,
      actorRole: 'admin',
      action: 'REVENUE_REVERSED',
      entityType: 'MarketplaceRevenueEvent',
      entityId: reversalEventId,
      newState: reversalEvent,
      reason: `${reversalType} processed for purchase ${purchaseId}: ${reason}`
    });

    return { reversalEvent };
  }
}

export const revenueReversalService = new RevenueReversalService();
