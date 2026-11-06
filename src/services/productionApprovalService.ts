/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Production Approval Gate Service (Phase 10)
 * Authorized users with 'production.approve' permission inspect preflight reports,
 * examine vector PDF artifacts and checksums, and provide an immutable approval seal
 * before vendor dispatch can proceed.
 */

import { PrintArtifactRegistryService } from './printArtifactRegistryService';
import { ProductionQueueService } from './productionQueueService';
import { AuditService } from './auditService';
import { NotificationService } from './notificationService';

export interface ProductionApprovalRecord {
  approvalId: string;
  tenantId: string;
  editionId: string;
  snapshotId: string;
  artifactId: string;
  artifactChecksum: string;
  preflightResult: 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL';
  decision: 'APPROVE_FOR_PRINT' | 'REJECT_FOR_CORRECTION' | 'REQUEST_REGENERATION';
  approvingUser: {
    userId: string;
    userRole: string;
    displayName?: string;
  };
  notes?: string;
  timestamp: string;
}

const _approvalsStore = new Map<string, ProductionApprovalRecord>();

export class ProductionApprovalService {
  /**
   * Resets local store (for testing & state cleanup).
   */
  public static resetStore(): void {
    _approvalsStore.clear();
  }

  /**
   * Executes a formal production approval decision.
   */
  public static async recordApprovalDecision(params: {
    tenantId: string;
    editionId: string;
    jobId: string;
    artifactId: string;
    decision: 'APPROVE_FOR_PRINT' | 'REJECT_FOR_CORRECTION' | 'REQUEST_REGENERATION';
    approver: {
      userId: string;
      userRole: string;
      displayName?: string;
    };
    notes?: string;
  }): Promise<{ success: boolean; approvalRecord?: ProductionApprovalRecord; error?: string }> {
    const { tenantId, editionId, jobId, artifactId, decision, approver, notes } = params;

    // RBAC validation: Only authorized senior roles can approve
    const allowedRoles = ['owner', 'administrator', 'editor_in_chief', 'super_admin'];
    if (!allowedRoles.includes(approver.userRole)) {
      return {
        success: false,
        error: `User role "${approver.userRole}" is not authorized for production approval. Requires 'production.approve' permission.`,
      };
    }

    const job = ProductionQueueService.getJobById(jobId);
    if (!job || job.tenantId !== tenantId) {
      return { success: false, error: 'Production job not found.' };
    }

    const artifact = PrintArtifactRegistryService.getArtifactById(tenantId, artifactId);
    if (!artifact) {
      return { success: false, error: 'Print artifact not found.' };
    }

    // Preflight check constraint: Cannot approve if preflight failed
    if (decision === 'APPROVE_FOR_PRINT' && artifact.preflightStatus === 'BLOCKED') {
      return {
        success: false,
        error: 'Cannot approve artifact with BLOCKED preflight status. Critical layout or asset violations must be resolved.',
      };
    }

    const now = new Date().toISOString();
    const approvalId = `appr-${editionId}-v${artifact.version}-${Date.now()}`;

    const record: ProductionApprovalRecord = {
      approvalId,
      tenantId,
      editionId,
      snapshotId: artifact.snapshotId,
      artifactId,
      artifactChecksum: artifact.checksum,
      preflightResult: (job.preflightResult as any) || 'PASS',
      decision,
      approvingUser: approver,
      notes,
      timestamp: now,
    };

    _approvalsStore.set(approvalId, record);

    // Update job metadata
    if (decision === 'APPROVE_FOR_PRINT') {
      job.status = 'PRODUCTION_APPROVED';
      job.stage = 'APPROVED';
      job.approvedAt = now;
      job.approvedBy = approver;
      job.updatedAt = now;
    } else if (decision === 'REJECT_FOR_CORRECTION') {
      job.status = 'REPRINT_REQUIRED';
      job.reprintReason = notes || 'Editorial rejection during production approval review';
      job.updatedAt = now;
    } else if (decision === 'REQUEST_REGENERATION') {
      job.status = 'QUEUED';
      job.stage = 'QUEUED';
      job.progressPercent = 0;
      job.updatedAt = now;
    }

    await AuditService.logEvent({
      tenantId,
      actorId: approver.userId,
      actorName: approver.displayName || 'Editor-in-Chief',
      actorRole: approver.userRole,
      action: 'PRODUCTION_APPROVED',
      entityType: 'ProductionApprovalRecord',
      entityId: approvalId,
      newState: {
        decision,
        artifactId,
        checksum: artifact.checksum,
        preflightResult: record.preflightResult,
      },
      reason: `Production approval decision: ${decision} for edition ${editionId} (v${artifact.version})`,
    });

    await NotificationService.createNotification({
      tenantId,
      type: decision === 'APPROVE_FOR_PRINT' ? 'production_ready' : 'production_failed',
      editionId,
      title: decision === 'APPROVE_FOR_PRINT' ? 'Production Approved for Print Press' : 'Production Approval Declined',
      message: `Edition print package v${artifact.version} decision: ${decision}. ${notes ? `Notes: ${notes}` : ''}`,
    });

    return { success: true, approvalRecord: record };
  }

  /**
   * Retrieves approval history for an edition.
   */
  public static getApprovalsForEdition(tenantId: string, editionId: string): ProductionApprovalRecord[] {
    return Array.from(_approvalsStore.values())
      .filter((a) => a.tenantId === tenantId && a.editionId === editionId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Checks if an artifact has a recorded approval seal.
   */
  public static isArtifactApproved(tenantId: string, artifactId: string): boolean {
    return Array.from(_approvalsStore.values()).some(
      (a) => a.tenantId === tenantId && a.artifactId === artifactId && a.decision === 'APPROVE_FOR_PRINT'
    );
  }
}
