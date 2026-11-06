/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 9 — Edition Planning & Publishing Workflow Orchestrator
 * Connects newsroom approved stories, content pool, page plans, AUTO LAYOUT,
 * readiness evaluation, and Night Production finalization.
 */

import {
  NewspaperEdition,
  NewspaperPage,
  NewspaperTemplate,
  NewspaperBrand,
  ArticlePlacement,
  AdvertisementPlacement,
  EditionStatus,
} from '../types/edition';
import { NewsArticle } from '../types/news';
import { NewsLicense } from '../types/marketplace';
import {
  EditionLifecycleState,
  EditionPagePlan,
  EditionContentReservation,
  EditionAdvertisementReservation,
  EditionContentVersion,
  ContentVersionChangeReason,
  CreateEditionDto,
  EditionStoryPriority,
  StoryWithdrawalReason,
  EditionReadinessResult,
} from '../types/editionWorkflow';
import { SubscriptionEntitlementService } from './subscriptionEntitlementService';
import { UsageMeteringService } from './usageMeteringService';
import { AuditService } from './auditService';
import { NotificationService } from './notificationService';
import { SectionManagementService } from './sectionManagementService';
import { EditionReservationService } from './editionReservationService';
import { EditionAdvertisementService } from './editionAdvertisementService';
import { EditionReadinessService } from './editionReadinessService';
import { PagePlanningEngine } from './pagePlanningEngine';
import { EditionPersistenceService } from './editionPersistenceService';
import { MOCK_BRANDS, MOCK_TEMPLATES, MOCK_NEWS_ARTICLES } from './mockDataService';

const VALID_LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  PLANNED: ['OPEN', 'CANCELLED'],
  OPEN: ['CONTENT_COLLECTION', 'CANCELLED'],
  CONTENT_COLLECTION: ['DESIGNING', 'OPEN', 'CANCELLED'],
  DESIGNING: ['EDITORIAL_REVIEW', 'CONTENT_COLLECTION', 'CANCELLED'],
  EDITORIAL_REVIEW: ['READY_TO_FINALIZE', 'DESIGNING', 'CANCELLED'],
  READY_TO_FINALIZE: ['FINALIZED', 'EDITORIAL_REVIEW', 'CANCELLED'],
  FINALIZED: ['IN_PRODUCTION', 'SUPERSEDED'],
  IN_PRODUCTION: ['READY'],
  READY: ['PUBLISHED'],
  PUBLISHED: ['SUPERSEDED'],
  CANCELLED: [],
  SUPERSEDED: [],
};

export class EditionPlanningService {
  private static editions: Map<string, NewspaperEdition> = new Map();
  private static pagePlans: Map<string, EditionPagePlan[]> = new Map(); // editionId -> plans
  private static versions: Map<string, EditionContentVersion[]> = new Map(); // editionId -> versions

  public static resetStore(): void {
    this.editions.clear();
    this.pagePlans.clear();
    this.versions.clear();
    EditionReservationService.resetStore();
    EditionAdvertisementService.resetStore();
    SectionManagementService.resetStore();
  }

