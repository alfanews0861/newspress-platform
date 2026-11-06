/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Platform — Phase 17 Commercial Launch, Platform Super Admin & Go-Live Types
 */

import { PublishingPlanId } from './billing';

// ---------------------------------------------------------------------------
// 1. Publisher Onboarding & Tenant Lifecycle
// ---------------------------------------------------------------------------

export type PublisherOnboardingStatus =
  | 'INVITED'
  | 'REGISTRATION_PENDING'
  | 'VERIFICATION_PENDING'
  | 'CONFIGURATION_PENDING'
  | 'TRIAL_OR_SUBSCRIPTION_ACTIVE'
  | 'ONBOARDING_COMPLETE'
  | 'SUSPENDED'
  | 'REJECTED'
  | 'CANCELLED';

export type OnboardingStepId =
  | 'ORGANIZATION_REGISTRATION'
  | 'AUTHORIZED_OWNER_CREATION'
  | 'PUBLICATION_METADATA'
  | 'SUBSCRIPTION_SELECTION'
  | 'BILLING_SETUP'
  | 'STAFF_INVITATION'
  | 'REPORTER_ONBOARDING'
  | 'TEMPLATE_EDITION_SETUP'
  | 'EDITORIAL_WORKFLOW_SETUP'
  | 'API_APPLICATION_SETUP'
  | 'LEGAL_POLICY_ACCEPTANCE'
  | 'VERIFICATION_REVIEW';

