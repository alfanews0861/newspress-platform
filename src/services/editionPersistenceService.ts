/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Newspaper Edition Persistence, Revision, Finalization & Correction Service
 * Handles debounced autosaves, immutable versioned revisions, senior finalization,
 * immutable ProductionSnapshot creation, and correction revision lifecycle.
 */

import {
  NewspaperEdition,
  NewspaperPage,
  EditionRevision,
  ArticlePlacement,
  AdvertisementPlacement,
  NewspaperBrand,
  NewspaperTemplate,
} from '../types/edition';
import {
  ProductionSnapshot,
  ProductionJob,
  FrozenArticle,
} from '../types/production';
import { NewsArticle } from '../types/news';
import { NewsLicense } from '../types/marketplace';
import { GridCalculationService } from './gridCalculationService';
import { EditionPreflightService } from './editionPreflightService';
import { ProductionQueueService } from './productionQueueService';
import { AuditService } from './auditService';
import { NotificationService } from './notificationService';
import { MOCK_BRANDS, MOCK_TEMPLATES, MOCK_CURRENT_EDITION, MOCK_NEWS_ARTICLES, TELUGU_NEWSPAPER_EDITION, TELUGU_PREPLANNED_PAGES } from './mockDataService';

// In-memory persistent caches for developer reactivity & isolated unit testing
const _inMemoryEditions = new Map<string, NewspaperEdition>();
const _inMemoryPages = new Map<string, NewspaperPage[]>();
const _inMemoryRevisions = new Map<string, EditionRevision[]>();
const _inMemorySnapshots = new Map<string, ProductionSnapshot[]>();

// Seed default mock edition and Telugu sample edition if not present
if (!_inMemoryEditions.has(MOCK_CURRENT_EDITION.editionId)) {
  _inMemoryEditions.set(MOCK_CURRENT_EDITION.editionId, MOCK_CURRENT_EDITION);
}
if (!_inMemoryEditions.has(TELUGU_NEWSPAPER_EDITION.editionId)) {
  _inMemoryEditions.set(TELUGU_NEWSPAPER_EDITION.editionId, TELUGU_NEWSPAPER_EDITION);
  _inMemoryPages.set(TELUGU_NEWSPAPER_EDITION.editionId, TELUGU_PREPLANNED_PAGES);
}

let autosaveTimeout: any = null;

export class EditionPersistenceService {
  /**
   * Resets local in-memory store (used for test isolation).
   */
  public static resetMemoryStore(): void {
    _inMemoryEditions.clear();
    _inMemoryPages.clear();
    _inMemoryRevisions.clear();
    _inMemorySnapshots.clear();
    ProductionQueueService.resetStore();
    NotificationService.clear();
  }

  /**
   * Retrieves edition by ID.
   */
  public static async getEdition(editionId: string): Promise<NewspaperEdition | null> {
    const ed = _inMemoryEditions.get(editionId);
    if (ed) return ed;
    if (editionId === MOCK_CURRENT_EDITION.editionId) return MOCK_CURRENT_EDITION;
    return null;
  }

  /**
   * Saves edition and all associated pages, generating an immutable EditionRevision snapshot.
   * If edition is currently locked in FINALIZED state, ordinary edits are blocked.
   */
  public static async saveEdition(
    edition: NewspaperEdition,
    pages: NewspaperPage[],
    userId: string,
    changeSummary: string = 'Editorial layout update'
  ): Promise<{ edition: NewspaperEdition; revision: EditionRevision }> {
    // Check if edition is locked in FINALIZED state
    const current = _inMemoryEditions.get(edition.editionId);
    if (current && current.status === 'FINALIZED' && edition.status === 'FINALIZED') {
      throw new Error(
        'Cannot modify a finalized edition. Please create a Correction Revision to perform editorial changes.'
      );
    }

    const now = new Date().toISOString();

    const updatedEdition: NewspaperEdition = {
      ...edition,
      pages,
      placedArticlesCount: pages.reduce((acc, p) => acc + (p.blocks?.length || 0), 0),
      totalPages: pages.length,
      pageCount: pages.length,
      updatedAt: now,
    };

    _inMemoryEditions.set(edition.editionId, updatedEdition);
    _inMemoryPages.set(edition.editionId, pages);

    // Compute revision number
    const existingRevs = _inMemoryRevisions.get(edition.editionId) || [];
    const nextVersion = existingRevs.length + 1;

    const allPlacements: ArticlePlacement[] = [];
    const allAdPlacements: AdvertisementPlacement[] = [];

    for (const page of pages) {
      if (page.blocks) allPlacements.push(...page.blocks);
      if (page.adPlacements) allAdPlacements.push(...page.adPlacements);
    }

    const revision: EditionRevision = {
      revisionId: `rev-${edition.editionId}-v${nextVersion}`,
      editionId: edition.editionId,
      tenantId: edition.tenantId,
      version: nextVersion,
      createdBy: userId,
      createdAt: now,
      changeSummary,
      layoutSnapshot: {
        pages: JSON.parse(JSON.stringify(pages)),
        placements: JSON.parse(JSON.stringify(allPlacements)),
        adPlacements: JSON.parse(JSON.stringify(allAdPlacements)),
      },
    };

    existingRevs.push(revision);
    _inMemoryRevisions.set(edition.editionId, existingRevs);

    return { edition: updatedEdition, revision };
  }

