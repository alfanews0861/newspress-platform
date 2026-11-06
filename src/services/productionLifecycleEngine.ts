/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Production Lifecycle Engine (Phase 10)
 * Orchestrates and strictly validates deterministic production state transitions:
 *  FINALIZED
 *  → PRODUCTION_QUEUED
 *  → PDF_GENERATING
 *  → PDF_GENERATED
 *  → PREFLIGHT_PENDING
 *  → PREFLIGHT_PASSED
 *  → PRODUCTION_APPROVED
 *  → VENDOR_DISPATCH_PENDING
 *  → SENT_TO_VENDOR
 *  → VENDOR_ACKNOWLEDGED
 *  → PRINTING
 *  → PRINT_COMPLETED
 *  → DISPATCHED
 *  → DELIVERED
 * 
 * Terminal / Error states:
 *  FAILED, REJECTED_BY_VENDOR, CANCELLED, SUPERSEDED, REPRINT_REQUIRED
 * 
 * Disallows arbitrary state jumps. Validates transitions server-side and logs immutable audit events.
 */

import { ProductionJob, ProductionJobStatus } from '../types/production';
import { ProductionQueueService } from './productionQueueService';
import { AuditService } from './auditService';
import { NotificationService } from './notificationService';

export const ALLOWED_PRODUCTION_TRANSITIONS: Record<ProductionJobStatus, ProductionJobStatus[]> = {
  FINALIZED: ['PRODUCTION_QUEUED', 'QUEUED', 'CANCELLED'],
  QUEUED: ['CLAIMED', 'PROCESSING', 'PDF_GENERATING', 'CANCELLED', 'SUPERSEDED'],
  CLAIMED: ['PROCESSING', 'PDF_GENERATING', 'RETRY_SCHEDULED', 'FAILED'],
  PROCESSING: ['RENDERING', 'PDF_GENERATING', 'RETRY_SCHEDULED', 'FAILED'],
  RENDERING: ['PREFLIGHT_CHECK', 'PREFLIGHT_PENDING', 'PDF_GENERATED', 'FAILED'],
  PREFLIGHT_CHECK: ['READY', 'PREFLIGHT_PASSED', 'FAILED'],
  READY: ['PRODUCTION_APPROVED', 'VENDOR_DISPATCH_PENDING', 'SUPERSEDED', 'REPRINT_REQUIRED'],
  PRODUCTION_QUEUED: ['PDF_GENERATING', 'QUEUED', 'CANCELLED'],
  PDF_GENERATING: ['PDF_GENERATED', 'FAILED', 'RETRY_SCHEDULED'],
  PDF_GENERATED: ['PREFLIGHT_PENDING', 'PREFLIGHT_PASSED', 'FAILED'],
  PREFLIGHT_PENDING: ['PREFLIGHT_PASSED', 'FAILED', 'REPRINT_REQUIRED'],
  PREFLIGHT_PASSED: ['PRODUCTION_APPROVED', 'REPRINT_REQUIRED', 'SUPERSEDED'],
  PRODUCTION_APPROVED: ['VENDOR_DISPATCH_PENDING', 'SENT_TO_VENDOR', 'REPRINT_REQUIRED', 'SUPERSEDED'],
  VENDOR_DISPATCH_PENDING: ['SENT_TO_VENDOR', 'FAILED', 'CANCELLED'],
  SENT_TO_VENDOR: ['VENDOR_ACKNOWLEDGED', 'REJECTED_BY_VENDOR', 'FAILED'],
  VENDOR_ACKNOWLEDGED: ['PRINTING', 'REPRINT_REQUIRED', 'FAILED'],
  PRINTING: ['PRINT_COMPLETED', 'FAILED'],
  PRINT_COMPLETED: ['DISPATCHED', 'DELIVERED', 'REPRINT_REQUIRED'],
  DISPATCHED: ['DELIVERED', 'FAILED'],
  DELIVERED: [], // Terminal success
  FAILED: ['QUEUED', 'PRODUCTION_QUEUED', 'RETRY_SCHEDULED', 'CANCELLED'],
  REJECTED_BY_VENDOR: ['PRODUCTION_QUEUED', 'VENDOR_DISPATCH_PENDING', 'REPRINT_REQUIRED', 'CANCELLED'],
  CANCELLED: [], // Terminal cancellation
  SUPERSEDED: [], // Terminal supersession
  REPRINT_REQUIRED: ['PRODUCTION_QUEUED', 'QUEUED', 'CANCELLED'],
  RETRY_SCHEDULED: ['CLAIMED', 'PDF_GENERATING', 'FAILED', 'CANCELLED'],
};

export class ProductionLifecycleEngine {
  /**
   * Validates if a transition between two production states is allowed.
   */
  public static canTransition(fromStatus: ProductionJobStatus, toStatus: ProductionJobStatus): boolean {
    if (fromStatus === toStatus) return true;
    const allowed = ALLOWED_PRODUCTION_TRANSITIONS[fromStatus] || [];
    return allowed.includes(toStatus);
  }

  /**
   * Transitions a production job to a new deterministic state.
   */
  public static async transitionJobStatus(params: {
    tenantId: string;
    jobId: string;
    toStatus: ProductionJobStatus;
    actorId?: string;
    actorRole?: string;
    actorName?: string;
    reason?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; job?: ProductionJob; error?: string }> {
    const {
      tenantId,
      jobId,
      toStatus,
      actorId = 'system',
      actorRole = 'system',
      actorName = 'Production Engine',
      reason,
      metadata,
    } = params;

    const job = ProductionQueueService.getJobById(jobId);
    if (!job || job.tenantId !== tenantId) {
      return { success: false, error: `Production job ${jobId} not found for tenant.` };
    }

    const currentStatus = job.status;

    if (!this.canTransition(currentStatus, toStatus)) {
      return {
        success: false,
        error: `Illegal state transition from "${currentStatus}" to "${toStatus}". Arbitrary jumps are prohibited.`,
      };
    }

    const now = new Date().toISOString();
    job.status = toStatus;
    job.currentStatus = toStatus;
    job.updatedAt = now;

    // Set timestamps and stage based on state
    if (toStatus === 'PRODUCTION_APPROVED') {
      job.stage = 'APPROVED';
      job.approvedAt = now;
    } else if (toStatus === 'SENT_TO_VENDOR') {
      job.stage = 'DISPATCHED';
      job.dispatchedAt = now;
    } else if (toStatus === 'VENDOR_ACKNOWLEDGED') {
      job.acknowledgedAt = now;
    } else if (toStatus === 'PRINTING') {
      job.stage = 'PRINTING';
      job.printedAt = now;
    } else if (toStatus === 'PRINT_COMPLETED') {
      job.completedAt = now;
    } else if (toStatus === 'DISPATCHED') {
      job.stage = 'DISTRIBUTING';
    } else if (toStatus === 'DELIVERED') {
      job.stage = 'DELIVERED';
      job.deliveredAt = now;
    } else if (toStatus === 'FAILED') {
      job.failedAt = now;
      if (reason) job.failureMessage = reason;
    }

    await AuditService.logEvent({
      tenantId,
      actorId,
      actorName,
      actorRole,
      action: 'STATUS_CHANGE',
      entityType: 'ProductionJob',
      entityId: jobId,
      newState: {
        previousStatus: currentStatus,
        newStatus: toStatus,
        metadata,
      },
      reason: reason || `Production job transitioned from ${currentStatus} to ${toStatus}`,
    });

    return { success: true, job };
  }
}
