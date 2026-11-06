/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 7 — Mock Payment Provider Implementation
 */

import {
  IPaymentProvider,
  CreateCustomerParams,
  CreateCheckoutSessionParams,
  CreateSubscriptionParams,
  WebhookVerificationParams,
} from './IPaymentProvider';
import {
  PaymentProviderType,
  PublisherSubscription,
  PaymentTransaction,
} from '../../types/billing';

export class MockPaymentProvider implements IPaymentProvider {
  public providerType: PaymentProviderType = 'MOCK';

  private customers: Map<string, string> = new Map(); // tenantId -> providerCustomerId
  private subscriptions: Map<string, any> = new Map(); // providerSubscriptionId -> sub details
  private transactions: Map<string, PaymentTransaction> = new Map();

  public async createCustomer(params: CreateCustomerParams): Promise<{ providerCustomerId: string }> {
    const providerCustomerId = `mock_cust_${params.tenantId}_${Date.now()}`;
    this.customers.set(params.tenantId, providerCustomerId);
    return { providerCustomerId };
  }

  public async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{
    sessionId: string;
    checkoutUrl: string;
    providerCustomerId?: string;
    providerSubscriptionId?: string;
  }> {
    const providerCustomerId = this.customers.get(params.tenantId) || `mock_cust_${params.tenantId}_${Date.now()}`;
    const providerSubscriptionId = `mock_sub_${params.tenantId}_${Date.now()}`;
    const sessionId = `mock_session_${Date.now()}`;

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(now.getMonth() + (params.billingInterval === 'ANNUAL' ? 12 : 1));

    this.subscriptions.set(providerSubscriptionId, {
      providerSubscriptionId,
      providerCustomerId,
      tenantId: params.tenantId,
      planId: params.planId,
      status: 'ACTIVE',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    });

    return {
      sessionId,
      checkoutUrl: `/checkout/mock?sessionId=${sessionId}&subId=${providerSubscriptionId}`,
      providerCustomerId,
      providerSubscriptionId,
    };
  }

  public async createSubscription(params: CreateSubscriptionParams): Promise<{
    providerSubscriptionId: string;
    providerCustomerId: string;
    status: PublisherSubscription['status'];
    currentPeriodStart: string;
    currentPeriodEnd: string;
  }> {
    const providerCustomerId = params.providerCustomerId || `mock_cust_${params.tenantId}_${Date.now()}`;
    const providerSubscriptionId = `mock_sub_${params.tenantId}_${Date.now()}`;

    const now = new Date();
    const isTrial = (params.trialDays || 0) > 0;
    const initialStatus: PublisherSubscription['status'] = isTrial ? 'TRIALING' : 'ACTIVE';

    const periodEnd = new Date(now);
    if (isTrial) {
      periodEnd.setDate(now.getDate() + (params.trialDays || 14));
    } else {
      periodEnd.setMonth(now.getMonth() + (params.billingInterval === 'ANNUAL' ? 12 : 1));
    }

    const record = {
      providerSubscriptionId,
      providerCustomerId,
      tenantId: params.tenantId,
      planId: params.planId,
      status: initialStatus,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    };

    this.subscriptions.set(providerSubscriptionId, record);

    return {
      providerSubscriptionId,
      providerCustomerId,
      status: initialStatus,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    };
  }

  public async cancelSubscription(
    providerSubscriptionId: string,
    cancelAtPeriodEnd: boolean
  ): Promise<{ status: PublisherSubscription['status']; cancelledAt: string }> {
    const sub = this.subscriptions.get(providerSubscriptionId);
    const now = new Date().toISOString();

    if (sub) {
      sub.status = cancelAtPeriodEnd ? 'ACTIVE' : 'CANCELLED';
      sub.cancelledAt = now;
      sub.cancelAtPeriodEnd = cancelAtPeriodEnd;
      this.subscriptions.set(providerSubscriptionId, sub);
    }

    return {
      status: cancelAtPeriodEnd ? 'ACTIVE' : 'CANCELLED',
      cancelledAt: now,
    };
  }

  public async pauseSubscription(providerSubscriptionId: string): Promise<{ status: PublisherSubscription['status'] }> {
    const sub = this.subscriptions.get(providerSubscriptionId);
    if (sub) {
      sub.status = 'SUSPENDED';
      this.subscriptions.set(providerSubscriptionId, sub);
    }
    return { status: 'SUSPENDED' };
  }

  public async resumeSubscription(providerSubscriptionId: string): Promise<{ status: PublisherSubscription['status'] }> {
    const sub = this.subscriptions.get(providerSubscriptionId);
    if (sub) {
      sub.status = 'ACTIVE';
      this.subscriptions.set(providerSubscriptionId, sub);
    }
    return { status: 'ACTIVE' };
  }

  public async getSubscription(providerSubscriptionId: string) {
    const sub = this.subscriptions.get(providerSubscriptionId);
    if (!sub) return null;
    return {
      providerSubscriptionId: sub.providerSubscriptionId,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
    };
  }

  public async getPayment(providerTransactionId: string): Promise<PaymentTransaction | null> {
    return this.transactions.get(providerTransactionId) || null;
  }

  public verifyWebhook(params: WebhookVerificationParams): {
    valid: boolean;
    eventId?: string;
    eventType?: string;
    payload?: any;
    error?: string;
  } {
    try {
      const payload = typeof params.rawBody === 'string' ? JSON.parse(params.rawBody) : params.rawBody;
      if (params.signature && params.signature === 'invalid_sig') {
        return { valid: false, error: 'Invalid mock signature' };
      }
      return {
        valid: true,
        eventId: payload.id || payload.eventId || `mock_evt_${Date.now()}`,
        eventType: payload.type || payload.event || 'payment.captured',
        payload,
      };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  // Test helper to record transactions
  public recordMockTransaction(tx: PaymentTransaction): void {
    this.transactions.set(tx.providerTransactionId, tx);
  }
}