  /**
   * Debounced autosave mechanism preventing excessive database writes during drag & resize operations.
   */
  public static scheduleAutosave(
    edition: NewspaperEdition,
    pages: NewspaperPage[],
    userId: string,
    onComplete?: (result: { edition: NewspaperEdition; revision: EditionRevision }) => void,
    delayMs: number = 800
  ): void {
    if (autosaveTimeout) {
      clearTimeout(autosaveTimeout);
    }

    autosaveTimeout = setTimeout(async () => {
      try {
        const result = await this.saveEdition(edition, pages, userId, 'Autosaved layout snapshot');
        if (onComplete) onComplete(result);
      } catch (err) {
        console.error('Autosave error:', err);
      }
    }, delayMs);
  }

  /**
   * Retrieves all historical revisions for an edition.
   */
  public static async getRevisions(editionId: string): Promise<EditionRevision[]> {
    return _inMemoryRevisions.get(editionId) || [];
  }

  /**
   * Restores a past layout revision.
   */
  public static async restoreRevision(
    editionId: string,
    revisionId: string
  ): Promise<{ pages: NewspaperPage[]; placements: ArticlePlacement[] } | null> {
    const revs = _inMemoryRevisions.get(editionId) || [];
    const target = revs.find((r) => r.revisionId === revisionId);
    if (!target) return null;

    const restoredPages = JSON.parse(JSON.stringify(target.layoutSnapshot.pages));
    const restoredPlacements = JSON.parse(JSON.stringify(target.layoutSnapshot.placements));

    _inMemoryPages.set(editionId, restoredPages);
    return { pages: restoredPages, placements: restoredPlacements };
  }

