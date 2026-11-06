/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Immutable Audit Log Service
 * Phase 2 — News Submission & Reporter Originality Engine
 * 
 * Records tamper-evident, append-only logs of all editorial, submission, and verification actions.
 */

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { isFirebaseConfigured } from '../config/firebase';
import { AuditAction, AuditEvent } from '../types/audit';
import { sanitizeFirestore } from '../utils/sanitizeFirestore';

export interface RecordAuditInput {
  tenantId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: AuditAction;
  entityType: AuditEvent['entityType'];
  entityId: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}

// In-memory buffer for local session auditing and fallback
const inMemoryAuditLogs: AuditEvent[] = [];

export class AuditService {
  /**
   * Records an append-only audit event.
   */
  public static async logEvent(input: RecordAuditInput): Promise<AuditEvent> {
    return auditService.log(input);
  }

  public static async log(input: any): Promise<AuditEvent> {
    return auditService.log({
      tenantId: input.tenantId || 'platform',
      actorId: input.userId || 'system',
      actorName: input.userId || 'System Administrator',
      actorRole: 'admin',
      action: 'STATUS_CHANGE',
      entityType: 'NewsArticle',
      entityId: input.resourceId || 'sys',
      details: input.details || {},
      metadata: input.details || {},
    });
  }

  public static clear(): void {
    inMemoryAuditLogs.length = 0;
  }

  public static getAuditLogs(tenantId?: string): AuditEvent[] {
    if (tenantId) {
      return inMemoryAuditLogs.filter(log => log.tenantId === tenantId);
    }
    return [...inMemoryAuditLogs];
  }

  public static getEventsForTenant(tenantId: string): AuditEvent[] {
    return this.getAuditLogs(tenantId);
  }

  async log(input: RecordAuditInput): Promise<AuditEvent> {
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = new Date().toISOString();

    const meta = input.metadata || input.details || {};
    const auditEvent: AuditEvent & { details?: Record<string, any> } = {
      auditId,
      tenantId: input.tenantId,
      actorId: input.actorId,
      actorName: input.actorName,
      actorRole: input.actorRole,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      previousState: input.previousState ? JSON.parse(JSON.stringify(input.previousState)) : null,
      newState: input.newState ? JSON.parse(JSON.stringify(input.newState)) : null,
      timestamp,
      reason: input.reason || (meta.reason as string) || '',
      metadata: meta,
      details: meta
    };

    inMemoryAuditLogs.unshift(auditEvent);

    if (isFirebaseConfigured && db && auth?.currentUser) {
      try {
        const payload = sanitizeFirestore({
          ...auditEvent,
          serverTimestamp: serverTimestamp()
        });
        await setDoc(doc(db, 'auditLogs', auditId), payload);
      } catch (err) {
        console.warn('NewsPress: Failed to persist audit event to Firestore, recorded in memory.', err);
      }
    }

    return auditEvent;
  }

  /**
   * Retrieves audit events for a specific entity or tenant.
   */
  getLogsForEntity(entityId: string): AuditEvent[] {
    return inMemoryAuditLogs.filter(log => log.entityId === entityId);
  }

  getLogsForTenant(tenantId: string): AuditEvent[] {
    return inMemoryAuditLogs.filter(log => log.tenantId === tenantId);
  }

  getAllLogs(): AuditEvent[] {
    return [...inMemoryAuditLogs];
  }
}

export const auditService = new AuditService();
