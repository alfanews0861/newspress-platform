/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Platform — Phase 17 Publisher Onboarding & Tenant Lifecycle Service
 */

import {
  PublisherOnboardingRecord,
  PublisherOnboardingStatus,
  OnboardingStepId,
  OnboardingChecklistStep,
  PublisherVerificationDoc,
} from '../types/platformPhase17';
import { PublishingPlanId } from '../types/billing';
import { TenantService } from './tenantService';
import { SubscriptionEntitlementService } from './subscriptionEntitlementService';
import { AuditService } from './auditService';

export const INITIAL_ONBOARDING_CHECKLIST: OnboardingChecklistStep[] = [
  {
    stepId: 'ORGANIZATION_REGISTRATION',
    title: 'Organization Registration',
    description: 'Provide publisher entity name, legal registration number, and primary contacts.',
    required: true,
    status: 'PENDING',
  },
  {
    stepId: 'AUTHORIZED_OWNER_CREATION',
    title: 'Authorized Owner Creation',
    description: 'Designate publisher organization owner account and verified email.',
    required: true,
    status: 'PENDING',
  },
  {
    stepId: 'PUBLICATION_METADATA',
    title: 'Publication Metadata & Timezone',
    description: 'Configure primary publishing imprint, frequency, city, and publication timezone.',
    required: true,
    status: 'PENDING',
  },
  {
    stepId: 'VERIFICATION_REVIEW',
    title: 'Identity & Regulatory Verification',
    description: 'Submit Certificate of Incorporation, Press Registration, and Tax/GST documents for admin review.',
    required: true,
    status: 'PENDING',
  },
  {
    stepId: 'SUBSCRIPTION_SELECTION',
    title: 'Subscription Selection',
    description: 'Select commercial publishing plan (BASIC, STANDARD, or PREMIUM).',
    required: true,
    status: 'PENDING',
  },
  {
    stepId: 'BILLING_SETUP',
    title: 'Billing & Invoice Setup',
    description: 'Set up verified payment method, billing address, and GSTIN invoicing details.',
    required: true,
    status: 'PENDING',
  },
  {
    stepId: 'STAFF_INVITATION',
    title: 'Newsroom Staff & Desks',
    description: 'Invite desk editors, section leads, and configure organizational roles.',
    required: false,
    status: 'PENDING',
  },
  {
    stepId: 'REPORTER_ONBOARDING',
    title: 'Reporter Network Onboarding',
    description: 'Establish initial beat reporters or staff correspondents.',
    required: false,
    status: 'PENDING',
  },
  {
    stepId: 'TEMPLATE_EDITION_SETUP',
    title: 'Newspaper Brand & Templates',
    description: 'Configure default masthead, typography, column count, and print template.',
    required: true,
    status: 'PENDING',
  },
  {
    stepId: 'EDITORIAL_WORKFLOW_SETUP',
    title: 'Editorial Workflow Configuration',
    description: 'Configure submission approval gates, originality thresholds, and AI copy assistance.',
    required: true,
    status: 'PENDING',
  },
  {
    stepId: 'API_APPLICATION_SETUP',
    title: 'API & Integration Credentials',
    description: 'Optional setup of developer API keys and webhook endpoints for enterprise wire feeds.',
    required: false,
    status: 'PENDING',
  },
  {
    stepId: 'LEGAL_POLICY_ACCEPTANCE',
    title: 'Publisher Agreement Acceptance',
    description: 'Review and accept Terms of Service, Privacy Policy, and Marketplace Agreement.',
    required: true,
    status: 'PENDING',
  },
];

const VALID_LIFECYCLE_TRANSITIONS: Record<PublisherOnboardingStatus, PublisherOnboardingStatus[]> = {
  INVITED: ['REGISTRATION_PENDING', 'CANCELLED'],
  REGISTRATION_PENDING: ['VERIFICATION_PENDING', 'CANCELLED'],
  VERIFICATION_PENDING: ['CONFIGURATION_PENDING', 'REJECTED', 'CANCELLED'],
  CONFIGURATION_PENDING: ['TRIAL_OR_SUBSCRIPTION_ACTIVE', 'REJECTED', 'CANCELLED'],
  TRIAL_OR_SUBSCRIPTION_ACTIVE: ['ONBOARDING_COMPLETE', 'SUSPENDED', 'CANCELLED'],
  ONBOARDING_COMPLETE: ['SUSPENDED', 'CANCELLED'],
  SUSPENDED: ['TRIAL_OR_SUBSCRIPTION_ACTIVE', 'ONBOARDING_COMPLETE', 'CANCELLED'],
  REJECTED: ['REGISTRATION_PENDING', 'CANCELLED'],
  CANCELLED: [],
};

