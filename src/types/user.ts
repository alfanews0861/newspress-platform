/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlatformRole, OrganizationRole, ReporterRole, MarketplaceRole, AppPermission } from './rbac';

/**
 * Person represents the physical real-world individual.
 * Decoupled from login credentials so individuals can belong to
 * multiple news organizations or work as independent reporters.
 */
export interface Person {
  personId: string;
  legalName: string;
  penName?: string;
  email: string;
  phone?: string;
  bio?: string;
  pressAccreditationId?: string;
  avatarUrl?: string;
  primaryTenantId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * User represents the authenticated identity account in Firebase Auth.
 */
export interface User {
  uid: string;
  userId?: string;
  personId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  platformRole: PlatformRole;
  role?: string;
  reporterRole?: ReporterRole;
  activeTenantId: string;
  status: 'active' | 'suspended' | 'invited';
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * TenantMember connects a User/Person to a specific Tenant organization
 * with explicit organizational, reporter, and marketplace roles.
 */
export interface TenantMember {
  memberId: string; // Typically `${tenantId}_${userId}`
  tenantId: string;
  userId: string;
  personId: string;
  organizationRole: OrganizationRole;
  reporterRole: ReporterRole;
  marketplaceRole: MarketplaceRole;
  customPermissions?: AppPermission[];
  status: 'active' | 'suspended' | 'pending_invitation';
  title?: string; // e.g. "Senior Foreign Correspondent", "Managing Editor"
  department?: string; // e.g. "Investigative Desk", "City Desk", "Sports"
  joinedAt: string;
  updatedAt: string;
}

export interface UserSession {
  user: User;
  person: Person;
  currentMembership: TenantMember | null;
  allMemberships: TenantMember[];
  resolvedPermissions: Set<AppPermission>;
  isPlatformAdmin: boolean;
}
