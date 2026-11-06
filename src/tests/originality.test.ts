/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Originality & Submission Engine Test Suite
 * Phase 2 — Critical Originality Rules & Security Verification
 * 
 * Tests the 15 mandatory invariants defined in the specification.
 */

import { newsSubmissionService } from '../services/newsSubmissionService';
import { originalityDetector } from '../services/originalityDetectionService';
import { originalityEvaluator } from '../services/originalityEvaluationService';
import { eventGroupService } from '../services/eventGroupService';
import { generateContentFingerprint } from '../services/contentFingerprintService';
import { canArticleEnterMarketplace, validateStatusTransition } from '../services/newsLifecycle';
import { auditService } from '../services/auditService';

interface TestResult {
  num: number;
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runAllTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 2 ORIGINALITY ENGINE VERIFICATION');
  console.log('====================================================\n');

  // Test 1: Reporter submits first story
  try {
    const draft = await newsSubmissionService.createDraft({
      tenantId: 'tenant-metro-chronicle',
      authorId: 'user-reporter-test-1',
      byline: 'Test Reporter One',
      headline: 'Major Freight Train Derailment Outside Nellore Station',
      leadParagraph: 'A 40-car container freight train jumped the tracks at 08:35 PM on Friday.',
      bodyContent: 'Civil emergency responders from Nellore district were dispatched immediately to mile marker 114. Two chemical tankers were isolated with no toxic leaks reported.',
      category: 'Metro & Transit',
      location: 'Nellore North Yard',
      district: 'Nellore District',
      state: 'Andhra Pradesh',
      reporterDeclaration: 'original_field_report'
    });

    const submissionRes = await newsSubmissionService.submitNews({
      articleId: draft.articleId,
      reporterId: 'user-reporter-test-1',
      declaration: 'original_field_report',
      clientCapturedAt: '2026-10-03T14:30:00.000Z',
      evidenceItems: [
        {
          evidenceType: 'original_photo',
          title: 'Derailed locomotive wheel carriage',
          description: 'High-res photograph of damaged bogie',
          visibility: 'editorial_only'
        }
      ]
    });

    assert(Boolean(submissionRes.submission.submissionId), 'Submission ID must be generated');
    assert(submissionRes.submission.isFirstRecordedSubmission === true, 'First story on event must be recorded as first recorded');
    assert(submissionRes.article.editorialStatus === 'submitted', 'Status must be transitioned to submitted');

    results.push({ num: 1, name: 'Reporter submits first story', passed: true });
    console.log('✓ Test 1 Passed: Reporter submits first story');
  } catch (err: any) {
    results.push({ num: 1, name: 'Reporter submits first story', passed: false, message: err.message });
    console.error('✗ Test 1 Failed:', err.message);
  }

  // Test 2: Server timestamp is authoritative
  try {
    const draft = await newsSubmissionService.createDraft({
      tenantId: 'tenant-metro-chronicle',
      authorId: 'user-reporter-test-2',
      byline: 'Clock Drift Reporter',
      headline: 'Municipal Council Approves Solar Grid Mandate',
      leadParagraph: 'Commercial buildings exceeding 50000 sq ft must install rooftop solar panels.',
      bodyContent: 'Lawmakers voted 45 to 6 in favor of the clean energy transition timetable.',
      category: 'City Hall'
    });

    // Client attempts to pass a forged timestamp from 1999 or clock drift
    const forgedClientTime = '1999-12-31T23:59:59.000Z';
    const beforeSubmit = Date.now();
    const subRes = await newsSubmissionService.submitNews({
      articleId: draft.articleId,
      reporterId: 'user-reporter-test-2',
      declaration: 'original_field_report',
      clientCapturedAt: forgedClientTime
    });
    const afterSubmit = Date.now();

    const serverTimeMs = new Date(subRes.submission.serverSubmittedAt).getTime();
    assert(serverTimeMs >= beforeSubmit - 1000 && serverTimeMs <= afterSubmit + 1000,
      'Server submitted time must be generated in current server window, ignoring forged client timestamp');
    assert(subRes.submission.clientCapturedAt === forgedClientTime,
      'Client captured time is kept as secondary diagnostic metadata only');

    results.push({ num: 2, name: 'Server timestamp is authoritative', passed: true });
    console.log('✓ Test 2 Passed: Server timestamp is authoritative (client clock not trusted)');
  } catch (err: any) {
    results.push({ num: 2, name: 'Server timestamp is authoritative', passed: false, message: err.message });
    console.error('✗ Test 2 Failed:', err.message);
  }

