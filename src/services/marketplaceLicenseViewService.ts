/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Marketplace License View & Lifecycle Service
 * Phase 12 — Public Marketplace, Publisher Acquisition Portal & Licensed Content Workspace
 */

import { NewsLicense, MarketplacePurchase } from '../types/marketplace';
import { marketplaceService } from './marketplaceService';

export interface LicenseStatusInfo {
  licenseId: string;
  articleTitle: string;
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'REVOKED' | 'CONSUMED' | 'PARTIALLY_CONSUMED';
  daysRemaining: number;
  expiresAt?: string;
  type: string;
  territory: string;
  exclusivity: boolean;
  derivativeEditingAllowed: boolean;
  attributionRequired: boolean;
  linkedEditionCodes: string[];
}

export interface LicenseAlert {
  alertId: string;
  licenseId: string;
  articleTitle: string;
  alertType: 'EXPIRING_7_DAYS' | 'EXPIRING_3_DAYS' | 'EXPIRED';
  message: string;
  daysRemaining: number;
}

export interface LicenseUsageMilestone {
  stage: 'PURCHASED' | 'LICENSED' | 'RESERVED_FOR_EDITION' | 'PLACED_ON_PAGE' | 'PUBLISHED';
  timestamp: string;
  description: string;
  details?: Record<string, any>;
}

export interface DetailedLicenseView {
  license: NewsLicense;
  purchase?: MarketplacePurchase;
  statusInfo: LicenseStatusInfo;
  usageMilestones: LicenseUsageMilestone[];
  linkedEditions: string[];
}

export class MarketplaceLicenseViewService {
  /**
   * Retrieves all licenses for a tenant enriched with status and expiration calculations.
   */
  public getTenantLicenseStatuses(tenantId: string): LicenseStatusInfo[] {
    const licenses = marketplaceService.getLicenses(tenantId);
    const now = new Date();

    return licenses.map(license => {
      const grantedAt = new Date(license.grantedAt).getTime();
      const expiresAtMs = license.expiresAt
        ? new Date(license.expiresAt).getTime()
        : grantedAt + license.durationDays * 24 * 60 * 60 * 1000;

      const msRemaining = expiresAtMs - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

      let status: LicenseStatusInfo['status'] = 'ACTIVE';

      if (license.status === 'EXPIRED' || daysRemaining <= 0) {
        status = 'EXPIRED';
      } else if (license.status === 'REVOKED') {
        status = 'REVOKED';
      } else if (daysRemaining <= 7) {
        status = 'EXPIRING_SOON';
      }

      const linkedEditions = marketplaceService.getLinkedEditionsForLicense(license.licenseId) || [];
      if (linkedEditions.length > 0 && status === 'ACTIVE') {
        status = linkedEditions.length >= (license.allowedEditions || 1) && license.allowedEditions > 0
          ? 'CONSUMED'
          : 'PARTIALLY_CONSUMED';
      }

      return {
        licenseId: license.licenseId,
        articleTitle: license.articleTitle,
        status,
        daysRemaining,
        expiresAt: license.expiresAt,
        type: license.type,
        territory: license.territory,
        exclusivity: license.exclusivity,
        derivativeEditingAllowed: license.derivativeEditingAllowed ?? true,
        attributionRequired: license.attributionRequired ?? true,
        linkedEditionCodes: linkedEditions
      };
    });
  }

  /**
   * Generates expiring license alerts for a publisher tenant.
   */
  public getExpiringAlerts(tenantId: string): LicenseAlert[] {
    const statuses = this.getTenantLicenseStatuses(tenantId);
    const alerts: LicenseAlert[] = [];

    for (const info of statuses) {
      if (info.status === 'EXPIRED' || info.daysRemaining === 0) {
        alerts.push({
          alertId: `alert_exp_${info.licenseId}`,
          licenseId: info.licenseId,
          articleTitle: info.articleTitle,
          alertType: 'EXPIRED',
          message: `Syndication license for "${info.articleTitle}" has expired. Future edition placements blocked.`,
          daysRemaining: 0
        });
      } else if (info.daysRemaining <= 3) {
        alerts.push({
          alertId: `alert_3d_${info.licenseId}`,
          licenseId: info.licenseId,
          articleTitle: info.articleTitle,
          alertType: 'EXPIRING_3_DAYS',
          message: `CRITICAL: Syndication license for "${info.articleTitle}" expires in ${info.daysRemaining} days.`,
          daysRemaining: info.daysRemaining
        });
      } else if (info.daysRemaining <= 7) {
        alerts.push({
          alertId: `alert_7d_${info.licenseId}`,
          licenseId: info.licenseId,
          articleTitle: info.articleTitle,
          alertType: 'EXPIRING_7_DAYS',
          message: `Syndication license for "${info.articleTitle}" expires in ${info.daysRemaining} days.`,
          daysRemaining: info.daysRemaining
        });
      }
    }

    return alerts;
  }

  /**
   * Builds detailed view and complete usage history milestone timeline for a license.
   */
  public getDetailedLicenseView(licenseId: string): DetailedLicenseView | undefined {
    const license = marketplaceService.getLicenseById(licenseId);
    if (!license) return undefined;

    const purchase = license.purchaseId ? marketplaceService.getPurchaseById(license.purchaseId) : undefined;
    const statuses = this.getTenantLicenseStatuses(license.buyerTenantId);
    const statusInfo = statuses.find(s => s.licenseId === licenseId) || {
      licenseId,
      articleTitle: license.articleTitle,
      status: license.status,
      daysRemaining: 365,
      type: license.type,
      territory: license.territory,
      exclusivity: license.exclusivity,
      derivativeEditingAllowed: license.derivativeEditingAllowed ?? true,
      attributionRequired: license.attributionRequired ?? true,
      linkedEditionCodes: []
    };

    const linkedEditions = marketplaceService.getLinkedEditionsForLicense(licenseId) || [];

    const milestones: LicenseUsageMilestone[] = [
      {
        stage: 'PURCHASED',
        timestamp: purchase?.purchasedAt || license.grantedAt,
        description: `Syndication rights acquired for ${license.type} scope in ${license.territory}.`,
        details: { pricePaid: purchase?.grossAmount || 0, currency: purchase?.currency || 'INR' }
      },
      {
        stage: 'LICENSED',
        timestamp: license.grantedAt,
        description: `Official license certificate ${licenseId} issued to ${license.buyerTenantName || license.buyerTenantId}.`,
        details: { exclusivity: license.exclusivity, durationDays: license.durationDays }
      }
    ];

    if (linkedEditions.length > 0) {
      milestones.push({
        stage: 'RESERVED_FOR_EDITION',
        timestamp: new Date().toISOString(),
        description: `Reserved for publication in edition(s): ${linkedEditions.join(', ')}.`,
        details: { linkedEditionCodes: linkedEditions }
      });
    }

    return {
      license,
      purchase,
      statusInfo,
      usageMilestones: milestones,
      linkedEditions
    };
  }
}

export const marketplaceLicenseViewService = new MarketplaceLicenseViewService();
