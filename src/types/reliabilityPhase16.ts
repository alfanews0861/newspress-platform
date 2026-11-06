/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Platform — Phase 16 Production Reliability, Security Hardening & DR Types
 */

// Severity and Status Classifications
export type IncidentSeverity = 'SEV1_CRITICAL' | 'SEV2_HIGH' | 'SEV3_MEDIUM' | 'SEV4_LOW';
export type IncidentStatus = 'DETECTED' | 'CONTAINING' | 'MITIGATING' | 'RESOLVED' | 'POST_MORTEM_PENDING' | 'CLOSED';
export type AlertStatus = 'TRIGGERED' | 'ACKNOWLEDGED' | 'SUPPRESSED' | 'RESOLVED';
export type BackupStatus = 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
export type RestoreDrillStatus = 'NOT_STARTED' | 'SIMULATING' | 'VERIFYING_LEDGER' | 'COMPLETED_SUCCESS' | 'COMPLETED_WITH_WARNINGS' | 'FAILED';
export type DataIntegrityAnomalySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// Risk Register Types
export interface RiskItem {
  riskId: string;
  category: 'TENANT_ISOLATION' | 'FINANCIAL_INTEGRITY' | 'WEBHOOK_SSRF' | 'PRODUCTION_PIPELINE' | 'MOBILE_OFFLINE' | 'SECRETS_EXPOSURE' | 'DR_RESTORE';
  title: string;
  severity: IncidentSeverity;
  likelihood: 'HIGH' | 'MEDIUM' | 'LOW';
  affectedComponents: string[];
  mitigation: string;
  verificationMethod: string;
  status: 'MITIGATED' | 'IN_PROGRESS' | 'ACCEPTABLE_RISK';
}

// Threat Model Record
export interface ThreatModelEntry {
  threatId: string;
  title: string;
  trustBoundary: string;
  attackScenario: string;
  existingControl: string;
  additionalMitigation: string;
  testEvidence: string;
  status: 'SECURED' | 'MONITORED';
}

// Observability & Structured Logging
export interface StructuredLogEntry {
  id: string;
  timestamp: string;
  correlationId: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  service: string;
  tenantId?: string;
  userId?: string;
  action: string;
  message: string;
  durationMs?: number;
  metadata?: Record<string, any>;
  redactedFields?: string[];
}

// Alert Threshold & Definition
export interface ObservabilityAlert {
  alertId: string;
  metricName: string;
  ruleName: string;
  severity: IncidentSeverity;
  status: AlertStatus;
  threshold: number;
  actualValue: number;
  unit: string;
  triggeredAt: string;
  resolvedAt?: string;
  tenantId?: string;
  message: string;
  runbookRef?: string;
  cooldownSeconds: number;
  lastNotifiedAt?: string;
}

// Incident Runbook Interface (Satisfies the 10 mandated requirements)
export interface IncidentRunbook {
  runbookId: string;
  code: string; // e.g. 'RB-01'
  title: string;
  // 1. Detection signal
  detectionSignal: string;
  // 2. Severity classification
  severity: IncidentSeverity;
  // 3. Immediate containment
  immediateContainment: string[];
  // 4. Authorization requirements
  authorizationRequirements: string;
  // 5. Evidence preservation
  evidencePreservation: string[];
  // 6. Recovery steps
  recoverySteps: string[];
  // 7. Validation criteria
  validationCriteria: string[];
  // 8. Communication responsibilities
  communicationResponsibilities: string;
  // 9. Escalation path
  escalationPath: string[];
  // 10. Post-incident review requirements
  postIncidentReview: string[];
  // Rollback procedure
  rollbackProcedure: string[];
}

// Backup & Disaster Recovery Types
export interface BackupManifest {
  manifestId: string;
  backupType: 'FIRESTORE_SNAPSHOT' | 'STORAGE_ARTIFACTS' | 'FULL_SYSTEM_PITR';
  environment: 'TEST' | 'STAGING' | 'PRODUCTION';
  status: BackupStatus;
  createdAt: string;
  completedAt?: string;
  retentionExpiresAt: string;
  collectionsIncluded: string[];
  totalDocuments: number;
  totalStorageBytes: number;
  checksumSha256: string;
  storageRegion: string;
  isImmutable: boolean;
  metadata: {
    rtoTargetMinutes: number;
    rpoTargetMinutes: number;
    encryption: string;
    operatorRole: string;
  };
}

export interface RestoreDrillReport {
  drillId: string;
  manifestId: string;
  executedAt: string;
  status: RestoreDrillStatus;
  targetEnvironment: 'ISOLATED_TEST_SANDBOX' | 'STAGING_DRILL' | 'PRODUCTION';
  durationSeconds: number;
  dataLossWindowMinutes: number;
  recordsRestored: number;
  ledgerBalanced: boolean;
  duplicatePayoutsPrevented: boolean;
  duplicateVendorDispatchesPrevented: boolean;
  limitations: string[];
  operator: string;
  verifiedBy: string;
}

// Data Quality & Anomaly Checking
export interface DataQualityAnomaly {
  anomalyId: string;
  category: 'ORPHANED_REFERENCE' | 'MISSING_TENANT_ID' | 'LEDGER_IMBALANCE' | 'STALE_QUEUE_LEASE' | 'INVALID_LIFECYCLE' | 'CHECKSUM_MISMATCH' | 'LICENSE_DISCREPANCY';
  severity: DataIntegrityAnomalySeverity;
  affectedTable: string;
  recordId: string;
  tenantId?: string;
  description: string;
  detectedAt: string;
  remediationActionProposal: string;
  requiresAuthorization: boolean;
}

export interface IntegrityRepairProposal {
  proposalId: string;
  createdAt: string;
  createdBy: string;
  anomalyCount: number;
  anomalies: DataQualityAnomaly[];
  dryRunResult: {
    canSafelyRepair: boolean;
    recordsAffected: number;
    immutableRecordsSkipped: number; // Invariant: Ledger and Production snapshots are NEVER mutated directly
    proposedOperations: string[];
  };
  status: 'PROPOSED' | 'APPROVED' | 'APPLIED' | 'REJECTED';
  appliedAt?: string;
}

// Secrets Scanner
export interface SecretScanFinding {
  findingId: string;
  patternType: 'AWS_KEY' | 'STRIPE_LIVE_KEY' | 'PRIVATE_KEY' | 'JWT_SECRET' | 'FIREBASE_PRIVATE_KEY' | 'AUTHORIZATION_HEADER';
  maskedPreview: string;
  location: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  remediationStatus: 'REDACTED' | 'ROTATED' | 'CLEAN';
}
