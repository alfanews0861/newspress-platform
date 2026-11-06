/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Correction & Reprint Workflow Service (Phase 10)
 * Manages post-finalization production corrections and emergency reprints.
 * Preserves historical immutable versions without mutation, advances versions (v1 -> v2),
 * and tracks checksum audit trails between original and corrected print artifacts.
 */

import { ProductionSnapshot, ProductionJob } from '../types/production';
import { PrintArtifactRegistryService } from './printArtifactRegistryService';
import { VendorDispatchService } from './vendorDispatchService';
import { ProductionQueueService } from './productionQueueService';
import { EditionPersistenceService } from './editionPersistenceService';
import { AuditService } from './auditService';
import { NotificationService } from './notificationService';

export interface CorrectionRecord {
  correctionId: string;
  tenantId: string;
  editionId: string;
  previousVersion: number;
  newVersion: number;
  previousSnapshotId: string;
  newSnapshotId?: string;
  previousArtifactId?: string;
  previousChecksum?: string;
  newArtifactId?: string;
  newChecksum?: string;
  correctionType: 'TYPO' | 'PHOTOGRAPH' | 'LEGAL' | 'ADVERTISEMENT' | 'DEFECT' | 'VENDOR_REJECTION' | 'OTHER';
  correctionReason: string;
  wasDispatched: boolean;
  status: 'INITIATED' | 'COMPLETED' | 'CANCELLED';
  requestedBy: {
    userId: string;
    userRole: string;
    displayName?: string;
  };
  createdAt: string;
  completedAt?: string;
}

const _correctionsStore = new Map<string, CorrectionRecord>();

export class CorrectionReprintService {
  /**
   * Resets local store (for testing & state cleanup).
   */
  public static resetStore(): void {
    _correctionsStore.clear();
  }

  /**
   * Initiates a formal correction revision on a finalized or dispatched edition.
   */
  public static async requestCorrection(params: {
    tenantId: string;
    editionId: string;
    correctionType: 'TYPO' | 'PHOTOGRAPH' | 'LEGAL' | 'ADVERTISEMENT' | 'DEFECT' | 'VENDOR_REJECTION' | 'OTHER';
    correctionReason: string;
    actor: {
      userId: string;
      userRole: string;
      displayName?: string;
    };
  }): Promise<{ success: boolean; correction?: CorrectionRecord; error?: string }> {
    const { tenantId, editionId, correctionType, correctionReason, actor } = params;

    // Check permissions
    const allowedRoles = ['owner', 'administrator', 'editor_in_chief', 'editor', 'super_admin'];
    if (!allowedRoles.includes(actor.userRole)) {
      return {
        success: false,
        error: `User role ${actor.userRole} lacks permission to initiate production corrections. Requires 'production.reprint'.`,
      };
    }

    // Get current snapshots history
    const snapshots = EditionPersistenceService.getSnapshotsForEdition(editionId);
    if (snapshots.length === 0) {
      return { success: false, error: 'No existing production snapshot found for edition.' };
    }

    const latestSnapshot = snapshots[0];
    const previousVersion = latestSnapshot.version;
    const newVersion = previousVersion + 1;

    // Check if previous version was dispatched to a vendor
    const dispatches = VendorDispatchService.getDispatchesForEdition(tenantId, editionId);
    const wasDispatched = dispatches.some(
      (d) => d.dispatchVersion === previousVersion && (d.dispatchStatus === 'SENT' || d.dispatchStatus === 'ACKNOWLEDGED' || d.dispatchStatus === 'COMPLETED')
    );

    const oldArtifact = PrintArtifactRegistryService.getLatestPrintArtifact(tenantId, editionId);

    const now = new Date().toISOString();
    const correctionId = `corr-${editionId}-v${newVersion}-${Date.now()}`;

    const correction: CorrectionRecord = {
      correctionId,
      tenantId,
      editionId,
      previousVersion,
      newVersion,
      previousSnapshotId: latestSnapshot.snapshotId,
      previousArtifactId: oldArtifact?.id,
      previousChecksum: oldArtifact?.checksum,
      correctionType,
      correctionReason,
      wasDispatched,
      status: 'INITIATED',
      requestedBy: actor,
      createdAt: now,
    };

    _correctionsStore.set(correctionId, correction);

    // Call EditionPersistenceService to unlock new revision
    await EditionPersistenceService.createCorrectionRevision(
      editionId,
      tenantId,
      actor.userId,
      actor.userRole,
      correctionReason
    );

    // Mark previous artifact as superseded in registry
    if (oldArtifact) {
      await PrintArtifactRegistryService.supersedeArtifact(
        tenantId,
        oldArtifact.id,
        actor.userId,
        actor.userRole,
        `Superseded by v${newVersion} correction: ${correctionReason}`
      );
    }

    await AuditService.logEvent({
      tenantId,
      actorId: actor.userId,
      actorName: actor.displayName || 'Editor-in-Chief',
      actorRole: actor.userRole,
      action: wasDispatched ? 'REPRINT_REQUESTED' : 'CORRECTION_CREATED',
      entityType: 'CorrectionRecord',
      entityId: correctionId,
      newState: {
        previousVersion,
        newVersion,
        wasDispatched,
        reprintRequired: wasDispatched,
      },
      reason: `Correction (${correctionType}) initiated for edition ${editionId}: "${correctionReason}"`,
    });

    await NotificationService.createNotification({
      tenantId,
      type: 'correction_required',
      editionId,
      title: wasDispatched ? 'Emergency Press Reprint Required' : 'Production Correction Initiated',
      message: `Edition revision v${newVersion} opened for correction (${correctionType}): ${correctionReason}.`,
    });

    return { success: true, correction };
  }

  /**
   * Finalizes a correction after the new version is generated and verified.
   */
  public static async completeCorrection(params: {
    tenantId: string;
    correctionId: string;
    newSnapshotId: string;
    newArtifactId: string;
    newChecksum: string;
  }): Promise<{ success: boolean; correction?: CorrectionRecord }> {
    const { tenantId, correctionId, newSnapshotId, newArtifactId, newChecksum } = params;
    const correction = _correctionsStore.get(correctionId);
    if (!correction || correction.tenantId !== tenantId) {
      return { success: false };
    }

    correction.newSnapshotId = newSnapshotId;
    correction.newArtifactId = newArtifactId;
    correction.newChecksum = newChecksum;
    correction.status = 'COMPLETED';
    correction.completedAt = new Date().toISOString();
    _correctionsStore.set(correctionId, correction);

    return { success: true, correction };
  }

  /**
   * Retrieves all correction records for an edition.
   */
  public static getCorrectionsForEdition(tenantId: string, editionId: string): CorrectionRecord[] {
    return Array.from(_correctionsStore.values())
      .filter((c) => c.tenantId === tenantId && c.editionId === editionId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}
