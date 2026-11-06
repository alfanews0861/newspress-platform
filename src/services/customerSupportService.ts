/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Platform — Phase 17 Support and Customer Operations Service
 */

import {
  SupportCase,
  SupportCaseStatus,
  SupportCaseSeverity,
  SupportCategory,
  SupportMessage,
  SupportAttachment,
} from '../types/platformPhase17';
import { AuditService } from './auditService';

const SLA_HOURS_MAP: Record<SupportCaseSeverity, number> = {
  SEV1_CRITICAL: 1,
  SEV2_HIGH: 4,
  SEV3_MEDIUM: 24,
  SEV4_LOW: 72,
};

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
  'application/json',
]);

const VALID_STATUS_TRANSITIONS: Record<SupportCaseStatus, SupportCaseStatus[]> = {
  OPEN: ['TRIAGED', 'IN_PROGRESS', 'CLOSED'],
  TRIAGED: ['IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'],
  WAITING_FOR_CUSTOMER: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'], // Reopening moves back to IN_PROGRESS
  CLOSED: ['IN_PROGRESS'], // Reopening closed case moves back to IN_PROGRESS
};

export class CustomerSupportService {
  private static casesStore: Map<string, SupportCase> = new Map();

  static {
    this.seedDefaultSupportCases();
  }

  public static resetStore(): void {
    this.casesStore.clear();
    this.seedDefaultSupportCases();
  }

  private static seedDefaultSupportCases(): void {
    const case1: SupportCase = {
      caseId: 'case-sup-101',
      tenantId: 'tenant-metro-chronicle',
      tenantName: 'The Metropolitan Chronicle',
      requesterUserId: 'user-alfa-superadmin',
      requesterEmail: 'alfanewsservice@gmail.com',
      requesterName: 'Alfa News Admin',
      title: 'Inquiry regarding GSTIN invoice formatting for October cycle',
      category: 'BILLING_SUBSCRIPTION',
      severity: 'SEV3_MEDIUM',
      status: 'RESOLVED',
      assignedToId: 'user-alfa-superadmin',
      assignedToName: 'Platform Support Desk',
      createdAt: '2026-10-02T10:00:00.000Z',
      updatedAt: '2026-10-02T14:30:00.000Z',
      firstResponseAt: '2026-10-02T11:15:00.000Z',
      resolvedAt: '2026-10-02T14:30:00.000Z',
      resolutionSummary: 'Verified GSTIN invoice template updated in billing settings.',
      reopenedCount: 0,
      slaHours: 24,
      slaBreached: false,
      messages: [
        {
          messageId: 'msg-101-1',
          caseId: 'case-sup-101',
          authorId: 'user-alfa-superadmin',
          authorName: 'Alfa News Admin',
          authorRole: 'owner',
          content: 'Please ensure our GSTIN appears on the exported PDF tax invoices.',
          isInternalNote: false,
          attachments: [],
          createdAt: '2026-10-02T10:00:00.000Z',
        },
        {
          messageId: 'msg-101-2',
          caseId: 'case-sup-101',
          authorId: 'user-support-lead',
          authorName: 'Support Agent',
          authorRole: 'support_admin',
          content: 'Internal check: Verified tenant profile has taxId populated properly.',
          isInternalNote: true,
          attachments: [],
          createdAt: '2026-10-02T11:00:00.000Z',
        },
        {
          messageId: 'msg-101-3',
          caseId: 'case-sup-101',
          authorId: 'user-support-lead',
          authorName: 'Support Agent',
          authorRole: 'support_admin',
          content: 'Hello, your GSTIN is configured and will automatically appear on all future monthly billing statements.',
          isInternalNote: false,
          attachments: [],
          createdAt: '2026-10-02T11:15:00.000Z',
        },
      ],
    };

    const case2: SupportCase = {
      caseId: 'case-sup-102',
      tenantId: 'tenant-pacific-tribune',
      tenantName: 'Pacific Tribune & Dispatch',
      requesterUserId: 'user-pacific-owner',
      requesterEmail: 'owner@pacifictribune.org',
      requesterName: 'Pacific Rim Desk',
      title: 'Clarification on physical print vendor SFTP dispatch setup',
      category: 'EDITION_PRODUCTION',
      severity: 'SEV2_HIGH',
      status: 'IN_PROGRESS',
      assignedToId: 'user-alfa-superadmin',
      assignedToName: 'Platform Support Desk',
      createdAt: '2026-10-10T08:00:00.000Z',
      updatedAt: '2026-10-10T09:30:00.000Z',
      firstResponseAt: '2026-10-10T09:30:00.000Z',
      reopenedCount: 0,
      slaHours: 4,
      slaBreached: false,
      messages: [
        {
          messageId: 'msg-102-1',
          caseId: 'case-sup-102',
          authorId: 'user-pacific-owner',
          authorName: 'Pacific Rim Desk',
          authorRole: 'owner',
          content: 'We need to know whether the physical print vendor SFTP transmission is currently live for regional presses.',
          isInternalNote: false,
          attachments: [],
          createdAt: '2026-10-10T08:00:00.000Z',
        },
        {
          messageId: 'msg-102-2',
          caseId: 'user-support-lead',
          authorId: 'user-support-lead',
          authorName: 'Support Agent',
          authorRole: 'support_admin',
          content: 'Platform note: Vendor dispatch is currently running under isolated mock adapter until vendor signing credentials are fully provisioned.',
          isInternalNote: true,
          attachments: [],
          createdAt: '2026-10-10T09:00:00.000Z',
        },
        {
          messageId: 'msg-102-3',
          caseId: 'case-sup-102',
          authorId: 'user-support-lead',
          authorName: 'Support Agent',
          authorRole: 'support_admin',
          content: 'Hello Pacific Tribune team. Current print dispatch is running in sandbox/mock mode while commercial vendor agreements are in final review.',
          isInternalNote: false,
          attachments: [],
          createdAt: '2026-10-10T09:30:00.000Z',
        },
      ],
    };

    this.casesStore.set(case1.caseId, case1);
    this.casesStore.set(case2.caseId, case2);
  }

