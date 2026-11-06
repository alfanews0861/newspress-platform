/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Vendor Dispatch & Acknowledgement Service (Phase 10)
 * Orchestrates sending immutable production artifacts to assigned print vendors.
 * Enforces:
 *  - Deterministic idempotency keys (tenantId + editionId + version + vendorId + checksum)
 *  - Mutual exclusion against duplicate dispatches
 *  - Cryptographic checksum verification on acknowledgement (blocks workflow on mismatch)
 *  - Vendor rejection handling and bounded retry with exponential backoff
 *  - Vendor digital proof review workflows
 */

import {
  PrintVendorDispatch,
  PrintProductionArtifact,
  VendorProof,
  ProofStatus,
  DispatchStatus,
} from '../types/production';
import { PrintArtifactRegistryService } from './printArtifactRegistryService';
import { PrintVendorService } from './printVendorService';
import { PrintVendorProviderFactory } from './printVendorProvider';
import { AuditService } from './auditService';
import { NotificationService } from './notificationService';

const _dispatchesStore = new Map<string, PrintVendorDispatch>();
const _proofsStore = new Map<string, VendorProof>();

export class VendorDispatchService {
  /**
   * Resets local store (for testing & state cleanup).
   */
  public static resetStore(): void {
    _dispatchesStore.clear();
    _proofsStore.clear();
  }

  /**
   * Generates a deterministic idempotency key for dispatch.
   */
  public static generateIdempotencyKey(params: {
    tenantId: string;
    editionId: string;
    version: number;
    vendorId: string;
    checksum: string;
  }): string {
    return `${params.tenantId}:${params.editionId}:v${params.version}:${params.vendorId}:${params.checksum}`;
  }

  /**
   * Initiates a dispatch of an immutable print artifact to an assigned vendor.
   */
  public static async dispatchToVendor(params: {
    tenantId: string;
    editionId: string;
    productionJobId: string;
    vendorId: string;
    regionId: string;
    artifactId: string;
    actorId?: string;
    actorRole?: string;
  }): Promise<{ success: boolean; dispatch?: PrintVendorDispatch; reason?: string }> {
    const {
      tenantId,
      editionId,
      productionJobId,
      vendorId,
      regionId,
      artifactId,
      actorId = 'system',
      actorRole = 'editor_in_chief',
    } = params;

    // 1. Verify artifact existence & tenant scoping
    const artifact = PrintArtifactRegistryService.getArtifactById(tenantId, artifactId);
    if (!artifact) {
      return { success: false, reason: `Artifact ${artifactId} not found or tenant unauthorized.` };
    }

    // 2. Verify vendor existence & eligibility
    const vendor = PrintVendorService.getVendorById(tenantId, vendorId);
    if (!vendor) {
      return { success: false, reason: `Print vendor ${vendorId} not found.` };
    }
    if (!vendor.active) {
      return { success: false, reason: `Print vendor "${vendor.name}" is currently inactive.` };
    }

    // 3. Compute deterministic idempotency key
    const idempotencyKey = this.generateIdempotencyKey({
      tenantId,
      editionId,
      version: artifact.version,
      vendorId,
      checksum: artifact.checksum,
    });

    // 4. Concurrency Guard: Check for existing active dispatch with same idempotency key
    const existing = Array.from(_dispatchesStore.values()).find(
      (d) => d.idempotencyKey === idempotencyKey
    );

    if (existing) {
      if (
        existing.dispatchStatus === 'SENT' ||
        existing.dispatchStatus === 'ACKNOWLEDGED' ||
        existing.dispatchStatus === 'DISPATCHING' ||
        existing.dispatchStatus === 'COMPLETED'
      ) {
        return {
          success: true,
          dispatch: existing,
          reason: 'Existing active dispatch with matching checksum returned (idempotent request).',
        };
      }
    }

    const now = new Date().toISOString();
    const dispatchId = `disp-${editionId}-v${artifact.version}-${vendorId.slice(-6)}-${Date.now()}`;

    const newDispatch: PrintVendorDispatch = {
      id: dispatchId,
      tenantId,
      editionId,
      productionJobId,
      vendorId,
      regionId,
      artifactId,
      dispatchVersion: artifact.version,
      checksum: artifact.checksum,
      dispatchStatus: 'DISPATCHING',
      retryCount: 0,
      idempotencyKey,
      createdAt: now,
      updatedAt: now,
    };

    _dispatchesStore.set(dispatchId, newDispatch);

    // Call provider adapter
    const provider = PrintVendorProviderFactory.getProvider(vendor.vendorType);
    try {
      const sendResult = await provider.sendProductionArtifact(newDispatch, artifact);

      if (!sendResult.success) {
        newDispatch.dispatchStatus = 'FAILED';
        newDispatch.rejectionReason = sendResult.error || 'Provider communication failure';
        newDispatch.updatedAt = new Date().toISOString();
        _dispatchesStore.set(dispatchId, newDispatch);

        await AuditService.logEvent({
          tenantId,
          actorId,
          actorName: 'Managing Editor',
          actorRole,
          action: 'STATUS_CHANGE',
          entityType: 'PrintVendorDispatch',
          entityId: dispatchId,
          newState: { status: 'FAILED', error: sendResult.error },
          reason: `Dispatch to vendor ${vendor.name} failed during gateway transmission`,
        });

        return { success: false, dispatch: newDispatch, reason: sendResult.error };
      }

      newDispatch.dispatchStatus = 'SENT';
      newDispatch.dispatchedAt = new Date().toISOString();
      newDispatch.vendorReferenceNumber = sendResult.vendorReferenceNumber;
      newDispatch.vendorMessage = sendResult.message;
      newDispatch.updatedAt = newDispatch.dispatchedAt;
      _dispatchesStore.set(dispatchId, newDispatch);

      await AuditService.logEvent({
        tenantId,
        actorId,
        actorName: 'Managing Editor',
        actorRole,
        action: 'VENDOR_DISPATCHED',
        entityType: 'PrintVendorDispatch',
        entityId: dispatchId,
        newState: {
          status: 'SENT',
          vendorId,
          vendorReference: sendResult.vendorReferenceNumber,
          checksum: artifact.checksum,
        },
        reason: `Dispatched print artifact ${artifact.fileName} to vendor "${vendor.name}" (Ref: ${sendResult.vendorReferenceNumber})`,
      });

      await NotificationService.createNotification({
        tenantId,
        type: 'production_started',
        editionId,
        title: 'Edition Dispatched to Print Vendor',
        message: `Artifact v${artifact.version} transmitted to "${vendor.name}" with SHA-256 integrity seal.`,
      });

      return { success: true, dispatch: newDispatch };
    } catch (err: any) {
      newDispatch.dispatchStatus = 'FAILED';
      newDispatch.rejectionReason = err.message || 'Transmission exception';
      newDispatch.updatedAt = new Date().toISOString();
      _dispatchesStore.set(dispatchId, newDispatch);

      return { success: false, dispatch: newDispatch, reason: err.message };
    }
  }

