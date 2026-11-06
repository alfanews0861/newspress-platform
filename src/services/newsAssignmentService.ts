/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 8 — Assignment Engine & Deadline Service
 * Manages reporter field assignments, deadline status calculation, and editorial lifecycle.
 */

import {
  NewsAssignment,
  AssignmentPriority,
  AssignmentStatus,
  DeadlineState,
} from '../types/newsroom';
import { NewsroomStaffService } from './newsroomStaffService';
import { NewsroomOrganizationService } from './newsroomOrganizationService';
import { NotificationProviderService } from './notificationProviderService';
import { auditService } from './auditService';

const assignmentStore: Map<string, NewsAssignment> = new Map(); // assignmentId -> NewsAssignment

export class NewsAssignmentService {
  public static resetStore(): void {
    assignmentStore.clear();
  }

  public static seedDefaultAssignments(tenantId: string): void {
    if (Array.from(assignmentStore.values()).some((a) => a.tenantId === tenantId)) return;

    const now = new Date();
    const deadline1 = new Date(now.getTime() + 12 * 3600 * 1000).toISOString();
    const deadline2 = new Date(now.getTime() - 2 * 3600 * 1000).toISOString(); // overdue

    const defaults: NewsAssignment[] = [
      {
        assignmentId: `asg_${tenantId}_1`,
        tenantId,
        deskId: `desk_${tenantId}_city`,
        assignedReporterId: 'rep_sofia_chen',
        assignedByUserId: 'user-news-editor',
        title: 'Central Subway Automated Signaling Field Test Coverage',
        brief: 'Attend 2:00 PM press briefing at Grand Central Terminal. Interview Metropolitan Transit Authority signals director.',
        expectedOutput: '800 words + 2 high-res photographs + Audio recording',
        priority: 'URGENT',
        beat: 'Transit & Infrastructure',
        district: 'Manhattan',
        location: 'Grand Central Terminal, Platform 4B',
        deadline: deadline1,
        status: 'IN_PROGRESS',
        sourceEventId: 'evt-transit-modernization',
        createdAt: new Date(now.getTime() - 4 * 3600 * 1000).toISOString(),
        acceptedAt: new Date(now.getTime() - 3.5 * 3600 * 1000).toISOString(),
        startedAt: new Date(now.getTime() - 3 * 3600 * 1000).toISOString(),
      },
      {
        assignmentId: `asg_${tenantId}_2`,
        tenantId,
        deskId: `desk_${tenantId}_crime`,
        assignedReporterId: 'rep_marcus_vance',
        assignedByUserId: 'user-editor-chief',
        title: 'Borough Hearing on Commercial Zoning Violation Appeal',
        brief: 'Obtain court documents regarding civic dispute in Brooklyn district court.',
        expectedOutput: '600 words lead dispatch',
        priority: 'NORMAL',
        beat: 'Crime & Law',
        district: 'Brooklyn',
        location: 'Kings County Supreme Court',
        deadline: deadline2,
        status: 'OVERDUE',
        createdAt: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
        acceptedAt: new Date(now.getTime() - 20 * 3600 * 1000).toISOString(),
      },
    ];

    defaults.forEach((a) => {
      a.deadlineState = this.calculateDeadlineState(a);
      assignmentStore.set(a.assignmentId, a);
    });
  }

  /**
   * Evaluates operational deadline status taking tenant timezone into consideration.
   */
  public static calculateDeadlineState(assignment: NewsAssignment): DeadlineState {
    const org = NewsroomOrganizationService.getOrCreateOrganization(assignment.tenantId);
    const now = new Date();
    const deadline = new Date(assignment.deadline);

    if (assignment.status === 'COMPLETED') {
      if (assignment.completedAt && new Date(assignment.completedAt) > deadline) {
        return 'COMPLETED_LATE';
      }
      return 'ON_TIME';
    }

    const diffMs = deadline.getTime() - now.getTime();

    if (diffMs < 0) {
      return 'OVERDUE';
    } else if (diffMs <= 2 * 3600 * 1000) {
      // Due within 2 hours
      return 'AT_RISK';
    } else {
      return 'ON_TIME';
    }
  }