  /**
   * Retrieves cases filtered by viewer role and tenant boundary.
   * If requester is NOT a platform or support admin, only their tenant's cases are returned,
   * and all messages with isInternalNote: true are strictly stripped!
   */
  public static getCasesForUser(params: {
    userId: string;
    tenantId: string;
    isPlatformOrSupportAdmin: boolean;
  }): SupportCase[] {
    const allCases = Array.from(this.casesStore.values());
    const visibleCases = params.isPlatformOrSupportAdmin
      ? allCases
      : allCases.filter((c) => c.tenantId === params.tenantId);

    // Deep clone and strip internal notes for tenant users
    return visibleCases.map((c) => {
      const copy: SupportCase = JSON.parse(JSON.stringify(c));
      if (!params.isPlatformOrSupportAdmin) {
        copy.messages = copy.messages.filter((m) => !m.isInternalNote);
      }
      return copy;
    });
  }

  /**
   * Retrieves single case by ID with security stripping.
   */
  public static getCaseById(
    caseId: string,
    userTenantId: string,
    isPlatformOrSupportAdmin: boolean
  ): SupportCase | undefined {
    const found = this.casesStore.get(caseId);
    if (!found) return undefined;

    // Tenant isolation check
    if (!isPlatformOrSupportAdmin && found.tenantId !== userTenantId) {
      throw new Error(`Unauthorized access: Support case ${caseId} belongs to another tenant.`);
    }

    const copy: SupportCase = JSON.parse(JSON.stringify(found));
    if (!isPlatformOrSupportAdmin) {
      copy.messages = copy.messages.filter((m) => !m.isInternalNote);
    }
    return copy;
  }

  /**
   * Creates a new support case
   */
  public static createCase(params: {
    tenantId: string;
    tenantName: string;
    requesterUserId: string;
    requesterEmail: string;
    requesterName: string;
    title: string;
    category: SupportCategory;
    severity: SupportCaseSeverity;
    initialMessage: string;
    attachments?: SupportAttachment[];
  }): SupportCase {
    if (!params.title || params.title.trim().length < 5) {
      throw new Error('Case title must be at least 5 characters.');
    }
    if (!params.initialMessage || params.initialMessage.trim().length < 10) {
      throw new Error('Initial message must be at least 10 characters.');
    }

    // Attachment validation
    if (params.attachments && params.attachments.length > 0) {
      for (const att of params.attachments) {
        if (att.sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
          throw new Error(`Attachment ${att.name} exceeds maximum permitted size of 10MB.`);
        }
        if (!ALLOWED_MIME_TYPES.has(att.mimeType)) {
          throw new Error(`Attachment ${att.name} has unsupported MIME type "${att.mimeType}".`);
        }
      }
    }

    const now = new Date().toISOString();
    const caseId = `case-sup-${Date.now()}`;
    const slaHours = SLA_HOURS_MAP[params.severity] || 24;

    const initialMsg: SupportMessage = {
      messageId: `msg-${Date.now()}-1`,
      caseId,
      authorId: params.requesterUserId,
      authorName: params.requesterName,
      authorRole: 'requester',
      content: params.initialMessage,
      isInternalNote: false,
      attachments: params.attachments || [],
      createdAt: now,
    };

    const newCase: SupportCase = {
      caseId,
      tenantId: params.tenantId,
      tenantName: params.tenantName,
      requesterUserId: params.requesterUserId,
      requesterEmail: params.requesterEmail,
      requesterName: params.requesterName,
      title: params.title,
      category: params.category,
      severity: params.severity,
      status: 'OPEN',
      createdAt: now,
      updatedAt: now,
      reopenedCount: 0,
      slaHours,
      slaBreached: false,
      messages: [initialMsg],
    };

    this.casesStore.set(caseId, newCase);

    AuditService.log({
      action: 'support.case_created',
      resourceType: 'support_case',
      resourceId: caseId,
      userId: params.requesterUserId,
      tenantId: params.tenantId,
      details: {
        title: params.title,
        category: params.category,
        severity: params.severity,
      },
    });

    return newCase;
  }

