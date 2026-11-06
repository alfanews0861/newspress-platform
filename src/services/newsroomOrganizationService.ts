/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 8 — Newsroom Organization & Tenant Adapter Service
 */

import { NewsroomOrganization } from '../types/newsroom';
import { MOCK_TENANTS } from './mockDataService';
import { auditService } from './auditService';

const organizationStore: Map<string, NewsroomOrganization> = new Map();

export class NewsroomOrganizationService {
  public static resetStore(): void {
    organizationStore.clear();
  }

  /**
   * Retrieves or provisions the NewsroomOrganization for a given tenant.
   * Leverages existing Tenant architecture as canonical source.
   */
  public static getOrCreateOrganization(tenantId: string): NewsroomOrganization {
    let org = organizationStore.get(tenantId);
    if (!org) {
      const tenant = MOCK_TENANTS.find((t) => t.tenantId === tenantId);
      const now = new Date().toISOString();
      org = {
        organizationId: `org_${tenantId}`,
        tenantId,
        name: tenant?.organizationName || 'Metropolitan News Organization',
        shortName: (tenant?.organizationName || 'Metro').substring(0, 10),
        logoUrl: tenant?.logoUrl || '/assets/default-publisher-logo.png',
        primaryLanguage: 'en',
        defaultState: 'New York',
        defaultDistrict: 'Manhattan & Boroughs',
        timezone: tenant?.primaryTimezone || 'America/New_York',
        contactEmail: tenant?.contact?.email || 'editorial@newspress.org',
        contactPhone: tenant?.contact?.phone || '+1-555-NEWS-DESK',
        status: tenant?.status === 'suspended' ? 'SUSPENDED' : 'ACTIVE',
        createdAt: tenant?.createdAt || now,
        updatedAt: tenant?.updatedAt || now,
      };
      organizationStore.set(tenantId, org);
    }
    return org;
  }

  /**
   * Updates organization metadata.
   */
  public static async updateOrganization(
    tenantId: string,
    updates: Partial<NewsroomOrganization>,
    actorId: string,
    actorName: string
  ): Promise<NewsroomOrganization> {
    const existing = this.getOrCreateOrganization(tenantId);
    const updated: NewsroomOrganization = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    organizationStore.set(tenantId, updated);

    await auditService.log({
      tenantId,
      actorId,
      actorName,
      actorRole: 'admin',
      action: 'STATUS_CHANGE',
      entityType: 'NewsroomOrganization',
      entityId: updated.organizationId,
      previousState: existing,
      newState: updated,
    });

    return updated;
  }
}
