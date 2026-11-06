/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 8 — Beat & Geographic District Taxonomy Console
 */

import React, { useState, useEffect } from 'react';
import { Tag, MapPin, Plus, UserCheck, Shield } from 'lucide-react';
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
import { NewsroomDeskService } from '../../services/newsroomDeskService';
import { NewsroomStaffService } from '../../services/newsroomStaffService';
import { NewsBeat, ReporterBeatAssignment } from '../../types/newsroom';
import { ReporterProfile } from '../../types/reporter';

export const BeatManagementPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { can } = usePermission();

  const [beats, setBeats] = useState<NewsBeat[]>([]);
  const [reporters, setReporters] = useState<ReporterProfile[]>([]);
  const [isAddBeatModalOpen, setIsAddBeatModalOpen] = useState(false);
  const [beatName, setBeatName] = useState('');
  const [beatDesc, setBeatDescription] = useState('');
  const [beatCat, setBeatCategory] = useState('Civic');

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedBeatId, setSelectedBeatId] = useState('');
  const [selectedReporterId, setSelectedReporterId] = useState('');

  const loadData = () => {
    if (!currentTenant?.tenantId) return;
    NewsroomDeskService.seedDefaultDesksAndBeats(currentTenant.tenantId);
    NewsroomStaffService.seedDefaultStaff(currentTenant.tenantId);
    setBeats(NewsroomDeskService.getBeats(currentTenant.tenantId));
    setReporters(NewsroomStaffService.getTenantReporters(currentTenant.tenantId));
  };

  useEffect(() => {
    loadData();
  }, [currentTenant?.tenantId]);

  const handleCreateBeat = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await NewsroomDeskService.createBeat({
        tenantId: currentTenant.tenantId,
        name: beatName,
        description: beatDesc,
        category: beatCat,
        actorId: user?.uid || 'admin',
        actorName: user?.displayName || 'Admin',
      });
      setBeatName('');
      setBeatDescription('');
      setIsAddBeatModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAssignReporter = async (e: React.FormEvent) => {
    e.preventDefault();
    const beat = beats.find((b) => b.beatId === selectedBeatId);
    if (!beat || !selectedReporterId) return;

    try {
      await NewsroomDeskService.assignReporterToBeat({
        tenantId: currentTenant.tenantId,
        reporterId: selectedReporterId,
        beatId: beat.beatId,
        beatName: beat.name,
        assignedBy: user?.uid || 'admin',
        assignedByName: user?.displayName || 'Admin',
      });
      setIsAssignModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Newsroom Beats & Geographic Coverage"
        subtitle={`Configure editorial taxonomy, beat categories, and district assignments for ${currentTenant.organizationName}.`}
        breadcrumbs={[
          { label: 'Newsroom', href: '#' },
          { label: 'Beat Management' },
        ]}
        actions={
          can('newsroom.manage') ? (
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsAddBeatModalOpen(true)}
              >
                Create News Beat
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Beats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {beats.map((beat) => (
          <Card key={beat.beatId} variant="editorial" className="p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-base font-bold font-sans text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  {beat.name}
                </h3>
                <Badge variant="blue">{beat.category}</Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{beat.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
              <span>Tenant: {currentTenant.organizationName}</span>
              {can('newsroom.manage') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedBeatId(beat.beatId);
                    if (reporters.length > 0) setSelectedReporterId(reporters[0].reporterId);
                    setIsAssignModalOpen(true);
                  }}
                >
                  Assign Reporter
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Modal: Create Beat */}
      <Modal isOpen={isAddBeatModalOpen} onClose={() => setIsAddBeatModalOpen(false)} title="Create News Beat">
        <form onSubmit={handleCreateBeat} className="space-y-4">
          <Input
            label="Beat Name"
            required
            placeholder="e.g. Environmental Justice & Energy"
            value={beatName}
            onChange={(e) => setBeatName(e.target.value)}
          />

          <Input
            label="Description"
            required
            placeholder="Brief scope of coverage for this beat"
            value={beatDesc}
            onChange={(e) => setBeatDescription(e.target.value)}
          />

          <Select
            label="Category"
            value={beatCat}
            onChange={(e) => setBeatCategory(e.target.value)}
            options={[
              { value: 'Civic', label: 'Civic & Municipal' },
              { value: 'Government', label: 'Government & Politics' },
              { value: 'Public Safety', label: 'Crime, Courts & Public Safety' },
              { value: 'Finance', label: 'Business & Economy' },
              { value: 'Culture', label: 'Culture & Entertainment' },
              { value: 'Investigative', label: 'Special Investigations' },
            ]}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddBeatModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Beat
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Assign Reporter */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Reporter to Beat">
        <form onSubmit={handleAssignReporter} className="space-y-4">
          <Select
            label="Select Reporter"
            value={selectedReporterId}
            onChange={(e) => setSelectedReporterId(e.target.value)}
            options={reporters.map((r) => ({
              value: r.reporterId,
              label: `${r.byline} (${r.employmentType || r.reporterType})`,
            }))}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
