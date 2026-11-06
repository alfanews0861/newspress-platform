/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Enterprise API — Credential & Application Management Service
 * Phase 15 Implementation
 */

import crypto from 'crypto';
import {
  ApiApplication,
  ApiCredential,
  ApiCredentialWithSecret,
  ApiEnvironment,
  ApiScope,
  ALL_API_SCOPES,
} from '../types/enterpriseApi';
import { AuditService } from './auditService';

// Salt for HMAC hashing of API keys (can be augmented by environment variable)
const SECRET_HMAC_SALT = process.env.API_SECRET_HMAC_SALT || 'newspress-enterprise-hmac-salt-v1';

export interface CreateAppParams {
  tenantId: string;
  name: string;
  description?: string;
  environment: ApiEnvironment;
  allowedScopes: ApiScope[];
  rateLimitTier?: 'STARTER' | 'PRO' | 'ENTERPRISE';
  ipAllowlist?: string[];
  createdBy: string;
}

export interface CreateKeyParams {
  appId: string;
  tenantId: string;
  name: string;
  scopes: ApiScope[];
  createdBy: string;
  expiresInDays?: number;
}

export interface RotateKeyParams {
  keyId: string;
  tenantId: string;
  overlapHours?: number; // Overlap period (e.g. 24 hours)
  rotatedBy: string;
}

export interface AuthenticatedApiPrincipal {
  keyId: string;
  appId: string;
  tenantId: string;
  environment: ApiEnvironment;
  scopes: ApiScope[];
  appName: string;
  rateLimitTier: 'STARTER' | 'PRO' | 'ENTERPRISE';
}

class ApiCredentialService {
  private applications: Map<string, ApiApplication> = new Map();
  private credentials: Map<string, ApiCredential> = new Map();

  constructor() {
    this.seedDefaults();
  }

  /**
   * Seed mock / starter enterprise apps and credentials for sandbox testing
   */
  private seedDefaults(): void {
    const defaultAppId = 'app_metro_live_01';
    const defaultTenant = 'tenant-metro-chronicle';

    const defaultApp: ApiApplication = {
      appId: defaultAppId,
      tenantId: defaultTenant,
      name: 'Metro News Portal Integration',
      description: 'Primary CMS and Wire syndication external portal client',
      environment: 'LIVE',
      status: 'ACTIVE',
      allowedScopes: [...ALL_API_SCOPES],
      rateLimitTier: 'ENTERPRISE',
      createdBy: 'user-editor-in-chief',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    };
    this.applications.set(defaultApp.appId, defaultApp);

    // Seeded live key: np_live_keymetro01_secret999abc1234567890
    const rawSecret = 'secret999abc1234567890';
    const keyId = 'keymetro01';
    const fullToken = `np_live_${keyId}_${rawSecret}`;
    const hash = this.hashSecret(fullToken);

    const defaultCred: ApiCredential = {
      keyId,
      appId: defaultAppId,
      tenantId: defaultTenant,
      environment: 'LIVE',
      name: 'Primary Production Ingestion Key',
      keyPrefix: `np_live_${keyId}`,
      secretHash: hash,
      status: 'ACTIVE',
      scopes: [...ALL_API_SCOPES],
      createdAt: '2026-10-01T00:00:00Z',
      totalRequests: 1420,
      createdBy: 'user-editor-in-chief',
      lastUsedAt: '2026-10-12T03:00:00Z',
    };
    this.credentials.set(keyId, defaultCred);
  }

  public reset(): void {
    this.applications.clear();
    this.credentials.clear();
    this.seedDefaults();
  }

  // --- CRYPTOGRAPHIC UTILITIES ---

  public hashSecret(rawToken: string): string {
    return crypto.createHmac('sha256', SECRET_HMAC_SALT).update(rawToken).digest('hex');
  }

