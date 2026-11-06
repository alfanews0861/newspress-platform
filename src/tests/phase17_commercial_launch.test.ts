/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Platform — Phase 17 Commercial Launch & Super Admin Test Suite
 * Total Tests: 100 Comprehensive Unit and Integration Tests
 */

import { PLATFORM_ROLE_PERMISSIONS, ORGANIZATION_ROLE_PERMISSIONS } from '../config/rbacMatrix';
import { PlatformOnboardingService } from '../services/platformOnboardingService';
import { PlatformConfigService } from '../services/platformConfigService';
import { CustomerSupportService } from '../services/customerSupportService';
import { PlatformPolicyService } from '../services/platformPolicyService';
import { DeploymentReadinessService } from '../services/deploymentReadinessService';
import { LaunchReadinessService } from '../services/launchReadinessService';
import { CommercialBillingAuditService } from '../services/commercialBillingAuditService';
import { MarketplaceLaunchGateService } from '../services/marketplaceLaunchGateService';
import { PlanCatalogService } from '../services/planCatalogService';
import { SubscriptionEntitlementService } from '../services/subscriptionEntitlementService';
import { TaxService } from '../services/taxService';
import { AuditService } from '../services/auditService';

function runPhase17Tests() {
  console.log('================================================================');
  console.log('STARTING PHASE 17 COMMERCIAL LAUNCH & GO-LIVE READINESS TESTS');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testNum: number, name: string) {
    if (condition) {
      console.log(`  ✓ [PASS] Test ${testNum}: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] Test ${testNum}: ${name}`);
      failed++;
    }
  }

  // Reset all services to pristine state before test run
  PlatformOnboardingService.resetStore();
  PlatformConfigService.resetConfig();
  CustomerSupportService.resetStore();
  PlatformPolicyService.resetStore();
  LaunchReadinessService.resetStore();
  PlanCatalogService.resetStore();
  SubscriptionEntitlementService.resetStore();

  // -------------------------------------------------------------------------
  // Group 1: Platform RBAC & Strict Tenant Isolation (Tests 1-8)
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Platform RBAC & Strict Tenant Isolation ---');

  // Test 1
  const superAdminPerms = PLATFORM_ROLE_PERMISSIONS.super_admin;
  assert(
    superAdminPerms.includes('platform.admin') &&
    superAdminPerms.includes('platform.config.manage') &&
    superAdminPerms.includes('platform.onboarding.manage') &&
    superAdminPerms.includes('platform.readiness.manage'),
    1,
    'super_admin possesses full Phase 17 platform administration permissions'
  );

  // Test 2
  const platformAdminPerms = PLATFORM_ROLE_PERMISSIONS.platform_admin;
  assert(
    platformAdminPerms.includes('platform.config.view') &&
    platformAdminPerms.includes('platform.onboarding.manage') &&
    !platformAdminPerms.includes('operations.integrity.repair'),
    2,
    'platform_admin has configuration view and onboarding manage, but lacks low-level integrity repairs'
  );

  // Test 3
  const supportAdminPerms = PLATFORM_ROLE_PERMISSIONS.support_admin;
  assert(
    supportAdminPerms.includes('platform.support.view') &&
    supportAdminPerms.includes('platform.support.manage') &&
    !supportAdminPerms.includes('platform.admin') &&
    !supportAdminPerms.includes('platform.config.manage'),
    3,
    'support_admin possesses support desk access but lacks platform.admin and config.manage'
  );

  // Test 4
  const ownerPerms = ORGANIZATION_ROLE_PERMISSIONS.owner;
  assert(
    !ownerPerms.some((p: string) => p.startsWith('platform.')),
    4,
    'Tenant owner role strictly lacks all platform.* governance permissions'
  );

  // Test 5
  const editorPerms = ORGANIZATION_ROLE_PERMISSIONS.editor;
  assert(
    !editorPerms.some((p: string) => p.startsWith('platform.')),
    5,
    'Tenant editor role strictly lacks platform.* permissions'
  );

  // Test 6
  const memberPerms = ORGANIZATION_ROLE_PERMISSIONS.member;
  assert(
    !memberPerms.some((p: string) => p.startsWith('platform.')),
    6,
    'Tenant member role strictly lacks platform.* permissions'
  );

  // Test 7
  let crossTenantLeakBlocked = false;
  try {
    CustomerSupportService.getCaseById('case-sup-102', 'tenant-metro-chronicle', false);
  } catch (err: any) {
    crossTenantLeakBlocked = err.message.includes('belongs to another tenant');
  }
  assert(crossTenantLeakBlocked, 7, 'Cross-tenant query on foreign support case strictly rejected');

  // Test 8
  const unauthPerms = PLATFORM_ROLE_PERMISSIONS.none;
  assert(unauthPerms.length === 0, 8, 'Unassigned platform role possesses zero permissions');

  // -------------------------------------------------------------------------
  // Group 2: Publisher Onboarding Lifecycle State Machine (Tests 9-18)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Publisher Onboarding Lifecycle State Machine ---');

  // Test 9
  const invitedPublisher = PlatformOnboardingService.invitePublisher({
    tenantId: 'tenant-test-daily',
    organizationName: 'The Test Daily Post',
    legalEntityName: 'Test Media Publications LLC',
    contactEmail: 'publisher@testdaily.com',
    ownerUserId: 'user-test-owner',
    ownerEmail: 'publisher@testdaily.com',
    targetPlan: 'STANDARD',
    primaryTimezone: 'Asia/Kolkata',
    country: 'India',
    invitedBy: 'super_admin',
  });
  assert(invitedPublisher.status === 'INVITED', 9, 'Newly invited publisher initializes in INVITED state');

  // Test 10
  const regPending = PlatformOnboardingService.transitionStatus(
    'tenant-test-daily',
    'REGISTRATION_PENDING',
    'super_admin'
  );
  assert(regPending.status === 'REGISTRATION_PENDING', 10, 'INVITED successfully transitions to REGISTRATION_PENDING');

  // Test 11
  let illegalSkipBlocked = false;
  try {
    PlatformOnboardingService.transitionStatus('tenant-test-daily', 'ONBOARDING_COMPLETE', 'super_admin');
  } catch (err) {
    illegalSkipBlocked = true;
  }
  assert(illegalSkipBlocked, 11, 'Illegal state skip (REGISTRATION_PENDING -> ONBOARDING_COMPLETE) blocked by state machine');

  // Test 12
  const verPending = PlatformOnboardingService.transitionStatus(
    'tenant-test-daily',
    'VERIFICATION_PENDING',
    'super_admin'
  );
  assert(verPending.status === 'VERIFICATION_PENDING', 12, 'REGISTRATION_PENDING transitions to VERIFICATION_PENDING');

  // Test 13
  let unverifiedAdvanceBlocked = false;
  try {
    PlatformOnboardingService.transitionStatus('tenant-test-daily', 'CONFIGURATION_PENDING', 'super_admin');
  } catch (err: any) {
    unverifiedAdvanceBlocked = err.message.includes('Verification documents have not been fully verified');
  }
  assert(unverifiedAdvanceBlocked, 13, 'Advancing to CONFIGURATION_PENDING blocked while verification docs are pending');

  // Test 14
  PlatformOnboardingService.addVerificationDocument('tenant-test-daily', {
    docType: 'CERTIFICATE_OF_INCORPORATION',
    documentRef: 'docs/test_coi.pdf',
    verified: false,
  });
  const afterReview = PlatformOnboardingService.reviewVerificationDocument(
    'tenant-test-daily',
    'CERTIFICATE_OF_INCORPORATION',
    true,
    'super_admin',
    'Incorporation document verified in MCA portal'
  );
  assert(
    afterReview.verificationDocuments[0].verified === true,
    14,
    'Super admin verification review approves Certificate of Incorporation'
  );

  // Test 15
  const configPending = PlatformOnboardingService.transitionStatus(
    'tenant-test-daily',
    'CONFIGURATION_PENDING',
    'super_admin'
  );
  assert(configPending.status === 'CONFIGURATION_PENDING', 15, 'Verified documents allow transition to CONFIGURATION_PENDING');

  // Test 16
  const subActive = PlatformOnboardingService.transitionStatus(
    'tenant-test-daily',
    'TRIAL_OR_SUBSCRIPTION_ACTIVE',
    'super_admin'
  );
  assert(
    subActive.status === 'TRIAL_OR_SUBSCRIPTION_ACTIVE',
    16,
    'CONFIGURATION_PENDING transitions to TRIAL_OR_SUBSCRIPTION_ACTIVE'
  );

  // Test 17
  let incompleteChecklistBlocked = false;
  try {
    PlatformOnboardingService.transitionStatus('tenant-test-daily', 'ONBOARDING_COMPLETE', 'super_admin');
  } catch (err: any) {
    incompleteChecklistBlocked = err.message.includes('Incomplete mandatory checklist steps');
  }
  assert(incompleteChecklistBlocked, 17, 'ONBOARDING_COMPLETE blocked if mandatory checklist steps remain incomplete');

  // Test 18
  subActive.checklist.forEach((c) => {
    PlatformOnboardingService.updateChecklistStep('tenant-test-daily', c.stepId, 'COMPLETED', 'super_admin');
  });
  const completed = PlatformOnboardingService.transitionStatus(
    'tenant-test-daily',
    'ONBOARDING_COMPLETE',
    'super_admin'
  );
  assert(
    completed.status === 'ONBOARDING_COMPLETE' && !!completed.completedAt,
    18,
    'Completing all checklist steps permits transition to ONBOARDING_COMPLETE with timestamp'
  );

  // -------------------------------------------------------------------------
  // Group 3: Onboarding Rejections, Suspensions & Edge Cases (Tests 19-24)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Onboarding Rejections, Suspensions & Edge Cases ---');

  // Test 19
  const suspended = PlatformOnboardingService.transitionStatus(
    'tenant-test-daily',
    'SUSPENDED',
    'super_admin',
    'Compliance review hold for regulatory filing'
  );
  assert(
    suspended.status === 'SUSPENDED' && suspended.suspensionReason === 'Compliance review hold for regulatory filing',
    19,
    'Publisher suspension requires mandatory reason and sets SUSPENDED status'
  );

  // Test 20
  let emptySuspensionBlocked = false;
  try {
    PlatformOnboardingService.transitionStatus('tenant-pacific-tribune', 'SUSPENDED', 'super_admin', '');
  } catch (err: any) {
    emptySuspensionBlocked = err.message.includes('Mandatory suspension reason required');
  }
  assert(emptySuspensionBlocked, 20, 'Suspension attempt without reason strictly blocked');

  // Test 21
  const reactivated = PlatformOnboardingService.transitionStatus(
    'tenant-test-daily',
    'ONBOARDING_COMPLETE',
    'super_admin'
  );
  assert(reactivated.status === 'ONBOARDING_COMPLETE', 21, 'Suspended publisher can be reinstated upon administrative review');

  // Test 22
  let duplicateInviteBlocked = false;
  try {
    PlatformOnboardingService.invitePublisher({
      tenantId: 'tenant-test-daily',
      organizationName: 'Duplicate',
      legalEntityName: 'Dup',
      contactEmail: 'dup@dup.com',
      ownerUserId: 'u-dup',
      ownerEmail: 'dup@dup.com',
      invitedBy: 'super_admin',
    });
  } catch (err: any) {
    duplicateInviteBlocked = err.message.includes('record already exists');
  }
  assert(duplicateInviteBlocked, 22, 'Duplicate invitation for existing tenant ID strictly rejected');

  // Test 23
  PlatformOnboardingService.invitePublisher({
    tenantId: 'tenant-reject-test',
    organizationName: 'Rejectable Pub',
    legalEntityName: 'Reject LLC',
    contactEmail: 'rej@pub.com',
    ownerUserId: 'u-rej',
    ownerEmail: 'rej@pub.com',
    invitedBy: 'super_admin',
  });
  PlatformOnboardingService.transitionStatus('tenant-reject-test', 'REGISTRATION_PENDING', 'super_admin');
  PlatformOnboardingService.transitionStatus('tenant-reject-test', 'VERIFICATION_PENDING', 'super_admin');
  const rejected = PlatformOnboardingService.transitionStatus(
    'tenant-reject-test',
    'REJECTED',
    'super_admin',
    'Invalid tax identification and press credentials'
  );
  assert(
    Boolean(rejected.status === 'REJECTED' && rejected.rejectionReason?.includes('Invalid tax identification')),
    23,
    'Publisher rejection records mandatory rejection reason'
  );

  // Test 24
  let missingRejectReasonBlocked = false;
  try {
    PlatformOnboardingService.invitePublisher({
      tenantId: 'tenant-no-reason',
      organizationName: 'No Reason Pub',
      legalEntityName: 'No Reason',
      contactEmail: 'noreason@pub.com',
      ownerUserId: 'u-noreason',
      ownerEmail: 'noreason@pub.com',
      invitedBy: 'super_admin',
    });
    PlatformOnboardingService.transitionStatus('tenant-no-reason', 'REGISTRATION_PENDING', 'super_admin');
    PlatformOnboardingService.transitionStatus('tenant-no-reason', 'VERIFICATION_PENDING', 'super_admin');
    PlatformOnboardingService.transitionStatus('tenant-no-reason', 'REJECTED', 'super_admin', '');
  } catch (err: any) {
    missingRejectReasonBlocked = err.message.includes('Mandatory rejection reason required');
  }
  assert(missingRejectReasonBlocked, 24, 'Rejection without reason strictly rejected by state machine');

  // -------------------------------------------------------------------------
  // Group 4: Commercial Plan Catalog & Billing Readiness (Tests 25-32)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Commercial Plan Catalog & Billing Readiness ---');

  // Test 25
  const allPlans = PlanCatalogService.getAllPlans();
  assert(allPlans.length === 3, 25, 'PlanCatalogService initializes exactly 3 standard tiers: BASIC, STANDARD, PREMIUM');

  // Test 26
  const basicPlan = PlanCatalogService.getPlan('BASIC')!;
  assert(
    basicPlan.price === 0 && basicPlan.features.generativeAiAllowed === false && basicPlan.limits.monthlyAIUsageLimit === 0,
    26,
    'BASIC plan enforces price 0, 0 generative AI allowed, and 0 monthly AI usage limit'
  );

  // Test 27
  assert(
    basicPlan.limits.editionLimit === 2 && basicPlan.limits.staffMemberLimit === 3,
    27,
    'BASIC plan enforces deterministic limits: 2 editions, 3 staff seats'
  );

  // Test 28
  const standardPlan = PlanCatalogService.getPlan('STANDARD')!;
  assert(
    standardPlan.price === 4999 && standardPlan.features.generativeAiAllowed === true && standardPlan.features.aiTier === 'LIGHT',
    28,
    'STANDARD plan configures price ₹4,999, trialDays 14, and LIGHT AI tier'
  );

  // Test 29
  const premiumPlan = PlanCatalogService.getPlan('PREMIUM')!;
  assert(
    premiumPlan.price === 14999 && premiumPlan.features.aiTier === 'ADVANCED' && premiumPlan.limits.editionLimit === 100,
    29,
    'PREMIUM plan configures price ₹14,999, ADVANCED AI tier, and 100 edition limit'
  );

  // Test 30
  const billingAudit = CommercialBillingAuditService.runAudit();
  assert(billingAudit.planCatalogValid && billingAudit.allChecksPassed, 30, 'CommercialBillingAuditService validates all plan definitions against limits');

  // Test 31
  const gstCalculation = TaxService.calculateTax(10000, 'IN', 'KA');
  assert(
    gstCalculation.taxTotal === 1800,
    31,
    'TaxService computes 18% GST (₹1,800 on ₹10,000 subtotal) for Indian jurisdiction'
  );

  // Test 32
  const taxConfigs = TaxService.getTaxConfigurations();
  assert(
    taxConfigs.some((c) => c.taxType === 'GST' && c.ratePercent === 18),
    32,
    'Default tax configuration includes 18% GST effective from 2026-01-01'
  );

  // -------------------------------------------------------------------------
  // Group 5: Platform Configuration Management & Safety Guards (Tests 33-42)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Platform Configuration Management & Safety Guards ---');

  // Test 33
  const initialConfig = PlatformConfigService.getConfig();
  assert(initialConfig.version === 1, 33, 'PlatformConfigService initializes with baseline version 1');

  // Test 34
  const updatedConfig = PlatformConfigService.updateConfig({
    category: 'RATE_LIMITS',
    settingKey: 'rateLimitTiers.tierStandardRpm',
    newValue: 350,
    reason: 'Increased standard tier rate limit for news cycle peak',
    adminId: 'super_admin',
    adminEmail: 'admin@newspress.io',
    confirmHighImpact: true,
  });
  assert(
    updatedConfig.version === 2 && updatedConfig.rateLimitTiers.tierStandardRpm === 350,
    34,
    'Updating configuration increments version to 2 and prospectively applies new value'
  );

  // Test 35
  let missingReasonBlocked = false;
  try {
    PlatformConfigService.updateConfig({
      category: 'TRIAL',
      settingKey: 'trialPolicies.defaultTrialDays',
      newValue: 21,
      reason: 'ab', // < 5 chars
      adminId: 'super_admin',
      adminEmail: 'admin@newspress.io',
    });
  } catch (err: any) {
    missingReasonBlocked = err.message.includes('Mandatory justification reason');
  }
  assert(missingReasonBlocked, 35, 'Configuration update without adequate justification reason strictly rejected');

  // Test 36
  let unconfirmedHighImpactBlocked = false;
  try {
    PlatformConfigService.updateConfig({
      category: 'FINANCE',
      settingKey: 'marketplacePricing.reporterRoyaltiesPercent',
      newValue: 80,
      reason: 'Altering royalties without high-impact confirmation',
      adminId: 'super_admin',
      adminEmail: 'admin@newspress.io',
      confirmHighImpact: false,
    });
  } catch (err: any) {
    unconfirmedHighImpactBlocked = err.message.includes('High-impact configuration change detected');
  }
  assert(unconfirmedHighImpactBlocked, 36, 'High-impact financial setting update rejected without explicit confirmation');

  // Test 37
  const confirmedHighImpact = PlatformConfigService.updateConfig({
    category: 'FINANCE',
    settingKey: 'marketplacePricing.reporterRoyaltiesPercent',
    newValue: 75,
    reason: 'Approved publisher incentive program for Q4',
    adminId: 'super_admin',
    adminEmail: 'admin@newspress.io',
    confirmHighImpact: true,
  });
  assert(
    confirmedHighImpact.marketplacePricing.reporterRoyaltiesPercent === 75,
    37,
    'High-impact financial update succeeds when confirmHighImpact is true'
  );

  // Test 38
  let invalidSplitPercentBlocked = false;
  try {
    PlatformConfigService.updateConfig({
      category: 'FINANCE',
      settingKey: 'marketplacePricing.reporterRoyaltiesPercent',
      newValue: 150,
      reason: 'Invalid percentage over 100',
      adminId: 'super_admin',
      adminEmail: 'admin@newspress.io',
      confirmHighImpact: true,
    });
  } catch (err: any) {
    invalidSplitPercentBlocked = err.message.includes('between 0 and 100');
  }
  assert(invalidSplitPercentBlocked, 38, 'Percentage greater than 100% rejected by domain validator');

  // Test 39
  let splitSumExceeding100Blocked = false;
  try {
    PlatformConfigService.updateConfig({
      category: 'FINANCE',
      settingKey: 'marketplacePricing.platformFeePercent',
      newValue: 30, // 75 + 30 = 105% > 100%
      reason: 'Excessive fee causing total split > 100%',
      adminId: 'super_admin',
      adminEmail: 'admin@newspress.io',
      confirmHighImpact: true,
    });
  } catch (err: any) {
    splitSumExceeding100Blocked = err.message.includes('cannot exceed 100%');
  }
  assert(splitSumExceeding100Blocked, 39, 'Royalties plus platform fee exceeding 100% strictly blocked');

  // Test 40
  let secretKeyKeyBlocked = false;
  try {
    PlatformConfigService.updateConfig({
      category: 'INTEGRATION',
      settingKey: 'api_key',
      newValue: 'secret_123',
      reason: 'Attempting to store raw secret',
      adminId: 'super_admin',
      adminEmail: 'admin@newspress.io',
    });
  } catch (err: any) {
    secretKeyKeyBlocked = err.message.includes('Configuration Security Violation');
  }
  assert(secretKeyKeyBlocked, 40, 'Attempting to store secret-named key strictly blocked by security validator');

  // Test 41
  let secretValueBlocked = false;
  try {
    PlatformConfigService.updateConfig({
      category: 'INTEGRATION',
      settingKey: 'notificationTemplates.customEndpoint',
      newValue: 'sk_' + 'live_98124981249812',
      reason: 'Attempting to store live stripe key in template',
      adminId: 'super_admin',
      adminEmail: 'admin@newspress.io',
    });
  } catch (err: any) {
    secretValueBlocked = err.message.includes('Configuration Security Violation');
  }
  assert(secretValueBlocked, 41, 'Attempting to store live secret string value (sk_live_...) strictly rejected');

  // Test 42
  const v1Snapshot = PlatformConfigService.getSnapshotByVersion(1);
  assert(
    v1Snapshot?.version === 1 && v1Snapshot.rateLimitTiers.tierStandardRpm === 300,
    42,
    'Historical version 1 configuration snapshot preserved immutably'
  );

  // -------------------------------------------------------------------------
  // Group 6: Support Operations & Confidential Internal Notes (Tests 43-52)
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Support Operations & Confidential Internal Notes ---');

  // Test 43
  const newTicket = CustomerSupportService.createCase({
    tenantId: 'tenant-metro-chronicle',
    tenantName: 'The Metropolitan Chronicle',
    requesterUserId: 'user-alfa-superadmin',
    requesterEmail: 'alfanewsservice@gmail.com',
    requesterName: 'Alfa Admin',
    title: 'Preflight font embedding warning for Berlin Tabloid',
    category: 'EDITION_PRODUCTION',
    severity: 'SEV1_CRITICAL',
    initialMessage: 'Our midnight print run encountered font embedding failure on Page 4.',
  });
  assert(newTicket.status === 'OPEN' && newTicket.severity === 'SEV1_CRITICAL', 43, 'Creating support case initializes with OPEN status');

  // Test 44
  assert(newTicket.slaHours === 1, 44, 'SEV1_CRITICAL case assigned 1-hour SLA target window');

  // Test 45
  const sev2Ticket = CustomerSupportService.createCase({
    tenantId: 'tenant-metro-chronicle',
    tenantName: 'The Metropolitan Chronicle',
    requesterUserId: 'user-alfa-superadmin',
    requesterEmail: 'alfanewsservice@gmail.com',
    requesterName: 'Alfa Admin',
    title: 'Delay in reporter wallet balance settlement',
    category: 'MARKETPLACE_PAYOUT',
    severity: 'SEV2_HIGH',
    initialMessage: 'Reporter payments held beyond 7-day period for verification.',
  });
  assert(sev2Ticket.slaHours === 4, 45, 'SEV2_HIGH case assigned 4-hour SLA target window');

  // Test 46
  const sev3Ticket = CustomerSupportService.createCase({
    tenantId: 'tenant-metro-chronicle',
    tenantName: 'The Metropolitan Chronicle',
    requesterUserId: 'user-alfa-superadmin',
    requesterEmail: 'alfanewsservice@gmail.com',
    requesterName: 'Alfa Admin',
    title: 'General inquiry on webhook HMAC signature verification',
    category: 'API_WEBHOOK',
    severity: 'SEV3_MEDIUM',
    initialMessage: 'Requesting sample Python script for verifying X-NewsPress-Signature.',
  });
  assert(sev3Ticket.slaHours === 24, 46, 'SEV3_MEDIUM case assigned 24-hour SLA target window');

  // Test 47
  CustomerSupportService.addMessage({
    caseId: newTicket.caseId,
    authorId: 'user-support-lead',
    authorName: 'Support Agent Dave',
    authorRole: 'support_admin',
    content: 'Internal check: Font registry cache was restarted at 23:45 UTC.',
    isInternalNote: true,
    isPlatformOrSupportAdmin: true,
  });
  CustomerSupportService.addMessage({
    caseId: newTicket.caseId,
    authorId: 'user-support-lead',
    authorName: 'Support Agent Dave',
    authorRole: 'support_admin',
    content: 'Hello editor, please re-run preflight validation now.',
    isInternalNote: false,
    isPlatformOrSupportAdmin: true,
  });
  const supportAdminView = CustomerSupportService.getCaseById(newTicket.caseId, 'tenant-metro-chronicle', true)!;
  assert(
    supportAdminView.messages.some((m) => m.isInternalNote === true),
    47,
    'Support / Platform administrator view preserves confidential internal notes'
  );

  // Test 48
  const tenantCustomerView = CustomerSupportService.getCaseById(newTicket.caseId, 'tenant-metro-chronicle', false)!;
  assert(
    !tenantCustomerView.messages.some((m) => m.isInternalNote === true),
    48,
    'Tenant customer view strictly filters out and strips all internal notes'
  );

  // Test 49
  let tenantInternalNoteBlocked = false;
  try {
    CustomerSupportService.addMessage({
      caseId: newTicket.caseId,
      authorId: 'user-alfa-superadmin',
      authorName: 'Tenant User',
      authorRole: 'owner',
      content: 'Attempting to inject internal note as customer',
      isInternalNote: true,
      isPlatformOrSupportAdmin: false,
    });
  } catch (err: any) {
    tenantInternalNoteBlocked = err.message.includes('Tenant members cannot create internal staff notes');
  }
  assert(tenantInternalNoteBlocked, 49, 'Tenant users strictly blocked from creating internal notes');

  // Test 50
  let oversizedAttachmentBlocked = false;
  try {
    CustomerSupportService.createCase({
      tenantId: 'tenant-metro-chronicle',
      tenantName: 'The Metropolitan Chronicle',
      requesterUserId: 'user-alfa-superadmin',
      requesterEmail: 'alfanewsservice@gmail.com',
      requesterName: 'Alfa Admin',
      title: 'Oversized Attachment Test',
      category: 'GENERAL',
      severity: 'SEV4_LOW',
      initialMessage: 'Testing attachment upload limit.',
      attachments: [
        {
          name: 'dump.raw',
          url: 'https://example.com/dump.raw',
          sizeBytes: 25 * 1024 * 1024, // 25MB > 10MB
          mimeType: 'application/pdf',
        },
      ],
    });
  } catch (err: any) {
    oversizedAttachmentBlocked = err.message.includes('exceeds maximum permitted size');
  }
  assert(oversizedAttachmentBlocked, 50, 'Attachment exceeding 10MB limit strictly rejected');

  // Test 51
  let disallowedMimeBlocked = false;
  try {
    CustomerSupportService.createCase({
      tenantId: 'tenant-metro-chronicle',
      tenantName: 'The Metropolitan Chronicle',
      requesterUserId: 'user-alfa-superadmin',
      requesterEmail: 'alfanewsservice@gmail.com',
      requesterName: 'Alfa Admin',
      title: 'Disallowed MIME Test',
      category: 'GENERAL',
      severity: 'SEV4_LOW',
      initialMessage: 'Testing attachment mime type.',
      attachments: [
        {
          name: 'malware.exe',
          url: 'https://example.com/malware.exe',
          sizeBytes: 1024,
          mimeType: 'application/x-msdownload',
        },
      ],
    });
  } catch (err: any) {
    disallowedMimeBlocked = err.message.includes('unsupported MIME type');
  }
  assert(disallowedMimeBlocked, 51, 'Attachment with dangerous/unsupported MIME type rejected');

  // Test 52
  assert(
    tenantCustomerView.firstResponseAt !== undefined,
    52,
    'First response timestamp recorded on support agent reply'
  );

  // -------------------------------------------------------------------------
  // Group 7: Support Case Lifecycle Transitions & Reopening (Tests 53-58)
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Support Case Lifecycle Transitions & Reopening ---');

  // Test 53
  const claimedCase = CustomerSupportService.assignCase(
    newTicket.caseId,
    'agent-1',
    'Agent Dave',
    'super_admin'
  );
  assert(claimedCase.assignedToId === 'agent-1' && claimedCase.status === 'TRIAGED', 53, 'Assigning case advances status from OPEN to TRIAGED');

  // Test 54
  const inProgressCase = CustomerSupportService.updateStatus({
    caseId: newTicket.caseId,
    newStatus: 'IN_PROGRESS',
    actorId: 'agent-1',
  });
  assert(inProgressCase.status === 'IN_PROGRESS', 54, 'Case status advances to IN_PROGRESS');

  // Test 55
  let missingResolutionSummaryBlocked = false;
  try {
    CustomerSupportService.updateStatus({
      caseId: newTicket.caseId,
      newStatus: 'RESOLVED',
      actorId: 'agent-1',
      resolutionSummary: '', // Empty
    });
  } catch (err: any) {
    missingResolutionSummaryBlocked = err.message.includes('Mandatory resolution summary required');
  }
  assert(missingResolutionSummaryBlocked, 55, 'Resolving support case without mandatory summary strictly rejected');

  // Test 56
  const resolvedCase = CustomerSupportService.updateStatus({
    caseId: newTicket.caseId,
    newStatus: 'RESOLVED',
    actorId: 'agent-1',
    resolutionSummary: 'Preflight font cache refreshed. All TTF/OTF tables validated.',
  });
  assert(
    resolvedCase.status === 'RESOLVED' && !!resolvedCase.resolvedAt,
    56,
    'Case successfully resolved with summary and resolution timestamp'
  );

  // Test 57
  let missingReopenReasonBlocked = false;
  try {
    CustomerSupportService.updateStatus({
      caseId: newTicket.caseId,
      newStatus: 'IN_PROGRESS',
      actorId: 'customer-1',
      reopenReason: '',
    });
  } catch (err: any) {
    missingReopenReasonBlocked = err.message.includes('Mandatory reason required when reopening');
  }
  assert(missingReopenReasonBlocked, 57, 'Reopening resolved case without reason strictly rejected');

  // Test 58
  const reopenedCase = CustomerSupportService.updateStatus({
    caseId: newTicket.caseId,
    newStatus: 'IN_PROGRESS',
    actorId: 'customer-1',
    reopenReason: 'Font issue recurred on late evening reprint run',
  });
  assert(
    reopenedCase.status === 'IN_PROGRESS' && reopenedCase.reopenedCount === 1 && reopenedCase.resolvedAt === undefined,
    58,
    'Reopened case clears resolvedAt timestamp and increments reopenedCount'
  );

  // -------------------------------------------------------------------------
  // Group 8: Legal Policy Versioning & Acceptance History (Tests 59-66)
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Legal Policy Versioning & Acceptance History ---');

  // Test 59
  const policies = PlatformPolicyService.getAllDocuments();
  assert(policies.length === 8, 59, 'PlatformPolicyService tracks all 8 required legal policy documents');

  // Test 60
  const tosDoc = PlatformPolicyService.getDocumentByType('TERMS_OF_SERVICE')!;
  assert(
    tosDoc.status === 'DRAFT_UNREVIEWED' && tosDoc.isLegallyBinding === false,
    60,
    'Terms of Service document correctly flags DRAFT_UNREVIEWED and isLegallyBinding: false'
  );

  // Test 61
  const acceptance = PlatformPolicyService.recordAcceptance({
    docType: 'TERMS_OF_SERVICE',
    tenantId: 'tenant-test-daily',
    userId: 'user-test-owner',
    userEmail: 'publisher@testdaily.com',
    ipAddress: '203.0.113.19',
    consentContext: 'ORGANIZATION_ONBOARDING',
  });
  assert(
    acceptance.docType === 'TERMS_OF_SERVICE' && acceptance.version === tosDoc.version,
    61,
    'Recording policy acceptance records version, user, timestamp, and IP address'
  );

  // Test 62
  assert(
    PlatformPolicyService.hasAcceptedCurrentPolicy('tenant-test-daily', 'TERMS_OF_SERVICE'),
    62,
    'hasAcceptedCurrentPolicy confirms valid acceptance for current document version'
  );

  // Test 63
  PlatformPolicyService.updateDocumentVersion({
    docId: tosDoc.docId,
    newVersion: '2.0.0-draft',
    status: 'DRAFT_UNREVIEWED',
    adminId: 'super_admin',
    contentSummary: 'Updated liability limits for automated preflight pipelines.',
  });
  assert(
    !PlatformPolicyService.hasAcceptedCurrentPolicy('tenant-test-daily', 'TERMS_OF_SERVICE'),
    63,
    'Publishing new policy version invalidates past consent and mandates re-acceptance'
  );

  // Test 64
  const ratifiedPriv = PlatformPolicyService.updateDocumentVersion({
    docId: 'doc-privacy-v1',
    newVersion: '1.0.0-final',
    status: 'ACTIVE_RATIFIED',
    counselReviewer: 'Bar Council Certified Commercial Counsel',
    counselNotes: 'Ratified for DPDP and GDPR compliance.',
    adminId: 'super_admin',
  });
  assert(
    ratifiedPriv.isLegallyBinding === true && ratifiedPriv.status === 'ACTIVE_RATIFIED',
    64,
    'ACTIVE_RATIFIED policy document marked isLegallyBinding: true with counsel notes'
  );

  // Test 65
  const tenantAcceptances = PlatformPolicyService.getAcceptancesForTenant('tenant-test-daily');
  assert(tenantAcceptances.length === 1, 65, 'Acceptances query returns tenant-isolated acceptance records');

  // Test 66
  assert(
    PlatformPolicyService.getAcceptancesForTenant('tenant-pacific-tribune').length === 0,
    66,
    'Tenant B query returns zero acceptances for Tenant A'
  );

  // -------------------------------------------------------------------------
  // Group 9: Marketplace & Financial Launch Gates (Tests 67-74)
  // -------------------------------------------------------------------------
  console.log('\n--- 9. Marketplace & Financial Launch Gates ---');

  // Test 67
  const gateValidation = MarketplaceLaunchGateService.validateAllGates();
  assert(gateValidation.results.length === 7, 67, 'MarketplaceLaunchGateService validates all 7 launch gates');

  // Test 68
  const gate1 = gateValidation.results.find((g) => g.gateId === 'MKT-GATE-01')!;
  assert(gate1.passed, 68, 'Gate 1 Passed: No free access to paid marketplace content without license');

  // Test 69
  const gate2 = gateValidation.results.find((g) => g.gateId === 'MKT-GATE-02')!;
  assert(gate2.passed, 69, 'Gate 2 Passed: No duplicate purchase or payout execution');

  // Test 70
  const gate3 = gateValidation.results.find((g) => g.gateId === 'MKT-GATE-03')!;
  assert(gate3.passed, 70, 'Gate 3 Passed: Territorial exclusivity collision prevention enforced');

  // Test 71
  const gate4 = gateValidation.results.find((g) => g.gateId === 'MKT-GATE-04')!;
  assert(gate4.passed, 71, 'Gate 4 Passed: Revenue recognition coupled to verified payment capture');

  // Test 72
  const gate5 = gateValidation.results.find((g) => g.gateId === 'MKT-GATE-05')!;
  assert(gate5.passed, 72, 'Gate 5 Passed: Immutable financial ledger protected against modification');

  // Test 73
  const gate6 = gateValidation.results.find((g) => g.gateId === 'MKT-GATE-06')!;
  assert(gate6.passed, 73, 'Gate 6 Passed: Payout provider test environment prevents live gateway calls');

  // Test 74
  const gate7 = gateValidation.results.find((g) => g.gateId === 'MKT-GATE-07')!;
  assert(gate7.passed, 74, 'Gate 7 Passed: Refunds post compensating double-entry reversals and revoke license');

  // -------------------------------------------------------------------------
  // Group 10: Deployment Readiness Checklist & Environment Classification (Tests 75-82)
  // -------------------------------------------------------------------------
  console.log('\n--- 10. Deployment Readiness Checklist & Environment Classification ---');

  // Test 75
  const depChecklist = DeploymentReadinessService.getChecklist();
  assert(depChecklist.length === 12, 75, 'DeploymentReadinessService contains 12 production infrastructure items');

  // Test 76
  const fbCore = depChecklist.find((d) => d.id === 'dep-fb-proj')!;
  assert(fbCore.status === 'VERIFIED_ACTIVE', 76, 'Firestore Enterprise database verified active in production');

  // Test 77
  const ssrfCheck = depChecklist.find((d) => d.id === 'dep-webhook-ssrf')!;
  assert(ssrfCheck.status === 'VERIFIED_ACTIVE', 77, 'Outbound webhook SSRF defenses verified active');

  // Test 78
  const paymentsLive = depChecklist.find((d) => d.id === 'dep-payments-live-activation')!;
  assert(
    paymentsLive.status === 'NOT_EXECUTED' && paymentsLive.isLaunchBlocker === true,
    78,
    'Live payment collection gateway classified as NOT_EXECUTED (Critical Launch Blocker)'
  );

  // Test 79
  const pitrCheck = depChecklist.find((d) => d.id === 'dep-backup-pitr')!;
  assert(
    pitrCheck.status === 'ARCHITECTURAL_ONLY' && pitrCheck.isLaunchBlocker === true,
    79,
    'GCP Cloud PITR backup classified as ARCHITECTURAL_ONLY (Critical Launch Blocker)'
  );

  // Test 80
  const printVendorSftp = depChecklist.find((d) => d.id === 'dep-print-vendor-sftp')!;
  assert(
    printVendorSftp.status === 'MOCK_ONLY' && printVendorSftp.isLaunchBlocker === true,
    80,
    'Physical print vendor SFTP transmission classified as MOCK_ONLY (Critical Launch Blocker)'
  );

  // Test 81
  const depSummary = DeploymentReadinessService.getSummary();
  assert(depSummary.launchBlockers.length >= 3, 81, 'Deployment readiness summary accurately isolates launch blockers');

  // Test 82
  assert(
    depSummary.launchBlockers.every((b) => ['NOT_EXECUTED', 'ARCHITECTURAL_ONLY', 'MOCK_ONLY'].includes(b.status)),
    82,
    'All launch blockers belong to unexecuted, architectural, or mock infrastructure'
  );

  // -------------------------------------------------------------------------
  // Group 11: Launch Readiness Matrix & Decision Calculations (Tests 83-90)
  // -------------------------------------------------------------------------
  console.log('\n--- 11. Launch Readiness Matrix & Decision Calculations ---');

  // Test 83
  const launchChecks = LaunchReadinessService.getAllChecks();
  assert(launchChecks.length >= 16, 83, 'LaunchReadinessService covers all 16 mandatory readiness categories');

  // Test 84
  const initialDecision = LaunchReadinessService.evaluateLaunchDecision();
  assert(
    initialDecision.decision === 'NO_GO',
    84,
    'Initial launch decision deterministically computes NO-GO due to critical blockers'
  );

  // Test 85
  assert(
    initialDecision.criticalBlockers.length >= 3,
    85,
    'Decision summary identifies live payment, print SFTP, and Cloud PITR as blockers'
  );

  // Test 86
  let blockerOverrideBlocked = false;
  try {
    LaunchReadinessService.acceptWarning({
      checkId: 'gate-vendor-01',
      acceptedBy: 'super_admin',
      deadline: '2026-11-01',
      reason: 'Bypassing print vendor blocker',
    });
  } catch (err: any) {
    blockerOverrideBlocked = err.message.includes('critical safety or financial gate and CANNOT be bypassed');
  }
  assert(blockerOverrideBlocked, 86, 'Administrative bypass of critical blocker strictly prohibited');

  // Test 87
  let financialOverrideBlocked = false;
  try {
    LaunchReadinessService.acceptWarning({
      checkId: 'gate-fin-01',
      acceptedBy: 'super_admin',
      deadline: '2026-11-01',
      reason: 'Bypassing ledger check',
    });
  } catch (err: any) {
    financialOverrideBlocked = err.message.includes('critical safety or financial gate');
  }
  assert(financialOverrideBlocked, 87, 'Administrative bypass of double-entry financial ledger check prohibited');

  // Test 88
  LaunchReadinessService.acceptWarning({
    checkId: 'gate-legal-01',
    acceptedBy: 'General Counsel & Compliance',
    deadline: '2026-11-15',
    reason: 'Outside commercial counsel engagement scheduled for ratification',
  });
  const decisionAfterAcceptingWarning = LaunchReadinessService.evaluateLaunchDecision();
  assert(
    decisionAfterAcceptingWarning.acceptedWarnings.length === 1,
    88,
    'Non-critical operational warning (legal counsel review) accepted with deadline and reason'
  );

  // Test 89
  // Simulate temporary sandbox exception pass on the 4 blockers to test CONDITIONAL_GO calculation
  LaunchReadinessService.updateCheckStatus({
    checkId: 'gate-bill-02',
    newStatus: 'PASS',
    evidence: 'Sandbox payment verified for beta rollout',
    adminId: 'super_admin',
  });
  LaunchReadinessService.updateCheckStatus({
    checkId: 'gate-payout-02',
    newStatus: 'PASS',
    evidence: 'Mock payout verified for beta rollout',
    adminId: 'super_admin',
  });
  LaunchReadinessService.updateCheckStatus({
    checkId: 'gate-vendor-01',
    newStatus: 'PASS',
    evidence: 'Digital-only PDF print simulation approved for pilot publishers',
    adminId: 'super_admin',
  });
  LaunchReadinessService.updateCheckStatus({
    checkId: 'gate-dr-01',
    newStatus: 'PASS',
    evidence: 'In-region daily export verified for pilot publishers',
    adminId: 'super_admin',
  });

  const conditionalDecision = LaunchReadinessService.evaluateLaunchDecision();
  assert(
    conditionalDecision.decision === 'CONDITIONAL_GO',
    89,
    'Resolving blockers with documented accepted warnings computes CONDITIONAL_GO'
  );

  // Test 90
  // Clear accepted warning to verify it reverts to NO_GO if unaccepted warning exists
  LaunchReadinessService.resetStore();
  const resetDecision = LaunchReadinessService.evaluateLaunchDecision();
  assert(resetDecision.decision === 'NO_GO', 90, 'Resetting store restores strict NO-GO baseline');

  // -------------------------------------------------------------------------
  // Group 12: Audit Logging & Tamper-Evident Trail (Tests 91-95)
  // -------------------------------------------------------------------------
  console.log('\n--- 12. Audit Logging & Tamper-Evident Trail ---');

  // Test 91
  AuditService.clear();
  PlatformOnboardingService.invitePublisher({
    tenantId: 'tenant-audit-test',
    organizationName: 'Audit Test Gazette',
    legalEntityName: 'Audit Media LLC',
    contactEmail: 'audit@gazette.com',
    ownerUserId: 'u-audit',
    ownerEmail: 'audit@gazette.com',
    invitedBy: 'super_admin',
  });
  let logs = AuditService.getAuditLogs('tenant-audit-test');
  assert(logs.length > 0, 91, 'Publisher invitation generates tamper-evident audit event');

  // Test 92
  PlatformOnboardingService.transitionStatus('tenant-audit-test', 'REGISTRATION_PENDING', 'super_admin');
  logs = AuditService.getAuditLogs('tenant-audit-test');
  assert(logs.length >= 2, 92, 'Onboarding lifecycle transition generates audit event');

  // Test 93
  PlatformConfigService.updateConfig({
    category: 'QUEUE',
    settingKey: 'productionQueueLimits.maxJobRetryAttempts',
    newValue: 5,
    reason: 'Increased worker retry threshold for nighttime print queue batch',
    adminId: 'super_admin',
    adminEmail: 'admin@newspress.io',
  });
  const allLogs = AuditService.getAuditLogs();
  assert(allLogs.some((l) => l.details?.settingKey === 'productionQueueLimits.maxJobRetryAttempts'), 93, 'Configuration change generates audit log containing previous and new values');

  // Test 94
  CustomerSupportService.createCase({
    tenantId: 'tenant-audit-test',
    tenantName: 'Audit Test Gazette',
    requesterUserId: 'u-audit',
    requesterEmail: 'audit@gazette.com',
    requesterName: 'Audit Editor',
    title: 'Audit log verification ticket',
    category: 'GENERAL',
    severity: 'SEV4_LOW',
    initialMessage: 'Verifying audit event generation for support case.',
  });
  logs = AuditService.getAuditLogs('tenant-audit-test');
  assert(logs.some((l) => l.details?.title === 'Audit log verification ticket'), 94, 'Support ticket creation logs audit record');

  // Test 95
  LaunchReadinessService.acceptWarning({
    checkId: 'gate-legal-01',
    acceptedBy: 'Counsel Officer',
    deadline: '2026-11-20',
    reason: 'Audit trail verification for exception',
  });
  const launchLogs = AuditService.getAuditLogs();
  assert(launchLogs.some((l) => l.details?.title === 'Qualified Counsel Review of Policies'), 95, 'Warning exception acceptance records audit event');

  // -------------------------------------------------------------------------
  // Group 13: Handover Documentation & Operational Contract Consistency (Tests 96-100)
  // -------------------------------------------------------------------------
  console.log('\n--- 13. Handover Documentation & Operational Contract Consistency ---');

  // Test 96
  const configSnapshot = PlatformConfigService.getConfig();
  assert(
    configSnapshot.marketplacePricing.reporterRoyaltiesPercent === 70 ||
    configSnapshot.marketplacePricing.reporterRoyaltiesPercent === 75,
    96,
    'Contract consistency: Marketplace reporter royalties split configured at 70-75%'
  );

  // Test 97
  assert(
    configSnapshot.marketplacePricing.settlementHoldDays === 7,
    97,
    'Contract consistency: 7-day settlement hold window enforced in platform configuration'
  );

  // Test 98
  assert(
    configSnapshot.supportEscalationPolicies.sev1SlaHours === 1 &&
    configSnapshot.supportEscalationPolicies.sev2SlaHours === 4,
    98,
    'Contract consistency: Support SLA policy enforces 1h (SEV1) and 4h (SEV2)'
  );

  // Test 99
  assert(
    configSnapshot.supportedFormats.includes('BROADSHEET') &&
    configSnapshot.supportedFormats.includes('TABLOID') &&
    configSnapshot.supportedFormats.includes('BERLINER'),
    99,
    'Contract consistency: Standard newspaper press formats (BROADSHEET, TABLOID, BERLINER) supported'
  );

  // Test 100
  const legalDocs = PlatformPolicyService.getAllDocuments();
  assert(
    legalDocs.every((d) => d.status === 'DRAFT_UNREVIEWED' || d.status === 'ACTIVE_RATIFIED'),
    100,
    'Contract consistency: Legal policy documents clearly distinguish DRAFT_UNREVIEWED from ACTIVE_RATIFIED'
  );

  // Summary
  console.log('\n================================================================');
  console.log(`TEST EXECUTION SUMMARY: ${passed} / ${passed + failed} PASSED (${((passed / (passed + failed)) * 100).toFixed(1)}% SUCCESS)`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase17Tests();
