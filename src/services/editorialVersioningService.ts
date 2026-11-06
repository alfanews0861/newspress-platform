/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Editorial Versioning Service
 * Phase 6 — Content Version History & Editorial State Separation
 * 
 * Invariants:
 * 1. Never overwrites the reporter's original submission (Version 1 is immutable).
 * 2. Clearly distinguishes between:
 *    - REPORTER_SUBMISSION
 *    - HUMAN_EDIT
 *    - AI_SUGGESTION
 *    - AI_ACCEPTED
 *    - MARKETPLACE_SOURCE
 * 3. Every editorial decision links back to its parent version and review metadata.
 */

import {
  EditorialContentVersion,
  EditorialSourceType,
  AISuggestion,
} from '../types/editorialAi';
import { NewsArticle } from '../types/news';
import { AuditService } from './auditService';

export class EditorialVersioningService {
  private static versionStore: Map<string, EditorialContentVersion[]> = new Map();
  private static suggestionsStore: Map<string, AISuggestion[]> = new Map();

  public static resetStore(): void {
    this.versionStore.clear();
    this.suggestionsStore.clear();
  }

  /**
   * Seed or get initial version (v1) from news article submission
   */
  public static getOrCreateInitialVersion(article: NewsArticle): EditorialContentVersion {
    const history = this.versionStore.get(article.articleId) || [];
    if (history.length > 0) {
      return history[0];
    }

    const v1: EditorialContentVersion = {
      versionId: `ver-${article.articleId}-v1`,
      newsId: article.articleId,
      tenantId: article.tenantId,
      versionNumber: 1,
      headline: article.headline,
      subheadline: article.subheadline,
      leadParagraph: article.leadParagraph,
      bodyContent: article.bodyContent,
      summary: article.summary,
      category: article.category,
      sourceType: article.authorType === 'syndicated' ? 'MARKETPLACE_SOURCE' : 'REPORTER_SUBMISSION',
      createdBy: article.authorId,
      createdAt: article.createdAt || new Date().toISOString(),
      changeSummary: 'Original reporter submission',
    };

    history.push(v1);
    this.versionStore.set(article.articleId, history);
    return v1;
  }

  /**
   * Get all editorial versions for an article
   */
  public static getVersions(newsId: string): EditorialContentVersion[] {
    return this.versionStore.get(newsId) || [];
  }

  /**
   * Get latest editorial version
   */
  public static getLatestVersion(newsId: string, fallbackArticle?: NewsArticle): EditorialContentVersion {
    const history = this.versionStore.get(newsId) || [];
    if (history.length > 0) {
      return history[history.length - 1];
    }
    if (fallbackArticle) {
      return this.getOrCreateInitialVersion(fallbackArticle);
    }
    throw new Error(`No editorial versions found for article ${newsId}`);
  }

  /**
   * Human Editor saves manual revision
   */
  public static createHumanEditVersion(params: {
    newsId: string;
    tenantId: string;
    editorId: string;
    editorName: string;
    editorRole: string;
    headline: string;
    subheadline?: string;
    leadParagraph: string;
    bodyContent: string;
    summary?: string;
    category?: string;
    changeSummary: string;
  }): EditorialContentVersion {
    const history = this.versionStore.get(params.newsId) || [];
    const parentVersion = history.length > 0 ? history[history.length - 1] : undefined;
    const nextNumber = history.length + 1;

    const newVersion: EditorialContentVersion = {
      versionId: `ver-${params.newsId}-v${nextNumber}`,
      newsId: params.newsId,
      tenantId: params.tenantId,
      versionNumber: nextNumber,
      headline: params.headline,
      subheadline: params.subheadline,
      leadParagraph: params.leadParagraph,
      bodyContent: params.bodyContent,
      summary: params.summary,
      category: params.category || parentVersion?.category || 'General',
      sourceType: 'HUMAN_EDIT',
      createdBy: params.editorId,
      createdAt: new Date().toISOString(),
      parentVersionId: parentVersion?.versionId,
      changeSummary: params.changeSummary,
    };

    history.push(newVersion);
    this.versionStore.set(params.newsId, history);

    AuditService.logEvent({
      tenantId: params.tenantId,
      actorId: params.editorId,
      actorName: params.editorName,
      actorRole: params.editorRole,
      action: 'AI_EDITED',
      entityType: 'EditorialContentVersion',
      entityId: newVersion.versionId,
      previousState: parentVersion ? { versionNumber: parentVersion.versionNumber } : null,
      newState: { versionNumber: newVersion.versionNumber, changeSummary: params.changeSummary },
      reason: params.changeSummary,
    });

    return newVersion;
  }

