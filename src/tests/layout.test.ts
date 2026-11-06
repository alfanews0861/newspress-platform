/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 4 Layout Engine & Newspaper Page Designer Verification Suite
 * Tests 20 rigorous criteria covering:
 * 1. Page grid calculation
 * 2. Column width calculation
 * 3. Article placement
 * 4. No overlap
 * 5. No overflow
 * 6. Headline fitting
 * 7. Body text fitting
 * 8. Image placement
 * 9. Locked block preservation
 * 10. Advertisement collision prevention
 * 11. Page balance diagnostics
 * 12. Multi-page story assignment
 * 13. Editor override preservation
 * 14. Revision creation
 * 15. Autosave debounce
 * 16. Edition content license validation
 * 17. Cross-tenant isolation
 * 18. Unauthorized layout modification prevention
 * 19. Finalize permission validation
 * 20. AUTO LAYOUT deterministic behavior
 */

import { GridCalculationService } from '../services/gridCalculationService';
import { HeadlineFittingService } from '../services/headlineFittingService';
import { BodyTextFittingService } from '../services/bodyTextFittingService';
import { ImageLayoutEngine } from '../services/imageLayoutEngine';
import { PageBalanceService } from '../services/pageBalanceService';
import { PagePlanningEngine } from '../services/pagePlanningEngine';
import { EditionContentEligibilityService } from '../services/editionContentEligibilityService';
import { EditionPersistenceService } from '../services/editionPersistenceService';
import {
  NewspaperEdition,
  NewspaperTemplate,
  NewspaperPage,
  ArticlePlacement,
  AdvertisementPlacement,
} from '../types/edition';
import { NewsArticle } from '../types/news';
import { NewsLicense } from '../types/marketplace';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function runLayoutEngineTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 4 NEWSPAPER LAYOUT ENGINE TESTS');
  console.log('====================================================');

  const mockTemplate6Col: NewspaperTemplate = {
    templateId: 'tmpl-broadsheet-6col',
    tenantId: 'tenant-metro-chronicle',
    name: 'Broadsheet 6-Column Standard',
    description: 'Traditional 6-column broadsheet format',
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
    allowedModules: ['masthead', 'headline', 'subheadline', 'bodyText', 'image', 'advertisement'],
    defaultTypography: {
      headlineFont: 'Newsreader, serif',
      bodyFont: 'Inter, sans-serif',
      accentFont: 'Cinzel, serif',
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
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };

  const mockEdition: NewspaperEdition = {
    editionId: 'ed-oct-04-morning',
    tenantId: 'tenant-metro-chronicle',
    brandId: 'brand-metro-morning',
    brandName: 'The Metropolitan Chronicle',
    editionCode: 'MC-2026-10-04-MORN',
    issueNumber: 47822,
    volumeNumber: 132,
    publicationDate: '2026-10-04',
    status: 'DESIGNING',
    totalPages: 2,
    pageCount: 2,
    placedArticlesCount: 0,
    pages: [],
    printDeadline: '2026-10-03T22:30:00.000Z',
    pressSpecs: {
      format: 'broadsheet',
      colorMode: 'cmyk',
      bleedMm: 3.5,
      dpi: 300,
    },
    createdAt: '2026-10-03T00:00:00.000Z',
    updatedAt: '2026-10-03T00:00:00.000Z',
  };

  const mockArticles: NewsArticle[] = [
    {
      articleId: 'art-lead-01',
      tenantId: 'tenant-metro-chronicle',
      headline: 'Subway Automated Signaling Overhaul Reaches Final Phase Across 14 Arteries',
      subheadline: 'City transit authorities confirm Monday launch for new automated train tracking network.',
      slug: 'subway-automated-signaling-overhaul',
      leadParagraph: 'After three years of overnight engineering shutdowns and $2.4B in capital upgrades, track automation goes live.',
      bodyContent: 'Civil engineers, dispatch managers, and safety compliance directors concluded the final 72-hour stress test without incident. The new signaling network replaces mechanical relays laid in 1958 with computerized fiber-optic telemetry.',
      byline: 'Sofia Chen',
      authorId: 'user-sofia-chen',
      authorType: 'staff',
      category: 'Front Page (A1)',
      tags: ['transit', 'infrastructure'],
      editorialStatus: 'approved',
      originalityVerdict: 'verified_original',
      isMarketplaceListed: false,
      isMarketplaceEligible: false,
      wordCount: 1140,
      heroImageUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800',
      createdAt: '2026-10-03T05:00:00.000Z',
      updatedAt: '2026-10-03T05:00:00.000Z',
    },
    {
      articleId: 'art-sec-02',
      tenantId: 'tenant-metro-chronicle',
      headline: 'Autonomous Green Cargo Crane Grid Unveiled at Harbor Terminal',
      subheadline: 'Zero-emission electric gantry cranes accelerate turnaround times.',
      slug: 'autonomous-green-cargo-crane-grid',
      leadParagraph: 'A cluster of electrified rail-mounted gantry cranes began commercial trials at the deepwater container hub today.',
      bodyContent: 'Port authority officials stood on the quay as automated carriers moved 40-foot containers with centimeter accuracy without diesel exhaust emissions.',
      byline: 'Marcus Sterling',
      authorId: 'user-marcus',
      authorType: 'staff',
      category: 'Commerce & Shipping',
      tags: ['port', 'shipping'],
      editorialStatus: 'approved',
      originalityVerdict: 'verified_original',
      isMarketplaceListed: false,
      isMarketplaceEligible: false,
      wordCount: 850,
      heroImageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800',
      createdAt: '2026-10-03T06:00:00.000Z',
      updatedAt: '2026-10-03T06:00:00.000Z',
    },
    {
      articleId: 'art-feature-03',
      tenantId: 'tenant-metro-chronicle',
      headline: 'City Council Approves $180M Affordable Housing Trust for Waterfront',
      slug: 'city-council-approves-housing-trust',
      leadParagraph: 'Municipal lawmakers voted 38 to 11 to establish deed-restricted inclusionary zoning for residential developers.',
      bodyContent: 'The measure establishes a dedicated revolving loan fund aimed at community land trusts and non-profit housing developers.',
      byline: 'Sofia Chen',
      authorId: 'user-sofia-chen',
      authorType: 'staff',
      category: 'City Hall',
      tags: ['housing', 'city'],
      editorialStatus: 'approved',
      originalityVerdict: 'verified_original',
      isMarketplaceListed: false,
      isMarketplaceEligible: false,
      wordCount: 780,
      createdAt: '2026-10-03T06:30:00.000Z',
      updatedAt: '2026-10-03T06:30:00.000Z',
    },
    {
      articleId: 'art-brief-04',
      tenantId: 'tenant-metro-chronicle',
      headline: 'Municipal Water Board Upgrades Filtration Plant in North Ward',
      slug: 'municipal-water-board-upgrades-filtration',
      leadParagraph: 'Water purity tests show 15% reduction in mineral sedimentation.',
      bodyContent: 'Upgraded sand filtration basins came online this morning following routine seasonal maintenance.',
      byline: 'David Okafor',
      authorId: 'user-david',
      authorType: 'freelance',
      category: 'Local Briefs',
      tags: ['water', 'environment'],
      editorialStatus: 'approved',
      originalityVerdict: 'verified_original',
      isMarketplaceListed: false,
      isMarketplaceEligible: false,
      wordCount: 320,
      createdAt: '2026-10-03T07:00:00.000Z',
      updatedAt: '2026-10-03T07:00:00.000Z',
    },
  ];

  // Test 1: Page Grid Calculation
  const grid = GridCalculationService.calculatePageGrid(mockTemplate6Col);
  assert(grid.pageWidth === 700, `Page width should be 700px (350mm * 2.0 ratio), got ${grid.pageWidth}`);
  assert(grid.pageHeight === 1080, `Page height should be 1080px (540mm * 2.0 ratio), got ${grid.pageHeight}`);
  assert(grid.contentWidth === 700 - 28 - 28, `Content width should subtract margins, got ${grid.contentWidth}`);
  console.log('✓ Test 1 Passed: Page grid calculation');

  // Test 2: Column Width Calculation
  assert(grid.columnCount === 6, `Column count must be 6, got ${grid.columnCount}`);
  assert(grid.columnWidth > 0, `Column width must be positive, got ${grid.columnWidth}`);
  const totalColsSpan = grid.columnCount * grid.columnWidth + (grid.columnCount - 1) * grid.gutterWidth;
  assert(Math.abs(totalColsSpan - grid.contentWidth) <= 5, 'Sum of columns and gutters must equal content width');
  console.log('✓ Test 2 Passed: Column width calculation');

  // Test 3: Article Placement Bounds
  const col1to4 = GridCalculationService.calculateColumnBounds(grid, 1, 4);
  assert(col1to4.x === grid.margins.left, `Column 1 start should align with left margin, got ${col1to4.x}`);
  assert(col1to4.width > grid.columnWidth * 3, '4-column span width must be wider than 3 single columns');
  console.log('✓ Test 3 Passed: Article placement');

  // Test 4: No Overlap Check
  const blockA = { x: 100, y: 100, width: 200, height: 150 };
  const blockB = { x: 310, y: 100, width: 200, height: 150 }; // Adjacent, no overlap
  const blockC = { x: 150, y: 120, width: 200, height: 150 }; // Overlaps A
  assert(!GridCalculationService.checkBlockOverlap(blockA, blockB), 'Adjacent blocks should not overlap');
  assert(GridCalculationService.checkBlockOverlap(blockA, blockC), 'Overlapping blocks must be detected');
  console.log('✓ Test 4 Passed: No overlap');

  // Test 5: No Overflow Check
  const validBounds = GridCalculationService.validatePlacementBounds({ columnStart: 1, columnSpan: 6 }, grid);
  assert(validBounds.valid, '6-column placement on 6-col grid must be valid');
  const invalidBounds = GridCalculationService.validatePlacementBounds({ columnStart: 5, columnSpan: 3 }, grid);
  assert(!invalidBounds.valid, 'Column start 5 + span 3 (ends at 7) must fail on 6-column grid');
  console.log('✓ Test 5 Passed: No overflow');

  // Test 6: Headline Fitting
  const headlineFit = HeadlineFittingService.fitHeadline({
    headlineText: 'Subway Automated Signaling Overhaul Reaches Final Phase Across 14 Arteries',
    availableWidthPx: col1to4.width,
    maxLines: 3,
    minFontSizePt: 16,
    maxFontSizePt: 36,
  });
  assert(headlineFit.lineCount <= 3, `Headline must fit within 3 lines, got ${headlineFit.lineCount}`);
  assert(headlineFit.fontSizePt >= 16 && headlineFit.fontSizePt <= 36, `Font size must be within bounds, got ${headlineFit.fontSizePt}`);
  assert(headlineFit.lines.join(' ').replace(/\s+/g, ' ').includes('Subway Automated'), 'Headline text must not be rewritten');
  console.log('✓ Test 6 Passed: Headline fitting');

  // Test 7: Body Text Fitting
  const bodyFit = BodyTextFittingService.fitBodyText({
    bodyText: mockArticles[0].bodyContent || '',
    columnWidthPx: grid.columnWidth,
    columnSpan: 4,
    availableHeightPx: 300,
    fontSizePt: 10,
  });
  assert(bodyFit.totalWords > 0, 'Word count must be calculated');
  assert(bodyFit.totalLinesCount > 0, 'Total line count must be calculated');
  console.log('✓ Test 7 Passed: Body text fitting');

  // Test 8: Image Placement & Crop
  const imgRank = ImageLayoutEngine.rankPhotos(
    [
      { photoId: 'p1', url: 'https://example.com/1.jpg', width: 1600, height: 900, orientation: 'landscape', relevanceScore: 90, qualityScore: 95 },
      { photoId: 'p2', url: 'https://example.com/2.jpg', width: 800, height: 800, orientation: 'square', relevanceScore: 70, qualityScore: 80 },
    ],
    'LEAD'
  );
  assert(imgRank[0].photo.photoId === 'p1', 'Landscape high-res image must rank first for LEAD story');
  const crop = ImageLayoutEngine.calculateCrop(imgRank[0].photo, 400, 225, 'cover');
  assert(crop.width > 0 && crop.height > 0, 'Crop dimensions must be calculated');
  console.log('✓ Test 8 Passed: Image placement');

  // Test 9: Locked Block Preservation
  const existingLockedPlacement: ArticlePlacement = {
    placementId: 'pl-locked-01',
    editionId: mockEdition.editionId,
    pageId: 'page-ed-oct-04-morning-1',
    tenantId: mockEdition.tenantId,
    newsId: 'art-lead-01',
    articleTitle: mockArticles[0].headline,
    x: 28,
    y: 100,
    width: 400,
    height: 300,
    columnStart: 1,
    columnSpan: 4,
    rowStart: 5,
    rowSpan: 20,
    headlineSize: 32,
    bodyFontSize: 10,
    imagePlacement: 'hero',
    priority: { editorialPriority: 10, breakingStatus: true, articleType: 'News', freshnessHours: 1, section: 'A1', wordCount: 1000, hasImage: true, publisherPriority: 10, calculatedScore: 200 },
    layoutRole: 'LEAD',
    status: 'locked',
    locked: true,
  };

  const planWithLocked = PagePlanningEngine.planEditionLayout({
    edition: mockEdition,
    template: mockTemplate6Col,
    stories: mockArticles,
    existingPlacements: [existingLockedPlacement],
    preserveLocks: true,
    targetPageCount: 2,
  });

  const preserved = planWithLocked.placements.find((p) => p.newsId === 'art-lead-01');
  assert(preserved !== undefined, 'Locked story must be present in output');
  assert(preserved?.columnStart === 1 && preserved?.columnSpan === 4, 'Locked story column start and span must be preserved verbatim');
  assert(preserved?.locked === true, 'Locked block must maintain locked status');
  console.log('✓ Test 9 Passed: Locked block preservation');

  // Test 10: Advertisement Collision Prevention
  const adBlock: AdvertisementPlacement = {
    placementId: 'ad-01',
    editionId: mockEdition.editionId,
    pageId: 'page-ed-oct-04-morning-1',
    tenantId: mockEdition.tenantId,
    x: 28,
    y: 800,
    width: grid.contentWidth,
    height: 100,
    columnStart: 1,
    columnSpan: 6,
    rowStart: 45,
    rowSpan: 10,
    sponsorLabel: 'Apex Bank',
    isLocked: true,
    priority: 1,
  };

  const planWithAd = PagePlanningEngine.planEditionLayout({
    edition: mockEdition,
    template: mockTemplate6Col,
    stories: mockArticles,
    advertisements: [adBlock],
    targetPageCount: 2,
  });

  // Verify no news story block overlaps with the ad's row range
  const page1Stories = planWithAd.pages[0].blocks;
  for (const s of page1Stories) {
    const storyRowEnd = s.rowStart + s.rowSpan - 1;
    const adRowEnd = adBlock.rowStart + adBlock.rowSpan - 1;
    const verticalOverlap = !(storyRowEnd < adBlock.rowStart || s.rowStart > adRowEnd);
    assert(!verticalOverlap, `Story ${s.articleTitle} must not vertically overlap ad rows ${adBlock.rowStart}..${adRowEnd}`);
  }
  console.log('✓ Test 10 Passed: Advertisement collision prevention');

  // Test 11: Page Balance Diagnostics
  const balance = PageBalanceService.evaluatePage(grid, planWithAd.pages[0].blocks, [adBlock]);
  assert(balance.occupiedAreaPercent > 0 && balance.occupiedAreaPercent <= 100, `Occupied percent should be valid, got ${balance.occupiedAreaPercent}`);
  assert(balance.visualWeight.topHalf >= 0 && balance.visualWeight.bottomHalf >= 0, 'Visual weight distribution calculated');
  console.log('✓ Test 11 Passed: Page balance diagnostics');

  // Test 12: Multi-Page Story Assignment
  const planMultiPage = PagePlanningEngine.planEditionLayout({
    edition: mockEdition,
    template: mockTemplate6Col,
    stories: mockArticles,
    targetPageCount: 2,
  });
  assert(planMultiPage.pages.length === 2, `Should produce 2 pages, got ${planMultiPage.pages.length}`);
  assert(planMultiPage.placements.length >= 3, `Should place at least 3 stories across pages, got ${planMultiPage.placements.length}`);
  console.log('✓ Test 12 Passed: Multi-page story assignment');

  // Test 13: Editor Override Preservation
  const overriddenPlacement: ArticlePlacement = {
    ...existingLockedPlacement,
    locked: false,
    editorOverride: {
      columnSpan: 3,
      headlineSize: 22,
      isOverridden: true,
    },
  };
  const planWithOverride = PagePlanningEngine.planEditionLayout({
    edition: mockEdition,
    template: mockTemplate6Col,
    stories: mockArticles,
    existingPlacements: [overriddenPlacement],
    targetPageCount: 2,
  });
  const overrideResult = planWithOverride.placements.find((p) => p.newsId === 'art-lead-01');
  assert(overrideResult?.columnSpan === 3, `Override column span (3) should be respected, got ${overrideResult?.columnSpan}`);
  console.log('✓ Test 13 Passed: Editor override preservation');

  // Test 14: Revision Creation
  EditionPersistenceService.resetMemoryStore();
  const saveRes = await EditionPersistenceService.saveEdition(
    mockEdition,
    planMultiPage.pages,
    'user-editor-01',
    'Initial layout save'
  );
  assert(saveRes.revision.version === 1, `First revision should be v1, got ${saveRes.revision.version}`);
  assert(saveRes.revision.createdBy === 'user-editor-01', 'Revision author recorded');
  const revs = await EditionPersistenceService.getRevisions(mockEdition.editionId);
  assert(revs.length === 1, `Should have 1 revision, got ${revs.length}`);
  console.log('✓ Test 14 Passed: Revision creation');

  // Test 15: Autosave Debounce
  let autosaveFired = false;
  EditionPersistenceService.scheduleAutosave(mockEdition, planMultiPage.pages, 'user-editor-01', () => {
    autosaveFired = true;
  }, 50);
  await new Promise((r) => setTimeout(r, 80));
  assert(autosaveFired, 'Autosave callback should fire after debounce duration');
  console.log('✓ Test 15 Passed: Autosave debounce');

  // Test 16: Edition Content License Validation
  const internalApprovedStory = mockArticles[0];
  const internalDraftStory: NewsArticle = { ...mockArticles[0], articleId: 'art-draft-99', editorialStatus: 'draft' };
  const foreignStory: NewsArticle = { ...mockArticles[0], articleId: 'art-foreign-01', tenantId: 'tenant-pacific-tribune' };

  const validInternal = EditionContentEligibilityService.checkArticleEligibility('tenant-metro-chronicle', internalApprovedStory);
  assert(validInternal.isEligible && validInternal.sourceType === 'IN_HOUSE_APPROVED', 'Internal approved story must be eligible');

  const invalidDraft = EditionContentEligibilityService.checkArticleEligibility('tenant-metro-chronicle', internalDraftStory);
  assert(!invalidDraft.isEligible, 'Internal unapproved draft story must NOT be eligible');

  const unlicensedForeign = EditionContentEligibilityService.checkArticleEligibility('tenant-metro-chronicle', foreignStory, []);
  assert(!unlicensedForeign.isEligible, 'Foreign marketplace story without license must NOT be eligible');

  const licensedForeign = EditionContentEligibilityService.checkArticleEligibility(
    'tenant-metro-chronicle',
    foreignStory,
    [
      {
        licenseId: 'lic-01',
        purchaseId: 'pur-01',
        listingId: 'mkt-01',
        newsId: 'art-foreign-01',
        articleTitle: 'Foreign Investigative Report',
        buyerTenantId: 'tenant-metro-chronicle',
        buyerUserId: 'user-01',
        sellerReporterId: 'rep-david',
        type: 'SINGLE_EDITION',
        scope: 'Single print edition',
        territory: 'National',
        durationDays: 30,
        allowedMedia: ['print'],
        allowedEditions: 1,
        exclusivity: false,
        resaleAllowed: false,
        derivativeEditingAllowed: true,
        attributionRequired: true,
        status: 'ACTIVE',
        grantedAt: new Date().toISOString(),
      },
    ]
  );
  assert(licensedForeign.isEligible && licensedForeign.sourceType === 'MARKETPLACE_LICENSED', 'Licensed foreign story must be eligible');
  console.log('✓ Test 16 Passed: Edition content license validation');

  // Test 17: Cross-Tenant Isolation
  const crossTenantCheck = await EditionPersistenceService.finalizeEdition(
    mockEdition.editionId,
    'tenant-pacific-tribune', // Wrong tenant!
    'user-editor-in-chief',
    'editor_in_chief',
    mockTemplate6Col
  );
  assert(!crossTenantCheck.success, 'Cross-tenant edition modification must be rejected');
  console.log('✓ Test 17 Passed: Cross-tenant isolation');

  // Test 18: Unauthorized Layout Modification Prevention
  const reporterAttempt = await EditionPersistenceService.finalizeEdition(
    mockEdition.editionId,
    'tenant-metro-chronicle',
    'user-reporter',
    'staff_reporter', // Reporter role lacks finalization rights
    mockTemplate6Col
  );
  assert(!reporterAttempt.success, 'Staff reporter must not be allowed to finalize editions');
  console.log('✓ Test 18 Passed: Unauthorized layout modification prevention');

  // Test 19: Finalize Permission Validation
  const editorInChiefFinalize = await EditionPersistenceService.finalizeEdition(
    mockEdition.editionId,
    'tenant-metro-chronicle',
    'user-editor-in-chief',
    'editor_in_chief',
    mockTemplate6Col
  );
  assert(editorInChiefFinalize.success, `Editor-in-Chief must be authorized to finalize edition: ${editorInChiefFinalize.errors?.join(', ')}`);
  assert(editorInChiefFinalize.edition?.status === 'FINALIZED', 'Edition status must transition to FINALIZED');
  console.log('✓ Test 19 Passed: Finalize permission validation');

  // Test 20: AUTO LAYOUT Deterministic Behavior
  const run1 = PagePlanningEngine.planEditionLayout({
    edition: mockEdition,
    template: mockTemplate6Col,
    stories: mockArticles,
    targetPageCount: 2,
  });
  const run2 = PagePlanningEngine.planEditionLayout({
    edition: mockEdition,
    template: mockTemplate6Col,
    stories: mockArticles,
    targetPageCount: 2,
  });
  assert(run1.placements.length === run2.placements.length, 'Deterministic runs must produce identical placement counts');
  assert(run1.placements[0].newsId === run2.placements[0].newsId, 'Deterministic runs must assign the exact same lead story');
  assert(run1.placements[0].x === run2.placements[0].x && run1.placements[0].y === run2.placements[0].y, 'Deterministic runs must produce identical coordinates');
  console.log('✓ Test 20 Passed: AUTO LAYOUT deterministic behavior');

  console.log('====================================================');
  console.log('PHASE 4 TEST SUMMARY: 20 / 20 PASSED');
  console.log('====================================================');
}

runLayoutEngineTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test run failed:', err);
    process.exit(1);
  });
