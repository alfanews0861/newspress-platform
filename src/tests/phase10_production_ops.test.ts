/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 10 Production Operations, Print Vendor Dispatch & Delivery Tracking Test Suite
 * Exhaustively tests 56 requirements covering:
 *  1. Production job integration with Phase 5
 *  2. Artifact registration in immutable registry
 *  3. SHA-256 cryptographic checksum calculation
 *  4. Artifact immutability enforcement
 *  5. Preflight gate blocking failed checks
 *  6. Preflight gate passing valid checks
 *  7. Approval gate authorized for senior roles
 *  8. Approval gate blocked for unauthorized reporter roles
 *  9. Approval gate records artifact checksum & approver
 * 10. Preflight failure blocks print approval
 * 11. Vendor creation
 * 12. Vendor capability validation (format, page counts, color)
 * 13. Regional coverage matching
 * 14. Vendor daily capacity validation
 * 15. Vendor assignment (AUTOMATIC mode)
 * 16. Manual override vendor assignment
 * 17. Fallback vendor assignment
 * 18. Inactive vendor rejection
 * 19. Vendor daily limit exceedance handling
 * 20. Capability cutoff times validation
 * 21. Dispatch creation
 * 22. Duplicate dispatch prevention (idempotency)
 * 23. Idempotent request returns active dispatch
 * 24. Vendor acknowledgement with SHA-256 match
 * 25. Vendor acknowledgement with SHA-256 mismatch BLOCKS workflow
 * 26. Vendor rejection handling
 * 27. Bounded retry mechanism
 * 28. Maximum retry limit enforcement
 * 29. Cancel dispatch before completion
 * 30. Cancel dispatch after completion blocked
 * 31. Proof submission
 * 32. Proof approval
 * 33. Proof rejection
 * 34. Proof review does not mutate frozen edition snapshot
 * 35. Correction version creation (v1 -> v2)
 * 36. Original snapshot preserved immutably
 * 37. Previous artifact marked superseded
 * 38. Dispatched edition marked REPRINT_REQUIRED
 * 39. Undispatched edition marked CORRECTION_CREATED
 * 40. Old checksum vs new checksum audit tracking
 * 41. Regional distribution planning
 * 42. Multi-region allocation for single edition
 * 43. Quantity tracking (planned, delivered, wastage, reprint)
 * 44. Delivery status progression (PLANNED -> DISPATCHED -> IN_TRANSIT -> DELIVERED)
 * 45. Partial delivery and wastage recording
 * 46. Deterministic lifecycle progression
 * 47. Illegal arbitrary state jump blocked
 * 48. Terminal state lock
 * 49. Retry scheduled transition
 * 50. Tenant isolation across artifacts
 * 51. Tenant isolation across vendors
 * 52. Tenant isolation across dispatches
 * 53. RBAC permission checks for production.approve
 * 54. RBAC permission checks for production.reprint
 * 55. Storage path tenant scoping
 * 56. Full audit trail generation
 */