export class PlatformOnboardingService {
  private static onboardingsStore: Map<string, PublisherOnboardingRecord> = new Map();

  static {
    this.seedDefaultOnboardings();
  }

  public static resetStore(): void {
    this.onboardingsStore.clear();
    this.seedDefaultOnboardings();
  }

  private static seedDefaultOnboardings(): void {
    const now = '2026-10-01T00:00:00.000Z';
    // Metropolitan Chronicle: completed
    this.onboardingsStore.set('tenant-metro-chronicle', {
      tenantId: 'tenant-metro-chronicle',
      organizationName: 'The Metropolitan Chronicle',
      legalEntityName: 'Metropolitan News Media Publishing Group LLC',
      contactEmail: 'desk@metrochronicle.press',
      contactPhone: '+1 (212) 555-0192',
      ownerUserId: 'user-alfa-superadmin',
      ownerEmail: 'alfanewsservice@gmail.com',
      status: 'ONBOARDING_COMPLETE',
      targetPlan: 'PREMIUM',
      publicationFrequency: 'daily',
      primaryTimezone: 'America/New_York',
      country: 'United States',
      city: 'New York',
      registrationNumber: 'REG-US-NY-1894-88',
      taxId: 'US-EIN-12-3456789',
      verificationDocuments: [
        {
          docType: 'CERTIFICATE_OF_INCORPORATION',
          documentRef: 'docs/metro_incorp.pdf',
          verified: true,
          verifiedAt: now,
          verifiedBy: 'system_admin',
        },
        {
          docType: 'PRESS_REGISTRATION',
          documentRef: 'docs/metro_press_reg.pdf',
          verified: true,
          verifiedAt: now,
          verifiedBy: 'system_admin',
        },
      ],
      checklist: INITIAL_ONBOARDING_CHECKLIST.map((c) => ({
        ...c,
        status: 'VERIFIED',
        completedAt: now,
        completedBy: 'system_admin',
      })),
      invitedAt: '2024-01-01T00:00:00.000Z',
      completedAt: '2024-01-15T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: now,
      reviewedBy: 'system_admin',
    });

    // Pacific Tribune: completed
    this.onboardingsStore.set('tenant-pacific-tribune', {
      tenantId: 'tenant-pacific-tribune',
      organizationName: 'Pacific Tribune & Dispatch',
      legalEntityName: 'Pacific Rim Media & Investigative Consortium',
      contactEmail: 'newsroom@pacifictribune.org',
      contactPhone: '+1 (415) 555-8321',
      ownerUserId: 'user-pacific-owner',
      ownerEmail: 'owner@pacifictribune.org',
      status: 'ONBOARDING_COMPLETE',
      targetPlan: 'STANDARD',
      publicationFrequency: 'daily',
      primaryTimezone: 'America/Los_Angeles',
      country: 'United States',
      city: 'San Francisco',
      registrationNumber: 'REG-US-CA-1932-44',
      taxId: 'US-EIN-94-8765432',
      verificationDocuments: [
        {
          docType: 'CERTIFICATE_OF_INCORPORATION',
          documentRef: 'docs/pacific_incorp.pdf',
          verified: true,
          verifiedAt: now,
          verifiedBy: 'system_admin',
        },
      ],
      checklist: INITIAL_ONBOARDING_CHECKLIST.map((c) => ({
        ...c,
        status: 'VERIFIED',
        completedAt: now,
        completedBy: 'system_admin',
      })),
      invitedAt: '2024-03-01T00:00:00.000Z',
      completedAt: '2024-03-20T00:00:00.000Z',
      createdAt: '2024-03-01T00:00:00.000Z',
      updatedAt: now,
      reviewedBy: 'system_admin',
    });

    // Deccan Herald Weekly: In Verification Pending
    this.onboardingsStore.set('tenant-deccan-weekly', {
      tenantId: 'tenant-deccan-weekly',
      organizationName: 'Deccan Regional Herald',
      legalEntityName: 'Deccan Media Publications Pvt Ltd',
      contactEmail: 'publisher@deccanregional.in',
      contactPhone: '+91 80 2345 6789',
      ownerUserId: 'user-deccan-owner',
      ownerEmail: 'publisher@deccanregional.in',
      status: 'VERIFICATION_PENDING',
      targetPlan: 'STANDARD',
      publicationFrequency: 'weekly',
      primaryTimezone: 'Asia/Kolkata',
      country: 'India',
      city: 'Bengaluru',
      registrationNumber: 'CIN-U22120KA2025PTC189211',
      taxId: 'GSTIN-29AABCU9603R1ZM',
      verificationDocuments: [
        {
          docType: 'CERTIFICATE_OF_INCORPORATION',
          documentRef: 'docs/deccan_cin.pdf',
          verified: false,
        },
        {
          docType: 'PRESS_REGISTRATION',
          documentRef: 'docs/deccan_rni.pdf',
          verified: false,
        },
      ],
      checklist: INITIAL_ONBOARDING_CHECKLIST.map((c) => ({
        ...c,
        status: ['ORGANIZATION_REGISTRATION', 'AUTHORIZED_OWNER_CREATION', 'PUBLICATION_METADATA'].includes(c.stepId)
          ? 'COMPLETED'
          : 'PENDING',
      })),
      invitedAt: '2026-09-15T00:00:00.000Z',
      createdAt: '2026-09-15T00:00:00.000Z',
      updatedAt: '2026-10-02T10:00:00.000Z',
    });
  }