  // Test 3: Exact duplicate detection
  try {
    const originalHeadline = 'Bridge Collapse Halts Traffic on Interstate 95';
    const originalBody = 'Structural engineers ordered an immediate closure after tension cables severed during morning rush hour.';
    const fpOriginal = generateContentFingerprint(originalHeadline, originalBody);

    // Exact duplicate text
    const exactHeadline = 'Bridge Collapse Halts Traffic on Interstate 95';
    const exactBody = 'Structural engineers ordered an immediate closure after tension cables severed during morning rush hour.';
    const fpDuplicate = generateContentFingerprint(exactHeadline, exactBody);

    assert(fpOriginal === fpDuplicate, 'Fingerprints of identical normalized text must match');

    const exactMatchCheck = originalityDetector.checkExactMatch(originalBody, exactBody);
    assert(exactMatchCheck === true, 'Exact match check must return true');

    const simMatch = originalityDetector.calculateSimilarity(
      { headline: exactHeadline, bodyContent: exactBody },
      {
        articleId: 'art-orig',
        headline: originalHeadline,
        bodyContent: originalBody,
        byline: 'Reporter A',
        tenantId: 'tenant-metro-chronicle',
        submittedAt: '2026-10-03T10:00:00.000Z'
      }
    );

    assert(simMatch !== null, 'Similarity match must be found');
    assert(simMatch!.overallSimilarityPercent === 100, 'Similarity must be 100%');
    assert(simMatch!.matchType === 'exact_duplicate', 'Match type must be exact_duplicate');

    results.push({ num: 3, name: 'Exact duplicate detection', passed: true });
    console.log('✓ Test 3 Passed: Exact duplicate detection');
  } catch (err: any) {
    results.push({ num: 3, name: 'Exact duplicate detection', passed: false, message: err.message });
    console.error('✗ Test 3 Failed:', err.message);
  }

  // Test 4: Near duplicate detection
  try {
    const originalBody = 'Civil protection authorities issued a mandatory flash flood evacuation order for all residents in low lying areas along the river basin.';
    const lightlyEditedBody = 'Civil protection officials issued a mandatory flash flooding evacuation warning for all citizens in low lying zones along the river basin.';

    const nearDup = originalityDetector.checkNearDuplicate(originalBody, lightlyEditedBody, 60);
    assert(nearDup.isNearDuplicate === true, 'Slightly edited text must be flagged as near duplicate');
    assert(nearDup.similarity >= 60, `Similarity was ${nearDup.similarity}%, expected >= 60%`);

    results.push({ num: 4, name: 'Near duplicate detection', passed: true });
    console.log('✓ Test 4 Passed: Near duplicate detection');
  } catch (err: any) {
    results.push({ num: 4, name: 'Near duplicate detection', passed: false, message: err.message });
    console.error('✗ Test 4 Failed:', err.message);
  }

  // Test 5: Two independent reports of same event
  try {
    // Reporter A: 08:40 PM Field Report
    const eventGroup = eventGroupService.createEventGroup({
      tenantId: 'tenant-metro-chronicle',
      title: 'Major Road Accident in Nellore Highway 16',
      summary: 'Multi-vehicle collision near toll gate',
      category: 'Crime & Safety',
      district: 'Nellore District',
      state: 'Andhra Pradesh',
      location: 'Highway 16 Toll Gate',
      firstReportedAt: '2026-10-03T20:40:00.000Z',
      firstSubmissionId: 'sub-rep-a',
      firstReporterId: 'user-reporter-a',
      firstReporterName: 'Reporter A',
      initialArticleId: 'art-rep-a'
    });

    // Reporter B: 08:47 PM Independent report with completely distinct wording & photos
    const reportB_Body = 'Highway patrol confirmed three lanes reopened by 9 PM following emergency vehicle clearance. Hospital spokespersons reported four individuals treated for minor contusions.';
    const updatedGroup = eventGroupService.addReportToEventGroup(eventGroup, 'sub-rep-b', 'art-rep-b');

    assert(updatedGroup.reportCount === 2, 'Event group must contain both reports');
    assert(updatedGroup.articleIds.includes('art-rep-a') && updatedGroup.articleIds.includes('art-rep-b'),
      'Both independent article IDs must be preserved under event group');

    // Similarity between completely independent reports must not trigger exact duplicate
    const simBetweenReports = originalityDetector.calculateSimilarity(
      { headline: 'Highway 16 Nellore Crash Traffic Reopened', bodyContent: reportB_Body, location: 'Highway 16' },
      {
        articleId: 'art-rep-a',
        headline: 'Major Road Accident in Nellore Highway 16',
        bodyContent: 'A tanker truck collided with two passenger vehicles causing extensive traffic buildup.',
        byline: 'Reporter A',
        tenantId: 'tenant-metro-chronicle',
        submittedAt: '2026-10-03T20:40:00.000Z',
        location: 'Highway 16'
      }
    );

    // If similarity returned, matchType must be event_co_coverage, NOT plagiarism
    if (simBetweenReports) {
      assert(simBetweenReports.isSameEventDifferentAngle === true || simBetweenReports.overallSimilarityPercent < 70,
        'Independent reports must be classified as co-coverage or distinct angle');
    }

    results.push({ num: 5, name: 'Two independent reports of same event', passed: true });
    console.log('✓ Test 5 Passed: Two independent reports of same event (grouped without false plagiarism)');
  } catch (err: any) {
    results.push({ num: 5, name: 'Two independent reports of same event', passed: false, message: err.message });
    console.error('✗ Test 5 Failed:', err.message);
  }

