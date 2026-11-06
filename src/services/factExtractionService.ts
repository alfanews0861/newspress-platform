/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Fact Extraction Service
 * Phase 6 — Fact Preservation & Entity Extraction Engine
 * 
 * Extracts high-fidelity factual entities (names, numbers, currency, dates, quotations, official titles)
 * to build an immutable FactLedger before any AI editorial transformation is performed.
 */

import { FactEntity, FactEntityType, FactLedger } from '../types/editorialAi';

export class FactExtractionService {
  /**
   * Extract all factual entities from text and return a FactLedger
   */
  public static extractFactLedger(params: {
    tenantId: string;
    newsId: string;
    versionId: string;
    headline: string;
    subheadline?: string;
    leadParagraph: string;
    bodyContent: string;
  }): FactLedger {
    const fullText = [
      params.headline,
      params.subheadline || '',
      params.leadParagraph,
      params.bodyContent,
    ].filter(Boolean).join('\n\n');

    const entities: FactEntity[] = [];
    let entityCounter = 1;

    const addEntity = (type: FactEntityType, val: string, rawText: string, confidence: number = 0.95) => {
      const trimmed = val.trim();
      if (!trimmed || trimmed.length < 1) return;

      // Avoid exact duplicates in the ledger for the same entity type
      const normalized = trimmed.toLowerCase();
      if (entities.some((e) => e.entityType === type && e.normalizedValue === normalized)) {
        return;
      }

      entities.push({
        entityId: `fact-${params.newsId}-${entityCounter++}`,
        entityType: type,
        value: trimmed,
        normalizedValue: normalized,
        sourceText: rawText.substring(0, 150),
        confidence,
      });
    };

    // 1. Extract Direct Quotations (e.g. "...", “...”, '...')
    const quoteRegex = /["“']([^"“”']{8,300})["”']/g;
    let match: RegExpExecArray | null;
    while ((match = quoteRegex.exec(fullText)) !== null) {
      addEntity('QUOTATION', match[1], match[0], 0.98);
    }

    // 2. Extract Currency Amounts (₹, $, €, £, Rs., INR, USD, Crore, Lakh, Billion, Million)
    const currencyRegex = /(?:₹|\$|€|£|Rs\.?|INR|USD)\s*\d+(?:,\d+)*(?:\.\d+)?(?:\s*(?:crore|lakh|billion|million|k|thousand|bn|m))?|\b\d+(?:,\d+)*(?:\.\d+)?\s*(?:crore|lakh|billion|million)\s*(?:rupees|dollars|euros|inr|usd)?/gi;
    while ((match = currencyRegex.exec(fullText)) !== null) {
      addEntity('CURRENCY', match[0], match[0], 0.99);
    }

    // 3. Extract Percentages
    const percentRegex = /\b\d+(?:\.\d+)?\s*(?:%|percent|percentage points)\b/gi;
    while ((match = percentRegex.exec(fullText)) !== null) {
      addEntity('PERCENTAGE', match[0], match[0], 0.99);
    }

    // 4. Extract Numbers and Quantities (integers, floats, counts, distances, ordinals)
    const numberRegex = /\b\d+(?:,\d+)*(?:\.\d+)?(?:\s*(?:km|miles|meters|hectares|acres|kg|tons|MW|GW|litres|gallons|passengers|votes|seats|berths|arteries|judges|hours|days|weeks|months|years))?\b/gi;
    while ((match = numberRegex.exec(fullText)) !== null) {
      const val = match[0];
      // Skip if it is already captured as currency or percentage
      if (!val.includes('$') && !val.includes('₹') && !val.includes('%')) {
        addEntity('NUMBER', val, val, 0.94);
      }
    }

    // 5. Extract Dates and Times (e.g. October 2026, October 4 2026, 04/10/2026, Friday, etc.)
    const dateRegex = /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b|\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\s+\d{1,2}(?:st|nd|rd|th)?)?(?:,?\s*(?:19|20)\d{2})?\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:19|20)\d{2}\b/gi;
    while ((match = dateRegex.exec(fullText)) !== null) {
      addEntity('DATE', match[0], match[0], 0.96);
    }

    const timeRegex = /\b\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM|hrs|IST|GMT|UTC)\b/g;
    while ((match = timeRegex.exec(fullText)) !== null) {
      addEntity('TIME', match[0], match[0], 0.95);
    }

    // 6. Extract Official Titles & Positions
    const titleRegex = /\b(?:Chief Minister|Prime Minister|Supreme Court|High Court|Judge|Justice|Minister|Governor|President|Director General|Commissioner|Secretary|Mayor|CEO|Chairman|Spokesperson|Counsel)\b(?:\s+[A-Z][a-z]+)*/g;
    while ((match = titleRegex.exec(fullText)) !== null) {
      addEntity('OFFICIAL_TITLE', match[0], match[0], 0.92);
    }

    // 7. Extract People (Honorifics and Capitalized full names)
    const personRegex = /\b(?:Mr\.|Ms\.|Mrs\.|Dr\.|Prof\.|Justice|Judge|Sri|Shri|Smt\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)|\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g;
    while ((match = personRegex.exec(fullText)) !== null) {
      const name = match[1] || match[2];
      // Exclude common starting stop words or months
      const stopWords = ['The', 'A', 'An', 'In', 'On', 'After', 'Before', 'During', 'Under', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'Supreme Court', 'High Court', 'City Council'];
      if (!stopWords.includes(name) && name.split(' ').length >= 2) {
        addEntity('PERSON', name, match[0], 0.88);
      }
    }

    // 8. Extract Known Organizations & Institutions
    const orgRegex = /\b(?:Supreme Court|High Court|Municipal Corporation|City Council|Port Authority|Water Board|Transit Authority|Railways?|Police|Commission|Department|Corporation|Board|Ministry|University|Hospital|Bank|Apex Industrial|Metropolitan|Council)\b/gi;
    while ((match = orgRegex.exec(fullText)) !== null) {
      addEntity('ORGANIZATION', match[0], match[0], 0.90);
    }

    // 9. Extract Locations / Districts / States / Cities
    const locationRegex = /\b(?:Hyderabad|Secunderabad|Amaravati|Vijayawada|Visakhapatnam|Tirupati|Bengaluru|Bangalore|Chennai|Mumbai|Delhi|Kolkata|Telangana|Andhra Pradesh|Karnataka|Tamil Nadu|Maharashtra|India|Guntur|Krishna|Godavari|Khammam|Warangal)\b/gi;
    while ((match = locationRegex.exec(fullText)) !== null) {
      addEntity('LOCATION', match[0], match[0], 0.95);
    }

    return {
      ledgerId: `ledger-${params.newsId}-${Date.now()}`,
      tenantId: params.tenantId,
      newsId: params.newsId,
      versionId: params.versionId,
      entities,
      extractedAt: new Date().toISOString(),
      totalEntities: entities.length,
    };
  }
}
