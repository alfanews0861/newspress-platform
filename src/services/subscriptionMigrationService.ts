/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 7 — Subscription Migration Service
 */

import { SubscriptionEntitlementService } from './subscriptionEntitlementService';
import { PublishingPlanId } from '../types/billing';
import { AuditService } from './auditService';

export class SubscriptionMigrationService {
  /**
   * Migrate or initialize a tenant into Phase 7 subscription architecture
   */
  public static migrateTenant(
    tenantId: string,
    initialPlanId: PublishingPlanId = 'BASIC'
  ) {
    const existing = SubscriptionEntitlementService.getSubscription(tenantId);
    if (existing) {
      return { migrated: false, subscription: existing };
    }

    const { subscription, snapshot } = SubscriptionEntitlementService.getOrCreateSubscription(
      tenantId,
      initialPlanId
    );

    AuditService.logEvent({
      tenantId,
      actorId: 'system_migration',
      actorName: 'Phase 7 Migration Engine',
      actorRole: 'system',
      action: 'ENTITLEMENT_GRANTED',
      entityType: 'PublisherSubscription',
      entityId: subscription.subscriptionId,
      newState: { planId: subscription.planId, snapshotId: snapshot.snapshotId },
      reason: `Migrated legacy Phase 1-6 tenant to Phase 7 subscription model under ${initialPlanId}`,
    });

    return { migrated: true, subscription, snapshot };
  }
}
