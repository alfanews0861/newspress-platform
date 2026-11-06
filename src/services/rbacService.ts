/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppPermission, OrganizationRole, PlatformRole, ReporterRole, MarketplaceRole } from '../types/rbac';
import { User, TenantMember } from '../types/user';
import {
  PLATFORM_ROLE_PERMISSIONS,
  ORGANIZATION_ROLE_PERMISSIONS,
  REPORTER_ROLE_PERMISSIONS,
  MARKETPLACE_ROLE_PERMISSIONS,
} from '../config/rbacMatrix';

export class RBACService {
  /**
   * Resolves the full effective permission set for a user in the context of their active tenant.
   */
  static resolvePermissions(
    user: User | null,
    membership: TenantMember | null
  ): Set<AppPermission> {
    const permissions = new Set<AppPermission>();

    if (!user) {
      return permissions;
    }

    // 1. Resolve Platform-Wide Permissions
    if (user.platformRole && user.platformRole !== 'none') {
      const platformPerms = PLATFORM_ROLE_PERMISSIONS[user.platformRole] || [];
      platformPerms.forEach((p) => permissions.add(p));
    }

    // If user is super_admin, they inherit all system permissions immediately
    if (user.platformRole === 'super_admin') {
      PLATFORM_ROLE_PERMISSIONS.super_admin.forEach((p) => permissions.add(p));
      return permissions;
    }

    // 2. Resolve Tenant-Scoped Permissions
    if (membership && membership.status === 'active') {
      // Organization Role
      if (membership.organizationRole) {
        const orgPerms = ORGANIZATION_ROLE_PERMISSIONS[membership.organizationRole] || [];
        orgPerms.forEach((p) => permissions.add(p));
      }

      // Reporter Affiliation Role
      if (membership.reporterRole && membership.reporterRole !== 'none') {
        const repPerms = REPORTER_ROLE_PERMISSIONS[membership.reporterRole] || [];
        repPerms.forEach((p) => permissions.add(p));
      }

      // Marketplace Participation Role
      if (membership.marketplaceRole && membership.marketplaceRole !== 'none') {
        const marketPerms = MARKETPLACE_ROLE_PERMISSIONS[membership.marketplaceRole] || [];
        marketPerms.forEach((p) => permissions.add(p));
      }

      // Custom Granular Tenant Overrides
      if (membership.customPermissions && Array.isArray(membership.customPermissions)) {
        membership.customPermissions.forEach((p) => permissions.add(p));
      }
    }

    return permissions;
  }

  /**
   * Evaluates if the given permission set or role contains a specific permission.
   */
  static hasPermission(
    permissionsOrRole: Set<AppPermission> | OrganizationRole | PlatformRole | ReporterRole | string,
    requiredPermission: AppPermission
  ): boolean {
    if (typeof permissionsOrRole === 'string') {
      const perms = new Set<AppPermission>();
      if (ORGANIZATION_ROLE_PERMISSIONS[permissionsOrRole as OrganizationRole]) {
        ORGANIZATION_ROLE_PERMISSIONS[permissionsOrRole as OrganizationRole].forEach((p) => perms.add(p));
      }
      if (PLATFORM_ROLE_PERMISSIONS[permissionsOrRole as PlatformRole]) {
        PLATFORM_ROLE_PERMISSIONS[permissionsOrRole as PlatformRole].forEach((p) => perms.add(p));
      }
      if (REPORTER_ROLE_PERMISSIONS[permissionsOrRole as ReporterRole]) {
        REPORTER_ROLE_PERMISSIONS[permissionsOrRole as ReporterRole].forEach((p) => perms.add(p));
      }
      if (perms.has('system.admin')) return true;
      return perms.has(requiredPermission);
    }

    if (permissionsOrRole.has('system.admin')) return true;
    return permissionsOrRole.has(requiredPermission);
  }

  /**
   * Evaluates if any of the requested permissions are granted.
   */
  static hasAnyPermission(permissions: Set<AppPermission>, requiredPermissions: AppPermission[]): boolean {
    if (permissions.has('system.admin')) return true;
    return requiredPermissions.some((p) => permissions.has(p));
  }

  /**
   * Evaluates if all of the requested permissions are granted.
   */
  static hasAllPermissions(permissions: Set<AppPermission>, requiredPermissions: AppPermission[]): boolean {
    if (permissions.has('system.admin')) return true;
    return requiredPermissions.every((p) => permissions.has(p));
  }
}