  /**
   * Save an AI Suggestion
   */
  public static saveSuggestion(suggestion: AISuggestion): AISuggestion {
    const list = this.suggestionsStore.get(suggestion.sourceNewsId) || [];
    list.push(suggestion);
    this.suggestionsStore.set(suggestion.sourceNewsId, list);
    return suggestion;
  }

  /**
   * Get suggestions for an article
   */
  public static getSuggestions(newsId: string): AISuggestion[] {
    return this.suggestionsStore.get(newsId) || [];
  }

  /**
   * Editor Accepts an AI Suggestion (creates new AI_ACCEPTED version)
   */
  public static acceptAISuggestion(params: {
    newsId: string;
    tenantId: string;
    suggestionId: string;
    editorId: string;
    editorName: string;
    editorRole: string;
    appliedHeadline?: string;
    appliedSubheadline?: string;
    appliedLeadParagraph?: string;
    appliedBodyContent?: string;
    appliedSummary?: string;
    changeSummary: string;
  }): { version: EditorialContentVersion; suggestion: AISuggestion } {
    const suggestions = this.suggestionsStore.get(params.newsId) || [];
    const suggestion = suggestions.find((s) => s.suggestionId === params.suggestionId);

    if (!suggestion) {
      throw new Error(`AI Suggestion ${params.suggestionId} not found`);
    }

    const history = this.versionStore.get(params.newsId) || [];
    const parentVersion = history[history.length - 1];
    const nextNumber = history.length + 1;

    // Update suggestion status
    suggestion.editorStatus = 'ACCEPTED';
    suggestion.reviewedBy = params.editorId;
    suggestion.reviewedAt = new Date().toISOString();
    suggestion.updatedAt = new Date().toISOString();

    const newVersion: EditorialContentVersion = {
      versionId: `ver-${params.newsId}-v${nextNumber}`,
      newsId: params.newsId,
      tenantId: params.tenantId,
      versionNumber: nextNumber,
      headline: params.appliedHeadline ?? parentVersion?.headline ?? '',
      subheadline: params.appliedSubheadline ?? parentVersion?.subheadline,
      leadParagraph: params.appliedLeadParagraph ?? parentVersion?.leadParagraph ?? '',
      bodyContent: params.appliedBodyContent ?? parentVersion?.bodyContent ?? '',
      summary: params.appliedSummary ?? parentVersion?.summary,
      category: parentVersion?.category || 'General',
      sourceType: 'AI_ACCEPTED',
      createdBy: params.editorId,
      createdAt: new Date().toISOString(),
      parentVersionId: parentVersion?.versionId,
      acceptedBy: params.editorId,
      acceptedAt: new Date().toISOString(),
      changeSummary: params.changeSummary || `Accepted AI ${suggestion.outputType}`,
      suggestionId: suggestion.suggestionId,
    };

    history.push(newVersion);
    this.versionStore.set(params.newsId, history);

    AuditService.logEvent({
      tenantId: params.tenantId,
      actorId: params.editorId,
      actorName: params.editorName,
      actorRole: params.editorRole,
      action: 'AI_ACCEPTED',
      entityType: 'EditorialContentVersion',
      entityId: newVersion.versionId,
      metadata: { suggestionId: suggestion.suggestionId, outputType: suggestion.outputType },
      reason: `Editor accepted AI suggestion (${suggestion.outputType})`,
    });

    return { version: newVersion, suggestion };
  }

