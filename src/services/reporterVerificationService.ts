/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 8 — Reporter Verification Service
 * Handles identity, press credentials, and organizational association verification.
 */

import { ReporterVerification, VerificationType, VerificationStatus } from '../types/newsroom';
import { auditService } from './auditService';
import { NewsroomStaffService } from './newsroomStaffService';

const verificationStore: Map<string, ReporterVerification> = new Map();

export class ReporterVerificationService {
  public static resetStore(): void {
    verificationStore.clear();
  }

  public static async submitVerification(input: {
    reporterId: string;
    tenantId: string;
    verificationType: VerificationType;
    documents?: string[];
    notes?: string;
  }): Promise<ReporterVerification> {
    const verificationId = `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const verification: ReporterVerification = {
      verificationId,
      reporterId: input.reporterId,
      tenantId: input.tenantId,
      verificationType: input.verificationType,
      status: 'PENDING',
      documents: input.documents || [],
      notes: input.notes || '',
      createdAt: now,
    };

    verificationStore.set(verificationId, verification);
    return verification;
  }

  public static async reviewVerification(input: {
    verificationId: string;
    tenantId: string;
    decision: 'VERIFIED' | 'REJECTED';
    reviewerId: string;
    reviewerName: string;
    notes?: string;
  }): Promise<ReporterVerification> {
    const ver = verificationStore.get(input.verificationId);
    if (!ver || ver.tenantId !== input.tenantId) {
      throw new Error(`Verification ${input.verificationId} not found.`);
    }

    const now = new Date().toISOString();
    ver.status = input.decision;
    ver.verifiedBy = input.reviewerId;
    ver.verifiedAt = now;
    if (input.notes) ver.notes = input.notes;

    verificationStore.set(input.verificationId, ver);

    // If verified, update the canonical reporter profile verificationStatus
    if (input.decision === 'VERIFIED') {
      const prof = NewsroomStaffService.getReporterProfile(ver.reporterId);
      if (prof) {
        prof.verificationStatus = 'verified';
        prof.updatedAt = now;
      }
    }

    await auditService.log({
      tenantId: input.tenantId,
      actorId: input.reviewerId,
      actorName: input.reviewerName,
      actorRole: 'editor',
      action: input.decision === 'VERIFIED' ? 'REPORTER_VERIFIED' : 'REPORTER_VERIFICATION_REJECTED',
      entityType: 'ReporterVerification',
      entityId: input.verificationId,
      newState: ver,
      reason: input.notes,
    });

    return ver;
  }

  public static getReporterVerifications(reporterId: string): ReporterVerification[] {
    return Array.from(verificationStore.values()).filter((v) => v.reporterId === reporterId);
  }

  public static getTenantVerifications(tenantId: string): ReporterVerification[] {
    return Array.from(verificationStore.values()).filter((v) => v.tenantId === tenantId);
  }
}