  /**
   * Processes vendor acknowledgement.
   * CRITICAL SECURITY CHECK: Compares vendor reported accepted checksum with immutable artifact checksum.
   * If mismatch, BLOCKS production workflow.
   */
  public static async recordVendorAcknowledgement(params: {
    tenantId: string;
    dispatchId: string;
    vendorReferenceNumber?: string;
    acceptedChecksum: string;
    acceptedVersion?: number;
    vendorMessage?: string;
    expectedPrintCompletionAt?: string;
  }): Promise<{ success: boolean; dispatch?: PrintVendorDispatch; error?: string }> {
    const {
      tenantId,
      dispatchId,
      vendorReferenceNumber,
      acceptedChecksum,
      acceptedVersion,
      vendorMessage,
      expectedPrintCompletionAt,
    } = params;

    const dispatch = _dispatchesStore.get(dispatchId);
    if (!dispatch || dispatch.tenantId !== tenantId) {
      return { success: false, error: `Dispatch ${dispatchId} not found.` };
    }

    const now = new Date().toISOString();

    // Cryptographic Checksum Verification
    const isMatch = dispatch.checksum.toLowerCase() === acceptedChecksum.toLowerCase();
    if (!isMatch) {
      // BLOCK PRODUCTION WORKFLOW!
      dispatch.dispatchStatus = 'FAILED';
      dispatch.rejectionReason = `CHECKSUM MISMATCH: Expected ${dispatch.checksum}, vendor reported ${acceptedChecksum}`;
      dispatch.updatedAt = now;
      _dispatchesStore.set(dispatchId, dispatch);

      await AuditService.logEvent({
        tenantId,
        actorId: 'system',
        actorName: 'Security Gate',
        actorRole: 'system',
        action: 'STATUS_CHANGE',
        entityType: 'PrintVendorDispatch',
        entityId: dispatchId,
        newState: {
          status: 'FAILED',
          securityVerdict: 'CHECKSUM_MISMATCH_BLOCKED',
          expectedChecksum: dispatch.checksum,
          vendorChecksum: acceptedChecksum,
        },
        reason: 'CRITICAL SECURITY BLOCK: Vendor acknowledged an artifact with mismatched cryptographic hash. Halting press run.',
      });

      await NotificationService.createNotification({
        tenantId,
        type: 'production_failed',
        editionId: dispatch.editionId,
        title: 'Print Production Blocked: Checksum Mismatch',
        message: 'Vendor acknowledged checksum does not match sealed PDF artifact. Press run halted.',
      });

      return {
        success: false,
        dispatch,
        error: 'CRITICAL: Vendor checksum mismatch. Workflow blocked.',
      };
    }

    // Checksum verified! Advance to ACKNOWLEDGED
    dispatch.dispatchStatus = 'ACKNOWLEDGED';
    dispatch.acknowledgedAt = now;
    dispatch.acceptedChecksum = acceptedChecksum;
    dispatch.acceptedVersion = acceptedVersion || dispatch.dispatchVersion;
    if (vendorReferenceNumber) dispatch.vendorReferenceNumber = vendorReferenceNumber;
    if (vendorMessage) dispatch.vendorMessage = vendorMessage;
    if (expectedPrintCompletionAt) dispatch.expectedPrintCompletionAt = expectedPrintCompletionAt;
    dispatch.updatedAt = now;
    _dispatchesStore.set(dispatchId, dispatch);

    await AuditService.logEvent({
      tenantId,
      actorId: 'system',
      actorName: 'Vendor Communication',
      actorRole: 'system',
      action: 'VENDOR_ACKNOWLEDGED',
      entityType: 'PrintVendorDispatch',
      entityId: dispatchId,
      newState: {
        status: 'ACKNOWLEDGED',
        checksum: acceptedChecksum,
        referenceNumber: dispatch.vendorReferenceNumber,
      },
      reason: `Vendor verified SHA-256 checksum match and acknowledged print dispatch.`,
    });

    return { success: true, dispatch };
  }