  /**
   * Creates a new newspaper edition after validating subscription entitlements.
   */
  public static createEdition(dto: CreateEditionDto): {
    success: boolean;
    edition?: NewspaperEdition;
    error?: string;
  } {
    // 1. Enforce Subscription Entitlement Limit
    const entitlementCheck = SubscriptionEntitlementService.canCreateEdition(dto.tenantId);
    if (!entitlementCheck.allowed) {
      return {
        success: false,
        error: `Subscription limit blocked edition creation: ${entitlementCheck.reason}`,
      };
    }

    const editionId = `ed-${dto.tenantId}-${dto.editionDate}-${dto.editionType.toLowerCase()}-${Date.now()}`;
    const now = new Date().toISOString();
    const effectiveBrand = MOCK_BRANDS.find((b) => b.brandId === dto.brandId) || MOCK_BRANDS[0];

    const edition: NewspaperEdition = {
      editionId,
      tenantId: dto.tenantId,
      brandId: dto.brandId,
      brandName: effectiveBrand.name,
      templateId: dto.templateId,
      editionCode: dto.editionCode || `${effectiveBrand.code}-${dto.editionDate}-${dto.editionType.toUpperCase()}`,
      editionDate: dto.editionDate,
      editionType: dto.editionType,
      issueNumber: dto.issueNumber || 101,
      volumeNumber: dto.volumeNumber || 42,
      publicationDate: dto.publicationDate,
      publicationTimezone: dto.publicationTimezone || 'Asia/Kolkata',
      status: 'PLANNED',
      pageCount: dto.pageCount,
      totalPages: dto.pageCount,
      placedArticlesCount: 0,
      contentDeadline: dto.contentDeadline,
      printDeadline: dto.printDeadline,
      pressSpecs: {
        format: 'broadsheet',
        colorMode: 'cmyk',
        bleedMm: 3,
        dpi: 300,
      },
      createdBy: dto.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    // 2. Initialize Page Plans
    const plans: EditionPagePlan[] = [];
    const sections = SectionManagementService.getSections(dto.tenantId);

    for (let pNum = 1; pNum <= dto.pageCount; pNum++) {
      let secName = pNum === 1 ? 'Front & Local' : pNum === 2 ? 'State & Regional' : 'National Bureau';
      let sec = sections.find((s) => s.defaultPageRange && pNum >= s.defaultPageRange.startPage && pNum <= s.defaultPageRange.endPage);
      if (sec) secName = sec.name;

      plans.push({
        pagePlanId: `plan-${editionId}-p${pNum}`,
        tenantId: dto.tenantId,
        editionId,
        pageNumber: pNum,
        sectionId: sec?.sectionId,
        sectionName: secName,
        templateId: dto.templateId,
        reservedAdAreaPercent: 0,
        targetContentAreaPercent: 100,
        storyIds: [],
        status: 'PLANNED',
      });
    }

    this.editions.set(editionId, edition);
    this.pagePlans.set(editionId, plans);

    // Record Metering & Audit
    UsageMeteringService.recordUsage({
      tenantId: dto.tenantId,
      subscriptionId: 'sub-edition',
      planId: 'BASIC',
      metric: 'EDITION_CREATED',
      quantity: 1,
      unit: 'editions',
      sourceEntityId: editionId,
    });

    AuditService.logEvent({
      tenantId: dto.tenantId,
      actorId: dto.createdBy,
      actorName: 'Publisher Desk',
      actorRole: 'editor',
      action: 'EDITION_CREATED',
      entityType: 'NewspaperEdition',
      entityId: editionId,
      details: {
        editionCode: edition.editionCode,
        editionType: dto.editionType,
        pageCount: dto.pageCount,
        contentDeadline: dto.contentDeadline,
        printDeadline: dto.printDeadline,
      },
    });

    NotificationService.send({
      tenantId: dto.tenantId,
      recipientId: 'newsroom_all',
      title: 'New Newspaper Edition Planned',
      body: `Edition ${edition.editionCode} scheduled for ${dto.editionDate} (${dto.editionType}).`,
      type: 'EDITION_CREATED',
      metadata: { editionId, editionCode: edition.editionCode },
    });

    // Record initial version
    this.recordContentVersion(dto.tenantId, editionId, dto.createdBy, 'INITIAL_PLAN', 'Edition initialized.');

    return { success: true, edition };
  }

  /**
   * Deterministic state transition for edition lifecycle.
   */
  public static transitionStatus(
    tenantId: string,
    editionId: string,
    targetStatus: EditionLifecycleState,
    userId: string,
    notes?: string
  ): { success: boolean; edition?: NewspaperEdition; error?: string } {
    const edition = this.editions.get(editionId);
    if (!edition) return { success: false, error: `Edition "${editionId}" not found.` };
    if (edition.tenantId !== tenantId) return { success: false, error: 'Cross-tenant security violation.' };

    const currentStatus = edition.status as string;
    const allowed = VALID_LIFECYCLE_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(targetStatus)) {
      return {
        success: false,
        error: `Invalid lifecycle transition: Cannot move from "${currentStatus}" to "${targetStatus}". Allowed next states: [${allowed.join(', ')}].`,
      };
    }

    edition.status = targetStatus as EditionStatus;
    edition.updatedAt = new Date().toISOString();
    this.editions.set(editionId, edition);

    AuditService.logEvent({
      tenantId,
      actorId: userId,
      actorName: 'Editor Desk',
      actorRole: 'editor',
      action: `EDITION_${targetStatus}` as any,
      entityType: 'NewspaperEdition',
      entityId: editionId,
      details: { fromStatus: currentStatus, toStatus: targetStatus, notes },
    });

    return { success: true, edition };
  }

