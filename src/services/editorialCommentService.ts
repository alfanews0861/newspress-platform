/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 8 — Editorial Comments & Revision Request Service
 * Version-preserving editorial feedback and reporter resubmission workflow.
 */

import { EditorialComment, EditorialCommentType } from '../types/newsroom';
import { newsSubmissionService } from './newsSubmissionService';
import { NotificationProviderService } from './notificationProviderService';
import { auditService } from './auditService';
import { NewsroomStaffService } from './newsroomStaffService';

const commentStore: Map<string, EditorialComment> = new Map();

export class EditorialCommentService {
  public static resetStore(): void {
    commentStore.clear();
  }

  /**
   * Adds an editorial comment or correction request to a story dispatch.
   */
  public static async createComment(input: {
    tenantId: string;
    newsId: string;
    assignmentId?: string;
    authorUserId: string;
    authorName: string;
    targetReporterId: string;
    commentType: EditorialCommentType;
    text: string;
    anchor?: string;
  }): Promise<EditorialComment> {
    const commentId = `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const comment: EditorialComment = {
      commentId,
      tenantId: input.tenantId,
      newsId: input.newsId,
      assignmentId: input.assignmentId,
      authorUserId: input.authorUserId,
      authorName: input.authorName,
      targetReporterId: input.targetReporterId,
      commentType: input.commentType,
      text: input.text,
      anchor: input.anchor,
      status: 'OPEN',
      createdAt: now,
    };

    commentStore.set(commentId, comment);

    // Notify Reporter
    const reporter = NewsroomStaffService.getReporterProfile(input.targetReporterId);
    if (reporter) {
      await NotificationProviderService.dispatchNotification({
        tenantId: input.tenantId,
        userId: reporter.userId,
        type: 'EDITOR_COMMENT_ADDED',
        title: `Editorial Note: ${input.commentType.replace(/_/g, ' ')}`,
        message: input.text,
        metadata: { newsId: input.newsId, commentId },
      });
    }

    await auditService.log({
      tenantId: input.tenantId,
      actorId: input.authorUserId,
      actorName: input.authorName,
      actorRole: 'editor',
      action: 'EDITORIAL_COMMENT_CREATED',
      entityType: 'EditorialComment',
      entityId: commentId,
      newState: comment,
    });

    return comment;
  }

  /**
   * Editor requests a formal revision from reporter.
   */
  public static async requestRevision(input: {
    tenantId: string;
    newsId: string;
    editorUserId: string;
    editorName: string;
    targetReporterId: string;
    revisionNote: string;
  }): Promise<EditorialComment> {
    const comment = await this.createComment({
      tenantId: input.tenantId,
      newsId: input.newsId,
      authorUserId: input.editorUserId,
      authorName: input.editorName,
      targetReporterId: input.targetReporterId,
      commentType: 'GENERAL',
      text: `REVISION REQUESTED: ${input.revisionNote}`,
    });

    // Notify Reporter of Revision Request
    const article = newsSubmissionService.getArticle(input.newsId);
    if (article) {
      article.editorialStatus = 'revision_requested';
    }

    const reporter = NewsroomStaffService.getReporterProfile(input.targetReporterId);
    if (reporter) {
      await NotificationProviderService.dispatchNotification({
        tenantId: input.tenantId,
        userId: reporter.userId,
        type: 'REVISION_REQUESTED',
        title: 'Editorial Revision Requested',
        message: input.revisionNote,
        metadata: { newsId: input.newsId },
      });
    }

    await auditService.log({
      tenantId: input.tenantId,
      actorId: input.editorUserId,
      actorName: input.editorName,
      actorRole: 'editor',
      action: 'REVISION_REQUESTED',
      entityType: 'NewsArticle',
      entityId: input.newsId,
      reason: input.revisionNote,
    });

    return comment;
  }

  /**
   * Resolves an editorial comment.
   */
  public static async resolveComment(
    commentId: string,
    resolvedByUserId: string,
    resolvedByName: string
  ): Promise<EditorialComment> {
    const comment = commentStore.get(commentId);
    if (!comment) throw new Error(`Comment ${commentId} not found.`);

    const now = new Date().toISOString();
    comment.status = 'RESOLVED';
    comment.resolvedAt = now;
    comment.resolvedBy = resolvedByUserId;

    commentStore.set(commentId, comment);

    await auditService.log({
      tenantId: comment.tenantId,
      actorId: resolvedByUserId,
      actorName: resolvedByName,
      actorRole: 'user',
      action: 'STATUS_CHANGE',
      entityType: 'EditorialComment',
      entityId: commentId,
      newState: comment,
    });

    return comment;
  }

  // --- Read Methods ---

  public static getCommentsForArticle(newsId: string): EditorialComment[] {
    return Array.from(commentStore.values()).filter((c) => c.newsId === newsId);
  }

  public static getCommentsForTarget(targetType: string, targetId: string, tenantId?: string): EditorialComment[] {
    return Array.from(commentStore.values()).filter(
      (c) => (c.newsId === targetId || (c as any).targetId === targetId) && (!tenantId || c.tenantId === tenantId)
    );
  }

  public static addComment(input: {
    tenantId: string;
    targetType?: string;
    targetId: string;
    authorUserId: string;
    authorRole?: string;
    content: string;
  }): EditorialComment {
    const commentId = `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const comment: EditorialComment = {
      commentId,
      tenantId: input.tenantId,
      newsId: input.targetId,
      authorUserId: input.authorUserId,
      authorName: input.authorUserId === 'user-news-editor' ? 'Desk Editor' : 'Editor in Chief',
      targetReporterId: 'rep_sofia_chen',
      commentType: 'GENERAL',
      text: input.content,
      status: 'OPEN',
      createdAt: now,
    };

    (comment as any).content = input.content;
    (comment as any).authorRole = input.authorRole || 'EDITOR';
    commentStore.set(commentId, comment);
    return comment;
  }
}
