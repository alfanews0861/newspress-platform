/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Originality & Similarity Detection Architecture
 * Phase 2 — News Submission & Reporter Originality Engine
 * 
 * Extensible similarity detection architecture distinguishing:
 * - Exact duplicate
 * - Lightly edited duplicate
 * - Paraphrased duplicate
 * - Copied headline
 * - Substantially similar story
 * - Independent co-coverage of the same real-world event
 */

import { SimilarityMatch } from '../types/originality';
import {
  generateContentFingerprint,
  generateShingles,
  normalizeArticleText
} from './contentFingerprintService';

export interface ArticleComparisonTarget {
  articleId: string;
  submissionId?: string;
  headline: string;
  bodyContent: string;
  byline: string;
  tenantId: string;
  submittedAt: string;
  location?: string;
  district?: string;
  state?: string;
}

export interface CandidateArticleInput {
  headline: string;
  bodyContent: string;
  location?: string;
  district?: string;
  state?: string;
}

export interface IOriginalityDetector {
  checkExactMatch(textA: string, textB: string): boolean;
  checkNearDuplicate(textA: string, textB: string, threshold?: number): { isNearDuplicate: boolean; similarity: number };
  calculateSimilarity(candidate: CandidateArticleInput, target: ArticleComparisonTarget): SimilarityMatch | null;
  compareAgainstExistingNews(candidate: CandidateArticleInput, existing: ArticleComparisonTarget[]): SimilarityMatch[];
}

/**
 * Calculates Levenshtein edit distance between two strings.
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

/**
 * Computes Token Sort similarity (0 to 100) between two headlines.
 */
function tokenSortSimilarity(s1: string, s2: string): number {
  const n1 = normalizeArticleText(s1).split(/\s+/).sort().join(' ');
  const n2 = normalizeArticleText(s2).split(/\s+/).sort().join(' ');
  if (!n1 && !n2) return 100;
  if (!n1 || !n2) return 0;
  if (n1 === n2) return 100;

  const maxLen = Math.max(n1.length, n2.length);
  const dist = levenshteinDistance(n1, n2);
  const similarity = Math.max(0, Math.round(((maxLen - dist) / maxLen) * 100));
  return similarity;
}

/**
 * Computes word-level Jaccard similarity (0 to 100).
 */
function wordJaccardSimilarity(textA: string, textB: string): number {
  const wordsA = normalizeArticleText(textA).split(/\s+/).filter(Boolean);
  const wordsB = normalizeArticleText(textB).split(/\s+/).filter(Boolean);

  if (wordsA.length === 0 && wordsB.length === 0) return 100;
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const setA = new Set(wordsA);
  const setB = new Set(wordsB);

  let intersectionCount = 0;
  for (const w of setA) {
    if (setB.has(w)) intersectionCount++;
  }

  const unionSize = new Set([...wordsA, ...wordsB]).size;
  if (unionSize === 0) return 100;

  return Math.round((intersectionCount / unionSize) * 100);
}

/**
 * Computes Jaccard similarity (0 to 100) on 3-word shingles between two texts.
 */
function jaccardShingleSimilarity(bodyA: string, bodyB: string): number {
  const shinglesA = generateShingles(bodyA, 3);
  const shinglesB = generateShingles(bodyB, 3);

  if (shinglesA.size === 0 && shinglesB.size === 0) return 100;
  if (shinglesA.size === 0 || shinglesB.size === 0) return 0;

  let intersectionCount = 0;
  for (const s of shinglesA) {
    if (shinglesB.has(s)) {
      intersectionCount++;
    }
  }

  const unionCount = shinglesA.size + shinglesB.size - intersectionCount;
  if (unionCount === 0) return 100;

  return Math.round((intersectionCount / unionCount) * 100);
}

/**
 * Combined comprehensive text similarity: word Jaccard + n-gram shingle Jaccard.
 */
export function calculateCombinedTextSimilarity(textA: string, textB: string): number {
  const wordSim = wordJaccardSimilarity(textA, textB);
  const shingleSim = jaccardShingleSimilarity(textA, textB);
  // Shingles capture phrase structure; word Jaccard captures vocabulary overlap
  return Math.round(wordSim * 0.45 + shingleSim * 0.55);
}

/**
 * Extracts salient tokens (proper nouns, capitalized terms, key locations, numbers).
 */
function extractSalientEntities(text: string): string[] {
  const matches = text.match(/\b([A-Z][a-z]{2,}|\d{2,}(?:%|\$|km|m)?)\b/g);
  if (!matches) return [];
  const unique = Array.from(new Set(matches.map(m => m.trim())));
  return unique.slice(0, 15);
}

/**
 * Deterministic local originality and duplicate detection service.
 * Ready for future AI/embedding provider drop-in via the IOriginalityDetector interface.
 */
export class OriginalityDetectionService implements IOriginalityDetector {
  /**
   * Fast check for exact content match using normalized text comparison.
   */
  checkExactMatch(textA: string, textB: string): boolean {
    const normA = normalizeArticleText(textA);
    const normB = normalizeArticleText(textB);
    return normA.length > 0 && normA === normB;
  }