  /**
   * Creates a new news assignment.
   */
  public static async createAssignment(input: {
    tenantId: string;
    deskId: string;
    assignedReporterId: string;
    assignedByUserId: string;
    assignedByName: string;
    title: string;
    brief: string;
    expectedOutput: string;
    priority: AssignmentPriority;
    beat: string;
    district: string;
    location?: string;
    deadline: string; // ISO 8601
    sourceEventId?: string;
  }): Promise<NewsAssignment> {
    // Validate assigned reporter exists
    const reporter = NewsroomStaffService.getReporterProfile(input.assignedReporterId);
    if (!reporter) {
      throw new Error(`Assigned reporter ${input.assignedReporterId} not found.`);
    }

    const assignmentId = `asg_${input.tenantId}_${Date.now()}`;
    const now = new Date().toISOString();

    const assignment: NewsAssignment = {
      assignmentId,
      tenantId: input.tenantId,
      deskId: input.deskId,
      assignedReporterId: input.assignedReporterId,
      assignedByUserId: input.assignedByUserId,
      title: input.title,
      brief: input.brief,
      expectedOutput: input.expectedOutput,
      priority: input.priority,
      beat: input.beat,
      district: input.district,
      location: input.location || '',
      deadline: input.deadline,
      status: 'ASSIGNED',
      sourceEventId: input.sourceEventId,
      createdAt: now,
    };

    assignment.deadlineState = this.calculateDeadlineState(assignment);
    assignmentStore.set(assignmentId, assignment);

    // Notify Reporter
    await NotificationProviderService.dispatchNotification({
      tenantId: input.tenantId,
      userId: reporter.userId,
      type: 'ASSIGNMENT_CREATED',
      title: `New Assignment: ${input.title}`,
      message: `Priority: ${input.priority}. Deadline: ${new Date(input.deadline).toLocaleString()}`,
      metadata: { assignmentId, priority: input.priority },
    });

    await auditService.log({
      tenantId: input.tenantId,
      actorId: input.assignedByUserId,
      actorName: input.assignedByName,
      actorRole: 'editor',
      action: 'ASSIGNMENT_CREATED',
      entityType: 'NewsAssignment',
      entityId: assignmentId,
      newState: assignment,
    });

    return assignment;
  }

  /**
   * Reporter accepts assignment.
   */
  public static async acceptAssignment(
    assignmentId: string,
    reporterUserId: string,
    reporterName: string
  ): Promise<NewsAssignment> {
    const asg = assignmentStore.get(assignmentId);
    if (!asg) throw new Error(`Assignment ${assignmentId} not found.`);

    const now = new Date().toISOString();
    asg.status = 'ACCEPTED';
    asg.acceptedAt = now;
    asg.deadlineState = this.calculateDeadlineState(asg);
    assignmentStore.set(assignmentId, asg);

    await NotificationProviderService.dispatchNotification({
      tenantId: asg.tenantId,
      userId: asg.assignedByUserId,
      type: 'ASSIGNMENT_ACCEPTED',
      title: `Assignment Accepted`,
      message: `${reporterName} has accepted: "${asg.title}"`,
      metadata: { assignmentId },
    });

    await auditService.log({
      tenantId: asg.tenantId,
      actorId: reporterUserId,
      actorName: reporterName,
      actorRole: 'reporter',
      action: 'ASSIGNMENT_ACCEPTED',
      entityType: 'NewsAssignment',
      entityId: assignmentId,
      newState: asg,
    });

    return asg;
  }

  /**
   * Reporter starts field reporting.
   */
  public static async startAssignment(
    assignmentId: string,
    reporterUserId: string,
    reporterName: string
  ): Promise<NewsAssignment> {
    const asg = assignmentStore.get(assignmentId);
    if (!asg) throw new Error(`Assignment ${assignmentId} not found.`);

    const now = new Date().toISOString();
    asg.status = 'IN_PROGRESS';
    asg.startedAt = now;
    asg.deadlineState = this.calculateDeadlineState(asg);
    assignmentStore.set(assignmentId, asg);

    await auditService.log({
      tenantId: asg.tenantId,
      actorId: reporterUserId,
      actorName: reporterName,
      actorRole: 'reporter',
      action: 'ASSIGNMENT_STARTED',
      entityType: 'NewsAssignment',
      entityId: assignmentId,
      newState: asg,
    });

    return asg;
  }

