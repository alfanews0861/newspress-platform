/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 8 — Newsroom Operations, Staff Management & Editorial Workflow Domain Model
 */

export type NewsroomOrganizationStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

export interface NewsroomOrganization {
  organizationId: string;
  tenantId: string;
  name: string;
  shortName: string;
  logoUrl?: string;
  primaryLanguage: string;
  defaultState: string;
  defaultDistrict: string;
  timezone: string;
  contactEmail: string;
  contactPhone?: string;
  status: NewsroomOrganizationStatus;
  createdAt: string;
  updatedAt: string;
}

export type NewsroomRole =
  | 'OWNER'
  | 'ADMIN'
  | 'EDITOR_IN_CHIEF'
  | 'NEWS_EDITOR'
  | 'DESK_EDITOR'
  | 'CHIEF_REPORTER'
  | 'STAFF_REPORTER'
  | 'COPY_EDITOR'
  | 'PHOTO_EDITOR'
  | 'PRODUCTION_EDITOR'
  | 'ACCOUNTANT'
  | 'VIEWER';

export type NewsroomMemberStatus = 'ACTIVE' | 'DEACTIVATED' | 'INVITED' | 'SUSPENDED';

export interface NewsroomMember {
  memberId: string;
  tenantId: string;
  userId: string;
  personId: string;
  role: NewsroomRole;
  department: string;
  designation: string;
  status: NewsroomMemberStatus;
  joinedAt: string;
  invitedBy?: string;
  invitationId?: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReporterEmploymentType = 'STAFF' | 'FREELANCE' | 'STRINGER' | 'CONTRIBUTOR';

export interface StaffReporterDetails {
  reporterId: string;
  tenantId: string;
  userId: string;
  employmentType: ReporterEmploymentType;
  organizationId: string;
  designation: string;
  employeeCode: string;
  joiningDate: string;
  assignedDistricts: string[];
  assignedBeats: string[];
  assignedBureau: string;
  editorIds: string[];
  status: 'ACTIVE' | 'SUSPENDED' | 'TRANSFERRED' | 'DEACTIVATED';
  createdAt: string;
  updatedAt: string;
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface ReporterInvitation {
  invitationId: string;
  tenantId: string;
  email: string;
  phone?: string;
  role: NewsroomRole;
  employmentType: ReporterEmploymentType;
  invitedBy: string;
  status: InvitationStatus;
  tokenHash: string;
  expiresAt: string;
  acceptedAt?: string;
  acceptedByUserId?: string;
  createdAt: string;
}

export type VerificationType =
  | 'IDENTITY'
  | 'EMPLOYMENT'
  | 'PRESS_CREDENTIAL'
  | 'ORGANIZATION_ASSOCIATION'
  | 'FREELANCE_PROFILE';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

export interface ReporterVerification {
  verificationId: string;
  reporterId: string;
  tenantId: string;
  verificationType: VerificationType;
  status: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
  documents?: string[];
  createdAt: string;
}

export interface NewsBeat {
  beatId: string;
  tenantId: string;
  name: string;
  description: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReporterBeatAssignment {
  assignmentId: string;
  tenantId: string;
  reporterId: string;
  beatId: string;
  beatName: string;
  assignedBy: string;
  assignedAt: string;
}

export interface ReporterDistrictAssignment {
  assignmentId: string;
  tenantId: string;
  reporterId: string;
  district: string;
  state: string;
  assignedBy: string;
  assignedAt: string;
}

export interface NewsroomDesk {
  deskId: string;
  tenantId: string;
  name: string;
  description: string;
  section: string;
  editorIds: string[];
  reporterIds: string[];
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export type AssignmentPriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

export type AssignmentStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'OVERDUE';

export type DeadlineState = 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'COMPLETED_LATE';

export interface NewsAssignment {
  assignmentId: string;
  tenantId: string;
  deskId: string;
  assignedReporterId: string;
  assignedByUserId: string;
  title: string;
  brief: string;
  expectedOutput: string;
  priority: AssignmentPriority;
  beat: string;
  district: string;
  location?: string;
  deadline: string;
  status: AssignmentStatus;
  deadlineState?: DeadlineState;
  sourceEventId?: string;
  relatedNewsId?: string;
  createdAt: string;
  acceptedAt?: string;
  startedAt?: string;
  submittedAt?: string;
  completedAt?: string;
}

export type EditorialCommentType =
  | 'FACT_CHECK'
  | 'COPY_EDIT'
  | 'MISSING_INFORMATION'
  | 'PHOTO_REQUEST'
  | 'SOURCE_REQUEST'
  | 'HEADLINE_REQUEST'
  | 'LEGAL_REVIEW'
  | 'GENERAL';

export interface EditorialComment {
  commentId: string;
  tenantId: string;
  newsId: string;
  assignmentId?: string;
  authorUserId: string;
  authorName?: string;
  targetReporterId: string;
  commentType: EditorialCommentType;
  text: string;
  anchor?: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export type NotificationType =
  | 'ASSIGNMENT_CREATED'
  | 'ASSIGNMENT_ACCEPTED'
  | 'ASSIGNMENT_DEADLINE_APPROACHING'
  | 'ASSIGNMENT_OVERDUE'
  | 'NEWS_SUBMITTED'
  | 'REVISION_REQUESTED'
  | 'EDITOR_COMMENT_ADDED'
  | 'NEWS_APPROVED'
  | 'NEWS_REJECTED'
  | 'ORIGINALITY_REVIEW_REQUIRED'
  | 'AI_FACT_ALERT'
  | 'MARKETPLACE_ELIGIBLE';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'PUSH';

export interface NotificationEvent {
  eventId: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channels: NotificationChannel[];
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface NewsroomOperationalMetrics {
  totalAssignments: number;
  completedAssignments: number;
  overdueAssignments: number;
  submittedStories: number;
  approvedStories: number;
  rejectedStories: number;
  storiesUnderReview: number;
  averageSubmissionTurnaroundMinutes: number;
  verifiedOriginalReports: number;
  marketplaceEligibleStories: number;
  editionPublishedStories: number;
}