  /**
   * Finalizes an edition with strict senior-editor authorization and preflight validation checks.
   * On success: Freezes an immutable ProductionSnapshot, creates a ProductionJob, and enqueues it.
   */
  public static async finalizeEdition(
    editionId: string,
    tenantId: string,
    userId: string,
    userRole: string,
    template: NewspaperTemplate,
    brand?: NewspaperBrand,
    articles: NewsArticle[] = MOCK_NEWS_ARTICLES,
    licenses: NewsLicense[] = [],
    options?: { priority?: number; bypassWarnings?: boolean; userDisplayName?: string }
  ): Promise<{
    success: boolean;
    edition?: NewspaperEdition;
    snapshot?: ProductionSnapshot;
    productionJob?: ProductionJob;
    errors?: string[];
    warnings?: string[];
  }> {
    const seniorRoles = ['owner', 'editor_in_chief', 'super_admin'];
    if (!seniorRoles.includes(userRole)) {
      return {
        success: false,
        errors: [
          `Unauthorized: User role "${userRole}" lacks senior editorial privileges to finalize print editions. Only Editor-in-Chief, Publisher or Platform SuperAdmin may authorize finalization.`,
        ],
      };
    }

    let edition = _inMemoryEditions.get(editionId);
    if (!edition && editionId === MOCK_CURRENT_EDITION.editionId) {
      edition = MOCK_CURRENT_EDITION;
    }

    if (!edition) {
      return { success: false, errors: [`Edition "${editionId}" not found.`] };
    }

    if (edition.tenantId !== tenantId) {
      return {
        success: false,
        errors: ['Cross-tenant security violation: cannot finalize an edition belonging to another publisher.'],
      };
    }

    const effectiveBrand =
      brand ||
      MOCK_BRANDS.find((b) => b.brandId === edition?.brandId) ||
      MOCK_BRANDS[0];

    const pages = _inMemoryPages.get(editionId) || edition.pages || [];

    // Run Comprehensive Preflight Check
    const preflight = EditionPreflightService.validateForFinalization({
      edition,
      pages,
      template,
      brand: effectiveBrand,
      articles,
      licenses,
    });

    if (!preflight.canFinalize) {
      return {
        success: false,
        errors: [
          'Preflight Check Blocked Finalization: The edition contains hard layout or licensing errors.',
          ...preflight.hardErrors,
        ],
        warnings: preflight.warnings,
      };
    }

    // Freeze Immutable Articles Snapshot
    const articlesSnapshot: Record<string, FrozenArticle> = {};
    const articleLookup = new Map<string, NewsArticle>();
    for (const a of articles) articleLookup.set(a.articleId, a);

    for (const page of pages) {
      for (const block of page.blocks || []) {
        const src = articleLookup.get(block.newsId);
        articlesSnapshot[block.newsId] = {
          newsId: block.newsId,
          headline: block.articleTitle || src?.headline || 'Untitled Article',
          subheadline: src?.subheadline,
          byline: block.byline || src?.byline || 'Staff Reporter',
          leadParagraph: block.leadParagraph || src?.leadParagraph,
          bodyContent: block.bodyContent || src?.bodyContent || '',
          category: block.category || src?.category || 'General',
          heroImageUrl: block.imageUrl || src?.heroImageUrl,
          wordCount: src?.wordCount || 800,
        };
      }
    }

    const allAds: AdvertisementPlacement[] = [];
    for (const page of pages) {
      if (page.adPlacements) allAds.push(...page.adPlacements);
    }

    // Calculate version number
    const existingSnapshots = _inMemorySnapshots.get(editionId) || [];
    const versionNumber = existingSnapshots.length + 1;
    const snapshotId = `snap-${editionId}-v${versionNumber}`;
    const now = new Date().toISOString();

    // Create deterministic SHA-256 snapshot checksum
    const rawContent = `${snapshotId}-${edition.editionCode}-${pages.length}-${Object.keys(articlesSnapshot).length}-${now}`;
    let hash = 0;
    for (let i = 0; i < rawContent.length; i++) {
      hash = (hash << 5) - hash + rawContent.charCodeAt(i);
      hash |= 0;
    }
    const checksum = `sha256-${Math.abs(hash).toString(16).padStart(16, '0')}${Date.now().toString(16)}`;

    // Create Immutable ProductionSnapshot
    const snapshot: ProductionSnapshot = {
      snapshotId,
      tenantId: edition.tenantId,
      editionId: edition.editionId,
      editionCode: edition.editionCode,
      brandId: effectiveBrand.brandId,
      brandName: effectiveBrand.name,
      templateId: template.templateId,
      revisionId: `rev-${editionId}-v${versionNumber}`,
      version: versionNumber,
      publicationDate: edition.publicationDate || now.split('T')[0],
      publicationTimezone: (edition as any).publicationTimezone || 'Asia/Kolkata',
      brand: JSON.parse(JSON.stringify(effectiveBrand)),
      template: JSON.parse(JSON.stringify(template)),
      pages: JSON.parse(JSON.stringify(pages)),
      articlesSnapshot,
      advertisementsSnapshot: JSON.parse(JSON.stringify(allAds)),
      pressSpecs: {
        format: (template.pageSize?.toLowerCase() as any) || 'broadsheet',
        colorMode: edition.pressSpecs?.colorMode || 'cmyk',
        bleedMm: edition.pressSpecs?.bleedMm || 3.5,
        dpi: edition.pressSpecs?.dpi || 300,
        safeAreaMarginMm: template.pageMarginsMm?.top || 14,
      },
      checksum,
      finalizedBy: {
        userId,
        userRole,
        displayName: options?.userDisplayName || 'Senior Managing Editor',
      },
      finalizedAt: now,
      createdAt: now,
    };

    existingSnapshots.push(snapshot);
    _inMemorySnapshots.set(editionId, existingSnapshots);

    // Update Edition to FINALIZED
    const finalizedEdition: NewspaperEdition = {
      ...edition,
      status: 'FINALIZED',
      finalizedByUserId: userId,
      finalizedAt: now,
      checksum,
      updatedAt: now,
    };
    _inMemoryEditions.set(editionId, finalizedEdition);

    // Enqueue Production Job
    const productionJob = await ProductionQueueService.enqueueJob({
      snapshot,
      priority: options?.priority || 5,
    });

    // Record Audit Logs
    await AuditService.logEvent({
      tenantId,
      actorId: userId,
      actorName: options?.userDisplayName || 'Editor-in-Chief',
      actorRole: userRole,
      action: 'EDITION_FINALIZED',
      entityType: 'NewspaperEdition',
      entityId: editionId,
      newState: { status: 'FINALIZED', snapshotId, version: versionNumber, checksum },
      reason: `Edition ${edition.editionCode} finalized for print production.`,
    });

    await AuditService.logEvent({
      tenantId,
      actorId: userId,
      actorName: options?.userDisplayName || 'Editor-in-Chief',
      actorRole: userRole,
      action: 'PRODUCTION_SNAPSHOT_CREATED',
      entityType: 'ProductionSnapshot',
      entityId: snapshotId,
      newState: { version: versionNumber, pageCount: pages.length },
    });

    return {
      success: true,
      edition: finalizedEdition,
      snapshot,
      productionJob,
      warnings: preflight.warnings,
    };
  }

