/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 13 — Mobile Sync Service & Conflict Engine
 * Processes queued offline mobile operations with strict idempotency keys,
 * deterministic ordering, retry management, conflict detection, and server-side validation.
 */

import {
  SyncQueueItem,
  MobileOperationType,
  MobileSyncStatus,
  ConflictResolutionOutcome,
  ConflictRecord,
  MobileDraftArticle,
} from '../types/mobile';
import { OfflineReportingStore } from './mobileOfflineStore';
import { MobileUploadManager } from './mobileUploadManager';
import { NewsAssignmentService } from './newsAssignmentService';
import { newsSubmissionService } from './newsSubmissionService';
import { EditorialCommentService } from './editorialCommentService';
import { auditService } from './auditService';

export class MobileSyncService {
  private static processedIdempotencyKeys: Set<string> = new Set();
  private static isSyncing: boolean = false;
  private static maxRetries: number = 3;

  public static generateIdempotencyKey(tenantId: string, userId: string, localOperationId: string): string {
    return `mobile_${tenantId}_${userId}_${localOperationId}`;
  }

  public static enqueue(params: {
    tenantId: string;
    userId: string;
    entityId: string;
    operationType: MobileOperationType;
    payload: any;
  }): SyncQueueItem {
    const localOperationId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const idempotencyKey = this.generateIdempotencyKey(params.tenantId, params.userId, localOperationId);

    const item: SyncQueueItem = {
      localOperationId,
      idempotencyKey,
      tenantId: params.tenantId,
      userId: params.userId,
      entityId: params.entityId,
      operationType: params.operationType,
      payload: params.payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'PENDING',
    };

    OfflineReportingStore.enqueueOperation(item);
    return item;
  }

