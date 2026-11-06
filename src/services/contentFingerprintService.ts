/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Content Fingerprinting Engine
 * Phase 2 — News Submission & Reporter Originality Engine
 * 
 * IMPORTANT ARCHITECTURAL PRINCIPLE:
 * A content fingerprint or cryptographic hash is a technical similarity and duplicate
 * detection mechanism only. It does NOT automatically establish legal copyright ownership.
 */

// Standard English stop words to filter out formatting noise while preserving entity tokens
const COMMON_STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'could', 'did', 'do', 'does', 'doing', 'down',
  'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his',
  'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me',
  'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once',
  'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over',
  'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the',
  'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was',
  'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why',
  'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Normalizes text content for deterministic fingerprinting:
 * - Unicode NFC normalization
 * - Strips HTML/formatting tags
 * - Cleans punctuation and non-alphanumeric noise
 * - Collapses whitespace
 * - Standardizes casing
 */
export function normalizeArticleText(rawText: string, removeStopWords = false): string {
  if (!rawText) return '';

  // 1. Unicode NFC normalization
  let normalized = rawText.normalize('NFC');

  // 2. Remove HTML / Markdown formatting tags
  normalized = normalized.replace(/<[^>]*>/g, ' ');
  normalized = normalized.replace(/[#*\`_~\[\]\(\)]/g, ' ');

  // 3. Lowercase
  normalized = normalized.toLowerCase();

  // 4. Normalize quotes, dashes, and currency symbols
  normalized = normalized
    .replace(/[‘’“”]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/[^\w\s\d]/g, ' ');

  // 5. Tokenize and filter
  const tokens = normalized
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  const filteredTokens = removeStopWords
    ? tokens.filter(t => !COMMON_STOP_WORDS.has(t) || t.length >= 7)
    : tokens;

  return filteredTokens.join(' ');
}

/**
 * Generates 3-word shingles from normalized tokens for near-duplicate Jaccard comparison.
 */
export function generateShingles(text: string, k = 3): Set<string> {
  const normalized = normalizeArticleText(text);
  const words = normalized.split(/\s+/).filter(Boolean);
  const shingles = new Set<string>();

  if (words.length <= k) {
    shingles.add(words.join(' '));
    return shingles;
  }

  for (let i = 0; i <= words.length - k; i++) {
    shingles.add(words.slice(i, i + k).join(' '));
  }

  return shingles;
}

/**
 * 64-bit FNV-1a deterministic hash implementation returning an 8-byte hex string.
 */
export function fnv1a64(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ (code >>> 8), 0x01000193);
  }

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `fp_${hex1}${hex2}`;
}

/**
 * Generates an authoritative technical content fingerprint for an article.
 */
export function generateContentFingerprint(headline: string, body: string): string {
  const normHeadline = normalizeArticleText(headline, true);
  const normBody = normalizeArticleText(body, true);
  const combined = `h:${normHeadline}|b:${normBody}`;
  return fnv1a64(combined);
}

/**
 * Generates a deterministic hash for a media asset payload or string reference.
 */
export function generateMediaFingerprint(assetIdentifierOrBuffer: string): string {
  return fnv1a64(`media:${assetIdentifierOrBuffer}`);
}
