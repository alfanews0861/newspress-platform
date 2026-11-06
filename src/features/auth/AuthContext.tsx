/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User, Person, TenantMember, UserSession } from '../../types/user';
import { AppPermission, OrganizationRole, PlatformRole, ReporterRole, MarketplaceRole } from '../../types/rbac';
import { AuthService } from '../../services/authService';
import { RBACService } from '../../services/rbacService';
import { MOCK_USERS, MOCK_PERSONS, MOCK_TENANT_MEMBERS } from '../../services/mockDataService';

export interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  person: Person | null;
  currentMembership: TenantMember | null;
  allMemberships: TenantMember[];
  permissions: Set<AppPermission>;
  isPlatformAdmin: boolean;
  isLoading: boolean;
  simulatedUserId: string;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, displayName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  switchSimulatedPersona: (userId: string) => void;
  hasPermission: (permission: AppPermission) => boolean;
  hasAnyPermission: (permissions: AppPermission[]) => boolean;
  hasAllPermissions: (permissions: AppPermission[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode; activeTenantId: string }> = ({
  children,
  activeTenantId,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [simulatedUserId, setSimulatedUserId] = useState<string>('user-alfa-superadmin');
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync auth state
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged(async (fbUser) => {
      setFirebaseUser(fbUser);
      try {
        const hyd = await AuthService.hydrateSession(fbUser, activeTenantId, simulatedUserId);
        setSession(hyd);
      } catch (err) {
        console.error('Failed to hydrate session:', err);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Re-hydrate if activeTenantId or simulatedUserId changes
  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);

    AuthService.hydrateSession(firebaseUser, activeTenantId, simulatedUserId)
      .then((hyd) => {
        if (isCurrent) {
          setSession(hyd);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Session update error:', err);
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [activeTenantId, simulatedUserId, firebaseUser]);

  const loginWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const fbUser = await AuthService.signInWithEmail(email, pass);
      setFirebaseUser(fbUser);
    } finally {
      setIsLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string, displayName: string) => {
    setIsLoading(true);
    try {
      const fbUser = await AuthService.signUpWithEmail(email, pass, displayName);
      setFirebaseUser(fbUser);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const fbUser = await AuthService.signInWithGoogle();
      setFirebaseUser(fbUser);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await AuthService.signOut();
    setFirebaseUser(null);
    // Reset to default simulated user for demo inspection
    setSimulatedUserId('user-alfa-superadmin');
  };

  const switchSimulatedPersona = (userId: string) => {
    setSimulatedUserId(userId);
  };

  const hasPermission = (permission: AppPermission) => {
    if (!session) return false;
    return RBACService.hasPermission(session.resolvedPermissions, permission);
  };

  const hasAnyPermission = (permissions: AppPermission[]) => {
    if (!session) return false;
    return RBACService.hasAnyPermission(session.resolvedPermissions, permissions);
  };

  const hasAllPermissions = (permissions: AppPermission[]) => {
    if (!session) return false;
    return RBACService.hasAllPermissions(session.resolvedPermissions, permissions);
  };

  const value: AuthContextValue = {
    firebaseUser,
    user: session?.user || null,
    person: session?.person || null,
    currentMembership: session?.currentMembership || null,
    allMemberships: session?.allMemberships || [],
    permissions: session?.resolvedPermissions || new Set(),
    isPlatformAdmin: session?.isPlatformAdmin || false,
    isLoading,
    simulatedUserId,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logout,
    switchSimulatedPersona,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
