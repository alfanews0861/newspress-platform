/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Internal Notifications Service (Phase 5)
 * Dispatches and persists newsroom notifications for edition finalization,
 * production start, preflight warnings, and press-ready deliverables.
 */

import { InternalNotification } from '../types/production';

const _notificationsStore: InternalNotification[] = [];

export class NotificationService {
  public static async createNotification(params: {
    tenantId: string;
    type: InternalNotification['type'];
    editionId: string;
    title: string;
    message: string;
  }): Promise<InternalNotification> {
    const notification: InternalNotification = {
      notificationId: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenantId: params.tenantId,
      type: params.type,
      editionId: params.editionId,
      title: params.title,
      message: params.message,
      read: false,
      createdAt: new Date().toISOString(),
    };

    _notificationsStore.unshift(notification);
    return notification;
  }

  public static getNotificationsForTenant(tenantId: string): InternalNotification[] {
    return _notificationsStore.filter((n) => n.tenantId === tenantId);
  }

  public static getNotifications(tenantId: string): InternalNotification[] {
    return _notificationsStore.filter((n) => n.tenantId === tenantId);
  }

  public static send(params: {
    tenantId: string;
    recipientId?: string;
    title: string;
    body?: string;
    message?: string;
    type: string;
    metadata?: Record<string, any>;
  }): void {
    const notification: InternalNotification = {
      notificationId: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenantId: params.tenantId,
      type: (params.type || 'edition_finalized') as any,
      editionId: params.metadata?.editionId || 'system',
      title: params.title,
      message: params.body || params.message || params.title,
      read: false,
      createdAt: new Date().toISOString(),
    };
    _notificationsStore.unshift(notification);
  }

  public static markAsRead(notificationId: string): void {
    const target = _notificationsStore.find((n) => n.notificationId === notificationId);
    if (target) {
      target.read = true;
    }
  }

  public static clear(): void {
    _notificationsStore.length = 0;
  }
}
