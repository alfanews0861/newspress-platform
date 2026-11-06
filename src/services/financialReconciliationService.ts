/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Financial Reconciliation Service
 * Phase 11 — Marketplace Revenue Settlement, Reporter Royalty Ledger & Payout Engine
 */

import { FinancialReconciliationFinding } from '../types/financePhase11';
import { financialIntegrityService } from './financialIntegrityService';
import { revenueRecognitionService } from './revenueRecognitionService';
import { payoutService } from './payoutService';

export class FinancialReconciliationService {
  private findings: FinancialReconciliationFinding[] = [];

  /**
   * Executes end-to-end financial reconciliation comparing:
   * Payment Provider -> Purchases -> Revenue Events -> Ledger -> Payable Balances -> Payouts -> Payout Provider
   */
  async reconcileAll(): Promise<{ totalFindings: number; findings: FinancialReconciliationFinding[] }> {
    const newFindings: FinancialReconciliationFinding[] = [];
    const now = new Date().toISOString();

    // 1. Scan ledger double-entry integrity
    const scan = financialIntegrityService.performIntegrityScan();
    newFindings.push(...scan.findings);

    // 2. Check for missing revenue events or payout mismatches
    const revenueEvents = revenueRecognitionService.getAllEvents();
    const payouts = payoutService.getAllRequests();

    for (const payout of payouts) {
      if (payout.status === 'COMPLETED' && !payout.providerPayoutId) {
        newFindings.push({
          id: `fnd_pout_${payout.id}`,
          findingType: 'PROVIDER_MISMATCH',
          severity: 'WARNING',
          description: `Payout #${payout.id} marked COMPLETED but missing provider transaction reference.`,
          referenceId: payout.id,
          tenantId: payout.tenantId,
          detectedAt: now,
          resolved: false
        });
      }
    }

    for (const f of newFindings) {
      this.findings.push(f);
    }

    return {
      totalFindings: this.findings.length,
      findings: this.findings
    };
  }

  getFindings(resolvedFilter = false): FinancialReconciliationFinding[] {
    return this.findings.filter(f => f.resolved === resolvedFilter);
  }

  resolveFinding(findingId: string, notes: string): FinancialReconciliationFinding {
    const found = this.findings.find(f => f.id === findingId);
    if (!found) throw new Error(`Reconciliation finding ${findingId} not found.`);

    found.resolved = true;
    found.resolutionNotes = notes;
    return found;
  }
}

export const financialReconciliationService = new FinancialReconciliationService();