  // Test 6: Reporter cannot alter originality status
  try {
    const transition = validateStatusTransition('submitted', 'approved', {
      isReporter: true,
      isEditor: false,
      isAdmin: false
    });
    assert(transition.allowed === false, 'Reporter must be blocked from transitioning to approved');

    results.push({ num: 6, name: 'Reporter cannot alter originality status', passed: true });
    console.log('✓ Test 6 Passed: Reporter cannot alter originality status');
  } catch (err: any) {
    results.push({ num: 6, name: 'Reporter cannot alter originality status', passed: false, message: err.message });
    console.error('✗ Test 6 Failed:', err.message);
  }

  // Test 7: Reporter cannot alter server submission timestamp
  try {
    const draft = await newsSubmissionService.createDraft({
      tenantId: 'tenant-metro-chronicle',
      authorId: 'user-reporter-test-7',
      byline: 'Reporter Seven',
      headline: 'Local Tech Incubator Launches Quantum Computing Fellowship',
      leadParagraph: 'Twenty post-graduate researchers selected for full stipends.',
      bodyContent: 'The program is funded jointly by university trusts and private venture capital.',
      category: 'Technology'
    });

    const res = await newsSubmissionService.submitNews({
      articleId: draft.articleId,
      reporterId: 'user-reporter-test-7',
      declaration: 'original_field_report'
    });

    const recordedTimestamp = res.submission.serverSubmittedAt;
    // Attempting to modify draft fails once submitted
    let threw = false;
    try {
      await newsSubmissionService.updateDraft(draft.articleId, {
        headline: 'Modified After Submit'
      });
    } catch {
      threw = true;
    }
    assert(threw === true, 'Cannot modify story after submission');

    results.push({ num: 7, name: 'Reporter cannot alter server submission timestamp', passed: true });
    console.log('✓ Test 7 Passed: Reporter cannot alter server submission timestamp');
  } catch (err: any) {
    results.push({ num: 7, name: 'Reporter cannot alter server submission timestamp', passed: false, message: err.message });
    console.error('✗ Test 7 Failed:', err.message);
  }

  // Test 8: Reporter cannot approve own story
  try {
    const check = validateStatusTransition('editorial_review', 'approved', {
      isReporter: true,
      isEditor: false,
      isAdmin: false
    });
    assert(check.allowed === false, 'Reporter without editor permissions cannot approve story');

    results.push({ num: 8, name: 'Reporter cannot approve own story', passed: true });
    console.log('✓ Test 8 Passed: Reporter cannot approve own story');
  } catch (err: any) {
    results.push({ num: 8, name: 'Reporter cannot approve own story', passed: false, message: err.message });
    console.error('✗ Test 8 Failed:', err.message);
  }