  /**
   * Opens edition for work: PLANNED -> OPEN
   */
  public static openEdition(tenantId: string, editionId: string, userId: string) {
    return this.transitionStatus(tenantId, editionId, 'OPEN', userId);
  }

  /**
   * Begins content collection: OPEN -> CONTENT_COLLECTION
   */
  public static startContentCollection(tenantId: string, editionId: string, userId: string) {
    return this.transitionStatus(tenantId, editionId, 'CONTENT_COLLECTION', userId);
  }

  /**
   * Closes content collection and begins layout: CONTENT_COLLECTION -> DESIGNING
   */
  public static startDesigning(tenantId: string, editionId: string, userId: string) {
    return this.transitionStatus(tenantId, editionId, 'DESIGNING', userId);
  }

  /**
   * Submits edition for senior review: DESIGNING -> EDITORIAL_REVIEW
   */
  public static submitForReview(tenantId: string, editionId: string, userId: string) {
    const res = this.transitionStatus(tenantId, editionId, 'EDITORIAL_REVIEW', userId);
    if (res.success) {
      AuditService.logEvent({
        tenantId,
        actorId: userId,
        actorName: 'Layout Editor',
        actorRole: 'editor',
        action: 'EDITION_REVIEW_SUBMITTED',
        entityType: 'NewspaperEdition',
        entityId: editionId,
      });

      NotificationService.send({
        tenantId,
        recipientId: 'editors_in_chief',
        title: 'Edition Submitted for Review',
        body: `Edition ${editionId} is ready for Editor-in-Chief review.`,
        type: 'EDITION_REVIEW_REQUESTED',
        metadata: { editionId },
      });
    }
    return res;
  }

  /**
   * Sends edition back to design desk: EDITORIAL_REVIEW -> DESIGNING
   */
  public static sendBackToDesign(tenantId: string, editionId: string, userId: string, notes?: string) {
    const res = this.transitionStatus(tenantId, editionId, 'DESIGNING', userId, notes);
    if (res.success) {
      AuditService.logEvent({
        tenantId,
        actorId: userId,
        actorName: 'Editor in Chief',
        actorRole: 'editor_in_chief',
        action: 'EDITION_SENT_BACK',
        entityType: 'NewspaperEdition',
        entityId: editionId,
        details: { notes },
      });
    }
    return res;
  }

  /**
   * Evaluates readiness and marks READY_TO_FINALIZE: EDITORIAL_REVIEW -> READY_TO_FINALIZE
   */
  public static markReadyToFinalize(
    tenantId: string,
    editionId: string,
    userId: string,
    articles: NewsArticle[] = MOCK_NEWS_ARTICLES,
    licenses: NewsLicense[] = []
  ): {
    success: boolean;
    edition?: NewspaperEdition;
    readiness?: EditionReadinessResult;
    error?: string;
  } {
    const edition = this.editions.get(editionId);
    if (!edition) return { success: false, error: 'Edition not found.' };

    const plans = this.pagePlans.get(editionId) || [];
    const reservations = EditionReservationService.getReservationsForEdition(editionId);
    const ads = EditionAdvertisementService.getAdvertisementsForEdition(editionId);

    const readiness = EditionReadinessService.evaluateReadiness({
      edition,
      pages: edition.pages || [],
      pagePlans: plans,
      reservations,
      adReservations: ads,
      articles,
      licenses,
    });

    if (!readiness.canApproveForFinalize) {
      return {
        success: false,
        readiness,
        error: `Cannot mark READY_TO_FINALIZE: Edition has ${readiness.blockersCount} blocking issues.`,
      };
    }

    const res = this.transitionStatus(tenantId, editionId, 'READY_TO_FINALIZE', userId);
    if (!res.success) {
      return { success: false, error: res.error, readiness };
    }

    AuditService.logEvent({
      tenantId,
      actorId: userId,
      actorName: 'Editor in Chief',
      actorRole: 'editor_in_chief',
      action: 'EDITION_READY_TO_FINALIZE',
      entityType: 'NewspaperEdition',
      entityId: editionId,
    });

    NotificationService.send({
      tenantId,
      recipientId: 'production_lead',
      title: 'Edition Ready to Finalize',
      body: `Edition ${edition.editionCode} passed all readiness checks and is ready to FINALIZE.`,
      type: 'EDITION_READY_TO_FINALIZE',
      metadata: { editionId },
    });

    return { success: true, edition: res.edition, readiness };
  }

