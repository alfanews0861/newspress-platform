/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lightweight RSS/Atom + News Website Article Extractor for GCE e2-micro.
 * Zero headless browser overhead — uses fast-xml-parser + cheerio on raw HTTP responses.
 */

import * as cheerio from 'cheerio';
import { XMLParser } from 'fast-xml-parser';
import { canonicalizeUrl, safeFetchText, sanitizeExternalImageUrl } from './urlGuard.js';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
  parseTagValue: false,
});

const NOISE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'svg',
  'nav',
  'header',
  'footer',
  'aside',
  'form',
  'button',
  '.advertisement',
  '.ad',
  '.ads',
  '.promo',
  '.newsletter',
  '.related-articles',
  '.related-news',
  '.comments',
  '.comment-section',
  '.social-share',
  '.share-buttons',
  '.breadcrumb',
  '.breadcrumbs',
  '[role="navigation"]',
  '[role="complementary"]',
  '[aria-hidden="true"]',
].join(', ');

function cleanText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripHtmlToText(html) {
  if (!html || typeof html !== 'string') return '';
  const $ = cheerio.load(html);
  $(NOISE_SELECTORS).remove();
  const paragraphs = [];
  $('p').each((_, el) => {
    const text = cleanText($(el).text());
    if (text.length >= 25) paragraphs.push(text);
  });
  if (paragraphs.length > 0) {
    return paragraphs.join('\n\n');
  }
  return cleanText($.text());
}

function extractFirstString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (typeof value['#text'] === 'string') return value['#text'];
    if (typeof value['@_href'] === 'string') return value['@_href'];
    if (typeof value['@_url'] === 'string') return value['@_url'];
    if (typeof value.url === 'string') return value.url;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = extractFirstString(entry);
      if (found) return found;
    }
  }
  return '';
}

function extractImageFromJsonLd($, pageUrl) {
  let found;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return;
    try {
      const raw = $(el).html();
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed['@graph'])
        ? parsed['@graph']
        : [parsed];

      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        const img = node.image || node.thumbnailUrl;
        const candidate = extractFirstString(img);
        const safe = sanitizeExternalImageUrl(candidate, pageUrl);
        if (safe) {
          found = safe;
          return;
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks
    }
  });
  return found;
}

function extractLeadImageFromHtml($, pageUrl) {
  const metaCandidates = [
    $('meta[property="og:image:secure_url"]').attr('content'),
    $('meta[property="og:image"]').attr('content'),
    $('meta[name="twitter:image"]').attr('content'),
    $('meta[name="twitter:image:src"]').attr('content'),
    $('link[rel="image_src"]').attr('href'),
  ];

  for (const candidate of metaCandidates) {
    const safe = sanitizeExternalImageUrl(candidate, pageUrl);
    if (safe) return safe;
  }

  const jsonLdImage = extractImageFromJsonLd($, pageUrl);
  if (jsonLdImage) return jsonLdImage;

  // Fall back to first substantive image inside article/main content
  const scope = $('article, main, [role="main"]').first();
  const imgNodes = scope.length ? scope.find('img') : $('img');
  let fallback;
  imgNodes.each((_, el) => {
    if (fallback) return;
    const src =
      $(el).attr('data-src') ||
      $(el).attr('data-lazy-src') ||
      $(el).attr('data-original') ||
      $(el).attr('src');
    const width = Number($(el).attr('width') || 0);
    if (width > 0 && width < 160) return;
    const lowered = (src || '').toLowerCase();
    if (
      lowered.includes('logo') ||
      lowered.includes('avatar') ||
      lowered.includes('icon') ||
      lowered.includes('sprite') ||
      lowered.endsWith('.svg')
    ) {
      return;
    }
    const safe = sanitizeExternalImageUrl(src, pageUrl);
    if (safe) fallback = safe;
  });

  return fallback;
}

