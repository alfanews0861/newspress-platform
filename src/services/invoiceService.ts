/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 7 — Invoice Service
 */

import {
  Invoice,
  InvoiceLineItem,
  PaymentProviderType,
  PublishingPlanId,
} from '../types/billing';
import { TaxService } from './taxService';
import { AuditService } from './auditService';

export class InvoiceService {
  private static invoicesStore: Map<string, Invoice[]> = new Map(); // tenantId -> invoices
  private static globalInvoiceSeq = 1000;

  public static resetStore(): void {
    this.invoicesStore.clear();
    this.globalInvoiceSeq = 1000;
  }

  public static createInvoice(params: {
    tenantId: string;
    subscriptionId: string;
    provider: PaymentProviderType;
    planId: PublishingPlanId;
    planName: string;
    amount: number;
    currency: string;
    billingPeriodStart: string;
    billingPeriodEnd: string;
    country?: string;
    state?: string;
    discount?: number;
    providerInvoiceId?: string;
  }): Invoice {
    this.globalInvoiceSeq += 1;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${this.globalInvoiceSeq}`;
    const invoiceId = `inv-${params.tenantId}-${Date.now()}`;

    const discountAmount = params.discount || 0;
    const subtotal = Math.max(0, params.amount - discountAmount);

    const { taxTotal, details: taxDetails } = TaxService.calculateTax(subtotal, params.country || 'IN', params.state);
    const total = subtotal + taxTotal;

    const lineItems: InvoiceLineItem[] = [
      {
        itemId: `item-plan-${params.planId}`,
        description: `Subscription: ${params.planName} (${params.planId})`,
        quantity: 1,
        unitPrice: params.amount,
        amount: params.amount,
      },
    ];

    if (discountAmount > 0) {
      lineItems.push({
        itemId: 'item-discount',
        description: 'Promotional / Billing Discount',
        quantity: 1,
        unitPrice: -discountAmount,
        amount: -discountAmount,
      });
    }

    const now = new Date().toISOString();
    const dueAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();

    const invoice: Invoice = {
      invoiceId,
      tenantId: params.tenantId,
      subscriptionId: params.subscriptionId,
      provider: params.provider,
      providerInvoiceId: params.providerInvoiceId,
      invoiceNumber,
      currency: params.currency,
      lineItems,
      subtotal,
      tax: taxTotal,
      taxDetails,
      discount: discountAmount,
      total,
      status: 'OPEN',
      billingPeriodStart: params.billingPeriodStart,
      billingPeriodEnd: params.billingPeriodEnd,
      issuedAt: now,
      dueAt,
      createdAt: now,
      updatedAt: now,
    };

    const tenantInvoices = this.invoicesStore.get(params.tenantId) || [];
    tenantInvoices.push(invoice);
    this.invoicesStore.set(params.tenantId, tenantInvoices);

    AuditService.logEvent({
      tenantId: params.tenantId,
      actorId: 'system',
      actorName: 'Invoice Engine',
      actorRole: 'system',
      action: 'INVOICE_CREATED',
      entityType: 'Invoice',
      entityId: invoiceId,
      newState: { invoiceNumber, total, currency: params.currency },
      reason: `Invoice created for subscription ${params.subscriptionId}`,
    });

    return invoice;
  }

  public static markInvoicePaid(
    tenantId: string,
    invoiceId: string,
    paidAt: string = new Date().toISOString()
  ): Invoice | null {
    const invoices = this.invoicesStore.get(tenantId) || [];
    const invoice = invoices.find((i) => i.invoiceId === invoiceId);
    if (!invoice) return null;

    invoice.status = 'PAID';
    invoice.paidAt = paidAt;
    invoice.updatedAt = new Date().toISOString();

    AuditService.logEvent({
      tenantId,
      actorId: 'system',
      actorName: 'Invoice Engine',
      actorRole: 'system',
      action: 'INVOICE_PAID',
      entityType: 'Invoice',
      entityId: invoiceId,
      newState: { status: 'PAID', paidAt },
      reason: `Invoice ${invoice.invoiceNumber} paid successfully`,
    });

    return invoice;
  }

  public static markInvoiceFailed(tenantId: string, invoiceId: string): Invoice | null {
    const invoices = this.invoicesStore.get(tenantId) || [];
    const invoice = invoices.find((i) => i.invoiceId === invoiceId);
    if (!invoice) return null;

    invoice.status = 'FAILED';
    invoice.updatedAt = new Date().toISOString();
    return invoice;
  }

  public static getTenantInvoices(tenantId: string): Invoice[] {
    return this.invoicesStore.get(tenantId) || [];
  }

  public static getAllInvoices(): Invoice[] {
    const all: Invoice[] = [];
    this.invoicesStore.forEach((list) => all.push(...list));
    return all;
  }
}
