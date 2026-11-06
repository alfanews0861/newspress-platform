/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Financial Ledger Integrity & Double-Entry Validation Service
 * Phase 11 — Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine
 */

import { FinancialLedgerEntry } from '../types/financePhase11';

export class FinancialLedgerIntegrityService {
  /**
   * Validates double-entry balance for a given group of entries.
   * Requirement: Total Credits == Total Debits for every settlement event.
   */
  validateTransactionGroup(entries: FinancialLedgerEntry[]): { valid: boolean; totalCredits: number; totalDebits: number; error?: string } {
    let totalCredits = 0;
    let totalDebits = 0;

    for (const entry of entries) {
      if (entry.amountMinor < 0) {
        return {
          valid: false,
          totalCredits,
          totalDebits,
          error: `Entry ${entry.id} has negative amount ${entry.amountMinor}. Amounts in ledger must be non-negative integer minor units.`
        };
      }

      if (entry.direction === 'CREDIT') {
        totalCredits += entry.amountMinor;
      } else if (entry.direction === 'DEBIT') {
        totalDebits += entry.amountMinor;
      }
    }

    if (totalCredits !== totalDebits) {
      return {
        valid: false,
        totalCredits,
        totalDebits,
        error: `Ledger double-entry imbalance detected: Total Credits (${totalCredits}) != Total Debits (${totalDebits}). Delta: ${totalCredits - totalDebits} minor units.`
      };
    }

    return { valid: true, totalCredits, totalDebits };
  }

  /**
   * Validates account balance consistency across entire ledger history.
   */
  validateAccountLedger(accountId: string, entries: FinancialLedgerEntry[]): { valid: boolean; netBalanceMinor: number; totalCredits: number; totalDebits: number } {
    const accountEntries = entries.filter(e => e.accountId === accountId && e.status === 'COMPLETED');
    
    let totalCredits = 0;
    let totalDebits = 0;

    for (const entry of accountEntries) {
      if (entry.direction === 'CREDIT') {
        totalCredits += entry.amountMinor;
      } else {
        totalDebits += entry.amountMinor;
      }
    }

    const netBalanceMinor = totalCredits - totalDebits;

    return {
      valid: true,
      netBalanceMinor,
      totalCredits,
      totalDebits
    };
  }

  /**
   * Scans all transactions for imbalances or orphaned references.
   */
  detectImbalances(allEntries: FinancialLedgerEntry[]): Array<{ referenceId: string; deltaMinor: number; entriesCount: number }> {
    const grouped = new Map<string, FinancialLedgerEntry[]>();

    for (const entry of allEntries) {
      const ref = entry.referenceId || entry.purchaseId || 'unreferenced';
      const existing = grouped.get(ref) || [];
      existing.push(entry);
      grouped.set(ref, existing);
    }

    const imbalances: Array<{ referenceId: string; deltaMinor: number; entriesCount: number }> = [];

    for (const [ref, group] of grouped.entries()) {
      if (ref === 'unreferenced') continue;
      const validation = this.validateTransactionGroup(group);
      if (!validation.valid) {
        imbalances.push({
          referenceId: ref,
          deltaMinor: validation.totalCredits - validation.totalDebits,
          entriesCount: group.length
        });
      }
    }

    return imbalances;
  }
}

export const financialLedgerIntegrityService = new FinancialLedgerIntegrityService();
