/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Editorial Headline & Faithfulness-Preserving Rewriter for NewsPress Wire Worker.
 * Uses @google/genai free-tier high-quota light models (gemini-3.1-flash-lite ->
 * gemini-4-hydrogen) with multi-project API key rotation and structured JSON output.
 */

import { Type } from '@google/genai';
import { getKeyPool } from './keyPool.js';

const LANGUAGE_NAMES = {
  en: 'English',
  te: 'Telugu (తెలుగు)',
  hi: 'Hindi (हिन्दी)',
  ta: 'Tamil (தமிழ்)',
  kn: 'Kannada (ಕನ್ನಡ)',
  ml: 'Malayalam (മലയാളം)',
  mr: 'Marathi (मराठी)',
  bn: 'Bengali (বাংলা)',
  gu: 'Gujarati (ગુજરાતી)',
  or: 'Odia (ଓଡ଼ିଆ)',
  pa: 'Punjabi (ਪੰਜਾਬੀ)',
};

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    headline: {
      type: Type.STRING,
      description: 'A punchy, authoritative, front-page newspaper headline in the target language.',
    },
    shortDescription: {
      type: Type.STRING,
      description: 'A crisp 1-2 sentence lead summary (140-260 characters) in the target language.',
    },
    bodyContent: {
      type: Type.STRING,
      description:
        'Complete multi-paragraph newspaper article rewrite in the target language separated by double newlines (\\n\\n). Preserves every fact, name, number, date, location, and quote accurately without inventing facts.',
    },
    district: {
      type: Type.STRING,
      description: 'Primary Indian city or district referenced in the story in English (or "Pan-India").',
    },
    state: {
      type: Type.STRING,
      description: 'Primary Indian state referenced in the story in English (or "India").',
    },
    storyType: {
      type: Type.STRING,
      description: 'One of: breaking, developing, exclusive, feature, routine.',
    },
    imageCaption: {
      type: Type.STRING,
      description: 'A concise editorial photograph caption in the target language (max 140 chars).',
    },
  },
  required: [
    'headline',
    'shortDescription',
    'bodyContent',
    'district',
    'state',
    'storyType',
    'imageCaption',
  ],
};

function normalizeStoryType(val) {
  const allowed = new Set(['breaking', 'developing', 'exclusive', 'feature', 'routine']);
  const lower = String(val || 'routine').toLowerCase().trim();
  return allowed.has(lower) ? lower : 'routine';
}

function stripJsonCodeFence(raw) {
  return String(raw || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

/**
 * Rewrites a scraped story with a punchy newspaper headline and faithful full-body copy
 * strictly in the configured target language without altering factual meaning.
 * Automatically rotates across all configured free-tier project API keys and light models.
 */
export async function rewriteStoryForMarketplace({
  originalTitle,
  originalDescription,
  bodyText,
  languageCode,
  category,
  regionTag,
  sourceName,
}) {
  const pool = getKeyPool();
  const targetLanguage = LANGUAGE_NAMES[languageCode] || 'English';
  const maxInputChars = Math.max(2500, Math.min(10000, Number(process.env.REWRITER_MAX_INPUT_CHARS || 7500)));

  const systemInstruction = [
    'You are a senior Chief Sub-Editor at a premier Indian national and regional newspaper wire desk.',
    `Your job is to rewrite incoming news reports strictly in ${targetLanguage} for print and digital newspaper syndication.`,
    'MANDATORY EDITORIAL RULES:',
    '1. PUNCHY HEADLINE: Craft an attention-grabbing, crisp, authoritative newspaper punch headline (max 110 characters) that captures the core news angle immediately.',
    '2. ZERO MEANING CHANGE: Preserve 100% of the factual meaning, names, designations, dates, numbers, amounts, locations, and attributions from the source text. Never fabricate quotes, statistics, or claims not present in the source.',
    '3. FRESH ORIGINAL PROSE: Completely rewrite the sentences in clean, natural journalistic inverted-pyramid newspaper style so it is never a verbatim copy.',
    '4. COMPLETE MULTI-PARAGRAPH BODY: Produce 3 to 6 well-structured paragraphs separated by blank lines (\\n\\n).',
    `5. STRICT LANGUAGE: Write headline, shortDescription, bodyContent, and imageCaption strictly in ${targetLanguage}. Write district and state in standard English.`,
    '6. NEUTRAL ATTRIBUTION: Do not mention AI, bots, scraping, or source website branding inside the rewritten copy.',
  ].join('\n');

  const userPrompt = [
    `Target Language: ${targetLanguage} (${languageCode})`,
    `Target Beat Category: ${category}`,
    `Default Region Tag: ${regionTag || 'Pan-India'}`,
    `Wire Source Reference: ${sourceName}`,
    '',
    '--- ORIGINAL HEADLINE ---',
    originalTitle,
    '',
    '--- ORIGINAL SUMMARY ---',
    originalDescription || '(none)',
    '',
    '--- ORIGINAL BODY ---',
    String(bodyText || '').slice(0, maxInputChars),
  ].join('\n');

  try {
    const { result: parsed, keyLabel, model } = await pool.executeWithRotation(
      async ({ client, model: activeModel, thinkingConfig }) => {
        const config = {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          ...(thinkingConfig ? { thinkingConfig } : {}),
        };

        const response = await client.models.generateContent({
          model: activeModel,
          contents: userPrompt,
          config,
        });

        const rawText = stripJsonCodeFence(response.text);
        if (!rawText) {
          throw new Error('Model returned empty response');
        }

        return JSON.parse(rawText);
      }
    );

    const headline = String(parsed.headline || originalTitle).trim().slice(0, 220);
    const shortDescription = String(parsed.shortDescription || originalDescription || headline)
      .trim()
      .slice(0, 500);
    const bodyContent = String(parsed.bodyContent || bodyText).trim().slice(0, 15000);
    const district = String(parsed.district || regionTag || 'Pan-India').trim().slice(0, 80);
    const state = String(parsed.state || 'India').trim().slice(0, 80);
    const storyType = normalizeStoryType(parsed.storyType);
    const imageCaption = String(parsed.imageCaption || headline).trim().slice(0, 200);

    const wordCount = Math.max(
      60,
      bodyContent
        .split(/\s+/)
        .filter(Boolean).length
    );

    return {
      headline,
      shortDescription,
      bodyContent,
      district,
      state,
      storyType,
      imageCaption,
      wordCount,
      _meta: {
        keyLabel,
        model,
      },
    };
  } catch (err) {
    const wrapped = new Error(`Editorial rewrite failed: ${err?.message || err}`);
    if (err?.code) {
      wrapped.code = err.code;
    }
    throw wrapped;
  }
}