  public static getAllOnboardings(): PublisherOnboardingRecord[] {
    return Array.from(this.onboardingsStore.values());
  }

  public static getOnboardingByTenantId(tenantId: string): PublisherOnboardingRecord | undefined {
    return this.onboardingsStore.get(tenantId);
  }

  /**
   * Invite a new publisher organization
   */
  public static invitePublisher(params: {
    tenantId: string;
    organizationName: string;
    legalEntityName: string;
    contactEmail: string;
    contactPhone?: string;
    ownerUserId: string;
    ownerEmail: string;
    targetPlan?: PublishingPlanId;
    primaryTimezone?: string;
    country?: string;
    invitedBy: string;
  }): PublisherOnboardingRecord {
    const existing = this.onboardingsStore.get(params.tenantId);
    if (existing) {
      throw new Error(`Publisher record already exists for tenant: ${params.tenantId}`);
    }

    const now = new Date().toISOString();
    const newRecord: PublisherOnboardingRecord = {
      tenantId: params.tenantId,
      organizationName: params.organizationName,
      legalEntityName: params.legalEntityName,
      contactEmail: params.contactEmail,
      contactPhone: params.contactPhone,
      ownerUserId: params.ownerUserId,
      ownerEmail: params.ownerEmail,
      status: 'INVITED',
      targetPlan: params.targetPlan || 'BASIC',
      publicationFrequency: 'daily',
      primaryTimezone: params.primaryTimezone || 'UTC',
      country: params.country || 'Global',
      verificationDocuments: [],
      checklist: INITIAL_ONBOARDING_CHECKLIST.map((c) => ({ ...c })),
      invitedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.onboardingsStore.set(params.tenantId, newRecord);

    AuditService.log({
      action: 'publisher.invite',
      resourceType: 'publisher_onboarding',
      resourceId: params.tenantId,
      userId: params.invitedBy,
      tenantId: params.tenantId,
      details: {
        organizationName: params.organizationName,
        ownerEmail: params.ownerEmail,
        targetPlan: newRecord.targetPlan,
      },
    });

    return newRecord;
  }

  /**
   * Updates onboarding state according to strict lifecycle validation.
   */
  public static transitionStatus(
    tenantId: string,
    nextStatus: PublisherOnboardingStatus,
    adminId: string,
    reason?: string
  ): PublisherOnboardingRecord {
    const record = this.onboardingsStore.get(tenantId);
    if (!record) {
      throw new Error(`Publisher onboarding record not found for tenant: ${tenantId}`);
    }

    const currentStatus = record.status;
    const allowedTransitions = VALID_LIFECYCLE_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(nextStatus)) {
      throw new Error(
        `Invalid lifecycle transition from ${currentStatus} to ${nextStatus}. Allowed: [${allowedTransitions.join(', ')}]`
      );
    }

    // Safety Gate 1: Verification Pending -> Configuration Pending requires verified documents
    if (currentStatus === 'VERIFICATION_PENDING' && nextStatus === 'CONFIGURATION_PENDING') {
      const allVerified =
        record.verificationDocuments.length > 0 &&
        record.verificationDocuments.every((d) => d.verified);
      if (!allVerified) {
        throw new Error(
          'Cannot advance to CONFIGURATION_PENDING: Verification documents have not been fully verified by platform administration.'
        );
      }
    }

    // Safety Gate 2: Advancing to ONBOARDING_COMPLETE requires all mandatory checklist steps
    if (nextStatus === 'ONBOARDING_COMPLETE') {
      const incompleteMandatory = record.checklist.filter(
        (c) => c.required && !['COMPLETED', 'VERIFIED'].includes(c.status)
      );
      if (incompleteMandatory.length > 0) {
        throw new Error(
          `Cannot complete onboarding: Incomplete mandatory checklist steps [${incompleteMandatory
            .map((c) => c.stepId)
            .join(', ')}]`
        );
      }
      record.completedAt = new Date().toISOString();
    }

    // Safety Gate 3: REJECTED requires reason
    if (nextStatus === 'REJECTED') {
      if (!reason || reason.trim().length === 0) {
        throw new Error('Mandatory rejection reason required when rejecting publisher onboarding.');
      }
      record.rejectionReason = reason;
    }

    // Safety Gate 4: SUSPENDED requires reason
    if (nextStatus === 'SUSPENDED') {
      if (!reason || reason.trim().length === 0) {
        throw new Error('Mandatory suspension reason required when suspending publisher onboarding.');
      }
      record.suspensionReason = reason;
    }

    const now = new Date().toISOString();
    record.status = nextStatus;
    record.updatedAt = now;
    record.reviewedBy = adminId;

    // Synchronize tenant record if active or complete
    if (nextStatus === 'ONBOARDING_COMPLETE' || nextStatus === 'TRIAL_OR_SUBSCRIPTION_ACTIVE') {
      try {
        SubscriptionEntitlementService.getOrCreateSubscription(tenantId, record.targetPlan);
      } catch (err) {
        console.warn('Subscription provisioning warning:', err);
      }
    }

    AuditService.log({
      action: 'publisher.lifecycle_transition',
      resourceType: 'publisher_onboarding',
      resourceId: tenantId,
      userId: adminId,
      tenantId,
      details: {
        previousStatus: currentStatus,
        nextStatus,
        reason: reason || 'Routine lifecycle progression',
      },
    });

    return record;
  }