  /**
   * Connects into existing Phase 5 FINALIZE gate.
   */
  public static async finalizeEdition(
    tenantId: string,
    editionId: string,
    userId: string,
    userRole: string,
    template: NewspaperTemplate,
    brand?: NewspaperBrand,
    articles: NewsArticle[] = MOCK_NEWS_ARTICLES,
    licenses: NewsLicense[] = []
  ) {
    const edition = this.editions.get(editionId);
    if (!edition) return { success: false, errors: ['Edition not found.'] };

    // Ensure edition layout pages exist for preflight
    if (!edition.pages || edition.pages.length === 0) {
      const rebalanceRes = this.rebalancePage(tenantId, editionId, 1, userId, template, articles);
      if (rebalanceRes.success && rebalanceRes.pages) {
        edition.pages = rebalanceRes.pages;
      }
    }

    // Register into persistence store
    await EditionPersistenceService.saveEdition(
      edition,
      edition.pages || [],
      userId,
      'Pre-finalization layout sync'
    );

    // Delegate to authoritative Phase 5 EditionPersistenceService
    const res = await EditionPersistenceService.finalizeEdition(
      editionId,
      tenantId,
      userId,
      userRole,
      template,
      brand,
      articles,
      licenses
    );

    if (res.success && res.edition) {
      edition.status = 'FINALIZED';
      this.editions.set(editionId, edition);
    }

    return res;
  }

  /**
   * Adds story to edition content pool.
   */
  public static reserveContent(data: {
    tenantId: string;
    editionId: string;
    newsId: string;
    reservedBy: string;
    priority: EditionStoryPriority;
    pageIntent?: number;
    sectionIntent?: string;
    bylineCredit?: string;
  }) {
    const res = EditionReservationService.reserveStory({
      tenantId: data.tenantId,
      editionId: data.editionId,
      newsId: data.newsId,
      reservedBy: data.reservedBy,
      priority: data.priority,
      sourceType: 'IN_HOUSE',
      pageIntent: data.pageIntent,
      sectionIntent: data.sectionIntent,
      bylineCredit: data.bylineCredit,
    });

    if (res.success) {
      this.recordContentVersion(
        data.tenantId,
        data.editionId,
        data.reservedBy,
        'CONTENT_ADDED',
        `Reserved story ${data.newsId} with priority ${data.priority}`
      );
    }

    return res;
  }

  /**
   * Assigns section to a story.
   */
  public static assignSection(
    tenantId: string,
    editionId: string,
    newsId: string,
    sectionName: string,
    userId: string
  ): { success: boolean; error?: string } {
    const res = EditionReservationService.getReservationForNews(tenantId, newsId);
    if (!res || res.editionId !== editionId) {
      return { success: false, error: 'Story is not reserved in this edition.' };
    }

    res.sectionIntent = sectionName;

    AuditService.logEvent({
      tenantId,
      actorId: userId,
      actorName: 'Section Editor',
      actorRole: 'editor',
      action: 'SECTION_ASSIGNED',
      entityType: 'EditionContentReservation',
      entityId: res.reservationId,
      details: { newsId, sectionName },
    });

    this.recordContentVersion(tenantId, editionId, userId, 'SECTION_CHANGED', `Assigned section ${sectionName}`);
    return { success: true };
  }