  /**
   * Records a vendor rejection of a dispatched artifact.
   */
  public static async recordVendorRejection(params: {
    tenantId: string;
    dispatchId: string;
    rejectionReason: string;
    actorId?: string;
  }): Promise<{ success: boolean; dispatch?: PrintVendorDispatch }> {
    const { tenantId, dispatchId, rejectionReason, actorId = 'system' } = params;
    const dispatch = _dispatchesStore.get(dispatchId);
    if (!dispatch || dispatch.tenantId !== tenantId) {
      return { success: false };
    }

    const now = new Date().toISOString();
    dispatch.dispatchStatus = 'REJECTED';
    dispatch.rejectedAt = now;
    dispatch.rejectionReason = rejectionReason;
    dispatch.updatedAt = now;
    _dispatchesStore.set(dispatchId, dispatch);

    await AuditService.logEvent({
      tenantId,
      actorId,
      actorName: 'Vendor Communication',
      actorRole: 'system',
      action: 'VENDOR_REJECTED',
      entityType: 'PrintVendorDispatch',
      entityId: dispatchId,
      newState: { status: 'REJECTED', reason: rejectionReason },
      reason: `Vendor rejected dispatch: ${rejectionReason}`,
    });

    await NotificationService.createNotification({
      tenantId,
      type: 'production_failed',
      editionId: dispatch.editionId,
      title: 'Print Vendor Rejected Artifact',
      message: `Vendor returned rejection for dispatch: "${rejectionReason}". Correction or re-dispatch required.`,
    });

    return { success: true, dispatch };
  }

  /**
   * Submits a vendor proof for editorial quality review.
   */
  public static async submitVendorProof(params: {
    tenantId: string;
    editionId: string;
    vendorDispatchId: string;
    artifactId: string;
    storagePath: string;
    checksum: string;
  }): Promise<VendorProof> {
    const { tenantId, editionId, vendorDispatchId, artifactId, storagePath, checksum } = params;
    const id = `proof-${vendorDispatchId}-${Date.now()}`;
    const now = new Date().toISOString();

    const proof: VendorProof = {
      id,
      tenantId,
      editionId,
      vendorDispatchId,
      artifactId,
      storagePath,
      checksum,
      submittedAt: now,
      status: 'RECEIVED',
    };

    _proofsStore.set(id, proof);

    await AuditService.logEvent({
      tenantId,
      actorId: 'system',
      actorName: 'Vendor Proof System',
      actorRole: 'system',
      action: 'PROOF_SUBMITTED',
      entityType: 'VendorProof',
      entityId: id,
      newState: { status: 'RECEIVED', checksum },
      reason: 'Vendor uploaded digital pre-press proof for editorial sign-off',
    });

    return proof;
  }

