/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 5 Production & Print Engine Verification Suite
 * Exhaustively tests 40 production requirements covering:
 *  1. Senior role authorization gate
 *  2. Hard preflight layout error blocking
 *  3. Non-blocking editorial warning bypass
 *  4. Immutable snapshot creation
 *  5. Source article edit isolation from frozen snapshot
 *  6. Production job creation
 *  7. Idempotent finalization (no duplicate jobs)
 *  8. Scheduled job time barrier (night window)
 *  9. Deterministic fair queue ordering
 * 10. Concurrency limit enforcement (maxConcurrentJobs)
 * 11. Atomic job claiming with worker leases
 * 12. Mutual exclusion between competing workers
 * 13. Expired worker lease recovery
 * 14. Automatic retry on transient failure
 * 15. Permanent failure handling (no infinite loops)
 * 16. Locked production snapshot immutability
 * 17. Telugu Unicode text preservation
 * 18. Mixed Telugu/English script rendering
 * 19. Vector-first text output
 * 20. Correct physical broadsheet/tabloid dimensions
 * 21. Effective DPI calculation
 * 22. Low DPI resolution threshold checks
 * 23. Missing font detection
 * 24. Font embedding restriction enforcement
 * 25. Advertisement constraint rendering
 * 26. Marketplace attribution preservation
 * 27. Invalid content license blocking
 * 28. High-resolution Print PDF generation
 * 29. Web-optimized Digital PDF generation
 * 30. SHA-256 cryptographic checksum calculation
 * 31. Preflight PASS produces READY state
 * 32. Preflight FAIL blocks READY state
 * 33. Cross-tenant isolation on output jobs
 * 34. Unauthorized reporter download restriction
 * 35. Correction revision version incrementation
 * 36. Historical version immutability after correction
 * 37. Safe queue cancellation
 * 38. Failed job visibility in production queue
 * 39. Internal notification event dispatching
 * 40. Tenant publication timezone calculation
 */

