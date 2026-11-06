/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 9 — Publisher Edition Management, Content Planning & Workflow Types
 * Bridges newsroom editorial production with newspaper layout and night press finalization.
 */

import { StoryLayoutRole, StoryLayoutPriority, NewspaperPage, ArticlePlacement, AdvertisementPlacement } from './edition';
import { NewsArticle } from './news';
import { NewsLicense } from './marketplace';

export type ConfigurableEditionType =
  | 'MORNING'
  | 'EVENING'
  | 'SPECIAL'
  | 'SUNDAY'
  | 'WEEKLY'
  | 'SUPPLEMENT'
  | 'EMERGENCY_REPRINT'
  | string;

export type EditionLifecycleState =
  | 'PLANNED'
  | 'OPEN'
  | 'CONTENT_COLLECTION'
  | 'DESIGNING'
  | 'EDITORIAL_REVIEW'
  | 'READY_TO_FINALIZE'
  | 'FINALIZED'
  | 'IN_PRODUCTION'
  | 'READY'
  | 'PUBLISHED'
  | 'CANCELLED'
  | 'SUPERSEDED';

export type EditionContentSourceType =
  | 'IN_HOUSE'
  | 'STAFF_REPORTER'
  | 'FREELANCE_REPORTER'
  | 'MARKETPLACE_PURCHASE'
  | 'EDITORIAL'
  | 'AGENCY'
  | 'SPECIAL';

export type EditionStoryPriority =
  | 'FRONT_PAGE_LEAD'
  | 'FRONT_PAGE_SECONDARY'
  | 'SECTION_LEAD'
  | 'FEATURE'
  | 'STANDARD'
  | 'BRIEF'
  | 'FILLER';

export type StoryWithdrawalReason =
  | 'FACTUAL_CORRECTION'
  | 'LEGAL_REVIEW'
  | 'DUPLICATE'
  | 'SOURCE_WITHDRAWAL'
  | 'LICENSING'
  | 'EDITORIAL_CHANGE'
  | 'BREAKING_UPDATE'
  | 'OTHER';

export type ContentReservationStatus =
  | 'RESERVED'
  | 'PLACED'
  | 'RELEASED'
  | 'EXPIRED';

export type StandardSectionCode =
  | 'LOCAL'
  | 'STATE'
  | 'NATIONAL'
  | 'INTERNATIONAL'
  | 'POLITICS'
  | 'BUSINESS'
  | 'SPORTS'
  | 'EDUCATION'
  | 'CRIME'
  | 'CULTURE'
  | 'ENTERTAINMENT'
  | 'AGRICULTURE'
  | 'OPINION'
  | 'CLASSIFIEDS';

export interface NewspaperSection {
  sectionId: string;
  tenantId: string;
  name: string;
  shortCode: StandardSectionCode | string;
  displayOrder: number;
  defaultPageRange?: {
    startPage: number;
    endPage: number;
  };
  defaultTemplateId?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface EditionContentReservation {
  reservationId: string;
  tenantId: string;
  editionId: string;
  newsId: string;
  sourceType: EditionContentSourceType;
  reservedBy: string;
  reservedAt: string;
  expiresAt: string;
  status: ContentReservationStatus;
  pageIntent?: number;
  sectionIntent?: string;
  priority: EditionStoryPriority;
  bylineCredit?: string;
  licenseId?: string;
  sourceReporterId?: string;
  sourceOrganizationId?: string;
}

export interface EditionAdvertisementReservation {
  reservationId: string;
  tenantId: string;
  editionId: string;
  advertisementId: string;
  pageNumber: number;
  zoneId: string;
  priority: number;
  reservedBy: string;
  sponsorName: string;
  rateCents?: number;
  dimensions?: {
    columnStart: number;
    columnSpan: number;
    rowStart: number;
    rowSpan: number;
  };
  isCommerciallyLocked: boolean;
  lockedBy?: string;
  lockedAt?: string;
  status: 'RESERVED' | 'PLACED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface EditionPagePlan {
  pagePlanId: string;
  tenantId: string;
  editionId: string;
  pageNumber: number;
  sectionId?: string;
  sectionName?: string;
  templateId: string;
  reservedAdAreaPercent: number;
  targetContentAreaPercent: number;
  storyIds: string[];
  status: 'PLANNED' | 'CONTENT_ASSIGNED' | 'LAYOUT_READY' | 'DESIGNING' | 'REVIEW' | 'APPROVED';
  isPageLocked?: boolean;
  lockedBy?: string;
  lockedAt?: string;
}

export type ContentVersionChangeReason =
  | 'CONTENT_ADDED'
  | 'CONTENT_REMOVED'
  | 'HEADLINE_CHANGED'
  | 'IMAGE_CHANGED'
  | 'SECTION_CHANGED'
  | 'PAGE_MOVED'
  | 'BREAKING_NEWS_INSERTED'
  | 'ADVERTISEMENT_CHANGED'
  | 'LAYOUT_REBALANCED'
  | 'EDITORIAL_LOCK_TOGGLED'
  | 'INITIAL_PLAN';

export interface EditionContentVersion {
  versionId: string;
  version: number;
  editionId: string;
  tenantId: string;
  contentSnapshot: {
    storyReservations: EditionContentReservation[];
    adReservations: EditionAdvertisementReservation[];
    pagePlans: EditionPagePlan[];
    pagesSummary: {
      pageNumber: number;
      storyCount: number;
      adCount: number;
      isLocked: boolean;
    }[];
  };
  createdBy: string;
  reason: ContentVersionChangeReason;
  notes?: string;
  createdAt: string;
}

export interface ReadinessCategoryScore {
  scorePercent: number; // 0 - 100
  status: 'PASS' | 'WARNING' | 'BLOCKING';
  itemsChecked: number;
  passedCount: number;
  blockingIssues: {
    id: string;
    source: string;
    description: string;
    targetRef?: string;
    pageNumber?: number;
    storyId?: string;
    adId?: string;
  }[];
  warnings: {
    id: string;
    source: string;
    description: string;
    targetRef?: string;
    pageNumber?: number;
    storyId?: string;
  }[];
}

export interface EditionReadinessResult {
  editionId: string;
  overallStatus: 'READY' | 'READY_WITH_WARNINGS' | 'BLOCKED';
  overallScorePercent: number;
  evaluatedAt: string;
  categories: {
    content: ReadinessCategoryScore;
    advertising: ReadinessCategoryScore;
    editorial: ReadinessCategoryScore;
    layout: ReadinessCategoryScore;
    licensing: ReadinessCategoryScore;
  };
  canApproveForFinalize: boolean;
  blockersCount: number;
  warningsCount: number;
}

export interface ContentPoolStory {
  article: NewsArticle;
  sourceType: EditionContentSourceType;
  isEligible: boolean;
  ineligibilityReason?: string;
  suggestedPriority: EditionStoryPriority;
  suggestedSection?: string;
  license?: NewsLicense;
  attribution: {
    creditLine: string;
    sourceType: EditionContentSourceType;
    reporterName?: string;
    agencyName?: string;
    isDerivativeAllowed: boolean;
  };
  reservation?: EditionContentReservation;
}

export interface CreateEditionDto {
  tenantId: string;
  brandId: string;
  templateId: string;
  editionType: ConfigurableEditionType;
  editionCode?: string;
  editionDate: string; // YYYY-MM-DD
  publicationDate: string;
  publicationTimezone: string;
  pageCount: number;
  contentDeadline: string; // ISO 8601
  printDeadline: string; // ISO 8601
  createdBy: string;
  issueNumber?: number;
  volumeNumber?: number;
}
