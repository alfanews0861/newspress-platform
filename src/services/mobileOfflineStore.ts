/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 13 — Offline Reporting Store & Local Data Safety
 * Provides local caching and offline-first storage for drafts, evidence metadata,
 * assignments, sync queue, and user preferences with strict tenant isolation
 * and sensitive data exclusion (no passwords, payout secrets, or cross-tenant data).
 */

import {
  MobileDraftArticle,
  MobileEvidenceItem,
  SyncQueueItem,
  ConflictRecord,
  NotificationPreferences,
  MobileNetworkState,
  MobileBandwidthMode,
} from '../types/mobile';
import { NewsAssignment } from '../types/newsroom';

const STORAGE_PREFIX = 'newspress_mobile_';

export class OfflineReportingStore {
  private static memoryDrafts: Map<string, MobileDraftArticle> = new Map();
  private static memoryEvidence: Map<string, MobileEvidenceItem> = new Map();
  private static memoryAssignments: Map<string, NewsAssignment> = new Map();
  private static memorySyncQueue: Map<string, SyncQueueItem> = new Map();
  private static memoryConflicts: Map<string, ConflictRecord> = new Map();

  private static networkState: MobileNetworkState = 'ONLINE';
  private static bandwidthMode: MobileBandwidthMode = 'NORMAL';
  private static listeners: Set<() => void> = new Set();

