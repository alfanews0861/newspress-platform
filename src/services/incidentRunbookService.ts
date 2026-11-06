/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Platform — Phase 16 Incident Management & Operational Runbooks
 * Complete operational runbook library covering all 12 platform failure modes:
 * RB-01: Suspected Tenant Data Exposure
 * RB-02: API Credential Compromise & Emergency Revocation
 * RB-03: Webhook Endpoint Abuse & SSRF Attempt
 * RB-04: Payment Provider Outage & Provider Failover
 * RB-05: Duplicate Payout Risk & Settlement Freeze
 * RB-06: Financial Reconciliation Failure
 * RB-07: Production Queue Backlog & Worker Stall
 * RB-08: Corrupted or Missing PDF Artifacts
 * RB-09: Vendor Dispatch Failure & Fallback Routing
 * RB-10: Firestore Availability & Quota Spike
 * RB-11: Automated Backup Failure & Snapshot Desync
 * RB-12: Failed Deployment & Zero-Downtime Rollback
 * 
 * Each runbook fulfills all 10 mandated criteria plus rollback procedures.
 */

import { IncidentRunbook, IncidentSeverity } from '../types/reliabilityPhase16';

export class IncidentRunbookService {
  private runbooks: Map<string, IncidentRunbook> = new Map();

  constructor() {
    this.initializeRunbooks();
  }

