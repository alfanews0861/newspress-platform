/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 10 — Print Production Operations, Vendor Dispatch & Delivery Tracking Unit Tests
 */

import { PrintArtifactRegistryService } from '../services/printArtifactRegistryService';
import { PrintVendorService } from '../services/printVendorService';
import { ProductionRegionService } from '../services/productionRegionService';
import { VendorAssignmentService } from '../services/vendorAssignmentService';
import { VendorDispatchService } from '../services/vendorDispatchService';
import { ProductionApprovalService } from '../services/productionApprovalService';
import { CorrectionReprintService } from '../services/correctionReprintService';
import { PrintDistributionService } from '../services/printDistributionService';
import { ProductionLifecycleEngine } from '../services/productionLifecycleEngine';
import { ProductionQueueService } from '../services/productionQueueService';
import { ProductionSnapshot } from '../types/production';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export async function runPhase10Tests(): Promise<void> {
  const tenantId = 'tenant_daily_gazette';
  const editionId = 'edition_2026_10_04_v1';
  const snapshotId = 'snap_2026_10_04_001';
  const jobId = 'job_2026_10_04_001';

  // Reset state
  PrintArtifactRegistryService.resetStore();
  PrintVendorService.resetStore();
  ProductionRegionService.resetStore();
  VendorDispatchService.resetStore();
  ProductionApprovalService.resetStore();
  CorrectionReprintService.resetStore();
  PrintDistributionService.resetStore();

  const mockSnapshot: ProductionSnapshot = {
    snapshotId,
    tenantId,
    editionId,
    version: 1,
    publicationDate: '2026-10-04',
    publicationTimezone: 'Asia/Kolkata',
    editionCode: 'GAZ-2026-10-04',
    brandId: 'brand_1',
    brandName: 'The Daily Gazette',
    templateId: 'tmpl_1',
    revisionId: 'rev_1',
    brand: {} as any,
    template: {} as any,
    articlesSnapshot: {},
    advertisementsSnapshot: [],
    checksum: 'mock_sha256_checksum',
    finalizedAt: new Date().toISOString(),
    finalizedBy: { userId: 'user_editor', userRole: 'editor_in_chief' },
    createdAt: new Date().toISOString(),
    pages: [],
    pressSpecs: {
      format: 'tabloid',
      colorMode: 'cmyk',
      bleedMm: 3.5,
      dpi: 300,
      safeAreaMarginMm: 10,
    },
  };

  await ProductionQueueService.enqueueJob({ snapshot: mockSnapshot, priority: 1 });

  // TEST 1: Print Artifact Registry
  const checksum = PrintArtifactRegistryService.calculateChecksum('MOCK_BINARY_PDF_DATA_SNAPSHOT_1');
  const artifact = await PrintArtifactRegistryService.registerArtifact({
    tenantId,
    editionId,
    productionJobId: jobId,
    snapshotId,
    version: 1,
    artifactType: 'PRINT_PDF',
    storagePath: '/storage/editions/gazette_2026_10_04_print.pdf',
    fileName: 'gazette_2026_10_04_print.pdf',
    fileSize: 14250000,
    checksum,
    pageCount: 24,
    dimensions: { widthMm: 280, heightMm: 560, format: 'TABLOID' },
    colorMode: 'cmyk',
    bleedStatus: 'VALID',
    fontEmbeddingStatus: 'EMBEDDED',
    dpiStatus: 'COMPLIANT',
    preflightStatus: 'PASS',
    createdBy: { userId: 'user_prod_eng', userRole: 'administrator', displayName: 'Prod Engineer' },
  });

  assert(Boolean(artifact.id), 'Artifact must have generated ID');
  assert(artifact.checksum.length === 64, 'Checksum must be 64-char hex SHA-256 string');
  assert(artifact.immutable === true, 'Artifact must be immutable');

  // TEST 2: Print Vendor & Regional Setup
  const { vendor } = await PrintVendorService.createVendor(
    {
      tenantId,
      name: 'Apex Offset Rotary Press',
      legalName: 'Apex Printing Solutions LLC',
      contactName: 'Prep Desk',
      email: 'prep@apexpress.example.com',
      phone: '+1-555-0199',
      address: 'Press Road, Metro Industrial Area',
      regions: ['VIJAYAWADA', 'AMARAVATI'],
      supportedFormats: ['tabloid', 'broadsheet'],
      supportedColorProfiles: ['cmyk'],
      supportedPaperSizes: ['Tabloid 280x380mm', 'Broadsheet 350x540mm'],
      dailyCapacity: 100000,
      active: true,
      priority: 1,
      vendorType: 'EXTERNAL_PRINT_VENDOR',
    },
    {
      paperSizes: ['Tabloid 280x380mm'],
      pageCounts: { min: 8, max: 64 },
      supportsColor: true,
      supportsMonochrome: true,
      printProfiles: ['ISOcoated_v2_eci.icc'],
      bleedRequirementsMm: 3.5,
      acceptedFileFormats: ['PDF/X-1a:2001'],
      maximumDailyCapacity: 100000,
      regionalServiceArea: ['VIJAYAWADA', 'AMARAVATI'],
      productionCutoffTime: '23:00',
      dispatchCutoffTime: '01:00',
      emergencyReprintSupport: true,
    }
  );

  const region = await ProductionRegionService.createRegion({
    tenantId,
    name: 'Vijayawada Central & Krishna Hub',
    code: 'VIJAYAWADA',
    timezone: 'Asia/Kolkata',
    geographicCoverage: ['Krishna District', 'NTR District'],
    defaultVendorId: vendor.id,
    active: true,
  });

  // TEST 3: Vendor Assignment Service
  const assignment = await VendorAssignmentService.assignVendor({
    tenantId,
    snapshot: mockSnapshot,
    regionCode: 'VIJAYAWADA',
    targetQuantity: 25000,
  });

  assert(assignment.selectedVendor?.id === vendor.id, 'Must select suitable Apex vendor');
  assert(assignment.region?.id === region.id, 'Must select target Vijayawada region');

  // TEST 4: Vendor Dispatch
  const dispatchRes = await VendorDispatchService.dispatchToVendor({
    tenantId,
    editionId,
    productionJobId: jobId,
    artifactId: artifact.id,
    vendorId: vendor.id,
    regionId: region.id,
    actorId: 'user_prod_engineer',
    actorRole: 'administrator',
  });

  assert(dispatchRes.success === true, 'Vendor dispatch must succeed');
  assert(dispatchRes.dispatch?.dispatchStatus === 'SENT', 'Dispatch status must be SENT');

  // TEST 5: Production Approval Gate
  const approvalRes = await ProductionApprovalService.recordApprovalDecision({
    tenantId,
    editionId,
    jobId,
    artifactId: artifact.id,
    decision: 'APPROVE_FOR_PRINT',
    approver: {
      userId: 'user_editor_chief',
      userRole: 'editor_in_chief',
      displayName: 'Chief Editor',
    },
    notes: 'Preflight verified. Approved for morning press run.',
  });

  assert(approvalRes.success === true, 'Approval gate must accept senior signoff');

  // TEST 6: Correction & Reprint Workflow
  const corrRes = await CorrectionReprintService.requestCorrection({
    tenantId,
    editionId,
    correctionType: 'TYPO',
    correctionReason: 'Front page headline misspelling corrected.',
    actor: {
      userId: 'user_senior_editor',
      userRole: 'editor_in_chief',
      displayName: 'Senior Editor',
    },
  });

  assert(corrRes.success === true, 'Correction request must succeed');
  assert(corrRes.correction?.newVersion === 2, 'New version must be incremented to v2');

  // TEST 7: Distribution & Delivery
  const dist = await PrintDistributionService.planDistribution({
    tenantId,
    editionId,
    regionId: region.id,
    quantity: 25000,
    carrier: 'Pacific Newspaper Distribution Logistics',
    notes: 'Loaded onto regional delivery trucks at 03:00 AM.',
  });

  assert(dist.deliveryStatus === 'PLANNED', 'Distribution status must start as PLANNED');

  const updatedDelivered = await PrintDistributionService.updateDeliveryStatus({
    tenantId,
    distributionId: dist.id,
    status: 'DELIVERED',
    actualDeliveryDate: new Date().toISOString(),
    wastageQuantity: 150,
    notes: 'Delivered to regional hubs with 150 damaged copies in transit.',
  });

  assert(updatedDelivered.distribution?.deliveryStatus === 'DELIVERED', 'Delivery status must update to DELIVERED');

  // TEST 8: Lifecycle Engine Transitions
  assert(ProductionLifecycleEngine.canTransition('FINALIZED', 'PRODUCTION_QUEUED'), 'FINALIZED -> PRODUCTION_QUEUED allowed');
  assert(ProductionLifecycleEngine.canTransition('PRODUCTION_APPROVED', 'VENDOR_DISPATCH_PENDING'), 'PRODUCTION_APPROVED -> VENDOR_DISPATCH_PENDING allowed');
  assert(!ProductionLifecycleEngine.canTransition('FINALIZED', 'DELIVERED'), 'Arbitrary jump FINALIZED -> DELIVERED strictly forbidden');

  console.log('Phase 10 Unit Tests Completed Successfully!');
}
