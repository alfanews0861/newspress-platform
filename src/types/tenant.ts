/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SubscriptionPlanId = 'free_starter' | 'editorial_pro' | 'newsroom_enterprise';
export type TenantStatus = 'active' | 'suspended' | 'provisioning' | 'archived';

export interface TenantContactInfo {
  email: string;
  phone?: string;
  editorialDeskEmail?: string;
  pressHotline?: string;
  city?: string;
  country?: string;
}

export interface Tenant {
  tenantId: string;
  organizationName: string;
  name?: string;
  legalName: string;
  tagline?: string;
  logoUrl?: string;
  faviconUrl?: string;
  contact: TenantContactInfo;
  subscriptionPlan: SubscriptionPlanId;
  status: TenantStatus;
  primaryTimezone: string;
  publicationFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'continuous';
  establishedYear?: number;
  newspaperBrandsCount?: number;
  activeStaffCount?: number;
  createdAt: string; // ISO 8601 or Timestamp representation
  updatedAt: string;
}

export interface OrganizationBrand {
  brandId: string;
  tenantId: string;
  brandName: string;
  frequency: 'morning_edition' | 'evening_edition' | 'weekend_edition' | 'digital_only';
  primaryFontFamily: string;
  accentColor: string;
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
}
