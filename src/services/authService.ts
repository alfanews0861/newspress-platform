/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleAuthProvider } from './firebase';
import { isFirebaseConfigured } from '../config/firebase';
import { User, Person, TenantMember, UserSession } from '../types/user';
import { RBACService } from './rbacService';
import { AuthError } from '../utils/errors';
import {
  MOCK_USERS,
  MOCK_PERSONS,
  MOCK_TENANT_MEMBERS,
} from './mockDataService';

export class AuthService {
  /**
   * Listen to Firebase Auth state changes.
   */
  static onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    if (!isFirebaseConfigured || !auth) {
      // In offline/demo fallback mode, simulate an initial callback
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Sign in with email and password.
   */
  static async signInWithEmail(email: string, pass: string): Promise<FirebaseUser | null> {
    if (!isFirebaseConfigured || !auth) {
      throw new AuthError('Firebase credentials not configured. Please supply keys in .env or choose a simulated demo role.');
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      return cred.user;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials';
      throw new AuthError(message, 'SIGN_IN_FAILED', { email }, err);
    }
  }

  /**
   * Sign up with email and password.
   */
  static async signUpWithEmail(email: string, pass: string, displayName: string): Promise<FirebaseUser | null> {
    if (!isFirebaseConfigured || !auth) {
      throw new AuthError('Firebase is not configured for registration.');
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const user = cred.user;

      // Create base Person and User records in Firestore
      if (db) {
        const personId = `person_${user.uid}`;
        const now = new Date().toISOString();

        const personDoc: Person = {
          personId,
          legalName: displayName,
          email,
          createdAt: now,
          updatedAt: now,
        };

        const userDoc: User = {
          uid: user.uid,
          personId,
          email,
          displayName,
          platformRole: email === 'alfanewsservice@gmail.com' ? 'super_admin' : 'none',
          activeTenantId: 'tenant-metro-chronicle',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        };

        await setDoc(doc(db, 'persons', personId), personDoc);
        await setDoc(doc(db, 'users', user.uid), userDoc);
      }

      return user;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      throw new AuthError(message, 'SIGN_UP_FAILED', { email }, err);
    }
  }

  /**
   * Sign in with Google OAuth popup.
   */
  static async signInWithGoogle(): Promise<FirebaseUser | null> {
    if (!isFirebaseConfigured || !auth || !googleAuthProvider) {
      throw new AuthError('Google Sign-in is unavailable because Firebase is not configured.');
    }
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      return cred.user;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      throw new AuthError(message, 'GOOGLE_SIGN_IN_FAILED', {}, err);
    }
  }

  /**
   * Sign out current user.
   */
  static async signOut(): Promise<void> {
    if (auth) {
      await fbSignOut(auth);
    }
  }

  /**
   * Hydrates the complete UserSession including Person, Active Tenant Member,
   * all Organization Memberships, and dynamically resolved RBAC permissions.
   */
  static async hydrateSession(
    firebaseUser: FirebaseUser | null,
    activeTenantId: string,
    simulatedUserId?: string
  ): Promise<UserSession | null> {
    const targetUid = simulatedUserId || firebaseUser?.uid;

    if (!targetUid) {
      return null;
    }

    // 1. Try fetching from Firestore if live Firebase is active
    let user: User | null = null;
    let person: Person | null = null;
    let currentMembership: TenantMember | null = null;
    let allMemberships: TenantMember[] = [];

    if (isFirebaseConfigured && db) {
      try {
        const userDocSnap = await getDoc(doc(db, 'users', targetUid));
        if (userDocSnap.exists()) {
          user = userDocSnap.data() as User;
        }

        if (user?.personId) {
          const personSnap = await getDoc(doc(db, 'persons', user.personId));
          if (personSnap.exists()) {
            person = personSnap.data() as Person;
          }
        }
      } catch (err) {
        console.warn('Firestore session fetch fallback to local seed:', err);
      }
    }

    // 2. Fallback to mock persona if Firestore record not found or demo mode
    if (!user) {
      user = MOCK_USERS.find((u) => u.uid === targetUid || u.email === firebaseUser?.email) || MOCK_USERS[0];
    }

    if (!person) {
      person = MOCK_PERSONS.find((p) => p.personId === user?.personId) || MOCK_PERSONS[0];
    }

    // Load memberships for this user
    allMemberships = MOCK_TENANT_MEMBERS.filter((m) => m.userId === user?.uid);
    currentMembership = allMemberships.find((m) => m.tenantId === activeTenantId) || allMemberships[0] || null;

    // Resolve RBAC permissions
    const resolvedPermissions = RBACService.resolvePermissions(user, currentMembership);
    const isPlatformAdmin = user.platformRole === 'super_admin' || user.platformRole === 'platform_admin';

    return {
      user,
      person,
      currentMembership,
      allMemberships,
      resolvedPermissions,
      isPlatformAdmin,
    };
  }
}