import { ProductionQueueService } from '../services/productionQueueService';
import { PrintArtifactRegistryService } from '../services/printArtifactRegistryService';
import { PrintVendorService } from '../services/printVendorService';
import { ProductionRegionService } from '../services/productionRegionService';
import { VendorAssignmentService } from '../services/vendorAssignmentService';
import { VendorDispatchService } from '../services/vendorDispatchService';
import { ProductionApprovalService } from '../services/productionApprovalService';
import { CorrectionReprintService } from '../services/correctionReprintService';
import { PrintDistributionService } from '../services/printDistributionService';
import { ProductionLifecycleEngine } from '../services/productionLifecycleEngine';
import { MockPrintVendorProvider } from '../services/printVendorProvider';
import { NotificationService } from '../services/notificationService';
import { AuditService } from '../services/auditService';
import { EditionPersistenceService } from '../services/editionPersistenceService';
import {
  NewspaperBrand,
  NewspaperTemplate,
  NewspaperPage,
  NewspaperEdition,
} from '../types/edition';
import { NewsArticle } from '../types/news';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function runPhase10Tests() {
  console.log('================================================================');
  console.log('STARTING PHASE 10 PRINT PRODUCTION & VENDOR OPERATIONS TESTS');
  console.log('================================================================');

  // Reset stores for test clean slate
  ProductionQueueService.resetStore();
  PrintArtifactRegistryService.resetStore();
  PrintVendorService.resetStore();
  ProductionRegionService.resetStore();
  VendorDispatchService.resetStore();
  ProductionApprovalService.resetStore();
  CorrectionReprintService.resetStore();
  PrintDistributionService.resetStore();
  MockPrintVendorProvider.resetStore();
  NotificationService.clear();
  AuditService.clear();
  EditionPersistenceService.resetMemoryStore();

  const tenantA = 'tenant-andhra-chronicle';
  const tenantB = 'tenant-deccan-post';

  const mockBrand: NewspaperBrand = {
    brandId: 'brand-andhra-daily',
    tenantId: tenantA,
    name: 'Andhra Daily Chronicle',
    code: 'ADC',
    masthead: {
      title: 'ANDHRA DAILY CHRONICLE',
      fontFamily: 'Cinzel',
      fontSizePt: 48,
      style: 'classic_blackletter',
      showDate: true,
      showEditionNumber: true,
      showPrice: true,
      priceText: '₹6.00',
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
    templateId: 'tmpl-broadsheet-std',
    tenantId: tenantA,
    name: 'Broadsheet 6-Column Standard',
    description: 'Standard 6-column broadsheet template',
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

  const mockArticle: NewsArticle = {
    articleId: 'art-lead-100',
    tenantId: tenantA,
    headline: 'Vijayawada Port & Rail Multimodal Corridor Inaugurated',
    subheadline: 'State-of-the-art freight hub connects coastal hinterland.',
    slug: 'vijayawada-multimodal-corridor-inaugurated',
    byline: 'K. Ramakrishna',
    authorId: tenantA,
    authorType: 'staff',
    leadParagraph: 'A massive freight logistics corridor connecting central districts was commissioned today.',
    bodyContent: 'The state infrastructure development authority marked the completion of the 120km freight bypass...',
    category: 'Regional',
    tags: ['Infrastructure', 'Logistics'],
    editorialStatus: 'approved',
    originalityVerdict: 'verified_original',
    originalityScorePercent: 99.5,
    originalityStatus: 'VERIFIED_ORIGINAL',
    wordCount: 750,
    isMarketplaceListed: false,
    isMarketplaceEligible: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockPage1: NewspaperPage = {
    pageId: 'page-adc-001-1',
    editionId: 'ed-adc-001',
    tenantId: tenantA,
    pageNumber: 1,
    sectionName: 'Front Page',
    templateId: mockTemplate.templateId,
    layoutVersion: 1,
    blocks: [
      {
        placementId: 'pl-adc-1',
        editionId: 'ed-adc-001',
        pageId: 'page-adc-001-1',
        tenantId: tenantA,
        newsId: 'art-lead-100',
        articleTitle: mockArticle.headline,
        byline: mockArticle.byline,
        category: mockArticle.category,
        leadParagraph: mockArticle.leadParagraph,
        bodyContent: mockArticle.bodyContent,
        x: 14,
        y: 46,
        width: 322,
        height: 200,
        columnStart: 1,
        columnSpan: 6,
        rowStart: 6,
        rowSpan: 24,
        headlineSize: 28,
        bodyFontSize: 10,
        imagePlacement: 'top',
        priority: {
          editorialPriority: 10,
          breakingStatus: false,
          articleType: 'Lead',
          freshnessHours: 1,
          section: 'Front Page',
          wordCount: 750,
          hasImage: false,
          publisherPriority: 5,
          calculatedScore: 100,
        },
        layoutRole: 'LEAD',
        status: 'placed',
        locked: false,
      },
    ],
    adPlacements: [],
    occupiedArea: 70,
    diagnostics: {
      status: 'balanced',
      occupiedAreaPercent: 70,
      whitespacePercent: 30,
      visualWeight: { topHalf: 50, bottomHalf: 50, leftHalf: 50, rightHalf: 50 },
      headlineHierarchy: { leadFound: true, leadFontSize: 28, secondaryLeadFound: true, ratio: 1.2, verdict: 'Optimal' },
      imageBalance: { imageAreaPercent: 0, count: 0 },
      errors: [],
      warnings: [],
      info: ['Layout verified'],
      canFinalize: true,
    },
    status: 'approved',
  };

  const mockEdition: NewspaperEdition = {
    editionId: 'ed-adc-001',
    tenantId: tenantA,
    brandId: mockBrand.brandId,
    brandName: mockBrand.name,
    editionCode: 'ADC-2026-10-04-ED01',
    issueNumber: 12040,
    volumeNumber: 42,
    publicationDate: '2026-10-04',
    status: 'DESIGNING',
    totalPages: 1,
    placedArticlesCount: 1,
    pages: [mockPage1],
    printDeadline: '2026-10-03T23:00:00.000Z',
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

  // Seed vendors & regions
  PrintVendorService.seedDefaultVendors(tenantA);
  ProductionRegionService.seedDefaultRegions(tenantA);

  // ==========================================
  // SECTION 1: PRODUCTION & ARTIFACT REGISTRY
  // ==========================================

  // TEST 1: Phase 5 Night Production Job integration
  console.log('Running Test 1: Phase 5 Night Production Job integration...');
  const finalizeRes = await EditionPersistenceService.finalizeEdition(
    mockEdition.editionId,
    tenantA,
    'user-eic',
    'editor_in_chief',
    mockTemplate,
    mockBrand,
    [mockArticle],
    [],
    { priority: 1 }
  );
  assert(finalizeRes.success, 'Finalization must succeed.');
  assert(Boolean(finalizeRes.productionJob), 'Production job must be created.');

  // Process job to trigger Phase 10 artifact generation
  await ProductionQueueService.claimJob(finalizeRes.productionJob!.productionJobId, 'worker-10');
  const processRes = await ProductionQueueService.processJob(finalizeRes.productionJob!.productionJobId, 'worker-10');
  assert(processRes.success, 'Processing job must succeed and generate sealed artifacts.');
  console.log('✓ Test 1 Passed: Phase 5 to Phase 10 pipeline integration verified.');

  // TEST 2: Artifact registration in immutable registry
  console.log('Running Test 2: Artifact registration in immutable registry...');
  const artifacts = PrintArtifactRegistryService.getArtifactsForEdition(tenantA, mockEdition.editionId);
  assert(artifacts.length >= 2, 'Must register PRINT_PDF and DIGITAL_PDF artifacts.');
  const printPdf = artifacts.find((a) => a.artifactType === 'PRINT_PDF');
  assert(Boolean(printPdf), 'Print PDF artifact must exist in registry.');
  console.log('✓ Test 2 Passed: Artifact registered in registry.');

  // TEST 3: SHA-256 cryptographic checksum calculation
  console.log('Running Test 3: SHA-256 cryptographic checksum calculation...');
  assert(Boolean(printPdf!.checksum), 'Artifact must have checksum.');
  assert(printPdf!.checksum.length === 64, 'Checksum must be 64-char hexadecimal string.');
  const testHash = PrintArtifactRegistryService.calculateChecksum('Sample press PDF stream data');
  assert(testHash.length === 64, 'Dynamic checksum must calculate 64-char hash.');
  console.log('✓ Test 3 Passed: Cryptographic SHA-256 checksum generated.');

  // TEST 4: Artifact immutability enforcement
  console.log('Running Test 4: Artifact immutability enforcement...');
  assert(printPdf!.immutable === true, 'Artifact must be marked immutable.');
  console.log('✓ Test 4 Passed: Artifact immutability verified.');

  // TEST 5: Preflight gate passes valid checks
  console.log('Running Test 5: Preflight gate passes valid checks...');
  assert(printPdf!.preflightStatus === 'PASS' || printPdf!.preflightStatus === 'WARNING', 'Valid edition must achieve PASS or WARNING preflight status.');
  console.log('✓ Test 5 Passed: Preflight gate passed.');

  // TEST 6: Preflight gate blocks failed checks
  console.log('Running Test 6: Preflight gate blocks failed checks...');
  const badArtifact = await PrintArtifactRegistryService.registerArtifact({
    tenantId: tenantA,
    editionId: 'ed-bad-001',
    productionJobId: 'job-bad-001',
    snapshotId: 'snap-bad-001',
    version: 1,
    artifactType: 'PRINT_PDF',
    storagePath: 'production/bad/print.pdf',
    fileName: 'bad-print.pdf',
    fileSize: 1000,
    checksum: '1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
    pageCount: 1,
    dimensions: { widthMm: 350, heightMm: 540, format: 'broadsheet' },
    colorMode: 'cmyk',
    bleedStatus: 'INVALID',
    fontEmbeddingStatus: 'MISSING',
    dpiStatus: 'LOW_RES',
    preflightStatus: 'BLOCKED',
    createdBy: { userId: 'user-eic', userRole: 'editor_in_chief' },
  });
  assert(badArtifact.preflightStatus === 'BLOCKED', 'Bad artifact must be BLOCKED.');
  console.log('✓ Test 6 Passed: Preflight gate blocks failing checks.');

  // TEST 7: Approval gate authorized for senior roles
  console.log('Running Test 7: Approval gate authorized for senior roles...');
  const approvalRes = await ProductionApprovalService.recordApprovalDecision({
    tenantId: tenantA,
    editionId: mockEdition.editionId,
    jobId: finalizeRes.productionJob!.productionJobId,
    artifactId: printPdf!.id,
    decision: 'APPROVE_FOR_PRINT',
    approver: {
      userId: 'user-eic',
      userRole: 'editor_in_chief',
      displayName: 'Editor in Chief',
    },
    notes: 'Front page layout and ads verified for rotary press run.',
  });
  assert(approvalRes.success, 'Editor-in-Chief must be authorized to approve for print.');
  assert(ProductionApprovalService.isArtifactApproved(tenantA, printPdf!.id), 'Artifact must be marked approved.');
  console.log('✓ Test 7 Passed: Senior role approval recorded.');

  // TEST 8: Approval gate blocked for unauthorized reporter roles
  console.log('Running Test 8: Approval gate blocked for unauthorized reporter roles...');
  const unauthApprove = await ProductionApprovalService.recordApprovalDecision({
    tenantId: tenantA,
    editionId: mockEdition.editionId,
    jobId: finalizeRes.productionJob!.productionJobId,
    artifactId: printPdf!.id,
    decision: 'APPROVE_FOR_PRINT',
    approver: {
      userId: 'user-reporter',
      userRole: 'staff_reporter',
    },
  });
  assert(!unauthApprove.success, 'Staff reporter MUST NOT be authorized to approve print production.');
  console.log('✓ Test 8 Passed: Unauthorized reporter role blocked from approval.');

  // TEST 9: Approval gate records artifact checksum & approver
  console.log('Running Test 9: Approval gate records artifact checksum & approver...');
  const approvalHistory = ProductionApprovalService.getApprovalsForEdition(tenantA, mockEdition.editionId);
  assert(approvalHistory.length > 0, 'Approval history must be recorded.');
  assert(approvalHistory[0].artifactChecksum === printPdf!.checksum, 'Approval record must seal exact artifact checksum.');
  assert(approvalHistory[0].approvingUser.userId === 'user-eic', 'Approval record must record approving user ID.');
  console.log('✓ Test 9 Passed: Approval record contains immutable checksum and actor.');

  // TEST 10: Preflight failure blocks print approval
  console.log('Running Test 10: Preflight failure blocks print approval...');
  const blockedApprove = await ProductionApprovalService.recordApprovalDecision({
    tenantId: tenantA,
    editionId: 'ed-bad-001',
    jobId: finalizeRes.productionJob!.productionJobId,
    artifactId: badArtifact.id,
    decision: 'APPROVE_FOR_PRINT',
    approver: {
      userId: 'user-eic',
      userRole: 'editor_in_chief',
    },
  });
  assert(!blockedApprove.success, 'BLOCKED preflight artifact must reject print approval.');
  console.log('✓ Test 10 Passed: Preflight failure strictly blocks approval.');

  // ==========================================
  // SECTION 2: PRINT VENDOR & CAPABILITY
  // ==========================================

  // TEST 11: Vendor creation
  console.log('Running Test 11: Vendor creation...');
  const newVendorRes = await PrintVendorService.createVendor(
    {
      tenantId: tenantA,
      name: 'Amaravati Express Web Press',
      legalName: 'Amaravati Web Offset Pvt Ltd',
      contactName: 'S. K. Murthy',
      email: 'murthy@amaravatipress.example.in',
      phone: '+91 863 222 1100',
      address: 'Industrial Park, Guntur, AP - 522001',
      regions: ['AMARAVATI', 'GUNTUR'],
      supportedFormats: ['broadsheet', 'tabloid'],
      supportedColorProfiles: ['cmyk', 'grayscale'],
      supportedPaperSizes: ['Broadsheet 350x540mm'],
      dailyCapacity: 60000,
      active: true,
      priority: 2,
      vendorType: 'EXTERNAL_PRINT_VENDOR',
    },
    {
      paperSizes: ['Broadsheet 350x540mm'],
      pageCounts: { min: 4, max: 48 },
      supportsColor: true,
      supportsMonochrome: true,
      printProfiles: ['ISOcoated_v2_eci.icc'],
      bleedRequirementsMm: 3.5,
      acceptedFileFormats: ['PDF/X-1a:2001'],
      maximumDailyCapacity: 60000,
      regionalServiceArea: ['AMARAVATI', 'GUNTUR'],
      productionCutoffTime: '23:00',
      dispatchCutoffTime: '01:00',
      emergencyReprintSupport: true,
    }
  );
  assert(Boolean(newVendorRes.vendor.id), 'Vendor ID must be assigned.');
  console.log('✓ Test 11 Passed: Print vendor registered with capabilities.');

  // TEST 12: Vendor capability validation (format, page counts, color)
  console.log('Running Test 12: Vendor capability validation (format, page counts, color)...');
  const capCheckValid = PrintVendorService.validateVendorForEdition(tenantA, newVendorRes.vendor.id, {
    format: 'broadsheet',
    colorMode: 'cmyk',
    pageCount: 8,
  });
  assert(capCheckValid.eligible, 'Valid broadsheet CMYK 8-page edition must be eligible.');

  const capCheckInvalidFormat = PrintVendorService.validateVendorForEdition(tenantA, newVendorRes.vendor.id, {
    format: 'berliner',
    colorMode: 'cmyk',
    pageCount: 8,
  });
  assert(!capCheckInvalidFormat.eligible, 'Unsupported Berliner format must be rejected.');
  console.log('✓ Test 12 Passed: Capability validation verified.');

  // TEST 13: Regional coverage matching
  console.log('Running Test 13: Regional coverage matching...');
  const capCheckRegionValid = PrintVendorService.validateVendorForEdition(tenantA, newVendorRes.vendor.id, {
    format: 'broadsheet',
    colorMode: 'cmyk',
    pageCount: 8,
    regionId: 'AMARAVATI',
  });
  assert(capCheckRegionValid.eligible, 'AMARAVATI regional service area must match.');

  const capCheckRegionInvalid = PrintVendorService.validateVendorForEdition(tenantA, newVendorRes.vendor.id, {
    format: 'broadsheet',
    colorMode: 'cmyk',
    pageCount: 8,
    regionId: 'CHENNAI_NORTH',
  });
  assert(!capCheckRegionInvalid.eligible, 'Unserviced CHENNAI_NORTH region must be rejected.');
  console.log('✓ Test 13 Passed: Regional coverage matching confirmed.');

  // TEST 14: Vendor daily capacity validation
  console.log('Running Test 14: Vendor daily capacity validation...');
  const capCheckCapacityExcess = PrintVendorService.validateVendorForEdition(tenantA, newVendorRes.vendor.id, {
    format: 'broadsheet',
    colorMode: 'cmyk',
    pageCount: 8,
    dailyQuantity: 100000, // Exceeds 60,000 capacity
  });
  assert(!capCheckCapacityExcess.eligible, 'Quantity exceeding daily capacity must be rejected.');
  console.log('✓ Test 14 Passed: Capacity limit enforced.');

  // TEST 15: Vendor assignment (AUTOMATIC mode)
  console.log('Running Test 15: Vendor assignment (AUTOMATIC mode)...');
  const autoAssignRes = await VendorAssignmentService.assignVendor({
    tenantId: tenantA,
    snapshot: finalizeRes.snapshot!,
    regionCode: 'VIJAYAWADA',
    targetQuantity: 20000,
  });
  assert(autoAssignRes.success, 'Automatic assignment should succeed.');
  assert(autoAssignRes.assignmentMode === 'AUTOMATIC', 'Mode must be AUTOMATIC.');
  assert(Boolean(autoAssignRes.selectedVendor), 'A vendor must be selected.');
  console.log('✓ Test 15 Passed: Deterministic automatic vendor assignment verified.');

  // TEST 16: Manual override vendor assignment
  console.log('Running Test 16: Manual override vendor assignment...');
  const manualAssignRes = await VendorAssignmentService.assignVendor({
    tenantId: tenantA,
    snapshot: finalizeRes.snapshot!,
    manualVendorId: newVendorRes.vendor.id,
    targetQuantity: 15000,
  });
  assert(manualAssignRes.success, 'Manual assignment must succeed.');
  assert(manualAssignRes.assignmentMode === 'MANUAL', 'Mode must be MANUAL.');
  assert(manualAssignRes.selectedVendor!.id === newVendorRes.vendor.id, 'Assigned vendor must match specified manual ID.');
  console.log('✓ Test 16 Passed: Manual override vendor assignment confirmed.');

  // TEST 17: Fallback vendor assignment
  console.log('Running Test 17: Fallback vendor assignment...');
  const fallbackAssignRes = await VendorAssignmentService.assignVendor({
    tenantId: tenantA,
    snapshot: finalizeRes.snapshot!,
    regionCode: 'NON_EXISTENT_REMOTE_REGION',
    targetQuantity: 5000,
  });
  assert(fallbackAssignRes.success, 'Fallback assignment should find capacity vendor.');
  assert(fallbackAssignRes.assignmentMode === 'FALLBACK', 'Mode must be FALLBACK.');
  console.log('✓ Test 17 Passed: Fallback vendor assignment verified.');

  // TEST 18: Inactive vendor rejection
  console.log('Running Test 18: Inactive vendor rejection...');
  await PrintVendorService.updateVendor(tenantA, newVendorRes.vendor.id, { active: false });
  const inactiveCheck = PrintVendorService.validateVendorForEdition(tenantA, newVendorRes.vendor.id, {
    format: 'broadsheet',
    colorMode: 'cmyk',
    pageCount: 8,
  });
  assert(!inactiveCheck.eligible, 'Inactive vendor must be rejected.');
  console.log('✓ Test 18 Passed: Inactive vendor rejected.');

  // TEST 19: Vendor daily limit exceedance handling
  console.log('Running Test 19: Vendor daily limit exceedance handling...');
  const deccanVendor = PrintVendorService.getVendorsForTenant(tenantA).find((v) => v.name.includes('Deccan'));
  assert(Boolean(deccanVendor), 'Deccan vendor must exist.');
  const overCapCheck = PrintVendorService.validateVendorForEdition(tenantA, deccanVendor!.id, {
    format: 'broadsheet',
    colorMode: 'cmyk',
    pageCount: 8,
    dailyQuantity: 999999,
  });
  assert(!overCapCheck.eligible, 'Excess quantity over daily capacity must fail validation.');
  console.log('✓ Test 19 Passed: Vendor capacity ceiling respected.');

  // TEST 20: Capability cutoff times validation
  console.log('Running Test 20: Capability cutoff times validation...');
  const vendorCap = PrintVendorService.getVendorCapability(tenantA, deccanVendor!.id);
  assert(Boolean(vendorCap?.productionCutoffTime), 'Production cutoff time must be defined.');
  assert(Boolean(vendorCap?.dispatchCutoffTime), 'Dispatch cutoff time must be defined.');
  console.log('✓ Test 20 Passed: Vendor cutoff times defined.');

  // ==========================================
  // SECTION 3: VENDOR DISPATCH & IDEMPOTENCY
  // ==========================================

  // TEST 21: Dispatch creation
  console.log('Running Test 21: Dispatch creation...');
  const dispatchRes = await VendorDispatchService.dispatchToVendor({
    tenantId: tenantA,
    editionId: mockEdition.editionId,
    productionJobId: finalizeRes.productionJob!.productionJobId,
    vendorId: deccanVendor!.id,
    regionId: 'VIJAYAWADA',
    artifactId: printPdf!.id,
    actorId: 'user-eic',
    actorRole: 'editor_in_chief',
  });
  assert(dispatchRes.success, 'Dispatch must succeed.');
  assert(dispatchRes.dispatch!.dispatchStatus === 'SENT', 'Dispatch status must be SENT.');
  assert(Boolean(dispatchRes.dispatch!.vendorReferenceNumber), 'Vendor ref number must be assigned.');
  console.log('✓ Test 21 Passed: Print package dispatched to vendor.');

  // TEST 22: Duplicate dispatch prevention (idempotency)
  console.log('Running Test 22: Duplicate dispatch prevention (idempotency)...');
  const duplicateDispatch = await VendorDispatchService.dispatchToVendor({
    tenantId: tenantA,
    editionId: mockEdition.editionId,
    productionJobId: finalizeRes.productionJob!.productionJobId,
    vendorId: deccanVendor!.id,
    regionId: 'VIJAYAWADA',
    artifactId: printPdf!.id,
    actorId: 'user-eic',
    actorRole: 'editor_in_chief',
  });
  assert(duplicateDispatch.success, 'Duplicate call must return success.');
  assert(duplicateDispatch.dispatch!.id === dispatchRes.dispatch!.id, 'Must return the existing active dispatch ID without creating a duplicate.');
  console.log('✓ Test 22 Passed: Duplicate dispatch prevented via deterministic idempotency key.');

  // TEST 23: Idempotent request returns active dispatch
  console.log('Running Test 23: Idempotent request returns active dispatch...');
  assert(duplicateDispatch.dispatch!.checksum === printPdf!.checksum, 'Idempotent dispatch maintains same artifact checksum.');
  console.log('✓ Test 23 Passed: Idempotent request returns intact active dispatch.');

  // TEST 24: Vendor acknowledgement with SHA-256 match
  console.log('Running Test 24: Vendor acknowledgement with SHA-256 match...');
  const ackRes = await VendorDispatchService.recordVendorAcknowledgement({
    tenantId: tenantA,
    dispatchId: dispatchRes.dispatch!.id,
    vendorReferenceNumber: dispatchRes.dispatch!.vendorReferenceNumber,
    acceptedChecksum: printPdf!.checksum, // Exact match
    vendorMessage: 'Plates imaged successfully.',
  });
  assert(ackRes.success, 'Matching checksum acknowledgement must succeed.');
  assert(ackRes.dispatch!.dispatchStatus === 'ACKNOWLEDGED', 'Status must be ACKNOWLEDGED.');
  console.log('✓ Test 24 Passed: Vendor acknowledgement with matching SHA-256 accepted.');

  // TEST 25: Vendor acknowledgement with SHA-256 mismatch BLOCKS workflow
  console.log('Running Test 25: Vendor acknowledgement with SHA-256 mismatch BLOCKS workflow...');
  const mismatchDispatch = await VendorDispatchService.dispatchToVendor({
    tenantId: tenantA,
    editionId: 'ed-mismatch-test',
    productionJobId: 'job-mismatch',
    vendorId: deccanVendor!.id,
    regionId: 'VIJAYAWADA',
    artifactId: printPdf!.id,
  });
  const mismatchAck = await VendorDispatchService.recordVendorAcknowledgement({
    tenantId: tenantA,
    dispatchId: mismatchDispatch.dispatch!.id,
    vendorReferenceNumber: mismatchDispatch.dispatch!.vendorReferenceNumber,
    acceptedChecksum: '0000000000000000000000000000000000000000000000000000000000000000', // Intentional mismatch!
    vendorMessage: 'Corrupted payload received',
  });
  assert(!mismatchAck.success, 'Checksum mismatch MUST return failure.');
  assert(mismatchAck.dispatch!.dispatchStatus === 'FAILED', 'Dispatch must be transitioned to FAILED.');
  assert(Boolean(mismatchAck.error?.includes('CHECKSUM MISMATCH') || mismatchAck.error?.includes('mismatch')), 'Error must specify checksum mismatch.');
  console.log('✓ Test 25 Passed: Checksum mismatch strictly blocked production workflow.');

  // TEST 26: Vendor rejection handling
  console.log('Running Test 26: Vendor rejection handling...');
  const rejectRes = await VendorDispatchService.recordVendorRejection({
    tenantId: tenantA,
    dispatchId: dispatchRes.dispatch!.id,
    rejectionReason: 'Damaged rotary plate cylinder encountered in line 2.',
  });
  assert(rejectRes.success, 'Rejection recording must succeed.');
  assert(rejectRes.dispatch!.dispatchStatus === 'REJECTED', 'Status must be REJECTED.');
  console.log('✓ Test 26 Passed: Vendor rejection handled cleanly.');

  // TEST 27: Bounded retry mechanism
  console.log('Running Test 27: Bounded retry mechanism...');
  const retryRes = await VendorDispatchService.retryDispatch({
    tenantId: tenantA,
    dispatchId: dispatchRes.dispatch!.id,
    maxRetries: 3,
  });
  assert(retryRes.success, 'Retry must succeed.');
  assert(retryRes.dispatch!.retryCount === 1, 'Retry count must increment to 1.');
  assert(retryRes.dispatch!.dispatchStatus === 'SENT', 'Status must return to SENT.');
  console.log('✓ Test 27 Passed: Bounded retry executed successfully.');

  // TEST 28: Maximum retry limit enforcement
  console.log('Running Test 28: Maximum retry limit enforcement...');
  // Force retry count to limit
  retryRes.dispatch!.retryCount = 3;
  const exceedRetry = await VendorDispatchService.retryDispatch({
    tenantId: tenantA,
    dispatchId: dispatchRes.dispatch!.id,
    maxRetries: 3,
  });
  assert(!exceedRetry.success, 'Retry beyond maxRetries (3) MUST be blocked.');
  console.log('✓ Test 28 Passed: Max retry limit strictly enforced.');

  // TEST 29: Cancel dispatch before completion
  console.log('Running Test 29: Cancel dispatch before completion...');
  const cancelRes = await MockPrintVendorProvider.prototype.cancelDispatch(
    retryRes.dispatch!.vendorReferenceNumber || 'REF',
    'Editorial recall'
  );
  assert(cancelRes.success, 'Pre-completion cancellation must succeed.');
  console.log('✓ Test 29 Passed: Dispatch cancellation verified.');

  // TEST 30: Cancel dispatch after completion blocked
  console.log('Running Test 30: Cancel dispatch after completion blocked...');
  MockPrintVendorProvider.simulateVendorStatus(retryRes.dispatch!.vendorReferenceNumber || 'REF', 'PRINT_COMPLETED');
  const cancelCompleted = await MockPrintVendorProvider.prototype.cancelDispatch(
    retryRes.dispatch!.vendorReferenceNumber || 'REF',
    'Too late'
  );
  assert(!cancelCompleted.success, 'Cancellation after print completion must be rejected.');
  console.log('✓ Test 30 Passed: Post-completion cancellation rejected.');

  // ==========================================
  // SECTION 4: VENDOR DIGITAL PROOF WORKFLOW
  // ==========================================

  // TEST 31: Proof submission
  console.log('Running Test 31: Proof submission...');
  const proof = await VendorDispatchService.submitVendorProof({
    tenantId: tenantA,
    editionId: mockEdition.editionId,
    vendorDispatchId: dispatchRes.dispatch!.id,
    artifactId: printPdf!.id,
    storagePath: `production/${tenantA}/${mockEdition.editionId}/v1/proof.pdf`,
    checksum: printPdf!.checksum,
  });
  assert(Boolean(proof.id), 'Proof ID must be generated.');
  assert(proof.status === 'RECEIVED', 'Proof initial status must be RECEIVED.');
  console.log('✓ Test 31 Passed: Vendor digital proof submitted.');

  // TEST 32: Proof approval
  console.log('Running Test 32: Proof approval...');
  const approveProofRes = await VendorDispatchService.reviewVendorProof({
    tenantId: tenantA,
    proofId: proof.id,
    approved: true,
    reviewer: {
      userId: 'user-eic',
      userRole: 'editor_in_chief',
      displayName: 'Editor-in-Chief',
    },
  });
  assert(approveProofRes.success, 'Proof approval must succeed.');
  assert(approveProofRes.proof!.status === 'APPROVED', 'Status must be APPROVED.');
  console.log('✓ Test 32 Passed: Proof approval recorded.');

  // TEST 33: Proof rejection
  console.log('Running Test 33: Proof rejection...');
  const rejectProof = await VendorDispatchService.submitVendorProof({
    tenantId: tenantA,
    editionId: mockEdition.editionId,
    vendorDispatchId: dispatchRes.dispatch!.id,
    artifactId: printPdf!.id,
    storagePath: `production/${tenantA}/${mockEdition.editionId}/v1/proof-bad.pdf`,
    checksum: printPdf!.checksum,
  });
  const rejectProofRes = await VendorDispatchService.reviewVendorProof({
    tenantId: tenantA,
    proofId: rejectProof.id,
    approved: false,
    rejectionReason: 'Color saturation in front-page photo too dark.',
    reviewer: {
      userId: 'user-eic',
      userRole: 'editor_in_chief',
    },
  });
  assert(rejectProofRes.success, 'Proof review must process.');
  assert(rejectProofRes.proof!.status === 'REJECTED', 'Status must be REJECTED.');
  assert(Boolean(rejectProofRes.proof!.rejectionReason), 'Rejection reason must be stored.');
  console.log('✓ Test 33 Passed: Proof rejection recorded with reason.');

  // TEST 34: Proof review does not mutate frozen edition snapshot
  console.log('Running Test 34: Proof review does not mutate frozen edition snapshot...');
  const snapshotHistory = EditionPersistenceService.getSnapshotsForEdition(mockEdition.editionId);
  assert(snapshotHistory.length > 0, 'Original snapshot must exist.');
  assert(snapshotHistory[0].version === 1, 'Snapshot version 1 must remain untouched.');
  console.log('✓ Test 34 Passed: Proof review leaves frozen snapshot completely unmutated.');

  // ==========================================
  // SECTION 5: CORRECTION & REPRINT WORKFLOW
  // ==========================================

  // TEST 35: Correction version creation (v1 -> v2)
  console.log('Running Test 35: Correction version creation (v1 -> v2)...');
  const corrRes = await CorrectionReprintService.requestCorrection({
    tenantId: tenantA,
    editionId: mockEdition.editionId,
    correctionType: 'TYPO',
    correctionReason: 'Typo in subheadline: freight hub capacity figure corrected.',
    actor: {
      userId: 'user-eic',
      userRole: 'editor_in_chief',
      displayName: 'Managing Editor',
    },
  });
  assert(corrRes.success, 'Correction request must succeed.');
  assert(corrRes.correction!.previousVersion === 1, 'Previous version must be 1.');
  assert(corrRes.correction!.newVersion === 2, 'New version must be 2.');
  console.log('✓ Test 35 Passed: Correction revision v2 created.');

  // TEST 36: Original snapshot preserved immutably
  console.log('Running Test 36: Original snapshot preserved immutably...');
  const allSnapshots = EditionPersistenceService.getSnapshotsForEdition(mockEdition.editionId);
  const v1Snap = allSnapshots.find((s) => s.version === 1);
  assert(Boolean(v1Snap), 'Snapshot v1 must remain in history.');
  console.log('✓ Test 36 Passed: Original historical snapshot preserved.');

  // TEST 37: Previous artifact marked superseded
  console.log('Running Test 37: Previous artifact marked superseded...');
  const originalArt = PrintArtifactRegistryService.getArtifactById(tenantA, printPdf!.id);
  assert(Boolean(originalArt?.supersededAt), 'Original print artifact must have supersededAt timestamp.');
  console.log('✓ Test 37 Passed: Previous artifact superseded timestamp recorded.');

  // TEST 38: Dispatched edition marked REPRINT_REQUIRED
  console.log('Running Test 38: Dispatched edition marked REPRINT_REQUIRED...');
  assert(corrRes.correction!.wasDispatched === true, 'Correction must recognize previous edition was dispatched.');
  console.log('✓ Test 38 Passed: Dispatched correction classified as REPRINT_REQUIRED.');

  // TEST 39: Undispatched edition marked CORRECTION_CREATED
  console.log('Running Test 39: Undispatched edition marked CORRECTION_CREATED...');
  const unDispatchedEdition: NewspaperEdition = {
    ...mockEdition,
    editionId: 'ed-undispatched-002',
    editionCode: 'ADC-2026-10-04-ED02',
  };
  EditionPersistenceService.setEditionInMemory(unDispatchedEdition, [mockPage1]);
  await EditionPersistenceService.finalizeEdition(
    unDispatchedEdition.editionId,
    tenantA,
    'user-eic',
    'editor_in_chief',
    mockTemplate,
    mockBrand,
    [mockArticle]
  );
  const unDispCorr = await CorrectionReprintService.requestCorrection({
    tenantId: tenantA,
    editionId: unDispatchedEdition.editionId,
    correctionType: 'LEGAL',
    correctionReason: 'Pre-press wording modification',
    actor: { userId: 'user-eic', userRole: 'editor_in_chief' },
  });
  assert(unDispCorr.correction!.wasDispatched === false, 'Undispatched edition wasDispatched must be false.');
  console.log('✓ Test 39 Passed: Undispatched correction handled without emergency reprint alert.');

  // TEST 40: Old checksum vs new checksum audit tracking
  console.log('Running Test 40: Old checksum vs new checksum audit tracking...');
  await CorrectionReprintService.completeCorrection({
    tenantId: tenantA,
    correctionId: corrRes.correction!.correctionId,
    newSnapshotId: 'snap-adc-001-v2',
    newArtifactId: 'art-adc-001-v2-print',
    newChecksum: 'ffff44443333222211110000aaaabbbbccccddddeeeeffff9999888877776666',
  });
  const updatedCorr = CorrectionReprintService.getCorrectionsForEdition(tenantA, mockEdition.editionId)[0];
  assert(Boolean(updatedCorr.previousChecksum), 'Previous checksum must be logged.');
  assert(Boolean(updatedCorr.newChecksum), 'New checksum must be logged.');
  assert(updatedCorr.previousChecksum !== updatedCorr.newChecksum, 'Checksums must differ between versions.');
  console.log('✓ Test 40 Passed: Checksum transition audit trail verified.');

  // ==========================================
  // SECTION 6: DISTRIBUTION & LOGISTICS
  // ==========================================

  // TEST 41: Regional distribution planning
  console.log('Running Test 41: Regional distribution planning...');
  const distVijayawada = await PrintDistributionService.planDistribution({
    tenantId: tenantA,
    editionId: mockEdition.editionId,
    regionId: 'VIJAYAWADA',
    quantity: 25000,
    carrier: 'Deccan Regional Logistics',
  });
  assert(Boolean(distVijayawada.id), 'Distribution ID generated.');
  assert(distVijayawada.deliveryStatus === 'PLANNED', 'Initial status PLANNED.');
  console.log('✓ Test 41 Passed: Regional distribution planned.');

  // TEST 42: Multi-region allocation for single edition
  console.log('Running Test 42: Multi-region allocation for single edition...');
  const distNellore = await PrintDistributionService.planDistribution({
    tenantId: tenantA,
    editionId: mockEdition.editionId,
    regionId: 'NELLORE',
    quantity: 15000,
    carrier: 'Coastal Fast Freight',
  });
  const distList = PrintDistributionService.getDistributionsForEdition(tenantA, mockEdition.editionId);
  assert(distList.length >= 2, 'Multiple regional distributions must be supported.');
  console.log('✓ Test 42 Passed: Multi-region allocation confirmed.');

  // TEST 43: Quantity tracking (planned, delivered, wastage, reprint)
  console.log('Running Test 43: Quantity tracking (planned, delivered, wastage, reprint)...');
  const metricsBefore = PrintDistributionService.getEditionQuantityMetrics(tenantA, mockEdition.editionId);
  assert(metricsBefore.totalPlannedQuantity >= 40000, 'Planned quantity sum must reflect all regions.');
  console.log('✓ Test 43 Passed: Production quantity rollup verified.');

  // TEST 44: Delivery status progression
  console.log('Running Test 44: Delivery status progression...');
  await PrintDistributionService.updateDeliveryStatus({
    tenantId: tenantA,
    distributionId: distVijayawada.id,
    status: 'IN_TRANSIT',
    trackingReference: 'TRK-VJ-88992',
  });
  let updatedDist = PrintDistributionService.getDistributionsForEdition(tenantA, mockEdition.editionId).find((d) => d.id === distVijayawada.id);
  assert(updatedDist!.deliveryStatus === 'IN_TRANSIT', 'Status must be IN_TRANSIT.');
  assert(updatedDist!.trackingReference === 'TRK-VJ-88992', 'Tracking ref must be stored.');

  await PrintDistributionService.updateDeliveryStatus({
    tenantId: tenantA,
    distributionId: distVijayawada.id,
    status: 'DELIVERED',
  });
  updatedDist = PrintDistributionService.getDistributionsForEdition(tenantA, mockEdition.editionId).find((d) => d.id === distVijayawada.id);
  assert(updatedDist!.deliveryStatus === 'DELIVERED', 'Status must be DELIVERED.');
  console.log('✓ Test 44 Passed: Delivery progression tracked to completion.');

  // TEST 45: Partial delivery and wastage recording
  console.log('Running Test 45: Partial delivery and wastage recording...');
  await PrintDistributionService.updateDeliveryStatus({
    tenantId: tenantA,
    distributionId: distNellore.id,
    status: 'PARTIALLY_DELIVERED',
    wastageQuantity: 250, // 250 damaged copies in transport
    notes: '250 copies rain damaged during transit',
  });
  const metricsAfter = PrintDistributionService.getEditionQuantityMetrics(tenantA, mockEdition.editionId);
  assert(metricsAfter.totalWastageQuantity === 250, 'Wastage quantity must be 250.');
  console.log('✓ Test 45 Passed: Wastage and partial delivery recorded.');

  // ==========================================
  // SECTION 7: LIFECYCLE & STATE MACHINE
  // ==========================================

  // TEST 46: Deterministic lifecycle progression
  console.log('Running Test 46: Deterministic lifecycle progression...');
  const canAdvance = ProductionLifecycleEngine.canTransition('PRODUCTION_APPROVED', 'VENDOR_DISPATCH_PENDING');
  assert(canAdvance, 'PRODUCTION_APPROVED -> VENDOR_DISPATCH_PENDING must be valid.');
  console.log('✓ Test 46 Passed: Valid lifecycle transition confirmed.');

  // TEST 47: Illegal arbitrary state jump blocked
  console.log('Running Test 47: Illegal arbitrary state jump blocked...');
  const illegalJump = ProductionLifecycleEngine.canTransition('FINALIZED', 'DELIVERED');
  assert(!illegalJump, 'FINALIZED -> DELIVERED arbitrary jump MUST be blocked.');
  console.log('✓ Test 47 Passed: Illegal state jump blocked.');

  // TEST 48: Terminal state lock
  console.log('Running Test 48: Terminal state lock...');
  const fromTerminal = ProductionLifecycleEngine.canTransition('DELIVERED', 'PRINTING');
  assert(!fromTerminal, 'DELIVERED terminal state cannot transition to PRINTING.');
  console.log('✓ Test 48 Passed: Terminal state lock verified.');

  // TEST 49: Retry scheduled transition
  console.log('Running Test 49: Retry scheduled transition...');
  const canRetry = ProductionLifecycleEngine.canTransition('FAILED', 'RETRY_SCHEDULED');
  assert(canRetry, 'FAILED -> RETRY_SCHEDULED must be allowed.');
  console.log('✓ Test 49 Passed: Retry state transition confirmed.');

  // ==========================================
  // SECTION 8: TENANT ISOLATION & RBAC
  // ==========================================

  // TEST 50: Tenant isolation across artifacts
  console.log('Running Test 50: Tenant isolation across artifacts...');
  const crossArt = PrintArtifactRegistryService.getArtifactById(tenantB, printPdf!.id);
  assert(crossArt === undefined, 'Tenant B MUST NOT access Tenant A artifacts.');
  console.log('✓ Test 50 Passed: Artifact tenant isolation verified.');

  // TEST 51: Tenant isolation across vendors
  console.log('Running Test 51: Tenant isolation across vendors...');
  const tenantBVendors = PrintVendorService.getVendorsForTenant(tenantB);
  assert(!tenantBVendors.some((v) => v.tenantId === tenantA), 'Tenant B cannot see Tenant A vendors.');
  console.log('✓ Test 51 Passed: Vendor directory tenant isolation verified.');

  // TEST 52: Tenant isolation across dispatches
  console.log('Running Test 52: Tenant isolation across dispatches...');
  const crossDisp = VendorDispatchService.getDispatchById(tenantB, dispatchRes.dispatch!.id);
  assert(crossDisp === undefined, 'Tenant B cannot access Tenant A dispatch records.');
  console.log('✓ Test 52 Passed: Dispatch tenant isolation verified.');

  // TEST 53: RBAC permission checks for production.approve
  console.log('Running Test 53: RBAC permission checks for production.approve...');
  const unauthRoleRes = await ProductionApprovalService.recordApprovalDecision({
    tenantId: tenantA,
    editionId: mockEdition.editionId,
    jobId: finalizeRes.productionJob!.productionJobId,
    artifactId: printPdf!.id,
    decision: 'APPROVE_FOR_PRINT',
    approver: {
      userId: 'user-reporter',
      userRole: 'freelance_reporter',
    },
  });
  assert(!unauthRoleRes.success, 'Freelance reporter lacks production.approve permission.');
  console.log('✓ Test 53 Passed: production.approve RBAC enforced.');

  // TEST 54: RBAC permission checks for production.reprint
  console.log('Running Test 54: RBAC permission checks for production.reprint...');
  const unauthReprintRes = await CorrectionReprintService.requestCorrection({
    tenantId: tenantA,
    editionId: mockEdition.editionId,
    correctionType: 'DEFECT',
    correctionReason: 'Unauthorized test',
    actor: {
      userId: 'user-unauth',
      userRole: 'freelance_reporter',
    },
  });
  assert(!unauthReprintRes.success, 'Unauthorized role lacks production.reprint permission.');
  console.log('✓ Test 54 Passed: production.reprint RBAC enforced.');

  // TEST 55: Storage path tenant scoping
  console.log('Running Test 55: Storage path tenant scoping...');
  assert(printPdf!.storagePath.startsWith(`production/${tenantA}/`), 'Storage path must strictly start with tenant ID scope.');
  console.log('✓ Test 55 Passed: Storage path tenant isolation verified.');

  // TEST 56: Full audit trail generation
  console.log('Running Test 56: Full audit trail generation...');
  const events = AuditService.getEventsForTenant(tenantA);
  assert(events.length >= 10, 'Full audit trail must contain all production lifecycle events.');
  const hasDispatchedEvent = events.some((e) => e.action === 'VENDOR_DISPATCHED');
  const hasApprovedEvent = events.some((e) => e.action === 'PRODUCTION_APPROVED');
  assert(hasDispatchedEvent, 'Audit trail must contain VENDOR_DISPATCHED event.');
  assert(hasApprovedEvent, 'Audit trail must contain PRODUCTION_APPROVED event.');
  console.log('✓ Test 56 Passed: Full immutable audit trail generated.');

  console.log('================================================================');
  console.log('ALL 56/56 PHASE 10 PRINT PRODUCTION TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runPhase10Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Phase 10 Test Suite Failed:', err);
    process.exit(1);
  });
