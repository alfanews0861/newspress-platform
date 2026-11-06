/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { isFirebaseConfigured } from '../config/firebase';
import { Tenant } from '../types/tenant';
import { TenantNotFoundError, FirestoreOperationError } from '../utils/errors';
import { MOCK_TENANTS } from './mockDataService';

export class TenantService {
  /**
   * Retrieves all available news organization tenants.
   */
  static async getAllTenants(): Promise<Tenant[]> {
    return [...MOCK_TENANTS];
  }

  /**
   * Retrieves a single tenant by tenantId.
   */
  static async getTenantById(tenantId: string): Promise<Tenant> {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDoc(doc(db, 'tenants', tenantId));
        if (snap.exists()) {
          return snap.data() as Tenant;
        }
      } catch (err) {
        console.warn('Falling back to local tenant store:', err);
      }
    }

    const tenant = MOCK_TENANTS.find((t) => t.tenantId === tenantId);
    if (!tenant) {
      throw new TenantNotFoundError(tenantId);
    }
    return tenant;
  }

  /**
   * Updates an existing tenant organization details.
   */
  static async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> {
    if (isFirebaseConfigured && db) {
      try {
        const ref = doc(db, 'tenants', tenantId);
        await updateDoc(ref, {
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        throw new FirestoreOperationError('updateTenant', 'tenants', err);
      }
    }

    const index = MOCK_TENANTS.findIndex((t) => t.tenantId === tenantId);
    if (index === -1) {
      throw new TenantNotFoundError(tenantId);
    }

    MOCK_TENANTS[index] = {
      ...MOCK_TENANTS[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return MOCK_TENANTS[index];
  }

  /**
   * Creates a new tenant organization.
   */
  static async createTenant(tenantData: Omit<Tenant, 'createdAt' | 'updatedAt'>): Promise<Tenant> {
    const now = new Date().toISOString();
    const newTenant: Tenant = {
      ...tenantData,
      createdAt: now,
      updatedAt: now,
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'tenants', newTenant.tenantId), newTenant);
      } catch (err) {
        throw new FirestoreOperationError('createTenant', 'tenants', err);
      }
    }

    MOCK_TENANTS.push(newTenant);
    return newTenant;
  }
}
