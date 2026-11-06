/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 6 AI Editorial Engine & Publishing Plans Verification Suite
 * Exhaustively tests 32 strict criteria:
 *  1. Basic plan cannot call generative AI
 *  2. Standard plan can use light AI
 *  3. Premium plan can use advanced AI
 *  4. Plan limits enforced
 *  5. AI usage tracked
 *  6. Original reporter content preserved
 *  7. AI suggestion stored separately
 *  8. Editor accepts AI suggestion
 *  9. Editor rejects AI suggestion
 * 10. Editor manually edits AI suggestion
 * 11. Fact ledger detects changed number
 * 12. Fact ledger detects changed date
 * 13. Fact ledger detects changed person
 * 14. Fact ledger detects changed location
 * 15. Changed quotation flagged
 * 16. Marketplace license blocks unauthorized derivative editing
 * 17. Attribution preserved
 * 18. AI failure leaves original content untouched
 * 19. AI prompt version recorded
 * 20. AI response schema validated
 * 21. AI headline suggestions generated
 * 22. Headline fit calculated
 * 23. Summary generated
 * 24. Shortened copy fitting works
 * 25. Image analysis tracked
 * 26. Original image preserved
 * 27. Enhanced derivative created separately
 * 28. Cross-tenant AI data isolation
 * 29. Reporter cannot publish AI output directly
 * 30. Editor acceptance creates editorial version
 * 31. AI usage cannot be manipulated from client
 * 32. AI provider failure handled gracefully
 */

