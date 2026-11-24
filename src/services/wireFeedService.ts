/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NewsPress Wire Feed Sources & Live Marketplace Sync Service
 * Manages admin-configured RSS/Atom feeds and news website URLs in Firestore
 * (with local fallback when offline) and streams worker-published wire stories
 * into the Marketplace in real time.
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { isFirebaseConfigured } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';
import { hasLocalStorage, readLocalJson, writeLocalJson } from '../utils/localStore';
import { validateExternalFeedUrl, sanitizeImageUrl } from '../utils/urlSafety';
import {
  WireFeedSource,
  WireScraperRun,
  WireWorkerStatus,
  CreateWireFeedSourceInput,
  WireLanguageCode,
} from '../types/wireFeed';
import { MarketplaceListing } from '../types/marketplace';
import { NewsArticle } from '../types/news';

const SOURCES_STORAGE_KEY = 'newspress_wire_feed_sources_v1';
const RUNS_STORAGE_KEY = 'newspress_wire_scraper_runs_v1';

const COLLECTIONS = {
  sources: 'wireFeedSources',
  runs: 'wireScraperRuns',
  workerStatus: 'wireWorkerStatus',
  listings: 'marketplaceListings',
  news: 'news',
} as const;

function canUseLiveFirestore(): boolean {
  return Boolean(isFirebaseConfigured && db && auth?.currentUser);
}

function makeSafeSourceId(name: string, language: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  const rand = Math.random().toString(36).substring(2, 7);
  return `wire_${language}_${slug || 'feed'}_${rand}`;
}

class WireFeedService {
  private localSources: WireFeedSource[] = [];
  private localRuns: WireScraperRun[] = [];
  private sourceListeners: Set<(sources: WireFeedSource[]) => void> = new Set();

  constructor() {
    this.hydrateLocal();
  }

  private hydrateLocal() {
    if (!hasLocalStorage()) return;
    const savedSources = readLocalJson<WireFeedSource[] | null>(SOURCES_STORAGE_KEY, null);
    if (Array.isArray(savedSources)) {
      this.localSources = savedSources;
    }
    const savedRuns = readLocalJson<WireScraperRun[] | null>(RUNS_STORAGE_KEY, null);
    if (Array.isArray(savedRuns)) {
      this.localRuns = savedRuns;
    }
  }

  private persistLocal() {
    if (!hasLocalStorage()) return;
    writeLocalJson(SOURCES_STORAGE_KEY, this.localSources);
    writeLocalJson(RUNS_STORAGE_KEY, this.localRuns);
  }

  private notifyLocalSourceListeners() {
    const snapshot = [...this.localSources].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    this.sourceListeners.forEach((cb) => cb(snapshot));
  }

