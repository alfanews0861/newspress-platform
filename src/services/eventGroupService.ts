/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Real-World Event & Story Grouping Service
 * Phase 2 — News Submission & Reporter Originality Engine
 * 
 * Core Concept:
 * Two journalists independently covering the same real-world event (e.g., an accident in Nellore)
 * does NOT constitute plagiarism. The platform structures multiple independent reports
 * under a shared Event Group while preserving distinct attribution, timestamps, and evidence.
 * 
 * Breaking Story Lock:
 * When an event is locked by editorial triage as breaking, subsequent reporters are notified
 * but actively encouraged to contribute independent angles, new photographs, or official updates.
 */

import { EventGroup } from '../types/originality';

export interface CreateEventGroupInput {
  tenantId: string;
  title: string;
  summary: string;
  category: string;
  district: string;
  state: string;
  location: string;
  firstReportedAt: string;
  firstSubmissionId: string;
  firstReporterId: string;
  firstReporterName: string;
  initialArticleId: string;
}

export class EventGroupService {
  /**
   * Matches whether a new story likely relates to an existing Event Group based on
   * location, district, category, and date proximity.
   */
  findPotentialEventGroup(
    story: { location?: string; district?: string; category: string; headline: string },
    groups: EventGroup[]
  ): EventGroup | null {
    if (!story.district && !story.location) return null;

    const storyLocation = (story.location || '').toLowerCase();
    const storyDistrict = (story.district || '').toLowerCase();
    const storyCat = story.category.toLowerCase();

    for (const group of groups) {
      if (group.status !== 'active') continue;

      const groupDistrict = group.district.toLowerCase();
      const groupLocation = group.location.toLowerCase();
      const groupCat = group.category.toLowerCase();

      // Check category and geography alignment
      const isGeoMatch =
        (storyDistrict && groupDistrict && storyDistrict === groupDistrict) ||
        (storyLocation && groupLocation && groupLocation.includes(storyLocation));

      if (isGeoMatch && (storyCat === groupCat || group.title.toLowerCase().includes(storyLocation))) {
        return group;
      }
    }

    return null;
  }

  /**
   * Creates a new Event Group for a story.
   */
  createEventGroup(input: CreateEventGroupInput): EventGroup {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      eventId,
      tenantId: input.tenantId,
      title: input.title,
      summary: input.summary,
      category: input.category,
      district: input.district,
      state: input.state,
      location: input.location,
      firstReportedAt: input.firstReportedAt,
      firstSubmissionId: input.firstSubmissionId,
      firstReporterId: input.firstReporterId,
      firstReporterName: input.firstReporterName,
      reportCount: 1,
      submissionIds: [input.firstSubmissionId],
      articleIds: [input.initialArticleId],
      isBreakingStoryLocked: false,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Adds an independent or secondary report to an existing Event Group.
   */
  addReportToEventGroup(group: EventGroup, submissionId: string, articleId: string): EventGroup {
    const updatedSubmissions = Array.from(new Set([...group.submissionIds, submissionId]));
    const updatedArticles = Array.from(new Set([...group.articleIds, articleId]));

    return {
      ...group,
      submissionIds: updatedSubmissions,
      articleIds: updatedArticles,
      reportCount: updatedSubmissions.length,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Toggles the Breaking Story Lock on an event group.
   */
  toggleBreakingStoryLock(
    group: EventGroup,
    isLocked: boolean,
    editorId: string,
    reason?: string
  ): EventGroup {
    return {
      ...group,
      isBreakingStoryLocked: isLocked,
      breakingLockSetBy: isLocked ? editorId : undefined,
      breakingLockSetAt: isLocked ? new Date().toISOString() : undefined,
      breakingLockReason: isLocked ? (reason || 'Breaking news verification lock active') : undefined,
      updatedAt: new Date().toISOString()
    };
  }
}

export const eventGroupService = new EventGroupService();
