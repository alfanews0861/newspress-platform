/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Fact Integrity Service
 * Phase 6 — Factual Diff & Integrity Verification Engine
 * 
 * Compares original content / FactLedger vs AI suggestion to detect:
 * - Changed number or currency amount
 * - Changed date or time
 * - Changed person or official organization
 * - Changed location
 * - Altered or fabricated quotation
 * - Removed required reporter / agency attribution
 * 
 * Flags discrepancies for mandatory human editor review.
 */

import {
  FactDiscrepancy,
  FactDiscrepancyType,
  FactIntegrityReport,
  FactIntegrityStatus,
  FactLedger,
} from '../types/editorialAi';

export class FactIntegrityService {
  /**
   * Verify an AI suggestion against the authoritative FactLedger
   */
  public static verifySuggestionIntegrity(params: {
    ledger: FactLedger;
    originalText: string;
    suggestedText: string;
    originalByline?: string;
    suggestedByline?: string;
    originalCategory?: string;
  }): FactIntegrityReport {
    const discrepancies: FactDiscrepancy[] = [];
    const suggestedLower = params.suggestedText.toLowerCase();

    // 1. Check Quotations (Zero tolerance for altered or fabricated quotes)
    const quoteEntities = params.ledger.entities.filter((e) => e.entityType === 'QUOTATION');
    const originalQuotesNormalized = quoteEntities.map((q) => q.value.toLowerCase().replace(/[\s"“”']/g, ''));
    
    // Look for quotation marks in suggested text
    const suggestedQuoteMatches = params.suggestedText.match(/["“']([^"“”']{8,300})["”']/g);
    if (suggestedQuoteMatches && suggestedQuoteMatches.length > 0) {
      for (const sq of suggestedQuoteMatches) {
        const normalizedSuggestedQuote = sq.toLowerCase().replace(/[\s"“”']/g, '');
        
        let foundMatch = false;
        for (let i = 0; i < quoteEntities.length; i++) {
          const q = quoteEntities[i];
          const normOrig = originalQuotesNormalized[i];
          
          if (
            normOrig === normalizedSuggestedQuote ||
            normOrig.includes(normalizedSuggestedQuote) ||
            normalizedSuggestedQuote.includes(normOrig) ||
            this.calculateSimilarity(normOrig, normalizedSuggestedQuote) > 0.40
          ) {
            foundMatch = true;
            // Check if words inside the quotation were altered
            if (normOrig !== normalizedSuggestedQuote && normalizedSuggestedQuote.length > 10) {
              discrepancies.push({
                discrepancyType: 'CHANGED_QUOTE',
                entityType: 'QUOTATION',
                originalValue: q.value,
                suggestedValue: sq,
                severity: 'CRITICAL',
                description: `Quoted statement was altered inside quotation marks: "${q.value}" vs "${sq}"`,
              });
            }
            break;
          }
        }

        // If a quotation is present in suggested text but doesn't exist in original at all
        if (!foundMatch && normalizedSuggestedQuote.length > 10) {
          discrepancies.push({
            discrepancyType: 'CHANGED_QUOTE',
            entityType: 'QUOTATION',
            originalValue: quoteEntities[0]?.value || 'No original quotation present',
            suggestedValue: sq,
            severity: 'CRITICAL',
            description: `Fabricated or altered quotation introduced: ${sq}`,
          });
        }
      }
    }

    // 2. Check Numbers and Currency Amounts
    const numericEntities = params.ledger.entities.filter((e) => e.entityType === 'NUMBER' || e.entityType === 'CURRENCY' || e.entityType === 'PERCENTAGE');
    
    // Extract numbers in suggested text to find foreign/changed numbers
    const suggestedNumbers: string[] = params.suggestedText.match(/\b\d+(?:,\d+)*(?:\.\d+)?\b/g) || [];
    const originalNumbers: string[] = params.originalText.match(/\b\d+(?:,\d+)*(?:\.\d+)?\b/g) || [];

    for (const num of suggestedNumbers) {
      // If the suggested number wasn't anywhere in original text, check if it was altered
      if (!originalNumbers.includes(num)) {
        // If it's a 4-digit year (e.g. 19xx, 20xx), handle it as a date discrepancy
        if (/^(?:19|20)\d{2}$/.test(num)) {
          discrepancies.push({
            discrepancyType: 'CHANGED_DATE',
            entityType: 'DATE',
            originalValue: 'Original date/year in source text',
            suggestedValue: num,
            severity: 'CRITICAL',
            description: `Date/year was altered or new year ${num} was introduced.`,
          });
          continue;
        }

        // Find closest number in original
        const closestOriginal = originalNumbers.find((o) => Math.abs(parseFloat(o.replace(/,/g, '')) - parseFloat(num.replace(/,/g, ''))) < 100);
        discrepancies.push({
          discrepancyType: num.includes('$') || num.includes('₹') ? 'CHANGED_AMOUNT' : 'CHANGED_NUMBER',
          entityType: 'NUMBER',
          originalValue: closestOriginal || 'Not present in original',
          suggestedValue: num,
          severity: 'CRITICAL',
          description: `AI suggested text contains a numerical figure (${num}) not present in the original source text (${closestOriginal || 'none'}).`,
        });
      }
    }

    // 3. Check Dates and Times
    const dateEntities = params.ledger.entities.filter((e) => e.entityType === 'DATE' || e.entityType === 'TIME');
    for (const d of dateEntities) {
      // If a specific year or day was in original, check if a conflicting date is introduced
      const yearMatch = d.value.match(/\b(?:19|20)\d{2}\b/);
      if (yearMatch) {
        const origYear = yearMatch[0];
        const suggestedYears = params.suggestedText.match(/\b(?:19|20)\d{2}\b/g) || [];
        for (const sy of suggestedYears) {
          if (sy !== origYear && !params.originalText.includes(sy)) {
            discrepancies.push({
              discrepancyType: 'CHANGED_DATE',
              entityType: 'DATE',
              originalValue: d.value,
              suggestedValue: sy,
              severity: 'CRITICAL',
              description: `Date/year was altered from ${origYear} to ${sy}.`,
            });
          }
        }
      }
    }

    // 4. Check Key Persons and Official Titles
    const personEntities = params.ledger.entities.filter((e) => e.entityType === 'PERSON');
    // If original named specific individuals, verify AI did not swap them with hallucinated names
    for (const p of personEntities) {
      const surname = p.value.split(' ').slice(-1)[0];
      if (params.originalText.includes(p.value) && !suggestedLower.includes(p.normalizedValue) && !suggestedLower.includes(surname.toLowerCase())) {
        // Name removed or altered
        if (params.suggestedText.length > 40) { // Flag in story copy, summary, or paragraph
          discrepancies.push({
            discrepancyType: 'CHANGED_PERSON',
            entityType: 'PERSON',
            originalValue: p.value,
            suggestedValue: 'Omitted / Replaced',
            severity: 'WARNING',
            description: `Key person entity "${p.value}" was omitted or altered in AI rewrite.`,
          });
        }
      }
    }

    // 5. Check Key Locations
    const locationEntities = params.ledger.entities.filter((e) => e.entityType === 'LOCATION');
    for (const loc of locationEntities) {
      if (!suggestedLower.includes(loc.normalizedValue) && params.suggestedText.length > 40) {
        discrepancies.push({
          discrepancyType: 'CHANGED_LOCATION',
          entityType: 'LOCATION',
          originalValue: loc.value,
          suggestedValue: 'Omitted / Replaced',
          severity: 'INFO',
          description: `Location reference "${loc.value}" may have been simplified or omitted.`,
        });
      }
    }

    // 6. Attribution Preservation Check
    if (params.originalByline) {
      if (params.suggestedByline && params.suggestedByline !== params.originalByline) {
        discrepancies.push({
          discrepancyType: 'REMOVED_ATTRIBUTION',
          entityType: 'PERSON',
          originalValue: params.originalByline,
          suggestedValue: params.suggestedByline,
          severity: 'CRITICAL',
          description: `Reporter byline attribution was modified: "${params.originalByline}" vs "${params.suggestedByline}".`,
        });
      }
    }

    // Determine Status
    const hasCritical = discrepancies.some((d) => d.severity === 'CRITICAL');
    const hasWarning = discrepancies.some((d) => d.severity === 'WARNING');

    let status: FactIntegrityStatus = 'PASSED';
    if (hasCritical) {
      status = 'CRITICAL_DISCREPANCY';
    } else if (hasWarning || discrepancies.length > 0) {
      status = 'FLAGGED_FOR_EDITOR';
    }

    const confidenceScore = Math.max(0, 100 - discrepancies.length * 15);

    return {
      status,
      passed: status === 'PASSED',
      discrepancies,
      confidenceScore,
      checkedAt: new Date().toISOString(),
      details: discrepancies.length === 0
        ? 'Fact integrity verified. No entity discrepancies detected.'
        : `${discrepancies.length} entity discrepancies detected and flagged for editor review.`,
    };
  }

  /**
   * Helper to calculate simple string similarity ratio (0 to 1)
   */
  private static calculateSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;
    if (!s1 || !s2) return 0.0;
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) matches++;
    }
    return matches / longer.length;
  }
}
