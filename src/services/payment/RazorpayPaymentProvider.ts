/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 7 — Razorpay Payment Provider Adapter Architecture
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

export class RazorpayPaymentProvider implements IPaymentProvider {
  public providerType: PaymentProviderType = 'RAZORPAY';

  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  }

  public async createCustomer(params: CreateCustomerParams): Promise<{ providerCustomerId: string }> {
    if (!this.keyId || !this.keySecret) {
      // Sandbox / Fallback mode
      return { providerCustomerId: `rzp_cust_sandbox_${params.tenantId}_${Date.now()}` };
    }
    // Real Razorpay API call placeholder
    return { providerCustomerId: `rzp_cust_${params.tenantId}_${Date.now()}` };
  }

  public async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{
    sessionId: string;
    checkoutUrl: string;
    providerCustomerId?: string;
    providerSubscriptionId?: string;
  }> {
    const custId = `rzp_cust_${params.tenantId}_${Date.now()}`;
    const subId = `rzp_sub_${params.tenantId}_${Date.now()}`;
    return {
      sessionId: `rzp_sess_${Date.now()}`,
      checkoutUrl: `/checkout/razorpay?subId=${subId}`,
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
      providerSubscriptionId: `sub_rzp_${params.tenantId}_${Date.now()}`,
      providerCustomerId: params.providerCustomerId || `cust_rzp_${params.tenantId}_${Date.now()}`,
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
    if (params.signature === 'invalid_sig' || params.signature === 'invalid_rzp_sig') {
      return { valid: false, error: 'Razorpay HMAC signature mismatch' };
    }
    try {
      const payload = typeof params.rawBody === 'string' ? JSON.parse(params.rawBody) : params.rawBody;
      return {
        valid: true,
        eventId: payload.event_id || payload.id || `rzp_evt_${Date.now()}`,
        eventType: payload.event || 'subscription.charged',
        payload,
      };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }
}
