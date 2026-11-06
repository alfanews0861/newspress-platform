/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Platform — Phase 16 Data Quality & Integrity Validation Service
 * Runs deterministic integrity checks across all 15 platform phases:
 * - Missing tenant IDs
 * - Orphaned foreign references
 * - Invalid lifecycle state transitions
 * - Duplicate idempotency keys
 * - Production artifact checksum validation
 * - Inconsistent double-entry financial ledger balances
 * - Stale production queue leases
 * - License vs payment status discrepancies
 * - Auditable dry-run repair proposal generation (NEVER mutates immutable ledger history)
 */

import crypto from 'crypto';
import {
  DataQualityAnomaly,
  IntegrityRepairProposal,
  DataIntegrityAnomalySeverity,
} from '../types/reliabilityPhase16';

export class DataIntegrityValidationService {
  private proposals: Map<string, IntegrityRepairProposal> = new Map();

  /**
   * Runs an exhaustive, read-only integrity audit across provided records
   */
  public auditSystemIntegrity(dataset: {
    news?: Array<{ id: string; tenantId?: string; status: string; authorId?: string; originalStoryId?: string }>;
    editions?: Array<{ id: string; tenantId?: string; status: string; brandId?: string }>;
    brands?: Array<{ id: string; tenantId: string }>;
    users?: Array<{ uid: string; email: string }>;
    licenses?: Array<{ id: string; tenantId: string; purchaseId?: string; status: string; paymentStatus?: string }>;
    purchases?: Array<{ id: string; status: string }>;
    ledgerTransactions?: Array<{ id: string; tenantId?: string; debits: number; credits: number; isImmutable?: boolean }>;
    queueJobs?: Array<{ id: string; status: string; lockedBy?: string; leaseExpiresAt?: string }>;
    idempotencyRecords?: Array<{ key: string; scope: string; createdAt: string }>;
    productionArtifacts?: Array<{ id: string; checksumSha256: string; content?: string }>;
  }): DataQualityAnomaly[] {
    const anomalies: DataQualityAnomaly[] = [];
    const timestamp = new Date().toISOString();

    // 1. Missing tenant IDs on news
    if (dataset.news) {
      for (const item of dataset.news) {
        if (!item.tenantId || item.tenantId.trim() === '') {
          anomalies.push({
            anomalyId: `anom-${crypto.randomBytes(4).toString('hex')}`,
            category: 'MISSING_TENANT_ID',
            severity: 'CRITICAL',
            affectedTable: 'news',
            recordId: item.id,
            description: `News story ${item.id} has missing or empty tenantId. Cross-tenant leakage vulnerability!`,
            detectedAt: timestamp,
            remediationActionProposal: 'Quarantine record and assign to verified author primary organization.',
            requiresAuthorization: true,
          });
        }
      }
    }

    // 2. Orphaned brand references on editions
    if (dataset.editions && dataset.brands) {
      const knownBrandIds = new Set(dataset.brands.map((b) => b.id));
      for (const edition of dataset.editions) {
        if (edition.brandId && !knownBrandIds.has(edition.brandId)) {
          anomalies.push({
            anomalyId: `anom-${crypto.randomBytes(4).toString('hex')}`,
            category: 'ORPHANED_REFERENCE',
            severity: 'HIGH',
            affectedTable: 'editions',
            recordId: edition.id,
            tenantId: edition.tenantId,
            description: `Edition ${edition.id} references non-existent publication brand ${edition.brandId}.`,
            detectedAt: timestamp,
            remediationActionProposal: 'Remap to default primary brand for tenant.',
            requiresAuthorization: false,
          });
        }
      }
    }

    // 3. Invalid lifecycle transitions on news
    if (dataset.news) {
      const validStatuses = new Set([
        'draft',
        'submitted',
        'in_review',
        'approved',
        'rejected',
        'published',
        'archived',
        'marketplace_listed',
        'possible_duplicate',
        'duplicate_confirmed',
        'disputed',
      ]);
      for (const item of dataset.news) {
        if (!validStatuses.has(item.status)) {
          anomalies.push({
            anomalyId: `anom-${crypto.randomBytes(4).toString('hex')}`,
            category: 'INVALID_LIFECYCLE',
            severity: 'HIGH',
            affectedTable: 'news',
            recordId: item.id,
            tenantId: item.tenantId,
            description: `News story ${item.id} contains illegal status '${item.status}'.`,
            detectedAt: timestamp,
            remediationActionProposal: 'Reset status to in_review and generate editorial audit alert.',
            requiresAuthorization: true,
          });
        }
      }
    }

    // 4. Duplicate idempotency records
    if (dataset.idempotencyRecords) {
      const seenKeys = new Map<string, number>();
      for (const rec of dataset.idempotencyRecords) {
        const fullKey = `${rec.scope}:${rec.key}`;
        seenKeys.set(fullKey, (seenKeys.get(fullKey) || 0) + 1);
      }
      for (const [key, count] of seenKeys.entries()) {
        if (count > 1) {
          anomalies.push({
            anomalyId: `anom-${crypto.randomBytes(4).toString('hex')}`,
            category: 'ORPHANED_REFERENCE',
            severity: 'MEDIUM',
            affectedTable: 'apiIdempotency',
            recordId: key,
            description: `Duplicate idempotency record found for key ${key} (${count} occurrences).`,
            detectedAt: timestamp,
            remediationActionProposal: 'Deduplicate idempotency records keeping most recent timestamp.',
            requiresAuthorization: false,
          });
        }
      }
    }

    // 5. Inconsistent double-entry financial ledger balances
    if (dataset.ledgerTransactions) {
      for (const tx of dataset.ledgerTransactions) {
        if (tx.debits !== tx.credits) {
          anomalies.push({
            anomalyId: `anom-${crypto.randomBytes(4).toString('hex')}`,
            category: 'LEDGER_IMBALANCE',
            severity: 'CRITICAL',
            affectedTable: 'ledgerTransactions',
            recordId: tx.id,
            tenantId: tx.tenantId,
            description: `Double-entry ledger transaction ${tx.id} is imbalanced: debits=${tx.debits}, credits=${tx.credits} (diff=${Math.abs(tx.debits - tx.credits)}).`,
            detectedAt: timestamp,
            remediationActionProposal: 'DO NOT MUTATE IMMUTABLE ENTRY! Issue a compensating reconciliation ledger entry with audit trail.',
            requiresAuthorization: true,
          });
        }
      }
    }

    // 6. Stale production queue leases
    if (dataset.queueJobs) {
      const now = Date.now();
      for (const job of dataset.queueJobs) {
        if (job.status === 'PROCESSING' && job.leaseExpiresAt) {
          const expiresAt = new Date(job.leaseExpiresAt).getTime();
          if (expiresAt < now) {
            anomalies.push({
              anomalyId: `anom-${crypto.randomBytes(4).toString('hex')}`,
              category: 'STALE_QUEUE_LEASE',
              severity: 'HIGH',
              affectedTable: 'productionQueue',
              recordId: job.id,
              description: `Queue job ${job.id} lease held by worker ${job.lockedBy || 'unknown'} expired at ${job.leaseExpiresAt}. Worker likely crashed.`,
              detectedAt: timestamp,
              remediationActionProposal: 'Release lease, increment retry counter, and re-enqueue for active worker pool.',
              requiresAuthorization: false,
            });
          }
        }
      }
    }

    // 7. Checksum validation on production artifacts
    if (dataset.productionArtifacts) {
      for (const artifact of dataset.productionArtifacts) {
        if (artifact.content) {
          const calculatedSha = crypto.createHash('sha256').update(artifact.content).digest('hex');
          if (calculatedSha !== artifact.checksumSha256) {
            anomalies.push({
              anomalyId: `anom-${crypto.randomBytes(4).toString('hex')}`,
              category: 'CHECKSUM_MISMATCH',
              severity: 'CRITICAL',
              affectedTable: 'printArtifacts',
              recordId: artifact.id,
              description: `Artifact ${artifact.id} SHA-256 mismatch. Stored: ${artifact.checksumSha256}, Computed: ${calculatedSha}. Potential artifact tampering or bit-rot!`,
              detectedAt: timestamp,
              remediationActionProposal: 'Freeze artifact distribution, regenerate from immutable source snapshot, and alert security.',
              requiresAuthorization: true,
            });
          }
        }
      }
    }

    // 8. License vs payment status discrepancy
    if (dataset.licenses) {
      for (const lic of dataset.licenses) {
        if (lic.status === 'ACTIVE' && (lic.paymentStatus === 'REFUNDED' || lic.paymentStatus === 'CHARGEBACK')) {
          anomalies.push({
            anomalyId: `anom-${crypto.randomBytes(4).toString('hex')}`,
            category: 'LICENSE_DISCREPANCY',
            severity: 'HIGH',
            affectedTable: 'newsLicenses',
            recordId: lic.id,
            tenantId: lic.tenantId,
            description: `License ${lic.id} is marked ACTIVE but underlying payment status is ${lic.paymentStatus}. Revocation was not applied.`,
            detectedAt: timestamp,
            remediationActionProposal: 'Suspend or revoke license status to REVOKED_PAYMENT_REVERSED.',
            requiresAuthorization: true,
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Generates a dry-run repair proposal without mutating any live data
   */
  public createDryRunRepairProposal(anomalies: DataQualityAnomaly[], createdBy: string): IntegrityRepairProposal {
    const proposalId = `prop-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const proposedOperations: string[] = [];
    let immutableRecordsSkipped = 0;
    let recordsAffected = 0;

    for (const anom of anomalies) {
      if (anom.affectedTable === 'ledgerTransactions' || anom.category === 'LEDGER_IMBALANCE') {
        immutableRecordsSkipped++;
        proposedOperations.push(`[IMMUTABLE_PRESERVED] ${anom.recordId}: Propose compensatory reconciliation entry (diff adjustment) rather than editing immutable ledger history.`);
      } else if (anom.category === 'STALE_QUEUE_LEASE') {
        recordsAffected++;
        proposedOperations.push(`[LEASE_RECOVERY] ${anom.recordId}: Reset worker lock to null, mark status READY, retryCount + 1.`);
      } else if (anom.category === 'LICENSE_DISCREPANCY') {
        recordsAffected++;
        proposedOperations.push(`[LICENSE_REVOCATION] ${anom.recordId}: Transition license status to REVOKED_PAYMENT_REVERSED.`);
      } else if (anom.category === 'ORPHANED_REFERENCE') {
        recordsAffected++;
        proposedOperations.push(`[REFERENCE_CLEANUP] ${anom.recordId}: ${anom.remediationActionProposal}`);
      } else {
        recordsAffected++;
        proposedOperations.push(`[REMEDIATION] ${anom.recordId}: ${anom.remediationActionProposal}`);
      }
    }

    const proposal: IntegrityRepairProposal = {
      proposalId,
      createdAt: new Date().toISOString(),
      createdBy,
      anomalyCount: anomalies.length,
      anomalies,
      dryRunResult: {
        canSafelyRepair: true,
        recordsAffected,
        immutableRecordsSkipped,
        proposedOperations,
      },
      status: 'PROPOSED',
    };

    this.proposals.set(proposalId, proposal);
    return proposal;
  }

  public getProposal(proposalId: string): IntegrityRepairProposal | undefined {
    return this.proposals.get(proposalId);
  }

  public listProposals(): IntegrityRepairProposal[] {
    return Array.from(this.proposals.values());
  }
}

export const dataIntegrityValidationService = new DataIntegrityValidationService();
