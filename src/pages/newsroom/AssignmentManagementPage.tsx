/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 8 — Assignment Management Console
 */

import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Clock, AlertTriangle, CheckCircle2, User } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { NewsAssignmentService } from '../../services/newsAssignmentService';
import { NewsroomStaffService } from '../../services/newsroomStaffService';
import { NewsroomDeskService } from '../../services/newsroomDeskService';
import { NewsAssignment, AssignmentPriority, NewsroomDesk } from '../../types/newsroom';
import { ReporterProfile } from '../../types/reporter';

export const AssignmentManagementPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { can } = usePermission();

  const [assignments, setAssignments] = useState<NewsAssignment[]>([]);
  const [reporters, setReporters] = useState<ReporterProfile[]>([]);
  const [desks, setDesks] = useState<NewsroomDesk[]>([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('800 words + 2 Photos');
  const [priority, setPriority] = useState<AssignmentPriority>('NORMAL');
  const [beat, setBeat] = useState('Transit & Infrastructure');
  const [district, setDistrict] = useState('Manhattan');
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedReporterId, setSelectedReporterId] = useState('');
  const [selectedDeskId, setSelectedDeskId] = useState('');

  const loadData = () => {
    if (!currentTenant?.tenantId) return;
    NewsAssignmentService.seedDefaultAssignments(currentTenant.tenantId);
    NewsroomStaffService.seedDefaultStaff(currentTenant.tenantId);
    NewsroomDeskService.seedDefaultDesksAndBeats(currentTenant.tenantId);

    const asgs = NewsAssignmentService.getAssignments(currentTenant.tenantId);
    const reps = NewsroomStaffService.getTenantReporters(currentTenant.tenantId);
    const ds = NewsroomDeskService.getDesks(currentTenant.tenantId);

    setAssignments(asgs);
    setReporters(reps);
    setDesks(ds);
    if (reps.length > 0) setSelectedReporterId(reps[0].reporterId);
    if (ds.length > 0) setSelectedDeskId(ds[0].deskId);
  };

  useEffect(() => {
    loadData();
  }, [currentTenant?.tenantId]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReporterId || !selectedDeskId) return;

    try {
      await NewsAssignmentService.createAssignment({
        tenantId: currentTenant.tenantId,
        deskId: selectedDeskId,
        assignedReporterId: selectedReporterId,
        assignedByUserId: user?.uid || 'user-news-editor',
        assignedByName: user?.displayName || 'News Editor',
        title,
        brief,
        expectedOutput,
        priority,
        beat,
        district,
        location,
        deadline: deadline ? new Date(deadline).toISOString() : new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });

      setTitle('');
      setBrief('');
      setLocation('');
      setIsCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field Reporting Assignments Engine"
        subtitle={`Dispatch story briefs, monitor deadlines, and track field progress across newsroom desks.`}
        breadcrumbs={[
          { label: 'Newsroom', href: '#' },
          { label: 'Assignments' },
        ]}
        actions={
          can('assignments.create') ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Issue Field Assignment
            </Button>
          ) : undefined
        }
      />

      {/* Assignment List */}
      <Card variant="editorial">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold font-sans text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Active Field Assignments ({assignments.length})
          </h3>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {assignments.map((asg) => {
            const reporter = reporters.find((r) => r.reporterId === asg.assignedReporterId);
            return (
              <div key={asg.assignmentId} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-sans text-slate-900 dark:text-slate-100 text-sm">{asg.title}</span>
                    <Badge variant={asg.priority === 'URGENT' ? 'rose' : asg.priority === 'HIGH' ? 'primary' : 'blue'}>
                      {asg.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-3xl">{asg.brief}</p>
                  <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <span>Assigned to: <strong className="text-blue-700 dark:text-blue-400">{reporter?.byline || asg.assignedReporterId}</strong></span>
                    <span>•</span>
                    <span>Beat: {asg.beat}</span>
                    <span>•</span>
                    <span>Deadline: {new Date(asg.deadline).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={asg.deadlineState === 'OVERDUE' ? 'rose' : asg.deadlineState === 'AT_RISK' ? 'primary' : 'emerald'}>
                    {asg.deadlineState}
                  </Badge>
                  <Badge variant={asg.status === 'COMPLETED' ? 'emerald' : 'blue'}>
                    {asg.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Modal: Create Assignment */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Issue Field Assignment">
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <Input
            label="Story Title / Subject"
            required
            placeholder="e.g. Civic Hearing on Public Transit Funding"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Input
            label="Assignment Brief / Instructions"
            required
            placeholder="Detailed reporting instructions for the journalist"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Assigned Reporter"
              value={selectedReporterId}
              onChange={(e) => setSelectedReporterId(e.target.value)}
              options={reporters.map((r) => ({ value: r.reporterId, label: `${r.byline} (${r.employmentType || 'STAFF'})` }))}
            />

            <Select
              label="News Desk"
              value={selectedDeskId}
              onChange={(e) => setSelectedDeskId(e.target.value)}
              options={desks.map((d) => ({ value: d.deskId, label: d.name }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as AssignmentPriority)}
              options={[
                { value: 'URGENT', label: 'URGENT (Immediate Field Dispatch)' },
                { value: 'HIGH', label: 'HIGH' },
                { value: 'NORMAL', label: 'NORMAL' },
                { value: 'LOW', label: 'LOW' },
              ]}
            />

            <Input
              label="Deadline (Date & Time)"
              type="datetime-local"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <Input
            label="Expected Deliverables"
            value={expectedOutput}
            onChange={(e) => setExpectedOutput(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Issue Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