  public getLocalSources(): WireFeedSource[] {
    return [...this.localSources].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public getLocalRuns(): WireScraperRun[] {
    return [...this.localRuns].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  /**
   * Subscribe to admin-configured wire feed sources.
   * Uses live Firestore onSnapshot when authenticated with Firebase, else local store.
   */
  public subscribeSources(
    onData: (sources: WireFeedSource[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!canUseLiveFirestore()) {
      this.sourceListeners.add(onData);
      onData(this.getLocalSources());
      return () => {
        this.sourceListeners.delete(onData);
      };
    }

    const q = query(collection(db, COLLECTIONS.sources), orderBy('updatedAt', 'desc'));
    return onSnapshot(
      q,
      (snap) => {
        const items: WireFeedSource[] = snap.docs.map((d) => ({
          ...(d.data() as WireFeedSource),
          sourceId: d.id,
        }));
        this.localSources = items;
        this.persistLocal();
        onData(items);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, COLLECTIONS.sources);
        } catch (wrapped) {
          if (onError) onError(wrapped as Error);
        }
      }
    );
  }

  /**
   * Subscribe to recent GCE e2-micro worker ingestion run logs.
   */
  public subscribeRuns(
    onData: (runs: WireScraperRun[]) => void,
    onError?: (err: Error) => void,
    maxCount = 40
  ): Unsubscribe {
    if (!canUseLiveFirestore()) {
      onData(this.getLocalRuns().slice(0, maxCount));
      return () => {};
    }

    const q = query(
      collection(db, COLLECTIONS.runs),
      orderBy('startedAt', 'desc'),
      limit(maxCount)
    );
    return onSnapshot(
      q,
      (snap) => {
        const items: WireScraperRun[] = snap.docs.map((d) => ({
          ...(d.data() as WireScraperRun),
          runId: d.id,
        }));
        this.localRuns = items;
        this.persistLocal();
        onData(items);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, COLLECTIONS.runs);
        } catch (wrapped) {
          if (onError) onError(wrapped as Error);
        }
      }
    );
  }

  /**
   * Subscribe to the GCE e2-micro primary worker heartbeat document.
   */
  public subscribeWorkerStatus(
    onData: (status: WireWorkerStatus | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!canUseLiveFirestore()) {
      onData(null);
      return () => {};
    }

    const ref = doc(db, COLLECTIONS.workerStatus, 'primary');
    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          onData(null);
          return;
        }
        onData(snap.data() as WireWorkerStatus);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, `${COLLECTIONS.workerStatus}/primary`);
        } catch (wrapped) {
          if (onError) onError(wrapped as Error);
        }
      }
    );
  }

  /**
   * Create a new wire feed source with strict URL and payload boundary validation.
   */
  public async createSource(input: CreateWireFeedSourceInput): Promise<WireFeedSource> {
    const cleanName = input.name.trim().slice(0, 120);
    if (!cleanName) {
      throw new Error('Source name is required.');
    }

    const urlCheck = validateExternalFeedUrl(input.url);
    if (!urlCheck.valid || !urlCheck.normalizedUrl) {
      throw new Error(urlCheck.error || 'Invalid source URL.');
    }

    const cleanCategory = input.category.trim().slice(0, 80);
    if (!cleanCategory) {
      throw new Error('Target category is required.');
    }

    const pollIntervalMinutes = Math.max(5, Math.min(1440, Math.round(input.pollIntervalMinutes || 30)));
    const maxItemsPerRun = Math.max(1, Math.min(20, Math.round(input.maxItemsPerRun || 5)));

    const now = new Date().toISOString();
    const sourceId = makeSafeSourceId(cleanName, input.language);

    const record: WireFeedSource = {
      sourceId,
      name: cleanName,
      url: urlCheck.normalizedUrl,
      feedType: input.feedType,
      language: input.language,
      category: cleanCategory,
      pollIntervalMinutes,
      maxItemsPerRun,
      enabled: Boolean(input.enabled),
      regionTag: input.regionTag?.trim().slice(0, 64) || 'Pan-India',
      lastStatus: 'idle',
      totalPublishedCount: 0,
      createdBy: input.createdBy.slice(0, 128),
      createdAt: now,
      updatedAt: now,
    };

    if (canUseLiveFirestore()) {
      const path = `${COLLECTIONS.sources}/${sourceId}`;
      try {
        await setDoc(doc(db, COLLECTIONS.sources, sourceId), record);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    } else {
      this.localSources = [record, ...this.localSources];
      this.persistLocal();
      this.notifyLocalSourceListeners();
    }

    return record;
  }

  /**
   * Update an existing wire feed source configuration.
   */
  public async updateSource(
    sourceId: string,
    updates: Partial<
      Pick<
        WireFeedSource,
        | 'name'
        | 'url'
        | 'feedType'
        | 'language'
        | 'category'
        | 'pollIntervalMinutes'
        | 'maxItemsPerRun'
        | 'enabled'
        | 'regionTag'
      >
    >
  ): Promise<void> {
    const patch: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.name !== undefined) {
      const cleanName = updates.name.trim().slice(0, 120);
      if (!cleanName) throw new Error('Source name cannot be empty.');
      patch.name = cleanName;
    }

    if (updates.url !== undefined) {
      const urlCheck = validateExternalFeedUrl(updates.url);
      if (!urlCheck.valid || !urlCheck.normalizedUrl) {
        throw new Error(urlCheck.error || 'Invalid source URL.');
      }
      patch.url = urlCheck.normalizedUrl;
    }

    if (updates.feedType !== undefined) patch.feedType = updates.feedType;
    if (updates.language !== undefined) patch.language = updates.language as WireLanguageCode;
    if (updates.category !== undefined) patch.category = updates.category.trim().slice(0, 80);
    if (updates.pollIntervalMinutes !== undefined) {
      patch.pollIntervalMinutes = Math.max(5, Math.min(1440, Math.round(updates.pollIntervalMinutes)));
    }
    if (updates.maxItemsPerRun !== undefined) {
      patch.maxItemsPerRun = Math.max(1, Math.min(20, Math.round(updates.maxItemsPerRun)));
    }
    if (updates.enabled !== undefined) patch.enabled = Boolean(updates.enabled);
    if (updates.regionTag !== undefined) patch.regionTag = updates.regionTag.trim().slice(0, 64);

    if (canUseLiveFirestore()) {
      const path = `${COLLECTIONS.sources}/${sourceId}`;
      try {
        await updateDoc(doc(db, COLLECTIONS.sources, sourceId), patch);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    } else {
      this.localSources = this.localSources.map((src) =>
        src.sourceId === sourceId ? ({ ...src, ...patch } as WireFeedSource) : src
      );
      this.persistLocal();
      this.notifyLocalSourceListeners();
    }
  }

  /**
   * Remove a wire feed source.
   */
  public async deleteSource(sourceId: string): Promise<void> {
    if (canUseLiveFirestore()) {
      const path = `${COLLECTIONS.sources}/${sourceId}`;
      try {
        await deleteDoc(doc(db, COLLECTIONS.sources, sourceId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      this.localSources = this.localSources.filter((src) => src.sourceId !== sourceId);
      this.persistLocal();
      this.notifyLocalSourceListeners();
    }
  }

  /**
   * Subscribe to active Marketplace listings published to Firestore by the GCE e2-micro worker.
   */
  public subscribeLiveWireListings(
    onListings: (listings: MarketplaceListing[]) => void
  ): Unsubscribe {
    if (!canUseLiveFirestore()) {
      return () => {};
    }

    const q = query(
      collection(db, COLLECTIONS.listings),
      where('status', '==', 'ACTIVE'),
      limit(150)
    );

    return onSnapshot(
      q,
      (snap) => {
        const synced: MarketplaceListing[] = snap.docs.map((d) => {
          const raw = d.data() as MarketplaceListing;
          const safeImg = sanitizeImageUrl(raw.featuredImageUrl);
          return {
            ...raw,
            listingId: raw.listingId || d.id,
            featuredImageUrl: safeImg,
            hasPhotography: Boolean(safeImg || raw.hasPhotography),
            photoCount: safeImg ? Math.max(1, raw.photoCount || 1) : raw.photoCount || 0,
          };
        });
        onListings(synced);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, COLLECTIONS.listings);
        } catch {
          // Silently preserve existing local marketplace state if permissions are pending
        }
      }
    );
  }

  /**
   * Fetch full rewritten article body from Firestore /news/{newsId} for worker-published stories.
   */
  public async fetchArticleFromFirestore(newsId: string): Promise<NewsArticle | null> {
    if (!canUseLiveFirestore() || !newsId) return null;
    const path = `${COLLECTIONS.news}/${newsId}`;
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.news, newsId));
      if (!snap.exists()) return null;
      const data = snap.data() as NewsArticle;
      const safeCover = sanitizeImageUrl(data.coverImageUrl || data.heroImageUrl || data.imageUrl);
      return {
        ...data,
        articleId: data.articleId || snap.id,
        coverImageUrl: safeCover,
        heroImageUrl: safeCover,
        imageUrl: safeCover,
      };
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch {
        return null;
      }
      return null;
    }
  }
}

export const wireFeedService = new WireFeedService();