  /**
   * Fast check for near-duplicate text combining vocabulary and phrase overlap.
   */
  checkNearDuplicate(textA: string, textB: string, threshold = 60): { isNearDuplicate: boolean; similarity: number } {
    const wordSim = wordJaccardSimilarity(textA, textB);
    const shingleSim = jaccardShingleSimilarity(textA, textB);
    const similarity = Math.max(wordSim, Math.round(wordSim * 0.5 + shingleSim * 0.5));
    return {
      isNearDuplicate: similarity >= threshold,
      similarity
    };
  }

  /**
   * Detailed multi-factor similarity analysis between a candidate submission and an existing story.
   */
  calculateSimilarity(candidate: CandidateArticleInput, target: ArticleComparisonTarget): SimilarityMatch | null {
    // 1. Exact Fingerprint check
    const candFingerprint = generateContentFingerprint(candidate.headline, candidate.bodyContent);
    const targetFingerprint = generateContentFingerprint(target.headline, target.bodyContent);

    if (candFingerprint === targetFingerprint) {
      return {
        matchId: `sim_${Date.now()}_${target.articleId}`,
        targetArticleId: target.articleId,
        targetSubmissionId: target.submissionId,
        targetHeadline: target.headline,
        targetByline: target.byline,
        targetTenantId: target.tenantId,
        targetSubmittedAt: target.submittedAt,
        headlineSimilarityPercent: 100,
        bodySimilarityPercent: 100,
        overallSimilarityPercent: 100,
        matchType: 'exact_duplicate',
        sharedEntities: extractSalientEntities(candidate.bodyContent),
        isSameEventDifferentAngle: false,
        summaryExplanation: '100% exact text match with recorded submission fingerprint.'
      };
    }

    // 2. Headline Similarity
    const headlineSim = tokenSortSimilarity(candidate.headline, target.headline);

    // 3. Body Similarity (combined word + shingle Jaccard)
    const bodySim = calculateCombinedTextSimilarity(candidate.bodyContent, target.bodyContent);

    // 4. Salient Entities & Location overlap
    const candEntities = extractSalientEntities(candidate.bodyContent);
    const targetEntities = extractSalientEntities(target.bodyContent);
    const sharedEntities = candEntities.filter(e => targetEntities.includes(e));

    const isSameLocation = Boolean(
      candidate.location &&
      target.location &&
      candidate.location.toLowerCase().trim() === target.location.toLowerCase().trim()
    );

    // Weighted Overall Similarity
    const overallSimilarity = Math.round((headlineSim * 0.35) + (bodySim * 0.65));

    // Thresholds: Only report if similarity is notable (>25% or headline >70%)
    if (overallSimilarity < 25 && headlineSim < 70 && sharedEntities.length < 4) {
      return null;
    }

    // Classify match type
    let matchType: SimilarityMatch['matchType'];
    let isSameEventDifferentAngle = false;
    let explanation = '';

    if (overallSimilarity >= 88) {
      matchType = 'exact_duplicate';
      explanation = `Story text is ${overallSimilarity}% identical to previous filing by ${target.byline}. Direct duplicate detected.`;
    } else if (bodySim >= 65) {
      matchType = 'lightly_edited';
      explanation = `Body copy shares ${bodySim}% identical phrasing with minor word substitutions.`;
    } else if (headlineSim >= 80 && bodySim < 40) {
      matchType = 'copied_headline';
      explanation = `Headline is ${headlineSim}% similar, but body copy differs substantially (${bodySim}% overlap).`;
      if (isSameLocation || sharedEntities.length >= 3) {
        isSameEventDifferentAngle = true;
      }
    } else if (overallSimilarity >= 50) {
      matchType = 'substantially_similar';
      explanation = `Substantial narrative and phrasing overlap (${overallSimilarity}%) with existing dispatch.`;
    } else if (sharedEntities.length >= 4 || isSameLocation) {
      matchType = 'event_co_coverage';
      isSameEventDifferentAngle = true;
      explanation = `Independent coverage of the same real-world incident/topic. Phrasing is original (${bodySim}% body similarity) with shared event context (${sharedEntities.slice(0, 3).join(', ')}).`;
    } else {
      matchType = 'paraphrased';
      explanation = `Story exhibits paraphrasing patterns (${overallSimilarity}% similarity index).`;
    }

    return {
      matchId: `sim_${Date.now()}_${target.articleId}`,
      targetArticleId: target.articleId,
      targetSubmissionId: target.submissionId,
      targetHeadline: target.headline,
      targetByline: target.byline,
      targetTenantId: target.tenantId,
      targetSubmittedAt: target.submittedAt,
      headlineSimilarityPercent: headlineSim,
      bodySimilarityPercent: bodySim,
      overallSimilarityPercent: overallSimilarity,
      matchType,
      sharedEntities,
      isSameEventDifferentAngle,
      summaryExplanation: explanation
    };
  }

  /**
   * Compares candidate story against a pool of existing stories.
   * Returns matches sorted by overall similarity descending.
   */
  compareAgainstExistingNews(
    candidate: CandidateArticleInput,
    existing: ArticleComparisonTarget[]
  ): SimilarityMatch[] {
    const matches: SimilarityMatch[] = [];

    for (const target of existing) {
      const match = this.calculateSimilarity(candidate, target);
      if (match) {
        matches.push(match);
      }
    }

    return matches.sort((a, b) => b.overallSimilarityPercent - a.overallSimilarityPercent);
  }
}

export const originalityDetector = new OriginalityDetectionService();
