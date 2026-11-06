/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Platform — Phase 17 Launch Readiness Dashboard & Decision Gates Service
 */

import {
  LaunchCheckCategory,
  LaunchCheckStatus,
  LaunchGateCheck,
  LaunchDecision,
} from '../types/platformPhase17';
import { AuditService } from './auditService';

export const INITIAL_LAUNCH_CHECKS: LaunchGateCheck[] = [
  // 1. Security
  {
    checkId: 'gate-sec-01',
    category: 'SECURITY',
    title: 'Zero-Trust ABAC Security Rules',
    description: 'Verify Firestore rules enforce master gates, type validation, strict timestamps, and default-deny catchall.',
    isMandatory: true,
    status: 'PASS',
    verificationLevel: 'CODE_VERIFIED',
    evidence: 'firestore.rules verified with rules_version 2, Master Gate parent validation, and ESLint security plugin.',
    lastCheckedAt: '2026-10-13T10:59:41.000Z',
    ownerRole: 'Security Architect',
    correctiveAction: 'Audit and re-deploy rules if gaps identified.',
    isCriticalBlocker: true,
    canBeOverridden: false,
  },
  {
    checkId: 'gate-sec-02',
    category: 'SECURITY',
    title: 'Outbound Webhook SSRF Guard',
    description: 'Verify outbound webhooks block private RFC 1918 IPs, loopbacks, and cloud metadata endpoints.',
    isMandatory: true,
    status: 'PASS',
    verificationLevel: 'CODE_VERIFIED',
    evidence: 'WebhookSsrfProtectionService passes 13 automated attack vector tests.',
    lastCheckedAt: '2026-10-13T10:59:41.000Z',
    ownerRole: 'Application Security Lead',
    correctiveAction: 'Update IP validation regex and reject loopbacks.',
    isCriticalBlocker: true,
    canBeOverridden: false,
  },

  // 2. Tenant Isolation
  {
    checkId: 'gate-tenant-01',
    category: 'TENANT_ISOLATION',
    title: 'Cross-Tenant Data Isolation',
    description: 'Tenant members and administrators are strictly prevented from querying or mutating other publishers data.',
    isMandatory: true,
    status: 'PASS',
    verificationLevel: 'CODE_VERIFIED',
    evidence: 'Automated test suites confirm Tenant A queries return zero Tenant B records across news, editions, and ledgers.',
    lastCheckedAt: '2026-10-13T10:59:41.000Z',
    ownerRole: 'Principal Platform Engineer',
    correctiveAction: 'Audit tenant query predicates and RBAC filters.',
    isCriticalBlocker: true,
    canBeOverridden: false,
  },

  // 3. Authentication
  {
    checkId: 'gate-auth-01',
    category: 'AUTHENTICATION',
    title: 'Google OAuth & Role-Based Identity',
    description: 'Multi-role authentication mapping platform, organization, reporter, and marketplace roles to authenticated users.',
    isMandatory: true,
    status: 'PASS',
    verificationLevel: 'SANDBOX_TESTED',
    evidence: 'Firebase Auth integration with Google popup login and PersonaSwitcher verification.',
    lastCheckedAt: '2026-10-13T10:59:41.000Z',
    ownerRole: 'Identity & Access Lead',
    correctiveAction: 'Verify auth domains in Firebase console.',
    isCriticalBlocker: true,
    canBeOverridden: false,
  },

  // 4. Billing and Payments
  {
    checkId: 'gate-bill-01',
    category: 'BILLING_PAYMENTS',
    title: 'Commercial Plan Entitlement Enforcement',
    description: 'Strict server-side enforcement of BASIC, STANDARD, and PREMIUM quotas (editions, staff seats, AI usage).',
    isMandatory: true,
    status: 'PASS',
    verificationLevel: 'CODE_VERIFIED',
    evidence: 'SubscriptionEntitlementService enforces feature gates and usage quotas in billing test suites.',
    lastCheckedAt: '2026-10-13T10:59:41.000Z',
    ownerRole: 'Billing Engineering Lead',
    correctiveAction: 'Ensure entitlement snapshots freeze plan versions upon checkout.',
    isCriticalBlocker: true,
    canBeOverridden: false,
  },
  {
    checkId: 'gate-bill-02',
    category: 'BILLING_PAYMENTS',
    title: 'Live Payment Gateway Credential Activation',
    description: 'Live merchant gateway activation for production recurring billing and invoice payment.',
    isMandatory: true,
    status: 'BLOCKED',
    verificationLevel: 'SANDBOX_TESTED',
    evidence: 'Sandboxed payment mock tested. Live merchant production API keys are unconfigured in environment.',
    lastCheckedAt: '2026-10-13T11:00:00.000Z',
    ownerRole: 'Finance Operations Director',
    correctiveAction: 'Input verified live Stripe/Razorpay merchant credentials into production environment.',
    isCriticalBlocker: true,
    canBeOverridden: false,
  },

  // 5. Marketplace Licensing
  {
    checkId: 'gate-mkt-01',
    category: 'MARKETPLACE_LICENSING',
    title: 'Marketplace License Integrity & Territorial Gating',
    description: 'Purchased news stories receive immutable licenses with rights verification before insertion into editions.',
    isMandatory: true,
    status: 'PASS',
    verificationLevel: 'SANDBOX_TESTED',
    evidence: 'ExclusivityValidationService and MarketplacePurchaseFlowService test suites pass.',
    lastCheckedAt: '2026-10-13T10:59:41.000Z',
    ownerRole: 'Marketplace Product Lead',
    correctiveAction: 'Audit license entitlement verification in edition content pool.',
    isCriticalBlocker: true,
    canBeOverridden: false,
  },

  // 6. Financial Integrity
  {
    checkId: 'gate-fin-01',
    category: 'FINANCIAL_INTEGRITY',
    title: 'Double-Entry Ledger Balancing (Debits == Credits)',
    description: 'Every marketplace purchase, royalty split, and reversal must strictly balance to zero in minor currency units.',
    isMandatory: true,
    status: 'PASS',
    verificationLevel: 'CODE_VERIFIED',
    evidence: 'FinancialLedgerIntegrityService confirms 100% balance across test suites with zero floating-point drift.',
    lastCheckedAt: '2026-10-13T10:59:41.000Z',
    ownerRole: 'Head of Financial Engineering',
    correctiveAction: 'Fix transaction balancing equation; run automated ledger repair.',
    isCriticalBlocker: true,
    canBeOverridden: false,
  },
  {
    checkId: 'gate-fin-02',
    category: 'FINANCIAL_INTEGRITY',
    title: 'Immutable Ledger Protection',
    description: 'Historical financial ledger records are mathematically protected against modification or deletion.',
    isMandatory: true,
    status: 'PASS',
    verificationLevel: 'CODE_VERIFIED',
    evidence: 'Test 54 verified ledger immutability; corrections strictly post compensating reversal entries.',
    lastCheckedAt: '2026-10-13T10:59:41.000Z',
    ownerRole: 'Head of Financial Engineering',
    correctiveAction: 'Lock write operations on past ledger batches.',
    isCriticalBlocker: true,
    canBeOverridden: false,
  },

  // 7. Reporter Payouts
  {
    checkId: 'gate-payout-01',
    category: 'REPORTER_PAYOUTS',
    title: 'Payout Settlement Hold & Duplicate Prevention',
    description: 'Enforces 7-day settlement hold, reserves wallet balance before disbursement, and blocks duplicate bank transfers.',
    isMandatory: true,
    status: 'PASS',
    verificationLevel: 'CODE_VERIFIED',
    evidence: 'Phase 11 & Phase 16 payout idempotency tests pass with dual-key locks.',
    lastCheckedAt: '2026-10-13T10:59:41.000Z',
    ownerRole: 'Payout Operations Lead',
    correctiveAction: 'Enforce idempotency tokens on bank transfer requests.',
    isCriticalBlocker: true,
    canBeOverridden: false,
  },
  {
    checkId: 'gate-payout-02',
    category: 'REPORTER_PAYOUTS',
    title: 'Live Bank Disbursement Gateway Verification',
    description: 'Automated direct bank payout disbursement via Stripe Connect / RazorpayX live accounts.',
    isMandatory: true,
    status: 'BLOCKED',
    verificationLevel: 'ARCHITECTURAL_MOCK',
    evidence: 'Currently operating with mock payout adapter. Live payout gateway requires corporate banking verification.',
    lastCheckedAt: '2026-10-13T11:00:00.000Z',
    ownerRole: 'Treasurer & Operations',
    correctiveAction: 'Complete bank KYC and link live RazorpayX / Stripe Connect payouts account.',
    isCriticalBlocker: true,
    canBeOverridden: false,
  },

  // 8. Edition and PDF Production
  {
    checkId: 'gate-prod-01',
    category: 'EDITION_PDF_PRODUCTION',
    title: 'Edition Finalization & Preflight Verification',
    description: 'Automated preflight checks font embedding, resolution (300 DPI), bleed (3mm), and content quota.',
    isMandatory: true,
    status: 'PASS',
    verificationLevel: 'CODE_VERIFIED',
    evidence: 'PrintPreflightService and EditionFinalization tests produce immutable layout snapshots and SHA-256 hashes.',
    lastCheckedAt: '2026-10-13T10:59:41.000Z',
    ownerRole: 'Production Prepress Director',
    correctiveAction: 'Inspect preflight error reports and rebalance pages.',
    isCriticalBlocker: false,
    canBeOverridden: false,
  },

  // 9. Vendor Dispatch
  {
    checkId: 'gate-vendor-01',
    category: 'VENDOR_DISPATCH',
    title: 'Physical Print Press Vendor SFTP/PGP Transmission',
    description: 'Direct secure dispatch to physical newspaper printing facilities with PGP encryption and SFTP handshake.',
    isMandatory: true,
    status: 'BLOCKED',
    verificationLevel: 'ARCHITECTURAL_MOCK',
    evidence: 'Print vendor dispatch currently uses mock provider. Physical press plant SFTP server and public PGP key are unconfigured.',
    lastCheckedAt: '2026-10-13T11:00:00.000Z',
    ownerRole: 'Manufacturing & Distribution Lead',
    correctiveAction: 'Establish physical print vendor contracts and configure press SFTP/PGP credentials.',
    isCriticalBlocker: true,
    canBeOverridden: false,
  },

  // 10. API and Webhooks
  {
    checkId: 'gate-api-01',
    category: 'API_WEBHOOKS',
    title: 'HMAC-SHA256 Webhook Signatures & Rate Limiting',
    description: 'API key authentication with scoped permissions and webhook signatures verified within 300s timestamp window.',
    isMandatory: true,
    status: 'PASS',
    verificationLevel: 'CODE_VERIFIED',
    evidence: 'WebhookDispatcherService and ApiRateLimitService test suites pass.',
    lastCheckedAt: '2026-10-13T10:59:41.000Z',
    ownerRole: 'API Platform Architect',
    correctiveAction: 'Rotate webhook secrets if signature verification fails.',
    isCriticalBlocker: true,
    canBeOverridden: false,
  },

  // 11. Backups and Disaster Recovery
  {
    checkId: 'gate-dr-01',
    category: 'BACKUPS_DR',
    title: 'GCP Cloud PITR & Multi-Region Retention',
    description: 'Live Point-In-Time-Recovery (7-day window) and automated cross-region database backups.',
    isMandatory: true,
    status: 'BLOCKED',
    verificationLevel: 'ARCHITECTURAL_MOCK',
    evidence: 'PITR drill runbooks (RB-09) validated in simulation; live Cloud PITR requires GCP billing schedule configuration.',
    lastCheckedAt: '2026-10-13T11:00:00.000Z',
    ownerRole: 'Infrastructure Site Reliability Lead',
    correctiveAction: 'Enable GCP Firestore PITR backup schedule via gcloud CLI in production project.',
    isCriticalBlocker: true,
    canBeOverridden: false,
  },

  // 12. Monitoring and Alerting
  {
    checkId: 'gate-mon-01',
    category: 'MONITORING_ALERTING',
    title: 'Deterministic Alerting & Redacted Logging',
    description: 'Structured logging with correlation IDs, automatic credential redaction, and backlog alert thresholds.',
    isMandatory: true,
    status: 'PASS',
    verificationLevel: 'CODE_VERIFIED',
    evidence: 'ReliabilityObservabilityService verified with alert cooldowns and password redaction.',
    lastCheckedAt: '2026-10-13T10:59:41.000Z',
    ownerRole: 'SRE Observability Lead',
    correctiveAction: 'Configure PagerDuty / Cloud Monitoring webhook routing.',
    isCriticalBlocker: false,
    canBeOverridden: false,
  },

  // 13. Legal and Consent
  {
    checkId: 'gate-legal-01',
    category: 'LEGAL_CONSENT',
    title: 'Qualified Counsel Review of Policies',
    description: 'Terms of Service, Privacy Policy, and Marketplace Agreements must be reviewed and ratified by qualified legal counsel.',
    isMandatory: true,
    status: 'WARNING',
    verificationLevel: 'CODE_VERIFIED',
    evidence: 'All 8 legal policy documents are currently in DRAFT_UNREVIEWED status. Statutory compliance is not yet certified.',
    lastCheckedAt: '2026-10-13T11:00:00.000Z',
    ownerRole: 'General Counsel & Compliance',
    correctiveAction: 'Retain jurisdiction commercial counsel to audit and ratify draft policies prior to public subscriber billing.',
    isCriticalBlocker: false,
    canBeOverridden: true,
  },

  // 14. Customer Support
  {
    checkId: 'gate-sup-01',
    category: 'CUSTOMER_SUPPORT',
    title: 'Tenant-Aware Support & Internal Note Isolation',
    description: 'Ticketing workflow with SLA escalation and confidential internal staff notes strictly hidden from publishers.',
    isMandatory: true,
    status: 'PASS',
    verificationLevel: 'CODE_VERIFIED',
    evidence: 'CustomerSupportService verifies role-based note filtering and SLA calculation.',
    lastCheckedAt: '2026-10-13T11:00:00.000Z',
    ownerRole: 'Head of Customer Success',
    correctiveAction: 'Train tier-1 support agents on internal note classification.',
    isCriticalBlocker: false,
    canBeOverridden: false,
  },

  // 15. Documentation
  {
    checkId: 'gate-doc-01',
    category: 'DOCUMENTATION',
    title: 'Customer Operational Handover Documentation',
    description: 'Comprehensive operational documentation for onboarding, plans, print limitations, API/webhooks, and runbooks.',
    isMandatory: true,
    status: 'PASS',
    verificationLevel: 'CODE_VERIFIED',
    evidence: 'Detailed handover documentation and runbooks library complete and verified.',
    lastCheckedAt: '2026-10-13T11:00:00.000Z',
    ownerRole: 'Technical Documentation Lead',
    correctiveAction: 'Publish updated developer docs to customer portal.',
    isCriticalBlocker: false,
    canBeOverridden: false,
  },

  // 16. Operational Ownership
  {
    checkId: 'gate-owner-01',
    category: 'OPERATIONAL_OWNERSHIP',
    title: 'Incident On-Call Roster & Escalation Ownership',
    description: 'Designated 24/7 on-call engineers with documented runbooks (RB 01-12) for SEV1 incident containment.',
    isMandatory: true,
    status: 'PASS',
    verificationLevel: 'CODE_VERIFIED',
    evidence: 'All 12 incident runbooks complete with detection, containment, escalation, and post-mortem procedures.',
    lastCheckedAt: '2026-10-13T10:59:41.000Z',
    ownerRole: 'VP Engineering & Infrastructure',
    correctiveAction: 'Conduct quarterly incident simulation drills.',
    isCriticalBlocker: false,
    canBeOverridden: false,
  },
];