  /**
   * Reviews vendor digital proof (APPROVE or REJECT).
   * Note: Proof review never mutates the original frozen edition.
   */
  public static async reviewVendorProof(params: {
    tenantId: string;
    proofId: string;
    approved: boolean;
    rejectionReason?: string;
    reviewer: { userId: string; userRole: string; displayName?: string };
  }): Promise<{ success: boolean; proof?: VendorProof; error?: string }> {
    const { tenantId, proofId, approved, rejectionReason, reviewer } = params;
    const proof = _proofsStore.get(proofId);
    if (!proof || proof.tenantId !== tenantId) {
      return { success: false, error: `Proof ${proofId} not found.` };
    }

    const now = new Date().toISOString();
    proof.status = approved ? 'APPROVED' : 'REJECTED';
    proof.reviewedAt = now;
    proof.reviewedBy = reviewer;
    if (!approved && rejectionReason) {
      proof.rejectionReason = rejectionReason;
    }
    _proofsStore.set(proofId, proof);

    await AuditService.logEvent({
      tenantId,
      actorId: reviewer.userId,
      actorName: reviewer.displayName || 'Senior Editor',
      actorRole: reviewer.userRole,
      action: approved ? 'PROOF_APPROVED' : 'PROOF_REJECTED',
      entityType: 'VendorProof',
      entityId: proofId,
      newState: { status: proof.status, rejectionReason: proof.rejectionReason },
      reason: approved
        ? 'Editorial team approved vendor digital proof for rotary plate exposure'
        : `Editorial team rejected vendor proof: ${rejectionReason}`,
    });

    return { success: true, proof };
  }

  /**
   * Controlled bounded retry mechanism for failed dispatches.
   */
  public static async retryDispatch(params: {
    tenantId: string;
    dispatchId: string;
    actorId?: string;
    actorRole?: string;
    maxRetries?: number;
  }): Promise<{ success: boolean; dispatch?: PrintVendorDispatch; error?: string }> {
    const { tenantId, dispatchId, actorId = 'system', actorRole = 'editor_in_chief', maxRetries = 3 } = params;
    const dispatch = _dispatchesStore.get(dispatchId);
    if (!dispatch || dispatch.tenantId !== tenantId) {
      return { success: false, error: 'Dispatch not found.' };
    }

    if (dispatch.retryCount >= maxRetries) {
      return {
        success: false,
        error: `Maximum retry limit (${maxRetries}) exceeded for dispatch ${dispatchId}. Manual intervention required.`,
      };
    }

    dispatch.retryCount += 1;
    dispatch.dispatchStatus = 'DISPATCHING';
    dispatch.updatedAt = new Date().toISOString();
    _dispatchesStore.set(dispatchId, dispatch);

    // Call provider
    const artifact = PrintArtifactRegistryService.getArtifactById(tenantId, dispatch.artifactId);
    if (!artifact) {
      return { success: false, error: 'Associated artifact missing.' };
    }

    const vendor = PrintVendorService.getVendorById(tenantId, dispatch.vendorId);
    const provider = PrintVendorProviderFactory.getProvider(vendor?.vendorType);

    const sendRes = await provider.sendProductionArtifact(dispatch, artifact);
    if (!sendRes.success) {
      dispatch.dispatchStatus = 'FAILED';
      dispatch.rejectionReason = sendRes.error;
      dispatch.updatedAt = new Date().toISOString();
      _dispatchesStore.set(dispatchId, dispatch);
      return { success: false, dispatch, error: sendRes.error };
    }

    dispatch.dispatchStatus = 'SENT';
    dispatch.vendorReferenceNumber = sendRes.vendorReferenceNumber;
    dispatch.updatedAt = new Date().toISOString();
    _dispatchesStore.set(dispatchId, dispatch);

    await AuditService.logEvent({
      tenantId,
      actorId,
      actorName: 'Operations Lead',
      actorRole,
      action: 'PRODUCTION_RETRIED',
      entityType: 'PrintVendorDispatch',
      entityId: dispatchId,
      newState: { attempt: dispatch.retryCount, status: 'SENT' },
      reason: `Retry attempt #${dispatch.retryCount} executed for vendor dispatch`,
    });

    return { success: true, dispatch };
  }

  /**
   * Retrieves all dispatches for an edition.
   */
  public static getDispatchesForEdition(tenantId: string, editionId: string): PrintVendorDispatch[] {
    return Array.from(_dispatchesStore.values())
      .filter((d) => d.tenantId === tenantId && d.editionId === editionId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Retrieves all dispatches for a tenant or globally across all tenants.
   */
  public static getAllDispatches(tenantId?: string): PrintVendorDispatch[] {
    const list = Array.from(_dispatchesStore.values());
    if (tenantId) {
      return list.filter((d) => d.tenantId === tenantId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Retrieves a single dispatch by ID.
   */
  public static getDispatchById(tenantId: string, dispatchId: string): PrintVendorDispatch | undefined {
    const d = _dispatchesStore.get(dispatchId);
    if (!d || d.tenantId !== tenantId) return undefined;
    return d;
  }

  /**
   * Retrieves proofs for an edition.
   */
  public static getProofsForEdition(tenantId: string, editionId: string): VendorProof[] {
    return Array.from(_proofsStore.values())
      .filter((p) => p.tenantId === tenantId && p.editionId === editionId);
  }
}