  public static async processQueue(tenantId?: string): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    conflicts: number;
  }> {
    if (this.isSyncing) {
      return { processed: 0, succeeded: 0, failed: 0, conflicts: 0 };
    }

    if (OfflineReportingStore.getNetworkState() === 'OFFLINE') {
      return { processed: 0, succeeded: 0, failed: 0, conflicts: 0 };
    }

    this.isSyncing = true;
    OfflineReportingStore.setNetworkState('SYNCING');

    const queue = OfflineReportingStore.getQueueItems(tenantId)
      .filter((i) => i.status === 'PENDING' || i.status === 'FAILED')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let succeeded = 0;
    let failed = 0;
    let conflicts = 0;

    try {
      for (const item of queue) {
        // Idempotency check: if key already committed, mark as synced immediately
        if (this.processedIdempotencyKeys.has(item.idempotencyKey)) {
          item.status = 'SYNCED';
          item.syncedAt = new Date().toISOString();
          OfflineReportingStore.updateQueueItem(item);
          succeeded++;
          continue;
        }

        item.status = 'SYNCING';
        OfflineReportingStore.updateQueueItem(item);

        try {
          const outcome = await this.executeOperation(item);
          if (outcome.status === 'SYNCED') {
            item.status = 'SYNCED';
            item.syncedAt = new Date().toISOString();
            this.processedIdempotencyKeys.add(item.idempotencyKey);
            succeeded++;
          } else if (outcome.status === 'CONFLICT') {
            item.status = 'CONFLICT';
            item.conflictResolution = outcome.conflictResolution;
            conflicts++;
          } else {
            item.status = 'FAILED';
            item.retryCount += 1;
            item.lastError = outcome.error;
            failed++;
          }
        } catch (err: any) {
          item.retryCount += 1;
          item.lastError = err?.message || 'Unknown synchronization error';
          if (item.retryCount >= this.maxRetries) {
            item.status = 'FAILED';
          } else {
            item.status = 'PENDING';
          }
          failed++;
        }

        OfflineReportingStore.updateQueueItem(item);
      }
    } finally {
      this.isSyncing = false;
      const remainingPending = OfflineReportingStore.getPendingQueueCount(tenantId);
      if (failed > 0 && remainingPending > 0) {
        OfflineReportingStore.setNetworkState('SYNC_FAILED');
      } else {
        OfflineReportingStore.setNetworkState('SYNCED');
      }
    }

    return {
      processed: queue.length,
      succeeded,
      failed,
      conflicts,
    };
  }

  private static async executeOperation(item: SyncQueueItem): Promise<{
    status: MobileSyncStatus;
    conflictResolution?: ConflictResolutionOutcome;
    error?: string;
  }> {
    switch (item.operationType) {
      case 'ACCEPT_ASSIGNMENT': {
        try {
          const asg = await NewsAssignmentService.acceptAssignment(
            item.entityId,
            item.userId,
            'Mobile Reporter'
          );
          if (asg) {
            OfflineReportingStore.updateCachedAssignment(asg);
            return { status: 'SYNCED' };
          }
          return { status: 'FAILED', error: 'Assignment not found' };
        } catch (err: any) {
          return { status: 'FAILED', error: err?.message || 'Failed to accept assignment' };
        }
      }

      case 'CREATE_DRAFT':
      case 'UPDATE_DRAFT': {
        const draft: MobileDraftArticle = item.payload;
        // Verify tenant matches
        if (draft.tenantId !== item.tenantId) {
          return { status: 'FAILED', error: 'Tenant mismatch on draft sync' };
        }

        // Detect potential conflict if updating existing server article
        if (draft.serverArticleId) {
          const existingServerArt = newsSubmissionService.getArticle(draft.serverArticleId);
          if (existingServerArt && existingServerArt.editorialStatus === 'approved') {
            // Server has already approved the article - requires human review, cannot overwrite
            const conflictId = `conf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const conflict: ConflictRecord = {
              conflictId,
              tenantId: item.tenantId,
              userId: item.userId,
              entityType: 'draft',
              entityId: draft.draftId,
              localVersion: { headline: draft.headline, body: draft.body, version: draft.version },
              serverVersion: {
                headline: existingServerArt.headline,
                body: existingServerArt.bodyContent,
                editorialStatus: existingServerArt.editorialStatus,
              },
              resolution: 'CONFLICT_REQUIRES_REVIEW',
            };
            OfflineReportingStore.recordConflict(conflict);
            draft.syncStatus = 'CONFLICT';
            draft.conflictDetails = {
              serverHeadline: existingServerArt.headline,
              serverBody: existingServerArt.bodyContent,
              resolutionRequired: true,
            };
            OfflineReportingStore.saveDraft(draft);
            return { status: 'CONFLICT', conflictResolution: 'CONFLICT_REQUIRES_REVIEW' };
          }
        }

        // Successfully synced draft
        draft.syncStatus = 'SYNCED';
        OfflineReportingStore.saveDraft(draft);
        return { status: 'SYNCED' };
      }

      case 'UPLOAD_EVIDENCE': {
        const ev = OfflineReportingStore.getEvidence(item.entityId, item.tenantId);
        if (!ev) {
          return { status: 'FAILED', error: 'Evidence item not found locally' };
        }
        const uploaded = await MobileUploadManager.startUpload(item.entityId, item.tenantId);
        return { status: uploaded.uploadStatus === 'UPLOADED' ? 'SYNCED' : 'FAILED' };
      }

      case 'SUBMIT_STORY': {
        const payload = item.payload;
        // Server validation & submission
        if (!payload.headline || !payload.body || payload.headline.trim().length < 5) {
          return { status: 'FAILED', error: 'Submission rejected: Headline must be at least 5 characters' };
        }

        // Call server-authoritative submission engine
        const submission = await newsSubmissionService.submitArticle({
          tenantId: item.tenantId,
          reporterId: item.userId,
          headline: payload.headline,
          subheadline: payload.subheadline || '',
          body: payload.body,
          category: payload.category || 'General',
          location: payload.location || 'Local Field',
          eventDateTime: payload.eventDateTime || new Date().toISOString(),
          reporterNotes: payload.reporterNotes || '',
          sourceNotes: payload.sourceNotes || '',
          evidenceReferences: payload.evidenceIds || [],
          declaration: {
            isOriginalFieldWork: true,
            hasFirstHandKnowledge: true,
            verifiedSourceConsent: true,
            confirmsNoFabrication: true,
            signedAt: new Date().toISOString(),
          },
        });

        if (submission && submission.submissionId) {
          // If associated with a draft, mark draft as synced with server article ID
          if (payload.draftId) {
            const draft = OfflineReportingStore.getDraft(payload.draftId, item.tenantId);
            if (draft) {
              draft.serverArticleId = submission.submissionId;
              draft.syncStatus = 'SYNCED';
              OfflineReportingStore.saveDraft(draft);
            }
          }

          // If linked to an assignment, update assignment status
          if (payload.assignmentId) {
            await NewsAssignmentService.linkSubmissionToAssignment(
              payload.assignmentId,
              submission.submissionId,
              item.userId,
              'Field Reporter'
            );
          }

          return { status: 'SYNCED' };
        }

        return { status: 'FAILED', error: 'Submission service returned empty result' };
      }

      case 'ADD_COMMENT': {
        const payload = item.payload;
        const comment = EditorialCommentService.addComment({
          tenantId: item.tenantId,
          targetType: payload.targetType || 'STORY',
          targetId: item.entityId,
          authorUserId: item.userId,
          authorRole: payload.authorRole || 'EDITOR',
          content: payload.content,
        });
        return { status: comment ? 'SYNCED' : 'FAILED' };
      }

      case 'ACKNOWLEDGE_NOTIFICATION': {
        // Notification ack recorded
        return { status: 'SYNCED' };
      }

      default:
        return { status: 'SYNCED' };
    }
  }

  // --- Conflict Resolution Strategy ---
  public static resolveConflictManually(params: {
    conflictId: string;
    strategy: ConflictResolutionOutcome;
    tenantId: string;
    userId: string;
    mergedContent?: { headline: string; body: string };
  }): boolean {
    const conflicts = OfflineReportingStore.getConflicts(params.tenantId);
    const target = conflicts.find((c) => c.conflictId === params.conflictId);
    if (!target) return false;

    if (params.strategy === 'LOCAL_WINS') {
      const draft = OfflineReportingStore.getDraft(target.entityId, params.tenantId);
      if (draft) {
        draft.syncStatus = 'SYNCED';
        draft.conflictDetails = undefined;
        OfflineReportingStore.saveDraft(draft);
      }
    } else if (params.strategy === 'SERVER_WINS') {
      const draft = OfflineReportingStore.getDraft(target.entityId, params.tenantId);
      if (draft && target.serverVersion) {
        draft.headline = target.serverVersion.headline || draft.headline;
        draft.body = target.serverVersion.body || draft.body;
        draft.syncStatus = 'SYNCED';
        draft.conflictDetails = undefined;
        OfflineReportingStore.saveDraft(draft);
      }
    } else if (params.strategy === 'AUTO_MERGED' && params.mergedContent) {
      const draft = OfflineReportingStore.getDraft(target.entityId, params.tenantId);
      if (draft) {
        draft.headline = params.mergedContent.headline;
        draft.body = params.mergedContent.body;
        draft.syncStatus = 'SYNCED';
        draft.conflictDetails = undefined;
        OfflineReportingStore.saveDraft(draft);
      }
    }

    OfflineReportingStore.resolveConflict(
      params.conflictId,
      params.strategy,
      `Resolved by ${params.userId} using ${params.strategy}`
    );

    auditService.log({
      action: 'CONFLICT_RESOLVED',
      tenantId: params.tenantId,
      actorId: params.userId,
      actorName: 'Mobile User',
      actorRole: 'reporter',
      entityType: 'MobileConflict',
      entityId: params.conflictId,
      details: {
        conflictId: params.conflictId,
        strategy: params.strategy,
        entityId: target.entityId,
      },
    });

    return true;
  }

  public static isIdempotencyKeyProcessed(key: string): boolean {
    return this.processedIdempotencyKeys.has(key);
  }

  public static reset(): void {
    this.processedIdempotencyKeys.clear();
    this.isSyncing = false;
  }
}
