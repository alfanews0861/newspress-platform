/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Reporter Profile Domain Model
 * Phase 2 — Reputation Foundation & Factual Metrics
 */

export type ReporterType = 'staff_reporter' | 'freelance_reporter';
export type ReporterVerificationStatus = 'unverified' | 'pending_review' | 'verified' | 'suspended';

export interface ReporterProfile {
  reporterId: string;
  personId: string;
  userId: string;
  tenantId: string; // Tenant ID or 'freelance_open' for independent reporters
  reporterType: ReporterType;
  byline: string;
  pressCardNumber?: string;
  pressCardIssuer?: string;
  pressCardExpiresAt?: string;
  beats: string[]; // e.g. ["Investigative", "Local Politics", "Financial Markets"]
  bio: string;
  portfolioUrl?: string;
  verificationStatus: ReporterVerificationStatus;
  originalityScore: number; // 0-100 algorithmically checked score
  articlesPublishedCount: number;
  marketplaceListingsCount: number;
  totalEarningsCents: number;
  availableBalanceCents: number;
  currency: string;

  // Phase 2 & 3 Factual Reputation Foundation (read-only to reporters; editorial/system modified only)
  originalFieldReports: number;
  verifiedOriginalReports: number;
  firstRecordedSubmissions: number;
  independentReports: number;
  duplicateReports: number;
  confirmedDuplicates: number;
  disputedReports: number;
  corrections: number;
  marketplaceSales: number;
  marketplaceRevenue: number;

  // Phase 8 Staff Reporter Management Extensions
  employmentType?: 'STAFF' | 'FREELANCE' | 'STRINGER' | 'CONTRIBUTOR';
  organizationId?: string;
  designation?: string;
  employeeCode?: string;
  joiningDate?: string;
  assignedDistricts?: string[];
  assignedBeats?: string[];
  assignedBureau?: string;
  editorIds?: string[];
  status?: 'ACTIVE' | 'SUSPENDED' | 'TRANSFERRED' | 'DEACTIVATED';

  createdAt: string;
  updatedAt: string;
}
