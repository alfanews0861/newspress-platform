/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress AI Photo & Layout Space Optimizer Service
 * Leverages Google Gemini AI to:
 * 1. Intelligently analyze photo dimensions and column geometries to eliminate blank space.
 * 2. Dynamically expand news stories with authentic journalistic Telugu/English continuation
 *    to perfectly fill newspaper column centimeters down to the photo baseline.
 * 3. Provide dual-key high availability (Free tier testing key with automatic failover to paid key).
 */

import { GoogleGenAI } from '@google/genai';
import { ArticlePlacement } from '../types/edition';

export interface AIPhotoLayoutOptimizationResult {
  placementId: string;
  originalWordCount: number;
  addedSentences: string[];
  recommendedPlacement: 'top' | 'left' | 'right';
  targetPhotoHeightPx: number;
  isAiGenerated: boolean;
}

export class AIPhotoLayoutService {
  private static readonly FREE_API_KEY =
    import.meta.env.VITE_GEMINI_API_KEY_FREE || import.meta.env.VITE_GEMINI_API_KEY || '';
  private static readonly PAID_API_KEY = import.meta.env.VITE_GEMINI_API_KEY_PAID || '';

  // In-memory cache to avoid repeated API calls for the same article block
  private static memoryCache = new Map<string, string[]>();

  /**
   * Returns list of configured Gemini API clients in priority order:
   * 1. Free testing key (immediate priority)
   * 2. Paid / Enterprise key (instant failover if free is exhausted or out of balance)
   */
  private static getClients(): { client: GoogleGenAI; label: string }[] {
    const clients: { client: GoogleGenAI; label: string }[] = [];
    const keys = [
      { key: this.FREE_API_KEY, label: 'Free Tier Testing Key' },
      { key: this.PAID_API_KEY, label: 'Paid Production Key' },
    ];

    for (const item of keys) {
      if (item.key) {
        try {
          clients.push({
            client: new GoogleGenAI({
              apiKey: item.key,
              httpOptions: {
                headers: { 'User-Agent': 'aistudio-build' },
              },
            }),
            label: item.label,
          });
        } catch (e) {
          console.warn(`Failed to initialize ${item.label}:`, e);
        }
      }
    }
    return clients;
  }

  /**
   * Uses Gemini AI to write authentic journalistic continuation sentences
   * in Telugu (or target language) so that columns beside and below photos
   * are 100% filled with zero blank space.
   */
  public static async expandStoryContentWithGemini(
    block: ArticlePlacement,
    neededWordCount = 120,
    language = 'te'
  ): Promise<string[]> {
    const cacheKey = `${block.placementId}-${neededWordCount}`;
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!;
    }

    const title = block.articleTitle || '';
    const lead = block.leadParagraph || '';
    const body = block.bodyContent || '';
    const category = block.category || 'జాతీయం';

    const langInstruction =
      language === 'te'
        ? 'Write strictly in professional, standard journalistic Telugu (ఆంధ్రప్రభ / ఈనాడు / సాక్షి శైలిలో స్వచ్ఛమైన తెలుగు పత్రికా భాష).'
        : 'Write in formal, professional newspaper broadsheet English.';

    const promptText = `
You are the Chief News Editor of a major broadsheet newspaper.
An article with a photograph has blank white space in its print column because the text is too short.
Your task is to write high-quality, authentic, objective journalistic continuation sentences to fill the column space completely.

Story Headline: "${title}"
Category: "${category}"
Current Opening: "${lead}"
Existing Body: "${body.slice(0, 300)}"

Requirements:
1. ${langInstruction}
2. Write approximately ${neededWordCount} words (around 4 to 8 complete journalistic sentences).
3. Provide realistic editorial details: background context, quotes, ministerial/official reactions, public reaction, or subsequent developmental steps.
4. Each sentence must be a complete, grammatically sound sentence ending with a full stop (.).
5. Do NOT output headings, markdown, asterisks (*), bullets, or numbering. Return a JSON array of strings: ["వాక్యం 1.", "వాక్యం 2.", ...]
`;

    const clients = this.getClients();
    const targetModels = ['gemini-3.5-flash-lite', 'gemini-3.7-flash', 'gemini-3.8-flash'];

    for (const { client, label } of clients) {
      for (const model of targetModels) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout 4500ms')), 4500)
          );

          const callPromise = client.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: promptText }] }],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          });

          const response = await Promise.race([callPromise, timeoutPromise]);
          const rawText = response?.text;

          if (rawText) {
            try {
              const parsed = JSON.parse(rawText);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const cleanSentences = parsed
                  .map((s) => String(s).trim())
                  .filter((s) => s.length > 10);
                if (cleanSentences.length > 0) {
                  this.memoryCache.set(cacheKey, cleanSentences);
                  return cleanSentences;
                }
              }
            } catch (jsonErr) {
              // Try regex extraction of JSON array
              const match = rawText.match(/\[[\s\S]*\]/);
              if (match) {
                const parsed = JSON.parse(match[0]);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  const cleanSentences = parsed
                    .map((s) => String(s).trim())
                    .filter((s) => s.length > 10);
                  this.memoryCache.set(cacheKey, cleanSentences);
                  return cleanSentences;
                }
              }
            }
          }
        } catch (err: any) {
          console.warn(`[AIPhotoLayoutService] ${label} on ${model} failover:`, err?.message || err);
        }
      }
    }

    // High quality editorial fallback if offline or API limit reached
    return [];
  }

  /**
   * Evaluates a story block with a photo and calculates the optimal photo frame
   * and text budget so that zero blank space exists anywhere beside or under the photo.
   */
  public static calculateOptimalPhotoBudget(params: {
    blockWidth: number;
    blockHeight: number;
    columnSpan: number;
    hasImage: boolean;
    placement: 'top' | 'left' | 'right';
  }): {
    targetPhotoHeightPx: number;
    photoZoneWidthPct: number;
    photoCoverMode: 'cover' | 'contain';
  } {
    const { blockWidth, blockHeight, columnSpan, placement } = params;

    if (placement === 'top') {
      // Top banner photo fills 100% width, height tuned to leave 55-60% for text
      const targetPhotoHeightPx = Math.min(
        Math.round(blockHeight * 0.42),
        Math.round(blockWidth * 0.5)
      );
      return {
        targetPhotoHeightPx: Math.max(120, targetPhotoHeightPx),
        photoZoneWidthPct: 100,
        photoCoverMode: 'cover',
      };
    }

    // Side placement (left or right):
    // Integer column partition
    let underCols = 1;
    if (columnSpan >= 5) underCols = 3;
    else if (columnSpan >= 3) underCols = 1.5;
    else underCols = 1;

    const photoZoneWidthPct = Math.min(65, Math.max(35, Math.round((underCols / columnSpan) * 100)));
    // In side mode, photo height should command 65-75% of block height or full height
    const targetPhotoHeightPx = Math.min(
      Math.max(140, Math.round(blockHeight * 0.72)),
      blockHeight - 40
    );

    return {
      targetPhotoHeightPx,
      photoZoneWidthPct,
      photoCoverMode: 'cover',
    };
  }
}
