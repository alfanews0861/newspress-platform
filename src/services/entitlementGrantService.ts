/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 7 — Entitlement Grant Service
 */

import { EntitlementGrant } from '../types/billing';
import { AuditService } from './auditService';

export class EntitlementGrantService {
  private static grantsStore: Map<string, EntitlementGrant[]> = new Map();

  public static resetStore(): void {
    this.grantsStore.clear();
  }

  public static createGrant(params: Omit<EntitlementGrant, 'grantId' | 'createdAt'>): EntitlementGrant {
    const grantId = `grant-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const grant: EntitlementGrant = {
      grantId,
      ...params,
      createdAt: new Date().toISOString(),
    };

    const tenantGrants = this.grantsStore.get(params.tenantId) || [];
    tenantGrants.push(grant);
    this.grantsStore.set(params.tenantId, tenantGrants);

    AuditService.logEvent({
      tenantId: params.tenantId,
      actorId: params.grantedBy,
      actorName: 'Admin',
      actorRole: 'administrator',
      action: 'ENTITLEMENT_GRANTED',
      entityType: 'EntitlementGrant',
      entityId: grantId,
      newState: grant,
      reason: params.reason,
    });

    return grant;
  }

  public static getActiveGrants(tenantId: string): EntitlementGrant[] {
    const grants = this.grantsStore.get(tenantId) || [];
    const now = new Date().getTime();

    return grants.filter((g) => {
      const start = new Date(g.startsAt).getTime();
      const end = new Date(g.endsAt).getTime();
      return now >= start && now <= end;
    });
  }

  public static getAllGrants(tenantId: string): EntitlementGrant[] {
    return this.grantsStore.get(tenantId) || [];
  }

  public static revokeGrant(grantId: string, tenantId: string, revokedBy: string): boolean {
    const grants = this.grantsStore.get(tenantId) || [];
    const idx = grants.findIndex((g) => g.grantId === grantId);
    if (idx >= 0) {
      const [removed] = grants.splice(idx, 1);
      this.grantsStore.set(tenantId, grants);

      AuditService.logEvent({
        tenantId,
        actorId: revokedBy,
        actorName: 'Admin',
        actorRole: 'administrator',
        action: 'ENTITLEMENT_REVOKED',
        entityType: 'EntitlementGrant',
        entityId: grantId,
        previousState: removed,
        reason: 'Grant manually revoked',
      });
      return true;
    }
    return false;
  }
}
