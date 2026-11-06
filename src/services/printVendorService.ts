/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Print Vendor Management Service (Phase 10)
 * Manages Print Vendors and Print Vendor Capabilities per tenant.
 * Provides capability validation against edition press specifications and capacity limits.
 */

import { PrintVendor, PrintVendorCapability, VendorType } from '../types/production';
import { AuditService } from './auditService';

// In-memory stores with tenant scoping
const _vendorsStore = new Map<string, PrintVendor>();
const _capabilitiesStore = new Map<string, PrintVendorCapability>();

export class PrintVendorService {
  /**
   * Resets local store (for testing & state cleanup).
   */
  public static resetStore(): void {
    _vendorsStore.clear();
    _capabilitiesStore.clear();
  }

  /**
   * Seeds default regional print vendors for a tenant if none exist.
   */
  public static seedDefaultVendors(tenantId: string): void {
    const existing = this.getVendorsForTenant(tenantId);
    if (existing.length > 0) return;

    const v1: PrintVendor = {
      id: `vnd-${tenantId}-deccan-press`,
      tenantId,
      name: 'Deccan Printworks & High-Speed Press',
      legalName: 'Deccan Printworks Pvt Ltd',
      contactName: 'K. S. Narayana',
      email: 'production@deccanprint.example.in',
      phone: '+91 866 244 8900',
      address: 'Plot 42, Autonagar Industrial Area, Vijayawada, AP - 520007',
      regions: ['VIJAYAWADA', 'AMARAVATI', 'GUNTUR'],
      supportedFormats: ['broadsheet', 'tabloid', 'berliner', 'A4'],
      supportedColorProfiles: ['cmyk', 'spot', 'grayscale', 'rgb'],
      supportedPaperSizes: ['Broadsheet 350x540mm', 'Tabloid 280x380mm', 'Berliner 315x470mm', 'A4 210x297mm'],
      dailyCapacity: 75000,
      active: true,
      priority: 1,
      vendorType: 'EXTERNAL_PRINT_VENDOR',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const c1: PrintVendorCapability = {
      vendorId: v1.id,
      tenantId,
      paperSizes: ['Broadsheet 350x540mm', 'Tabloid 280x380mm', 'Berliner 315x470mm', 'A4 210x297mm'],
      pageCounts: { min: 1, max: 64 },
      supportsColor: true,
      supportsMonochrome: true,
      printProfiles: ['ISOcoated_v2_eci.icc', 'USWebCoatedSWOP.icc', 'WAN-IFRAnewspaper26v5.icc'],
      bleedRequirementsMm: 3.5,
      acceptedFileFormats: ['PDF/X-1a:2001', 'PDF/X-4', 'Print-Ready PDF 1.6+'],
      maximumDailyCapacity: 75000,
      regionalServiceArea: ['VIJAYAWADA', 'AMARAVATI', 'GUNTUR'],
      productionCutoffTime: '23:30',
      dispatchCutoffTime: '01:30',
      emergencyReprintSupport: true,
    };

    const v2: PrintVendor = {
      id: `vnd-${tenantId}-coastal-rotary`,
      tenantId,
      name: 'Coastal Rotary Press Hub',
      legalName: 'Coastal Media & Rotary Press Ltd',
      contactName: 'M. Sreenivasa Rao',
      email: 'press@coastalrotary.example.in',
      phone: '+91 861 232 4110',
      address: 'Industrial Estate, Wood Yard, Nellore, AP - 524004',
      regions: ['NELLORE', 'TIRUPATI', 'CHENNAI_NORTH'],
      supportedFormats: ['broadsheet', 'tabloid', 'A4'],
      supportedColorProfiles: ['cmyk', 'grayscale'],
      supportedPaperSizes: ['Broadsheet 350x540mm', 'Tabloid 280x380mm', 'A4 210x297mm'],
      dailyCapacity: 45000,
      active: true,
      priority: 2,
      vendorType: 'CONTRACT_PRINT_VENDOR',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const c2: PrintVendorCapability = {
      vendorId: v2.id,
      tenantId,
      paperSizes: ['Broadsheet 350x540mm', 'Tabloid 280x380mm', 'A4 210x297mm'],
      pageCounts: { min: 1, max: 32 },
      supportsColor: true,
      supportsMonochrome: true,
      printProfiles: ['ISOcoated_v2_eci.icc', 'WAN-IFRAnewspaper26v5.icc'],
      bleedRequirementsMm: 3.0,
      acceptedFileFormats: ['PDF/X-1a:2001', 'Print-Ready PDF 1.6+'],
      maximumDailyCapacity: 45000,
      regionalServiceArea: ['NELLORE', 'TIRUPATI', 'CHENNAI_NORTH'],
      productionCutoffTime: '23:00',
      dispatchCutoffTime: '01:00',
      emergencyReprintSupport: true,
    };

    const v3: PrintVendor = {
      id: `vnd-${tenantId}-cybercity-rapid`,
      tenantId,
      name: 'CyberCity Rapid Web Offset Press',
      legalName: 'CyberCity Web Offset & Graphics Pvt Ltd',
      contactName: 'Prasad V. Reddy',
      email: 'ops@cybercitypress.example.in',
      phone: '+91 40 2311 7766',
      address: 'Balanagar Industrial Corridor, Hyderabad, TS - 500037',
      regions: ['HYDERABAD', 'SECUNDERABAD', 'WARANGAL'],
      supportedFormats: ['broadsheet', 'tabloid', 'berliner', 'A4'],
      supportedColorProfiles: ['cmyk', 'spot', 'grayscale', 'rgb'],
      supportedPaperSizes: ['Broadsheet 350x540mm', 'Tabloid 280x380mm', 'Berliner 315x470mm', 'A4 210x297mm'],
      dailyCapacity: 120000,
      active: true,
      priority: 1,
      vendorType: 'INTERNAL_PRINT_UNIT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const c3: PrintVendorCapability = {
      vendorId: v3.id,
      tenantId,
      paperSizes: ['Broadsheet 350x540mm', 'Tabloid 280x380mm', 'Berliner 315x470mm', 'A4 210x297mm'],
      pageCounts: { min: 1, max: 96 },
      supportsColor: true,
      supportsMonochrome: true,
      printProfiles: ['ISOcoated_v2_eci.icc', 'USWebCoatedSWOP.icc', 'WAN-IFRAnewspaper26v5.icc'],
      bleedRequirementsMm: 4.0,
      acceptedFileFormats: ['PDF/X-1a:2001', 'PDF/X-4', 'Print-Ready PDF 1.6+'],
      maximumDailyCapacity: 120000,
      regionalServiceArea: ['HYDERABAD', 'SECUNDERABAD', 'WARANGAL'],
      productionCutoffTime: '00:15',
      dispatchCutoffTime: '02:00',
      emergencyReprintSupport: true,
    };

    _vendorsStore.set(v1.id, v1);
    _capabilitiesStore.set(v1.id, c1);
    _vendorsStore.set(v2.id, v2);
    _capabilitiesStore.set(v2.id, c2);
    _vendorsStore.set(v3.id, v3);
    _capabilitiesStore.set(v3.id, c3);
  }

  /**
   * Registers a new print vendor.
   */
  public static async createVendor(
    vendor: Omit<PrintVendor, 'id' | 'createdAt' | 'updatedAt'>,
    capability: Omit<PrintVendorCapability, 'vendorId' | 'tenantId'>,
    actorId: string = 'system',
    actorRole: string = 'owner'
  ): Promise<{ vendor: PrintVendor; capability: PrintVendorCapability }> {
    const id = `vnd-${vendor.tenantId}-${Date.now()}`;
    const now = new Date().toISOString();

    const createdVendor: PrintVendor = {
      ...vendor,
      id,
      createdAt: now,
      updatedAt: now,
    };

    const createdCapability: PrintVendorCapability = {
      ...capability,
      vendorId: id,
      tenantId: vendor.tenantId,
    };

    _vendorsStore.set(id, createdVendor);
    _capabilitiesStore.set(id, createdCapability);

    await AuditService.logEvent({
      tenantId: vendor.tenantId,
      actorId,
      actorName: 'Operations Manager',
      actorRole,
      action: 'VENDOR_ASSIGNED',
      entityType: 'PrintVendor',
      entityId: id,
      newState: { name: vendor.name, regions: vendor.regions, dailyCapacity: vendor.dailyCapacity },
      reason: `Print vendor "${vendor.name}" configured`,
    });

    return { vendor: createdVendor, capability: createdCapability };
  }

  /**
   * Updates an existing vendor and capability.
   */
  public static async updateVendor(
    tenantId: string,
    vendorId: string,
    vendorUpdates: Partial<PrintVendor>,
    capabilityUpdates?: Partial<PrintVendorCapability>,
    actorId: string = 'system',
    actorRole: string = 'owner'
  ): Promise<{ vendor: PrintVendor; capability?: PrintVendorCapability }> {
    const vendor = _vendorsStore.get(vendorId);
    if (!vendor || vendor.tenantId !== tenantId) {
      throw new Error(`Vendor ${vendorId} not found for tenant.`);
    }

    const updatedVendor: PrintVendor = {
      ...vendor,
      ...vendorUpdates,
      updatedAt: new Date().toISOString(),
    };
    _vendorsStore.set(vendorId, updatedVendor);

    let updatedCap = _capabilitiesStore.get(vendorId);
    if (capabilityUpdates && updatedCap) {
      updatedCap = {
        ...updatedCap,
        ...capabilityUpdates,
      };
      _capabilitiesStore.set(vendorId, updatedCap);
    }

    await AuditService.logEvent({
      tenantId,
      actorId,
      actorName: 'Operations Manager',
      actorRole,
      action: 'VENDOR_ASSIGNED',
      entityType: 'PrintVendor',
      entityId: vendorId,
      newState: { name: updatedVendor.name, active: updatedVendor.active },
      reason: `Vendor ${updatedVendor.name} updated`,
    });

    return { vendor: updatedVendor, capability: updatedCap };
  }

  /**
   * Retrieves all print vendors for a tenant.
   */
  public static getVendorsForTenant(tenantId: string): PrintVendor[] {
    return Array.from(_vendorsStore.values()).filter((v) => v.tenantId === tenantId);
  }

  /**
   * Retrieves a single vendor by ID.
   */
  public static getVendorById(tenantId: string, vendorId: string): PrintVendor | undefined {
    const vendor = _vendorsStore.get(vendorId);
    if (!vendor || vendor.tenantId !== tenantId) return undefined;
    return vendor;
  }

  /**
   * Retrieves capabilities for a vendor.
   */
  public static getVendorCapability(tenantId: string, vendorId: string): PrintVendorCapability | undefined {
    const cap = _capabilitiesStore.get(vendorId);
    if (!cap || cap.tenantId !== tenantId) return undefined;
    return cap;
  }

  /**
   * Validates if a vendor supports specific edition production requirements.
   */
  public static validateVendorForEdition(
    tenantId: string,
    vendorId: string,
    requirements: {
      format: 'broadsheet' | 'tabloid' | 'berliner' | 'A4';
      colorMode: 'cmyk' | 'spot' | 'grayscale' | 'rgb';
      pageCount: number;
      regionId?: string;
      dailyQuantity?: number;
    }
  ): { eligible: boolean; reasons: string[] } {
    const vendor = this.getVendorById(tenantId, vendorId);
    if (!vendor) {
      return { eligible: false, reasons: ['Vendor not found or not registered for tenant'] };
    }

    if (!vendor.active) {
      return { eligible: false, reasons: ['Vendor is currently inactive'] };
    }

    const cap = this.getVendorCapability(tenantId, vendorId);
    if (!cap) {
      return { eligible: false, reasons: ['Vendor capability profile missing'] };
    }

    const reasons: string[] = [];

    // Check format
    if (!vendor.supportedFormats.includes(requirements.format)) {
      reasons.push(`Vendor does not support format: ${requirements.format}`);
    }

    // Check color mode
    if (requirements.colorMode === 'cmyk' || requirements.colorMode === 'rgb') {
      if (!cap.supportsColor) {
        reasons.push('Vendor does not support multi-color CMYK printing');
      }
    }

    // Check page count boundaries
    if (requirements.pageCount < cap.pageCounts.min || requirements.pageCount > cap.pageCounts.max) {
      reasons.push(`Page count ${requirements.pageCount} out of vendor range (${cap.pageCounts.min} - ${cap.pageCounts.max})`);
    }

    // Check regional service area
    if (requirements.regionId) {
      const servesRegion = vendor.regions.includes(requirements.regionId) ||
        cap.regionalServiceArea.includes(requirements.regionId);
      if (!servesRegion) {
        reasons.push(`Vendor does not service target region: ${requirements.regionId}`);
      }
    }

    // Check daily quantity against maximum capacity
    if (requirements.dailyQuantity && requirements.dailyQuantity > cap.maximumDailyCapacity) {
      reasons.push(`Requested quantity ${requirements.dailyQuantity} exceeds vendor daily capacity (${cap.maximumDailyCapacity})`);
    }

    return {
      eligible: reasons.length === 0,
      reasons,
    };
  }
}
