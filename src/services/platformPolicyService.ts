/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Platform — Phase 17 Legal, Consent & Policy Readiness Service
 */

import {
  PolicyDocumentType,
  PolicyDocumentVersion,
  PolicyAcceptanceRecord,
} from '../types/platformPhase17';
import { AuditService } from './auditService';

export const INITIAL_LEGAL_DOCUMENTS: PolicyDocumentVersion[] = [
  {
    docId: 'doc-tos-v1',
    docType: 'TERMS_OF_SERVICE',
    title: 'Platform Terms of Service',
    version: '1.0.0-draft',
    status: 'DRAFT_UNREVIEWED',
    contentSummary:
      'Standard terms governing multi-tenant newspaper SaaS platform utilization, editorial rights, system quotas, and service boundaries. Pending qualified jurisdiction legal counsel ratification.',
    effectiveDate: '2026-10-01T00:00:00.000Z',
    isLegallyBinding: false,
    counselNotes: 'Pending final review by outside commercial technology counsel before live commercial subscription rollout.',
  },
  {
    docId: 'doc-privacy-v1',
    docType: 'PRIVACY_POLICY',
    title: 'Platform Privacy & Data Processing Policy',
    version: '1.0.0-draft',
    status: 'DRAFT_UNREVIEWED',
    contentSummary:
      'Governs reporter PII isolation, reader data processing, telemetry sanitization, and data retention rules across multi-tenant publications.',
    effectiveDate: '2026-10-01T00:00:00.000Z',
    isLegallyBinding: false,
    counselNotes: 'Requires alignment with regional GDPR/DPDP statutory standards prior to production activation.',
  },
  {
    docId: 'doc-mktplace-v1',
    docType: 'MARKETPLACE_AGREEMENT',
    title: 'Marketplace Publisher & Reporter Agreement',
    version: '1.0.0-draft',
    status: 'DRAFT_UNREVIEWED',
    contentSummary:
      'Governs content wire licensing, 70/15/15 revenue splits, escrow settlement holds, copyright attribution, and dispute resolution.',
    effectiveDate: '2026-10-01T00:00:00.000Z',
    isLegallyBinding: false,
    counselNotes: 'Draft version. Escrow and tax withholding mechanisms require review in jurisdiction of incorporation.',
  },
  {
    docId: 'doc-license-v1',
    docType: 'CONTENT_LICENSING_TERMS',
    title: 'Syndication & Print Content Licensing Terms',
    version: '1.0.0-draft',
    status: 'DRAFT_UNREVIEWED',
    contentSummary:
      'Defines exclusive, non-exclusive, territorial, and reprint rights across digital dispatches and physical newspaper press editions.',
    effectiveDate: '2026-10-01T00:00:00.000Z',
    isLegallyBinding: false,
  },
  {
    docId: 'doc-aup-v1',
    docType: 'ACCEPTABLE_USE_POLICY',
    title: 'Acceptable Use Policy (AUP)',
    version: '1.0.0-draft',
    status: 'DRAFT_UNREVIEWED',
    contentSummary:
      'Prohibits fraudulent journalism, defamation, coordinated inauthentic behavior, generative AI plagiarism, and DDoS attacks.',
    effectiveDate: '2026-10-01T00:00:00.000Z',
    isLegallyBinding: false,
  },
  {
    docId: 'doc-billing-v1',
    docType: 'SUBSCRIPTION_BILLING_TERMS',
    title: 'Subscription & Billing Terms',
    version: '1.0.0-draft',
    status: 'DRAFT_UNREVIEWED',
    contentSummary:
      'Covers subscription tiers (BASIC, STANDARD, PREMIUM), trial expiration, GST invoice generation, and grace-period service limits.',
    effectiveDate: '2026-10-01T00:00:00.000Z',
    isLegallyBinding: false,
  },
  {
    docId: 'doc-retention-v1',
    docType: 'DATA_RETENTION_DELETION_POLICY',
    title: 'Data Retention & Deletion Policy',
    version: '1.0.0-draft',
    status: 'DRAFT_UNREVIEWED',
    contentSummary:
      'Specifies retention of financial ledgers (7 years statutory), audit logs (1 year), and mobile offline evidence synchronization queues.',
    effectiveDate: '2026-10-01T00:00:00.000Z',
    isLegallyBinding: false,
  },
  {
    docId: 'doc-api-v1',
    docType: 'API_WEBHOOK_TERMS',
    title: 'Developer API & Webhook Service Terms',
    version: '1.0.0-draft',
    status: 'DRAFT_UNREVIEWED',
    contentSummary:
      'Enterprise API access rules, HMAC-SHA256 signature verification responsibilities, rate limits, and webhook SSRF restrictions.',
    effectiveDate: '2026-10-01T00:00:00.000Z',
    isLegallyBinding: false,
  },
];

export class PlatformPolicyService {
  private static documentsStore: Map<string, PolicyDocumentVersion> = new Map();
  private static acceptancesStore: Map<string, PolicyAcceptanceRecord[]> = new Map(); // tenantId -> acceptances

  static {
    this.seedDefaultPolicies();
  }

  public static resetStore(): void {
    this.documentsStore.clear();
    this.acceptancesStore.clear();
    this.seedDefaultPolicies();
  }