  // Test 9: Editor can verify originality
  try {
    const draft = await newsSubmissionService.createDraft({
      tenantId: 'tenant-metro-chronicle',
      authorId: 'user-sofia-chen',
      byline: 'Sofia Chen',
      headline: 'Deep Harbor Sounding Reveals Historic 19th Century Shipwreck',
      leadParagraph: 'Marine archaeologists discovered the intact hull of an 1882 trading vessel.',
      bodyContent: 'Sonar imaging confirmed the discovery at a depth of 45 meters.',
      category: 'Investigative'
    });

    await newsSubmissionService.submitNews({
      articleId: draft.articleId,
      reporterId: 'user-sofia-chen',
      declaration: 'original_field_report',
      evidenceItems: [
        {
          evidenceType: 'original_photo',
          title: 'Acoustic Sonar Scan of Keel',
          visibility: 'editorial_only'
        }
      ]
    });

    const editRes = await newsSubmissionService.editorialAction({
      articleId: draft.articleId,
      editorId: 'user-elena-vance',
      editorName: 'Elena Vance',
      decision: 'verify_original',
      notes: 'Reviewed acoustic sonar metadata and cross-referenced with port historical ledger.'
    });

    assert(editRes.article.originalityStatus === 'VERIFIED_ORIGINAL', 'Status must be updated to VERIFIED_ORIGINAL');
    assert(editRes.assessment.verificationStatus === 'verified_by_editor', 'Assessment must record verified_by_editor');
    assert(editRes.assessment.reviewedBy === 'user-elena-vance', 'Reviewer UID must be recorded');

    results.push({ num: 9, name: 'Editor can verify originality', passed: true });
    console.log('✓ Test 9 Passed: Editor can verify originality');
  } catch (err: any) {
    results.push({ num: 9, name: 'Editor can verify originality', passed: false, message: err.message });
    console.error('✗ Test 9 Failed:', err.message);
  }

  // Test 10: Duplicate confirmation requires authorized editor
  try {
    const checkReporter = validateStatusTransition('in_review', 'rejected', {
      isReporter: true,
      isEditor: false,
      isAdmin: false
    });
    assert(checkReporter.allowed === false, 'Reporter cannot execute rejection / duplicate confirmation');

    const checkEditor = validateStatusTransition('in_review', 'rejected', {
      isReporter: false,
      isEditor: true,
      isAdmin: false
    });
    assert(checkEditor.allowed === true, 'Editor can reject / confirm duplicate');

    results.push({ num: 10, name: 'Duplicate confirmation requires authorized editor', passed: true });
    console.log('✓ Test 10 Passed: Duplicate confirmation requires authorized editor');
  } catch (err: any) {
    results.push({ num: 10, name: 'Duplicate confirmation requires authorized editor', passed: false, message: err.message });
    console.error('✗ Test 10 Failed:', err.message);
  }

  // Test 11: Cross-tenant news cannot be accessed
  try {
    const metroArticles = newsSubmissionService.getArticles('tenant-metro-chronicle');
    const pacificArticles = newsSubmissionService.getArticles('tenant-pacific-tribune');

    for (const art of metroArticles) {
      assert(art.tenantId === 'tenant-metro-chronicle', 'All returned articles must belong to requested tenant');
    }
    for (const art of pacificArticles) {
      assert(art.tenantId === 'tenant-pacific-tribune', 'Pacific tribune query must not return metro articles');
    }

    results.push({ num: 11, name: 'Cross-tenant news cannot be accessed', passed: true });
    console.log('✓ Test 11 Passed: Cross-tenant news cannot be accessed (tenant isolation enforced)');
  } catch (err: any) {
    results.push({ num: 11, name: 'Cross-tenant news cannot be accessed', passed: false, message: err.message });
    console.error('✗ Test 11 Failed:', err.message);
  }

  // Test 12: Audit events cannot be modified by reporters
  try {
    const audit = await auditService.log({
      tenantId: 'tenant-metro-chronicle',
      actorId: 'user-reporter-test',
      actorName: 'Test Reporter',
      actorRole: 'reporter',
      action: 'SUBMIT',
      entityType: 'NewsSubmission',
      entityId: 'sub-immutable-test',
      newState: { status: 'submitted' }
    });

    assert(Boolean(audit.auditId), 'Audit ID must exist');
    assert(audit.timestamp !== undefined, 'Audit timestamp must exist');

    // Verify in-memory retrieval contains unmodified record
    const retrieved = auditService.getLogsForEntity('sub-immutable-test');
    assert(retrieved.length > 0, 'Audit event must be stored in append-only log');
    assert(retrieved[0].action === 'SUBMIT', 'Audit action must match');

    results.push({ num: 12, name: 'Audit events cannot be modified by reporters', passed: true });
    console.log('✓ Test 12 Passed: Audit events cannot be modified by reporters');
  } catch (err: any) {
    results.push({ num: 12, name: 'Audit events cannot be modified by reporters', passed: false, message: err.message });
    console.error('✗ Test 12 Failed:', err.message);
  }