  /**
   * Adds a reply or internal note to a case
   */
  public static addMessage(params: {
    caseId: string;
    authorId: string;
    authorName: string;
    authorRole: string;
    content: string;
    isInternalNote: boolean;
    attachments?: SupportAttachment[];
    isPlatformOrSupportAdmin: boolean;
  }): SupportMessage {
    const existing = this.casesStore.get(params.caseId);
    if (!existing) {
      throw new Error(`Support case not found: ${params.caseId}`);
    }

    // Only platform or support staff can post internal notes
    if (params.isInternalNote && !params.isPlatformOrSupportAdmin) {
      throw new Error('Unauthorized: Tenant members cannot create internal staff notes.');
    }

    const now = new Date().toISOString();
    const msg: SupportMessage = {
      messageId: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      caseId: params.caseId,
      authorId: params.authorId,
      authorName: params.authorName,
      authorRole: params.authorRole,
      content: params.content,
      isInternalNote: params.isInternalNote,
      attachments: params.attachments || [],
      createdAt: now,
    };

    existing.messages.push(msg);
    existing.updatedAt = now;

    // Record first response timestamp if from support staff
    if (params.isPlatformOrSupportAdmin && !params.isInternalNote && !existing.firstResponseAt) {
      existing.firstResponseAt = now;
      const createdDate = new Date(existing.createdAt).getTime();
      const firstRespDate = new Date(now).getTime();
      const elapsedHours = (firstRespDate - createdDate) / (1000 * 60 * 60);
      if (elapsedHours > existing.slaHours) {
        existing.slaBreached = true;
      }
    }

    // Auto update status if waiting on customer or vice versa
    if (params.isPlatformOrSupportAdmin && !params.isInternalNote && existing.status === 'IN_PROGRESS') {
      existing.status = 'WAITING_FOR_CUSTOMER';
    } else if (!params.isPlatformOrSupportAdmin && existing.status === 'WAITING_FOR_CUSTOMER') {
      existing.status = 'IN_PROGRESS';
    }

    return msg;
  }

  /**
   * Updates case status with transition matrix and validation
   */
  public static updateStatus(params: {
    caseId: string;
    newStatus: SupportCaseStatus;
    actorId: string;
    resolutionSummary?: string;
    reopenReason?: string;
  }): SupportCase {
    const existing = this.casesStore.get(params.caseId);
    if (!existing) {
      throw new Error(`Support case not found: ${params.caseId}`);
    }

    const currentStatus = existing.status;
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(params.newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${params.newStatus}. Allowed: [${allowed.join(', ')}]`
      );
    }

    const now = new Date().toISOString();

    // Resolving requires summary
    if (params.newStatus === 'RESOLVED') {
      if (!params.resolutionSummary || params.resolutionSummary.trim().length < 5) {
        throw new Error('Mandatory resolution summary required when resolving a support case.');
      }
      existing.resolvedAt = now;
      existing.resolutionSummary = params.resolutionSummary;
    }

    // Closing
    if (params.newStatus === 'CLOSED') {
      existing.closedAt = now;
    }

    // Reopening
    if (['RESOLVED', 'CLOSED'].includes(currentStatus) && params.newStatus === 'IN_PROGRESS') {
      if (!params.reopenReason || params.reopenReason.trim().length < 5) {
        throw new Error('Mandatory reason required when reopening a resolved/closed support case.');
      }
      existing.reopenedCount += 1;
      existing.reopenReason = params.reopenReason;
      existing.resolvedAt = undefined;
      existing.closedAt = undefined;
    }

    existing.status = params.newStatus;
    existing.updatedAt = now;

    AuditService.log({
      action: 'support.status_transition',
      resourceType: 'support_case',
      resourceId: params.caseId,
      userId: params.actorId,
      tenantId: existing.tenantId,
      details: {
        previousStatus: currentStatus,
        newStatus: params.newStatus,
        resolutionSummary: params.resolutionSummary,
        reopenReason: params.reopenReason,
      },
    });

    return existing;
  }

  /**
   * Assigns case to support agent
   */
  public static assignCase(
    caseId: string,
    assignedToId: string,
    assignedToName: string,
    actorId: string
  ): SupportCase {
    const existing = this.casesStore.get(caseId);
    if (!existing) throw new Error(`Support case not found: ${caseId}`);

    existing.assignedToId = assignedToId;
    existing.assignedToName = assignedToName;
    existing.updatedAt = new Date().toISOString();
    if (existing.status === 'OPEN') {
      existing.status = 'TRIAGED';
    }

    return existing;
  }
}
