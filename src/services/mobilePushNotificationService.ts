/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 13 — Mobile Push Notification Service & Deep Link Engine
 * Dispatches role-aware FCM push notifications, manages category preferences,
 * and builds tenant-safe deep links across editorial, assignments, and production workflows.
 */

import {
  PushNotificationCategory,
  MobilePushNotification,
  NotificationPreferences,
} from '../types/mobile';
import { auditService } from './auditService';

const DEFAULT_PREFERENCES: NotificationPreferences = {
  assignments: true,
  editorial: true,
  breakingNews: true,
  marketplace: true,
  production: true,
  financial: true,
  system: true, // Always locked to true
};

export class MobilePushNotificationService {
  private static notificationsStore: Map<string, MobilePushNotification> = new Map();
  private static userPreferences: Map<string, NotificationPreferences> = new Map(); // `tenantId_userId` -> prefs

  public static getPreferences(userId: string, tenantId: string): NotificationPreferences {
    const key = `${tenantId}_${userId}`;
    return this.userPreferences.get(key) || { ...DEFAULT_PREFERENCES };
  }

  public static updatePreferences(
    userId: string,
    tenantId: string,
    updates: Partial<NotificationPreferences>
  ): NotificationPreferences {
    const current = this.getPreferences(userId, tenantId);
    const updated: NotificationPreferences = {
      ...current,
      ...updates,
      system: true, // Security invariant: System notifications cannot be disabled
    };
    this.userPreferences.set(`${tenantId}_${userId}`, updated);
    return updated;
  }

  public static isCategoryEnabled(
    category: PushNotificationCategory,
    prefs: NotificationPreferences
  ): boolean {
    switch (category) {
      case 'ASSIGNMENT_ASSIGNED':
      case 'ASSIGNMENT_DEADLINE':
      case 'ASSIGNMENT_OVERDUE':
        return prefs.assignments;
      case 'REVISION_REQUESTED':
      case 'STORY_APPROVED':
      case 'STORY_REJECTED':
      case 'EDITORIAL_COMMENT':
        return prefs.editorial;
      case 'BREAKING_NEWS':
        return prefs.breakingNews;
      case 'LICENSE_EXPIRING':
      case 'PURCHASE_COMPLETED':
        return prefs.marketplace;
      case 'EDITION_READY':
      case 'PRODUCTION_ALERT':
        return prefs.production;
      case 'PAYOUT_STATUS':
        return prefs.financial;
      case 'SYSTEM_ALERT':
      default:
        return true; // System alerts always bypass filter
    }
  }

  public static buildDeepLink(category: PushNotificationCategory, metadata?: Record<string, any>): string {
    switch (category) {
      case 'ASSIGNMENT_ASSIGNED':
      case 'ASSIGNMENT_DEADLINE':
      case 'ASSIGNMENT_OVERDUE':
        return metadata?.assignmentId ? `/mobile/assignments/${metadata.assignmentId}` : '/mobile/assignments';
      case 'REVISION_REQUESTED':
        return metadata?.draftId ? `/mobile/editor/${metadata.draftId}` : '/mobile/drafts';
      case 'STORY_APPROVED':
      case 'STORY_REJECTED':
      case 'EDITORIAL_COMMENT':
        return metadata?.storyId ? `/mobile/review/${metadata.storyId}` : '/mobile/review';
      case 'BREAKING_NEWS':
        return '/mobile/breaking';
      case 'EDITION_READY':
        return '/mobile/editions';
      case 'PRODUCTION_ALERT':
        return '/mobile/production';
      case 'LICENSE_EXPIRING':
      case 'PURCHASE_COMPLETED':
        return metadata?.licenseId ? `/marketplace/license/${metadata.licenseId}` : '/mobile/marketplace';
      case 'PAYOUT_STATUS':
        return '/mobile/finance';
      case 'SYSTEM_ALERT':
      default:
        return '/mobile/home';
    }
  }

  public static dispatch(params: {
    tenantId: string;
    userId: string;
    category: PushNotificationCategory;
    title: string;
    body: string;
    metadata?: Record<string, any>;
    priority?: 'HIGH' | 'NORMAL' | 'URGENT';
  }): MobilePushNotification | null {
    const prefs = this.getPreferences(params.userId, params.tenantId);
    if (!this.isCategoryEnabled(params.category, prefs)) {
      // User has opted out of this non-critical category
      return null;
    }

    const notificationId = `push_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const deepLink = this.buildDeepLink(params.category, params.metadata);

    const notification: MobilePushNotification = {
      notificationId,
      tenantId: params.tenantId,
      userId: params.userId,
      category: params.category,
      title: params.title,
      body: params.body,
      read: false,
      receivedAt: new Date().toISOString(),
      deepLink,
      metadata: params.metadata,
      priority: params.priority || 'NORMAL',
    };

    this.notificationsStore.set(notificationId, notification);

    auditService.log({
      action: 'PUSH_NOTIFICATION_DISPATCHED',
      tenantId: params.tenantId,
      actorId: params.userId,
      actorName: 'Mobile Notification System',
      actorRole: 'system',
      entityType: 'MobileNotification',
      entityId: notificationId,
      details: {
        notificationId,
        category: params.category,
        deepLink,
      },
    });

    return notification;
  }

  public static getNotificationsForUser(userId: string, tenantId: string): MobilePushNotification[] {
    return Array.from(this.notificationsStore.values())
      .filter((n) => n.userId === userId && n.tenantId === tenantId)
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }

  public static getUnreadCount(userId: string, tenantId: string): number {
    return this.getNotificationsForUser(userId, tenantId).filter((n) => !n.read).length;
  }

  public static markAsRead(notificationId: string, tenantId: string): boolean {
    const notif = this.notificationsStore.get(notificationId);
    if (notif && notif.tenantId === tenantId) {
      notif.read = true;
      return true;
    }
    return false;
  }

  public static markAllAsRead(userId: string, tenantId: string): number {
    let count = 0;
    for (const notif of this.notificationsStore.values()) {
      if (notif.userId === userId && notif.tenantId === tenantId && !notif.read) {
        notif.read = true;
        count++;
      }
    }
    return count;
  }

  public static reset(): void {
    this.notificationsStore.clear();
    this.userPreferences.clear();
  }
}
