/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Immutable Financial Ledger Service
 * Phase 11 — Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine
 */

import { FinancialLedgerEntry } from '../types/financePhase11';
import { financialLedgerIntegrityService } from './financialLedgerIntegrityService';

export class FinancialLedgerService {
  private ledger: FinancialLedgerEntry[] = [];
  private idempotencyMap: Map<string, FinancialLedgerEntry[]> = new Map();

  constructor() {
    this.seedInitialLedger();
  }

  private seedInitialLedger() {
    const now = '2026-10-02T10:00:00.000Z';
    const seedGroup: FinancialLedgerEntry[] = [
      {
        id: 'fin_led_seed_01_deb',
        tenantId: 'buyer-tenant-metro',
        accountId: 'acc_buyer_metro',
        accountType: 'PUBLISHER',
        direction: 'DEBIT',
        amountMinor: 500, // ₹5.00
        currency: 'INR',
        transactionType: 'PURCHASE_SETTLEMENT',
        referenceType: 'PURCHASE',
        referenceId: 'purch_seed_101',
        purchaseId: 'purch_seed_101',
        marketplaceListingId: 'mkt-standard-01',
        providerTransactionId: 'txn_mock_seed_101',
        idempotencyKey: 'idemp_seed_101',
        status: 'COMPLETED',
        occurredAt: now,
        createdAt: now
      },
      {
        id: 'fin_led_seed_01_plat',
        tenantId: 'buyer-tenant-metro',
        accountId: 'acc_platform',
        accountType: 'PLATFORM',
        direction: 'CREDIT',
        amountMinor: 100, // ₹1.00 (20%)
        currency: 'INR',
        transactionType: 'PLATFORM_FEE',
        referenceType: 'PURCHASE',
        referenceId: 'purch_seed_101',
        purchaseId: 'purch_seed_101',
        marketplaceListingId: 'mkt-standard-01',
        providerTransactionId: 'txn_mock_seed_101',
        idempotencyKey: 'idemp_seed_101',
        status: 'COMPLETED',
        occurredAt: now,
        createdAt: now
      },
      {
        id: 'fin_led_seed_01_rep',
        tenantId: 'buyer-tenant-metro',
        accountId: 'acc_rep-david-okafor',
        accountType: 'REPORTER',
        direction: 'CREDIT',
        amountMinor: 400, // ₹4.00 (80%)
        currency: 'INR',
        transactionType: 'ROYALTY_CREDIT',
        referenceType: 'PURCHASE',
        referenceId: 'purch_seed_101',
        purchaseId: 'purch_seed_101',
        marketplaceListingId: 'mkt-standard-01',
        providerTransactionId: 'txn_mock_seed_101',
        idempotencyKey: 'idemp_seed_101',
        status: 'COMPLETED',
        occurredAt: now,
        createdAt: now
      }
    ];

    this.appendTransactionGroup(seedGroup, 'idemp_seed_101');
  }

  /**
   * Appends an atomic transaction group of entries to the ledger after double-entry validation.
   */
  appendTransactionGroup(
    entries: FinancialLedgerEntry[],
    idempotencyKey: string
  ): { success: boolean; entries: FinancialLedgerEntry[] } {
    // 1. Idempotency Check
    if (this.idempotencyMap.has(idempotencyKey)) {
      return {
        success: true,
        entries: this.idempotencyMap.get(idempotencyKey)!
      };
    }

    // 2. Double-Entry Integrity Check
    const validation = financialLedgerIntegrityService.validateTransactionGroup(entries);
    if (!validation.valid) {
      throw new Error(`Financial Ledger Error: ${validation.error}`);
    }

    // 3. Append to Ledger (Immutable)
    for (const entry of entries) {
      this.ledger.push(entry);
    }

    this.idempotencyMap.set(idempotencyKey, entries);

    return {
      success: true,
      entries
    };
  }

  /**
   * Returns all ledger entries.
   */
  getEntries(filter?: {
    accountId?: string;
    accountType?: string;
    referenceId?: string;
    purchaseId?: string;
    tenantId?: string;
  }): FinancialLedgerEntry[] {
    let list = [...this.ledger];

    if (filter?.accountId) {
      list = list.filter(e => e.accountId === filter.accountId);
    }
    if (filter?.accountType) {
      list = list.filter(e => e.accountType === filter.accountType);
    }
    if (filter?.referenceId) {
      list = list.filter(e => e.referenceId === filter.referenceId);
    }
    if (filter?.purchaseId) {
      list = list.filter(e => e.purchaseId === filter.purchaseId);
    }
    if (filter?.tenantId) {
      list = list.filter(e => e.tenantId === filter.tenantId);
    }

    return list;
  }

  /**
   * Reconstructs authoritative net account balance in minor units directly from ledger entries.
   */
  getAccountBalanceMinor(accountId: string): {
    totalCreditsMinor: number;
    totalDebitsMinor: number;
    netBalanceMinor: number;
  } {
    const entries = this.ledger.filter(e => e.accountId === accountId && e.status === 'COMPLETED');
    let totalCreditsMinor = 0;
    let totalDebitsMinor = 0;

    for (const e of entries) {
      if (e.direction === 'CREDIT') {
        totalCreditsMinor += e.amountMinor;
      } else if (e.direction === 'DEBIT') {
        totalDebitsMinor += e.amountMinor;
      }
    }

    return {
      totalCreditsMinor,
      totalDebitsMinor,
      netBalanceMinor: totalCreditsMinor - totalDebitsMinor
    };
  }
}

export const financialLedgerService = new FinancialLedgerService();