  private initializeRunbooks(): void {
    const list: IncidentRunbook[] = [
      {
        runbookId: 'rb-01',
        code: 'RB-01',
        title: 'Suspected Tenant Data Exposure & Cross-Tenant Leakage',
        detectionSignal: 'Cross-tenant access anomalies detected in audit logs, 403 authorization spikes, or user reports of foreign organization content.',
        severity: 'SEV1_CRITICAL',
        immediateContainment: [
          'Immediately revoke active session tokens for the affected user session or API token.',
          'Quarantine tenant document cache and invalidate edge CDN caches.',
          'Temporarily restrict target organization API access to read-only mode if automated crawling is detected.',
        ],
        authorizationRequirements: 'Requires dual authorization from Platform Security Officer and Super Administrator.',
        evidencePreservation: [
          'Snapshot Firestore access logs with correlation IDs for preceding 48 hours.',
          'Preserve all incoming request headers, origin IPs, and targeted resource IDs.',
          'Export immutable audit trail events to isolated security bucket.',
        ],
        recoverySteps: [
          'Verify tenant context derivation in server middleware to ensure no client-provided tenantId bypass exists.',
          'Audit Firestore rules evaluate blocks against the compromised collection.',
          'Apply patched access gate and verify using automated emulator regression tests.',
          'Re-enable access and monitor real-time correlation traces.',
        ],
        validationCriteria: [
          'Zero cross-tenant requests succeed in emulator regression suite.',
          'Audit trail shows zero 403 or 200 responses across mismatched tenant boundaries.',
        ],
        communicationResponsibilities: 'Platform Communications Officer drafts tenant advisory within 4 hours; Legal notifies affected Data Protection Officer.',
        escalationPath: ['On-Call Security Engineer', 'Head of Security & Compliance', 'Chief Executive Officer'],
        postIncidentReview: [
          'Conduct blameless post-mortem within 48 hours.',
          'Document root cause (code regression vs configuration error).',
          'Add automated integration tests reproducing the specific payload pattern.',
        ],
        rollbackProcedure: [
          'Revert recent authorization policy deployment to last known stable commit.',
          'Re-deploy validated firestore.rules.',
        ],
      },
      {
        runbookId: 'rb-02',
        code: 'RB-02',
        title: 'API Credential Compromise & Emergency Revocation',
        detectionSignal: 'Spike in API rate-limit violations from unknown CIDR blocks, credential leak alert from Git scanner, or customer notification.',
        severity: 'SEV1_CRITICAL',
        immediateContainment: [
          'Immediately transition credential status to REVOKED in ApiCredentialService.',
          'Purge active in-memory credential cache entries across worker fleet.',
          'Reject all subsequent requests presenting the revoked key with 401 UNAUTHORIZED.',
        ],
        authorizationRequirements: 'Tenant Administrator or Platform Super Administrator.',
        evidencePreservation: [
          'Export all API access logs containing the key ID from the last 7 days.',
          'Record IP geolocation, user agents, endpoints touched, and response payload hashes.',
        ],
        recoverySteps: [
          'Generate a new cryptographically secure key pair (np_live_...) with the same scope set.',
          'Deliver secret securely to customer via one-time encrypted credential drawer.',
          'Configure grace period on the rotated credential if mutual rotation is active.',
        ],
        validationCriteria: [
          'Revoked key returns HTTP 401 with code CREDENTIAL_REVOKED on all endpoints.',
          'New key operates successfully within provisioned rate-limit tiers.',
        ],
        communicationResponsibilities: 'Developer Support directly notifies customer primary developer contact via registered email and telephone.',
        escalationPath: ['API Platform Lead', 'VP of Engineering'],
        postIncidentReview: [
          'Review leak origin (committed to repo, CI log exposure, or client-side leakage).',
          'Enforce pre-commit git secret scanner on all developer machines.',
        ],
        rollbackProcedure: [
          'Revocation is non-reversible; if revoked erroneously, generate a new replacement key immediately.',
        ],
      },
      {
        runbookId: 'rb-03',
        code: 'RB-03',
        title: 'Webhook Endpoint Abuse & Outbound SSRF Attempt',
        detectionSignal: 'Webhook dispatcher receives URLs resolving to RFC 1918 / loopback / cloud metadata IPs, or rapid timeouts from target destination.',
        severity: 'SEV2_HIGH',
        immediateContainment: [
          'WebhookSsrfProtectionService immediately drops delivery and logs BLOCKED_UNSAFE_DESTINATION.',
          'Automatically suspend destination endpoint and transition webhook status to SUSPENDED_SSRF.',
          'Block caller IP from modifying webhook URLs for 24 hours.',
        ],
        authorizationRequirements: 'Platform Security Officer or Developer Portal Lead.',
        evidencePreservation: [
          'Capture the exact target URL, DNS query logs, resolved IP addresses, and HTTP payload.',
          'Capture caller tenantId, user agent, and submitting API credential.',
        ],
        recoverySteps: [
          'Review DNS rebinding protections to confirm resolution verification occurred before connection.',
          'Notify tenant owner that endpoint violates RFC 1918 private networking policy.',
          'Require HTTPS and public routable IP before endpoint can be re-enabled.',
        ],
        validationCriteria: [
          'Localhost (127.0.0.1, ::1), private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), and cloud metadata (169.254.169.254) are rejected with 400 Bad Request.',
        ],
        communicationResponsibilities: 'Security operations sends automated advisory to the application developer.',
        escalationPath: ['Security Engineer', 'Infrastructure Lead'],
        postIncidentReview: [
          'Verify that WebhookSsrfProtectionService test suite covers IPv6 mapped addresses, octal IP tricks, and DNS rebinding.',
        ],
        rollbackProcedure: [
          'Re-enable endpoint only after tenant proves public hostname ownership via domain verification challenge.',
        ],
      },
      {
        runbookId: 'rb-04',
        code: 'RB-04',
        title: 'Payment Provider Outage & Provider Failover',
        detectionSignal: '5xx errors or network timeouts exceeding 5000ms from primary payment gateway (Stripe or Razorpay).',
        severity: 'SEV2_HIGH',
        immediateContainment: [
          'Enable circuit breaker on failing payment gateway in PaymentProviderFactory.',
          'Activate secondary backup provider or queue intent for offline capture.',
          'Display transparent status banner on Marketplace checkout: "Payment Gateway Latency — Retrying".',
        ],
        authorizationRequirements: 'Finance Operations Lead or Platform Super Administrator.',
        evidencePreservation: [
          'Log provider gateway error payloads, HTTP response codes, and idempotency request keys.',
        ],
        recoverySteps: [
          'Monitor payment provider status page until services report operational recovery.',
          'Run automated synthetic charge test in test mode before restoring primary traffic.',
          'Process delayed payment intents using idempotent capture requests.',
        ],
        validationCriteria: [
          'Synthetic test charges succeed in under 2000ms with 200 OK.',
          'Zero duplicate charges confirmed against provider webhooks.',
        ],
        communicationResponsibilities: 'Finance team monitors customer support tickets for failed purchase attempts.',
        escalationPath: ['Billing Operations Lead', 'Payment Partner Support Escalation', 'Chief Financial Officer'],
        postIncidentReview: [
          'Evaluate provider SLA compliance and calculate potential downtime credit claims.',
        ],
        rollbackProcedure: [
          'Toggle provider active flag back to primary once 10 consecutive synthetic charges pass cleanly.',
        ],
      },
      {
        runbookId: 'rb-05',
        code: 'RB-05',
        title: 'Duplicate Payout Risk & Settlement Freeze',
        detectionSignal: 'Multiple payout webhook events with identical payoutId, or reporter wallet balance calculation discrepancy alert alt-payout-duplicate-risk.',
        severity: 'SEV1_CRITICAL',
        immediateContainment: [
          'IMMEDIATELY FREEZE the automated payout dispatcher: set payout execution gate to PAUSED.',
          'Place all pending payouts in HELD_FOR_VERIFICATION state.',
          'Do NOT execute external bank disbursements until integrity check passes.',
        ],
        authorizationRequirements: 'Chief Financial Officer and Lead Security Engineer.',
        evidencePreservation: [
          'Lock ledgerTransactions and reporterWallets snapshots.',
          'Preserve incoming webhook payloads from banking partner.',
        ],
        recoverySteps: [
          'Execute auditSystemIntegrity to identify duplicate payout attempts.',
          'Verify that payout reservation holds were not released twice.',
          'Verify banking partner settlement transaction IDs against ledger entries.',
          'Lift freeze only with multi-sign approval.',
        ],
        validationCriteria: [
          'Double-entry ledger balances debit == credit.',
          'Zero reporter wallets have negative balances.',
          'Each completed payout has exactly one unique banking reference ID.',
        ],
        communicationResponsibilities: 'CFO alerts Finance team and executive committee; no external comms until scope is verified.',
        escalationPath: ['Finance Engineer', 'Chief Financial Officer', 'Super Administrator'],
        postIncidentReview: [
          'Review webhook deduplication and distributed lock mechanism in PayoutService.',
        ],
        rollbackProcedure: [
          'If a duplicate payout executed at bank: initiate banking partner recall request and issue compensatory reversal ledger entry. NEVER mutate historical ledger rows!',
        ],
      },
      {
        runbookId: 'rb-06',
        code: 'RB-06',
        title: 'Financial Reconciliation Discrepancy & Ledger Imbalance',
        detectionSignal: 'Daily reconciliation job finds total debits !== total credits, or ledger sum does not match provider settled gross.',
        severity: 'SEV1_CRITICAL',
        immediateContainment: [
          'Freeze reporter automated withdrawals and high-value payouts (> ₹50,000).',
          'Lock current accounting period from automated ledger closing.',
        ],
        authorizationRequirements: 'Head of Finance and Platform Super Administrator.',
        evidencePreservation: [
          'Export complete ledger transaction table for the discrepancy window with cryptographic hashes.',
          'Capture provider settlement export files (Stripe/Razorpay payout CSVs).',
        ],
        recoverySteps: [
          'Run DataIntegrityValidationService to locate the exact transaction ID with debit/credit mismatch.',
          'NON-NEGOTIABLE RULE: Do NOT edit historical ledger records!',
          'Issue an authorized compensating adjustment journal entry signed by the Head of Finance.',
          'Verify ledger equilibrium post-adjustment.',
        ],
        validationCriteria: [
          'Total ledger debits equal total ledger credits across all accounts: sum(debits) - sum(credits) == 0.',
        ],
        communicationResponsibilities: 'Finance Controller prepares discrepancy report for internal audit committee.',
        escalationPath: ['Lead Billing Engineer', 'Financial Controller', 'Chief Financial Officer'],
        postIncidentReview: [
          'Identify software defect (floating point rounding vs missing split entry) and patch in test suite.',
        ],
        rollbackProcedure: [
          'If adjustment entry was drafted in error, post an offsetting correction entry with referenced audit ID.',
        ],
      },
      {
        runbookId: 'rb-07',
        code: 'RB-07',
        title: 'Production Queue Backlog & Worker Lease Stall',
        detectionSignal: 'Queue depth exceeds 25 jobs, or oldest job age exceeds 30 minutes, or worker lease timeout alerts fire.',
        severity: 'SEV2_HIGH',
        immediateContainment: [
          'Inspect active worker process health and memory consumption.',
          'Automatically reclaim expired worker leases whose timestamp exceeded 15-minute lease duration.',
          'Scale worker concurrency from default 4 to maximum 12 workers.',
        ],
        authorizationRequirements: 'Production Operations Manager or On-Call DevOps Engineer.',
        evidencePreservation: [
          'Capture worker stdout/stderr logs and headless browser render error traces.',
          'Record edition IDs of failing jobs.',
        ],
        recoverySteps: [
          'Identify poisoned job (e.g. malformed SVG or infinite CSS layout loop) and quarantine to DEAD_LETTER_QUEUE.',
          'Restart stalled rendering workers.',
          'Process backlog in FIFO priority order (prioritizing front-page deadline editions).',
        ],
        validationCriteria: [
          'Queue depth drops below 5 jobs.',
          'Average job processing time returns to < 45 seconds.',
        ],
        communicationResponsibilities: 'Operations alerts Newsroom Managing Editors regarding print deadline ETA adjustments.',
        escalationPath: ['Production On-Call', 'DevOps Lead', 'Production Director'],
        postIncidentReview: [
          'Benchmark layout rendering engine with the poisoned job assets in a sandboxed test suite.',
        ],
        rollbackProcedure: [
          'If newly deployed rendering binary is causing crashes, rollback to previous container image version.',
        ],
      },
      {
        runbookId: 'rb-08',
        code: 'RB-08',
        title: 'Corrupted or Missing PDF Artifacts & Checksum Mismatch',
        detectionSignal: 'Print preflight error, artifact 404 from storage bucket, or SHA-256 checksum mismatch detected by DataIntegrityValidationService.',
        severity: 'SEV1_CRITICAL',
        immediateContainment: [
          'Halt print plate dispatch to physical printing press vendors.',
          'Mark affected edition production status as HELD_INTEGRITY_CHECK.',
        ],
        authorizationRequirements: 'Production Director and Lead Architect.',
        evidencePreservation: [
          'Preserve corrupt artifact bytes in quarantine bucket with timestamp and headers.',
          'Save layout engine render parameters and edition version snapshot ID.',
        ],
        recoverySteps: [
          'Retrieve immutable EditionVersion snapshot from Firestore.',
          'Trigger clean deterministic re-render of print plates using PrintRenderingService.',
          'Compute fresh SHA-256 checksum and verify matching layout dimensions and color separations.',
          'Update PrintArtifactRegistry with newly minted verified artifact.',
        ],
        validationCriteria: [
          'Newly generated artifact SHA-256 is verified and matches database manifest.',
          'Preflight inspection passes 100% of PDF/X-1a compliance tests.',
        ],
        communicationResponsibilities: 'Production Desk informs print press plant manager of updated release time.',
        escalationPath: ['Production Desk Lead', 'Chief Technology Officer'],
        postIncidentReview: [
          'Determine if storage provider experienced silent data corruption or if an unauthorized write occurred.',
        ],
        rollbackProcedure: [
          'If re-render fails, fall back to previous approved edition proof version if available.',
        ],
      },
      {
        runbookId: 'rb-09',
        code: 'RB-09',
        title: 'Vendor Dispatch Failure & Fallback Routing',
        detectionSignal: 'SFTP connection timeout, vendor API 500 error, or unacknowledged dispatch after 20 minutes.',
        severity: 'SEV2_HIGH',
        immediateContainment: [
          'Pause automated retries to primary vendor to avoid connection throttling.',
          'Check vendor status endpoint and SFTP port reachability.',
        ],
        authorizationRequirements: 'Production Operations Manager.',
        evidencePreservation: [
          'Record SFTP transfer logs, SSH handshake errors, and HTTP response headers.',
        ],
        recoverySteps: [
          'If primary vendor is unreachable > 30 minutes, invoke Regional Fallback Vendor configuration.',
          'Re-encrypt print plates with secondary vendor PGP public key.',
          'Dispatch plates via secondary secure endpoint with fresh idempotent dispatch token.',
          'Verify receipt of signed vendor acknowledgement token.',
        ],
        validationCriteria: [
          'Vendor acknowledgement token successfully received and verified.',
          'Distribution status advances to TRANSMITTED_ACKNOWLEDGED.',
        ],
        communicationResponsibilities: 'Production manager phones plant manager of primary and secondary print sites.',
        escalationPath: ['Production On-Call', 'Vendor Management Lead'],
        postIncidentReview: [
          'Review SLA agreement with primary vendor for credit calculation.',
        ],
        rollbackProcedure: [
          'If primary vendor recovers before fallback finishes: verify no dual printing occurs by sending explicit cancellation token.',
        ],
      },
      {
        runbookId: 'rb-10',
        code: 'RB-10',
        title: 'Firestore Availability & Daily Quota Spike',
        detectionSignal: 'Application receives "Quota exceeded" or "ResourceExhausted" error from Firestore SDK, or query latency exceeds 3000ms.',
        severity: 'SEV1_CRITICAL',
        immediateContainment: [
          'Activate local in-memory fallback cache for read-heavy operations (e.g. system settings, templates, navigation).',
          'Disable non-essential background analytics aggregations and scheduled exports.',
          'Throttle developer API rate limits to STARTER tier across all apps.',
        ],
        authorizationRequirements: 'Platform Super Administrator and Infrastructure Lead.',
        evidencePreservation: [
          'Capture Firestore usage metric graphs from Google Cloud Console (reads/sec, writes/sec).',
          'Identify runaway query patterns from correlation logs.',
        ],
        recoverySteps: [
          'If quota exceeded: access Google Cloud Console to request emergency quota increase or upgrade tier.',
          'Identify and terminate runaway client listener (e.g. unbounded onSnapshot without limit()).',
          'Deploy optimized query indexes and bounded pagination limits.',
        ],
        validationCriteria: [
          'Firestore error rate returns to 0%.',
          'Database reads and writes stabilize within standard operational budget.',
        ],
        communicationResponsibilities: 'Platform Operations posts banner on NewsPress status page.',
        escalationPath: ['DevOps Lead', 'Google Cloud Support Escalation', 'VP of Engineering'],
        postIncidentReview: [
          'Audit all collection queries across frontend and backend for missing limit() constraints.',
        ],
        rollbackProcedure: [
          'Revert code commit containing the unindexed full-collection scan query.',
        ],
      },
      {
        runbookId: 'rb-11',
        code: 'RB-11',
        title: 'Automated Backup Failure & Snapshot Desync',
        detectionSignal: 'Daily scheduled backup cron job fails or manifest checksum validation fails during routine integrity audit.',
        severity: 'SEV2_HIGH',
        immediateContainment: [
          'Verify that live production database is unharmed (confirm backup failure was read/export issue).',
          'Lock previous backup manifest retention expiration to prevent automatic pruning of last known good snapshot.',
        ],
        authorizationRequirements: 'DevOps Lead or Platform Super Administrator.',
        evidencePreservation: [
          'Save backup runner container logs and Cloud Storage bucket permission errors.',
        ],
        recoverySteps: [
          'Trigger immediate manual on-demand backup manifest generation via DisasterRecoveryService.',
          'Verify newly generated manifest SHA-256 checksum and document counts against live database counts.',
          'Execute dry-run restore validation in isolated sandbox.',
        ],
        validationCriteria: [
          'Backup manifest status is VERIFIED with valid 64-character SHA-256 hash.',
          'Isolated restore verification report confirms 100% document count match.',
        ],
        communicationResponsibilities: 'Infrastructure team updates weekly compliance compliance log.',
        escalationPath: ['DevOps On-Call', 'Head of Infrastructure'],
        postIncidentReview: [
          'Inspect Cloud Storage lifecycle policies and IAM service account permissions.',
        ],
        rollbackProcedure: [
          'Ensure previous daily snapshot remains active until new backup is 100% verified.',
        ],
      },
      {
        runbookId: 'rb-12',
        code: 'RB-12',
        title: 'Failed Deployment & Zero-Downtime Rollback',
        detectionSignal: 'Post-deployment smoke tests fail, 5xx error rate spikes above 1%, or critical service regression detected within 15 minutes of release.',
        severity: 'SEV1_CRITICAL',
        immediateContainment: [
          'HALT continuous deployment pipeline immediately.',
          'Reroute traffic at load balancer / Cloud Run traffic splitting to previous revision (100% to PREVIOUS_STABLE).',
        ],
        authorizationRequirements: 'Release Manager or Lead Engineer.',
        evidencePreservation: [
          'Save build hash, commit SHA, container image digest, and failed smoke test output logs.',
        ],
        recoverySteps: [
          'Execute instant rollback command: revert traffic split to prior stable revision ID.',
          'If database schema migrations were applied: execute backward-compatible rollback migration.',
          'Run post-rollback smoke tests to confirm healthy response codes across /api/v1/health and core UI routes.',
        ],
        validationCriteria: [
          'Traffic successfully serving from PREVIOUS_STABLE revision.',
          'Smoke tests return 100% pass rate with zero 5xx errors.',
        ],
        communicationResponsibilities: 'Release Manager notifies engineering team in #deployments channel.',
        escalationPath: ['Release Manager', 'Engineering Director'],
        postIncidentReview: [
          'Hold post-mortem to determine why pre-deployment automated tests did not catch the regression.',
        ],
        rollbackProcedure: [
          'Documented one-click rollback: traffic split reverted in < 60 seconds; code reverted via git revert on main branch.',
        ],
      },
    ];

    for (const r of list) {
      this.runbooks.set(r.code, r);
    }
  }

  public getRunbook(code: string): IncidentRunbook | undefined {
    return this.runbooks.get(code);
  }

  public listRunbooks(): IncidentRunbook[] {
    return Array.from(this.runbooks.values());
  }
}

export const incidentRunbookService = new IncidentRunbookService();
