/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Enterprise API — Scope Validation & Data Redaction Engine
 * Phase 15 Implementation
 */

import { ApiScope } from '../types/enterpriseApi';

export class ApiScopeService {
  /**
   * Endpoint Scope Catalog:
   * Maps module operation routes to their mandatory scopes.
   */
  private static readonly ENDPOINT_SCOPE_MAP: Record<string, ApiScope[]> = {
    // Identity & Tenant
    'GET /api/v1/tenant': ['tenant:read'],
    'GET /api/v1/tenant/members': ['tenant:members:read'],
    'GET /api/v1/integration/me': ['tenant:read'],

    // Newsroom
    'GET /api/v1/news': ['news:read'],
    'GET /api/v1/news/:id': ['news:read'],
    'POST /api/v1/news/submissions': ['news:submit'],
    'GET /api/v1/news/:id/status': ['news:status:read'],
    'GET /api/v1/assignments': ['assignments:read'],

    // Marketplace & Licenses
    'GET /api/v1/marketplace/listings': ['marketplace:listings:read'],
    'GET /api/v1/marketplace/listings/:id': ['marketplace:listings:read'],
    'GET /api/v1/marketplace/purchases': ['marketplace:purchases:read'],
    'GET /api/v1/licenses': ['licenses:read'],
    'GET /api/v1/licenses/:id': ['licenses:read'],

    // Editions & Production
    'GET /api/v1/editions': ['editions:read'],
    'GET /api/v1/editions/:id': ['editions:read'],
    'GET /api/v1/editions/:id/status': ['editions:read'],
    'GET /api/v1/production/jobs': ['production:status:read'],
    'GET /api/v1/production/jobs/:id': ['production:status:read'],

    // Analytics & MIS Reports
    'GET /api/v1/analytics/summary': ['analytics:read'],
    'GET /api/v1/analytics/marketplace': ['analytics:read'],
    'GET /api/v1/analytics/newsroom': ['analytics:read'],
    'GET /api/v1/analytics/production': ['analytics:read'],
    'GET /api/v1/reports': ['reports:export'],

    // Financial summaries & Payouts
    'GET /api/v1/finance/summary': ['finance:read'],
    'GET /api/v1/payouts': ['payouts:read'],
    'GET /api/v1/payouts/:id': ['payouts:read'],

    // Webhook management
    'GET /api/v1/webhooks/endpoints': ['webhooks:manage'],
    'POST /api/v1/webhooks/endpoints': ['webhooks:manage'],
    'GET /api/v1/webhooks/endpoints/:id': ['webhooks:manage'],
    'PUT /api/v1/webhooks/endpoints/:id': ['webhooks:manage'],
    'DELETE /api/v1/webhooks/endpoints/:id': ['webhooks:manage'],
    'POST /api/v1/webhooks/endpoints/:id/rotate-secret': ['webhooks:manage'],
    'POST /api/v1/webhooks/deliveries/:id/replay': ['webhooks:manage'],
    'GET /api/v1/webhooks/deliveries': ['webhooks:manage'],
    'GET /api/v1/webhooks/events': ['webhooks:manage'],

    // Developer App & Key Administration
    'GET /api/v1/developer/apps': ['developer:manage'],
    'POST /api/v1/developer/apps': ['developer:manage'],
    'GET /api/v1/developer/apps/:id': ['developer:manage'],
    'PUT /api/v1/developer/apps/:id': ['developer:manage'],
    'DELETE /api/v1/developer/apps/:id': ['developer:manage'],
    'POST /api/v1/developer/apps/:id/keys': ['developer:manage'],
    'POST /api/v1/developer/apps/:id/keys/:keyId/revoke': ['developer:manage'],
    'POST /api/v1/developer/apps/:id/keys/:keyId/rotate': ['developer:manage'],
    'GET /api/v1/developer/usage': ['developer:manage'],
  };

  /**
   * Resolve required scopes for a given method and path pattern
   */
  public static getRequiredScopes(method: string, routeKey: string): ApiScope[] {
    const key = `${method.toUpperCase()} ${routeKey}`;
    return this.ENDPOINT_SCOPE_MAP[key] || [];
  }

  /**
   * Validate that the granted scopes satisfy all required scopes
   */
  public static validateScopes(grantedScopes: ApiScope[], requiredScopes: ApiScope[]): {
    valid: boolean;
    missingScopes: ApiScope[];
  } {
    if (requiredScopes.length === 0) {
      return { valid: true, missingScopes: [] };
    }

    const missingScopes = requiredScopes.filter((scope) => !grantedScopes.includes(scope));
    return {
      valid: missingScopes.length === 0,
      missingScopes,
    };
  }

  /**
   * Data minimization and redaction for public/partner API serialization:
   * Strips bank accounts, IFSC, KYC documents, confidential reporter notes,
   * GPS coordinates, internal ledger entries, and system secrets.
   */
  public static sanitizePayloadForApi<T>(data: T, targetType: string): T {
    if (!data) return data;

    // Deep clone to avoid mutating in-memory store
    const clone = JSON.parse(JSON.stringify(data));

    if (Array.isArray(clone)) {
      return clone.map((item) => this.sanitizeItem(item, targetType)) as any;
    }

    return this.sanitizeItem(clone, targetType);
  }

  private static sanitizeItem(item: any, targetType: string): any {
    if (!item || typeof item !== 'object') return item;

    // Redact universal secret/credential fields
    const universalBlacklist = [
      'secretHash',
      'previousSecretHash',
      'signingSecret',
      'previousSigningSecret',
      'apiKey',
      'passwordHash',
      'bankAccountNumber',
      'ifscCode',
      'routingNumber',
      'ssn',
      'panNumber',
      'aadharNumber',
      'rawSecret',
      'kycDocuments',
    ];

    for (const key of universalBlacklist) {
      if (key in item) {
        delete item[key];
      }
    }

    // Module-specific data shielding
    switch (targetType) {
      case 'NEWS_ARTICLE':
      case 'NEWS_SUBMISSION':
        // Confidential evidence protection: external API consumers get evidence metadata only, not confidential field notes or precise coordinates
        if (item.evidence && Array.isArray(item.evidence)) {
          item.evidence = item.evidence.map((ev: any) => ({
            evidenceId: ev.evidenceId,
            type: ev.type,
            title: ev.title,
            verified: ev.verified,
            // Strip confidential notes and precise sensor coordinates
          }));
        }
        delete item.confidentialEditorialNotes;
        delete item.internalPlagiarismMatches;
        break;

      case 'PAYOUT':
        // Mask recipient account details
        if (item.recipientDetails) {
          item.recipientDetails = {
            beneficiaryName: item.recipientDetails.beneficiaryName || 'Authorized Payee',
            maskedAccount: '••••••••' + (item.recipientDetails.accountLast4 || '4242'),
            payoutMethod: item.recipientDetails.payoutMethod || 'BANK_TRANSFER',
          };
        }
        delete item.internalLedgerTxIds;
        break;

      case 'FINANCE_SUMMARY':
        // Expose only authorized macro figures, never internal transaction trees
        delete item.internalLedgerAuditStatus;
        delete item.bankReconciliationDiscrepancies;
        break;

      case 'MARKETPLACE_LISTING':
        // Previews should not leak full source code or unpurchased text bodies
        if (!item.isPurchased) {
          delete item.fullBodyMarkdown;
          delete item.highResAssetUrls;
        }
        break;
    }

    return item;
  }
}