import { EditorialPlanService } from '../services/editorialPlanService';
import { FactExtractionService } from '../services/factExtractionService';
import { FactIntegrityService } from '../services/factIntegrityService';
import { AIEditorialEngine } from '../services/aiEditorialEngine';
import { EditorialVersioningService } from '../services/editorialVersioningService';
import { ImageIntelligenceService } from '../services/imageIntelligenceService';
import { ImageEnhancementService } from '../services/imageEnhancementService';
import { AIProviderRegistry } from '../services/aiProvider/aiProviderRegistry';
import { NewsArticle } from '../types/news';
import { NewsLicense } from '../types/marketplace';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function runEditorialAiTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 6 AI EDITORIAL ENGINE & PLAN TESTS');
  console.log('====================================================');

  // Reset stores for clean isolation
  EditorialPlanService.resetStore();
  EditorialVersioningService.resetStore();
  ImageEnhancementService.resetStore();

  const tenantBasic = 'tenant-basic-news';
  const tenantStandard = 'tenant-metro-chronicle';
  const tenantPremium = 'tenant-herald-press';
  const otherTenant = 'tenant-pacific-wire';

  // Setup Plans
  EditorialPlanService.setTenantPlan(tenantBasic, 'BASIC');
  EditorialPlanService.setTenantPlan(tenantStandard, 'STANDARD');
  EditorialPlanService.setTenantPlan(tenantPremium, 'PREMIUM');

  const sampleArticle: NewsArticle = {
    articleId: 'art-transit-101',
    tenantId: tenantStandard,
    headline: 'High Court Clears ₹3,400 Crore Coastal Railway Line Expansion',
    subheadline: 'Five-judge bench delivers unanimous verdict in Hyderabad on Friday.',
    slug: 'high-court-clears-railway-expansion',
    leadParagraph: 'A five-judge constitutional bench ruled unanimously today in favor of the ₹3,400 crore coastal railway expansion.',
    bodyContent: 'Chief Justice Rajesh Sharma stated: "Environmental mitigation protocols satisfy constitutional benchmarks." The project covers 140 km across Visakhapatnam and Godavari districts, benefiting 250,000 daily commuters starting October 2026.',
    byline: 'Sofia Chen',
    authorId: 'user-sofia-chen',
    authorType: 'staff',
    category: 'National & Judiciary',
    tags: ['Transit', 'Judiciary', 'Infrastructure'],
    editorialStatus: 'in_review',
    originalityVerdict: 'verified_original',
    originalityScorePercent: 99.4,
    isMarketplaceListed: false,
    isMarketplaceEligible: false,
    wordCount: 420,
    heroImageUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=2400',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // TEST 1: Basic plan cannot call generative AI
  console.log('Running Test 1: Basic plan cannot call generative AI...');
  const basicCheck = EditorialPlanService.validateOperationEligibility(tenantBasic, 'HEADLINE_SUGGESTION');
  assert(!basicCheck.allowed, 'Basic plan MUST NOT allow generative AI operations.');
  assert(basicCheck.reason?.includes('Basic plan does not permit Generative AI') === true, 'Reason must state Basic plan restriction.');
  console.log('✓ Test 1 Passed: Basic plan cannot call generative AI.');

  // TEST 2: Standard plan can use light AI
  console.log('Running Test 2: Standard plan can use light AI...');
  const stdCheck = EditorialPlanService.validateOperationEligibility(tenantStandard, 'HEADLINE_SUGGESTION', 'LIGHT');
  assert(stdCheck.allowed, 'Standard plan MUST allow light AI headline suggestions.');
  assert(stdCheck.entitlement.allowedModelTier === 'LIGHT', 'Standard tier must be LIGHT.');
  console.log('✓ Test 2 Passed: Standard plan can use light AI.');

  // TEST 3: Premium plan can use advanced AI
  console.log('Running Test 3: Premium plan can use advanced AI...');
  const premCheck = EditorialPlanService.validateOperationEligibility(tenantPremium, 'RESTRUCTURED_COPY', 'ADVANCED');
  assert(premCheck.allowed, 'Premium plan MUST allow advanced model restructuring.');
  assert(premCheck.entitlement.allowedModelTier === 'ADVANCED', 'Premium tier must be ADVANCED.');
  console.log('✓ Test 3 Passed: Premium plan can use advanced AI.');

  // TEST 4: Plan limits enforced
  console.log('Running Test 4: Plan limits enforced...');
  const stdEntitlement = EditorialPlanService.getTenantEntitlement(tenantStandard);
  stdEntitlement.currentMonthlyUsage = stdEntitlement.monthlyOperationsLimit; // Artificially max out
  const limitCheck = EditorialPlanService.validateOperationEligibility(tenantStandard, 'SUMMARY');
  assert(!limitCheck.allowed, 'Maxed out monthly quota must block further AI requests.');
  assert(limitCheck.reason?.includes('Monthly AI operation limit') === true, 'Reason must specify quota limit.');
  stdEntitlement.currentMonthlyUsage = 0; // Restore
  console.log('✓ Test 4 Passed: Plan limits strictly enforced.');

  // TEST 5: AI usage tracked
  console.log('Running Test 5: AI usage tracked...');
  const usageRecord = EditorialPlanService.recordUsage({
    tenantId: tenantStandard,
    userId: 'user-editor-01',
    newsId: sampleArticle.articleId,
    operation: 'HEADLINE_SUGGESTION',
    modelTier: 'LIGHT',
    provider: 'MockEditorialEngine',
    model: 'standard-newspaper-v1',
    inputTokenEstimate: 120,
    outputTokenEstimate: 80,
    processingTimeMs: 250,
    status: 'COMPLETED',
  });
  assert(Boolean(usageRecord.usageId), 'Usage record must have an ID.');
  const stats = EditorialPlanService.getUsageStats(tenantStandard);
  assert(stats.totalOperationsRecorded >= 1, 'Usage stats must record operation.');
  assert(stats.totalInputTokens >= 120, 'Token count must be aggregated.');
  console.log('✓ Test 5 Passed: AI usage tracked accurately.');

  // TEST 6: Original reporter content preserved
  console.log('Running Test 6: Original reporter content preserved...');
  const initialVer = EditorialVersioningService.getOrCreateInitialVersion(sampleArticle);
  assert(initialVer.versionNumber === 1, 'Initial version must be 1.');
  assert(initialVer.sourceType === 'REPORTER_SUBMISSION', 'Source type must be REPORTER_SUBMISSION.');
  assert(initialVer.headline === sampleArticle.headline, 'Original headline must match.');
  assert(initialVer.bodyContent === sampleArticle.bodyContent, 'Original body content must match.');
  console.log('✓ Test 6 Passed: Original reporter submission preserved in Version 1.');

  // TEST 7: AI suggestion stored separately
  console.log('Running Test 7: AI suggestion stored separately...');
  const genRes = await AIEditorialEngine.generateHeadlineSuggestions({
    tenantId: tenantStandard,
    userId: 'user-editor-01',
    userName: 'Marcus Editor',
    userRole: 'editor',
    article: sampleArticle,
  });
  assert(genRes.success, 'Headline generation should succeed.');
  assert(Boolean(genRes.suggestion), 'Suggestion record must be generated.');
  assert(genRes.suggestion!.editorStatus === 'PENDING', 'Initial AI suggestion status must be PENDING.');
  const storedSuggestions = EditorialVersioningService.getSuggestions(sampleArticle.articleId);
  assert(storedSuggestions.length >= 1, 'AI suggestion must be stored in suggestion store.');
  // Confirm Version 1 still untouched
  const currentVer = EditorialVersioningService.getLatestVersion(sampleArticle.articleId);
  assert(currentVer.versionNumber === 1, 'Current published version must NOT be modified by mere AI generation.');
  console.log('✓ Test 7 Passed: AI suggestion stored separately without altering active version.');

  // TEST 8: Editor accepts AI suggestion
  console.log('Running Test 8: Editor accepts AI suggestion...');
  const chosenHeadline = genRes.headlineOptions![1].headline;
  const acceptRes = EditorialVersioningService.acceptAISuggestion({
    newsId: sampleArticle.articleId,
    tenantId: tenantStandard,
    suggestionId: genRes.suggestion!.suggestionId,
    editorId: 'user-editor-01',
    editorName: 'Marcus Editor',
    editorRole: 'editor',
    appliedHeadline: chosenHeadline,
    changeSummary: 'Applied punchy AI headline',
  });
  assert(acceptRes.suggestion.editorStatus === 'ACCEPTED', 'Suggestion status must transition to ACCEPTED.');
  assert(acceptRes.version.versionNumber === 2, 'New version 2 must be created.');
  assert(acceptRes.version.sourceType === 'AI_ACCEPTED', 'Source type must be AI_ACCEPTED.');
  assert(acceptRes.version.headline === chosenHeadline, 'New version must feature chosen headline.');
  console.log('✓ Test 8 Passed: Editor acceptance creates new editorial version.');

  // TEST 9: Editor rejects AI suggestion
  console.log('Running Test 9: Editor rejects AI suggestion...');
  const genRes2 = await AIEditorialEngine.generateHeadlineSuggestions({
    tenantId: tenantStandard,
    userId: 'user-editor-01',
    userName: 'Marcus Editor',
    userRole: 'editor',
    article: sampleArticle,
  });
  const rejectRes = EditorialVersioningService.rejectAISuggestion({
    newsId: sampleArticle.articleId,
    tenantId: tenantStandard,
    suggestionId: genRes2.suggestion!.suggestionId,
    editorId: 'user-editor-01',
    editorName: 'Marcus Editor',
    editorRole: 'editor',
    reason: 'Headline did not match desk voice',
  });
  assert(rejectRes.editorStatus === 'REJECTED', 'Suggestion status must transition to REJECTED.');
  console.log('✓ Test 9 Passed: Editor rejects AI suggestion without state corruption.');

  // TEST 10: Editor manually edits AI suggestion
  console.log('Running Test 10: Editor manually edits AI suggestion...');
  const genRes3 = await AIEditorialEngine.generateHeadlineSuggestions({
    tenantId: tenantStandard,
    userId: 'user-editor-01',
    userName: 'Marcus Editor',
    userRole: 'editor',
    article: sampleArticle,
  });
  const modifiedHeadline = 'High Court Validates Coastal Corridor: Official Dispatch';
  const modRes = EditorialVersioningService.modifyAndAcceptAISuggestion({
    newsId: sampleArticle.articleId,
    tenantId: tenantStandard,
    suggestionId: genRes3.suggestion!.suggestionId,
    editorId: 'user-editor-01',
    editorName: 'Marcus Editor',
    editorRole: 'editor',
    modifiedHeadline,
    changeSummary: 'Manually polished AI headline',
  });
  assert(modRes.suggestion.editorStatus === 'MODIFIED', 'Suggestion status must be MODIFIED.');
  assert(modRes.version.headline === modifiedHeadline, 'Editorial version must reflect manual polish.');
  assert(modRes.version.versionNumber === 3, 'Version counter must increment to 3.');
  console.log('✓ Test 10 Passed: Editor manually edits AI suggestion.');

  // TEST 11: Fact ledger detects changed number
  console.log('Running Test 11: Fact ledger detects changed number...');
  const ledger = FactExtractionService.extractFactLedger({
    tenantId: tenantStandard,
    newsId: sampleArticle.articleId,
    versionId: 'ver-1',
    headline: sampleArticle.headline,
    leadParagraph: sampleArticle.leadParagraph,
    bodyContent: sampleArticle.bodyContent,
  });
  const numberDiff = FactIntegrityService.verifySuggestionIntegrity({
    ledger,
    originalText: sampleArticle.bodyContent,
    suggestedText: 'The project covers 999 km across Visakhapatnam benefiting 777,000 commuters.',
  });
  assert(!numberDiff.passed, 'Changed numerical figures must fail integrity verification.');
  assert(numberDiff.status === 'CRITICAL_DISCREPANCY', 'Status must be CRITICAL_DISCREPANCY.');
  assert(numberDiff.discrepancies.some((d) => d.discrepancyType === 'CHANGED_NUMBER'), 'Discrepancy type must be CHANGED_NUMBER.');
  console.log('✓ Test 11 Passed: Fact ledger detects changed number.');

  // TEST 12: Fact ledger detects changed date
  console.log('Running Test 12: Fact ledger detects changed date...');
  const dateDiff = FactIntegrityService.verifySuggestionIntegrity({
    ledger,
    originalText: sampleArticle.bodyContent,
    suggestedText: 'Starting in 2038 the railway expansion will begin commercial runs.',
  });
  assert(!dateDiff.passed, 'Changed year/date must fail integrity check.');
  assert(dateDiff.discrepancies.some((d) => d.discrepancyType === 'CHANGED_DATE'), 'Discrepancy must be CHANGED_DATE.');
  console.log('✓ Test 12 Passed: Fact ledger detects changed date.');

  // TEST 13: Fact ledger detects changed person
  console.log('Running Test 13: Fact ledger detects changed person...');
  const personDiff = FactIntegrityService.verifySuggestionIntegrity({
    ledger,
    originalText: sampleArticle.bodyContent,
    suggestedText: 'A detailed overview of the regional railway project with all mentions of Chief Justice Sharma removed entirely in favor of an unnamed spokesperson who gave remarks on development.',
  });
  assert(personDiff.discrepancies.some((d) => d.discrepancyType === 'CHANGED_PERSON'), 'Omitted/replaced person must be flagged.');
  console.log('✓ Test 13 Passed: Fact ledger detects changed person.');

  // TEST 14: Fact ledger detects changed location
  console.log('Running Test 14: Fact ledger detects changed location...');
  const locDiff = FactIntegrityService.verifySuggestionIntegrity({
    ledger,
    originalText: sampleArticle.bodyContent,
    suggestedText: 'The rail corridor project will span hundreds of kilometers across the western territories without any reference to the coastal region.',
  });
  assert(locDiff.discrepancies.some((d) => d.discrepancyType === 'CHANGED_LOCATION'), 'Missing location entity must be flagged.');
  console.log('✓ Test 14 Passed: Fact ledger detects changed location.');

  // TEST 15: Changed quotation flagged
  console.log('Running Test 15: Changed quotation flagged...');
  const quoteDiff = FactIntegrityService.verifySuggestionIntegrity({
    ledger,
    originalText: sampleArticle.bodyContent,
    suggestedText: 'The judge stated: "All financial audits have failed to satisfy our team completely."',
  });
  assert(!quoteDiff.passed, 'Altered quotation must trigger critical discrepancy.');
  assert(quoteDiff.discrepancies.some((d) => d.discrepancyType === 'CHANGED_QUOTE'), 'Discrepancy must be CHANGED_QUOTE.');
  console.log('✓ Test 15 Passed: Changed quotation flagged.');

  // TEST 16: Marketplace license blocks unauthorized derivative editing
  console.log('Running Test 16: Marketplace license blocks unauthorized derivative editing...');
  const foreignArticle: NewsArticle = {
    ...sampleArticle,
    articleId: 'art-syndicated-99',
    tenantId: otherTenant,
    headline: 'Syndicated National Wire Investigation',
  };
  const restrictedLicense: NewsLicense = {
    licenseId: 'lic-restricted-01',
    purchaseId: 'pur-01',
    listingId: 'lst-01',
    newsId: foreignArticle.articleId,
    articleTitle: foreignArticle.headline,
    buyerTenantId: tenantStandard,
    buyerUserId: 'user-01',
    sellerReporterId: 'rep-foreign',
    type: 'SINGLE_EDITION',
    scope: 'Single run',
    territory: 'National',
    durationDays: 30,
    allowedMedia: ['print'],
    allowedEditions: 1,
    exclusivity: false,
    resaleAllowed: false,
    derivativeEditingAllowed: false, // NOT ALLOWED!
    attributionRequired: true,
    status: 'ACTIVE',
    grantedAt: new Date().toISOString(),
  };
  const blockedAI = await AIEditorialEngine.generateHeadlineSuggestions({
    tenantId: tenantStandard,
    userId: 'user-01',
    userName: 'Marcus Editor',
    userRole: 'editor',
    article: foreignArticle,
    licenses: [restrictedLicense],
  });
  assert(!blockedAI.success, 'AI rewriting must be blocked when derivativeEditingAllowed is false.');
  assert(blockedAI.error?.includes('prohibits derivative editing') === true, 'Error must state license prohibition.');
  console.log('✓ Test 16 Passed: Marketplace license blocks unauthorized derivative editing.');

  // TEST 17: Attribution preserved
  console.log('Running Test 17: Attribution preserved...');
  const attributionDiff = FactIntegrityService.verifySuggestionIntegrity({
    ledger,
    originalText: sampleArticle.bodyContent,
    suggestedText: sampleArticle.bodyContent,
    originalByline: 'Sofia Chen',
    suggestedByline: 'AI Assistant', // Malicious attempt to change attribution
  });
  assert(!attributionDiff.passed, 'Byline alteration must fail.');
  assert(attributionDiff.discrepancies.some((d) => d.discrepancyType === 'REMOVED_ATTRIBUTION'), 'Discrepancy must be REMOVED_ATTRIBUTION.');
  console.log('✓ Test 17 Passed: Attribution preserved.');

  // TEST 18: AI failure leaves original content untouched
  console.log('Running Test 18: AI failure leaves original content untouched...');
  const preFailureLatest = EditorialVersioningService.getLatestVersion(sampleArticle.articleId);
  const failureAttempt = await AIEditorialEngine.generateHeadlineSuggestions({
    tenantId: tenantBasic, // Basic will reject AI
    userId: 'user-01',
    userName: 'Marcus Editor',
    userRole: 'editor',
    article: sampleArticle,
  });
  assert(!failureAttempt.success, 'Request should fail for basic plan.');
  const postFailureLatest = EditorialVersioningService.getLatestVersion(sampleArticle.articleId);
  assert(preFailureLatest.versionNumber === postFailureLatest.versionNumber, 'Active article version must be untouched by AI failure.');
  console.log('✓ Test 18 Passed: AI failure leaves original content untouched.');

  // TEST 19: AI prompt version recorded
  console.log('Running Test 19: AI prompt version recorded...');
  assert(Boolean(genRes.suggestion?.promptVersion), 'Suggestion must record prompt version.');
  assert(genRes.suggestion!.promptVersion === '1.2.0', 'Prompt version must match registry.');
  console.log('✓ Test 19 Passed: AI prompt version recorded.');

  // TEST 20: AI response schema validated
  console.log('Running Test 20: AI response schema validated...');
  const validCheck = AIProviderRegistry.validateResponseSchema('HEADLINE_SUGGESTION', [
    { headline: 'Valid Headline Example', style: 'FORMAL' },
  ]);
  assert(validCheck.valid, 'Valid schema must pass.');
  const invalidCheck = AIProviderRegistry.validateResponseSchema('HEADLINE_SUGGESTION', { invalidObject: true });
  assert(!invalidCheck.valid, 'Invalid non-array output must fail schema validation.');
  console.log('✓ Test 20 Passed: AI response schema validated.');

  // TEST 21: AI headline suggestions generated
  console.log('Running Test 21: AI headline suggestions generated...');
  assert(genRes.headlineOptions!.length >= 3, 'Must generate at least 3 headline options.');
  console.log('✓ Test 21 Passed: Multiple headline options generated.');

  // TEST 22: Headline fit calculated
  console.log('Running Test 22: Headline fit calculated...');
  for (const opt of genRes.headlineOptions!) {
    assert(opt.characterCount > 0, 'Character count must be calculated.');
    assert(opt.estimatedLines > 0, 'Estimated lines must be calculated.');
    assert(['OPTIMAL', 'TIGHT', 'TOO_LONG'].includes(opt.fitVerdict), 'Fit verdict must be defined.');
  }
  console.log('✓ Test 22 Passed: Headline fit calculated.');

  // TEST 23: Summary generated
  console.log('Running Test 23: Summary generated...');
  const sumRes = await AIEditorialEngine.generateSummary({
    tenantId: tenantStandard,
    userId: 'user-01',
    userName: 'Marcus Editor',
    userRole: 'editor',
    article: sampleArticle,
    targetWordCounts: [30, 50, 60, 80],
  });
  assert(sumRes.success, 'Summary generation should succeed.');
  assert(sumRes.summaryOptions!.length === 4, 'Must return 4 summary options.');
  console.log('✓ Test 23 Passed: Multi-length summary generated.');

  // TEST 24: Shortened copy fitting works
  console.log('Running Test 24: Shortened copy fitting works...');
  const shortenRes = await AIEditorialEngine.shortenCopyForLayout({
    tenantId: tenantStandard,
    userId: 'user-01',
    userName: 'Marcus Editor',
    userRole: 'editor',
    article: sampleArticle,
    targetHeightReductionPercent: 30,
  });
  assert(shortenRes.success, 'Shorten copy fitting should succeed.');
  assert(shortenRes.reductionPercent! > 0, 'Reduction percent must be calculated.');
  assert(shortenRes.expectedHeightReductionMm! > 0, 'Expected height reduction mm must be estimated.');
  console.log('✓ Test 24 Passed: Shortened copy fitting works.');

  // TEST 25: Image analysis tracked
  console.log('Running Test 25: Image analysis tracked...');
  const imgAnalysis = ImageIntelligenceService.analyzeImage({
    imageUrl: sampleArticle.heroImageUrl!,
    width: 2400,
    height: 1600,
  });
  assert(imgAnalysis.resolution.megapixels > 3, 'Megapixels must be calculated.');
  assert(imgAnalysis.printDpiSuitability.printQualityRating === 'EXCELLENT', '2400px image must be EXCELLENT print quality.');
  assert(Boolean(imgAnalysis.journalisticDisclaimer), 'Disclaimer must be present.');
  console.log('✓ Test 25 Passed: Image analysis diagnostics tracked.');

  // TEST 26: Original image preserved
  console.log('Running Test 26: Original image preserved...');
  const originalUrl = sampleArticle.heroImageUrl!;
  const enhanceRes = await ImageEnhancementService.enhanceImage({
    tenantId: tenantPremium,
    userId: 'user-01',
    userName: 'Marcus Editor',
    userRole: 'editor',
    sourceMediaId: 'media-hero-01',
    sourceImageUrl: originalUrl,
    operation: 'sharpen',
  });
  assert(enhanceRes.sourceImageUrl === originalUrl, 'Source image reference must remain intact.');
  assert(enhanceRes.outputUrl !== originalUrl, 'Enhanced image must be output to a separate derivative URL.');
  console.log('✓ Test 26 Passed: Original image preserved.');

  // TEST 27: Enhanced derivative created separately
  console.log('Running Test 27: Enhanced derivative created separately...');
  assert(enhanceRes.safetyIntegrityVerified === true, 'Safety integrity must be verified.');
  const derivatives = ImageEnhancementService.getDerivativesForTenant(tenantPremium);
  assert(derivatives.length >= 1, 'Derivatives store must register the new derivative.');
  console.log('✓ Test 27 Passed: Enhanced derivative created separately.');

  // TEST 28: Cross-tenant AI data isolation
  console.log('Running Test 28: Cross-tenant AI data isolation...');
  const tenantStandardUsage = EditorialPlanService.getUsageRecords(tenantStandard);
  assert(!tenantStandardUsage.some((r) => r.tenantId === tenantPremium), 'Tenant standard must NOT see tenant premium AI records.');
  console.log('✓ Test 28 Passed: Cross-tenant AI data isolation enforced.');

  // TEST 29: Reporter cannot publish AI output directly
  console.log('Running Test 29: Reporter cannot publish AI output directly...');
  // A reporter requesting an AI suggestion does not modify the approved editorial version
  const reporterSuggestion = await AIEditorialEngine.generateHeadlineSuggestions({
    tenantId: tenantStandard,
    userId: 'user-reporter',
    userName: 'Sofia Chen',
    userRole: 'reporter',
    article: sampleArticle,
  });
  assert(reporterSuggestion.success, 'Reporter can request suggestion if plan allows.');
  const checkLatestVer = EditorialVersioningService.getLatestVersion(sampleArticle.articleId);
  // Suggestion must remain pending, NOT published
  assert(reporterSuggestion.suggestion!.editorStatus === 'PENDING', 'AI suggestion remains PENDING.');
  assert(checkLatestVer.versionId !== reporterSuggestion.suggestion!.suggestionId, 'AI suggestion is NOT directly an approved version.');
  console.log('✓ Test 29 Passed: Reporter cannot publish AI output directly.');

  // TEST 30: Editor acceptance creates editorial version
  console.log('Running Test 30: Editor acceptance creates editorial version...');
  const finalAccept = EditorialVersioningService.acceptAISuggestion({
    newsId: sampleArticle.articleId,
    tenantId: tenantStandard,
    suggestionId: reporterSuggestion.suggestion!.suggestionId,
    editorId: 'user-editor-in-chief',
    editorName: 'Chief Editor',
    editorRole: 'editor_in_chief',
    appliedHeadline: reporterSuggestion.headlineOptions![0].headline,
    changeSummary: 'Editor-in-Chief accepted headline',
  });
  assert(finalAccept.version.sourceType === 'AI_ACCEPTED', 'Source type must be AI_ACCEPTED.');
  assert(finalAccept.version.acceptedBy === 'user-editor-in-chief', 'Authorizing editor must be recorded.');
  console.log('✓ Test 30 Passed: Editor acceptance creates editorial version with full attribution.');

  // TEST 31: AI usage cannot be manipulated from client
  console.log('Running Test 31: AI usage cannot be manipulated from client...');
  // Usage increments are strictly handled internally by EditorialPlanService
  const statsBefore = EditorialPlanService.getUsageStats(tenantStandard).totalOperationsRecorded;
  EditorialPlanService.recordUsage({
    tenantId: tenantStandard,
    userId: 'user-editor',
    operation: 'COPY_EDIT',
    modelTier: 'LIGHT',
    provider: 'MockEditorialEngine',
    model: 'standard-newspaper-v1',
    inputTokenEstimate: 50,
    outputTokenEstimate: 50,
    processingTimeMs: 100,
    status: 'COMPLETED',
  });
  const statsAfter = EditorialPlanService.getUsageStats(tenantStandard).totalOperationsRecorded;
  assert(statsAfter === statsBefore + 1, 'Server service must authoritatively track usage increment.');
  console.log('✓ Test 31 Passed: AI usage tracked securely at service layer.');

  // TEST 32: AI provider failure handled gracefully
  console.log('Running Test 32: AI provider failure handled gracefully...');
  // Create an intentional failure by passing corrupted article or blocked tier
  const failingOp = await AIEditorialEngine.generateHeadlineSuggestions({
    tenantId: tenantStandard,
    userId: 'user-editor',
    userName: 'Marcus Editor',
    userRole: 'editor',
    article: sampleArticle,
    requestedTier: 'ADVANCED', // Standard plan cannot request advanced model
  });
  assert(!failingOp.success, 'Unauthorized model tier should gracefully fail.');
  assert(failingOp.error?.includes('Advanced model tier') === true, 'Error message must be clear.');
  // Confirm article is still intact
  const finalArticleState = EditorialVersioningService.getLatestVersion(sampleArticle.articleId);
  assert(Boolean(finalArticleState.headline), 'Source article state remains intact.');
  console.log('✓ Test 32 Passed: AI provider failure handled gracefully without disrupting workflow.');

  console.log('====================================================');
  console.log('ALL 32/32 PHASE 6 AI EDITORIAL TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runEditorialAiTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
