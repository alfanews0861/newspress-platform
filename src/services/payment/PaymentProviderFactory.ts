/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 7 — Payment Provider Factory
 */

import { IPaymentProvider } from './IPaymentProvider';
import { MockPaymentProvider } from './MockPaymentProvider';
import { RazorpayPaymentProvider } from './RazorpayPaymentProvider';
import { StripePaymentProvider } from './StripePaymentProvider';
import { PaymentProviderType } from '../../types/billing';

export class PaymentProviderFactory {
  private static mockInstance = new MockPaymentProvider();
  private static razorpayInstance = new RazorpayPaymentProvider();
  private static stripeInstance = new StripePaymentProvider();

  public static getProvider(providerType?: PaymentProviderType): IPaymentProvider {
    const selected = providerType || (process.env.PAYMENT_PROVIDER as PaymentProviderType) || 'MOCK';

    switch (selected) {
      case 'RAZORPAY':
        return this.razorpayInstance;
      case 'STRIPE':
        return this.stripeInstance;
      case 'MOCK':
      default:
        return this.mockInstance;
    }
  }

  public static getMockProvider(): MockPaymentProvider {
    return this.mockInstance;
  }
}
