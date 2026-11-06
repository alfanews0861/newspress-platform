/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 9 — Edition Advertisement Reservation Service
 * Manages commercial advertising slots, page allocations, and commercial lock enforcement.
 */

import { EditionAdvertisementReservation } from '../types/editionWorkflow';
import { AuditService } from './auditService';
import { NotificationService } from './notificationService';

export class EditionAdvertisementService {
  private static adReservations: Map<string, EditionAdvertisementReservation> = new Map();

  public static resetStore(): void {
    this.adReservations.clear();
  }

  /**
   * Reserves an advertisement zone on a specific edition page.
   */
  public static reserveAdvertisement(data: {
    tenantId: string;
    editionId: string;
    advertisementId: string;
    pageNumber: number;
    zoneId: string;
    sponsorName: string;
    priority?: number;
    rateCents?: number;
    reservedBy: string;
    dimensions?: {
      columnStart: number;
      columnSpan: number;
      rowStart: number;
      rowSpan: number;
    };
  }): { success: boolean; reservation?: EditionAdvertisementReservation; error?: string } {
    const reservationId = `ad-res-${data.editionId}-p${data.pageNumber}-${data.zoneId}-${Date.now()}`;
    const now = new Date().toISOString();

    const reservation: EditionAdvertisementReservation = {
      reservationId,
      tenantId: data.tenantId,
      editionId: data.editionId,
      advertisementId: data.advertisementId,
      pageNumber: data.pageNumber,
      zoneId: data.zoneId,
      priority: data.priority ?? 10,
      reservedBy: data.reservedBy,
      sponsorName: data.sponsorName,
      rateCents: data.rateCents,
      dimensions: data.dimensions,
      isCommerciallyLocked: false,
      status: 'RESERVED',
      createdAt: now,
      updatedAt: now,
    };

    this.adReservations.set(reservationId, reservation);

    AuditService.logEvent({
      tenantId: data.tenantId,
      actorId: data.reservedBy,
      actorName: 'Ad Desk',
      actorRole: 'editor',
      action: 'ADVERTISEMENT_RESERVED',
      entityType: 'EditionAdvertisementReservation',
      entityId: reservationId,
      details: {
        editionId: data.editionId,
        pageNumber: data.pageNumber,
        sponsor: data.sponsorName,
        zoneId: data.zoneId,
      },
    });

    return { success: true, reservation };
  }

  /**
   * Commercially locks an advertisement so layout algorithms cannot overwrite or remove it.
   */
  public static lockAdvertisement(
    tenantId: string,
    reservationId: string,
    lockedBy: string
  ): { success: boolean; error?: string } {
    const ad = this.adReservations.get(reservationId);
    if (!ad) return { success: false, error: 'Advertisement reservation not found.' };
    if (ad.tenantId !== tenantId) return { success: false, error: 'Cross-tenant security violation.' };

    ad.isCommerciallyLocked = true;
    ad.lockedBy = lockedBy;
    ad.lockedAt = new Date().toISOString();
    ad.updatedAt = ad.lockedAt;
    this.adReservations.set(reservationId, ad);

    AuditService.logEvent({
      tenantId,
      actorId: lockedBy,
      actorName: 'Commercial Director',
      actorRole: 'editor',
      action: 'ADVERTISEMENT_LOCKED',
      entityType: 'EditionAdvertisementReservation',
      entityId: reservationId,
      details: {
        editionId: ad.editionId,
        pageNumber: ad.pageNumber,
        sponsor: ad.sponsorName,
      },
    });

    NotificationService.send({
      tenantId,
      recipientId: 'production_desk',
      title: 'Advertisement Commercially Locked',
      body: `Ad for "${ad.sponsorName}" on page ${ad.pageNumber} is commercially locked.`,
      type: 'ADVERTISEMENT_LOCKED',
      metadata: { editionId: ad.editionId, pageNumber: ad.pageNumber, sponsor: ad.sponsorName },
    });

    return { success: true };
  }

  /**
   * Unlocks an advertisement.
   */
  public static unlockAdvertisement(
    tenantId: string,
    reservationId: string,
    unlockedBy: string
  ): { success: boolean; error?: string } {
    const ad = this.adReservations.get(reservationId);
    if (!ad) return { success: false, error: 'Advertisement reservation not found.' };
    if (ad.tenantId !== tenantId) return { success: false, error: 'Cross-tenant security violation.' };

    ad.isCommerciallyLocked = false;
    ad.lockedBy = undefined;
    ad.lockedAt = undefined;
    ad.updatedAt = new Date().toISOString();
    this.adReservations.set(reservationId, ad);

    return { success: true };
  }

  /**
   * Returns advertisements for an edition.
   */
  public static getAdvertisementsForEdition(editionId: string): EditionAdvertisementReservation[] {
    const list: EditionAdvertisementReservation[] = [];
    for (const ad of this.adReservations.values()) {
      if (ad.editionId === editionId && ad.status !== 'CANCELLED') {
        list.push(ad);
      }
    }
    return list;
  }
}