  private static seedDefaultPolicies(): void {
    INITIAL_LEGAL_DOCUMENTS.forEach((doc) => {
      this.documentsStore.set(doc.docId, { ...doc });
    });

    // Seed realistic acceptances for existing production tenant
    const metroAcceptances: PolicyAcceptanceRecord[] = [
      {
        acceptanceId: 'acc-metro-tos-1',
        docType: 'TERMS_OF_SERVICE',
        version: '1.0.0-draft',
        tenantId: 'tenant-metro-chronicle',
        userId: 'user-alfa-superadmin',
        userEmail: 'alfanewsservice@gmail.com',
        acceptedAt: '2026-10-01T08:00:00.000Z',
        ipAddress: '198.51.100.12',
        consentContext: 'ORGANIZATION_ONBOARDING',
        isRevoked: false,
      },
      {
        acceptanceId: 'acc-metro-priv-1',
        docType: 'PRIVACY_POLICY',
        version: '1.0.0-draft',
        tenantId: 'tenant-metro-chronicle',
        userId: 'user-alfa-superadmin',
        userEmail: 'alfanewsservice@gmail.com',
        acceptedAt: '2026-10-01T08:00:00.000Z',
        ipAddress: '198.51.100.12',
        consentContext: 'ORGANIZATION_ONBOARDING',
        isRevoked: false,
      },
    ];
    this.acceptancesStore.set('tenant-metro-chronicle', metroAcceptances);
  }

  public static getAllDocuments(): PolicyDocumentVersion[] {
    return Array.from(this.documentsStore.values());
  }

  public static getDocumentByType(docType: PolicyDocumentType): PolicyDocumentVersion | undefined {
    return Array.from(this.documentsStore.values()).find(
      (d) => d.docType === docType && d.status !== 'SUPERSEDED'
    );
  }

  /**
   * Updates document version or status after formal counsel review
   */
  public static updateDocumentVersion(params: {
    docId: string;
    newVersion: string;
    status: PolicyDocumentVersion['status'];
    counselReviewer?: string;
    counselNotes?: string;
    contentSummary?: string;
    adminId: string;
  }): PolicyDocumentVersion {
    const existing = this.documentsStore.get(params.docId);
    if (!existing) {
      throw new Error(`Policy document not found: ${params.docId}`);
    }

    const now = new Date().toISOString();
    existing.version = params.newVersion;
    existing.status = params.status;
    existing.isLegallyBinding = params.status === 'ACTIVE_RATIFIED';
    existing.lastReviewedDate = now;
    if (params.counselReviewer) existing.legalCounselReviewer = params.counselReviewer;
    if (params.counselNotes) existing.counselNotes = params.counselNotes;
    if (params.contentSummary) existing.contentSummary = params.contentSummary;

    AuditService.log({
      action: 'policy.version_update',
      resourceType: 'policy_document',
      resourceId: params.docId,
      userId: params.adminId,
      details: {
        docType: existing.docType,
        version: params.newVersion,
        status: params.status,
        counselReviewer: params.counselReviewer,
      },
    });

    return { ...existing };
  }

  /**
   * Records user/tenant policy acceptance
   */
  public static recordAcceptance(params: {
    docType: PolicyDocumentType;
    tenantId: string;
    userId: string;
    userEmail: string;
    ipAddress?: string;
    consentContext: PolicyAcceptanceRecord['consentContext'];
  }): PolicyAcceptanceRecord {
    const currentDoc = this.getDocumentByType(params.docType);
    if (!currentDoc) {
      throw new Error(`No active policy document found for type: ${params.docType}`);
    }

    const now = new Date().toISOString();
    const acceptance: PolicyAcceptanceRecord = {
      acceptanceId: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      docType: params.docType,
      version: currentDoc.version,
      tenantId: params.tenantId,
      userId: params.userId,
      userEmail: params.userEmail,
      acceptedAt: now,
      ipAddress: params.ipAddress || '127.0.0.1',
      consentContext: params.consentContext,
      isRevoked: false,
    };

    const tenantList = this.acceptancesStore.get(params.tenantId) || [];
    tenantList.push(acceptance);
    this.acceptancesStore.set(params.tenantId, tenantList);

    AuditService.log({
      action: 'policy.accepted',
      resourceType: 'policy_document',
      resourceId: currentDoc.docId,
      userId: params.userId,
      tenantId: params.tenantId,
      details: {
        docType: params.docType,
        version: currentDoc.version,
        consentContext: params.consentContext,
      },
    });

    return acceptance;
  }

  /**
   * Verifies if a tenant has accepted the current version of a policy
   */
  public static hasAcceptedCurrentPolicy(tenantId: string, docType: PolicyDocumentType): boolean {
    const currentDoc = this.getDocumentByType(docType);
    if (!currentDoc) return false;

    const list = this.acceptancesStore.get(tenantId) || [];
    return list.some(
      (a) => a.docType === docType && a.version === currentDoc.version && !a.isRevoked
    );
  }

  /**
   * Retrieves all acceptances for a tenant
   */
  public static getAcceptancesForTenant(tenantId: string): PolicyAcceptanceRecord[] {
    return [...(this.acceptancesStore.get(tenantId) || [])];
  }
}