function extractArticleFromHtml(html, pageUrl) {
  const $ = cheerio.load(html);

  const canonicalHref = $('link[rel="canonical"]').attr('href');
  let resolvedCanonical = pageUrl;
  if (canonicalHref) {
    try {
      resolvedCanonical = new URL(canonicalHref, pageUrl).toString();
    } catch {
      resolvedCanonical = pageUrl;
    }
  }

  const leadImageUrl = extractLeadImageFromHtml($, pageUrl);
  const imageAlt =
    cleanText($('meta[property="og:image:alt"]').attr('content') || '') ||
    cleanText($('article figure figcaption').first().text() || '') ||
    cleanText($('article img').first().attr('alt') || '');

  const headline =
    cleanText($('meta[property="og:title"]').attr('content') || '') ||
    cleanText($('h1').first().text() || '') ||
    cleanText($('title').first().text() || '');

  const metaDescription =
    cleanText($('meta[property="og:description"]').attr('content') || '') ||
    cleanText($('meta[name="description"]').attr('content') || '');

  const publishedAt =
    $('meta[property="article:published_time"]').attr('content') ||
    $('time[datetime]').first().attr('datetime') ||
    new Date().toISOString();

  // Strip noise before extracting body paragraphs
  $(NOISE_SELECTORS).remove();

  const containerCandidates = [
    $('article').first(),
    $('[itemprop="articleBody"]').first(),
    $('.article-body, .story-body, .post-content, .entry-content, .article-content, .story-content, .content-body').first(),
    $('main').first(),
    $('body'),
  ];

  let bestParagraphs = [];
  for (const container of containerCandidates) {
    if (!container || container.length === 0) continue;
    const paragraphs = [];
    const seen = new Set();
    container.find('p').each((_, el) => {
      const text = cleanText($(el).text());
      if (text.length >= 35 && !seen.has(text)) {
        seen.add(text);
        paragraphs.push(text);
      }
    });
    if (paragraphs.length >= 2) {
      bestParagraphs = paragraphs;
      break;
    }
    if (paragraphs.length > bestParagraphs.length) {
      bestParagraphs = paragraphs;
    }
  }

  const bodyText = bestParagraphs.join('\n\n');

  return {
    canonicalUrl: canonicalizeUrl(resolvedCanonical),
    originalTitle: headline.slice(0, 300),
    originalDescription: metaDescription.slice(0, 600),
    bodyText: bodyText.slice(0, 12000),
    imageUrl: leadImageUrl,
    imageAlt: imageAlt.slice(0, 240),
    publishedAt,
  };
}

function extractRssImage(item, pageUrl) {
  const mediaContent = item['media:content'];
  const mediaThumb = item['media:thumbnail'];
  const enclosure = item.enclosure;

  const candidates = [
    extractFirstString(mediaContent),
    extractFirstString(mediaThumb),
    enclosure && typeof enclosure === 'object' && String(enclosure['@_type'] || '').startsWith('image/')
      ? enclosure['@_url']
      : '',
  ];

  for (const c of candidates) {
    const safe = sanitizeExternalImageUrl(c, pageUrl);
    if (safe) return safe;
  }

  // Try extracting an <img> inside description or content:encoded
  const htmlChunk = extractFirstString(item['content:encoded']) || extractFirstString(item.description);
  if (htmlChunk && htmlChunk.includes('<img')) {
    const $ = cheerio.load(htmlChunk);
    const imgSrc = $('img').first().attr('src');
    const safe = sanitizeExternalImageUrl(imgSrc, pageUrl);
    if (safe) return safe;
  }

  return undefined;
}

function extractRssLink(item) {
  if (typeof item.link === 'string') return item.link.trim();
  if (Array.isArray(item.link)) {
    const alt = item.link.find((l) => l && l['@_rel'] === 'alternate' && l['@_href']);
    if (alt) return String(alt['@_href']).trim();
    return extractFirstString(item.link).trim();
  }
  if (item.link && typeof item.link === 'object') {
    return extractFirstString(item.link).trim();
  }
  if (typeof item.guid === 'string' && item.guid.startsWith('http')) {
    return item.guid.trim();
  }
  return '';
}

/**
 * Extracts stories from an RSS 2.0 or Atom XML feed.
 */
async function extractFromRssFeed(source) {
  const maxItems = Math.max(1, Math.min(20, Number(source.maxItemsPerRun || 5)));
  const { body, finalUrl } = await safeFetchText(source.url);
  const parsed = xmlParser.parse(body);

  let rawItems = [];
  if (parsed?.rss?.channel?.item) {
    rawItems = Array.isArray(parsed.rss.channel.item)
      ? parsed.rss.channel.item
      : [parsed.rss.channel.item];
  } else if (parsed?.feed?.entry) {
    rawItems = Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry];
  } else if (parsed?.['rdf:RDF']?.item) {
    rawItems = Array.isArray(parsed['rdf:RDF'].item)
      ? parsed['rdf:RDF'].item
      : [parsed['rdf:RDF'].item];
  }

  const stories = [];
  for (const item of rawItems.slice(0, maxItems)) {
    const link = extractRssLink(item);
    if (!link) continue;

    let articleUrl;
    try {
      articleUrl = new URL(link, finalUrl).toString();
    } catch {
      continue;
    }

    const rssTitle = cleanText(extractFirstString(item.title));
    const rssHtml = extractFirstString(item['content:encoded']) || extractFirstString(item.description) || extractFirstString(item.summary);
    const rssBody = stripHtmlToText(rssHtml);
    const rssImage = extractRssImage(item, articleUrl);
    const rssDate = extractFirstString(item.pubDate) || extractFirstString(item.published) || extractFirstString(item.updated);

    let fullArticle = null;
    try {
      const pageRes = await safeFetchText(articleUrl, {
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      });
      fullArticle = extractArticleFromHtml(pageRes.body, pageRes.finalUrl);
    } catch {
      // Fall back to RSS body if publisher blocks full-page fetch
    }

    const bodyText =
      fullArticle && fullArticle.bodyText.length >= rssBody.length
        ? fullArticle.bodyText
        : rssBody;

    const title = (fullArticle?.originalTitle || rssTitle || '').trim();
    if (!title || bodyText.length < 80) continue;

    stories.push({
      canonicalUrl: fullArticle?.canonicalUrl || canonicalizeUrl(articleUrl),
      originalTitle: title,
      originalDescription: fullArticle?.originalDescription || rssBody.slice(0, 400),
      bodyText,
      imageUrl: fullArticle?.imageUrl || rssImage,
      imageAlt: fullArticle?.imageAlt || title,
      publishedAt: fullArticle?.publishedAt || rssDate || new Date().toISOString(),
    });
  }

  return stories;
}

