/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 8 — Newsroom Desks, Beats & Taxonomy Management
 */

import { NewsroomDesk, NewsBeat, ReporterBeatAssignment, ReporterDistrictAssignment } from '../types/newsroom';
import { auditService } from './auditService';

const deskStore: Map<string, NewsroomDesk> = new Map();
const beatStore: Map<string, NewsBeat> = new Map();
const beatAssignmentStore: Map<string, ReporterBeatAssignment> = new Map();
const districtAssignmentStore: Map<string, ReporterDistrictAssignment> = new Map();

export class NewsroomDeskService {
  public static resetStore(): void {
    deskStore.clear();
    beatStore.clear();
    beatAssignmentStore.clear();
    districtAssignmentStore.clear();
  }

  public static seedDefaultDesksAndBeats(tenantId: string): void {
    if (Array.from(deskStore.values()).some((d) => d.tenantId === tenantId)) return;

    const now = new Date().toISOString();

    const defaultDesks: NewsroomDesk[] = [
      {
        deskId: `desk_${tenantId}_city`,
        tenantId,
        name: 'City & Metro Desk',
        description: 'Local government, municipal services, and borough affairs.',
        section: 'City',
        editorIds: ['user-news-editor'],
        reporterIds: ['user-sofia-chen'],
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
      {
        deskId: `desk_${tenantId}_crime`,
        tenantId,
        name: 'Crime & Courts Desk',
        description: 'Law enforcement, judicial hearings, and public safety.',
        section: 'Crime',
        editorIds: ['user-editor-chief'],
        reporterIds: ['user-marcus-vance'],
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
      {
        deskId: `desk_${tenantId}_investigative`,
        tenantId,
        name: 'Special Investigations Desk',
        description: 'In-depth investigative reports, accountability, and public records.',
        section: 'Investigative',
        editorIds: ['user-editor-chief', 'user-news-editor'],
        reporterIds: ['user-sofia-chen', 'user-marcus-vance'],
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
    ];

    defaultDesks.forEach((d) => deskStore.set(d.deskId, d));

    const defaultBeats: NewsBeat[] = [
      { beatId: `beat_${tenantId}_politics`, tenantId, name: 'Politics', description: 'Elections & Council', category: 'Government', createdAt: now, updatedAt: now },
      { beatId: `beat_${tenantId}_crime`, tenantId, name: 'Crime & Law', description: 'Courts & Police', category: 'Public Safety', createdAt: now, updatedAt: now },
      { beatId: `beat_${tenantId}_transit`, tenantId, name: 'Transit & Infrastructure', description: 'Subways, Roads & Infra', category: 'Civic', createdAt: now, updatedAt: now },
      { beatId: `beat_${tenantId}_business`, tenantId, name: 'Business & Economy', description: 'Commerce & Markets', category: 'Finance', createdAt: now, updatedAt: now },
    ];

    defaultBeats.forEach((b) => beatStore.set(b.beatId, b));
  }

  public static async createDesk(input: {
    tenantId: string;
    name: string;
    description: string;
    section: string;
    editorIds?: string[];
    reporterIds?: string[];
    actorId: string;
    actorName: string;
  }): Promise<NewsroomDesk> {
    const now = new Date().toISOString();
    const deskId = `desk_${input.tenantId}_${Date.now()}`;

    const desk: NewsroomDesk = {
      deskId,
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      section: input.section,
      editorIds: input.editorIds || [],
      reporterIds: input.reporterIds || [],
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    deskStore.set(deskId, desk);

    await auditService.log({
      tenantId: input.tenantId,
      actorId: input.actorId,
      actorName: input.actorName,
      actorRole: 'admin',
      action: 'DESK_CREATED',
      entityType: 'NewsroomDesk',
      entityId: deskId,
      newState: desk,
    });

    return desk;
  }

  public static async createBeat(input: {
    tenantId: string;
    name: string;
    description: string;
    category?: string;
    actorId: string;
    actorName: string;
  }): Promise<NewsBeat> {
    const now = new Date().toISOString();
    const beatId = `beat_${input.tenantId}_${Date.now()}`;

    const beat: NewsBeat = {
      beatId,
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      category: input.category || 'General',
      createdAt: now,
      updatedAt: now,
    };

    beatStore.set(beatId, beat);

    await auditService.log({
      tenantId: input.tenantId,
      actorId: input.actorId,
      actorName: input.actorName,
      actorRole: 'editor',
      action: 'BEAT_CREATED',
      entityType: 'NewsBeat',
      entityId: beatId,
      newState: beat,
    });

    return beat;
  }

  public static async assignReporterToBeat(input: {
    tenantId: string;
    reporterId: string;
    beatId: string;
    beatName: string;
    assignedBy: string;
    assignedByName: string;
  }): Promise<ReporterBeatAssignment> {
    const assignmentId = `rba_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const assignment: ReporterBeatAssignment = {
      assignmentId,
      tenantId: input.tenantId,
      reporterId: input.reporterId,
      beatId: input.beatId,
      beatName: input.beatName,
      assignedBy: input.assignedBy,
      assignedAt: now,
    };

    beatAssignmentStore.set(assignmentId, assignment);

    await auditService.log({
      tenantId: input.tenantId,
      actorId: input.assignedBy,
      actorName: input.assignedByName,
      actorRole: 'editor',
      action: 'REPORTER_ASSIGNED_TO_BEAT',
      entityType: 'NewsBeat',
      entityId: input.beatId,
      newState: assignment,
    });

    return assignment;
  }

  public static async assignReporterToDistrict(input: {
    tenantId: string;
    reporterId: string;
    district: string;
    state: string;
    assignedBy: string;
    assignedByName: string;
  }): Promise<ReporterDistrictAssignment> {
    const assignmentId = `rda_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const assignment: ReporterDistrictAssignment = {
      assignmentId,
      tenantId: input.tenantId,
      reporterId: input.reporterId,
      district: input.district,
      state: input.state,
      assignedBy: input.assignedBy,
      assignedAt: now,
    };

    districtAssignmentStore.set(assignmentId, assignment);

    await auditService.log({
      tenantId: input.tenantId,
      actorId: input.assignedBy,
      actorName: input.assignedByName,
      actorRole: 'editor',
      action: 'REPORTER_ASSIGNED_TO_DISTRICT',
      entityType: 'ReporterProfile',
      entityId: input.reporterId,
      newState: assignment,
    });

    return assignment;
  }

  // --- Read Methods ---

  public static getDesks(tenantId: string): NewsroomDesk[] {
    this.seedDefaultDesksAndBeats(tenantId);
    return Array.from(deskStore.values()).filter((d) => d.tenantId === tenantId);
  }

  public static getBeats(tenantId: string): NewsBeat[] {
    this.seedDefaultDesksAndBeats(tenantId);
    return Array.from(beatStore.values()).filter((b) => b.tenantId === tenantId);
  }

  public static getBeatAssignments(reporterId: string): ReporterBeatAssignment[] {
    return Array.from(beatAssignmentStore.values()).filter((a) => a.reporterId === reporterId);
  }

  public static getDistrictAssignments(reporterId: string): ReporterDistrictAssignment[] {
    return Array.from(districtAssignmentStore.values()).filter((a) => a.reporterId === reporterId);
  }
}
