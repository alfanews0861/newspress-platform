/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Financial Data Integrity & Integrity Scanner
 * Phase 11 — Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine
 */

import { FinancialReconciliationFinding } from '../types/financePhase11';
import { financialLedgerService } from './financialLedgerService';
import { financialLedgerIntegrityService } from './financialLedgerIntegrityService';

export class FinancialIntegrityService {
  /**
   * Scans the entire financial ledger for mathematical or double-entry discrepancies.
   */
  performIntegrityScan(): { valid: boolean; findings: FinancialReconciliationFinding[] } {
    const entries = financialLedgerService.getEntries();
    const imbalances = financialLedgerIntegrityService.detectImbalances(entries);

    const findings: FinancialReconciliationFinding[] = [];
    const now = new Date().toISOString();

    for (const imb of imbalances) {
      findings.push({
        id: `fnd_imb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        findingType: 'LEDGER_IMBALANCE',
        severity: 'CRITICAL',
        description: `Double-entry imbalance detected for reference ${imb.referenceId}. Credits vs Debits delta: ${imb.deltaMinor} minor units across ${imb.entriesCount} entries.`,
        referenceId: imb.referenceId,
        detectedAt: now,
        resolved: false
      });
    }

    return {
      valid: findings.length === 0,
      findings
    };
  }
}

export const financialIntegrityService = new FinancialIntegrityService();