  /**
   * Editor Rejects an AI Suggestion
   */
  public static rejectAISuggestion(params: {
    newsId: string;
    tenantId: string;
    suggestionId: string;
    editorId: string;
    editorName: string;
    editorRole: string;
    reason?: string;
  }): AISuggestion {
    const suggestions = this.suggestionsStore.get(params.newsId) || [];
    const suggestion = suggestions.find((s) => s.suggestionId === params.suggestionId);
    if (!suggestion) {
      throw new Error(`AI Suggestion ${params.suggestionId} not found`);
    }

    suggestion.editorStatus = 'REJECTED';
    suggestion.reviewedBy = params.editorId;
    suggestion.reviewedAt = new Date().toISOString();
    suggestion.updatedAt = new Date().toISOString();

    AuditService.logEvent({
      tenantId: params.tenantId,
      actorId: params.editorId,
      actorName: params.editorName,
      actorRole: params.editorRole,
      action: 'AI_REJECTED',
      entityType: 'AISuggestion',
      entityId: suggestion.suggestionId,
      reason: params.reason || 'Editor rejected AI suggestion',
    });

    return suggestion;
  }

  /**
   * Editor Manually Modifies and Saves an AI Suggestion
   */
  public static modifyAndAcceptAISuggestion(params: {
    newsId: string;
    tenantId: string;
    suggestionId: string;
    editorId: string;
    editorName: string;
    editorRole: string;
    modifiedHeadline?: string;
    modifiedSubheadline?: string;
    modifiedLeadParagraph?: string;
    modifiedBodyContent?: string;
    modifiedSummary?: string;
    changeSummary: string;
  }): { version: EditorialContentVersion; suggestion: AISuggestion } {
    const suggestions = this.suggestionsStore.get(params.newsId) || [];
    const suggestion = suggestions.find((s) => s.suggestionId === params.suggestionId);
    if (!suggestion) {
      throw new Error(`AI Suggestion ${params.suggestionId} not found`);
    }

    const history = this.versionStore.get(params.newsId) || [];
    const parentVersion = history[history.length - 1];
    const nextNumber = history.length + 1;

    suggestion.editorStatus = 'MODIFIED';
    suggestion.reviewedBy = params.editorId;
    suggestion.reviewedAt = new Date().toISOString();
    suggestion.modifiedContent = {
      headline: params.modifiedHeadline,
      leadParagraph: params.modifiedLeadParagraph,
      bodyContent: params.modifiedBodyContent,
    };
    suggestion.updatedAt = new Date().toISOString();

    const newVersion: EditorialContentVersion = {
      versionId: `ver-${params.newsId}-v${nextNumber}`,
      newsId: params.newsId,
      tenantId: params.tenantId,
      versionNumber: nextNumber,
      headline: params.modifiedHeadline ?? parentVersion?.headline ?? '',
      subheadline: params.modifiedSubheadline ?? parentVersion?.subheadline,
      leadParagraph: params.modifiedLeadParagraph ?? parentVersion?.leadParagraph ?? '',
      bodyContent: params.modifiedBodyContent ?? parentVersion?.bodyContent ?? '',
      summary: params.modifiedSummary ?? parentVersion?.summary,
      category: parentVersion?.category || 'General',
      sourceType: 'AI_ACCEPTED',
      createdBy: params.editorId,
      createdAt: new Date().toISOString(),
      parentVersionId: parentVersion?.versionId,
      acceptedBy: params.editorId,
      acceptedAt: new Date().toISOString(),
      changeSummary: params.changeSummary || 'Editor modified and accepted AI suggestion',
      suggestionId: suggestion.suggestionId,
    };

    history.push(newVersion);
    this.versionStore.set(params.newsId, history);

    AuditService.logEvent({
      tenantId: params.tenantId,
      actorId: params.editorId,
      actorName: params.editorName,
      actorRole: params.editorRole,
      action: 'AI_EDITED',
      entityType: 'EditorialContentVersion',
      entityId: newVersion.versionId,
      metadata: { suggestionId: suggestion.suggestionId },
      reason: 'Editor modified AI suggestion before accepting into publication',
    });

    return { version: newVersion, suggestion };
  }
}