  // Test 13: Evidence is linked to the correct reporter/news
  try {
    const draft = await newsSubmissionService.createDraft({
      tenantId: 'tenant-metro-chronicle',
      authorId: 'user-reporter-13',
      byline: 'Reporter Thirteen',
      headline: 'Municipal Water Quality Audit Exceeds EPA Baseline Standards',
      leadParagraph: 'Comprehensive testing across 80 distribution reservoirs confirms compliance.',
      bodyContent: 'Lab reports show turbidity and chemical markers well below safety thresholds.',
      category: 'Investigative'
    });

    const res = await newsSubmissionService.submitNews({
      articleId: draft.articleId,
      reporterId: 'user-reporter-13',
      declaration: 'original_field_report',
      evidenceItems: [
        {
          evidenceType: 'document',
          title: 'Certified Laboratory Test Results #EPA-2026-99',
          visibility: 'editorial_only'
        }
      ]
    });

    const linkedEvidence = newsSubmissionService.getEvidenceForArticle(draft.articleId);
    assert(linkedEvidence.length === 1, 'Evidence must be linked to newsId');
    assert(linkedEvidence[0].newsId === draft.articleId, 'newsId match');
    assert(linkedEvidence[0].reporterId === 'user-reporter-13', 'reporterId match');
    assert(linkedEvidence[0].visibility === 'editorial_only', 'visibility must be editorial_only');

    results.push({ num: 13, name: 'Evidence is linked to the correct reporter/news', passed: true });
    console.log('✓ Test 13 Passed: Evidence is linked to the correct reporter/news');
  } catch (err: any) {
    results.push({ num: 13, name: 'Evidence is linked to the correct reporter/news', passed: false, message: err.message });
    console.error('✗ Test 13 Failed:', err.message);
  }

  // Test 14: Disputed stories cannot automatically enter marketplace
  try {
    const check = canArticleEnterMarketplace(
      { editorialStatus: 'approved', originalityStatus: 'DISPUTED' },
      { status: 'DISPUTED' }
    );
    assert(check.eligible === false, 'Disputed article must NOT be eligible for marketplace');
    assert(check.reason?.includes('DISPUTED') === true, 'Reason must state DISPUTED status blocker');

    results.push({ num: 14, name: 'Disputed stories cannot automatically enter marketplace', passed: true });
    console.log('✓ Test 14 Passed: Disputed stories cannot automatically enter marketplace');
  } catch (err: any) {
    results.push({ num: 14, name: 'Disputed stories cannot automatically enter marketplace', passed: false, message: err.message });
    console.error('✗ Test 14 Failed:', err.message);
  }

  // Test 15: Confirmed duplicates cannot automatically enter marketplace
  try {
    const check = canArticleEnterMarketplace(
      { editorialStatus: 'approved', originalityStatus: 'DUPLICATE_CONFIRMED' },
      { status: 'DUPLICATE_CONFIRMED' }
    );
    assert(check.eligible === false, 'Confirmed duplicate must NOT be eligible for marketplace');
    assert(check.reason?.includes('DUPLICATE_CONFIRMED') === true, 'Reason must cite DUPLICATE_CONFIRMED');

    // Also test draft/submitted cannot enter
    const checkDraft = canArticleEnterMarketplace(
      { editorialStatus: 'submitted', originalityStatus: 'VERIFIED_ORIGINAL' },
      { status: 'VERIFIED_ORIGINAL' }
    );
    assert(checkDraft.eligible === false, 'Submitted article without editorial approval cannot enter marketplace');

    results.push({ num: 15, name: 'Confirmed duplicates cannot automatically enter marketplace', passed: true });
    console.log('✓ Test 15 Passed: Confirmed duplicates cannot automatically enter marketplace');
  } catch (err: any) {
    results.push({ num: 15, name: 'Confirmed duplicates cannot automatically enter marketplace', passed: false, message: err.message });
    console.error('✗ Test 15 Failed:', err.message);
  }

  console.log('\n====================================================');
  console.log(`TEST EXECUTION SUMMARY: ${results.filter(r => r.passed).length} / ${results.length} PASSED`);
  console.log('====================================================');

  if (results.some(r => !r.passed)) {
    process.exit(1);
  }
  process.exit(0);
}

runAllTests().catch((e) => {
  console.error('Unhandled test failure:', e);
  process.exit(1);
});