  /**
   * Constant-time verification of raw candidate secret against stored cryptographic hash
   */
  public verifySecretHash(rawToken: string, storedHash: string): boolean {
    const candidateHash = this.hashSecret(rawToken);
    try {
      const a = Buffer.from(candidateHash, 'hex');
      const b = Buffer.from(storedHash, 'hex');
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  private generateSecureRandomToken(environment: ApiEnvironment, keyId: string): string {
    const randomEntropy = crypto.randomBytes(24).toString('hex');
    const envPrefix = environment === 'LIVE' ? 'np_live' : 'np_test';
    return `${envPrefix}_${keyId}_${randomEntropy}`;
  }

  // --- APPLICATION MANAGEMENT ---

  public createApp(params: CreateAppParams): ApiApplication {
    if (!params.tenantId || !params.name) {
      throw new Error('Tenant ID and Application Name are required');
    }

    const appId = `app_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date().toISOString();

    const app: ApiApplication = {
      appId,
      tenantId: params.tenantId,
      name: params.name.trim(),
      description: params.description?.trim(),
      environment: params.environment,
      status: 'ACTIVE',
      allowedScopes: params.allowedScopes,
      rateLimitTier: params.rateLimitTier || 'PRO',
      ipAllowlist: params.ipAllowlist,
      createdBy: params.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    this.applications.set(appId, app);

    AuditService.logEvent({
      tenantId: params.tenantId,
      actorId: params.createdBy,
      actorName: 'Enterprise Admin',
      actorRole: 'admin',
      action: 'API_APP_CREATED',
      entityType: 'ApiApplication',
      entityId: appId,
      details: { name: app.name, environment: app.environment },
    });

    return { ...app };
  }

  public getApp(appId: string, tenantId?: string): ApiApplication | undefined {
    const app = this.applications.get(appId);
    if (!app) return undefined;
    if (tenantId && app.tenantId !== tenantId) return undefined;
    return { ...app };
  }

  public listApps(tenantId: string): ApiApplication[] {
    return Array.from(this.applications.values())
      .filter((a) => a.tenantId === tenantId)
      .map((a) => ({ ...a }));
  }

  public updateApp(
    appId: string,
    tenantId: string,
    updates: Partial<Pick<ApiApplication, 'name' | 'description' | 'allowedScopes' | 'rateLimitTier' | 'status' | 'ipAllowlist'>>,
    actorId: string
  ): ApiApplication {
    const app = this.applications.get(appId);
    if (!app || app.tenantId !== tenantId) {
      throw new Error('API Application not found for this tenant');
    }

    const updated: ApiApplication = {
      ...app,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.applications.set(appId, updated);

    AuditService.logEvent({
      tenantId,
      actorId,
      actorName: 'Enterprise Admin',
      actorRole: 'admin',
      action: 'API_APP_UPDATED',
      entityType: 'ApiApplication',
      entityId: appId,
      details: updates,
    });

    return { ...updated };
  }

  public deleteApp(appId: string, tenantId: string, actorId: string): boolean {
    const app = this.applications.get(appId);
    if (!app || app.tenantId !== tenantId) return false;

    // Revoke all credentials belonging to this app
    for (const cred of this.credentials.values()) {
      if (cred.appId === appId) {
        cred.status = 'REVOKED';
        cred.revokedAt = new Date().toISOString();
        cred.revokedBy = actorId;
        cred.revocationReason = 'Parent API Application deleted';
      }
    }

    this.applications.delete(appId);

    AuditService.logEvent({
      tenantId,
      actorId,
      actorName: 'Enterprise Admin',
      actorRole: 'admin',
      action: 'API_APP_DELETED',
      entityType: 'ApiApplication',
      entityId: appId,
      details: { name: app.name },
    });

    return true;
  }

  // --- CREDENTIAL MANAGEMENT ---

  public createKey(params: CreateKeyParams): ApiCredentialWithSecret {
    const app = this.applications.get(params.appId);
    if (!app || app.tenantId !== params.tenantId) {
      throw new Error('Valid parent API Application not found for this tenant');
    }
    if (app.status !== 'ACTIVE') {
      throw new Error(`Cannot create credentials for ${app.status} application`);
    }

    // Ensure scopes requested are a subset of allowedScopes on the parent app
    const invalidScopes = params.scopes.filter((s) => !app.allowedScopes.includes(s));
    if (invalidScopes.length > 0) {
      throw new Error(`Requested scopes exceed application grants: ${invalidScopes.join(', ')}`);
    }

    const keyId = `key_${crypto.randomBytes(6).toString('hex')}`;
    const rawSecret = this.generateSecureRandomToken(app.environment, keyId);
    const secretHash = this.hashSecret(rawSecret);

    const now = new Date();
    const createdAt = now.toISOString();
    let expiresAt: string | undefined = undefined;
    if (params.expiresInDays && params.expiresInDays > 0) {
      const expDate = new Date(now.getTime() + params.expiresInDays * 86400 * 1000);
      expiresAt = expDate.toISOString();
    }

    const envPrefix = app.environment === 'LIVE' ? 'np_live' : 'np_test';
    const cred: ApiCredential = {
      keyId,
      appId: params.appId,
      tenantId: params.tenantId,
      environment: app.environment,
      name: params.name.trim(),
      keyPrefix: `${envPrefix}_${keyId}`,
      secretHash,
      status: 'ACTIVE',
      scopes: params.scopes,
      createdAt,
      expiresAt,
      totalRequests: 0,
      createdBy: params.createdBy,
    };

    this.credentials.set(keyId, cred);

    AuditService.logEvent({
      tenantId: params.tenantId,
      actorId: params.createdBy,
      actorName: 'Enterprise Admin',
      actorRole: 'admin',
      action: 'API_KEY_CREATED',
      entityType: 'ApiCredential',
      entityId: keyId,
      details: { keyPrefix: cred.keyPrefix, environment: cred.environment, scopes: cred.scopes },
    });

    return {
      ...cred,
      rawSecret, // Shown ONLY here, never in get/list
    };
  }

  public rotateKey(params: RotateKeyParams): ApiCredentialWithSecret {
    const cred = this.credentials.get(params.keyId);
    if (!cred || cred.tenantId !== params.tenantId) {
      throw new Error('Credential not found for this tenant');
    }
    if (cred.status !== 'ACTIVE') {
      throw new Error(`Cannot rotate credential with status: ${cred.status}`);
    }

    const overlapHours = params.overlapHours ?? 24; // Default 24h grace window
    const overlapExpiresAt = new Date(Date.now() + overlapHours * 3600 * 1000).toISOString();

    const rawSecret = this.generateSecureRandomToken(cred.environment, cred.keyId);
    const newHash = this.hashSecret(rawSecret);

    const updated: ApiCredential = {
      ...cred,
      previousSecretHash: cred.secretHash, // Grace period verifier
      rotationOverlapExpiresAt: overlapExpiresAt,
      secretHash: newHash,
      lastUsedAt: new Date().toISOString(),
    };

    this.credentials.set(params.keyId, updated);

    AuditService.logEvent({
      tenantId: params.tenantId,
      actorId: params.rotatedBy,
      actorName: 'Enterprise Admin',
      actorRole: 'admin',
      action: 'API_KEY_ROTATED',
      entityType: 'ApiCredential',
      entityId: cred.keyId,
      details: { overlapHours, overlapExpiresAt },
    });

    return {
      ...updated,
      rawSecret,
    };
  }

  public revokeKey(keyId: string, tenantId: string, actorId: string, reason?: string): ApiCredential {
    const cred = this.credentials.get(keyId);
    if (!cred || cred.tenantId !== tenantId) {
      throw new Error('Credential not found for this tenant');
    }

    cred.status = 'REVOKED';
    cred.revokedAt = new Date().toISOString();
    cred.revokedBy = actorId;
    cred.revocationReason = reason || 'Manual administrative revocation';
    cred.previousSecretHash = undefined;

    this.credentials.set(keyId, cred);

    AuditService.logEvent({
      tenantId,
      actorId,
      actorName: 'Enterprise Admin',
      actorRole: 'admin',
      action: 'API_KEY_REVOKED',
      entityType: 'ApiCredential',
      entityId: keyId,
      details: { reason: cred.revocationReason },
    });

    return { ...cred };
  }

  public listKeys(appId: string, tenantId: string): ApiCredential[] {
    return Array.from(this.credentials.values())
      .filter((c) => c.appId === appId && c.tenantId === tenantId)
      .map((c) => ({ ...c }));
  }

  public listAllKeysForTenant(tenantId: string): ApiCredential[] {
    return Array.from(this.credentials.values())
      .filter((c) => c.tenantId === tenantId)
      .map((c) => ({ ...c }));
  }

  public getKey(keyId: string, tenantId?: string): ApiCredential | undefined {
    const cred = this.credentials.get(keyId);
    if (!cred) return undefined;
    if (tenantId && cred.tenantId !== tenantId) return undefined;
    return { ...cred };
  }

  // --- MACHINE-TO-MACHINE AUTHENTICATION ---

  /**
   * Authenticate a raw API key token (e.g. from Authorization: Bearer <token> or X-API-Key)
   * Formats:
   *   np_live_<keyId>_<random>
   *   np_test_<keyId>_<random>
   */
  public authenticateToken(rawToken: string): AuthenticatedApiPrincipal {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new Error('API token missing or invalid format');
    }

    const trimmed = rawToken.trim();
    if (!trimmed.startsWith('np_live_') && !trimmed.startsWith('np_test_')) {
      throw new Error('Malformed API key format: must start with np_live_ or np_test_');
    }

    const lastUnderscoreIdx = trimmed.lastIndexOf('_');
    if (lastUnderscoreIdx <= 8) {
      throw new Error('Malformed API key format');
    }

    const envPrefix = trimmed.startsWith('np_live_') ? 'np_live_' : 'np_test_';
    const keyId = trimmed.substring(envPrefix.length, lastUnderscoreIdx);

    const cred = this.credentials.get(keyId);
    if (!cred) {
      throw new Error('API key not found');
    }

    // Check credential status
    if (cred.status === 'REVOKED') {
      throw new Error('API key has been revoked');
    }

    // Check expiration
    if (cred.expiresAt && new Date(cred.expiresAt) < new Date()) {
      cred.status = 'EXPIRED';
      throw new Error('API key has expired');
    }

    // Verify secret with constant-time check against current hash
    let matched = this.verifySecretHash(trimmed, cred.secretHash);

    // If current hash doesn't match, check overlap grace period hash
    if (!matched && cred.previousSecretHash && cred.rotationOverlapExpiresAt) {
      const overlapStillValid = new Date(cred.rotationOverlapExpiresAt) > new Date();
      if (overlapStillValid && this.verifySecretHash(trimmed, cred.previousSecretHash)) {
        matched = true;
      }
    }

    if (!matched) {
      throw new Error('Invalid API key secret');
    }

    // Check parent application
    const app = this.applications.get(cred.appId);
    if (!app) {
      throw new Error('Parent application does not exist');
    }
    if (app.status !== 'ACTIVE') {
      throw new Error(`Parent application is ${app.status}`);
    }

    // Record usage metadata
    cred.lastUsedAt = new Date().toISOString();
    cred.totalRequests += 1;

    return {
      keyId: cred.keyId,
      appId: cred.appId,
      tenantId: cred.tenantId,
      environment: cred.environment,
      scopes: cred.scopes,
      appName: app.name,
      rateLimitTier: app.rateLimitTier,
    };
  }
}

export const apiCredentialService = new ApiCredentialService();
