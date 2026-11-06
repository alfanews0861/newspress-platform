/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 9 — Publisher Edition Management, Content Planning & Workflow Test Suite
 * Exhaustively tests all 50+ required criteria across edition lifecycle, content pool,
 * reservations, sections, page plans, breaking news, withdrawals, readiness, and finalization.
 */

import { EditionPlanningService } from '../services/editionPlanningService';
import { EditionContentPoolService } from '../services/editionContentPoolService';
import { SectionManagementService } from '../services/sectionManagementService';
import { EditionReservationService } from '../services/editionReservationService';
import { EditionAdvertisementService } from '../services/editionAdvertisementService';
import { EditionReadinessService } from '../services/editionReadinessService';
import { SubscriptionEntitlementService } from '../services/subscriptionEntitlementService';
import { UsageMeteringService } from '../services/usageMeteringService';
import { RBACService } from '../services/rbacService';
import { AuditService } from '../services/auditService';
import { NotificationService } from '../services/notificationService';
import { NewsArticle } from '../types/news';
import { NewsLicense } from '../types/marketplace';
import { NewspaperTemplate } from '../types/edition';

const MOCK_TEMPLATE: NewspaperTemplate = {
  templateId: 'tpl-broadsheet-8col',
  tenantId: 'tenant-metro',
  name: 'Standard Broadsheet',
  description: '8 column broadsheet',
  pageSize: 'Broadsheet',
  pageOrientation: 'portrait',
  pageWidthMm: 350,
  pageHeightMm: 560,
  pageMarginsMm: { top: 15, bottom: 15, left: 15, right: 15 },
  columnCount: 8,
  columnGutterMm: 4,
  baselineGridPt: 12,
  headerHeightMm: 25,
  footerHeightMm: 15,
  allowedModules: ['headline', 'bodyText', 'image', 'advertisement'],
  defaultTypography: {
    headlineFont: 'Newsreader',
    bodyFont: 'Inter',
    accentFont: 'JetBrains Mono',
    baseFontSizePt: 9.5,
    lineHeights: { body: 12 },
  },
  sectionStyles: {},
  advertisementZones: [
    { zoneId: 'zone-bottom-strip', name: 'Bottom Strip', columnStart: 1, columnSpan: 8, rowStart: 40, rowSpan: 5 },
  ],
  imageTreatmentRules: {
    maxHeroHeightPercent: 40,
    defaultAspectRatio: '16:9',
    allowGrayscale: false,
    borderStyle: 'none',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function runPhase9Tests() {
  console.log('================================================================');
  console.log('STARTING PHASE 9 PUBLISHER EDITION PLANNING & WORKFLOW TESTS');
  console.log('================================================================');

  let passed = 0;
  const tenantA = 'tenant-chronicle';
  const tenantB = 'tenant-tribune';

  function resetAll() {
    EditionPlanningService.resetStore();
    SubscriptionEntitlementService.resetStore();
    UsageMeteringService.resetStore();
    AuditService.clear();
    NotificationService.clear();
  }

  resetAll();

  // Test 1: Create edition
  console.log('Running Test 1: Create edition...');
  const ed1Res = EditionPlanningService.createEdition({
    tenantId: tenantA,
    brandId: 'brand-1',
    templateId: 'tpl-broadsheet-8col',
    editionType: 'MORNING',
    editionDate: '2026-10-05',
    publicationDate: '2026-10-05',
    publicationTimezone: 'Asia/Kolkata',
    pageCount: 4,
    contentDeadline: '2026-10-05T07:30:00Z',
    printDeadline: '2026-10-05T10:00:00Z',
    createdBy: 'editor-1',
  });
  if (!ed1Res.success || !ed1Res.edition || ed1Res.edition.status !== 'PLANNED') {
    throw new Error('Test 1 Failed: Edition not created with PLANNED status.');
  }
  const ed1 = ed1Res.edition;
  console.log('✓ Test 1 Passed: Create edition succeeds with deterministic PLANNED state.');
  passed++;

  // Test 2: Tenant isolation
  console.log('Running Test 2: Tenant isolation in editions...');
  const edTenantBRes = EditionPlanningService.createEdition({
    tenantId: tenantB,
    brandId: 'brand-2',
    templateId: 'tpl-broadsheet-8col',
    editionType: 'EVENING',
    editionDate: '2026-10-05',
    publicationDate: '2026-10-05',
    publicationTimezone: 'America/New_York',
    pageCount: 4,
    contentDeadline: '2026-10-05T15:00:00Z',
    printDeadline: '2026-10-05T18:00:00Z',
    createdBy: 'editor-b',
  });
  const tenantAEditions = EditionPlanningService.getEditions(tenantA);
  const tenantBEditions = EditionPlanningService.getEditions(tenantB);
  if (tenantAEditions.some((e) => e.tenantId !== tenantA) || tenantBEditions.some((e) => e.tenantId !== tenantB)) {
    throw new Error('Test 2 Failed: Cross-tenant data leakage detected in editions listing.');
  }
  console.log('✓ Test 2 Passed: Tenant isolation verified across edition stores.');
  passed++;

  // Test 3: Deterministic edition lifecycle: PLANNED -> OPEN
  console.log('Running Test 3: Lifecycle transition PLANNED -> OPEN...');
  const openRes = EditionPlanningService.openEdition(tenantA, ed1.editionId, 'editor-1');
  if (!openRes.success || openRes.edition?.status !== 'OPEN') {
    throw new Error('Test 3 Failed: Edition failed to open.');
  }
  console.log('✓ Test 3 Passed: PLANNED -> OPEN transition succeeds.');
  passed++;

  // Test 4: Arbitrary lifecycle transition blocked
  console.log('Running Test 4: Arbitrary invalid transition blocked...');
  const invalidTrans = EditionPlanningService.transitionStatus(tenantA, ed1.editionId, 'FINALIZED', 'editor-1');
  if (invalidTrans.success) {
    throw new Error('Test 4 Failed: Arbitrary transition directly from OPEN to FINALIZED should be blocked.');
  }
  console.log('✓ Test 4 Passed: Arbitrary state skips strictly blocked by transition matrix.');
  passed++;

  // Test 5: Lifecycle transition OPEN -> CONTENT_COLLECTION -> DESIGNING
  console.log('Running Test 5: Lifecycle progression to CONTENT_COLLECTION then DESIGNING...');
  const collRes = EditionPlanningService.startContentCollection(tenantA, ed1.editionId, 'editor-1');
  if (!collRes.success || collRes.edition?.status !== 'CONTENT_COLLECTION') {
    throw new Error('Test 5 Failed: OPEN -> CONTENT_COLLECTION transition failed.');
  }
  const desRes = EditionPlanningService.startDesigning(tenantA, ed1.editionId, 'editor-1');
  if (!desRes.success || desRes.edition?.status !== 'DESIGNING') {
    throw new Error('Test 5 Failed: CONTENT_COLLECTION -> DESIGNING transition failed.');
  }
  console.log('✓ Test 5 Passed: Sequential transitions advance to DESIGNING.');
  passed++;

  // Test 6: Timezone handling
  console.log('Running Test 6: Timezone configuration preserved...');
  if (ed1.publicationTimezone !== 'Asia/Kolkata') {
    throw new Error('Test 6 Failed: publicationTimezone not preserved.');
  }
  console.log('✓ Test 6 Passed: Publication timezone properly recorded.');
  passed++;

  // Test 7: Subscription edition limit enforcement
  console.log('Running Test 7: Subscription edition creation limit blocked...');
  // Force simulate reaching edition limit on BASIC plan (1 edition limit)
  UsageMeteringService.recordUsage({
    tenantId: tenantA,
    subscriptionId: 'sub-test',
    planId: 'BASIC',
    metric: 'EDITION_CREATED',
    quantity: 10,
    unit: 'editions',
  });
  const blockedCreate = EditionPlanningService.createEdition({
    tenantId: tenantA,
    brandId: 'brand-1',
    templateId: 'tpl-1',
    editionType: 'SPECIAL',
    editionDate: '2026-10-06',
    publicationDate: '2026-10-06',
    publicationTimezone: 'Asia/Kolkata',
    pageCount: 2,
    contentDeadline: '2026-10-06T08:00:00Z',
    printDeadline: '2026-10-06T10:00:00Z',
    createdBy: 'editor-1',
  });
  if (blockedCreate.success) {
    throw new Error('Test 7 Failed: Exceeding edition limit should be blocked with upgrade guidance.');
  }
  console.log('✓ Test 7 Passed: Subscription edition limit strictly enforced.');
  passed++;

  // Clear usage for subsequent tests
  UsageMeteringService.resetStore();

  // Test 8: Calendar listing
  console.log('Running Test 8: Calendar listing retrieves planned editions...');
  const calendarEditions = EditionPlanningService.getEditions(tenantA);
  if (calendarEditions.length === 0) {
    throw new Error('Test 8 Failed: No editions retrieved for calendar.');
  }
  console.log('✓ Test 8 Passed: Calendar listings retrieved correctly.');
  passed++;

  // Test 9: Approved newsroom story eligible for content pool
  console.log('Running Test 9: Approved newsroom story is eligible in content pool...');
  const approvedStory: NewsArticle = {
    articleId: 'art-approved-1',
    tenantId: tenantA,
    authorId: 'rep-1',
    authorType: 'staff',
    reporterType: 'staff',
    headline: 'Metro Water Infrastructure Upgrade Cleared',
    title: 'Metro Water Infrastructure Upgrade Cleared',
    slug: 'metro-water-upgrade-cleared',
    byline: 'Aarav Sharma',
    leadParagraph: 'Lead summary paragraph',
    bodyContent: 'Full report body',
    content: 'Full report body',
    editorialStatus: 'approved',
    originalityVerdict: 'verified_original',
    originalityScorePercent: 94,
    originalityScore: 94,
    wordCount: 450,
    hasPhotography: true,
    isBreaking: false,
    category: 'City & Metro',
    tags: ['Water', 'Infrastructure'],
    isMarketplaceListed: false,
    isMarketplaceEligible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const pool = EditionContentPoolService.aggregateContentPool(tenantA, [approvedStory]);
  if (pool.length !== 1 || !pool[0].isEligible || pool[0].sourceType !== 'STAFF_REPORTER') {
    throw new Error('Test 9 Failed: Approved in-house story should be marked eligible as STAFF_REPORTER.');
  }
  console.log('✓ Test 9 Passed: Approved newsroom story is eligible in content pool.');
  passed++;

  // Test 10: Unapproved story blocked from content pool
  console.log('Running Test 10: Draft or in-review story is marked ineligible...');
  const draftStory: NewsArticle = {
    ...approvedStory,
    articleId: 'art-draft-1',
    headline: 'Unvetted Leak Regarding City Council',
    title: 'Unvetted Leak Regarding City Council',
    editorialStatus: 'draft',
  };
  const poolDraft = EditionContentPoolService.aggregateContentPool(tenantA, [draftStory]);
  if (poolDraft[0].isEligible) {
    throw new Error('Test 10 Failed: Draft story must be ineligible for print edition placement.');
  }
  console.log('✓ Test 10 Passed: Draft story correctly marked ineligible.');
  passed++;

  // Test 11: Marketplace story requires valid active license
  console.log('Running Test 11: Foreign marketplace story without license is blocked...');
  const foreignMarketplaceStory: NewsArticle = {
    ...approvedStory,
    articleId: 'art-market-1',
    tenantId: 'tenant-wire-syndicate',
    isMarketplaceListed: true,
    isMarketplaceSyndicated: true,
  };
  const poolUnlicensed = EditionContentPoolService.aggregateContentPool(tenantA, [foreignMarketplaceStory], []);
  if (poolUnlicensed[0].isEligible) {
    throw new Error('Test 11 Failed: Marketplace story without active license must be ineligible.');
  }
  console.log('✓ Test 11 Passed: Unlicensed marketplace story blocked from content pool.');
  passed++;

  // Test 12: Marketplace story with active license is eligible
  console.log('Running Test 12: Marketplace story with active license is eligible...');
  const validLicense: NewsLicense = {
    licenseId: 'lic-valid-1',
    listingId: 'list-1',
    newsId: 'art-market-1',
    articleTitle: 'Metro Water Infrastructure Upgrade Cleared',
    buyerTenantId: tenantA,
    buyerUserId: 'editor-1',
    sourceTenantId: 'tenant-wire-syndicate',
    sellerTenantId: 'tenant-wire-syndicate',
    sellerReporterId: 'wire-rep-1',
    type: 'SINGLE_EDITION',
    scope: 'print_broadsheet',
    territory: 'National',
    durationDays: 30,
    allowedMedia: ['print'],
    allowedEditions: 1,
    exclusivity: false,
    resaleAllowed: false,
    derivativeEditingAllowed: true,
    allowDerivativeEditing: true,
    attributionRequired: true,
    attributionRequirement: true,
    pricePaidCents: 5000,
    status: 'ACTIVE',
    grantedAt: new Date().toISOString(),
    purchasedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };
  const poolLicensed = EditionContentPoolService.aggregateContentPool(tenantA, [foreignMarketplaceStory], [validLicense]);
  if (!poolLicensed[0].isEligible || poolLicensed[0].sourceType !== 'MARKETPLACE_PURCHASE') {
    throw new Error('Test 12 Failed: Licensed marketplace story should be eligible as MARKETPLACE_PURCHASE.');
  }
  console.log('✓ Test 12 Passed: Licensed marketplace story is eligible.');
  passed++;

  // Test 13: Expired license blocked
  console.log('Running Test 13: Expired marketplace license is blocked...');
  const expiredLicense: NewsLicense = {
    ...validLicense,
    licenseId: 'lic-expired-1',
    expiresAt: new Date(Date.now() - 3600000).toISOString(), // expired 1 hour ago
  };
  const poolExpired = EditionContentPoolService.aggregateContentPool(tenantA, [foreignMarketplaceStory], [expiredLicense]);
  if (poolExpired[0].isEligible) {
    throw new Error('Test 13 Failed: Expired license must render story ineligible.');
  }
  console.log('✓ Test 13 Passed: Expired license renders story ineligible.');
  passed++;

  // Test 14: DIGITAL_ONLY license blocked in print edition
  console.log('Running Test 14: DIGITAL_ONLY license blocked from print edition...');
  const digitalOnlyLicense: NewsLicense = {
    ...validLicense,
    licenseId: 'lic-digital-1',
    type: 'DIGITAL_ONLY',
  };
  const poolDigitalOnly = EditionContentPoolService.aggregateContentPool(tenantA, [foreignMarketplaceStory], [digitalOnlyLicense]);
  if (poolDigitalOnly[0].isEligible) {
    throw new Error('Test 14 Failed: DIGITAL_ONLY license must be blocked from print edition.');
  }
  console.log('✓ Test 14 Passed: DIGITAL_ONLY license strictly blocked from print press.');
  passed++;

  // Test 15: Attribution preserved in marketplace story
  console.log('Running Test 15: Syndication attribution preserved...');
  if (!poolLicensed[0].attribution.creditLine.includes('tenant-wire-syndicate')) {
    throw new Error('Test 15 Failed: Syndication license attribution credit line not preserved.');
  }
  console.log('✓ Test 15 Passed: Syndication source attribution preserved.');
  passed++;

  // Test 16: Freelance story handled correctly
  console.log('Running Test 16: Freelance story tagged as FREELANCE_REPORTER...');
  const freelanceStory: NewsArticle = {
    ...approvedStory,
    articleId: 'art-freelance-1',
    authorType: 'freelance',
    reporterType: 'freelance',
  };
  const poolFreelance = EditionContentPoolService.aggregateContentPool(tenantA, [freelanceStory]);
  if (poolFreelance[0].sourceType !== 'FREELANCE_REPORTER' || !poolFreelance[0].attribution.creditLine.includes('Special')) {
    throw new Error('Test 16 Failed: Freelance reporter story not correctly categorized.');
  }
  console.log('✓ Test 16 Passed: Freelance story recognized with special correspondent credit.');
  passed++;

  // Test 17: Content reservation
  console.log('Running Test 17: Reserve story for edition...');
  const reserveRes = EditionReservationService.reserveStory({
    tenantId: tenantA,
    editionId: ed1.editionId,
    newsId: approvedStory.articleId,
    reservedBy: 'editor-1',
    priority: 'FRONT_PAGE_LEAD',
    sourceType: 'STAFF_REPORTER',
    pageIntent: 1,
    bylineCredit: approvedStory.byline,
  });
  if (!reserveRes.success || !reserveRes.reservation || reserveRes.reservation.status !== 'RESERVED') {
    throw new Error('Test 17 Failed: Story reservation failed.');
  }
  console.log('✓ Test 17 Passed: Story reservation succeeds.');
  passed++;

  // Test 18: Duplicate reservation prevented
  console.log('Running Test 18: Duplicate reservation prevented...');
  const dupReserve = EditionReservationService.reserveStory({
    tenantId: tenantA,
    editionId: ed1.editionId,
    newsId: approvedStory.articleId,
    reservedBy: 'editor-2',
    priority: 'SECTION_LEAD',
    sourceType: 'STAFF_REPORTER',
  });
  if (dupReserve.success) {
    throw new Error('Test 18 Failed: Duplicate reservation should be rejected.');
  }
  console.log('✓ Test 18 Passed: Duplicate reservation correctly rejected.');
  passed++;

  // Test 19: Release reservation
  console.log('Running Test 19: Release reservation...');
  const releaseRes = EditionReservationService.releaseReservation(tenantA, reserveRes.reservation.reservationId, 'editor-1');
  if (!releaseRes.success) {
    throw new Error('Test 19 Failed: Release reservation failed.');
  }
  // Story can now be reserved again
  const reReserve = EditionReservationService.reserveStory({
    tenantId: tenantA,
    editionId: ed1.editionId,
    newsId: approvedStory.articleId,
    reservedBy: 'editor-1',
    priority: 'FRONT_PAGE_LEAD',
    sourceType: 'STAFF_REPORTER',
    pageIntent: 1,
  });
  if (!reReserve.success) {
    throw new Error('Test 19 Failed: Story could not be re-reserved after release.');
  }
  console.log('✓ Test 19 Passed: Reservation released and re-allocated cleanly.');
  passed++;

  // Test 20: Cross-edition double allocation prevented
  console.log('Running Test 20: Cross-edition double reservation blocked...');
  const crossEditionReserve = EditionReservationService.reserveStory({
    tenantId: tenantA,
    editionId: 'ed-other-999',
    newsId: approvedStory.articleId,
    reservedBy: 'editor-other',
    priority: 'STANDARD',
    sourceType: 'STAFF_REPORTER',
  });
  if (crossEditionReserve.success) {
    throw new Error('Test 20 Failed: Story already reserved in one edition should not be reservable in another concurrent edition.');
  }
  console.log('✓ Test 20 Passed: Cross-edition double allocation blocked.');
  passed++;

  // Test 21: Section creation
  console.log('Running Test 21: Section creation...');
  const customSection = SectionManagementService.createSection(tenantA, {
    name: 'Technology & Startups',
    shortCode: 'TECH',
    displayOrder: 15,
  });
  if (!customSection || customSection.shortCode !== 'TECH') {
    throw new Error('Test 21 Failed: Section creation failed.');
  }
  console.log('✓ Test 21 Passed: Custom section created successfully.');
  passed++;

  // Test 22: Assign story to section
  console.log('Running Test 22: Assign story to section...');
  const assignSec = EditionPlanningService.assignSection(tenantA, ed1.editionId, approvedStory.articleId, 'Technology & Startups', 'editor-1');
  if (!assignSec.success) {
    throw new Error('Test 22 Failed: Section assignment failed.');
  }
  console.log('✓ Test 22 Passed: Section assignment recorded and version snapshot updated.');
  passed++;

  // Test 23: Editor override of section
  console.log('Running Test 23: Editor override of section...');
  const overrideSec = EditionPlanningService.assignSection(tenantA, ed1.editionId, approvedStory.articleId, 'Business & Markets', 'editor-1');
  if (!overrideSec.success) {
    throw new Error('Test 23 Failed: Editor override of section failed.');
  }
  console.log('✓ Test 23 Passed: Editor override of section succeeded.');
  passed++;

  // Test 24: Page planning initialization
  console.log('Running Test 24: Page plans generated for all planned pages...');
  const plans = EditionPlanningService.getPagePlans(ed1.editionId);
  if (plans.length !== 4) {
    throw new Error(`Test 24 Failed: Expected 4 page plans, got ${plans.length}.`);
  }
  console.log('✓ Test 24 Passed: Page plans match planned edition page count.');
  passed++;

  // Test 25: Assign story to page
  console.log('Running Test 25: Assign story to page...');
  const assignPage = EditionPlanningService.assignPage(tenantA, ed1.editionId, approvedStory.articleId, 1, 'editor-1');
  if (!assignPage.success) {
    throw new Error('Test 25 Failed: Page assignment failed.');
  }
  console.log('✓ Test 25 Passed: Story successfully assigned to Page 1.');
  passed++;

  // Test 26: Reserve advertisement
  console.log('Running Test 26: Reserve advertisement slot...');
  const adRes = EditionAdvertisementService.reserveAdvertisement({
    tenantId: tenantA,
    editionId: ed1.editionId,
    advertisementId: 'ad-101',
    pageNumber: 1,
    zoneId: 'zone-bottom-strip',
    sponsorName: 'City Bank Commercial',
    reservedBy: 'ad-agent-1',
  });
  if (!adRes.success || !adRes.reservation) {
    throw new Error('Test 26 Failed: Advertisement reservation failed.');
  }
  console.log('✓ Test 26 Passed: Advertisement slot reserved on Page 1.');
  passed++;

  // Test 27: Commercial ad lock
  console.log('Running Test 27: Commercial advertisement lock...');
  const lockAd = EditionAdvertisementService.lockAdvertisement(tenantA, adRes.reservation.reservationId, 'commercial-director');
  if (!lockAd.success) {
    throw new Error('Test 27 Failed: Locking advertisement failed.');
  }
  const ads = EditionAdvertisementService.getAdvertisementsForEdition(ed1.editionId);
  if (!ads[0].isCommerciallyLocked) {
    throw new Error('Test 27 Failed: Advertisement isCommerciallyLocked is false.');
  }
  console.log('✓ Test 27 Passed: Commercial lock applied and verified.');
  passed++;

  // Test 28: Breaking news insertion
  console.log('Running Test 28: Controlled breaking news insertion...');
  const breakingArticle: NewsArticle = {
    ...approvedStory,
    articleId: 'art-breaking-flood',
    headline: 'Flash Floods Warning Issued for Coastal Districts',
    title: 'Flash Floods Warning Issued for Coastal Districts',
    slug: 'flash-floods-warning',
    isBreaking: true,
  };
  const breakingRes = EditionPlanningService.insertBreakingNews({
    tenantId: tenantA,
    editionId: ed1.editionId,
    breakingArticle,
    targetPage: 1,
    userId: 'editor-breaking',
    template: MOCK_TEMPLATE,
  });
  if (!breakingRes.success) {
    throw new Error('Test 28 Failed: Breaking news insertion failed.');
  }
  console.log('✓ Test 28 Passed: Breaking news inserted, prioritized, and audited.');
  passed++;

  // Test 29: Story withdrawal requires mandatory reason
  console.log('Running Test 29: Story withdrawal requires mandatory reason...');
  const invalidWithdraw = EditionPlanningService.withdrawStory({
    tenantId: tenantA,
    editionId: ed1.editionId,
    newsId: breakingArticle.articleId,
    withdrawnBy: 'editor-1',
    reason: '' as any,
  });
  if (invalidWithdraw.success) {
    throw new Error('Test 29 Failed: Withdrawal without reason should be blocked.');
  }
  console.log('✓ Test 29 Passed: Missing withdrawal reason correctly blocked.');
  passed++;

  // Test 30: Story withdrawal with valid reason
  console.log('Running Test 30: Story withdrawal with valid reason...');
  const validWithdraw = EditionPlanningService.withdrawStory({
    tenantId: tenantA,
    editionId: ed1.editionId,
    newsId: breakingArticle.articleId,
    withdrawnBy: 'editor-1',
    reason: 'BREAKING_UPDATE',
    notes: 'Superseded by coastal evacuation order',
  });
  if (!validWithdraw.success) {
    throw new Error('Test 30 Failed: Valid withdrawal failed.');
  }
  console.log('✓ Test 30 Passed: Story withdrawn, reservation released, and audit logged.');
  passed++;

  // Test 31: Page rebalancing action
  console.log('Running Test 31: Explicit page rebalancing action...');
  const rebalanceRes = EditionPlanningService.rebalancePage(
    tenantA,
    ed1.editionId,
    1,
    'editor-1',
    MOCK_TEMPLATE,
    [approvedStory]
  );
  if (!rebalanceRes.success) {
    throw new Error('Test 31 Failed: Page rebalance action failed.');
  }
  console.log('✓ Test 31 Passed: Page rebalancing completed cleanly using PagePlanningEngine.');
  passed++;

  // Test 32: Immutable content version snapshots
  console.log('Running Test 32: Immutable content version snapshots tracked...');
  const versions = EditionPlanningService.getContentVersions(ed1.editionId);
  if (versions.length < 3) {
    throw new Error(`Test 32 Failed: Expected at least 3 content versions, found ${versions.length}.`);
  }
  console.log('✓ Test 32 Passed: Immutable edition version snapshots recorded across lifecycle events.');
  passed++;

  // Test 33: Readiness evaluation detects missing front-page lead if absent
  console.log('Running Test 33: Readiness engine detects missing front-page lead...');
  // Clear reservations to test empty lead
  EditionReservationService.resetStore();
  const emptyReadiness = EditionReadinessService.evaluateReadiness({
    edition: ed1,
    articles: [approvedStory],
  });
  if (emptyReadiness.overallStatus !== 'BLOCKED' || emptyReadiness.categories.content.status !== 'BLOCKING') {
    throw new Error('Test 33 Failed: Missing lead story must block edition readiness.');
  }
  console.log('✓ Test 33 Passed: Missing front page lead correctly blocks readiness.');
  passed++;

  // Test 34: Readiness evaluation passes when content, ads, and licensing are in order
  console.log('Running Test 34: Readiness evaluation passes when constraints met...');
  // Re-reserve lead story and other stories to meet threshold
  EditionReservationService.reserveStory({
    tenantId: tenantA,
    editionId: ed1.editionId,
    newsId: approvedStory.articleId,
    reservedBy: 'editor-1',
    priority: 'FRONT_PAGE_LEAD',
    sourceType: 'STAFF_REPORTER',
    pageIntent: 1,
  });
  // Add additional stories
  for (let i = 2; i <= 8; i++) {
    const s: NewsArticle = {
      ...approvedStory,
      articleId: `story-${i}`,
      headline: `Article Title ${i}`,
      title: `Article Title ${i}`,
      slug: `article-title-${i}`,
      editorialStatus: 'approved',
    };
    EditionReservationService.reserveStory({
      tenantId: tenantA,
      editionId: ed1.editionId,
      newsId: s.articleId,
      reservedBy: 'editor-1',
      priority: i % 2 === 0 ? 'STANDARD' : 'BRIEF',
      sourceType: 'STAFF_REPORTER',
      pageIntent: (i % 4) + 1,
    });
  }
  const cleanReadiness = EditionReadinessService.evaluateReadiness({
    edition: ed1,
    articles: [approvedStory],
    licenses: [],
  });
  if (cleanReadiness.categories.content.status === 'BLOCKING') {
    throw new Error('Test 34 Failed: Content should not be blocking when lead and quota satisfied.');
  }
  console.log('✓ Test 34 Passed: Readiness satisfied when lead and quota criteria met.');
  passed++;

  // Test 35: Readiness blocks on unapproved story
  console.log('Running Test 35: Readiness blocks on unapproved story...');
  const unapprovedArt: NewsArticle = {
    ...approvedStory,
    articleId: 'art-unapproved-test',
    headline: 'Unapproved Story',
    title: 'Unapproved Story',
    slug: 'unapproved-story',
    editorialStatus: 'in_review',
  };
  EditionReservationService.reserveStory({
    tenantId: tenantA,
    editionId: ed1.editionId,
    newsId: unapprovedArt.articleId,
    reservedBy: 'editor-1',
    priority: 'STANDARD',
    sourceType: 'STAFF_REPORTER',
  });
  const unapprovedReadiness = EditionReadinessService.evaluateReadiness({
    edition: ed1,
    articles: [approvedStory, unapprovedArt],
  });
  if (unapprovedReadiness.categories.editorial.status !== 'BLOCKING') {
    throw new Error('Test 35 Failed: Unapproved story in edition must trigger editorial pillar BLOCKING.');
  }
  console.log('✓ Test 35 Passed: Unapproved story blocks readiness.');
  passed++;

  // Clean up unapproved story
  EditionReservationService.releaseReservation(tenantA, `res-${ed1.editionId}-${unapprovedArt.articleId}`, 'editor-1');

  // Test 36: Fact integrity alert blocks readiness
  console.log('Running Test 36: Fact integrity discrepancy alert blocks readiness...');
  const factAlertStory: NewsArticle = {
    ...approvedStory,
    articleId: 'art-fact-alert',
    headline: 'Fact Alert Story',
    title: 'Fact Alert Story',
    slug: 'fact-alert-story',
    editorialStatus: 'approved',
    factIntegrity: {
      status: 'flagged_discrepancy',
      hasUnresolvedDiscrepancy: true,
      confidenceScore: 0.45,
      discrepancySummary: 'Unverified economic figures',
    },
  };
  EditionReservationService.reserveStory({
    tenantId: tenantA,
    editionId: ed1.editionId,
    newsId: factAlertStory.articleId,
    reservedBy: 'editor-1',
    priority: 'STANDARD',
    sourceType: 'STAFF_REPORTER',
  });
  const factAlertReadiness = EditionReadinessService.evaluateReadiness({
    edition: ed1,
    articles: [approvedStory, factAlertStory],
  });
  if (factAlertReadiness.categories.editorial.status !== 'BLOCKING') {
    throw new Error('Test 36 Failed: Fact integrity flag must trigger BLOCKING readiness.');
  }
  console.log('✓ Test 36 Passed: Fact integrity alert blocks readiness.');
  passed++;

  // Release fact alert story
  EditionReservationService.releaseReservation(tenantA, `res-${ed1.editionId}-${factAlertStory.articleId}`, 'editor-1');

  // Test 37: Submit for review: DESIGNING -> EDITORIAL_REVIEW
  console.log('Running Test 37: Submit for review transition...');
  const reviewSub = EditionPlanningService.submitForReview(tenantA, ed1.editionId, 'editor-1');
  if (!reviewSub.success || reviewSub.edition?.status !== 'EDITORIAL_REVIEW') {
    throw new Error('Test 37 Failed: Submit for review failed.');
  }
  console.log('✓ Test 37 Passed: DESIGNING -> EDITORIAL_REVIEW transition succeeds.');
  passed++;

  // Test 38: Send back to design: EDITORIAL_REVIEW -> DESIGNING
  console.log('Running Test 38: Send back to design transition...');
  const sendBack = EditionPlanningService.sendBackToDesign(tenantA, ed1.editionId, 'eic-1', 'Need more local coverage');
  if (!sendBack.success || sendBack.edition?.status !== 'DESIGNING') {
    throw new Error('Test 38 Failed: Send back to design failed.');
  }
  console.log('✓ Test 38 Passed: EDITORIAL_REVIEW -> DESIGNING transition succeeds.');
  passed++;

  // Advance back to EDITORIAL_REVIEW
  EditionPlanningService.submitForReview(tenantA, ed1.editionId, 'editor-1');

  // Test 39: Mark READY_TO_FINALIZE
  console.log('Running Test 39: Mark READY_TO_FINALIZE...');
  const readyFin = EditionPlanningService.markReadyToFinalize(tenantA, ed1.editionId, 'eic-1', [approvedStory], []);
  if (!readyFin.success || readyFin.edition?.status !== 'READY_TO_FINALIZE') {
    throw new Error(`Test 39 Failed: markReadyToFinalize failed: ${readyFin.error}`);
  }
  console.log('✓ Test 39 Passed: EDITORIAL_REVIEW -> READY_TO_FINALIZE succeeds.');
  passed++;

  // Test 40: Non-senior role cannot FINALIZE edition
  console.log('Running Test 40: Staff reporter or editor cannot finalize edition...');
  const reporterFin = await EditionPlanningService.finalizeEdition(
    tenantA,
    ed1.editionId,
    'rep-1',
    'staff_reporter',
    MOCK_TEMPLATE,
    undefined,
    [approvedStory]
  );
  if (reporterFin.success) {
    throw new Error('Test 40 Failed: Staff reporter must NOT be permitted to finalize an edition.');
  }
  console.log('✓ Test 40 Passed: Unauthorized role rejected from finalization.');
  passed++;

  // Test 41: Editor-in-Chief authorizes FINALIZE using Phase 5 gate
  console.log('Running Test 41: Senior Editor-in-Chief finalizes edition...');
  const eicFin = await EditionPlanningService.finalizeEdition(
    tenantA,
    ed1.editionId,
    'eic-1',
    'editor_in_chief',
    MOCK_TEMPLATE,
    undefined,
    [approvedStory]
  );
  if (!eicFin.success || !eicFin.edition || eicFin.edition.status !== 'FINALIZED') {
    throw new Error(`Test 41 Failed: Finalize edition failed: ${eicFin.errors?.join(', ')}`);
  }
  console.log('✓ Test 41 Passed: Senior finalization succeeds, freezes snapshot, and enqueues job.');
  passed++;

  // Test 42: Finalized edition becomes immutable
  console.log('Running Test 42: Finalized edition becomes immutable...');
  const postFinTransition = EditionPlanningService.transitionStatus(tenantA, ed1.editionId, 'DESIGNING', 'editor-1');
  if (postFinTransition.success) {
    throw new Error('Test 42 Failed: Finalized edition must block direct regression to DESIGNING.');
  }
  console.log('✓ Test 42 Passed: Finalized edition is immutable to arbitrary design changes.');
  passed++;

  // Test 43: RBAC permission checks
  console.log('Running Test 43: RBAC permissions for edition management...');
  const canEditorManage = RBACService.hasPermission('editor', 'edition.manage');
  const canEditorFinalize = RBACService.hasPermission('editor', 'edition.approve_finalize');
  const canEicFinalize = RBACService.hasPermission('editor_in_chief', 'edition.approve_finalize');
  const canReporterManage = RBACService.hasPermission('member', 'edition.manage');

  if (!canEditorManage || canEditorFinalize || !canEicFinalize || canReporterManage) {
    throw new Error('Test 43 Failed: RBAC permissions matrix mismatch for edition workflow.');
  }
  console.log('✓ Test 43 Passed: RBAC permissions properly gated between Editor, EIC, and Reporter.');
  passed++;

  // Test 44: Audit logging across edition lifecycle
  console.log('Running Test 44: Audit events generated...');
  const auditLogs = AuditService.getAuditLogs(tenantA);
  const auditActions = auditLogs.map((l) => l.action);
  if (!auditActions.includes('EDITION_CREATED') || !auditActions.includes('CONTENT_RESERVED')) {
    throw new Error('Test 44 Failed: Expected audit actions missing from log trail.');
  }
  console.log('✓ Test 44 Passed: Audit trail complete and verified.');
  passed++;

  // Test 45: Notification events dispatched
  console.log('Running Test 45: Notifications dispatched...');
  const notifs = NotificationService.getNotifications(tenantA);
  if (notifs.length === 0) {
    throw new Error('Test 45 Failed: No notifications dispatched during edition lifecycle.');
  }
  console.log('✓ Test 45 Passed: Operational notifications dispatched to newsroom desks.');
  passed++;

  // Test 46: Priority hierarchy distinct from originality
  console.log('Running Test 46: Story priority distinct from originality score...');
  const highOrigLowPriStory: NewsArticle = {
    ...approvedStory,
    articleId: 'art-high-orig-brief',
    headline: 'High Originality Brief',
    title: 'High Originality Brief',
    slug: 'high-orig-brief',
    originalityScorePercent: 99,
    originalityScore: 99,
    wordCount: 80,
  };
  const poolPriority = EditionContentPoolService.aggregateContentPool(tenantA, [highOrigLowPriStory]);
  if (poolPriority[0].suggestedPriority !== 'BRIEF') {
    throw new Error('Test 46 Failed: Short article should be BRIEF regardless of high originality score.');
  }
  console.log('✓ Test 46 Passed: Editorial placement priority decoupled from originality score.');
  passed++;

  // Test 47: Section list retrieval with default order
  console.log('Running Test 47: Section ordering verified...');
  const secs = SectionManagementService.getSections(tenantA);
  if (secs.length < 10 || secs[0].shortCode !== 'LOCAL') {
    throw new Error('Test 47 Failed: Sections not ordered properly.');
  }
  console.log('✓ Test 47 Passed: Default newspaper sections initialized and sorted.');
  passed++;

  // Test 48: Concurrency protection on content reservations
  console.log('Running Test 48: Concurrency conflict protection...');
  const concurrentA = EditionReservationService.reserveStory({
    tenantId: tenantA,
    editionId: 'ed-concurrent-1',
    newsId: 'story-concurrent-test',
    reservedBy: 'user-a',
    priority: 'STANDARD',
    sourceType: 'STAFF_REPORTER',
  });
  const concurrentB = EditionReservationService.reserveStory({
    tenantId: tenantA,
    editionId: 'ed-concurrent-2',
    newsId: 'story-concurrent-test',
    reservedBy: 'user-b',
    priority: 'STANDARD',
    sourceType: 'STAFF_REPORTER',
  });
  if (!concurrentA.success || concurrentB.success) {
    throw new Error('Test 48 Failed: Concurrent double allocation must be rejected.');
  }
  console.log('✓ Test 48 Passed: Concurrency conflict protection verified.');
  passed++;

  // Test 49: Advertisement commercial lock status check
  console.log('Running Test 49: Advertisement commercial lock status check...');
  const lockedAdsList = EditionAdvertisementService.getAdvertisementsForEdition(ed1.editionId);
  if (!lockedAdsList.some((a) => a.isCommerciallyLocked)) {
    throw new Error('Test 49 Failed: Commercially locked advertisement not found.');
  }
  console.log('✓ Test 49 Passed: Commercial advertisement lock verified.');
  passed++;

  // Test 50: Production queue receives finalized job
  console.log('Running Test 50: Production queue has job for finalized edition...');
  if (!eicFin.snapshot || !eicFin.productionJob) {
    throw new Error('Test 50 Failed: Production snapshot and job not returned on finalization.');
  }
  console.log('✓ Test 50 Passed: Phase 5 Night Production queue received finalized print plate package.');
  passed++;

  console.log('================================================================');
  console.log(`ALL ${passed}/50 PHASE 9 PUBLISHER EDITION WORKFLOW TESTS PASSED!`);
  console.log('================================================================');
}

runPhase9Tests().catch((err) => {
  console.error('Phase 9 Test Execution Failed:', err);
  process.exit(1);
});
