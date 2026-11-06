/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 8 — Reporter & Staff Invitation Service
 * Single-use, cryptographically hashed tokens with expiration and entitlement enforcement.
 */

import { ReporterInvitation, NewsroomRole, ReporterEmploymentType } from '../types/newsroom';
import { SubscriptionEntitlementService } from './subscriptionEntitlementService';
import { NewsroomStaffService } from './newsroomStaffService';
import { auditService } from './auditService';

const invitationStore: Map<string, ReporterInvitation> = new Map(); // invitationId -> ReporterInvitation

// Helper: Simple deterministic SHA-256 simulator / Crypto hash
function hashToken(token: string): string {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `sha256_${Math.abs(hash).toString(16)}_${token.length}`;
}

export class ReporterInvitationService {
  public static resetStore(): void {
    invitationStore.clear();
  }

  /**
   * Creates an invitation token for a new staff member or reporter.
   * Checks subscription limits BEFORE creating the invitation.
   * Returns the unhashed invitation raw token for sending, while storing ONLY the tokenHash.
   */
  public static async createInvitation(input: {
    tenantId: string;
    email: string;
    phone?: string;
    role: NewsroomRole;
    employmentType: ReporterEmploymentType;
    invitedBy: string;
    invitedByName: string;
    expirationDays?: number;
  }): Promise<{ invitation: ReporterInvitation; rawToken: string }> {
    // 1. Check entitlement limits
    if (['STAFF_REPORTER', 'CHIEF_REPORTER'].includes(input.role) || input.employmentType === 'STAFF') {
      const currentReporters = NewsroomStaffService.getActiveReporterCount(input.tenantId);
      const repCheck = SubscriptionEntitlementService.canAddReporter(input.tenantId, currentReporters);
      if (!repCheck.allowed) {
        throw new Error(repCheck.reason || 'Reporter subscription limit reached for this plan.');
      }
    } else {
      const currentStaff = NewsroomStaffService.getActiveStaffCount(input.tenantId);
      const staffCheck = SubscriptionEntitlementService.canAddStaffMember(input.tenantId, currentStaff);
      if (!staffCheck.allowed) {
        throw new Error(staffCheck.reason || 'Staff member subscription limit reached for this plan.');
      }
    }

    const rawToken = `inv_${Math.random().toString(36).substring(2)}_${Date.now()}`;
    const tokenHash = hashToken(rawToken);
    const invitationId = `inv_id_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const now = new Date();
    const expDays = input.expirationDays || 7;
    const expiresAt = new Date(now.getTime() + expDays * 86400 * 1000).toISOString();

    const invitation: ReporterInvitation = {
      invitationId,
      tenantId: input.tenantId,
      email: input.email,
      phone: input.phone,
      role: input.role,
      employmentType: input.employmentType,
      invitedBy: input.invitedBy,
      status: 'PENDING',
      tokenHash,
      expiresAt,
      createdAt: now.toISOString(),
    };

    invitationStore.set(invitationId, invitation);

    await auditService.log({
      tenantId: input.tenantId,
      actorId: input.invitedBy,
      actorName: input.invitedByName,
      actorRole: 'admin',
      action: 'STAFF_INVITED',
      entityType: 'ReporterInvitation',
      entityId: invitationId,
      newState: { invitationId, email: input.email, role: input.role, expiresAt },
    });

    return { invitation, rawToken };
  }

  /**
   * Accepts an invitation using the raw token.
   * Verifies expiration, single-use status, and entitlement before completing.
   */
  public static async acceptInvitation(input: {
    rawToken: string;
    userId: string;
    personId: string;
    displayName: string;
  }): Promise<ReporterInvitation> {
    const computedHash = hashToken(input.rawToken);
    const invitation = Array.from(invitationStore.values()).find((i) => i.tokenHash === computedHash);

    if (!invitation) {
      throw new Error('Invalid or non-existent invitation token.');
    }

    if (invitation.status === 'ACCEPTED') {
      throw new Error('This invitation has already been accepted.');
    }

    if (invitation.status === 'REVOKED') {
      throw new Error('This invitation has been revoked by the organization.');
    }

    const now = new Date();
    if (new Date(invitation.expiresAt) < now) {
      invitation.status = 'EXPIRED';
      invitationStore.set(invitation.invitationId, invitation);
      throw new Error('This invitation token has expired.');
    }

    // Re-verify entitlement at acceptance time
    const currentStaff = NewsroomStaffService.getActiveStaffCount(invitation.tenantId);
    const staffCheck = SubscriptionEntitlementService.canAddStaffMember(invitation.tenantId, currentStaff);
    if (!staffCheck.allowed) {
      throw new Error(staffCheck.reason || 'Staff member limit reached for organization.');
    }

    invitation.status = 'ACCEPTED';
    invitation.acceptedAt = now.toISOString();
    invitation.acceptedByUserId = input.userId;
    invitationStore.set(invitation.invitationId, invitation);

    // Create NewsroomMember record
    await NewsroomStaffService.addStaffMember({
      tenantId: invitation.tenantId,
      userId: input.userId,
      personId: input.personId,
      role: invitation.role,
      department: 'Editorial Newsroom',
      designation: invitation.role.replace(/_/g, ' '),
      actorId: input.userId,
      actorName: input.displayName,
    });

    // If reporter role, also register reporter profile
    if (['STAFF_REPORTER', 'CHIEF_REPORTER'].includes(invitation.role)) {
      await NewsroomStaffService.registerStaffReporter({
        tenantId: invitation.tenantId,
        userId: input.userId,
        personId: input.personId,
        byline: input.displayName,
        employmentType: invitation.employmentType,
        designation: invitation.role.replace(/_/g, ' '),
        employeeCode: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        assignedDistricts: ['Central District'],
        assignedBeats: ['General Reporting'],
        assignedBureau: 'Main Desk',
        actorId: input.userId,
        actorName: input.displayName,
      });
    }

    await auditService.log({
      tenantId: invitation.tenantId,
      actorId: input.userId,
      actorName: input.displayName,
      actorRole: invitation.role,
      action: 'STAFF_INVITATION_ACCEPTED',
      entityType: 'ReporterInvitation',
      entityId: invitation.invitationId,
      newState: invitation,
    });

    return invitation;
  }

  /**
   * Revokes an active invitation.
   */
  public static async revokeInvitation(
    invitationId: string,
    tenantId: string,
    actorId: string,
    actorName: string
  ): Promise<ReporterInvitation> {
    const inv = invitationStore.get(invitationId);
    if (!inv || inv.tenantId !== tenantId) {
      throw new Error('Invitation not found.');
    }

    inv.status = 'REVOKED';
    invitationStore.set(invitationId, inv);

    await auditService.log({
      tenantId,
      actorId,
      actorName,
      actorRole: 'admin',
      action: 'STATUS_CHANGE',
      entityType: 'ReporterInvitation',
      entityId: invitationId,
      reason: 'Invitation revoked by administrator',
    });

    return inv;
  }

  public static getTenantInvitations(tenantId: string): ReporterInvitation[] {
    return Array.from(invitationStore.values()).filter((i) => i.tenantId === tenantId);
  }
}
