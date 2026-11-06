/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Mock AI Editorial Provider
 * Phase 6 — High-Fidelity Deterministic Provider for Offline, Tests, and Demo
 */

import {
  IAIEditorialProvider,
  CopyEditResult,
  ShortenCopyResult,
  RestructureResult,
  CaptionResult,
  SectionClassificationResult,
  PrioritySuggestionResult,
  PhotoSuggestionResult,
} from './types';
import { AIModelTier, HeadlineOption, SummaryOption } from '../../types/editorialAi';

export class MockAIEditorialProvider implements IAIEditorialProvider {
  public readonly providerName = 'MockEditorialEngine';

  public async generateHeadline(params: {
    originalHeadline: string;
    leadParagraph: string;
    category?: string;
    modelTier: AIModelTier;
    targetColumnCount?: number;
    promptVersion?: string;
  }): Promise<HeadlineOption[]> {
    const orig = params.originalHeadline.trim();
    const words = orig.split(' ');

    const optionA: HeadlineOption = {
      optionId: `hd-opt-a-${Date.now()}`,
      headline: orig.length > 50 ? orig.substring(0, 48) + '...' : orig,
      characterCount: orig.length,
      estimatedLines: Math.ceil(orig.length / 32),
      fitVerdict: orig.length <= 60 ? 'OPTIMAL' : 'TIGHT',
      style: 'FORMAL',
      factIntegrityStatus: 'PASSED',
    };

    const optionBText = words.length > 4
      ? `${words.slice(0, 4).join(' ')}: Key Developments Announced`
      : `${orig} — Official Report`;

    const optionB: HeadlineOption = {
      optionId: `hd-opt-b-${Date.now()}`,
      headline: optionBText,
      characterCount: optionBText.length,
      estimatedLines: Math.ceil(optionBText.length / 32),
      fitVerdict: optionBText.length <= 55 ? 'OPTIMAL' : 'TIGHT',
      style: 'PUNCHY',
      factIntegrityStatus: 'PASSED',
    };

    const optionCText = words.length > 6
      ? `${words.slice(0, 6).join(' ')} Under Review`
      : `${orig} Detailed Overview`;

    const optionC: HeadlineOption = {
      optionId: `hd-opt-c-${Date.now()}`,
      headline: optionCText,
      characterCount: optionCText.length,
      estimatedLines: Math.ceil(optionCText.length / 32),
      fitVerdict: 'OPTIMAL',
      style: 'DESCRIPTIVE',
      factIntegrityStatus: 'PASSED',
    };

    return [optionA, optionB, optionC];
  }

  public async generateSubheadline(params: {
    headline: string;
    leadParagraph: string;
    bodyContent: string;
    modelTier: AIModelTier;
    promptVersion?: string;
  }): Promise<string[]> {
    const leadSentences = params.leadParagraph.split(/[.!?]+/).filter(Boolean);
    const firstSentence = leadSentences[0]?.trim() || params.headline;

    return [
      `${firstSentence.substring(0, 80)}.`,
      `Key officials confirm strategic milestones as review concludes.`,
      `Comprehensive overview and regional implications for stakeholders.`,
    ];
  }

  public async summarize(params: {
    headline: string;
    leadParagraph: string;
    bodyContent: string;
    modelTier: AIModelTier;
    targetWordCounts?: Array<30 | 50 | 60 | 80>;
    promptVersion?: string;
  }): Promise<SummaryOption[]> {
    const targets = params.targetWordCounts || [30, 50, 60, 80];
    const words = [params.leadParagraph, params.bodyContent].join(' ').split(/\s+/).filter(Boolean);

    return targets.map((t) => {
      const sliceCount = Math.min(words.length, t);
      const summaryWords = words.slice(0, sliceCount);
      const text = summaryWords.join(' ') + (words.length > sliceCount ? '...' : '.');
      return {
        targetWordCount: t,
        actualWordCount: summaryWords.length,
        summaryText: text,
        keyPoints: [
          `Primary focus: ${params.headline}`,
          `Lead finding: ${words.slice(0, 8).join(' ')}`,
        ],
      };
    });
  }