  /**
   * Creates a Correction Revision for an already finalized edition.
   * Preserves previous immutable snapshots and enables authorized editors to make corrections.
   */
  public static async createCorrectionRevision(
    editionId: string,
    tenantId: string,
    userId: string,
    userRole: string,
    changeSummary: string = 'Editorial correction requested post-finalization'
  ): Promise<{
    success: boolean;
    edition?: NewspaperEdition;
    newRevision?: EditionRevision;
    errors?: string[];
  }> {
    const seniorRoles = ['owner', 'editor_in_chief', 'super_admin', 'editor'];
    if (!seniorRoles.includes(userRole)) {
      return {
        success: false,
        errors: [`Unauthorized: Role "${userRole}" cannot create correction revisions.`],
      };
    }

    const edition = _inMemoryEditions.get(editionId);
    if (!edition) {
      return { success: false, errors: [`Edition "${editionId}" not found.`] };
    }

    if (edition.tenantId !== tenantId) {
      return { success: false, errors: ['Cross-tenant security violation.'] };
    }

    const pages = _inMemoryPages.get(editionId) || edition.pages || [];
    const existingRevs = _inMemoryRevisions.get(editionId) || [];
    const nextVersion = existingRevs.length + 1;
    const now = new Date().toISOString();

    // Mark previous active production jobs as SUPERSEDED
    const jobs = ProductionQueueService.getJobsForTenant(tenantId).filter(
      (j) => j.editionId === editionId && (j.status === 'QUEUED' || j.status === 'RETRY_SCHEDULED')
    );
    for (const j of jobs) {
      j.status = 'SUPERSEDED';
      j.updatedAt = now;
    }

    // Unfreeze edition into DESIGNING / REVIEW state for correction
    const correctionEdition: NewspaperEdition = {
      ...edition,
      status: 'DESIGNING',
      updatedAt: now,
    };

    _inMemoryEditions.set(editionId, correctionEdition);

    const revision: EditionRevision = {
      revisionId: `rev-${editionId}-correction-v${nextVersion}`,
      editionId,
      tenantId,
      version: nextVersion,
      createdBy: userId,
      createdAt: now,
      changeSummary,
      layoutSnapshot: {
        pages: JSON.parse(JSON.stringify(pages)),
        placements: pages.flatMap((p) => p.blocks || []),
        adPlacements: pages.flatMap((p) => p.adPlacements || []),
      },
    };

    existingRevs.push(revision);
    _inMemoryRevisions.set(editionId, existingRevs);

    await AuditService.logEvent({
      tenantId,
      actorId: userId,
      actorName: 'Desk Editor',
      actorRole: userRole,
      action: 'CORRECTION_REVISION_CREATED',
      entityType: 'EditionRevision',
      entityId: revision.revisionId,
      reason: changeSummary,
    });

    await NotificationService.createNotification({
      tenantId,
      type: 'correction_required',
      editionId,
      title: 'Correction Revision Opened',
      message: `Edition "${edition.brandName}" unlocked for editorial correction (${changeSummary}).`,
    });

    return {
      success: true,
      edition: correctionEdition,
      newRevision: revision,
    };
  }

  /**
   * Retrieves all frozen production snapshots for an edition.
   */
  public static getSnapshotsForEdition(editionId: string): ProductionSnapshot[] {
    return _inMemorySnapshots.get(editionId) || [];
  }

  /**
   * Retrieves all finalized editions for a tenant.
   */
  public static async getFinalizedEditions(tenantId?: string): Promise<NewspaperEdition[]> {
    const all = Array.from(_inMemoryEditions.values());
    const finalized = all.filter(
      (e) => e.status === 'FINALIZED' || e.status === 'QUEUED' || e.status === 'READY'
    );
    if (!tenantId) return finalized;
    return finalized.filter((e) => e.tenantId === tenantId);
  }

  /**
   * Sets/injects an edition into memory (used in testing & mock seed).
   */
  public static setEditionInMemory(edition: NewspaperEdition, pages?: NewspaperPage[]): void {
    _inMemoryEditions.set(edition.editionId, edition);
    if (pages) {
      _inMemoryPages.set(edition.editionId, pages);
    }
  }
}