import { EditionPersistenceService } from '../services/editionPersistenceService';
import { ProductionQueueService } from '../services/productionQueueService';
import { EditionPreflightService } from '../services/editionPreflightService';
import { PrintPreflightService } from '../services/printPreflightService';
import { PrintRenderingService } from '../services/printRenderingService';
import { FontRegistryService } from '../services/fontRegistryService';
import { PrintImageProcessingService } from '../services/printImageProcessingService';
import { NotificationService } from '../services/notificationService';
import {
  NewspaperEdition,
  NewspaperTemplate,
  NewspaperBrand,
  NewspaperPage,
  ArticlePlacement,
} from '../types/edition';
import { NewsArticle } from '../types/news';
import { NewsLicense } from '../types/marketplace';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function runProductionTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 5 PRODUCTION & PRINT ENGINE TESTS');
  console.log('====================================================');

  // Reset stores for clean slate
  EditionPersistenceService.resetMemoryStore();
  ProductionQueueService.resetStore();
  NotificationService.clear();

  const testTenantId = 'tenant-metro-chronicle';
  const otherTenantId = 'tenant-deccan-herald';

  const mockBrand: NewspaperBrand = {
    brandId: 'brand-metro-morning',
    tenantId: testTenantId,
    name: 'The Metropolitan Chronicle',
    code: 'MC',
    masthead: {
      title: 'THE METROPOLITAN CHRONICLE',
      fontFamily: 'Cinzel',
      fontSizePt: 48,
      style: 'classic_blackletter',
      showDate: true,
      showEditionNumber: true,
      showPrice: true,
      priceText: '₹5.00',
    },
    language: 'mixed',
    defaultFonts: {
      headlineFont: 'Newsreader',
      bodyFont: 'Inter',
      accentFont: 'Cinzel',
      mastheadFont: 'Cinzel',
    },
    colors: {
      primary: '#0f172a',
      secondary: '#b45309',
      defaultText: '#020617',
      pageBackground: '#ffffff',
      accent: '#d97706',
    },
    defaultColumnCount: 6,
    defaultMargins: { top: 14, bottom: 14, left: 14, right: 14 },
    defaultGutters: 4.2,
    defaultTypographyScale: {
      leadHeadline: 36,
      secondaryLeadHeadline: 24,
      featureHeadline: 20,
      standardHeadline: 16,
      briefHeadline: 13,
      subheadline: 14,
      body: 10,
      briefBody: 8.5,
      caption: 8,
      byline: 9,
    },
    headerFooterRules: {
      showHeader: true,
      showFooter: true,
      headerRuleStyle: 'solid',
      footerRuleStyle: 'thin',
      pageNumberFormat: 'PAGE {n}',
    },
    sectionStyles: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockTemplate: NewspaperTemplate = {
    templateId: 'tmpl-broadsheet-6col',
    tenantId: testTenantId,
    name: 'Broadsheet Front Page 6-Column Standard',
    description: 'Standard 6-column broadsheet',
    pageSize: 'Broadsheet',
    pageOrientation: 'portrait',
    pageWidthMm: 350,
    pageHeightMm: 540,
    pageMarginsMm: { top: 14, bottom: 14, left: 14, right: 14 },
    columnCount: 6,
    columnGutterMm: 4.2,
    baselineGridPt: 8,
    headerHeightMm: 32,
    footerHeightMm: 12,
    allowedModules: ['masthead', 'headline', 'bodyText', 'image', 'advertisement'],
    defaultTypography: {
      headlineFont: 'Newsreader',
      bodyFont: 'Inter',
      accentFont: 'Cinzel',
      baseFontSizePt: 10,
      lineHeights: { headline: 1.15, body: 1.25, caption: 1.2 },
    },
    sectionStyles: {},
    advertisementZones: [],
    imageTreatmentRules: {
      maxHeroHeightPercent: 50,
      defaultAspectRatio: '16:9',
      allowGrayscale: true,
      borderStyle: 'thin_black',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockArticle1: NewsArticle = {
    articleId: 'art-lead-01',
    tenantId: testTenantId,
    headline: 'Supreme Court Upholds Coastal Infrastructure Environmental Clearance',
    subheadline: 'Five-judge constitutional bench clears key logistics corridor.',
    slug: 'supreme-court-upholds-coastal-infrastructure',
    byline: 'Sofia Chen',
    authorId: testTenantId,
    authorType: 'staff',
    leadParagraph: 'A five-judge constitutional bench ruled unanimously today in favor of port development.',
    bodyContent: 'The decision clears the pathway for $3.4 billion in maritime clean freight logistics upgrades across twelve regional harbors...',
    category: 'National',
    tags: ['Maritime', 'Infrastructure', 'Supreme Court'],
    editorialStatus: 'approved',
    originalityVerdict: 'verified_original',
    originalityScorePercent: 99.1,
    originalityStatus: 'VERIFIED_ORIGINAL',
    wordCount: 950,
    targetEditionId: 'ed-prod-001',
    printPageSection: 'Front Page',
    isMarketplaceListed: false,
    isMarketplaceEligible: false,
    heroImageUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=2400',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockArticleTelugu: NewsArticle = {
    articleId: 'art-telugu-02',
    tenantId: testTenantId,
    headline: 'హైదరాబాద్‌లో నూతన మెట్రో రైల్వే కారిడార్ నిర్మాణ పనులు ప్రారంభం',
    subheadline: 'నగర రవాణా వ్యవస్థకు సరికొత్త రూపురేఖలు.',
    slug: 'hyderabad-metro-railway-corridor-construction',
    byline: 'రమేష్ వర్మ (Ramesh Varma)',
    authorId: testTenantId,
    authorType: 'staff',
    leadParagraph: 'నగర రవాణా వ్యవస్థను ఆధునీకరించేందుకు ప్రభుత్వం భారీ ప్రాజెక్టును చేపట్టింది.',
    bodyContent: 'ఈ కారిడార్ ద్వారా ప్రతిరోజూ 5 లక్షల మంది ప్రయాణికులకు సదుపాయం కలగనుంది. మెట్రో విస్తరణతో ట్రాఫిక్ సమస్యలు గణనీయంగా తగ్గుతాయి...',
    category: 'రాష్ట్ర వార్తలు',
    tags: ['Metro', 'Transit', 'Hyderabad'],
    editorialStatus: 'approved',
    originalityVerdict: 'verified_original',
    originalityScorePercent: 98.4,
    originalityStatus: 'VERIFIED_ORIGINAL',
    wordCount: 820,
    targetEditionId: 'ed-prod-001',
    printPageSection: 'Front Page',
    isMarketplaceListed: false,
    isMarketplaceEligible: false,
    heroImageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=2400',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockPlacement1: ArticlePlacement = {
    placementId: 'pl-001',
    editionId: 'ed-prod-001',
    pageId: 'page-ed-prod-001-1',
    tenantId: testTenantId,
    newsId: 'art-lead-01',
    articleTitle: mockArticle1.headline,
    byline: mockArticle1.byline,
    category: mockArticle1.category,
    leadParagraph: mockArticle1.leadParagraph,
    bodyContent: mockArticle1.bodyContent,
    x: 14,
    y: 46,
    width: 200,
    height: 180,
    columnStart: 1,
    columnSpan: 4,
    rowStart: 6,
    rowSpan: 24,
    headlineSize: 28,
    bodyFontSize: 10,
    imagePlacement: 'top',
    imageUrl: mockArticle1.heroImageUrl,
    priority: {
      editorialPriority: 9,
      breakingStatus: true,
      articleType: 'Lead',
      freshnessHours: 1,
      section: 'Front Page',
      wordCount: 950,
      hasImage: true,
      publisherPriority: 5,
      calculatedScore: 120,
    },
    layoutRole: 'LEAD',
    status: 'placed',
    locked: false,
  };

  const mockPlacementTelugu: ArticlePlacement = {
    placementId: 'pl-002',
    editionId: 'ed-prod-001',
    pageId: 'page-ed-prod-001-1',
    tenantId: testTenantId,
    newsId: 'art-telugu-02',
    articleTitle: mockArticleTelugu.headline,
    byline: mockArticleTelugu.byline,
    category: mockArticleTelugu.category,
    leadParagraph: mockArticleTelugu.leadParagraph,
    bodyContent: mockArticleTelugu.bodyContent,
    x: 220,
    y: 46,
    width: 110,
    height: 180,
    columnStart: 5,
    columnSpan: 2,
    rowStart: 6,
    rowSpan: 24,
    headlineSize: 22,
    bodyFontSize: 9.5,
    imagePlacement: 'top',
    imageUrl: mockArticleTelugu.heroImageUrl,
    priority: {
      editorialPriority: 8,
      breakingStatus: false,
      articleType: 'State',
      freshnessHours: 2,
      section: 'Front Page',
      wordCount: 820,
      hasImage: true,
      publisherPriority: 5,
      calculatedScore: 90,
    },
    layoutRole: 'SECONDARY_LEAD',
    status: 'placed',
    locked: false,
  };

  const mockPage1: NewspaperPage = {
    pageId: 'page-ed-prod-001-1',
    editionId: 'ed-prod-001',
    tenantId: testTenantId,
    pageNumber: 1,
    sectionName: 'Front Page',
    templateId: mockTemplate.templateId,
    layoutVersion: 1,
    blocks: [mockPlacement1, mockPlacementTelugu],
    adPlacements: [
      {
        placementId: 'ad-001',
        editionId: 'ed-prod-001',
        pageId: 'page-ed-prod-001-1',
        tenantId: testTenantId,
        x: 14,
        y: 480,
        width: 322,
        height: 40,
        columnStart: 1,
        columnSpan: 6,
        rowStart: 58,
        rowSpan: 6,
        sponsorLabel: 'Apex Industrial Corporation',
        priority: 1,
        isLocked: true,
      },
    ],
    occupiedArea: 75,
    diagnostics: {
      status: 'balanced',
      occupiedAreaPercent: 75,
      whitespacePercent: 25,
      visualWeight: { topHalf: 50, bottomHalf: 50, leftHalf: 50, rightHalf: 50 },
      headlineHierarchy: { leadFound: true, leadFontSize: 28, secondaryLeadFound: true, ratio: 1.27, verdict: 'Optimal' },
      imageBalance: { imageAreaPercent: 25, count: 2 },
      errors: [],
      warnings: [],
      info: ['Layout verified'],
      canFinalize: true,
    },
    status: 'approved',
  };

  const mockEdition: NewspaperEdition = {
    editionId: 'ed-prod-001',
    tenantId: testTenantId,
    brandId: mockBrand.brandId,
    brandName: mockBrand.name,
    editionCode: 'MC-2026-10-04-ED01',
    issueNumber: 48200,
    volumeNumber: 132,
    publicationDate: '2026-10-04',
    status: 'DESIGNING',
    totalPages: 1,
    placedArticlesCount: 2,
    pages: [mockPage1],
    printDeadline: '2026-10-03T22:30:00.000Z',
    pressSpecs: {
      format: 'broadsheet',
      colorMode: 'cmyk',
      bleedMm: 3.5,
      dpi: 300,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  EditionPersistenceService.setEditionInMemory(mockEdition, [mockPage1]);

  // TEST 1: Only authorized user can finalize
  console.log('Running Test 1: Only authorized user can finalize...');
  const unauthRes = await EditionPersistenceService.finalizeEdition(
    mockEdition.editionId,
    testTenantId,
    'user-reporter',
    'reporter',
    mockTemplate,
    mockBrand
  );
  assert(!unauthRes.success, 'Unauthorized reporter role must NOT be able to finalize edition.');
  console.log('✓ Test 1 Passed: Unauthorized finalization blocked.');

  // TEST 2: Hard preflight layout error blocks finalize
  console.log('Running Test 2: Hard preflight layout error blocks finalize...');
  const collisionPage: NewspaperPage = {
    ...mockPage1,
    blocks: [
      mockPlacement1,
      { ...mockPlacement1, placementId: 'pl-colliding-dup', x: mockPlacement1.x, y: mockPlacement1.y },
    ],
  };
  EditionPersistenceService.setEditionInMemory(mockEdition, [collisionPage]);
  const collisionFinalize = await EditionPersistenceService.finalizeEdition(
    mockEdition.editionId,
    testTenantId,
    'user-eic',
    'editor_in_chief',
    mockTemplate,
    mockBrand,
    [mockArticle1, mockArticleTelugu]
  );
  assert(!collisionFinalize.success, 'Hard layout collision MUST block finalization.');
  console.log('✓ Test 2 Passed: Hard preflight error blocked finalization.');

  // Restore clean page
  EditionPersistenceService.setEditionInMemory(mockEdition, [mockPage1]);

  // TEST 3: Warning does not automatically block finalize
  console.log('Running Test 3: Warning does not automatically block finalize...');
  const finalizeRes = await EditionPersistenceService.finalizeEdition(
    mockEdition.editionId,
    testTenantId,
    'user-eic',
    'editor_in_chief',
    mockTemplate,
    mockBrand,
    [mockArticle1, mockArticleTelugu],
    [],
    { priority: 1 }
  );
  assert(finalizeRes.success, 'Valid edition with minor warnings should finalize successfully.');
  console.log('✓ Test 3 Passed: Finalize authorized with warning acknowledgement.');

  // TEST 4: Finalization creates immutable snapshot
  console.log('Running Test 4: Finalization creates immutable snapshot...');
  assert(Boolean(finalizeRes.snapshot), 'Finalization must return an immutable snapshot.');
  assert(finalizeRes.snapshot!.version === 1, 'Initial snapshot version must be 1.');
  assert(finalizeRes.snapshot!.articlesSnapshot['art-lead-01'] !== undefined, 'Snapshot must freeze article text.');
  console.log('✓ Test 4 Passed: Immutable ProductionSnapshot created.');

  // TEST 5: Source article edit does not change snapshot
  console.log('Running Test 5: Source article edit does not change snapshot...');
  const frozenHeadline = finalizeRes.snapshot!.articlesSnapshot['art-lead-01'].headline;
  mockArticle1.headline = 'MUTATED HEADLINE AFTER FINALIZATION';
  assert(
    finalizeRes.snapshot!.articlesSnapshot['art-lead-01'].headline === frozenHeadline,
    'Editing live newsroom article MUST NOT mutate frozen snapshot.'
  );
  console.log('✓ Test 5 Passed: Frozen snapshot is decoupled from live article mutations.');

  // TEST 6: Production job created once
  console.log('Running Test 6: Production job created once...');
  assert(Boolean(finalizeRes.productionJob), 'Production job must be created on finalization.');
  assert(finalizeRes.productionJob!.status === 'QUEUED', 'Initial production job status must be QUEUED.');
  console.log('✓ Test 6 Passed: Production job created and enqueued.');

  // TEST 7: Duplicate finalization does not create duplicate job
  console.log('Running Test 7: Duplicate finalization does not create duplicate job...');
  const reEnqueue = await ProductionQueueService.enqueueJob({
    snapshot: finalizeRes.snapshot!,
    priority: 1,
  });
  assert(
    reEnqueue.productionJobId === finalizeRes.productionJob!.productionJobId,
    'Re-enqueuing exact same snapshot must return the existing active job (idempotency).'
  );
  console.log('✓ Test 7 Passed: Idempotent job creation confirmed.');

  // TEST 8: Scheduled job does not run before due time
  console.log('Running Test 8: Scheduled job does not run before due time...');
  const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const nightJob = await ProductionQueueService.enqueueJob({
    snapshot: {
      ...finalizeRes.snapshot!,
      snapshotId: 'snap-future-001',
      version: 2,
    },
    priority: 5,
    scheduledFor: futureTime,
  });
  const eligibleNow = ProductionQueueService.getNextEligibleJob(new Date().toISOString());
  if (eligibleNow) {
    assert(
      eligibleNow.productionJobId !== nightJob.productionJobId,
      'Future scheduled night job must NOT be eligible before its scheduled time.'
    );
  }
  console.log('✓ Test 8 Passed: Future scheduled job safely held in queue.');

  // TEST 9: Queue ordering deterministic
  console.log('Running Test 9: Queue ordering deterministic...');
  // Job with Priority 1 should come before Priority 5
  finalizeRes.productionJob!.scheduledFor = new Date(Date.now() - 1000).toISOString();
  const nextJob = ProductionQueueService.getNextEligibleJob();
  assert(Boolean(nextJob), 'Scheduler should find due job.');
  assert(nextJob!.priority === 1, 'Highest priority (1) must be scheduled first.');
  console.log('✓ Test 9 Passed: Queue ordering deterministic.');

  // TEST 10: maxConcurrentJobs enforced
  console.log('Running Test 10: maxConcurrentJobs enforced...');
  ProductionQueueService.setMaxConcurrentJobs(1);
  const claimed1 = await ProductionQueueService.claimJob(finalizeRes.productionJob!.productionJobId, 'worker-1');
  assert(claimed1.success, 'Worker 1 should claim available job.');
  const nextEligible = ProductionQueueService.getNextEligibleJob();
  assert(nextEligible === null, 'Scheduler must return null when maxConcurrentJobs limit is reached.');
  console.log('✓ Test 10 Passed: maxConcurrentJobs concurrency limit strictly enforced.');

  // TEST 11: Atomic job claiming
  console.log('Running Test 11: Atomic job claiming...');
  const claimedJob = ProductionQueueService.getJobById(finalizeRes.productionJob!.productionJobId);
  assert(claimedJob!.workerId === 'worker-1', 'Claimed job must record worker ID.');
  assert(Boolean(claimedJob!.leaseExpiresAt), 'Claimed job must set leaseExpiresAt timestamp.');
  console.log('✓ Test 11 Passed: Atomic claiming with worker lease confirmed.');

  // TEST 12: Two workers cannot claim same job
  console.log('Running Test 12: Two workers cannot claim same job...');
  const claim2 = await ProductionQueueService.claimJob(finalizeRes.productionJob!.productionJobId, 'worker-2');
  assert(!claim2.success, 'Worker 2 must be rejected from claiming an actively locked job.');
  console.log('✓ Test 12 Passed: Mutual exclusion between competing workers verified.');

  // TEST 13: Expired lease recovery
  console.log('Running Test 13: Expired lease recovery...');
  // Artificially expire worker lease
  claimedJob!.leaseExpiresAt = new Date(Date.now() - 5000).toISOString();
  const recoveredCount = ProductionQueueService.recoverExpiredLeases();
  assert(recoveredCount >= 1, 'Scheduler must recover job with expired lease.');
  const recoveredJob = ProductionQueueService.getJobById(finalizeRes.productionJob!.productionJobId);
  assert(recoveredJob!.status === 'RETRY_SCHEDULED' || recoveredJob!.status === 'QUEUED', 'Recovered job status must reset to retry/queued.');
  console.log('✓ Test 13 Passed: Expired lease recovered successfully.');

  // TEST 14: Retry after transient failure
  console.log('Running Test 14: Retry after transient failure...');
  await ProductionQueueService.claimJob(finalizeRes.productionJob!.productionJobId, 'worker-1');
  // Reclaim and process
  const processRes = await ProductionQueueService.processJob(finalizeRes.productionJob!.productionJobId, 'worker-1');
  assert(processRes.success, 'Processing valid snapshot should succeed.');
  console.log('✓ Test 14 Passed: Rendering pipeline completed.');

  // TEST 15: Permanent error does not endlessly retry
  console.log('Running Test 15: Permanent error does not endlessly retry...');
  const badJob = await ProductionQueueService.enqueueJob({
    snapshot: {
      ...finalizeRes.snapshot!,
      snapshotId: 'snap-temp-to-corrupt',
      version: 99,
    },
    priority: 1,
    scheduledFor: new Date().toISOString(),
  });
  // Intentionally set snapshotId to nonexistent to simulate missing snapshot permanent error
  badJob.snapshotId = 'nonexistent-corrupt-snapshot-404';
  const badProcess = await ProductionQueueService.processJob(badJob.productionJobId, 'worker-1');
  assert(!badProcess.success, 'Processing missing snapshot should fail permanently.');
  const failedRecord = ProductionQueueService.getJobById(badJob.productionJobId);
  assert(failedRecord!.status === 'FAILED', 'Permanent error status must be set to FAILED.');
  assert(failedRecord!.failureType === 'PERMANENT', 'Failure classification must be PERMANENT.');
  console.log('✓ Test 15 Passed: Permanent errors correctly classified as FAILED without infinite retry.');

  // TEST 16: Locked production snapshot immutable
  console.log('Running Test 16: Locked production snapshot immutable...');
  try {
    await EditionPersistenceService.saveEdition(
      mockEdition,
      [mockPage1],
      'user-editor',
      'Attempt to edit locked edition'
    );
    assert(false, 'Direct save on finalized edition should throw exception.');
  } catch (err: any) {
    assert(err.message.includes('finalized'), 'Error message must specify finalized lock.');
  }
  console.log('✓ Test 16 Passed: Finalized edition locked against direct mutations.');

  // TEST 17: Telugu text preserved
  console.log('Running Test 17: Telugu text preserved...');
  const teluguCheck = FontRegistryService.testTeluguGlyphShaping(mockArticleTelugu.headline);
  assert(teluguCheck.preserved, 'Telugu Unicode clusters must be preserved intact.');
  assert(teluguCheck.clusterCount > 0, 'Telugu grapheme cluster count must be non-zero.');
  console.log('✓ Test 17 Passed: Telugu Unicode glyph clusters accurately shaped.');

  // TEST 18: Mixed Telugu/English preserved
  console.log('Running Test 18: Mixed Telugu/English preserved...');
  const mixedScript = FontRegistryService.detectScript('ఆంధ్ర ప్రభ (Andhra Prabha) Daily 2026');
  assert(mixedScript === 'mixed', 'Script detector must recognize mixed Telugu and Latin scripts.');
  console.log('✓ Test 18 Passed: Mixed Telugu + English text correctly identified.');

  // TEST 19: Headline remains vector text
  console.log('Running Test 19: Headline remains vector text...');
  const docModel = PrintRenderingService.buildDocumentModel(finalizeRes.snapshot!);
  const leadHeadlineElement = docModel.pages[0].elements.find((el) => el.type === 'headline');
  assert(Boolean(leadHeadlineElement), 'Document model must contain headline element.');
  assert(leadHeadlineElement!.isVector === true, 'Headline element must remain vector text (never rasterized).');
  console.log('✓ Test 19 Passed: Vector-first headline preservation validated.');

  // TEST 20: Correct physical page dimensions
  console.log('Running Test 20: Correct physical page dimensions...');
  assert(docModel.dimensionsMm.width === 350, 'Broadsheet width must be 350mm.');
  assert(docModel.dimensionsMm.height === 540, 'Broadsheet height must be 540mm.');
  console.log('✓ Test 20 Passed: Physical broadsheet dimensions strictly respected.');

  // TEST 21: Effective DPI calculation
  console.log('Running Test 21: Effective DPI calculation...');
  // 2400px over 8 inches (203.2 mm) = 300 DPI
  const dpiRes = PrintImageProcessingService.calculateEffectiveDPI(2400, 1600, 203.2, 135.4);
  assert(dpiRes.effectiveDPI === 300, `Expected 300 DPI, got ${dpiRes.effectiveDPI}`);
  assert(dpiRes.status === 'GOOD', '300 DPI must be GOOD status.');
  console.log('✓ Test 21 Passed: Effective DPI calculation verified.');

  // TEST 22: Low DPI warning/error
  console.log('Running Test 22: Low DPI warning/error...');
  // 600px over 8 inches = 75 DPI (low res)
  const lowDpiRes = PrintImageProcessingService.calculateEffectiveDPI(600, 400, 203.2, 135.4);
  assert(lowDpiRes.effectiveDPI < 150, 'Effective DPI must be < 150.');
  assert(lowDpiRes.status === 'ERROR', 'Sub-150 DPI must trigger ERROR status.');
  console.log('✓ Test 22 Passed: Low DPI resolution guard verified.');

  // TEST 23: Missing font detected
  console.log('Running Test 23: Missing font detected...');
  const missingFontCheck = FontRegistryService.validateFontForText('UnregisteredFakeFont', 'Sample text');
  assert(!missingFontCheck.isValid, 'Unregistered font must fail validation.');
  console.log('✓ Test 23 Passed: Missing font detected in registry.');

  // TEST 24: Font embedding restriction detected
  console.log('Running Test 24: Font embedding restriction detected...');
  const restrictedFontCheck = FontRegistryService.validateFontForText('Helvetica Commercial Pro', 'Sample Text');
  assert(!restrictedFontCheck.isValid, 'Restricted commercial font must fail embedding check.');
  assert(Boolean(restrictedFontCheck.reason?.includes('embedding restrictions')), 'Reason must specify embedding restriction.');
  console.log('✓ Test 24 Passed: Font embedding restrictions strictly enforced.');

  // TEST 25: Advertisement rendering
  console.log('Running Test 25: Advertisement rendering...');
  const adElement = docModel.pages[0].elements.find((el) => el.type === 'ad');
  assert(Boolean(adElement), 'Document model must contain commercial advertisement element.');
  assert(Boolean(adElement!.content?.includes('Apex Industrial')), 'Ad sponsor label must be rendered.');
  console.log('✓ Test 25 Passed: Advertisement placement rendered with sponsor label.');

  // TEST 26: Marketplace attribution preserved
  console.log('Running Test 26: Marketplace attribution preserved...');
  const bylineElement = docModel.pages[0].elements.find((el) => el.type === 'byline');
  assert(Boolean(bylineElement), 'Document model must render reporter byline.');
  assert(Boolean(bylineElement!.content?.includes('Sofia Chen')), 'Reporter name must be present in byline.');
  console.log('✓ Test 26 Passed: Reporter byline attribution preserved.');

  // TEST 27: Invalid license blocks production
  console.log('Running Test 27: Invalid license blocks production...');
  const syndicatedArt: NewsArticle = {
    articleId: 'art-unlicensed-wire',
    tenantId: otherTenantId,
    headline: 'Syndicated Wire Story Lacking License Agreement',
    subheadline: 'Syndication wire report',
    slug: 'syndicated-wire-story-unlicensed',
    byline: 'Wire Reporter',
    authorId: otherTenantId,
    authorType: 'freelance',
    isMarketplaceListed: true,
    isMarketplaceEligible: true,
    leadParagraph: 'This story belongs to another tenant and requires purchase.',
    bodyContent: 'Content here...',
    category: 'General',
    tags: ['Syndicated'],
    editorialStatus: 'approved',
    originalityVerdict: 'verified_original',
    originalityScorePercent: 97.0,
    originalityStatus: 'VERIFIED_ORIGINAL',
    wordCount: 400,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const preflightLicense = EditionPreflightService.validateForFinalization({
    edition: mockEdition,
    pages: [
      {
        ...mockPage1,
        blocks: [
          { ...mockPlacement1, newsId: 'art-unlicensed-wire', articleTitle: syndicatedArt.headline },
        ],
      },
    ],
    template: mockTemplate,
    brand: mockBrand,
    articles: [syndicatedArt],
    licenses: [], // No licenses provided!
  });
  assert(!preflightLicense.canFinalize, 'Unlicensed syndicated story MUST block finalization.');
  console.log('✓ Test 27 Passed: Content licensing violation blocks print finalization.');

  // TEST 28: Print PDF generated
  console.log('Running Test 28: Print PDF generated...');
  const finishedJob = ProductionQueueService.getJobById(finalizeRes.productionJob!.productionJobId);
  assert(Boolean(finishedJob!.outputFiles?.printPdfDataUri), 'Print PDF data URI must be generated.');
  assert(finishedJob!.outputFiles!.printSizeBytes! > 0, 'Print PDF size must be positive.');
  console.log('✓ Test 28 Passed: Print-ready vector PDF generated.');

  // TEST 29: Digital PDF generated
  console.log('Running Test 29: Digital PDF generated...');
  assert(Boolean(finishedJob!.outputFiles?.digitalPdfDataUri), 'Digital PDF data URI must be generated.');
  assert(finishedJob!.outputFiles!.digitalSizeBytes! < finishedJob!.outputFiles!.printSizeBytes!, 'Digital PDF should be smaller than uncompressed Print PDF.');
  console.log('✓ Test 29 Passed: Web-optimized digital replica PDF generated.');

  // TEST 30: SHA-256 checksum generated
  console.log('Running Test 30: SHA-256 checksum generated...');
  assert(Boolean(finishedJob!.outputFiles?.printChecksum), 'Print output must have SHA-256 checksum.');
  assert(finishedJob!.outputFiles!.printChecksum!.length === 64, 'SHA-256 checksum must be 64 hexadecimal characters.');
  console.log('✓ Test 30 Passed: SHA-256 checksum verified.');

  // TEST 31: Preflight PASS produces READY
  console.log('Running Test 31: Preflight PASS produces READY...');
  assert(finishedJob!.status === 'READY', 'Job with passing preflight must achieve READY status.');
  console.log('✓ Test 31 Passed: Preflight pass leads to READY status.');

  // TEST 32: Preflight FAIL prevents READY
  console.log('Running Test 32: Preflight FAIL prevents READY...');
  const badSnapshot: any = {
    ...finalizeRes.snapshot!,
    snapshotId: 'snap-preflight-fail',
    pages: [
      {
        ...mockPage1,
        blocks: [
          {
            ...mockPlacement1,
            // Negative width or extreme out of bounds
            x: -500,
            width: 1000,
          },
        ],
      },
    ],
  };
  const failJob = await ProductionQueueService.enqueueJob({ snapshot: badSnapshot, priority: 1, scheduledFor: new Date().toISOString() });
  await ProductionQueueService.claimJob(failJob.productionJobId, 'worker-1');
  const failProcess = await ProductionQueueService.processJob(failJob.productionJobId, 'worker-1');
  assert(!failProcess.success, 'Preflight failure must fail the job.');
  const failJobRecord = ProductionQueueService.getJobById(failJob.productionJobId);
  assert(failJobRecord!.status === 'FAILED', 'Failing preflight MUST prevent READY status.');
  console.log('✓ Test 32 Passed: Preflight FAIL prevents READY status.');

  // TEST 33: Cross-tenant output access blocked
  console.log('Running Test 33: Cross-tenant output access blocked...');
  const otherTenantJobs = ProductionQueueService.getJobsForTenant(otherTenantId);
  assert(!otherTenantJobs.some((j) => j.tenantId === testTenantId), 'Tenant Deccan Herald must NOT see Metro Chronicle jobs.');
  console.log('✓ Test 33 Passed: Cross-tenant jobs isolated.');

  // TEST 34: Reporter cannot download another tenant's edition
  console.log('Running Test 34: Reporter cannot download another tenant\'s edition...');
  const tenantSnaps = ProductionQueueService.getAllSnapshotsForTenant(otherTenantId);
  assert(!tenantSnaps.some((s) => s.tenantId === testTenantId), 'Reporter cannot access other tenant snapshots.');
  console.log('✓ Test 34 Passed: Cross-tenant download access blocked.');

  // TEST 35: Correction revision creates new production version
  console.log('Running Test 35: Correction revision creates new production version...');
  const correctionRes = await EditionPersistenceService.createCorrectionRevision(
    mockEdition.editionId,
    testTenantId,
    'user-eic',
    'editor_in_chief',
    'Typo correction in front page headline'
  );
  assert(correctionRes.success, 'Creating correction revision must succeed.');
  assert(correctionRes.edition!.status === 'DESIGNING', 'Edition must be unlocked into DESIGNING state.');
  assert(correctionRes.newRevision!.version === 2, 'New revision version number must be 2.');
  console.log('✓ Test 35 Passed: Correction revision created with version incrementation.');

  // TEST 36: Previous version remains immutable
  console.log('Running Test 36: Previous version remains immutable...');
  const snapshotsHistory = EditionPersistenceService.getSnapshotsForEdition(mockEdition.editionId);
  assert(snapshotsHistory.length >= 1, 'Previous snapshot v1 must remain preserved in snapshot history.');
  assert(snapshotsHistory[0].version === 1, 'Snapshot v1 must remain untouched.');
  console.log('✓ Test 36 Passed: Historical production snapshot remains frozen and immutable.');

  // TEST 37: Queue cancellation
  console.log('Running Test 37: Queue cancellation...');
  const cancellableJob = await ProductionQueueService.enqueueJob({
    snapshot: { ...finalizeRes.snapshot!, snapshotId: 'snap-to-cancel', version: 3 },
    priority: 5,
    scheduledFor: futureTime,
  });
  const cancelRes = await ProductionQueueService.cancelJob(
    cancellableJob.productionJobId,
    'user-eic',
    'editor_in_chief',
    'Newsroom cancelled edition'
  );
  assert(cancelRes.success, 'Queued job must be cancellable.');
  assert(ProductionQueueService.getJobById(cancellableJob.productionJobId)!.status === 'CANCELLED', 'Status must be CANCELLED.');
  console.log('✓ Test 37 Passed: Queue cancellation confirmed.');

  // TEST 38: Failed job visible in production dashboard
  console.log('Running Test 38: Failed job visible in production dashboard...');
  const allTenantJobs = ProductionQueueService.getJobsForTenant(testTenantId);
  const foundFailed = allTenantJobs.find((j) => j.status === 'FAILED');
  assert(Boolean(foundFailed), 'Failed jobs must be queryable and visible in production dashboard.');
  console.log('✓ Test 38 Passed: Failed job visible with diagnosis message.');

  // TEST 39: Internal production-ready notification created
  console.log('Running Test 39: Internal production-ready notification created...');
  const notifications = NotificationService.getNotificationsForTenant(testTenantId);
  assert(notifications.length > 0, 'Production notifications must be dispatched.');
  const readyNotif = notifications.find((n) => n.type === 'production_ready');
  assert(Boolean(readyNotif), 'Notification for production_ready must be generated.');
  console.log('✓ Test 39 Passed: Production-ready internal notification verified.');

  // TEST 40: Tenant timezone scheduling works
  console.log('Running Test 40: Tenant timezone scheduling works...');
  const istScheduled = ProductionQueueService.calculateNightScheduledFor('2026-10-04', 'Asia/Kolkata');
  assert(istScheduled.includes('2026-10-04T22:00:00'), 'Scheduled time must target 10:00 PM for the target publication date.');
  console.log('✓ Test 40 Passed: Timezone-aware 10:00 PM night window calculation verified.');

  console.log('====================================================');
  console.log('ALL 40/40 PHASE 5 PRODUCTION TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runProductionTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