  /**
   * Submit or update verification documents
   */
  public static addVerificationDocument(
    tenantId: string,
    doc: PublisherVerificationDoc
  ): PublisherOnboardingRecord {
    const record = this.onboardingsStore.get(tenantId);
    if (!record) {
      throw new Error(`Publisher onboarding record not found for tenant: ${tenantId}`);
    }

    const existingIdx = record.verificationDocuments.findIndex((d) => d.docType === doc.docType);
    if (existingIdx >= 0) {
      record.verificationDocuments[existingIdx] = doc;
    } else {
      record.verificationDocuments.push(doc);
    }

    record.updatedAt = new Date().toISOString();
    return record;
  }

  /**
   * Admin approves or rejects a verification document
   */
  public static reviewVerificationDocument(
    tenantId: string,
    docType: PublisherVerificationDoc['docType'],
    verified: boolean,
    adminId: string,
    notes?: string
  ): PublisherOnboardingRecord {
    const record = this.onboardingsStore.get(tenantId);
    if (!record) {
      throw new Error(`Publisher onboarding record not found for tenant: ${tenantId}`);
    }

    const doc = record.verificationDocuments.find((d) => d.docType === docType);
    if (!doc) {
      throw new Error(`Verification document of type ${docType} not found for tenant: ${tenantId}`);
    }

    const now = new Date().toISOString();
    doc.verified = verified;
    doc.verifiedAt = now;
    doc.verifiedBy = adminId;
    doc.notes = notes;

    // Also update VERIFICATION_REVIEW checklist step if all are verified
    const allDocsVerified =
      record.verificationDocuments.length > 0 &&
      record.verificationDocuments.every((d) => d.verified);
    
    const checklistStep = record.checklist.find((c) => c.stepId === 'VERIFICATION_REVIEW');
    if (checklistStep) {
      checklistStep.status = allDocsVerified ? 'VERIFIED' : 'IN_PROGRESS';
      checklistStep.completedAt = allDocsVerified ? now : undefined;
      checklistStep.completedBy = adminId;
    }

    record.updatedAt = now;

    AuditService.log({
      action: 'publisher.document_review',
      resourceType: 'publisher_onboarding',
      resourceId: tenantId,
      userId: adminId,
      tenantId,
      details: { docType, verified, notes },
    });

    return record;
  }

  /**
   * Update a checklist step status
   */
  public static updateChecklistStep(
    tenantId: string,
    stepId: OnboardingStepId,
    status: OnboardingChecklistStep['status'],
    actorId: string,
    notes?: string
  ): PublisherOnboardingRecord {
    const record = this.onboardingsStore.get(tenantId);
    if (!record) {
      throw new Error(`Publisher onboarding record not found for tenant: ${tenantId}`);
    }

    const step = record.checklist.find((c) => c.stepId === stepId);
    if (!step) {
      throw new Error(`Checklist step ${stepId} not found in onboarding record.`);
    }

    const now = new Date().toISOString();
    step.status = status;
    step.completedAt = ['COMPLETED', 'VERIFIED'].includes(status) ? now : undefined;
    step.completedBy = actorId;
    step.notes = notes;
    record.updatedAt = now;

    return record;
  }
}