/**
 * Discovers article links on a news section/homepage HTML document.
 */
function discoverArticleLinks(html, baseUrl, maxItems) {
  const $ = cheerio.load(html);
  const baseOrigin = new URL(baseUrl).origin;
  const basePath = new URL(baseUrl).pathname;

  const scored = [];
  const seen = new Set();

  const selectors = [
    'article a[href]',
    'h1 a[href], h2 a[href], h3 a[href]',
    '.story-card a[href], .news-card a[href], .post-title a[href], .entry-title a[href]',
    'main a[href]',
  ];

  for (let priority = 0; priority < selectors.length; priority++) {
    $(selectors[priority]).each((_, el) => {
      const href = $(el).attr('href');
      const anchorText = cleanText($(el).text());
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) {
        return;
      }

      let resolved;
      try {
        resolved = new URL(href, baseUrl);
      } catch {
        return;
      }

      if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return;
      if (resolved.origin !== baseOrigin) return;
      if (resolved.pathname === '/' || resolved.pathname === basePath) return;

      const lowerPath = resolved.pathname.toLowerCase();
      if (
        lowerPath.includes('/tag/') ||
        lowerPath.includes('/author/') ||
        lowerPath.includes('/login') ||
        lowerPath.includes('/subscribe') ||
        lowerPath.includes('/about') ||
        lowerPath.includes('/contact') ||
        lowerPath.includes('/privacy') ||
        lowerPath.includes('/terms') ||
        lowerPath.includes('/video') ||
        lowerPath.includes('/gallery')
      ) {
        return;
      }

      // Heuristic: article URLs usually have meaningful path depth/slug length or headline text
      const slugLength = resolved.pathname.length;
      if (slugLength < 16 && anchorText.length < 28) return;

      const canonical = canonicalizeUrl(resolved.toString());
      if (seen.has(canonical)) return;
      seen.add(canonical);

      scored.push({
        url: canonical,
        score: (selectors.length - priority) * 10 + Math.min(anchorText.length, 80) / 10,
      });
    });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems * 2)
    .map((entry) => entry.url);
}

/**
 * Extracts stories from either a direct article page or a news section/category webpage.
 */
async function extractFromWebsiteUrl(source) {
  const maxItems = Math.max(1, Math.min(20, Number(source.maxItemsPerRun || 5)));
  const { body, finalUrl } = await safeFetchText(source.url, {
    accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  });

  // First check if the URL itself is a single full article
  const directCandidate = extractArticleFromHtml(body, finalUrl);
  const discoveredLinks = discoverArticleLinks(body, finalUrl, maxItems);

  const isSingleArticle =
    directCandidate.bodyText.length >= 600 &&
    directCandidate.originalTitle.length >= 20 &&
    discoveredLinks.length < 3;

  if (isSingleArticle) {
    return [directCandidate];
  }

  const stories = [];
  for (const link of discoveredLinks) {
    if (stories.length >= maxItems) break;
    try {
      const pageRes = await safeFetchText(link, {
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      });
      const parsed = extractArticleFromHtml(pageRes.body, pageRes.finalUrl);
      if (parsed.originalTitle.length >= 15 && parsed.bodyText.length >= 160) {
        stories.push(parsed);
      }
    } catch {
      // Skip unreachable individual links without failing the entire source run
    }
  }

  if (stories.length === 0 && directCandidate.originalTitle && directCandidate.bodyText.length >= 120) {
    stories.push(directCandidate);
  }

  return stories;
}

/**
 * Unified entry point supporting RSS/Atom feeds, news website sections,
 * single articles, and automatic format detection.
 */
export async function extractStoriesFromSource(source) {
  const mode = source.feedType || 'auto';
  if (mode === 'rss') {
    return extractFromRssFeed(source);
  }
  if (mode === 'article') {
    const { body, finalUrl } = await safeFetchText(source.url, {
      accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
    });
    const parsed = extractArticleFromHtml(body, finalUrl);
    return parsed.originalTitle && parsed.bodyText.length >= 100 ? [parsed] : [];
  }
  if (mode === 'website_section' || mode === 'website') {
    return extractFromWebsiteUrl(source);
  }

  // 'auto': fetch once and inspect Content-Type / leading XML markers
  const { body, contentType } = await safeFetchText(source.url);
  const head = body.slice(0, 512).toLowerCase();
  const looksLikeFeed =
    contentType.includes('xml') ||
    contentType.includes('rss') ||
    contentType.includes('atom') ||
    head.includes('<rss') ||
    head.includes('<feed') ||
    head.includes('<rdf:rdf');

  if (looksLikeFeed) {
    return extractFromRssFeed(source);
  }
  return extractFromWebsiteUrl(source);
}