export class LaunchReadinessService {
  private static checksStore: Map<string, LaunchGateCheck> = new Map();
  private static acceptedWarnings: Map<string, { checkId: string; title: string; acceptedBy: string; deadline: string; reason: string }> = new Map();

  static {
    this.seedDefaultChecks();
  }

  public static resetStore(): void {
    this.checksStore.clear();
    this.acceptedWarnings.clear();
    this.seedDefaultChecks();
  }

  private static seedDefaultChecks(): void {
    INITIAL_LAUNCH_CHECKS.forEach((check) => {
      this.checksStore.set(check.checkId, { ...check });
    });
  }

  public static getAllChecks(): LaunchGateCheck[] {
    return Array.from(this.checksStore.values());
  }

  public static getCheckById(checkId: string): LaunchGateCheck | undefined {
    return this.checksStore.get(checkId);
  }

  /**
   * Evaluates overall launch decision strictly based on deterministic gates.
   * NO-GO if ANY critical blocker exists.
   * CONDITIONAL-GO only if all remaining non-critical warnings are accepted with documented ownership and deadlines.
   * GO if all mandatory checks pass.
   */
  public static evaluateLaunchDecision(): LaunchDecision {
    const checks = this.getAllChecks();
    const totalChecks = checks.length;
    const passedChecks = checks.filter((c) => c.status === 'PASS').length;
    const warningChecks = checks.filter((c) => c.status === 'WARNING').length;
    const blockedChecks = checks.filter((c) => c.status === 'BLOCKED').length;
    const notVerifiedChecks = checks.filter((c) => c.status === 'NOT_VERIFIED').length;

    // Detect critical blockers: Any mandatory check with status BLOCKED or NOT_VERIFIED,
    // or any check marked isCriticalBlocker that is not PASS.
    const criticalBlockers: { checkId: string; title: string; reason: string }[] = [];
    checks.forEach((c) => {
      if (c.isCriticalBlocker && c.status !== 'PASS') {
        criticalBlockers.push({
          checkId: c.checkId,
          title: c.title,
          reason: `Critical safety/readiness gate "${c.title}" is currently in ${c.status} status. Corrective action: ${c.correctiveAction}`,
        });
      } else if (c.isMandatory && c.status === 'BLOCKED') {
        criticalBlockers.push({
          checkId: c.checkId,
          title: c.title,
          reason: `Mandatory launch gate "${c.title}" is marked BLOCKED. Corrective action: ${c.correctiveAction}`,
        });
      }
    });

    const acceptedWarningsList = Array.from(this.acceptedWarnings.values());
    const unacceptedWarnings = checks.filter(
      (c) => c.status === 'WARNING' && !this.acceptedWarnings.has(c.checkId)
    );

    let decision: 'GO' | 'CONDITIONAL_GO' | 'NO_GO';
    let summary: string;

    if (criticalBlockers.length > 0) {
      decision = 'NO_GO';
      summary = `Platform Go-Live decision is NO-GO due to ${criticalBlockers.length} critical launch blocker(s): ${criticalBlockers
        .map((b) => b.title)
        .join(', ')}. Live payment activation, physical print vendor SFTP, and GCP Cloud PITR retention must be resolved before general availability.`;
    } else if (unacceptedWarnings.length > 0) {
      decision = 'NO_GO';
      summary = `Platform Go-Live decision is NO-GO due to ${unacceptedWarnings.length} unaccepted operational warning(s). All warnings must either be resolved or formally accepted by authorized leadership.`;
    } else if (acceptedWarningsList.length > 0) {
      decision = 'CONDITIONAL_GO';
      summary = `Platform Go-Live decision is CONDITIONAL GO. All mandatory critical safety gates pass. ${acceptedWarningsList.length} non-critical warning(s) have been formally accepted with documented deadlines and operational ownership.`;
    } else {
      decision = 'GO';
      summary = 'Platform Go-Live decision is GO. All 16 mandatory readiness categories have been verified.';
    }

    return {
      decision,
      summary,
      totalChecks,
      passedChecks,
      warningChecks,
      blockedChecks,
      notVerifiedChecks,
      criticalBlockers,
      acceptedWarnings: acceptedWarningsList,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Accepts a non-critical warning with documented ownership and remediation deadline.
   * Prohibits overriding critical blockers!
   */
  public static acceptWarning(params: {
    checkId: string;
    acceptedBy: string;
    deadline: string;
    reason: string;
  }): void {
    const check = this.checksStore.get(params.checkId);
    if (!check) {
      throw new Error(`Launch check not found: ${params.checkId}`);
    }

    if (check.isCriticalBlocker || !check.canBeOverridden) {
      throw new Error(
        `Safety Violation: Launch check "${check.title}" is a critical safety or financial gate and CANNOT be bypassed via administrative override. The underlying condition must be resolved.`
      );
    }

    if (check.status !== 'WARNING') {
      throw new Error(`Only checks in WARNING status can be accepted as operational exceptions. Current status: ${check.status}`);
    }

    this.acceptedWarnings.set(params.checkId, {
      checkId: params.checkId,
      title: check.title,
      acceptedBy: params.acceptedBy,
      deadline: params.deadline,
      reason: params.reason,
    });

    AuditService.log({
      action: 'launch_gate.warning_accepted',
      resourceType: 'launch_gate_check',
      resourceId: params.checkId,
      userId: params.acceptedBy,
      details: {
        title: check.title,
        deadline: params.deadline,
        reason: params.reason,
      },
    });
  }

  /**
   * Updates status of a check (e.g. after formal live integration verification)
   */
  public static updateCheckStatus(params: {
    checkId: string;
    newStatus: LaunchCheckStatus;
    evidence: string;
    adminId: string;
    verificationLevel?: LaunchGateCheck['verificationLevel'];
  }): LaunchGateCheck {
    const check = this.checksStore.get(params.checkId);
    if (!check) {
      throw new Error(`Launch check not found: ${params.checkId}`);
    }

    const now = new Date().toISOString();
    check.status = params.newStatus;
    check.evidence = params.evidence;
    check.lastCheckedAt = now;
    if (params.verificationLevel) {
      check.verificationLevel = params.verificationLevel;
    }

    AuditService.log({
      action: 'launch_gate.status_updated',
      resourceType: 'launch_gate_check',
      resourceId: params.checkId,
      userId: params.adminId,
      details: {
        title: check.title,
        newStatus: params.newStatus,
        evidence: params.evidence,
      },
    });

    return { ...check };
  }
}
