/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NewsPress Marketplace Wire Ingestion Worker (Google Compute Engine e2-micro)
 * Polls active wireFeedSources in Firestore, extracts RSS/Atom & website stories,
 * deduplicates via SHA-256 canonical URL hash, rewrites with punchy headlines
 * preserving exact factual meaning, and auto-publishes directly to Marketplace
 * as free-for-subscribers wire listings with lead photography.
 */

import 'dotenv/config';
import crypto from 'node:crypto';
import os from 'node:os';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { extractStoriesFromSource } from './extractor.js';
import { rewriteStoryForMarketplace } from './rewriter.js';
import { getKeyPool } from './keyPool.js';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'alfa-news-service-test-project';
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-9028c422-4dc9-4d54-bb36-aecf77ecd094';
const WORKER_ID = process.env.WORKER_ID || 'gce-e2-micro-primary';
const WORKER_REGION = process.env.WORKER_REGION || 'us-central1';
const LOOP_INTERVAL_SECONDS = Math.max(30, Number(process.env.LOOP_INTERVAL_SECONDS || 120));
const MAX_CONCURRENT_SOURCES = Math.max(1, Math.min(4, Number(process.env.MAX_CONCURRENT_SOURCES || 2)));
const RUN_ONCE = process.argv.includes('--once');

const STARTED_AT_MS = Date.now();
let shuttingDown = false;

const app = initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID,
});

const db = DATABASE_ID && DATABASE_ID !== '(default)'
  ? getFirestore(app, DATABASE_ID)
  : getFirestore(app);

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function getMemoryRssMb() {
  return Math.round((process.memoryUsage().rss / (1024 * 1024)) * 10) / 10;
}

function isSourceDue(source, nowMs) {
  if (RUN_ONCE) return true;
  const lastStamp = source.lastPolledAt || source.lastRunAt;
  if (!lastStamp) return true;
  const lastMs = Date.parse(lastStamp);
  if (Number.isNaN(lastMs)) return true;
  const intervalMs = Math.max(5, Number(source.pollIntervalMinutes || 30)) * 60 * 1000;
  return nowMs - lastMs >= intervalMs;
}

