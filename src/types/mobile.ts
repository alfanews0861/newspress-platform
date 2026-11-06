/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 13 — Mobile Operations, Offline Field Workflow & Push Notification Types
 */

import { AssignmentPriority, AssignmentStatus } from './newsroom';
import { OriginalityStatus } from './originality';

// Mobile Operations Sync Queue Actions
export type MobileOperationType =
  | 'CREATE_DRAFT'
  | 'UPDATE_DRAFT'
  | 'UPLOAD_EVIDENCE'
  | 'UPDATE_EVIDENCE'
  | 'ACCEPT_ASSIGNMENT'
  | 'SUBMIT_STORY'
  | 'ADD_COMMENT'
  | 'ACKNOWLEDGE_NOTIFICATION';

// Mobile Sync Statuses
export type MobileSyncStatus =
  | 'PENDING'
  | 'SYNCING'
  | 'SYNCED'
  | 'FAILED'
  | 'CONFLICT'
  | 'CANCELLED';

// Deterministic Conflict Resolution Outcomes
export type ConflictResolutionOutcome =
  | 'AUTO_MERGED'
  | 'SERVER_WINS'
  | 'LOCAL_WINS'
  | 'CONFLICT_REQUIRES_REVIEW';

// Connectivity & Bandwidth State
export type MobileNetworkState = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNCED' | 'SYNC_FAILED';
export type MobileBandwidthMode = 'NORMAL' | 'LOW_BANDWIDTH';

// Evidence Media Types & Upload Status
export type EvidenceMediaType = 'PHOTO' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'FIELD_NOTE';
export type EvidenceUploadStatus = 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'FAILED' | 'PAUSED';

export interface EvidenceLocation {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  timestamp: string;
  label?: string;
  disclosedByUser: boolean;
}

export interface MobileEvidenceItem {
  localId: string;
  serverId?: string;
  tenantId: string;
  reporterId: string;
  storyId?: string;
  assignmentId?: string;
  type: EvidenceMediaType;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  checksum: string;
  dataUri?: string;
  previewUri?: string;
  capturedAt: string;
  uploadedAt?: string;
  uploadStatus: EvidenceUploadStatus;
  uploadProgressPercent: number;
  location?: EvidenceLocation;
  caption?: string;
  notes?: string;
  audioDurationSeconds?: number;
  retryCount: number;
  lastError?: string;
}

export interface MobileDraftArticle {
  draftId: string;
  tenantId: string;
  reporterId: string;
  assignmentId?: string;
  headline: string;
  subheadline: string;
  body: string;
  category: string;
  location: string;
  eventDateTime: string;
  reporterNotes: string;
  sourceNotes: string;
  wordCount: number;
  evidenceIds: string[];
  isBreaking: boolean;
  version: number;
  lastSavedLocallyAt: string;
  syncStatus: 'LOCAL_ONLY' | 'SYNCED' | 'MODIFIED_OFFLINE' | 'SYNC_PENDING' | 'CONFLICT';
  serverArticleId?: string;
  conflictDetails?: {
    serverHeadline?: string;
    serverBody?: string;
    serverUpdatedAt?: string;
    resolutionRequired?: boolean;
  };
}

export interface SyncQueueItem {
  localOperationId: string;
  idempotencyKey: string; // mobile_{tenantId}_{userId}_{localOperationId}
  tenantId: string;
  userId: string;
  entityId: string;
  operationType: MobileOperationType;
  payload: any;
  createdAt: string;
  retryCount: number;
  status: MobileSyncStatus;
  lastError?: string;
  conflictResolution?: ConflictResolutionOutcome;
  syncedAt?: string;
}

export interface ConflictRecord {
  conflictId: string;
  tenantId: string;
  userId: string;
  entityType: 'draft' | 'assignment' | 'evidence' | 'submission';
  entityId: string;
  localVersion: any;
  serverVersion: any;
  resolution: ConflictResolutionOutcome;
  resolvedAt?: string;
  resolutionNotes?: string;
}

// Push Notification Categories
export type PushNotificationCategory =
  | 'ASSIGNMENT_ASSIGNED'
  | 'ASSIGNMENT_DEADLINE'
  | 'ASSIGNMENT_OVERDUE'
  | 'REVISION_REQUESTED'
  | 'STORY_APPROVED'
  | 'STORY_REJECTED'
  | 'EDITORIAL_COMMENT'
  | 'BREAKING_NEWS'
  | 'EDITION_READY'
  | 'PRODUCTION_ALERT'
  | 'LICENSE_EXPIRING'
  | 'PURCHASE_COMPLETED'
  | 'PAYOUT_STATUS'
  | 'SYSTEM_ALERT';

export interface MobilePushNotification {
  notificationId: string;
  tenantId: string;
  userId: string;
  category: PushNotificationCategory;
  title: string;
  body: string;
  read: boolean;
  receivedAt: string;
  deepLink: string;
  metadata?: Record<string, any>;
  priority?: 'HIGH' | 'NORMAL' | 'URGENT';
}

export interface NotificationPreferences {
  assignments: boolean;
  editorial: boolean;
  breakingNews: boolean;
  marketplace: boolean;
  production: boolean;
  financial: boolean;
  system: boolean; // Always true
}

export interface AppVersionInfo {
  currentVersion: string;
  minimumRequiredVersion: string;
  latestAvailableVersion: string;
  updateUrl?: string;
  forceUpdateRequired: boolean;
  releaseNotes?: string;
}

export interface MobileTelemetryRecord {
  tenantId: string;
  activeReportersCount: number;
  assignmentAcceptanceRate: number;
  submissionCompletionRate: number;
  offlineSyncSuccessRate: number;
  uploadFailureRate: number;
  averageSubmissionTimeMinutes: number;
  notificationDeliveryRate: number;
  timestamp: string;
}

export type MobileTab =
  | 'home'
  | 'assignments'
  | 'drafts'
  | 'capture'
  | 'review'
  | 'editions'
  | 'marketplace'
  | 'production'
  | 'finance'
  | 'notifications'
  | 'profile';
