/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 7 — Payment Provider Interface
 */

import {
  PaymentProviderType,
  PublishingPlanId,
  BillingInterval,
  PublisherSubscription,
  Invoice,
  PaymentTransaction,
} from '../../types/billing';

export interface CreateCustomerParams {
  tenantId: string;
  name: string;
  email: string;
  phone?: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
}

export interface CreateCheckoutSessionParams {
  tenantId: string;
  planId: PublishingPlanId;
  planVersion: number;
  billingInterval: BillingInterval;
  currency: string;
  price: number;
  customerEmail: string;
  customerName: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface CreateSubscriptionParams {
  tenantId: string;
  planId: PublishingPlanId;
  planVersion: number;
  billingInterval: BillingInterval;
  currency: string;
  price: number;
  providerCustomerId?: string;
  trialDays?: number;
}

export interface WebhookVerificationParams {
  rawBody: string;
  signature: string;
  headers?: Record<string, string>;
}

export interface IPaymentProvider {
  providerType: PaymentProviderType;

  createCustomer(params: CreateCustomerParams): Promise<{ providerCustomerId: string }>;

  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{
    sessionId: string;
    checkoutUrl: string;
    providerCustomerId?: string;
    providerSubscriptionId?: string;
  }>;

  createSubscription(params: CreateSubscriptionParams): Promise<{
    providerSubscriptionId: string;
    providerCustomerId: string;
    status: PublisherSubscription['status'];
    currentPeriodStart: string;
    currentPeriodEnd: string;
  }>;

  cancelSubscription(
    providerSubscriptionId: string,
    cancelAtPeriodEnd: boolean
  ): Promise<{ status: PublisherSubscription['status']; cancelledAt: string }>;

  pauseSubscription(providerSubscriptionId: string): Promise<{ status: PublisherSubscription['status'] }>;

  resumeSubscription(providerSubscriptionId: string): Promise<{ status: PublisherSubscription['status'] }>;

  getSubscription(providerSubscriptionId: string): Promise<{
    providerSubscriptionId: string;
    status: PublisherSubscription['status'];
    currentPeriodStart: string;
    currentPeriodEnd: string;
  } | null>;

  getPayment(providerTransactionId: string): Promise<PaymentTransaction | null>;

  verifyWebhook(params: WebhookVerificationParams): {
    valid: boolean;
    eventId?: string;
    eventType?: string;
    payload?: any;
    error?: string;
  };
}
