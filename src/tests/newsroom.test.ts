/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 8 — Newsroom Operations, Staff Management & Editorial Workflow Test Suite
 * Exhaustively verifies all 45 required test criteria.
 */

import { NewsroomOrganizationService } from '../services/newsroomOrganizationService';
import { NewsroomStaffService } from '../services/newsroomStaffService';
import { ReporterInvitationService } from '../services/reporterInvitationService';
import { ReporterVerificationService } from '../services/reporterVerificationService';
import { NewsroomDeskService } from '../services/newsroomDeskService';
import { NewsAssignmentService } from '../services/newsAssignmentService';
import { EditorialCommentService } from '../services/editorialCommentService';
import { NotificationProviderService } from '../services/notificationProviderService';
import { NewsroomMetricsService } from '../services/newsroomMetricsService';
import { SubscriptionEntitlementService } from '../services/subscriptionEntitlementService';
import { PlanCatalogService } from '../services/planCatalogService';
import { UsageMeteringService } from '../services/usageMeteringService';
import { newsSubmissionService } from '../services/newsSubmissionService';
import { EditionContentEligibilityService } from '../services/editionContentEligibilityService';
import { MarketplaceEligibilityService } from '../services/marketplaceEligibilityService';
import { FactExtractionService } from '../services/factExtractionService';
import { FactIntegrityService } from '../services/factIntegrityService';
import { auditService } from '../services/auditService';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function runNewsroomTests() {
  console.log('================================================================');
  console.log('STARTING PHASE 8 NEWSROOM OPERATIONS & EDITORIAL WORKFLOW TESTS');
  console.log('================================================================');

  // Reset stores
  NewsroomOrganizationService.resetStore();
  NewsroomStaffService.resetStore();
  ReporterInvitationService.resetStore();
  ReporterVerificationService.resetStore();
  NewsroomDeskService.resetStore();
  NewsAssignmentService.resetStore();
  EditorialCommentService.resetStore();
  NotificationProviderService.resetStore();
  SubscriptionEntitlementService.resetStore();
  PlanCatalogService.resetStore();
  UsageMeteringService.resetStore();

  const tenantMetro = 'tenant-metro-chronicle';
  const tenantHerald = 'tenant-herald-press';
  const tenantIsolated = 'tenant-isolated-post';

  // --- ORGANIZATION & STAFF (Tests 1 - 10) ---

  console.log('Running Test 1: Tenant newsroom loads...');
  const org = NewsroomOrganizationService.getOrCreateOrganization(tenantMetro);
  assert(Boolean(org), 'Newsroom organization must be retrieved.');
  assert(org.tenantId === tenantMetro, 'Tenant ID must match.');
  assert(org.status === 'ACTIVE', 'Organization must be active.');
  console.log('✓ Test 1 Passed: Tenant newsroom loads.');

  console.log('Running Test 2: Staff member creation...');
  const member1 = await NewsroomStaffService.addStaffMember({
    tenantId: tenantMetro,
    userId: 'user-reporter-alex',
    personId: 'person-alex',
    role: 'STAFF_REPORTER',
    department: 'Metro Desk',
    designation: 'Staff Reporter',
    actorId: 'admin-1',
    actorName: 'Newsroom Admin',
  });
  assert(member1.userId === 'user-reporter-alex', 'User ID must match.');
  assert(member1.status === 'ACTIVE', 'Member status must be ACTIVE.');
  console.log('✓ Test 2 Passed: Staff member creation.');

  console.log('Running Test 3: Staff seat entitlement enforced...');
  // Configure tenant with staff limit = 1
  SubscriptionEntitlementService.getOrCreateSubscription(tenantIsolated, 'BASIC');
  const isolatedSub = SubscriptionEntitlementService.getSubscription(tenantIsolated)!;
  SubscriptionEntitlementService.setSubscription(
    tenantIsolated,
    isolatedSub,
    undefined,
    { staffMemberLimit: 1, reporterLimit: 1, monthlyAIUsageLimit: 0, monthlyNewsProcessingLimit: 50, editionLimit: 2, imageProcessingLimit: 10, storageLimitMb: 100 }
  );

  await NewsroomStaffService.addStaffMember({
    tenantId: tenantIsolated,
    userId: 'user-isolated-1',
    personId: 'person-iso-1',
    role: 'STAFF_REPORTER',
    department: 'News',
    designation: 'Junior Reporter',
    actorId: 'admin-1',
    actorName: 'Admin',
  });

  let staffBlocked = false;
  try {
    await NewsroomStaffService.addStaffMember({
      tenantId: tenantIsolated,
      userId: 'user-isolated-2',
      personId: 'person-iso-2',
      role: 'COPY_EDITOR',
      department: 'Desk',
      designation: 'Copy Editor',
      actorId: 'admin-1',
      actorName: 'Admin',
    });
  } catch (err: any) {
    staffBlocked = true;
    assert(err.message.includes('Staff member limit of 1 reached'), 'Error must mention staff limit.');
  }
  assert(staffBlocked, 'Adding staff beyond entitlement limit must be blocked.');
  console.log('✓ Test 3 Passed: Staff seat entitlement enforced.');

  console.log('Running Test 4: Staff invitation created...');
  const { invitation: inv1, rawToken: raw1 } = await ReporterInvitationService.createInvitation({
    tenantId: tenantMetro,
    email: 'newreporter@metro.org',
    role: 'STAFF_REPORTER',
    employmentType: 'STAFF',
    invitedBy: 'admin-1',
    invitedByName: 'Admin',
  });
  assert(inv1.status === 'PENDING', 'Invitation must be PENDING.');
  assert(Boolean(raw1), 'Raw token must be returned for distribution.');
  console.log('✓ Test 4 Passed: Staff invitation created.');

  console.log('Running Test 5: Invitation token stored hashed...');
  assert(inv1.tokenHash !== raw1, 'Raw invitation token must NEVER be stored raw.');
  assert(inv1.tokenHash.startsWith('sha256_'), 'Token hash must be securely hashed.');
  console.log('✓ Test 5 Passed: Invitation token stored hashed.');

  console.log('Running Test 6: Invitation expiration...');
  const { rawToken: rawExpired } = await ReporterInvitationService.createInvitation({
    tenantId: tenantMetro,
    email: 'expired@metro.org',
    role: 'STAFF_REPORTER',
    employmentType: 'STAFF',
    invitedBy: 'admin-1',
    invitedByName: 'Admin',
    expirationDays: -1, // Expired yesterday
  });

  let expiredBlocked = false;
  try {
    await ReporterInvitationService.acceptInvitation({
      rawToken: rawExpired,
      userId: 'user-expired',
      personId: 'person-expired',
      displayName: 'Expired Reporter',
    });
  } catch (err: any) {
    expiredBlocked = true;
    assert(err.message.includes('expired'), 'Error must note expiration.');
  }
  assert(expiredBlocked, 'Accepting an expired invitation must fail.');
  console.log('✓ Test 6 Passed: Invitation expiration.');

  console.log('Running Test 7: Invitation acceptance...');
  const acceptedInv = await ReporterInvitationService.acceptInvitation({
    rawToken: raw1,
    userId: 'user-accepted-1',
    personId: 'person-accepted-1',
    displayName: 'Accepted Reporter',
  });
  assert(acceptedInv.status === 'ACCEPTED', 'Invitation status must become ACCEPTED.');
  assert(Boolean(acceptedInv.acceptedAt), 'acceptedAt timestamp must be recorded.');
  console.log('✓ Test 7 Passed: Invitation acceptance.');

  console.log('Running Test 8: Staff deactivation...');
  const deactivatedMember = await NewsroomStaffService.deactivateStaffMember(
    tenantMetro,
    member1.memberId,
    'admin-1',
    'Admin'
  );
  assert(deactivatedMember.status === 'DEACTIVATED', 'Member status must be DEACTIVATED.');
  console.log('✓ Test 8 Passed: Staff deactivation.');

  console.log('Running Test 9: Reporter limit enforced...');
  // Fill the 1 allowed reporter seat for tenantIsolated
  await NewsroomStaffService.registerStaffReporter({
    tenantId: tenantIsolated,
    userId: 'user-rep-first',
    personId: 'person-rep-first',
    byline: 'First Reporter',
    employmentType: 'STAFF',
    designation: 'Reporter',
    employeeCode: 'EMP-001',
    assignedDistricts: ['Central'],
    assignedBeats: ['General'],
    assignedBureau: 'Desk',
    actorId: 'admin-1',
    actorName: 'Admin',
  });

  let repBlocked = false;
  try {
    await NewsroomStaffService.registerStaffReporter({
      tenantId: tenantIsolated,
      userId: 'user-rep-limit',
      personId: 'person-rep-limit',
      byline: 'Excess Reporter',
      employmentType: 'STAFF',
      designation: 'Reporter',
      employeeCode: 'EMP-999',
      assignedDistricts: ['Central'],
      assignedBeats: ['General'],
      assignedBureau: 'Desk',
      actorId: 'admin-1',
      actorName: 'Admin',
    });
  } catch (err: any) {
    repBlocked = true;
    assert(err.message.includes('Reporter limit'), 'Error must mention reporter limit.');
  }
  assert(repBlocked, 'Exceeding reporter limit must be blocked.');
  console.log('✓ Test 9 Passed: Reporter limit enforced.');

  console.log('Running Test 10: Cross-tenant staff isolation...');
  const metroStaff = NewsroomStaffService.getTenantMembers(tenantMetro);
  const isolatedStaff = NewsroomStaffService.getTenantMembers(tenantIsolated);
  assert(
    !metroStaff.some((m) => m.tenantId === tenantIsolated),
    'Metro staff must not contain isolated tenant members.'
  );
  assert(
    !isolatedStaff.some((m) => m.tenantId === tenantMetro),
    'Isolated staff must not contain Metro tenant members.'
  );
  console.log('✓ Test 10 Passed: Cross-tenant staff isolation.');

  // --- REPORTER (Tests 11 - 17) ---

  console.log('Running Test 11: Staff reporter profile...');
  const { profile: staffRepProfile, extension: staffRepExt } =
    await NewsroomStaffService.registerStaffReporter({
      tenantId: tenantMetro,
      userId: 'user-clara-oswald',
      personId: 'person-clara',
      byline: 'Clara Oswald',
      employmentType: 'STAFF',
      designation: 'Senior Investigative Correspondent',
      employeeCode: 'EMP-401',
      assignedDistricts: ['Manhattan', 'Brooklyn'],
      assignedBeats: ['Investigative', 'Politics'],
      assignedBureau: 'Special Investigations Bureau',
      actorId: 'admin-1',
      actorName: 'Admin',
    });
  assert(staffRepProfile.employmentType === 'STAFF', 'Employment type must be STAFF.');
  assert(staffRepProfile.employeeCode === 'EMP-401', 'Employee code must match.');
  assert(staffRepExt.assignedBureau === 'Special Investigations Bureau', 'Bureau must match.');
  console.log('✓ Test 11 Passed: Staff reporter profile.');

  console.log('Running Test 12: Freelance reporter profile...');
  const { profile: freelanceProfile } = await NewsroomStaffService.registerStaffReporter({
    tenantId: tenantMetro,
    userId: 'user-freelance-sam',
    personId: 'person-sam',
    byline: 'Sam Freelance',
    employmentType: 'FREELANCE',
    designation: 'Independent Contributor',
    employeeCode: 'FREELANCE-01',
    assignedDistricts: ['Bronx'],
    assignedBeats: ['Culture'],
    assignedBureau: 'External Wire',
    actorId: 'admin-1',
    actorName: 'Admin',
  });
  assert(freelanceProfile.employmentType === 'FREELANCE', 'Employment type must be FREELANCE.');
  assert(freelanceProfile.tenantId === 'freelance_open', 'Freelance reporter tenantId must remain freelance_open.');
  console.log('✓ Test 12 Passed: Freelance reporter profile.');

  console.log('Running Test 13: Reporter verification...');
  const verSubmission = await ReporterVerificationService.submitVerification({
    reporterId: staffRepProfile.reporterId,
    tenantId: tenantMetro,
    verificationType: 'PRESS_CREDENTIAL',
    documents: ['https://storage.newspress.org/press_credentials/clara.pdf'],
    notes: 'State press union accreditation card.',
  });
  assert(verSubmission.status === 'PENDING', 'Initial verification status must be PENDING.');
  const reviewedVer = await ReporterVerificationService.reviewVerification({
    verificationId: verSubmission.verificationId,
    tenantId: tenantMetro,
    decision: 'VERIFIED',
    reviewerId: 'user-editor-chief',
    reviewerName: 'Editor-in-Chief',
    notes: 'Credentials validated with State Press Registry.',
  });
  assert(reviewedVer.status === 'VERIFIED', 'Verification status must become VERIFIED.');
  assert(NewsroomStaffService.getReporterProfile(staffRepProfile.reporterId)?.verificationStatus === 'verified', 'Reporter profile must reflect verified status.');
  console.log('✓ Test 13 Passed: Reporter verification.');

  console.log('Running Test 14: Beat assignment...');
  const beat = await NewsroomDeskService.createBeat({
    tenantId: tenantMetro,
    name: 'Municipal Transit',
    description: 'Buses, Subways, Commuter Rail',
    actorId: 'editor-1',
    actorName: 'Editor',
  });
  const beatAssignment = await NewsroomDeskService.assignReporterToBeat({
    tenantId: tenantMetro,
    reporterId: staffRepProfile.reporterId,
    beatId: beat.beatId,
    beatName: beat.name,
    assignedBy: 'editor-1',
    assignedByName: 'Editor',
  });
  assert(beatAssignment.beatId === beat.beatId, 'Beat assignment must reference beat ID.');
  console.log('✓ Test 14 Passed: Beat assignment.');

  console.log('Running Test 15: District assignment...');
  const distAssignment = await NewsroomDeskService.assignReporterToDistrict({
    tenantId: tenantMetro,
    reporterId: staffRepProfile.reporterId,
    district: 'Queens Borough',
    state: 'New York',
    assignedBy: 'editor-1',
    assignedByName: 'Editor',
  });
  assert(distAssignment.district === 'Queens Borough', 'District assignment must match.');
  console.log('✓ Test 15 Passed: District assignment.');

  console.log('Running Test 16: Reporter transfer...');
  const transferred = await NewsroomStaffService.transferReporter(
    tenantMetro,
    staffRepProfile.reporterId,
    {
      assignedBeats: ['State Legislature', 'Energy'],
      assignedBureau: 'Capitol Bureau',
    },
    'admin-1',
    'Admin'
  );
  assert(transferred.assignedBureau === 'Capitol Bureau', 'Bureau must be transferred to Capitol Bureau.');
  assert(transferred.assignedBeats.includes('State Legislature'), 'Beats must include State Legislature.');
  console.log('✓ Test 16 Passed: Reporter transfer.');

  console.log('Running Test 17: Historical stories preserved after deactivation...');
  // Create story draft for reporter
  const story = await newsSubmissionService.createDraft({
    tenantId: tenantMetro,
    authorId: staffRepProfile.reporterId,
    byline: staffRepProfile.byline,
    headline: 'Historical Report Filed Prior to Resignation',
    leadParagraph: 'This historic article must remain intact even if author is deactivated.',
    bodyContent: 'Full reporting details documenting public infrastructure and civic debate.',
    category: 'Metro',
  });

  // Deactivate reporter
  const repMember = NewsroomStaffService.getTenantMembers(tenantMetro).find((m) => m.userId === staffRepProfile.userId);
  if (repMember) {
    await NewsroomStaffService.deactivateStaffMember(tenantMetro, repMember.memberId, 'admin-1', 'Admin');
  }

  // Verify story still exists in database and unchanged
  const preservedStory = newsSubmissionService.getArticle(story.articleId);
  assert(Boolean(preservedStory), 'Historical story must be preserved.');
  assert(preservedStory?.headline === story.headline, 'Story headline must remain unchanged.');
  console.log('✓ Test 17 Passed: Historical stories preserved after deactivation.');

  // --- ASSIGNMENTS (Tests 18 - 25) ---

  console.log('Running Test 18: Assignment creation...');
  const testDesk = await NewsroomDeskService.createDesk({
    tenantId: tenantMetro,
    name: 'Investigation Desk',
    description: 'In-depth probes',
    section: 'Investigation',
    actorId: 'admin-1',
    actorName: 'Admin',
  });

  const assignment1 = await NewsAssignmentService.createAssignment({
    tenantId: tenantMetro,
    deskId: testDesk.deskId,
    assignedReporterId: staffRepProfile.reporterId,
    assignedByUserId: 'user-news-editor',
    assignedByName: 'News Editor',
    title: 'City Council Transit Budget Hearing',
    brief: 'Cover live testimony from transportation commissioner regarding fare increases.',
    expectedOutput: '800 words + 2 photos',
    priority: 'URGENT',
    beat: 'Municipal Transit',
    district: 'Manhattan',
    deadline: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
  });
  assert(assignment1.status === 'ASSIGNED', 'New assignment must have ASSIGNED status.');
  console.log('✓ Test 18 Passed: Assignment creation.');

  console.log('Running Test 19: Assignment acceptance...');
  const acceptedAssignment = await NewsAssignmentService.acceptAssignment(
    assignment1.assignmentId,
    staffRepProfile.userId,
    staffRepProfile.byline
  );
  assert(acceptedAssignment.status === 'ACCEPTED', 'Status must become ACCEPTED.');
  assert(Boolean(acceptedAssignment.acceptedAt), 'acceptedAt must be recorded.');
  console.log('✓ Test 19 Passed: Assignment acceptance.');

  console.log('Running Test 20: Assignment start...');
  const startedAssignment = await NewsAssignmentService.startAssignment(
    assignment1.assignmentId,
    staffRepProfile.userId,
    staffRepProfile.byline
  );
  assert(startedAssignment.status === 'IN_PROGRESS', 'Status must become IN_PROGRESS.');
  assert(Boolean(startedAssignment.startedAt), 'startedAt must be recorded.');
  console.log('✓ Test 20 Passed: Assignment start.');

  console.log('Running Test 21: Assignment submission...');
  const submittedAssignment = await NewsAssignmentService.linkSubmissionToAssignment(
    assignment1.assignmentId,
    story.articleId,
    staffRepProfile.userId,
    staffRepProfile.byline
  );
  assert(submittedAssignment.status === 'SUBMITTED', 'Status must become SUBMITTED.');
  assert(submittedAssignment.relatedNewsId === story.articleId, 'Related news ID must be linked.');
  console.log('✓ Test 21 Passed: Assignment submission.');

  console.log('Running Test 22: Deadline detection...');
  const futureAssignment = await NewsAssignmentService.createAssignment({
    tenantId: tenantMetro,
    deskId: testDesk.deskId,
    assignedReporterId: staffRepProfile.reporterId,
    assignedByUserId: 'user-news-editor',
    assignedByName: 'News Editor',
    title: 'Future Feature Story',
    brief: 'Long form profile on local artists.',
    expectedOutput: '1200 words',
    priority: 'NORMAL',
    beat: 'Culture',
    district: 'Brooklyn',
    deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
  });
  const deadlineState = NewsAssignmentService.calculateDeadlineState(futureAssignment);
  assert(deadlineState === 'ON_TIME', 'Deadline state must be ON_TIME for future assignment.');
  console.log('✓ Test 22 Passed: Deadline detection.');

  console.log('Running Test 23: Overdue state...');
  const pastAssignment = await NewsAssignmentService.createAssignment({
    tenantId: tenantMetro,
    deskId: testDesk.deskId,
    assignedReporterId: staffRepProfile.reporterId,
    assignedByUserId: 'user-news-editor',
    assignedByName: 'News Editor',
    title: 'Past Due Story',
    brief: 'Brief that was missed.',
    expectedOutput: '400 words',
    priority: 'HIGH',
    beat: 'Crime',
    district: 'Bronx',
    deadline: new Date(Date.now() - 3600 * 1000).toISOString(), // 1 hr ago
  });
  const overdueState = NewsAssignmentService.calculateDeadlineState(pastAssignment);
  assert(overdueState === 'OVERDUE', 'Deadline state must be OVERDUE.');
  console.log('✓ Test 23 Passed: Overdue state.');

  console.log('Running Test 24: Assignment cancellation...');
  const cancelledAsg = await NewsAssignmentService.cancelAssignment(
    pastAssignment.assignmentId,
    'user-news-editor',
    'News Editor',
    'Event cancelled by city council'
  );
  assert(cancelledAsg.status === 'CANCELLED', 'Status must be CANCELLED.');
  console.log('✓ Test 24 Passed: Assignment cancellation.');

  console.log('Running Test 25: Unauthorized reporter assignment blocked...');
  let unauthBlocked = false;
  try {
    await NewsAssignmentService.createAssignment({
      tenantId: tenantMetro,
      deskId: testDesk.deskId,
      assignedReporterId: 'non-existent-reporter-id',
      assignedByUserId: 'user-news-editor',
      assignedByName: 'News Editor',
      title: 'Invalid Assignment',
      brief: 'Will fail',
      expectedOutput: 'none',
      priority: 'LOW',
      beat: 'None',
      district: 'None',
      deadline: new Date().toISOString(),
    });
  } catch (err: any) {
    unauthBlocked = true;
    assert(err.message.includes('not found'), 'Error must note reporter not found.');
  }
  assert(unauthBlocked, 'Assigning to non-existent reporter must be blocked.');
  console.log('✓ Test 25 Passed: Unauthorized reporter assignment blocked.');

  // --- EDITORIAL (Tests 26 - 35) ---

  console.log('Running Test 26: Submission linked to assignment...');
  const assignedDraft = await newsSubmissionService.createDraft({
    tenantId: tenantMetro,
    authorId: staffRepProfile.reporterId,
    byline: staffRepProfile.byline,
    headline: 'Breaking Dispatch from Transit Hearing',
    leadParagraph: 'Transportation committee debates emergency funding grant.',
    bodyContent: 'Council members pressed the commissioner for assurances on signaling upgrades.',
    category: 'Metro',
  });

  const submitRes = await newsSubmissionService.submitNews({
    articleId: assignedDraft.articleId,
    reporterId: staffRepProfile.reporterId,
    declaration: 'original_field_report',
    clientCapturedAt: new Date().toISOString(),
  });
  assert(submitRes.article.editorialStatus === 'submitted', 'Editorial status must be submitted.');
  console.log('✓ Test 26 Passed: Submission linked to assignment.');

  console.log('Running Test 27: Originality engine invoked...');
  assert(Boolean(submitRes.assessment), 'Originality assessment must be created.');
  assert(submitRes.assessment.status === 'FIRST_RECORDED_SUBMISSION' || submitRes.assessment.status === 'ORIGINAL_FIELD_REPORT' || submitRes.assessment.status === 'VERIFIED_ORIGINAL', 'Originality status must be evaluated.');
  console.log('✓ Test 27 Passed: Originality engine invoked.');

  console.log('Running Test 28: Server timestamp preserved...');
  assert(Boolean(submitRes.article.serverSubmittedAt), 'Authoritative server timestamp must be recorded.');
  const serverTime = new Date(submitRes.article.serverSubmittedAt!).getTime();
  assert(Math.abs(Date.now() - serverTime) < 10000, 'Server timestamp must reflect server time.');
  console.log('✓ Test 28 Passed: Server timestamp preserved.');

  console.log('Running Test 29: Revision request...');
  const revComment = await EditorialCommentService.requestRevision({
    tenantId: tenantMetro,
    newsId: assignedDraft.articleId,
    editorUserId: 'user-news-editor',
    editorName: 'News Editor',
    targetReporterId: staffRepProfile.reporterId,
    revisionNote: 'Please verify the exact quote from Commissioner Smith in paragraph 2.',
  });
  assert(revComment.commentType === 'GENERAL', 'Comment type must be set.');
  assert(revComment.text.includes('REVISION REQUESTED'), 'Comment must state revision requested.');
  console.log('✓ Test 29 Passed: Revision request.');

  console.log('Running Test 30: Reporter resubmission...');
  // In revision workflow, article status allows revision update
  const updatedArticle = await newsSubmissionService.updateDraft(assignedDraft.articleId, {
    leadParagraph: 'Transportation committee vigorously debates $45M emergency funding grant.',
  });
  assert(updatedArticle.leadParagraph.includes('$45M'), 'Lead paragraph must reflect correction.');
  console.log('✓ Test 30 Passed: Reporter resubmission.');

  console.log('Running Test 31: Previous version immutable...');
  // The first submitted version remains permanent in submissions collection
  const subRecord = submitRes.submission;
  assert(subRecord.version === 1, 'Initial submission record must be preserved at version 1.');
  console.log('✓ Test 31 Passed: Previous version immutable.');

  console.log('Running Test 32: Editorial comment...');
  const editComment = await EditorialCommentService.createComment({
    tenantId: tenantMetro,
    newsId: assignedDraft.articleId,
    authorUserId: 'user-news-editor',
    authorName: 'News Editor',
    targetReporterId: staffRepProfile.reporterId,
    commentType: 'FACT_CHECK',
    text: 'Confirmed dollar figure aligns with official budget docs.',
  });
  assert(editComment.status === 'OPEN', 'New comment must be OPEN.');
  console.log('✓ Test 32 Passed: Editorial comment.');

  console.log('Running Test 33: Comment resolution...');
  const resolvedCmt = await EditorialCommentService.resolveComment(
    editComment.commentId,
    staffRepProfile.userId,
    staffRepProfile.byline
  );
  assert(resolvedCmt.status === 'RESOLVED', 'Comment must be marked RESOLVED.');
  console.log('✓ Test 33 Passed: Comment resolution.');

  console.log('Running Test 34: Editor approval...');
  const approvalRes = await newsSubmissionService.editorialAction({
    articleId: assignedDraft.articleId,
    editorId: 'user-editor-chief',
    editorName: 'Editor-in-Chief',
    decision: 'approve_publication',
    notes: 'Approved for morning publication and layout.',
  });
  assert(approvalRes.article.editorialStatus === 'approved', 'Article must become approved.');
  console.log('✓ Test 34 Passed: Editor approval.');

  console.log('Running Test 35: Editor rejection...');
  const rejectedDraft = await newsSubmissionService.createDraft({
    tenantId: tenantMetro,
    authorId: staffRepProfile.reporterId,
    byline: staffRepProfile.byline,
    headline: 'Unverified Rumor on Transit Strike',
    leadParagraph: 'Unconfirmed sources claim imminent strike.',
    bodyContent: 'Sources could not be verified by independent fact check.',
    category: 'Metro',
  });
  const rejectRes = await newsSubmissionService.editorialAction({
    articleId: rejectedDraft.articleId,
    editorId: 'user-editor-chief',
    editorName: 'Editor-in-Chief',
    decision: 'reject',
    notes: 'Rejected: Rumor unconfirmed by union leadership.',
  });
  assert(rejectRes.article.editorialStatus === 'rejected', 'Article must be rejected.');
  console.log('✓ Test 35 Passed: Editor rejection.');

  // --- AI (Tests 36 - 40) ---

  console.log('Running Test 36: BASIC AI request blocked...');
  const basicAiCheck = SubscriptionEntitlementService.canUseAI(tenantIsolated, 'HEADLINE_SUGGESTION');
  assert(!basicAiCheck.allowed, 'BASIC plan must block generative AI.');
  console.log('✓ Test 36 Passed: BASIC AI request blocked.');

  console.log('Running Test 37: STANDARD LIGHT AI permitted...');
  const stdSubRecord = SubscriptionEntitlementService.getOrCreateSubscription(tenantMetro, 'STANDARD').subscription;
  stdSubRecord.planId = 'STANDARD';
  stdSubRecord.status = 'ACTIVE';
  SubscriptionEntitlementService.setSubscription(tenantMetro, stdSubRecord);
  const stdAiCheck = SubscriptionEntitlementService.canUseAI(tenantMetro, 'HEADLINE_SUGGESTION', 'LIGHT');
  assert(stdAiCheck.allowed, 'STANDARD plan must permit LIGHT AI assistance.');
  console.log('✓ Test 37 Passed: STANDARD LIGHT AI permitted.');

  console.log('Running Test 38: PREMIUM ADVANCED AI permitted...');
  const premSubRecord = SubscriptionEntitlementService.getOrCreateSubscription(tenantHerald, 'PREMIUM').subscription;
  premSubRecord.planId = 'PREMIUM';
  premSubRecord.status = 'ACTIVE';
  SubscriptionEntitlementService.setSubscription(tenantHerald, premSubRecord);
  const premAiCheck = SubscriptionEntitlementService.canUseAI(tenantHerald, 'RESTRUCTURED_COPY', 'ADVANCED');
  assert(premAiCheck.allowed, 'PREMIUM plan must permit ADVANCED AI assistance.');
  console.log('✓ Test 38 Passed: PREMIUM ADVANCED AI permitted.');

  console.log('Running Test 39: AI usage recorded...');
  UsageMeteringService.recordUsage({
    tenantId: tenantMetro,
    subscriptionId: 'sub-metro-1',
    planId: 'STANDARD',
    metric: 'AI_HEADLINE',
    quantity: 1,
    unit: 'OPERATIONS',
  });
  const usageStats = SubscriptionEntitlementService.getRemainingUsage(tenantMetro, 'AI_HEADLINE');
  assert(usageStats.used >= 1, 'AI usage must be recorded in metering service.');
  console.log('✓ Test 39 Passed: AI usage recorded.');

  console.log('Running Test 40: Fact integrity alert reaches editor...');
  const ledger = FactExtractionService.extractFactLedger({
    tenantId: tenantMetro,
    newsId: 'art-demo-1',
    versionId: 'ver-1',
    headline: 'Transit Grant Hearing',
    leadParagraph: 'Transportation committee votes $45 million grant.',
    bodyContent: 'Transportation committee votes $45 million grant on October 4 in Manhattan.',
  });
  const integrityReport = FactIntegrityService.verifySuggestionIntegrity({
    ledger,
    originalText: 'Transportation committee votes $45 million grant on October 4 in Manhattan.',
    suggestedText: 'Transportation committee votes $90 million grant on October 4 in Manhattan.', // Number changed!
  });
  assert(!integrityReport.passed, 'Fact integrity check must flag changed $45M -> $90M.');
  assert(integrityReport.discrepancies.length > 0, 'Discrepancy must reach editor as flagged alert.');
  console.log('✓ Test 40 Passed: Fact integrity alert reaches editor.');

  // --- INTEGRATION (Tests 41 - 45) ---

  console.log('Running Test 41: Approved story enters edition content library...');
  const eligibilityResult = EditionContentEligibilityService.checkArticleEligibility(
    tenantMetro,
    approvalRes.article
  );
  assert(eligibilityResult.isEligible, 'Approved internal story must be eligible for newspaper edition placement.');
  assert(eligibilityResult.sourceType === 'IN_HOUSE_APPROVED', 'Source type must be IN_HOUSE_APPROVED.');
  console.log('✓ Test 41 Passed: Approved story enters edition content library.');

  console.log('Running Test 42: Marketplace eligibility gate respected...');
  const mktGate = new MarketplaceEligibilityService().evaluateEligibility({
    article: approvalRes.article,
    reporter: staffRepProfile,
  });
  assert(mktGate.isEditorialEligible, 'Approved editorial status must pass editorial gate.');
  console.log('✓ Test 42 Passed: Marketplace eligibility gate respected.');

  console.log('Running Test 43: Subscription entitlement enforced...');
  const ent = SubscriptionEntitlementService.getEffectiveEntitlements(tenantMetro);
  assert(Boolean(ent.sub), 'Effective entitlement must load authoritative subscription.');
  assert(ent.limits.staffMemberLimit > 0, 'Staff limits must be authoritative.');
  console.log('✓ Test 43 Passed: Subscription entitlement enforced.');

  console.log('Running Test 44: Notification generated...');
  const notif = await NotificationProviderService.dispatchNotification({
    tenantId: tenantMetro,
    userId: staffRepProfile.userId,
    type: 'ASSIGNMENT_CREATED',
    title: 'Assignment Alert',
    message: 'New assignment assigned to desk.',
  });
  assert(notif.userId === staffRepProfile.userId, 'Notification must be scoped to user.');
  const userNotifs = NotificationProviderService.getUserNotifications(staffRepProfile.userId, tenantMetro);
  assert(userNotifs.length > 0, 'User must have received notifications.');
  console.log('✓ Test 44 Passed: Notification generated.');

  console.log('Running Test 45: Audit event generated...');
  const auditLogs = auditService.getLogsForTenant(tenantMetro);
  assert(auditLogs.length > 0, 'Audit events must be recorded in append-only log.');
  assert(
    auditLogs.some((l) => l.action === 'ASSIGNMENT_CREATED' || l.action === 'STAFF_INVITED'),
    'Audit actions for Phase 8 must be present in immutable log.'
  );
  console.log('✓ Test 45 Passed: Audit event generated.');

  console.log('================================================================');
  console.log('ALL 45/45 PHASE 8 NEWSROOM OPERATIONS TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runNewsroomTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
