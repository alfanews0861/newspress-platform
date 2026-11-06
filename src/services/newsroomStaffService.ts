/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 8 — Newsroom Staff & Staff Reporter Management Service
 * Strictly enforces Phase 7 subscription entitlements for staff seats and reporter limits.
 */

import { NewsroomMember, NewsroomRole, StaffReporterDetails, ReporterEmploymentType } from '../types/newsroom';
import { ReporterProfile } from '../types/reporter';
import { SubscriptionEntitlementService } from './subscriptionEntitlementService';
import { auditService } from './auditService';

const staffStore: Map<string, NewsroomMember> = new Map(); // memberId -> NewsroomMember
const reporterExtensionStore: Map<string, StaffReporterDetails> = new Map(); // reporterId -> StaffReporterDetails
const canonicalReporters: Map<string, ReporterProfile> = new Map(); // reporterId -> ReporterProfile

export class NewsroomStaffService {
  public static resetStore(): void {
    staffStore.clear();
    reporterExtensionStore.clear();
    canonicalReporters.clear();
  }

  /**
   * Seed mock staff data for testing / preview
   */
  public static seedDefaultStaff(tenantId: string): void {
    if (Array.from(staffStore.values()).some((m) => m.tenantId === tenantId)) return;

    const now = new Date().toISOString();
    const editors: NewsroomMember[] = [
      {
        memberId: `mem_editor_${tenantId}_1`,
        tenantId,
        userId: 'user-editor-chief',
        personId: 'person-chief',
        role: 'EDITOR_IN_CHIEF',
        department: 'Editorial Desk',
        designation: 'Editor-in-Chief',
        status: 'ACTIVE',
        joinedAt: '2026-01-01T00:00:00.000Z',
        createdAt: now,
        updatedAt: now,
      },
      {
        memberId: `mem_editor_${tenantId}_2`,
        tenantId,
        userId: 'user-news-editor',
        personId: 'person-news-editor',
        role: 'NEWS_EDITOR',
        department: 'City Desk',
        designation: 'Senior News Editor',
        status: 'ACTIVE',
        joinedAt: '2026-02-01T00:00:00.000Z',
        createdAt: now,
        updatedAt: now,
      },
    ];

    editors.forEach((e) => staffStore.set(e.memberId, e));

    // Seed 2 staff reporters
    const staffReps: { member: NewsroomMember; profile: ReporterProfile; extension: StaffReporterDetails }[] = [
      {
        member: {
          memberId: `mem_rep_${tenantId}_1`,
          tenantId,
          userId: 'user-sofia-chen',
          personId: 'person-sofia',
          role: 'STAFF_REPORTER',
          department: 'Metro Reporting',
          designation: 'Senior Transit Reporter',
          status: 'ACTIVE',
          joinedAt: '2026-03-01T00:00:00.000Z',
          createdAt: now,
          updatedAt: now,
        },
        profile: {
          reporterId: 'rep_sofia_chen',
          personId: 'person-sofia',
          userId: 'user-sofia-chen',
          tenantId,
          reporterType: 'staff_reporter',
          byline: 'Sofia Chen',
          pressCardNumber: 'NY-PRESS-8841',
          pressCardIssuer: 'New York Police Dept / Press Office',
          pressCardExpiresAt: '2027-12-31T23:59:59.000Z',
          beats: ['Transit', 'Urban Development', 'City Council'],
          bio: 'Investigative transit and municipal infrastructure reporter.',
          verificationStatus: 'verified',
          originalityScore: 98,
          articlesPublishedCount: 42,
          marketplaceListingsCount: 5,
          totalEarningsCents: 125000,
          availableBalanceCents: 85000,
          currency: 'INR',
          originalFieldReports: 38,
          verifiedOriginalReports: 36,
          firstRecordedSubmissions: 12,
          independentReports: 8,
          duplicateReports: 0,
          confirmedDuplicates: 0,
          disputedReports: 0,
          corrections: 1,
          marketplaceSales: 5,
          marketplaceRevenue: 125000,
          employmentType: 'STAFF',
          organizationId: `org_${tenantId}`,
          designation: 'Senior Transit Reporter',
          employeeCode: 'EMP-104',
          joiningDate: '2026-03-01T00:00:00.000Z',
          assignedDistricts: ['Manhattan', 'Queens'],
          assignedBeats: ['Transit', 'Municipal Governance'],
          assignedBureau: 'Central City Desk',
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
        },
        extension: {
          reporterId: 'rep_sofia_chen',
          tenantId,
          userId: 'user-sofia-chen',
          employmentType: 'STAFF',
          organizationId: `org_${tenantId}`,
          designation: 'Senior Transit Reporter',
          employeeCode: 'EMP-104',
          joiningDate: '2026-03-01T00:00:00.000Z',
          assignedDistricts: ['Manhattan', 'Queens'],
          assignedBeats: ['Transit', 'Municipal Governance'],
          assignedBureau: 'Central City Desk',
          editorIds: ['user-news-editor'],
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        member: {
          memberId: `mem_rep_${tenantId}_2`,
          tenantId,
          userId: 'user-marcus-vance',
          personId: 'person-marcus',
          role: 'STAFF_REPORTER',
          department: 'Crime & Courts',
          designation: 'Staff Crime Correspondent',
          status: 'ACTIVE',
          joinedAt: '2026-04-01T00:00:00.000Z',
          createdAt: now,
          updatedAt: now,
        },
        profile: {
          reporterId: 'rep_marcus_vance',
          personId: 'person-marcus',
          userId: 'user-marcus-vance',
          tenantId,
          reporterType: 'staff_reporter',
          byline: 'Marcus Vance',
          pressCardNumber: 'NY-PRESS-9012',
          pressCardIssuer: 'New York State Press Association',
          beats: ['Crime', 'Courts', 'Public Safety'],
          bio: 'Courts and law enforcement investigative correspondent.',
          verificationStatus: 'verified',
          originalityScore: 94,
          articlesPublishedCount: 28,
          marketplaceListingsCount: 2,
          totalEarningsCents: 45000,
          availableBalanceCents: 30000,
          currency: 'INR',
          originalFieldReports: 24,
          verifiedOriginalReports: 22,
          firstRecordedSubmissions: 6,
          independentReports: 4,
          duplicateReports: 1,
          confirmedDuplicates: 0,
          disputedReports: 0,
          corrections: 0,
          marketplaceSales: 2,
          marketplaceRevenue: 45000,
          employmentType: 'STAFF',
          organizationId: `org_${tenantId}`,
          designation: 'Staff Crime Correspondent',
          employeeCode: 'EMP-108',
          joiningDate: '2026-04-01T00:00:00.000Z',
          assignedDistricts: ['Brooklyn', 'Bronx'],
          assignedBeats: ['Crime & Courts'],
          assignedBureau: 'Courts Bureau',
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
        },
        extension: {
          reporterId: 'rep_marcus_vance',
          tenantId,
          userId: 'user-marcus-vance',
          employmentType: 'STAFF',
          organizationId: `org_${tenantId}`,
          designation: 'Staff Crime Correspondent',
          employeeCode: 'EMP-108',
          joiningDate: '2026-04-01T00:00:00.000Z',
          assignedDistricts: ['Brooklyn', 'Bronx'],
          assignedBeats: ['Crime & Courts'],
          assignedBureau: 'Courts Bureau',
          editorIds: ['user-editor-chief'],
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
        },
      },
    ];

    staffReps.forEach(({ member, profile, extension }) => {
      staffStore.set(member.memberId, member);
      canonicalReporters.set(profile.reporterId, profile);
      reporterExtensionStore.set(extension.reporterId, extension);
    });
  }

  /**
   * Get total staff count for tenant
   */
  public static getActiveStaffCount(tenantId: string): number {
    return Array.from(staffStore.values()).filter(
      (m) => m.tenantId === tenantId && m.status === 'ACTIVE'
    ).length;
  }

  /**
   * Get total staff reporter count for tenant
   */
  public static getActiveReporterCount(tenantId: string): number {
    return Array.from(reporterExtensionStore.values()).filter(
      (r) => r.tenantId === tenantId && r.status === 'ACTIVE'
    ).length;
  }

  /**
   * Add a new NewsroomMember enforcing Phase 7 staff seat entitlements.
   */
  public static async addStaffMember(input: {
    tenantId: string;
    userId: string;
    personId: string;
    role: NewsroomRole;
    department: string;
    designation: string;
    actorId: string;
    actorName: string;
  }): Promise<NewsroomMember> {
    const currentStaffCount = this.getActiveStaffCount(input.tenantId);

    // Entitlement Check: Staff Member Limit
    const entitlementCheck = SubscriptionEntitlementService.canAddStaffMember(input.tenantId, currentStaffCount);
    if (!entitlementCheck.allowed) {
      throw new Error(entitlementCheck.reason || 'Staff member subscription limit reached.');
    }

    const now = new Date().toISOString();
    const memberId = `mem_${input.tenantId}_${input.userId}_${Date.now()}`;
    const member: NewsroomMember = {
      memberId,
      tenantId: input.tenantId,
      userId: input.userId,
      personId: input.personId,
      role: input.role,
      department: input.department,
      designation: input.designation,
      status: 'ACTIVE',
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    staffStore.set(memberId, member);

    await auditService.log({
      tenantId: input.tenantId,
      actorId: input.actorId,
      actorName: input.actorName,
      actorRole: 'admin',
      action: 'STAFF_INVITATION_ACCEPTED',
      entityType: 'NewsroomMember',
      entityId: memberId,
      newState: member,
    });

    return member;
  }

  /**
   * Register or extend a reporter profile with staff details, enforcing reporter seat limits.
   */
  public static async registerStaffReporter(input: {
    tenantId: string;
    userId: string;
    personId: string;
    byline: string;
    employmentType: ReporterEmploymentType;
    designation: string;
    employeeCode: string;
    assignedDistricts: string[];
    assignedBeats: string[];
    assignedBureau: string;
    editorIds?: string[];
    actorId: string;
    actorName: string;
  }): Promise<{ profile: ReporterProfile; extension: StaffReporterDetails }> {
    const currentReporterCount = this.getActiveReporterCount(input.tenantId);

    // Entitlement Check: Reporter Limit
    const entitlementCheck = SubscriptionEntitlementService.canAddReporter(input.tenantId, currentReporterCount);
    if (!entitlementCheck.allowed) {
      throw new Error(entitlementCheck.reason || 'Reporter subscription limit reached.');
    }

    const now = new Date().toISOString();
    const reporterId = `rep_${input.userId}_${Date.now()}`;

    const extension: StaffReporterDetails = {
      reporterId,
      tenantId: input.tenantId,
      userId: input.userId,
      employmentType: input.employmentType,
      organizationId: `org_${input.tenantId}`,
      designation: input.designation,
      employeeCode: input.employeeCode,
      joiningDate: now,
      assignedDistricts: input.assignedDistricts,
      assignedBeats: input.assignedBeats,
      assignedBureau: input.assignedBureau,
      editorIds: input.editorIds || [],
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    const profile: ReporterProfile = {
      reporterId,
      personId: input.personId,
      userId: input.userId,
      tenantId: input.employmentType === 'STAFF' ? input.tenantId : 'freelance_open',
      reporterType: input.employmentType === 'STAFF' ? 'staff_reporter' : 'freelance_reporter',
      byline: input.byline,
      beats: input.assignedBeats,
      bio: `${input.designation} attached to ${input.assignedBureau}.`,
      verificationStatus: 'verified',
      originalityScore: 100,
      articlesPublishedCount: 0,
      marketplaceListingsCount: 0,
      totalEarningsCents: 0,
      availableBalanceCents: 0,
      currency: 'INR',
      originalFieldReports: 0,
      verifiedOriginalReports: 0,
      firstRecordedSubmissions: 0,
      independentReports: 0,
      duplicateReports: 0,
      confirmedDuplicates: 0,
      disputedReports: 0,
      corrections: 0,
      marketplaceSales: 0,
      marketplaceRevenue: 0,
      employmentType: input.employmentType,
      organizationId: `org_${input.tenantId}`,
      designation: input.designation,
      employeeCode: input.employeeCode,
      joiningDate: now,
      assignedDistricts: input.assignedDistricts,
      assignedBeats: input.assignedBeats,
      assignedBureau: input.assignedBureau,
      editorIds: input.editorIds || [],
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    canonicalReporters.set(reporterId, profile);
    reporterExtensionStore.set(reporterId, extension);

    await auditService.log({
      tenantId: input.tenantId,
      actorId: input.actorId,
      actorName: input.actorName,
      actorRole: 'admin',
      action: 'REPORTER_VERIFIED',
      entityType: 'ReporterProfile',
      entityId: reporterId,
      newState: profile,
    });

    return { profile, extension };
  }

  /**
   * Deactivates a staff member while preserving all historical content and audit trails.
   */
  public static async deactivateStaffMember(
    tenantId: string,
    memberId: string,
    actorId: string,
    actorName: string
  ): Promise<NewsroomMember> {
    const member = staffStore.get(memberId);
    if (!member || member.tenantId !== tenantId) {
      throw new Error(`Staff member ${memberId} not found in tenant ${tenantId}.`);
    }

    const previousState = { ...member };
    member.status = 'DEACTIVATED';
    member.updatedAt = new Date().toISOString();
    staffStore.set(memberId, member);

    // Also update staff reporter status if applicable
    for (const [rId, ext] of reporterExtensionStore.entries()) {
      if (ext.userId === member.userId && ext.tenantId === tenantId) {
        ext.status = 'DEACTIVATED';
        ext.updatedAt = new Date().toISOString();
        reporterExtensionStore.set(rId, ext);

        const prof = canonicalReporters.get(rId);
        if (prof) {
          prof.status = 'DEACTIVATED';
          prof.updatedAt = new Date().toISOString();
          canonicalReporters.set(rId, prof);
        }
      }
    }

    await auditService.log({
      tenantId,
      actorId,
      actorName,
      actorRole: 'admin',
      action: 'STAFF_DEACTIVATED',
      entityType: 'NewsroomMember',
      entityId: memberId,
      previousState,
      newState: member,
    });

    return member;
  }

  /**
   * Transfer reporter between desks/beats/districts with audit logging.
   */
  public static async transferReporter(
    tenantId: string,
    reporterId: string,
    updates: {
      assignedBeats?: string[];
      assignedDistricts?: string[];
      assignedBureau?: string;
      editorIds?: string[];
    },
    actorId: string,
    actorName: string
  ): Promise<StaffReporterDetails> {
    const ext = reporterExtensionStore.get(reporterId);
    if (!ext || ext.tenantId !== tenantId) {
      throw new Error(`Reporter ${reporterId} not found for tenant ${tenantId}.`);
    }

    const previousState = { ...ext };
    if (updates.assignedBeats) ext.assignedBeats = updates.assignedBeats;
    if (updates.assignedDistricts) ext.assignedDistricts = updates.assignedDistricts;
    if (updates.assignedBureau) ext.assignedBureau = updates.assignedBureau;
    if (updates.editorIds) ext.editorIds = updates.editorIds;
    ext.updatedAt = new Date().toISOString();

    reporterExtensionStore.set(reporterId, ext);

    const prof = canonicalReporters.get(reporterId);
    if (prof) {
      prof.assignedBeats = ext.assignedBeats;
      prof.assignedDistricts = ext.assignedDistricts;
      prof.assignedBureau = ext.assignedBureau;
      prof.editorIds = ext.editorIds;
      prof.updatedAt = ext.updatedAt;
      canonicalReporters.set(reporterId, prof);
    }

    let actionType: any = 'REPORTER_DESK_CHANGED';
    if (updates.assignedBeats) actionType = 'REPORTER_BEAT_CHANGED';
    if (updates.assignedDistricts) actionType = 'REPORTER_DISTRICT_CHANGED';

    await auditService.log({
      tenantId,
      actorId,
      actorName,
      actorRole: 'admin',
      action: actionType,
      entityType: 'ReporterProfile',
      entityId: reporterId,
      previousState,
      newState: ext,
    });

    return ext;
  }

  // --- Read Methods ---

  public static getTenantMembers(tenantId: string): NewsroomMember[] {
    this.seedDefaultStaff(tenantId);
    return Array.from(staffStore.values()).filter((m) => m.tenantId === tenantId);
  }

  public static getTenantReporters(tenantId: string): ReporterProfile[] {
    this.seedDefaultStaff(tenantId);
    return Array.from(canonicalReporters.values()).filter(
      (r) => r.tenantId === tenantId || r.organizationId === `org_${tenantId}`
    );
  }

  public static getReporterProfile(reporterId: string): ReporterProfile | undefined {
    return canonicalReporters.get(reporterId);
  }

  public static getReporterExtension(reporterId: string): StaffReporterDetails | undefined {
    return reporterExtensionStore.get(reporterId);
  }
}
