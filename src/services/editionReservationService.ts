/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 9 — Edition Content Reservation Service
 * Prevents concurrent allocation conflicts, manages story reservations, priority tags, and story withdrawals.
 */

import {
  EditionContentReservation,
  ContentReservationStatus,
  EditionStoryPriority,
  EditionContentSourceType,
  StoryWithdrawalReason,
} from '../types/editionWorkflow';
import { AuditService } from './auditService';
import { NotificationService } from './notificationService';

export class EditionReservationService {
  private static reservations: Map<string, EditionContentReservation> = new Map(); // reservationId -> res
  private static newsIndex: Map<string, string> = new Map(); // `${tenantId}_${newsId}` -> reservationId

  public static resetStore(): void {
    this.reservations.clear();
    this.newsIndex.clear();
  }

  /**
   * Reserves a story for an edition. Prevents double-allocation across or within editions.
   */
  public static reserveStory(data: {
    tenantId: string;
    editionId: string;
    newsId: string;
    reservedBy: string;
    priority: EditionStoryPriority;
    sourceType: EditionContentSourceType;
    pageIntent?: number;
    sectionIntent?: string;
    bylineCredit?: string;
    licenseId?: string;
    durationMinutes?: number;
  }): { success: boolean; reservation?: EditionContentReservation; error?: string } {
    const key = `${data.tenantId}_${data.newsId}`;
    const existingId = this.newsIndex.get(key);

    if (existingId) {
      const existing = this.reservations.get(existingId);
      if (existing) {
        const isExpired = new Date(existing.expiresAt).getTime() < Date.now();
        if (!isExpired && (existing.status === 'RESERVED' || existing.status === 'PLACED')) {
          if (existing.editionId === data.editionId) {
            return {
              success: false,
              error: `Story "${data.newsId}" is already reserved for this edition (Status: ${existing.status}).`,
            };
          } else {
            return {
              success: false,
              error: `Concurrency collision: Story "${data.newsId}" is already reserved in active edition "${existing.editionId}".`,
            };
          }
        }
      }
    }

    const now = new Date();
    const duration = data.durationMinutes || 120; // 2 hours default reservation window
    const expiresAt = new Date(now.getTime() + duration * 60000).toISOString();

    const reservationId = `res-${data.editionId}-${data.newsId}-${Date.now()}`;
    const reservation: EditionContentReservation = {
      reservationId,
      tenantId: data.tenantId,
      editionId: data.editionId,
      newsId: data.newsId,
      sourceType: data.sourceType,
      reservedBy: data.reservedBy,
      reservedAt: now.toISOString(),
      expiresAt,
      status: 'RESERVED',
      pageIntent: data.pageIntent,
      sectionIntent: data.sectionIntent,
      priority: data.priority,
      bylineCredit: data.bylineCredit,
      licenseId: data.licenseId,
    };

    this.reservations.set(reservationId, reservation);
    this.newsIndex.set(key, reservationId);

    AuditService.logEvent({
      tenantId: data.tenantId,
      actorId: data.reservedBy,
      actorName: 'Editor',
      actorRole: 'editor',
      action: 'CONTENT_RESERVED',
      entityType: 'EditionContentReservation',
      entityId: reservationId,
      details: {
        editionId: data.editionId,
        newsId: data.newsId,
        priority: data.priority,
        pageIntent: data.pageIntent,
      },
    });

    return { success: true, reservation };
  }

  /**
   * Releases an active reservation.
   */
  public static releaseReservation(
    tenantId: string,
    reservationId: string,
    releasedBy: string
  ): { success: boolean; error?: string } {
    const res = this.reservations.get(reservationId);
    if (!res) {
      return { success: false, error: `Reservation "${reservationId}" not found.` };
    }
    if (res.tenantId !== tenantId) {
      return { success: false, error: 'Cross-tenant security violation.' };
    }

    res.status = 'RELEASED';
    this.reservations.set(reservationId, res);
    this.newsIndex.delete(`${tenantId}_${res.newsId}`);

    AuditService.logEvent({
      tenantId,
      actorId: releasedBy,
      actorName: 'Editor',
      actorRole: 'editor',
      action: 'CONTENT_RELEASED',
      entityType: 'EditionContentReservation',
      entityId: reservationId,
      details: { editionId: res.editionId, newsId: res.newsId },
    });

    return { success: true };
  }

  /**
   * Marks a reservation as PLACED on a specific page.
   */
  public static markPlaced(
    reservationId: string,
    pageNumber: number,
    sectionName?: string
  ): void {
    const res = this.reservations.get(reservationId);
    if (res) {
      res.status = 'PLACED';
      res.pageIntent = pageNumber;
      if (sectionName) res.sectionIntent = sectionName;
      this.reservations.set(reservationId, res);
    }
  }

  /**
   * Withdraws a story from an edition with required reason, preserving newsroom copy and history.
   */
  public static withdrawStory(data: {
    tenantId: string;
    editionId: string;
    newsId: string;
    withdrawnBy: string;
    reason: StoryWithdrawalReason;
    notes?: string;
  }): { success: boolean; error?: string } {
    if (!data.reason) {
      return { success: false, error: 'A valid StoryWithdrawalReason is strictly required for withdrawal.' };
    }

    const key = `${data.tenantId}_${data.newsId}`;
    const resId = this.newsIndex.get(key);
    const res = resId ? this.reservations.get(resId) : undefined;

    if (res) {
      res.status = 'RELEASED';
      this.reservations.set(res.reservationId, res);
      this.newsIndex.delete(key);
    }

    AuditService.logEvent({
      tenantId: data.tenantId,
      actorId: data.withdrawnBy,
      actorName: 'Editor',
      actorRole: 'editor',
      action: 'CONTENT_WITHDRAWN',
      entityType: 'EditionContentReservation',
      entityId: resId || `withdraw-${data.newsId}`,
      reason: data.reason,
      details: {
        editionId: data.editionId,
        newsId: data.newsId,
        notes: data.notes,
      },
    });

    NotificationService.send({
      tenantId: data.tenantId,
      recipientId: 'newsroom_staff',
      title: 'Story Withdrawn from Edition',
      body: `Story ${data.newsId} was withdrawn from edition ${data.editionId} due to ${data.reason}.`,
      type: 'STORY_WITHDRAWN',
      metadata: { editionId: data.editionId, newsId: data.newsId, reason: data.reason },
    });

    return { success: true };
  }

  /**
   * Returns all reservations for an edition.
   */
  public static getReservationsForEdition(editionId: string): EditionContentReservation[] {
    const list: EditionContentReservation[] = [];
    for (const r of this.reservations.values()) {
      if (r.editionId === editionId && (r.status === 'RESERVED' || r.status === 'PLACED')) {
        list.push(r);
      }
    }
    return list;
  }

  /**
   * Returns active reservation for a story if one exists.
   */
  public static getReservationForNews(tenantId: string, newsId: string): EditionContentReservation | undefined {
    const key = `${tenantId}_${newsId}`;
    const id = this.newsIndex.get(key);
    if (!id) return undefined;
    const r = this.reservations.get(id);
    if (r && (r.status === 'RESERVED' || r.status === 'PLACED')) {
      const isExpired = new Date(r.expiresAt).getTime() < Date.now();
      if (!isExpired) return r;
    }
    return undefined;
  }
}
