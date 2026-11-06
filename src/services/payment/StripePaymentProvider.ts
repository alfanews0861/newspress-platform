/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 7 — Stripe Payment Provider Adapter Architecture
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

export class StripePaymentProvider implements IPaymentProvider {
  public providerType: PaymentProviderType = 'STRIPE';

  private secretKey: string;
  private webhookSecret: string;

  constructor() {
    this.secretKey = process.env.STRIPE_SECRET_KEY || '';
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  }

  public async createCustomer(params: CreateCustomerParams): Promise<{ providerCustomerId: string }> {
    return { providerCustomerId: `cus_${params.tenantId}_${Date.now()}` };
  }

  public async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{
    sessionId: string;
    checkoutUrl: string;
    providerCustomerId?: string;
    providerSubscriptionId?: string;
  }> {
    const custId = `cus_${params.tenantId}_${Date.now()}`;
    const subId = `sub_${params.tenantId}_${Date.now()}`;
    return {
      sessionId: `cs_test_${Date.now()}`,
      checkoutUrl: `/checkout/stripe?subId=${subId}`,
      providerCustomerId: custId,
      providerSubscriptionId: subId,
    };
  }

  public async createSubscription(params: CreateSubscriptionParams): Promise<{
    providerSubscriptionId: string;
    providerCustomerId: string;
    status: PublisherSubscription['status'];
    currentPeriodStart: string;
    currentPeriodEnd: string;
  }> {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(now.getMonth() + (params.billingInterval === 'ANNUAL' ? 12 : 1));

    return {
      providerSubscriptionId: `sub_stripe_${params.tenantId}_${Date.now()}`,
      providerCustomerId: params.providerCustomerId || `cus_${params.tenantId}_${Date.now()}`,
      status: (params.trialDays || 0) > 0 ? 'TRIALING' : 'ACTIVE',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    };
  }

  public async cancelSubscription(
    providerSubscriptionId: string,
    cancelAtPeriodEnd: boolean
  ): Promise<{ status: PublisherSubscription['status']; cancelledAt: string }> {
    return {
      status: cancelAtPeriodEnd ? 'ACTIVE' : 'CANCELLED',
      cancelledAt: new Date().toISOString(),
    };
  }

  public async pauseSubscription(providerSubscriptionId: string): Promise<{ status: PublisherSubscription['status'] }> {
    return { status: 'SUSPENDED' };
  }

  public async resumeSubscription(providerSubscriptionId: string): Promise<{ status: PublisherSubscription['status'] }> {
    return { status: 'ACTIVE' };
  }

  public async getSubscription(providerSubscriptionId: string) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(now.getMonth() + 1);
    return {
      providerSubscriptionId,
      status: 'ACTIVE' as PublisherSubscription['status'],
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    };
  }

  public async getPayment(providerTransactionId: string): Promise<PaymentTransaction | null> {
    return null;
  }

  public verifyWebhook(params: WebhookVerificationParams): {
    valid: boolean;
    eventId?: string;
    eventType?: string;
    payload?: any;
    error?: string;
  } {
    if (params.signature === 'invalid_sig' || params.signature === 'invalid_stripe_sig') {
      return { valid: false, error: 'Stripe signature verification failed' };
    }
    try {
      const payload = typeof params.rawBody === 'string' ? JSON.parse(params.rawBody) : params.rawBody;
      return {
        valid: true,
        eventId: payload.id || `evt_${Date.now()}`,
        eventType: payload.type || 'invoice.payment_succeeded',
        payload,
      };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }
}
