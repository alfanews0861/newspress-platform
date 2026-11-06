/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 9 — Newspaper Section Management Service
 * Manages standard and publisher-configured newspaper sections, page ranges, and section assignments.
 */

import { NewspaperSection, StandardSectionCode } from '../types/editionWorkflow';

const STANDARD_SECTIONS: Omit<NewspaperSection, 'sectionId' | 'tenantId' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Front & Local', shortCode: 'LOCAL', displayOrder: 1, defaultPageRange: { startPage: 1, endPage: 2 }, status: 'ACTIVE' },
  { name: 'State & Regional', shortCode: 'STATE', displayOrder: 2, defaultPageRange: { startPage: 3, endPage: 4 }, status: 'ACTIVE' },
  { name: 'National Bureau', shortCode: 'NATIONAL', displayOrder: 3, defaultPageRange: { startPage: 5, endPage: 6 }, status: 'ACTIVE' },
  { name: 'International World', shortCode: 'INTERNATIONAL', displayOrder: 4, defaultPageRange: { startPage: 7, endPage: 8 }, status: 'ACTIVE' },
  { name: 'Politics & Governance', shortCode: 'POLITICS', displayOrder: 5, status: 'ACTIVE' },
  { name: 'Business & Markets', shortCode: 'BUSINESS', displayOrder: 6, status: 'ACTIVE' },
  { name: 'Sports Arena', shortCode: 'SPORTS', displayOrder: 7, status: 'ACTIVE' },
  { name: 'Education & Career', shortCode: 'EDUCATION', displayOrder: 8, status: 'ACTIVE' },
  { name: 'Crime & Justice', shortCode: 'CRIME', displayOrder: 9, status: 'ACTIVE' },
  { name: 'Culture & Arts', shortCode: 'CULTURE', displayOrder: 10, status: 'ACTIVE' },
  { name: 'Entertainment & Cinema', shortCode: 'ENTERTAINMENT', displayOrder: 11, status: 'ACTIVE' },
  { name: 'Agriculture & Rural', shortCode: 'AGRICULTURE', displayOrder: 12, status: 'ACTIVE' },
  { name: 'Editorial & Opinion', shortCode: 'OPINION', displayOrder: 13, status: 'ACTIVE' },
  { name: 'Classifieds & Notices', shortCode: 'CLASSIFIEDS', displayOrder: 14, status: 'ACTIVE' },
];

export class SectionManagementService {
  private static sectionStore: Map<string, NewspaperSection[]> = new Map(); // tenantId -> sections

  public static resetStore(): void {
    this.sectionStore.clear();
  }

  /**
   * Initializes standard sections for a tenant if not present
   */
  public static initializeTenantSections(tenantId: string): NewspaperSection[] {
    const existing = this.sectionStore.get(tenantId);
    if (existing && existing.length > 0) return existing;

    const now = new Date().toISOString();
    const sections: NewspaperSection[] = STANDARD_SECTIONS.map((s, idx) => ({
      ...s,
      sectionId: `sec-${tenantId}-${s.shortCode.toLowerCase()}`,
      tenantId,
      createdAt: now,
      updatedAt: now,
    }));

    this.sectionStore.set(tenantId, sections);
    return sections;
  }

  /**
   * Get all sections for a tenant
   */
  public static getSections(tenantId: string): NewspaperSection[] {
    let sections = this.sectionStore.get(tenantId);
    if (!sections || sections.length === 0) {
      sections = this.initializeTenantSections(tenantId);
    }
    return sections.filter((s) => s.status === 'ACTIVE').sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Get section by ID
   */
  public static getSection(tenantId: string, sectionId: string): NewspaperSection | undefined {
    const sections = this.getSections(tenantId);
    return sections.find((s) => s.sectionId === sectionId);
  }

  /**
   * Create custom section
   */
  public static createSection(
    tenantId: string,
    data: {
      name: string;
      shortCode: string;
      displayOrder?: number;
      defaultPageRange?: { startPage: number; endPage: number };
      defaultTemplateId?: string;
    }
  ): NewspaperSection {
    const sections = this.getSections(tenantId);
    const now = new Date().toISOString();
    const newSection: NewspaperSection = {
      sectionId: `sec-${tenantId}-${data.shortCode.toLowerCase()}-${Date.now()}`,
      tenantId,
      name: data.name,
      shortCode: data.shortCode.toUpperCase(),
      displayOrder: data.displayOrder ?? sections.length + 1,
      defaultPageRange: data.defaultPageRange,
      defaultTemplateId: data.defaultTemplateId,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    sections.push(newSection);
    this.sectionStore.set(tenantId, sections);
    return newSection;
  }

  /**
   * Update section details
   */
  public static updateSection(
    tenantId: string,
    sectionId: string,
    updates: Partial<Omit<NewspaperSection, 'sectionId' | 'tenantId' | 'createdAt'>>
  ): NewspaperSection | null {
    const sections = this.getSections(tenantId);
    const index = sections.findIndex((s) => s.sectionId === sectionId);
    if (index === -1) return null;

    const updated: NewspaperSection = {
      ...sections[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    sections[index] = updated;
    this.sectionStore.set(tenantId, sections);
    return updated;
  }
}
