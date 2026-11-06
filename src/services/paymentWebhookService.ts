/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 7 — Payment Webhook Processing Engine
 */

import {
  PaymentWebhookEvent,
  PaymentProviderType,
  PaymentTransaction,
} from '../types/billing';
import { PaymentProviderFactory } from './payment/PaymentProviderFactory';
import { SubscriptionEntitlementService } from './subscriptionEntitlementService';
import { InvoiceService } from './invoiceService';
import { AuditService } from './auditService';

export class PaymentWebhookService {
  private static eventsStore: Map<string, PaymentWebhookEvent> = new Map(); // webhookEventId -> record
  private static idempotencySet: Set<string> = new Set(); // provider:providerEventId

  public static resetStore(): void {
    this.eventsStore.clear();
    this.idempotencySet.clear();
  }

  /**
   * Process incoming webhook safely with idempotency & signature verification
   */
  public static async processWebhook(params: {
    provider: PaymentProviderType;
    rawBody: string;
    signature: string;
    headers?: Record<string, string>;
  }): Promise<{
    success: boolean;
    duplicate: boolean;
    event?: PaymentWebhookEvent;
    error?: string;
  }> {
    const providerInstance = PaymentProviderFactory.getProvider(params.provider);
    const verifyResult = providerInstance.verifyWebhook({
      rawBody: params.rawBody,
      signature: params.signature,
      headers: params.headers,
    });

    if (!verifyResult.valid) {
      return {
        success: false,
        duplicate: false,
        error: verifyResult.error || 'Webhook signature verification failed.',
      };
    }

    const providerEventId = verifyResult.eventId || `evt-${Date.now()}`;
    const idempotencyKey = `${params.provider}:${providerEventId}`;

    if (this.idempotencySet.has(idempotencyKey)) {
      // Find existing event record
      const existing = Array.from(this.eventsStore.values()).find(
        (e) => e.provider === params.provider && e.providerEventId === providerEventId
      );
      return {
        success: true,
        duplicate: true,
        event: existing,
      };
    }

    this.idempotencySet.add(idempotencyKey);

    const webhookEventId = `whevt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const eventRecord: PaymentWebhookEvent = {
      webhookEventId,
      provider: params.provider,
      providerEventId,
      eventType: verifyResult.eventType || 'unknown',
      signatureVerified: true,
      receivedAt: new Date().toISOString(),
      processingStatus: 'PROCESSED',
      payloadHash: `hash-${Date.now()}`,
      attemptCount: 1,
      payload: verifyResult.payload,
    };

    this.eventsStore.set(webhookEventId, eventRecord);

    // Map provider event to normalized state changes
    try {
      await this.handleNormalizedEvent(eventRecord);
    } catch (err: any) {
      eventRecord.processingStatus = 'FAILED';
      eventRecord.errorCode = err.message;
      this.eventsStore.set(webhookEventId, eventRecord);
      return { success: false, duplicate: false, event: eventRecord, error: err.message };
    }

    return { success: true, duplicate: false, event: eventRecord };
  }

  /**
   * Internal transactional state handler
   */
  private static async handleNormalizedEvent(event: PaymentWebhookEvent): Promise<void> {
    const payload = event.payload || {};
    const tenantId = payload.tenantId || payload.metadata?.tenantId || 'tenant-metro-chronicle';
    const eventType = (event.eventType || '').toLowerCase();

    const { subscription: sub, snapshot } = SubscriptionEntitlementService.getOrCreateSubscription(tenantId);

    if (eventType.includes('payment_succeeded') || eventType.includes('charged') || eventType.includes('payment.captured')) {
      // Handle successful payment
      sub.status = 'ACTIVE';
      sub.updatedAt = new Date().toISOString();

      // Extend current period
      const now = new Date();
      const nextPeriodEnd = new Date(now);
      nextPeriodEnd.setMonth(now.getMonth() + (sub.billingInterval === 'ANNUAL' ? 12 : 1));
      sub.currentPeriodStart = now.toISOString();
      sub.currentPeriodEnd = nextPeriodEnd.toISOString();

      SubscriptionEntitlementService.setSubscription(tenantId, sub, snapshot.features, snapshot.limits);

      // Create & mark paid invoice
      const invoice = InvoiceService.createInvoice({
        tenantId,
        subscriptionId: sub.subscriptionId,
        provider: event.provider,
        planId: sub.planId,
        planName: sub.planId,
        amount: sub.price,
        currency: sub.currency,
        billingPeriodStart: sub.currentPeriodStart,
        billingPeriodEnd: sub.currentPeriodEnd,
      });
      InvoiceService.markInvoicePaid(tenantId, invoice.invoiceId, now.toISOString());

      AuditService.logEvent({
        tenantId,
        actorId: 'system_webhook',
        actorName: `${event.provider} Webhook`,
        actorRole: 'webhook',
        action: 'PAYMENT_CAPTURED',
        entityType: 'PublisherSubscription',
        entityId: sub.subscriptionId,
        newState: { status: 'ACTIVE', currentPeriodEnd: sub.currentPeriodEnd },
        reason: `Payment captured via ${event.provider} webhook`,
      });
    } else if (eventType.includes('payment_failed') || eventType.includes('failed')) {
      // Handle payment failure -> PAST_DUE -> GRACE_PERIOD
      sub.status = 'PAST_DUE';
      sub.gracePeriodStart = new Date().toISOString();
      const graceEnd = new Date();
      graceEnd.setDate(graceEnd.getDate() + 7); // 7-day grace period
      sub.gracePeriodEnd = graceEnd.toISOString();
      sub.updatedAt = new Date().toISOString();

      SubscriptionEntitlementService.setSubscription(tenantId, sub, snapshot.features, snapshot.limits);

      AuditService.logEvent({
        tenantId,
        actorId: 'system_webhook',
        actorName: `${event.provider} Webhook`,
        actorRole: 'webhook',
        action: 'PAYMENT_FAILED',
        entityType: 'PublisherSubscription',
        entityId: sub.subscriptionId,
        newState: { status: 'PAST_DUE', gracePeriodEnd: sub.gracePeriodEnd },
        reason: `Payment failed via ${event.provider} webhook. Transitioned to PAST_DUE and grace period started.`,
      });
    } else if (eventType.includes('cancelled') || eventType.includes('subscription.deleted')) {
      sub.status = 'CANCELLED';
      sub.endedAt = new Date().toISOString();
      sub.updatedAt = new Date().toISOString();

      SubscriptionEntitlementService.setSubscription(tenantId, sub, snapshot.features, snapshot.limits);

      AuditService.logEvent({
        tenantId,
        actorId: 'system_webhook',
        actorName: `${event.provider} Webhook`,
        actorRole: 'webhook',
        action: 'SUBSCRIPTION_CANCELLED',
        entityType: 'PublisherSubscription',
        entityId: sub.subscriptionId,
        newState: { status: 'CANCELLED' },
      });
    }
  }

  public static getWebhookEvents(): PaymentWebhookEvent[] {
    return Array.from(this.eventsStore.values());
  }
}
