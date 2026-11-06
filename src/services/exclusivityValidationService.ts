/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Exclusivity Validation Service
 * Phase 3 — News Marketplace, Licensing & Reporter Revenue Engine
 * 
 * Manages exclusive territorial rights, preventing overlapping or conflicting
 * syndication licenses for the same news story.
 * Note: Represents licensing rights, not copyright ownership claims.
 */

import { ExclusiveLock } from '../types/marketplace';
import { auditService } from './auditService';

export interface ExclusivityCheckParams {
  newsId: string;
  territory: string;
  validFrom: string; // ISO 8601
  validUntil: string; // ISO 8601
  candidateBuyerTenantId: string;
}

export interface ExclusivityCheckResult {
  hasCollision: boolean;
  reason?: string;
  conflictingLock?: ExclusiveLock;
}

export class ExclusivityValidationService {
  private activeLocks: Map<string, ExclusiveLock> = new Map();

  constructor() {
    // Seed with any initial mock locks if necessary
  }

  /**
   * Verifies if an exclusive license can be acquired without colliding with existing exclusive rights.
   */
  checkCollision(params: ExclusivityCheckParams): ExclusivityCheckResult {
    const { newsId, territory, validFrom, validUntil } = params;
    const reqStart = new Date(validFrom).getTime();
    const reqEnd = new Date(validUntil).getTime();

    const normalizedReqTerritory = territory.trim().toLowerCase();

    for (const lock of this.activeLocks.values()) {
      if (!lock.active) continue;
      if (lock.newsId !== newsId) continue;

      const lockStart = new Date(lock.validFrom).getTime();
      const lockEnd = new Date(lock.validUntil).getTime();

      // Check temporal overlap: [reqStart, reqEnd] intersects [lockStart, lockEnd]
      const timeOverlaps = reqStart <= lockEnd && reqEnd >= lockStart;
      if (!timeOverlaps) continue;

      // Check territorial overlap
      const normalizedLockTerritory = lock.territory.trim().toLowerCase();

      const isTerritoryConflict =
        normalizedLockTerritory === normalizedReqTerritory ||
        normalizedLockTerritory === 'national' ||
        normalizedLockTerritory === 'worldwide' ||
        normalizedReqTerritory === 'national' ||
        normalizedReqTerritory === 'worldwide';

      if (isTerritoryConflict) {
        return {
          hasCollision: true,
          conflictingLock: lock,
          reason: `Exclusive rights conflict: Story is currently licensed exclusively for "${lock.territory}" through ${new Date(lock.validUntil).toLocaleDateString()} (Lock ID: ${lock.lockId}).`
        };
      }
    }

    return { hasCollision: false };
  }

  /**
   * Atomically acquires and registers an exclusive lock for an authorized purchase.
   */
  async acquireExclusiveLock(params: {
    newsId: string;
    listingId: string;
    buyerTenantId: string;
    territory: string;
    scope: string;
    validFrom: string;
    validUntil: string;
    purchaseId: string;
    actorId: string;
    actorName: string;
  }): Promise<ExclusiveLock> {
    const collisionCheck = this.checkCollision({
      newsId: params.newsId,
      territory: params.territory,
      validFrom: params.validFrom,
      validUntil: params.validUntil,
      candidateBuyerTenantId: params.buyerTenantId
    });

    if (collisionCheck.hasCollision) {
      throw new Error(collisionCheck.reason || 'Exclusive license collision detected.');
    }

    const lockId = `exlock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const lock: ExclusiveLock = {
      lockId,
      newsId: params.newsId,
      listingId: params.listingId,
      buyerTenantId: params.buyerTenantId,
      territory: params.territory,
      scope: params.scope,
      validFrom: params.validFrom,
      validUntil: params.validUntil,
      active: true,
      purchaseId: params.purchaseId,
      createdAt: new Date().toISOString()
    };

    this.activeLocks.set(lockId, lock);

    await auditService.log({
      tenantId: params.buyerTenantId,
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: 'buyer',
      action: 'EXCLUSIVE_LOCK_CREATED',
      entityType: 'ExclusiveLock',
      entityId: lockId,
      newState: lock,
      reason: `Exclusive lock registered for territory: ${params.territory} until ${params.validUntil}`,
      metadata: {
        newsId: params.newsId,
        purchaseId: params.purchaseId,
        territory: params.territory
      }
    });

    return lock;
  }

  /**
   * Releases an exclusive lock (e.g. upon license revocation or refund).
   */
  async releaseLock(lockId: string, actorId: string, actorName: string, reason: string): Promise<boolean> {
    const lock = this.activeLocks.get(lockId);
    if (!lock) return false;

    lock.active = false;

    await auditService.log({
      tenantId: lock.buyerTenantId,
      actorId,
      actorName,
      actorRole: 'system',
      action: 'EXCLUSIVE_LOCK_RELEASED',
      entityType: 'ExclusiveLock',
      entityId: lockId,
      reason,
      metadata: { newsId: lock.newsId, territory: lock.territory }
    });

    return true;
  }

  /**
   * Retrieves active locks for a story.
   */
  getLocksForNews(newsId: string): ExclusiveLock[] {
    return Array.from(this.activeLocks.values()).filter(l => l.newsId === newsId && l.active);
  }

  getActiveLocksForNews(newsId: string): ExclusiveLock[] {
    return this.getLocksForNews(newsId);
  }

  getAllActiveLocks(): ExclusiveLock[] {
    return Array.from(this.activeLocks.values()).filter(l => l.active);
  }
}

export const exclusivityValidationService = new ExclusivityValidationService();