async function publishWireStory({ source, extracted, rewritten, urlHash }) {
  const shortHash = urlHash.slice(0, 16);
  const newsId = `news_wire_${shortHash}`;
  const listingId = `lst_wire_${shortHash}`;
  const nowIso = new Date().toISOString();
  const hasPhoto = Boolean(extracted.imageUrl);

  const newsDoc = {
    articleId: newsId,
    tenantId: 'newspress_syndication_wire',
    headline: rewritten.headline,
    subheadline: rewritten.shortDescription,
    leadParagraph: rewritten.shortDescription,
    bodyContent: rewritten.bodyContent,
    byline: `${source.name} Wire Desk`,
    authorId: 'wire_syndication_desk',
    authorName: 'NewsPress Syndication Desk',
    category: source.category,
    language: source.language,
    district: rewritten.district || source.regionTag || 'Pan-India',
    state: rewritten.state || 'India',
    editorialStatus: 'published',
    originalityStatus: 'VERIFIED_ORIGINAL',
    wordCount: rewritten.wordCount,
    coverImageUrl: extracted.imageUrl || null,
    heroImageUrl: extracted.imageUrl || null,
    imageUrl: extracted.imageUrl || null,
    imageCaption: hasPhoto ? rewritten.imageCaption : null,
    isMarketplaceListed: true,
    isMarketplaceEligible: true,
    sourceType: 'WIRE_FEED',
    sourceFeedId: source.sourceId,
    sourceFeedName: source.name,
    sourceUrl: extracted.canonicalUrl,
    publishedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const listingDoc = {
    listingId,
    newsId,
    reporterId: 'wire_syndication_desk',
    reporterName: 'NewsPress Wire Desk',
    reporterByline: `${source.name} Wire Desk`,
    sourceTenantId: 'newspress_syndication_wire',
    title: rewritten.headline,
    shortDescription: rewritten.shortDescription,
    category: source.category,
    district: rewritten.district || source.regionTag || 'Pan-India',
    state: rewritten.state || 'India',
    language: source.language,
    publishedAt: nowIso,
    storyType: rewritten.storyType,
    listingType: 'STANDARD',
    pricingModel: 'SUBSCRIPTION_ENTITLEMENT',
    price: 0,
    currency: 'INR',
    includedInSubscription: true,
    sourceType: 'WIRE_FEED',
    sourceFeedId: source.sourceId,
    sourceFeedName: source.name,
    featuredImageUrl: extracted.imageUrl || null,
    imageCaption: hasPhoto ? rewritten.imageCaption : null,
    licenseOptions: ['DIGITAL_AND_PRINT', 'DIGITAL_ONLY', 'PRINT_ONLY'],
    availability: 'AVAILABLE',
    status: 'ACTIVE',
    originalityStatus: 'VERIFIED_ORIGINAL',
    verificationLevel: 'VERIFIED',
    wordCount: rewritten.wordCount,
    hasPhotography: hasPhoto,
    photoCount: hasPhoto ? 1 : 0,
    viewsCount: 0,
    purchasesCount: 0,
    grossRevenue: 0,
    netRevenue: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const dedupeDoc = {
    urlHash,
    canonicalUrl: extracted.canonicalUrl,
    sourceId: source.sourceId,
    newsId,
    listingId,
    language: source.language,
    category: source.category,
    publishedAt: nowIso,
  };

  const batch = db.batch();
  batch.set(db.collection('news').doc(newsId), newsDoc, { merge: true });
  batch.set(db.collection('marketplaceListings').doc(listingId), listingDoc, { merge: true });
  batch.set(db.collection('wireDedupeIndex').doc(urlHash), dedupeDoc);
  await batch.commit();

  return { newsId, listingId };
}

async function processSource(source) {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const runId = `run_${Date.now()}_${source.sourceId.slice(0, 24)}`.replace(/[^a-zA-Z0-9_-]/g, '_');

  let fetchedCount = 0;
  let skippedDuplicates = 0;
  let publishedCount = 0;
  let status = 'success';
  let errorMessage = '';
  let quotaExhausted = false;

  try {
    const extractedItems = await extractStoriesFromSource(source);
    fetchedCount = extractedItems.length;

    for (const extracted of extractedItems) {
      if (shuttingDown) break;
      const urlHash = sha256Hex(extracted.canonicalUrl);
      const dedupeRef = db.collection('wireDedupeIndex').doc(urlHash);
      const existing = await dedupeRef.get();
      if (existing.exists) {
        skippedDuplicates += 1;
        continue;
      }

      const rewritten = await rewriteStoryForMarketplace({
        originalTitle: extracted.originalTitle,
        originalDescription: extracted.originalDescription,
        bodyText: extracted.bodyText,
        languageCode: source.language,
        category: source.category,
        regionTag: source.regionTag,
        sourceName: source.name,
      });

      await publishWireStory({ source, extracted, rewritten, urlHash });
      publishedCount += 1;
      const via = rewritten._meta ? `${rewritten._meta.keyLabel}/${rewritten._meta.model}` : 'wire-desk';
      console.log(
        `[wire-worker] Published [${source.language}/${source.category}] (${via}) "${rewritten.headline.slice(0, 68)}"`
      );
    }
  } catch (err) {
    status = publishedCount > 0 ? 'partial' : 'failed';
    errorMessage = String(err?.message || err).slice(0, 500);
    console.error(`[wire-worker] Source "${source.name}" error: ${errorMessage}`);
    if (err?.code === 'ALL_QUOTAS_EXHAUSTED' || err?.code === 'ALL_KEYS_INVALID') {
      quotaExhausted = true;
    }
  }

  const completedAt = new Date().toISOString();
  const durationMs = Date.now() - startMs;

  const sourceUpdate = {
    lastPolledAt: completedAt,
    lastStatus: status,
    lastError: errorMessage || '',
    updatedAt: completedAt,
  };
  if (publishedCount > 0) {
    sourceUpdate.totalPublishedCount = FieldValue.increment(publishedCount);
  }

  await db.collection('wireFeedSources').doc(source.sourceId).set(sourceUpdate, { merge: true });

  const runLog = {
    runId,
    workerId: WORKER_ID,
    sourceId: source.sourceId,
    sourceName: source.name,
    language: source.language,
    category: source.category,
    startedAt,
    completedAt,
    durationMs,
    fetchedCount,
    skippedDuplicates,
    publishedCount,
    status,
    ...(errorMessage ? { errorMessage } : {}),
  };

  await db.collection('wireScraperRuns').doc(runId).set(runLog);
  return { publishedCount, status, quotaExhausted };
}

let publishedTodayCount = 0;
let publishedTodayDateKey = new Date().toISOString().slice(0, 10);

async function updateWorkerHeartbeat(status, activeSourcesCount, storiesPublishedDelta) {
  const todayKey = new Date().toISOString().slice(0, 10);
  if (todayKey !== publishedTodayDateKey) {
    publishedTodayDateKey = todayKey;
    publishedTodayCount = 0;
  }
  publishedTodayCount += storiesPublishedDelta;

  const payload = {
    workerId: WORKER_ID,
    hostname: os.hostname(),
    machineType: 'e2-micro',
    region: WORKER_REGION,
    status,
    lastHeartbeatAt: new Date().toISOString(),
    activeSourcesCount,
    publishedTodayCount,
    memoryUsageMb: getMemoryRssMb(),
    version: '1.1.0',
  };

  await db.collection('wireWorkerStatus').doc('primary').set(payload, { merge: true });
}

async function runCycle() {
  const nowMs = Date.now();
  const snap = await db.collection('wireFeedSources').where('enabled', '==', true).get();

  const activeSources = snap.docs.map((d) => ({ ...d.data(), sourceId: d.id }));
  const dueSources = activeSources.filter((src) => isSourceDue(src, nowMs));

  if (dueSources.length === 0) {
    await updateWorkerHeartbeat('idle', activeSources.length, 0);
    return { sourcesProcessed: 0, storiesPublished: 0 };
  }

  await updateWorkerHeartbeat('online', activeSources.length, 0);

  let totalPublished = 0;
  let cycleQuotaExhausted = false;
  const queue = [...dueSources];

  async function workerLoop() {
    while (queue.length > 0 && !shuttingDown && !cycleQuotaExhausted) {
      const next = queue.shift();
      if (!next) break;
      const result = await processSource(next);
      totalPublished += result.publishedCount;
      if (result.quotaExhausted) {
        cycleQuotaExhausted = true;
        console.warn('[wire-worker] Pausing remaining sources in this cycle until free-tier key quotas recover.');
        break;
      }
    }
  }

  const concurrency = Math.min(MAX_CONCURRENT_SOURCES, dueSources.length);
  await Promise.all(Array.from({ length: concurrency }, () => workerLoop()));

  await updateWorkerHeartbeat('idle', activeSources.length, totalPublished);
  return { sourcesProcessed: dueSources.length, storiesPublished: totalPublished };
}

async function main() {
  const poolSummary = getKeyPool().getSummary();
  console.log(
    `[wire-worker] Starting ${WORKER_ID} (${WORKER_REGION}) | project=${PROJECT_ID} | db=${DATABASE_ID} | mode=${
      RUN_ONCE ? 'once' : 'daemon'
    }`
  );
  console.log(
    `[wire-worker] Free-tier key pool ready: ${poolSummary.keyCount} project key(s) [${poolSummary.labels.join(
      ', '
    )}] | light models=[${poolSummary.models.join(' -> ')}] | per-key pacing=${poolSummary.minKeyIntervalMs}ms`
  );

  if (RUN_ONCE) {
    const summary = await runCycle();
    console.log(
      `[wire-worker] Single cycle complete: sources=${summary.sourcesProcessed}, published=${summary.storiesPublished}, rss=${getMemoryRssMb()}MB`
    );
    return;
  }

  while (!shuttingDown) {
    try {
      const summary = await runCycle();
      console.log(
        `[wire-worker] Cycle done: sources=${summary.sourcesProcessed}, published=${summary.storiesPublished}, rss=${getMemoryRssMb()}MB`
      );
    } catch (err) {
      const message = String(err?.message || err);
      console.error(`[wire-worker] Cycle fatal error: ${message}`);
      try {
        await updateWorkerHeartbeat('offline', 0, 0);
      } catch {
        // Ignore secondary heartbeat write failure
      }
    }

    if (shuttingDown) break;
    await new Promise((resolve) => setTimeout(resolve, LOOP_INTERVAL_SECONDS * 1000));
  }
}

function handleShutdown(signal) {
  console.log(`[wire-worker] Received ${signal}, shutting down cleanly...`);
  shuttingDown = true;
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

main().catch((err) => {
  console.error('[wire-worker] Unhandled startup error:', err);
  process.exit(1);
});
