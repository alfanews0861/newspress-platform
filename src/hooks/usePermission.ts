/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAuth } from './useAuth';
import { AppPermission } from '../types/rbac';

export function usePermission() {
  const { hasPermission, hasAnyPermission, hasAllPermissions, permissions, isPlatformAdmin } = useAuth();

  return {
    can: (permission: AppPermission) => hasPermission(permission),
    canAny: (perms: AppPermission[]) => hasAnyPermission(perms),
    canAll: (perms: AppPermission[]) => hasAllPermissions(perms),
    permissions,
    isPlatformAdmin,
  };
}
