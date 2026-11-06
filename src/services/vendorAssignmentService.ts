/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Vendor Assignment Engine (Phase 10)
 * Deterministically assigns print vendors based on operational criteria:
 *  - Active status
 *  - Regional service coverage
 *  - Production press capability (format, page counts, color profiles)
 *  - Daily capacity limits
 *  - Cutoff times vs target print/dispatch deadlines
 *  - Automatic, Manual Override, and Fallback assignment modes with auditable assignment reasons.
 */

import { PrintVendor, PrintVendorCapability, ProductionRegion, ProductionSnapshot } from '../types/production';
import { PrintVendorService } from './printVendorService';
import { ProductionRegionService } from './productionRegionService';
import { AuditService } from './auditService';

export type AssignmentMode = 'AUTOMATIC' | 'MANUAL' | 'FALLBACK';

export interface VendorAssignmentResult {
  success: boolean;
  selectedVendor?: PrintVendor;
  capability?: PrintVendorCapability;
  region?: ProductionRegion;
  assignmentMode: AssignmentMode;
  assignmentReason: string;
  evaluatedVendorsCount: number;
  rejectedVendors: { vendorId: string; vendorName: string; reasons: string[] }[];
}

export class VendorAssignmentService {
  /**
   * Evaluates and assigns an optimal print vendor for an edition snapshot and target region.
   */
  public static async assignVendor(params: {
    tenantId: string;
    snapshot: ProductionSnapshot;
    regionId?: string;
    regionCode?: string;
    targetQuantity?: number;
    manualVendorId?: string;
    actorId?: string;
    actorRole?: string;
  }): Promise<VendorAssignmentResult> {
    const {
      tenantId,
      snapshot,
      regionId,
      regionCode,
      targetQuantity = 10000,
      manualVendorId,
      actorId = 'system',
      actorRole = 'editor_in_chief',
    } = params;

    // Ensure default vendors and regions exist
    PrintVendorService.seedDefaultVendors(tenantId);
    ProductionRegionService.seedDefaultRegions(tenantId);

    // Resolve target region
    let targetRegion: ProductionRegion | undefined;
    if (regionId) {
      targetRegion = ProductionRegionService.getRegionById(tenantId, regionId);
    } else if (regionCode) {
      targetRegion = ProductionRegionService.getRegionByCode(tenantId, regionCode);
    }

    const allVendors = PrintVendorService.getVendorsForTenant(tenantId);

    // 1. MANUAL OVERRIDE MODE
    if (manualVendorId) {
      const manualVendor = PrintVendorService.getVendorById(tenantId, manualVendorId);
      if (!manualVendor) {
        return {
          success: false,
          assignmentMode: 'MANUAL',
          assignmentReason: `Specified manual vendor ID "${manualVendorId}" was not found for tenant.`,
          evaluatedVendorsCount: allVendors.length,
          rejectedVendors: [],
        };
      }

      const validation = PrintVendorService.validateVendorForEdition(tenantId, manualVendorId, {
        format: snapshot.pressSpecs.format,
        colorMode: snapshot.pressSpecs.colorMode,
        pageCount: snapshot.pages.length,
        regionId: targetRegion?.code,
        dailyQuantity: targetQuantity,
      });

      const capability = PrintVendorService.getVendorCapability(tenantId, manualVendorId);

      await AuditService.logEvent({
        tenantId,
        actorId,
        actorName: 'Managing Editor',
        actorRole,
        action: 'VENDOR_ASSIGNED',
        entityType: 'PrintVendor',
        entityId: manualVendor.id,
        newState: {
          editionId: snapshot.editionId,
          mode: 'MANUAL',
          validationVerdict: validation.eligible ? 'FULLY_COMPLIANT' : 'MANUAL_OVERRIDE_WARNINGS',
          warnings: validation.reasons,
        },
        reason: `Manual vendor assignment to "${manualVendor.name}" for edition ${snapshot.editionCode}`,
      });

      return {
        success: true,
        selectedVendor: manualVendor,
        capability,
        region: targetRegion,
        assignmentMode: 'MANUAL',
        assignmentReason: `Manual operator assignment to "${manualVendor.name}". ${validation.reasons.length > 0 ? `Compliance notes: ${validation.reasons.join(', ')}` : 'All capability checks passed.'}`,
        evaluatedVendorsCount: 1,
        rejectedVendors: validation.eligible ? [] : [{ vendorId: manualVendor.id, vendorName: manualVendor.name, reasons: validation.reasons }],
      };
    }

    // 2. AUTOMATIC DETERMINISTIC SELECTION MODE
    const rejectedVendors: { vendorId: string; vendorName: string; reasons: string[] }[] = [];
    const eligibleVendors: { vendor: PrintVendor; capability: PrintVendorCapability; score: number }[] = [];
    const targetRegionCode = targetRegion?.code || regionCode || regionId;

    for (const vendor of allVendors) {
      const validation = PrintVendorService.validateVendorForEdition(tenantId, vendor.id, {
        format: snapshot.pressSpecs.format,
        colorMode: snapshot.pressSpecs.colorMode,
        pageCount: snapshot.pages.length,
        regionId: targetRegionCode,
        dailyQuantity: targetQuantity,
      });

      if (!validation.eligible) {
        rejectedVendors.push({
          vendorId: vendor.id,
          vendorName: vendor.name,
          reasons: validation.reasons,
        });
        continue;
      }

      const cap = PrintVendorService.getVendorCapability(tenantId, vendor.id)!;

      // Calculate deterministic score:
      // - Higher priority vendor (lower priority number)
      // - Direct region match bonus
      // - Internal unit preference for cost/control
      let score = 100 - vendor.priority * 10;
      if (targetRegion && vendor.regions.includes(targetRegion.code)) {
        score += 50;
      }
      if (vendor.vendorType === 'INTERNAL_PRINT_UNIT') {
        score += 20;
      }

      eligibleVendors.push({ vendor, capability: cap, score });
    }

    // Sort deterministically by calculated score descending, then by capacity, then by vendor ID
    eligibleVendors.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.capability.maximumDailyCapacity !== a.capability.maximumDailyCapacity) {
        return b.capability.maximumDailyCapacity - a.capability.maximumDailyCapacity;
      }
      return a.vendor.id.localeCompare(b.vendor.id);
    });

    if (eligibleVendors.length > 0) {
      const topChoice = eligibleVendors[0];

      await AuditService.logEvent({
        tenantId,
        actorId,
        actorName: 'Vendor Assignment Engine',
        actorRole: 'system',
        action: 'VENDOR_ASSIGNED',
        entityType: 'PrintVendor',
        entityId: topChoice.vendor.id,
        newState: {
          editionId: snapshot.editionId,
          mode: 'AUTOMATIC',
          vendorName: topChoice.vendor.name,
          score: topChoice.score,
        },
        reason: `Automated selection of "${topChoice.vendor.name}" based on regional coverage (${targetRegion?.code || 'Default'}), capacity (${topChoice.capability.maximumDailyCapacity}), and format compatibility.`,
      });

      return {
        success: true,
        selectedVendor: topChoice.vendor,
        capability: topChoice.capability,
        region: targetRegion,
        assignmentMode: 'AUTOMATIC',
        assignmentReason: `Deterministic automatic match: Highest ranking active vendor (${topChoice.vendor.name}) servicing region ${targetRegion?.code || 'All'} with verified capacity for ${targetQuantity} copies.`,
        evaluatedVendorsCount: allVendors.length,
        rejectedVendors,
      };
    }

    // 3. FALLBACK ASSIGNMENT MODE
    // If no vendor strictly matches all regional criteria, select the highest-capacity active vendor that supports the format
    const fallbackCandidates = allVendors.filter((v) => v.active && v.supportedFormats.includes(snapshot.pressSpecs.format));
    if (fallbackCandidates.length > 0) {
      fallbackCandidates.sort((a, b) => b.dailyCapacity - a.dailyCapacity);
      const fallbackVendor = fallbackCandidates[0];
      const cap = PrintVendorService.getVendorCapability(tenantId, fallbackVendor.id)!;

      await AuditService.logEvent({
        tenantId,
        actorId,
        actorName: 'Vendor Assignment Engine',
        actorRole: 'system',
        action: 'VENDOR_ASSIGNED',
        entityType: 'PrintVendor',
        entityId: fallbackVendor.id,
        newState: {
          editionId: snapshot.editionId,
          mode: 'FALLBACK',
          vendorName: fallbackVendor.name,
        },
        reason: `Fallback vendor assigned (${fallbackVendor.name}) because no strict regional vendor met all parameters.`,
      });

      return {
        success: true,
        selectedVendor: fallbackVendor,
        capability: cap,
        region: targetRegion,
        assignmentMode: 'FALLBACK',
        assignmentReason: `Fallback assignment: No direct regional match found. Allocated to primary central press unit "${fallbackVendor.name}" (Capacity: ${fallbackVendor.dailyCapacity}).`,
        evaluatedVendorsCount: allVendors.length,
        rejectedVendors,
      };
    }

    return {
      success: false,
      assignmentMode: 'AUTOMATIC',
      assignmentReason: `No eligible print vendor found for format "${snapshot.pressSpecs.format}" and requirements. All ${allVendors.length} registered vendors failed compatibility validation.`,
      evaluatedVendorsCount: allVendors.length,
      rejectedVendors,
    };
  }
}