  public async copyEdit(params: {
    headline: string;
    subheadline?: string;
    leadParagraph: string;
    bodyContent: string;
    category?: string;
    modelTier: AIModelTier;
    promptVersion?: string;
  }): Promise<CopyEditResult> {
    // Polish text without mutating factual figures or names
    const cleanedBody = params.bodyContent
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,;:!?])/g, '$1')
      .trim();

    return {
      suggestedHeadline: params.headline.trim(),
      suggestedSubheadline: params.subheadline?.trim(),
      suggestedLeadParagraph: params.leadParagraph.trim(),
      suggestedBodyContent: cleanedBody,
      changeSummary: 'Light copy-editing applied for typographical clarity and readability standard.',
      edits: [
        {
          type: 'PUNCTUATION',
          original: 'Multiple spacing and comma cadence',
          suggested: 'Standardized editorial spacing',
          reason: 'Conforms to broadsheet typography standards.',
        },
      ],
    };
  }

  public async shorten(params: {
    headline: string;
    bodyContent: string;
    currentWordCount: number;
    targetWordCount?: number;
    targetHeightReductionPercent?: number;
    modelTier: AIModelTier;
    promptVersion?: string;
  }): Promise<ShortenCopyResult> {
    const words = params.bodyContent.split(/\s+/).filter(Boolean);
    const target = params.targetWordCount || Math.round(words.length * (1 - (params.targetHeightReductionPercent || 25) / 100));
    const shortenedWords = words.slice(0, target);
    const shortenedText = shortenedWords.join(' ') + (words.length > target ? '.' : '');

    const reductionPercent = Math.round(((words.length - shortenedWords.length) / words.length) * 100);
    const expectedHeightReductionMm = Math.round((reductionPercent / 100) * 80);

    return {
      suggestedBodyContent: shortenedText,
      originalWordCount: words.length,
      suggestedWordCount: shortenedWords.length,
      reductionPercent,
      expectedHeightReductionMm,
      summary: `Trimmed ${words.length - shortenedWords.length} words from trailing paragraphs to achieve ${reductionPercent}% column height reduction.`,
    };
  }

  public async restructure(params: {
    headline: string;
    leadParagraph: string;
    bodyContent: string;
    category?: string;
    modelTier: AIModelTier;
    promptVersion?: string;
  }): Promise<RestructureResult> {
    const lead = params.leadParagraph.trim();
    const body = params.bodyContent.trim();

    return {
      restructuredHeadline: params.headline.toUpperCase(),
      invertedPyramidLead: lead,
      structuredBody: `[OVERVIEW]\n${lead}\n\n[BACKGROUND & DETAILS]\n${body}\n\n[FUTURE OUTLOOK]\nKey directives and regional implementation continue under editorial monitoring.`,
      sectionBreakdowns: ['Lead Overview', 'Key Evidence', 'Context & Outlook'],
    };
  }

  public async generateCaption(params: {
    headline: string;
    leadParagraph: string;
    imageContext?: string;
    modelTier: AIModelTier;
    promptVersion?: string;
  }): Promise<CaptionResult> {
    return {
      caption: `Official site documentation related to: ${params.headline.substring(0, 90)}.`,
      confidence: 0.92,
      identityConfirmationNeeded: false,
      notes: 'Generated strictly from verified article context.',
    };
  }

  public async classifySection(params: {
    headline: string;
    leadParagraph: string;
    bodyContent: string;
    modelTier: AIModelTier;
    promptVersion?: string;
  }): Promise<SectionClassificationResult> {
    const fullText = (params.headline + ' ' + params.leadParagraph).toLowerCase();

    let section = 'General News';
    let subcategory = 'Regional';

    if (fullText.includes('court') || fullText.includes('bench') || fullText.includes('justice') || fullText.includes('ruling')) {
      section = 'National & Judiciary';
      subcategory = 'Supreme Court';
    } else if (fullText.includes('transit') || fullText.includes('metro') || fullText.includes('train') || fullText.includes('subway') || fullText.includes('infrastructure')) {
      section = 'Infrastructure & Urban Transit';
      subcategory = 'Metropolitan Corridor';
    } else if (fullText.includes('business') || fullText.includes('market') || fullText.includes('cargo') || fullText.includes('port') || fullText.includes('commerce')) {
      section = 'Commerce & Trade';
      subcategory = 'Maritime & Shipping';
    } else if (fullText.includes('council') || fullText.includes('housing') || fullText.includes('mayor') || fullText.includes('ward')) {
      section = 'City Hall';
      subcategory = 'Municipal Affairs';
    }

    return {
      suggestedSection: section,
      suggestedSubcategory: subcategory,
      confidence: 0.94,
      alternativeSections: ['Front Page (A1)', 'State & Regional', 'Special Report'],
    };
  }

  public async suggestPriority(params: {
    headline: string;
    leadParagraph: string;
    bodyContent: string;
    category?: string;
    breakingStatus?: boolean;
    modelTier: AIModelTier;
    promptVersion?: string;
  }): Promise<PrioritySuggestionResult> {
    if (params.breakingStatus) {
      return {
        suggestedPriority: 'LEAD',
        reason: 'Breaking news flag active with high regional urgency.',
        priorityScore: 95,
      };
    }

    const wordCount = (params.bodyContent || '').split(/\s+/).length;
    if (wordCount > 800) {
      return {
        suggestedPriority: 'LEAD',
        reason: 'Substantial investigative depth and high public impact.',
        priorityScore: 88,
      };
    } else if (wordCount > 500) {
      return {
        suggestedPriority: 'SECONDARY_LEAD',
        reason: 'Strong narrative weight suitable for second lead column.',
        priorityScore: 78,
      };
    } else if (wordCount > 300) {
      return {
        suggestedPriority: 'FEATURE',
        reason: 'Standard article depth.',
        priorityScore: 65,
      };
    } else {
      return {
        suggestedPriority: 'BRIEF',
        reason: 'Concise dispatch suitable for briefs sidebar.',
        priorityScore: 45,
      };
    }
  }

  public async suggestPhoto(params: {
    headline: string;
    leadParagraph: string;
    availablePhotos: Array<{ photoId: string; caption?: string; width: number; height: number; tags?: string[] }>;
    modelTier: AIModelTier;
    promptVersion?: string;
  }): Promise<PhotoSuggestionResult> {
    if (!params.availablePhotos || params.availablePhotos.length === 0) {
      return {
        selectedPhotoId: '',
        rankScore: 0,
        rationale: 'No photo candidates provided.',
        suggestedPlacement: 'inline',
      };
    }

    // Pick highest resolution landscape photo first
    const sorted = [...params.availablePhotos].sort((a, b) => {
      const aLandscape = a.width > a.height ? 1 : 0;
      const bLandscape = b.width > b.height ? 1 : 0;
      if (aLandscape !== bLandscape) return bLandscape - aLandscape;
      return b.width * b.height - a.width * a.height;
    });

    const chosen = sorted[0];
    return {
      selectedPhotoId: chosen.photoId,
      rankScore: 92,
      rationale: `Optimal resolution (${chosen.width}x${chosen.height}) with broadsheet lead aspect ratio.`,
      suggestedPlacement: 'hero',
    };
  }
}