  /**
   * Reporter submits news for assignment.
   */
  public static async linkSubmissionToAssignment(
    assignmentId: string,
    relatedNewsId: string,
    reporterUserId: string,
    reporterName: string
  ): Promise<NewsAssignment> {
    const asg = assignmentStore.get(assignmentId);
    if (!asg) throw new Error(`Assignment ${assignmentId} not found.`);

    const now = new Date().toISOString();
    asg.status = 'SUBMITTED';
    asg.submittedAt = now;
    asg.relatedNewsId = relatedNewsId;
    asg.deadlineState = this.calculateDeadlineState(asg);
    assignmentStore.set(assignmentId, asg);

    await NotificationProviderService.dispatchNotification({
      tenantId: asg.tenantId,
      userId: asg.assignedByUserId,
      type: 'NEWS_SUBMITTED',
      title: `Story Filed for Assignment`,
      message: `${reporterName} submitted draft for: "${asg.title}"`,
      metadata: { assignmentId, relatedNewsId },
    });

    await auditService.log({
      tenantId: asg.tenantId,
      actorId: reporterUserId,
      actorName: reporterName,
      actorRole: 'reporter',
      action: 'ASSIGNMENT_SUBMITTED',
      entityType: 'NewsAssignment',
      entityId: assignmentId,
      newState: asg,
    });

    return asg;
  }

  /**
   * Editor completes assignment upon editorial approval.
   */
  public static async completeAssignment(
    assignmentId: string,
    editorUserId: string,
    editorName: string
  ): Promise<NewsAssignment> {
    const asg = assignmentStore.get(assignmentId);
    if (!asg) throw new Error(`Assignment ${assignmentId} not found.`);

    const now = new Date().toISOString();
    asg.status = 'COMPLETED';
    asg.completedAt = now;
    asg.deadlineState = this.calculateDeadlineState(asg);
    assignmentStore.set(assignmentId, asg);

    const reporter = NewsroomStaffService.getReporterProfile(asg.assignedReporterId);
    if (reporter) {
      await NotificationProviderService.dispatchNotification({
        tenantId: asg.tenantId,
        userId: reporter.userId,
        type: 'NEWS_APPROVED',
        title: `Assignment Approved & Completed`,
        message: `Your story for "${asg.title}" has been editorially approved.`,
        metadata: { assignmentId },
      });
    }

    await auditService.log({
      tenantId: asg.tenantId,
      actorId: editorUserId,
      actorName: editorName,
      actorRole: 'editor',
      action: 'ASSIGNMENT_COMPLETED',
      entityType: 'NewsAssignment',
      entityId: assignmentId,
      newState: asg,
    });

    return asg;
  }

  /**
   * Editor cancels assignment.
   */
  public static async cancelAssignment(
    assignmentId: string,
    editorUserId: string,
    editorName: string,
    reason?: string
  ): Promise<NewsAssignment> {
    const asg = assignmentStore.get(assignmentId);
    if (!asg) throw new Error(`Assignment ${assignmentId} not found.`);

    asg.status = 'CANCELLED';
    assignmentStore.set(assignmentId, asg);

    await auditService.log({
      tenantId: asg.tenantId,
      actorId: editorUserId,
      actorName: editorName,
      actorRole: 'editor',
      action: 'ASSIGNMENT_CANCELLED',
      entityType: 'NewsAssignment',
      entityId: assignmentId,
      reason,
    });

    return asg;
  }

  // --- Read Methods ---

  public static getAssignments(tenantId: string): NewsAssignment[] {
    this.seedDefaultAssignments(tenantId);
    const list = Array.from(assignmentStore.values()).filter((a) => a.tenantId === tenantId);
    // Recalculate deadline states dynamically
    list.forEach((a) => (a.deadlineState = this.calculateDeadlineState(a)));
    return list;
  }

  public static getReporterAssignments(reporterId: string, tenantId?: string): NewsAssignment[] {
    if (tenantId) this.seedDefaultAssignments(tenantId);
    const list = Array.from(assignmentStore.values()).filter((a) => {
      const matchesRep = a.assignedReporterId === reporterId;
      const matchesTen = !tenantId || a.tenantId === tenantId;
      return matchesRep && matchesTen;
    });
    list.forEach((a) => (a.deadlineState = this.calculateDeadlineState(a)));
    return list;
  }

  public static getAssignmentById(assignmentId: string): NewsAssignment | undefined {
    const asg = assignmentStore.get(assignmentId);
    if (asg) asg.deadlineState = this.calculateDeadlineState(asg);
    return asg;
  }
}
