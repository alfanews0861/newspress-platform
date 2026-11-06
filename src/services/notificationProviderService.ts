/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 8 — Notification Architecture & Provider Service
 * Supports multi-channel notifications (In-App, Email, Push) with tenant/user isolation.
 */

import { NotificationEvent, NotificationType, NotificationChannel } from '../types/newsroom';

export interface INotificationProvider {
  sendNotification(event: NotificationEvent): Promise<boolean>;
  getCapabilities(): NotificationChannel[];
}

export class MockNotificationProvider implements INotificationProvider {
  private sentNotifications: NotificationEvent[] = [];

  public getCapabilities(): NotificationChannel[] {
    return ['IN_APP', 'EMAIL', 'PUSH'];
  }

  public async sendNotification(event: NotificationEvent): Promise<boolean> {
    this.sentNotifications.push(event);
    return true;
  }

  public getSentNotifications(): NotificationEvent[] {
    return [...this.sentNotifications];
  }

  public reset(): void {
    this.sentNotifications = [];
  }
}

const notificationStore: Map<string, NotificationEvent> = new Map();
const activeProvider: INotificationProvider = new MockNotificationProvider();

export class NotificationProviderService {
  public static resetStore(): void {
    notificationStore.clear();
    if (activeProvider instanceof MockNotificationProvider) {
      activeProvider.reset();
    }
  }

  public static async dispatchNotification(input: {
    tenantId: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    channels?: NotificationChannel[];
    metadata?: Record<string, any>;
  }): Promise<NotificationEvent> {
    const eventId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const event: NotificationEvent = {
      eventId,
      tenantId: input.tenantId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      channels: input.channels || ['IN_APP'],
      read: false,
      metadata: input.metadata || {},
      createdAt: now,
    };

    notificationStore.set(eventId, event);
    await activeProvider.sendNotification(event);

    return event;
  }

  public static markAsRead(eventId: string): void {
    const notif = notificationStore.get(eventId);
    if (notif) {
      notif.read = true;
      notificationStore.set(eventId, notif);
    }
  }

  public static getUserNotifications(userId: string, tenantId?: string): NotificationEvent[] {
    return Array.from(notificationStore.values()).filter((n) => {
      const matchesUser = n.userId === userId;
      const matchesTenant = !tenantId || n.tenantId === tenantId;
      return matchesUser && matchesTenant;
    });
  }

  public static getUnreadCount(userId: string, tenantId?: string): number {
    return this.getUserNotifications(userId, tenantId).filter((n) => !n.read).length;
  }
}
