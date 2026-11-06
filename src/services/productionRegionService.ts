/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Production Region Service (Phase 10)
 * Manages dynamic regional printing & distribution zones per publisher tenant.
 * Includes geographic coverage, default vendor links, and timezone metadata.
 */

import { ProductionRegion } from '../types/production';
import { AuditService } from './auditService';

const _regionsStore = new Map<string, ProductionRegion>();

export class ProductionRegionService {
  /**
   * Resets local store (for testing & state cleanup).
   */
  public static resetStore(): void {
    _regionsStore.clear();
  }

  /**
   * Seeds standard regional publishing zones for a tenant.
   */
  public static seedDefaultRegions(tenantId: string, defaultVendorId?: string): void {
    const existing = this.getRegionsForTenant(tenantId);
    if (existing.length > 0) return;

    const regions: ProductionRegion[] = [
      {
        id: `reg-${tenantId}-vijayawada`,
        tenantId,
        name: 'Vijayawada Central & Krishna Hub',
        code: 'VIJAYAWADA',
        timezone: 'Asia/Kolkata',
        geographicCoverage: ['Krishna District', 'NTR District', 'Guntur Urban', 'Mangalagiri'],
        defaultVendorId: defaultVendorId || `vnd-${tenantId}-deccan-press`,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `reg-${tenantId}-nellore`,
        tenantId,
        name: 'Nellore Coastal & South Hub',
        code: 'NELLORE',
        timezone: 'Asia/Kolkata',
        geographicCoverage: ['SPSR Nellore District', 'Kavali', 'Gudur', 'Kavali Urban'],
        defaultVendorId: defaultVendorId || `vnd-${tenantId}-coastal-rotary`,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `reg-${tenantId}-hyderabad`,
        tenantId,
        name: 'Hyderabad Metro & Telangana Capital',
        code: 'HYDERABAD',
        timezone: 'Asia/Kolkata',
        geographicCoverage: ['Hyderabad Urban', 'Cyberabad', 'Secunderabad', 'Medchal-Malkajgiri', 'Rangareddy'],
        defaultVendorId: defaultVendorId || `vnd-${tenantId}-cybercity-rapid`,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `reg-${tenantId}-visakhapatnam`,
        tenantId,
        name: 'Visakhapatnam Steel City & North Coast',
        code: 'VISAKHAPATNAM',
        timezone: 'Asia/Kolkata',
        geographicCoverage: ['Visakhapatnam City', 'Anakapalli', 'Vizianagaram', 'Bheemunipatnam'],
        defaultVendorId: defaultVendorId || `vnd-${tenantId}-deccan-press`,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `reg-${tenantId}-chennai`,
        tenantId,
        name: 'Chennai Metropolis & North Tamil Nadu',
        code: 'CHENNAI_NORTH',
        timezone: 'Asia/Kolkata',
        geographicCoverage: ['Chennai Metro', 'Tiruvallur', 'Tambaram', 'Avadi'],
        defaultVendorId: defaultVendorId || `vnd-${tenantId}-coastal-rotary`,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const r of regions) {
      _regionsStore.set(r.id, r);
    }
  }

  /**
   * Creates a new production distribution region.
   */
  public static async createRegion(
    region: Omit<ProductionRegion, 'id' | 'createdAt' | 'updatedAt'>,
    actorId: string = 'system',
    actorRole: string = 'owner'
  ): Promise<ProductionRegion> {
    const id = `reg-${region.tenantId}-${region.code.toLowerCase()}-${Date.now()}`;
    const now = new Date().toISOString();

    const created: ProductionRegion = {
      ...region,
      id,
      createdAt: now,
      updatedAt: now,
    };

    _regionsStore.set(id, created);

    await AuditService.logEvent({
      tenantId: region.tenantId,
      actorId,
      actorName: 'Operations Lead',
      actorRole,
      action: 'VENDOR_ASSIGNED',
      entityType: 'ProductionRegion',
      entityId: id,
      newState: { name: created.name, code: created.code, coverage: created.geographicCoverage },
      reason: `Production region ${created.name} (${created.code}) created`,
    });

    return created;
  }

  /**
   * Retrieves all production regions for a tenant.
   */
  public static getRegionsForTenant(tenantId: string): ProductionRegion[] {
    return Array.from(_regionsStore.values()).filter((r) => r.tenantId === tenantId);
  }

  /**
   * Retrieves a single region by ID.
   */
  public static getRegionById(tenantId: string, regionId: string): ProductionRegion | undefined {
    const r = _regionsStore.get(regionId);
    if (!r || r.tenantId !== tenantId) return undefined;
    return r;
  }

  /**
   * Retrieves region by code (e.g. 'NELLORE', 'HYDERABAD').
   */
  public static getRegionByCode(tenantId: string, code: string): ProductionRegion | undefined {
    return Array.from(_regionsStore.values()).find(
      (r) => r.tenantId === tenantId && r.code.toUpperCase() === code.toUpperCase()
    );
  }
}
