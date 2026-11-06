/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 7 — Tax Calculation Service
 */

import { TaxConfiguration, InvoiceTaxDetail } from '../types/billing';

export class TaxService {
  private static taxConfigs: TaxConfiguration[] = [
    {
      taxConfigId: 'tax-in-gst-default',
      taxType: 'GST',
      ratePercent: 18,
      country: 'IN',
      effectiveFrom: '2026-01-01T00:00:00.000Z',
    },
  ];

  public static getTaxConfigurations(): TaxConfiguration[] {
    return [...this.taxConfigs];
  }

  public static setTaxConfiguration(config: TaxConfiguration): void {
    const idx = this.taxConfigs.findIndex((c) => c.taxConfigId === config.taxConfigId);
    if (idx >= 0) {
      this.taxConfigs[idx] = config;
    } else {
      this.taxConfigs.push(config);
    }
  }

  /**
   * Calculate tax breakdown and return total tax amount
   */
  public static calculateTax(
    subtotal: number,
    country: string = 'IN',
    state?: string
  ): { taxTotal: number; details: InvoiceTaxDetail[] } {
    if (subtotal <= 0) {
      return { taxTotal: 0, details: [] };
    }

    const applicable = this.taxConfigs.find(
      (c) => c.country.toUpperCase() === country.toUpperCase() && (!c.state || c.state === state)
    ) || {
      taxConfigId: 'default-fallback',
      taxType: 'GST',
      ratePercent: 18,
      country: country || 'IN',
      effectiveFrom: '2026-01-01T00:00:00.000Z',
    };

    if (applicable.country.toUpperCase() === 'IN') {
      // Split into CGST (9%) and SGST (9%) if same state or unspecified, else IGST (18%)
      const isInterstate = state && state.toLowerCase() !== 'telangana' && state.toLowerCase() !== 'hyderabad';
      if (isInterstate) {
        const igstAmount = Math.round((subtotal * applicable.ratePercent) / 100);
        return {
          taxTotal: igstAmount,
          details: [
            {
              taxType: 'IGST',
              ratePercent: applicable.ratePercent,
              amount: igstAmount,
            },
          ],
        };
      } else {
        const halfRate = applicable.ratePercent / 2;
        const cgstAmount = Math.round((subtotal * halfRate) / 100);
        const sgstAmount = Math.round((subtotal * halfRate) / 100);
        return {
          taxTotal: cgstAmount + sgstAmount,
          details: [
            { taxType: 'CGST', ratePercent: halfRate, amount: cgstAmount },
            { taxType: 'SGST', ratePercent: halfRate, amount: sgstAmount },
          ],
        };
      }
    }

    const standardTaxAmount = Math.round((subtotal * applicable.ratePercent) / 100);
    return {
      taxTotal: standardTaxAmount,
      details: [
        {
          taxType: applicable.taxType,
          ratePercent: applicable.ratePercent,
          amount: standardTaxAmount,
        },
      ],
    };
  }
}