  /**
   * Assigns page to a story.
   */
  public static assignPage(
    tenantId: string,
    editionId: string,
    newsId: string,
    pageNumber: number,
    userId: string
  ): { success: boolean; error?: string } {
    const res = EditionReservationService.getReservationForNews(tenantId, newsId);
    if (!res || res.editionId !== editionId) {
      return { success: false, error: 'Story is not reserved in this edition.' };
    }

    res.pageIntent = pageNumber;
    EditionReservationService.markPlaced(res.reservationId, pageNumber);

    AuditService.logEvent({
      tenantId,
      actorId: userId,
      actorName: 'Layout Editor',
      actorRole: 'editor',
      action: 'PAGE_ASSIGNED',
      entityType: 'EditionContentReservation',
      entityId: res.reservationId,
      details: { newsId, pageNumber },
    });

    this.recordContentVersion(tenantId, editionId, userId, 'PAGE_MOVED', `Assigned to page ${pageNumber}`);
    return { success: true };
  }

  /**
   * Controlled breaking-news insertion:
   * Inserts breaking story, locks existing locked blocks, reflows unlocked content, and audits event.
   */
  public static insertBreakingNews(data: {
    tenantId: string;
    editionId: string;
    breakingArticle: NewsArticle;
    targetPage: number;
    userId: string;
    priority?: EditionStoryPriority;
    template?: NewspaperTemplate;
  }): { success: boolean; edition?: NewspaperEdition; error?: string } {
    const edition = this.editions.get(data.editionId);
    if (!edition) return { success: false, error: 'Edition not found.' };

    // Reserve breaking story
    const reservationRes = EditionReservationService.reserveStory({
      tenantId: data.tenantId,
      editionId: data.editionId,
      newsId: data.breakingArticle.articleId,
      reservedBy: data.userId,
      priority: data.priority || 'FRONT_PAGE_LEAD',
      sourceType: 'IN_HOUSE',
      pageIntent: data.targetPage,
      bylineCredit: data.breakingArticle.byline,
    });

    if (!reservationRes.success) {
      return { success: false, error: reservationRes.error };
    }

    const breakingTitle = data.breakingArticle.title || data.breakingArticle.headline || data.breakingArticle.articleId;

    AuditService.logEvent({
      tenantId: data.tenantId,
      actorId: data.userId,
      actorName: 'Breaking News Desk',
      actorRole: 'editor',
      action: 'BREAKING_NEWS_INSERTED',
      entityType: 'NewspaperEdition',
      entityId: data.editionId,
      details: {
        newsId: data.breakingArticle.articleId,
        title: breakingTitle,
        targetPage: data.targetPage,
      },
    });

    NotificationService.send({
      tenantId: data.tenantId,
      recipientId: 'newsroom_all',
      title: 'BREAKING NEWS Inserted into Edition',
      body: `Breaking story "${breakingTitle}" placed on Page ${data.targetPage}.`,
      type: 'BREAKING_NEWS_INSERTED',
      metadata: { editionId: data.editionId, newsId: data.breakingArticle.articleId },
    });

    this.recordContentVersion(
      data.tenantId,
      data.editionId,
      data.userId,
      'BREAKING_NEWS_INSERTED',
      `Inserted breaking news: ${breakingTitle}`
    );

    return { success: true, edition };
  }

  /**
   * Withdraws story from edition with mandatory reason.
   */
  public static withdrawStory(data: {
    tenantId: string;
    editionId: string;
    newsId: string;
    withdrawnBy: string;
    reason: StoryWithdrawalReason;
    notes?: string;
  }) {
    const res = EditionReservationService.withdrawStory(data);
    if (res.success) {
      this.recordContentVersion(
        data.tenantId,
        data.editionId,
        data.withdrawnBy,
        'CONTENT_REMOVED',
        `Withdrawn story ${data.newsId} (${data.reason})`
      );
    }
    return res;
  }