  public static subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private static notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('OfflineReportingStore listener error', err);
      }
    });
  }

  public static reset(): void {
    this.memoryDrafts.clear();
    this.memoryEvidence.clear();
    this.memoryAssignments.clear();
    this.memorySyncQueue.clear();
    this.memoryConflicts.clear();
    this.networkState = 'ONLINE';
    this.bandwidthMode = 'NORMAL';
    this.notify();
  }

  // --- Network & Bandwidth State ---
  public static getNetworkState(): MobileNetworkState {
    return this.networkState;
  }

  public static setNetworkState(state: MobileNetworkState): void {
    this.networkState = state;
    this.notify();
  }

  public static getBandwidthMode(): MobileBandwidthMode {
    return this.bandwidthMode;
  }

  public static setBandwidthMode(mode: MobileBandwidthMode): void {
    this.bandwidthMode = mode;
    this.notify();
  }

  // --- Draft Operations (Offline-First) ---
  public static saveDraft(draft: MobileDraftArticle): MobileDraftArticle {
    // Sanitize and ensure word count is updated
    const words = draft.body.trim() ? draft.body.trim().split(/\s+/).length : 0;
    const updatedDraft: MobileDraftArticle = {
      ...draft,
      wordCount: words,
      lastSavedLocallyAt: new Date().toISOString(),
    };

    this.memoryDrafts.set(draft.draftId, updatedDraft);
    this.notify();
    return updatedDraft;
  }

  public static getDraft(draftId: string, tenantId?: string): MobileDraftArticle | undefined {
    const draft = this.memoryDrafts.get(draftId);
    if (!draft) return undefined;
    if (tenantId && draft.tenantId !== tenantId) return undefined;
    return draft;
  }

  public static getDraftsForReporter(reporterId: string, tenantId: string): MobileDraftArticle[] {
    return Array.from(this.memoryDrafts.values()).filter(
      (d) => d.reporterId === reporterId && d.tenantId === tenantId
    );
  }

  public static deleteDraft(draftId: string, tenantId: string): boolean {
    const draft = this.memoryDrafts.get(draftId);
    if (draft && draft.tenantId === tenantId) {
      this.memoryDrafts.delete(draftId);
      this.notify();
      return true;
    }
    return false;
  }

  // --- Field Evidence Metadata Storage ---
  public static saveEvidence(item: MobileEvidenceItem): MobileEvidenceItem {
    this.memoryEvidence.set(item.localId, item);
    this.notify();
    return item;
  }

  public static getEvidence(localId: string, tenantId?: string): MobileEvidenceItem | undefined {
    const ev = this.memoryEvidence.get(localId);
    if (!ev) return undefined;
    if (tenantId && ev.tenantId !== tenantId) return undefined;
    return ev;
  }

  public static getEvidenceForReporter(reporterId: string, tenantId: string): MobileEvidenceItem[] {
    return Array.from(this.memoryEvidence.values()).filter(
      (e) => e.reporterId === reporterId && e.tenantId === tenantId
    );
  }

  public static getEvidenceForStory(storyOrDraftId: string, tenantId: string): MobileEvidenceItem[] {
    return Array.from(this.memoryEvidence.values()).filter(
      (e) => e.storyId === storyOrDraftId && e.tenantId === tenantId
    );
  }

  public static deleteEvidence(localId: string, tenantId: string): boolean {
    const ev = this.memoryEvidence.get(localId);
    if (ev && ev.tenantId === tenantId) {
      this.memoryEvidence.delete(localId);
      this.notify();
      return true;
    }
    return false;
  }

  // --- Cached Assignments ---
  public static cacheAssignments(assignments: NewsAssignment[], tenantId: string): void {
    assignments.forEach((asg) => {
      if (asg.tenantId === tenantId) {
        this.memoryAssignments.set(asg.assignmentId, asg);
      }
    });
    this.notify();
  }

  public static getCachedAssignments(reporterId?: string, tenantId?: string): NewsAssignment[] {
    return Array.from(this.memoryAssignments.values()).filter((a) => {
      const matchTenant = !tenantId || a.tenantId === tenantId;
      const matchRep = !reporterId || a.assignedReporterId === reporterId;
      return matchTenant && matchRep;
    });
  }

  public static updateCachedAssignment(assignment: NewsAssignment): void {
    this.memoryAssignments.set(assignment.assignmentId, assignment);
    this.notify();
  }

  // --- Offline Sync Queue Storage ---
  public static enqueueOperation(item: SyncQueueItem): SyncQueueItem {
    this.memorySyncQueue.set(item.localOperationId, item);
    this.notify();
    return item;
  }

  public static getQueueItems(tenantId?: string): SyncQueueItem[] {
    const items = Array.from(this.memorySyncQueue.values());
    if (tenantId) {
      return items.filter((i) => i.tenantId === tenantId);
    }
    return items;
  }

  public static getPendingQueueCount(tenantId?: string): number {
    return this.getQueueItems(tenantId).filter(
      (i) => i.status === 'PENDING' || i.status === 'FAILED'
    ).length;
  }

  public static updateQueueItem(item: SyncQueueItem): void {
    this.memorySyncQueue.set(item.localOperationId, item);
    this.notify();
  }

  public static removeQueueItem(localOperationId: string): void {
    this.memorySyncQueue.delete(localOperationId);
    this.notify();
  }

  // --- Conflict Storage ---
  public static recordConflict(conflict: ConflictRecord): void {
    this.memoryConflicts.set(conflict.conflictId, conflict);
    this.notify();
  }

  public static getConflicts(tenantId?: string): ConflictRecord[] {
    const list = Array.from(this.memoryConflicts.values());
    if (tenantId) return list.filter((c) => c.tenantId === tenantId);
    return list;
  }

  public static resolveConflict(conflictId: string, resolution: ConflictRecord['resolution'], notes?: string): void {
    const conflict = this.memoryConflicts.get(conflictId);
    if (conflict) {
      conflict.resolution = resolution;
      conflict.resolvedAt = new Date().toISOString();
      conflict.resolutionNotes = notes;
      this.notify();
    }
  }

  // --- Local Data Safety Cleanups ---
  public static cleanupSyncedDrafts(tenantId: string): number {
    let count = 0;
    for (const [id, draft] of this.memoryDrafts.entries()) {
      if (draft.tenantId === tenantId && draft.syncStatus === 'SYNCED') {
        this.memoryDrafts.delete(id);
        count++;
      }
    }
    this.notify();
    return count;
  }

  public static cleanupTemporaryUploads(tenantId: string): number {
    let count = 0;
    for (const [id, ev] of this.memoryEvidence.entries()) {
      if (ev.tenantId === tenantId && ev.uploadStatus === 'UPLOADED') {
        // Keep metadata but free heavy data URIs if any
        if (ev.dataUri) {
          ev.dataUri = undefined;
          count++;
        }
      }
    }
    this.notify();
    return count;
  }
}