export interface OnboardingChecklistStep {
  stepId: OnboardingStepId;
  title: string;
  description: string;
  required: boolean;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED' | 'REJECTED';
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

export interface PublisherVerificationDoc {
  docType: 'CERTIFICATE_OF_INCORPORATION' | 'PRESS_REGISTRATION' | 'TAX_GST_CERTIFICATE' | 'OWNER_IDENTITY_PROOF';
  documentRef: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  notes?: string;
}

export interface PublisherOnboardingRecord {
  tenantId: string;
  organizationName: string;
  legalEntityName: string;
  contactEmail: string;
  contactPhone?: string;
  ownerUserId: string;
  ownerEmail: string;
  status: PublisherOnboardingStatus;
  targetPlan: PublishingPlanId;
  publicationFrequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  primaryTimezone: string;
  country: string;
  city?: string;
  registrationNumber?: string;
  taxId?: string;
  verificationDocuments: PublisherVerificationDoc[];
  checklist: OnboardingChecklistStep[];
  rejectionReason?: string;
  suspensionReason?: string;
  invitedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
}

// ---------------------------------------------------------------------------
// 2. Platform Configuration Management
// ---------------------------------------------------------------------------

export interface PlatformConfig {
  version: number;
  availablePlans: PublishingPlanId[];
  trialPolicies: {
    defaultTrialDays: number;
    gracePeriodDays: number;
    autoCancelOnTrialEnd: boolean;
    requirePaymentMethodForTrial: boolean;
  };
  featureAvailability: {
    aiCopyFittingEnabled: boolean;
    marketplaceWireEnabled: boolean;
    physicalPrintDispatchEnabled: boolean;
    mobileFieldReportingEnabled: boolean;
    apiDeveloperPortalEnabled: boolean;
    executiveAnalyticsEnabled: boolean;
  };
  rateLimitTiers: {
    tierBasicRpm: number;
    tierStandardRpm: number;
    tierPremiumRpm: number;
    burstMultiplier: number;
  };
  marketplacePricing: {
    minListingPriceMinorUnits: number;
    maxListingPriceMinorUnits: number;
    defaultSyndicationFeePercent: number;
    reporterRoyaltiesPercent: number;
    platformFeePercent: number;
    settlementHoldDays: number;
  };
  productionQueueLimits: {
    maxConcurrentJobsPerTenant: number;
    maxJobRetryAttempts: number;
    workerLeaseDurationSeconds: number;
    backlogAlertThreshold: number;
  };
  supportedFormats: string[];
  supportedLanguages: string[];
  supportedFonts: string[];
  notificationTemplates: Record<string, { subject: string; template: string }>;
  supportEscalationPolicies: {
    sev1SlaHours: number;
    sev2SlaHours: number;
    sev3SlaHours: number;
    sev4SlaHours: number;
    autoEscalateAfterHours: number;
  };
  lastModifiedBy: string;
  lastModifiedAt: string;
  changeReason: string;
}

export interface PlatformConfigHistoryEntry {
  entryId: string;
  version: number;
  timestamp: string;
  adminId: string;
  adminEmail: string;
  category: string;
  settingKey: string;
  previousValue: any;
  newValue: any;
  reason: string;
  isHighImpact: boolean;
  confirmedByAdmin: boolean;
}

// ---------------------------------------------------------------------------
// 3. Support and Customer Operations
// ---------------------------------------------------------------------------

export type SupportCaseStatus =
  | 'OPEN'
  | 'TRIAGED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_CUSTOMER'
  | 'RESOLVED'
  | 'CLOSED';

export type SupportCaseSeverity =
  | 'SEV1_CRITICAL'
  | 'SEV2_HIGH'
  | 'SEV3_MEDIUM'
  | 'SEV4_LOW';

export type SupportCategory =
  | 'BILLING_SUBSCRIPTION'
  | 'MARKETPLACE_PAYOUT'
  | 'EDITION_PRODUCTION'
  | 'ACCESS_RBAC'
  | 'API_WEBHOOK'
  | 'DATA_INTEGRITY'
  | 'GENERAL';

export interface SupportAttachment {
  name: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
}

export interface SupportMessage {
  messageId: string;
  caseId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  isInternalNote: boolean;
  attachments: SupportAttachment[];
  createdAt: string;
}

export interface SupportCase {
  caseId: string;
  tenantId: string;
  tenantName: string;
  requesterUserId: string;
  requesterEmail: string;
  requesterName: string;
  title: string;
  category: SupportCategory;
  severity: SupportCaseSeverity;
  status: SupportCaseStatus;
  assignedToId?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  resolutionSummary?: string;
  reopenReason?: string;
  reopenedCount: number;
  slaHours: number;
  slaBreached: boolean;
  messages: SupportMessage[];
}

// ---------------------------------------------------------------------------
// 4. Legal, Consent and Policy Readiness
// ---------------------------------------------------------------------------

export type PolicyDocumentType =
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY'
  | 'MARKETPLACE_AGREEMENT'
  | 'CONTENT_LICENSING_TERMS'
  | 'ACCEPTABLE_USE_POLICY'
  | 'SUBSCRIPTION_BILLING_TERMS'
  | 'DATA_RETENTION_DELETION_POLICY'
  | 'API_WEBHOOK_TERMS';

export interface PolicyDocumentVersion {
  docId: string;
  docType: PolicyDocumentType;
  title: string;
  version: string;
  status: 'DRAFT_UNREVIEWED' | 'COUNSEL_REVIEW_PENDING' | 'ACTIVE_RATIFIED' | 'SUPERSEDED';
  contentSummary: string;
  effectiveDate: string;
  lastReviewedDate?: string;
  legalCounselReviewer?: string;
  counselNotes?: string;
  isLegallyBinding: boolean;
}

export interface PolicyAcceptanceRecord {
  acceptanceId: string;
  docType: PolicyDocumentType;
  version: string;
  tenantId: string;
  userId: string;
  userEmail: string;
  acceptedAt: string;
  ipAddress: string;
  consentContext:
    | 'REGISTRATION'
    | 'CHECKOUT'
    | 'MARKETPLACE_PUBLISH'
    | 'DEVELOPER_SETUP'
    | 'ORGANIZATION_ONBOARDING';
  isRevoked: boolean;
}

// ---------------------------------------------------------------------------
// 5. Deployment Environment Readiness
// ---------------------------------------------------------------------------

export type DeploymentEnvironment = 'development' | 'staging' | 'production';

export type DeploymentVerificationStatus =
  | 'VERIFIED_ACTIVE'
  | 'SANDBOX_VERIFIED'
  | 'ARCHITECTURAL_ONLY'
  | 'MOCK_ONLY'
  | 'NOT_EXECUTED'
  | 'BLOCKED';

export interface DeploymentReadinessItem {
  id: string;
  category: string;
  title: string;
  description: string;
  targetEnvironment: DeploymentEnvironment;
  status: DeploymentVerificationStatus;
  evidence: string;
  verificationTimestamp: string;
  isLaunchBlocker: boolean;
  remediation?: string;
}

// ---------------------------------------------------------------------------
// 6. Launch Readiness Dashboard & Decision Gates
// ---------------------------------------------------------------------------

export type LaunchCheckCategory =
  | 'SECURITY'
  | 'TENANT_ISOLATION'
  | 'AUTHENTICATION'
  | 'BILLING_PAYMENTS'
  | 'MARKETPLACE_LICENSING'
  | 'FINANCIAL_INTEGRITY'
  | 'REPORTER_PAYOUTS'
  | 'EDITION_PDF_PRODUCTION'
  | 'VENDOR_DISPATCH'
  | 'API_WEBHOOKS'
  | 'BACKUPS_DR'
  | 'MONITORING_ALERTING'
  | 'LEGAL_CONSENT'
  | 'CUSTOMER_SUPPORT'
  | 'DOCUMENTATION'
  | 'OPERATIONAL_OWNERSHIP';

export type LaunchCheckStatus = 'PASS' | 'WARNING' | 'BLOCKED' | 'NOT_VERIFIED';

export interface LaunchGateCheck {
  checkId: string;
  category: LaunchCheckCategory;
  title: string;
  description: string;
  isMandatory: boolean;
  status: LaunchCheckStatus;
  verificationLevel:
    | 'CODE_VERIFIED'
    | 'EMULATOR_TESTED'
    | 'SANDBOX_TESTED'
    | 'LIVE_PRODUCTION_VERIFIED'
    | 'ARCHITECTURAL_MOCK';
  evidence: string;
  lastCheckedAt: string;
  ownerRole: string;
  correctiveAction: string;
  isCriticalBlocker: boolean;
  canBeOverridden: boolean;
}

export interface LaunchDecision {
  decision: 'GO' | 'CONDITIONAL_GO' | 'NO_GO';
  summary: string;
  totalChecks: number;
  passedChecks: number;
  warningChecks: number;
  blockedChecks: number;
  notVerifiedChecks: number;
  criticalBlockers: { checkId: string; title: string; reason: string }[];
  acceptedWarnings: { checkId: string; title: string; acceptedBy: string; deadline: string; reason: string }[];
  evaluatedAt: string;
}
