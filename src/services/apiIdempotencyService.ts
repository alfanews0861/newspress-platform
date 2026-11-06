/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Enterprise API — Idempotency Engine
 * Phase 15 Implementation
 */

import crypto from 'crypto';
import { ApiIdempotencyRecord } from '../types/enterpriseApi';

export interface IdempotencyCheckResult {
  isCached: boolean;
  record?: ApiIdempotencyRecord;
  hasConflict?: boolean;
}

class ApiIdempotencyService {
  private records: Map<string, ApiIdempotencyRecord> = new Map();
  private inFlightKeys: Set<string> = new Set();

  /**
   * Produce a composite key strictly scoped by tenant, application, and endpoint
   */
  private buildCompositeKey(tenantId: string, appId: string, endpoint: string, idempotencyKey: string): string {
    return `${tenantId}:${appId}:${endpoint}:${idempotencyKey}`;
  }

  /**
   * Produce a deterministic canonical JSON string and compute its SHA-256 fingerprint
   */
  public computeFingerprint(payload: any): string {
    if (payload === undefined || payload === null) {
      return crypto.createHash('sha256').update('').digest('hex');
    }

    const canonicalJson = this.canonicalize(payload);
    return crypto.createHash('sha256').update(canonicalJson).digest('hex');
  }

  /**
   * Sort keys recursively to ensure deterministic serialization regardless of key order
   */
  private canonicalize(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map((x) => this.canonicalize(x)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    const sortedEntries = keys.map((k) => `${JSON.stringify(k)}:${this.canonicalize(obj[k])}`);
    return '{' + sortedEntries.join(',') + '}';
  }

  /**
   * Preflight idempotency check:
   * - If previously processed with same payload: returns cached result
   * - If previously processed with different payload: marks conflict
   * - If currently in-flight by a concurrent worker: rejects or waits
   */
  public check(
    tenantId: string,
    appId: string,
    endpoint: string,
    idempotencyKey: string,
    payload: any
  ): IdempotencyCheckResult {
    const compositeKey = this.buildCompositeKey(tenantId, appId, endpoint, idempotencyKey);
    const existing = this.records.get(compositeKey);

    if (existing) {
      // Check expiration
      if (new Date(existing.expiresAt) < new Date()) {
        this.records.delete(compositeKey);
        return { isCached: false };
      }

      const currentFingerprint = this.computeFingerprint(payload);
      if (existing.requestFingerprint === currentFingerprint) {
        return { isCached: true, record: existing };
      } else {
        // Same key, different request payload => 409 Conflict
        return { isCached: false, hasConflict: true };
      }
    }

    if (this.inFlightKeys.has(compositeKey)) {
      // Concurrent duplicate request in progress
      return { isCached: false, hasConflict: true };
    }

    return { isCached: false };
  }

  /**
   * Acquire execution lock for an in-flight idempotent request
   */
  public acquireLock(tenantId: string, appId: string, endpoint: string, idempotencyKey: string): boolean {
    const compositeKey = this.buildCompositeKey(tenantId, appId, endpoint, idempotencyKey);
    if (this.inFlightKeys.has(compositeKey)) {
      return false;
    }
    this.inFlightKeys.add(compositeKey);
    return true;
  }

  /**
   * Release execution lock
   */
  public releaseLock(tenantId: string, appId: string, endpoint: string, idempotencyKey: string): void {
    const compositeKey = this.buildCompositeKey(tenantId, appId, endpoint, idempotencyKey);
    this.inFlightKeys.delete(compositeKey);
  }

  /**
   * Store the final response result associated with this idempotency key
   */
  public store(
    tenantId: string,
    appId: string,
    endpoint: string,
    idempotencyKey: string,
    payload: any,
    statusCode: number,
    responseBody: any,
    retentionHours = 24
  ): ApiIdempotencyRecord {
    const compositeKey = this.buildCompositeKey(tenantId, appId, endpoint, idempotencyKey);
    this.inFlightKeys.delete(compositeKey);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + retentionHours * 3600 * 1000).toISOString();

    const record: ApiIdempotencyRecord = {
      idempotencyKey,
      tenantId,
      appId,
      endpoint,
      requestFingerprint: this.computeFingerprint(payload),
      responseStatusCode: statusCode,
      responseBody,
      createdAt: now.toISOString(),
      expiresAt,
    };

    this.records.set(compositeKey, record);
    return record;
  }

  public clear(): void {
    this.records.clear();
    this.inFlightKeys.clear();
  }
}

export const apiIdempotencyService = new ApiIdempotencyService();
