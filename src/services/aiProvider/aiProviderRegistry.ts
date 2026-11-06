/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress AI Provider Registry & Prompt Manager
 * Phase 6 — Multi-Provider Registry & Prompt Schema Enforcement
 */

import { IAIEditorialProvider } from './types';
import { MockAIEditorialProvider } from './mockProvider';
import { GeminiAIEditorialProvider } from './geminiProvider';
import { AIModelTier, AIPromptTemplate, AIEditorialOutputType } from '../../types/editorialAi';

export class AIProviderRegistry {
  private static providers: Map<string, IAIEditorialProvider> = new Map();
  private static defaultProviderName: string = 'MockEditorialEngine';
  private static promptTemplates: Map<string, AIPromptTemplate> = new Map();

  static {
    this.registerProvider(new MockAIEditorialProvider());
    this.registerProvider(new GeminiAIEditorialProvider());
    this.initPromptTemplates();
  }

  public static registerProvider(provider: IAIEditorialProvider): void {
    this.providers.set(provider.providerName, provider);
  }

  public static getProvider(providerName?: string): IAIEditorialProvider {
    const name = providerName || this.defaultProviderName;
    const provider = this.providers.get(name);
    if (!provider) {
      return this.providers.get('MockEditorialEngine') || new MockAIEditorialProvider();
    }
    return provider;
  }

  public static setDefaultProvider(providerName: string): void {
    if (this.providers.has(providerName)) {
      this.defaultProviderName = providerName;
    }
  }

  public static getPromptTemplate(operation: AIEditorialOutputType): AIPromptTemplate {
    const tmpl = this.promptTemplates.get(operation);
    if (!tmpl) {
      return {
        promptId: `pmpt-${operation.toLowerCase()}-v1`,
        operation,
        version: '1.0.0',
        systemInstruction: 'You are a professional newspaper copy editor assisting human journalists.',
        outputSchema: {},
        active: true,
        createdAt: new Date().toISOString(),
      };
    }
    return tmpl;
  }

  private static initPromptTemplates(): void {
    const templates: AIPromptTemplate[] = [
      {
        promptId: 'pmpt-headline-v1',
        operation: 'HEADLINE_SUGGESTION',
        version: '1.2.0',
        systemInstruction: 'You are an experienced newspaper copy editor. Create accurate, high-impact headlines that strictly preserve all factual claims.',
        outputSchema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              headline: { type: 'string', maxLength: 120 },
              style: { type: 'string', enum: ['FORMAL', 'PUNCHY', 'DESCRIPTIVE', 'TABLOID'] },
            },
            required: ['headline', 'style'],
          },
        },
        active: true,
        createdAt: '2026-10-01T00:00:00.000Z',
      },
      {
        promptId: 'pmpt-summary-v1',
        operation: 'SUMMARY',
        version: '1.1.0',
        systemInstruction: 'Summarize news story accurately for executive brief and front page preview.',
        outputSchema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              targetWordCount: { type: 'number' },
              actualWordCount: { type: 'number' },
              summaryText: { type: 'string' },
            },
            required: ['targetWordCount', 'summaryText'],
          },
        },
        active: true,
        createdAt: '2026-10-01T00:00:00.000Z',
      },
      {
        promptId: 'pmpt-shorten-v1',
        operation: 'SHORTENED_COPY',
        version: '1.0.0',
        systemInstruction: 'Shorten news copy for column height constraint while preserving all key factual entities and inverted pyramid lead structure.',
        outputSchema: {
          type: 'object',
          properties: {
            suggestedBodyContent: { type: 'string' },
            reductionPercent: { type: 'number' },
          },
          required: ['suggestedBodyContent'],
        },
        active: true,
        createdAt: '2026-10-01T00:00:00.000Z',
      },
    ];

    for (const t of templates) {
      this.promptTemplates.set(t.operation, t);
    }
  }

  /**
   * Validate AI response schema
   */
  public static validateResponseSchema(operation: AIEditorialOutputType, output: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (output === null || output === undefined) {
      return { valid: false, errors: ['AI output is null or undefined.'] };
    }

    if (operation === 'HEADLINE_SUGGESTION') {
      if (!Array.isArray(output) || output.length === 0) {
        errors.push('Headline suggestion must return a non-empty array of options.');
      } else {
        for (const opt of output) {
          if (!opt.headline || typeof opt.headline !== 'string' || opt.headline.length < 3) {
            errors.push('Headline option missing valid headline string.');
          }
        }
      }
    } else if (operation === 'SUMMARY') {
      if (!Array.isArray(output) || output.length === 0) {
        errors.push('Summary must return an array of word-count options.');
      }
    } else if (operation === 'SHORTENED_COPY') {
      if (!output.suggestedBodyContent || typeof output.suggestedBodyContent !== 'string') {
        errors.push('Shortened copy must provide suggestedBodyContent string.');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