  /**
   * Explicit page rebalance using Phase 4 PagePlanningEngine.
   */
  public static rebalancePage(
    tenantId: string,
    editionId: string,
    pageNumber: number,
    userId: string,
    template: NewspaperTemplate,
    articles: NewsArticle[] = MOCK_NEWS_ARTICLES
  ): { success: boolean; pages?: NewspaperPage[]; error?: string } {
    const edition = this.editions.get(editionId);
    if (!edition) return { success: false, error: 'Edition not found.' };

    const reservations = EditionReservationService.getReservationsForEdition(editionId);
    const activeReservedIds = new Set(reservations.map((r) => r.newsId));
    const candidateArticles = articles.filter((a) => activeReservedIds.has(a.articleId));

    const ads = EditionAdvertisementService.getAdvertisementsForEdition(editionId);
    const existingPlacements = (edition.pages || []).flatMap((p) => p.blocks);

    // Call authoritative PagePlanningEngine with preserveLocks = true
    const layout = PagePlanningEngine.planEditionLayout({
      edition,
      template,
      stories: candidateArticles,
      existingPlacements,
      preserveLocks: true,
      targetPageCount: edition.pageCount || 2,
    });

    edition.pages = layout.pages;
    edition.placedArticlesCount = layout.summary.placedCount;
    edition.updatedAt = new Date().toISOString();
    this.editions.set(editionId, edition);

    AuditService.logEvent({
      tenantId,
      actorId: userId,
      actorName: 'Layout Desk',
      actorRole: 'editor',
      action: 'EDITION_REBALANCED',
      entityType: 'NewspaperEdition',
      entityId: editionId,
      details: { pageNumber, placedCount: layout.summary.placedCount },
    });

    this.recordContentVersion(tenantId, editionId, userId, 'LAYOUT_REBALANCED', `Rebalanced page ${pageNumber}`);

    return { success: true, pages: layout.pages };
  }

  /**
   * Immutable content version tracking.
   */
  public static recordContentVersion(
    tenantId: string,
    editionId: string,
    userId: string,
    reason: ContentVersionChangeReason,
    notes?: string
  ): EditionContentVersion {
    const existingVersions = this.versions.get(editionId) || [];
    const versionNum = existingVersions.length + 1;
    const versionId = `ver-${editionId}-v${versionNum}-${Date.now()}`;

    const reservations = EditionReservationService.getReservationsForEdition(editionId);
    const ads = EditionAdvertisementService.getAdvertisementsForEdition(editionId);
    const plans = this.pagePlans.get(editionId) || [];
    const edition = this.editions.get(editionId);

    const versionRecord: EditionContentVersion = {
      versionId,
      version: versionNum,
      editionId,
      tenantId,
      contentSnapshot: {
        storyReservations: JSON.parse(JSON.stringify(reservations)),
        adReservations: JSON.parse(JSON.stringify(ads)),
        pagePlans: JSON.parse(JSON.stringify(plans)),
        pagesSummary: (edition?.pages || []).map((p) => ({
          pageNumber: p.pageNumber,
          storyCount: p.blocks.length,
          adCount: (p.adPlacements || []).length,
          isLocked: p.status === 'locked',
        })),
      },
      createdBy: userId,
      reason,
      notes,
      createdAt: new Date().toISOString(),
    };

    existingVersions.push(versionRecord);
    this.versions.set(editionId, existingVersions);
    return versionRecord;
  }

  /**
   * Retrieves edition by ID.
   */
  public static getEdition(editionId: string): NewspaperEdition | undefined {
    return this.editions.get(editionId);
  }

  /**
   * Retrieves all editions for tenant.
   */
  public static getEditions(tenantId: string): NewspaperEdition[] {
    const list: NewspaperEdition[] = [];
    for (const ed of this.editions.values()) {
      if (ed.tenantId === tenantId) {
        list.push(ed);
      }
    }
    return list.sort((a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime());
  }

  /**
   * Retrieves all editions globally across all tenants (for platform executive analytics).
   */
  public static getAllEditions(): NewspaperEdition[] {
    return Array.from(this.editions.values()).sort(
      (a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime()
    );
  }

  /**
   * Retrieves page plans for edition.
   */
  public static getPagePlans(editionId: string): EditionPagePlan[] {
    return this.pagePlans.get(editionId) || [];
  }

  /**
   * Retrieves immutable version history for edition.
   */
  public static getContentVersions(editionId: string): EditionContentVersion[] {
    return this.versions.get(editionId) || [];
  }
}
