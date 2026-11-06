/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Print Distribution & Delivery Tracking Service (Phase 10)
 * Manages post-print logistics, multi-region quantity allocation, delivery carrier tracking,
 * wastage recording, and terminal delivery confirmations.
 */

import { PrintDistribution, DeliveryStatus } from '../types/production';
import { ProductionRegionService } from './productionRegionService';
import { AuditService } from './auditService';
import { NotificationService } from './notificationService';

const _distributionsStore = new Map<string, PrintDistribution>();

export class PrintDistributionService {
  /**
   * Resets local store (for testing & state cleanup).
   */
  public static resetStore(): void {
    _distributionsStore.clear();
  }

  /**
   * Creates or plans regional distribution allocations for an edition.
   */
  public static async planDistribution(params: {
    tenantId: string;
    editionId: string;
    vendorDispatchId?: string;
    regionId: string;
    quantity: number;
    expectedDeliveryDate?: string;
    carrier?: string;
    notes?: string;
    actorId?: string;
    actorRole?: string;
  }): Promise<PrintDistribution> {
    const {
      tenantId,
      editionId,
      vendorDispatchId,
      regionId,
      quantity,
      expectedDeliveryDate,
      carrier = 'Regional News Express Logistics',
      notes,
      actorId = 'system',
      actorRole = 'owner',
    } = params;

    const id = `dist-${editionId}-${regionId.slice(-6)}-${Date.now()}`;
    const now = new Date().toISOString();

    const dist: PrintDistribution = {
      id,
      tenantId,
      editionId,
      vendorDispatchId,
      regionId,
      quantity,
      wastageQuantity: 0,
      reprintQuantity: 0,
      expectedDeliveryDate: expectedDeliveryDate || new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      carrier,
      deliveryStatus: 'PLANNED',
      notes,
      createdAt: now,
      updatedAt: now,
    };

    _distributionsStore.set(id, dist);

    await AuditService.logEvent({
      tenantId,
      actorId,
      actorName: 'Circulation Desk',
      actorRole,
      action: 'STATUS_CHANGE',
      entityType: 'PrintDistribution',
      entityId: id,
      newState: { status: 'PLANNED', quantity, regionId },
      reason: `Planned distribution of ${quantity} copies for region ${regionId}`,
    });

    return dist;
  }

  /**
   * Updates distribution status (e.g. DISPATCHED, IN_TRANSIT, DELIVERED, PARTIALLY_DELIVERED, FAILED).
   */
  public static async updateDeliveryStatus(params: {
    tenantId: string;
    distributionId: string;
    status: DeliveryStatus;
    actualDeliveryDate?: string;
    wastageQuantity?: number;
    reprintQuantity?: number;
    trackingReference?: string;
    notes?: string;
    actorId?: string;
    actorRole?: string;
  }): Promise<{ success: boolean; distribution?: PrintDistribution; error?: string }> {
    const {
      tenantId,
      distributionId,
      status,
      actualDeliveryDate,
      wastageQuantity,
      reprintQuantity,
      trackingReference,
      notes,
      actorId = 'system',
      actorRole = 'editor_in_chief',
    } = params;

    const dist = _distributionsStore.get(distributionId);
    if (!dist || dist.tenantId !== tenantId) {
      return { success: false, error: 'Distribution record not found.' };
    }

    const now = new Date().toISOString();
    dist.deliveryStatus = status;
    dist.updatedAt = now;

    if (status === 'DISPATCHED' && !dist.dispatchDate) {
      dist.dispatchDate = now;
    }

    if (status === 'DELIVERED' || status === 'PARTIALLY_DELIVERED') {
      dist.actualDeliveryDate = actualDeliveryDate || now;
    }

    if (wastageQuantity !== undefined) dist.wastageQuantity = wastageQuantity;
    if (reprintQuantity !== undefined) dist.reprintQuantity = reprintQuantity;
    if (trackingReference) dist.trackingReference = trackingReference;
    if (notes) dist.notes = notes;

    _distributionsStore.set(distributionId, dist);

    await AuditService.logEvent({
      tenantId,
      actorId,
      actorName: 'Distribution Manager',
      actorRole,
      action: status === 'DELIVERED' ? 'DISTRIBUTION_DELIVERED' : 'STATUS_CHANGE',
      entityType: 'PrintDistribution',
      entityId: distributionId,
      newState: {
        status,
        deliveredQuantity: (dist.quantity || 0) - (dist.wastageQuantity || 0),
        wastage: dist.wastageQuantity,
      },
      reason: `Distribution status updated to ${status}. ${notes ? `Notes: ${notes}` : ''}`,
    });

    if (status === 'DELIVERED') {
      await NotificationService.createNotification({
        tenantId,
        type: 'production_ready',
        editionId: dist.editionId,
        title: 'Edition Delivered to Circulation Centers',
        message: `Regional delivery completed for ${dist.quantity} copies (${dist.regionId}).`,
      });
    }

    return { success: true, distribution: dist };
  }

  /**
   * Retrieves all distribution records for an edition.
   */
  public static getDistributionsForEdition(tenantId: string, editionId: string): PrintDistribution[] {
    return Array.from(_distributionsStore.values())
      .filter((d) => d.tenantId === tenantId && d.editionId === editionId);
  }

  /**
   * Retrieves all distribution records for a tenant or globally.
   */
  public static getAllDistributions(tenantId?: string): PrintDistribution[] {
    const list = Array.from(_distributionsStore.values());
    if (tenantId) {
      return list.filter((d) => d.tenantId === tenantId);
    }
    return list;
  }

  /**
   * Calculates total operational quantity metrics across an edition.
   */
  public static getEditionQuantityMetrics(tenantId: string, editionId: string): {
    totalPlannedQuantity: number;
    totalDeliveredQuantity: number;
    totalWastageQuantity: number;
    totalReprintQuantity: number;
    regionCount: number;
  } {
    const list = this.getDistributionsForEdition(tenantId, editionId);
    let totalPlannedQuantity = 0;
    let totalDeliveredQuantity = 0;
    let totalWastageQuantity = 0;
    let totalReprintQuantity = 0;

    for (const d of list) {
      totalPlannedQuantity += d.quantity || 0;
      if (d.deliveryStatus === 'DELIVERED' || d.deliveryStatus === 'PARTIALLY_DELIVERED') {
        totalDeliveredQuantity += (d.quantity || 0) - (d.wastageQuantity || 0);
      }
      totalWastageQuantity += d.wastageQuantity || 0;
      totalReprintQuantity += d.reprintQuantity || 0;
    }

    return {
      totalPlannedQuantity,
      totalDeliveredQuantity,
      totalWastageQuantity,
      totalReprintQuantity,
      regionCount: list.length,
    };
  }
}
