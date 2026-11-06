/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 8 — Newsroom Desks Console
 */

import React, { useState, useEffect } from 'react';
import { Layers, Plus, Users, Edit3 } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { NewsroomDeskService } from '../../services/newsroomDeskService';
import { NewsroomDesk } from '../../types/newsroom';

export const DeskManagementPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { can } = usePermission();

  const [desks, setDesks] = useState<NewsroomDesk[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deskName, setDeskName] = useState('');
  const [deskDesc, setDeskDesc] = useState('');
  const [deskSection, setDeskSection] = useState('Metro');

  const loadData = () => {
    if (!currentTenant?.tenantId) return;
    NewsroomDeskService.seedDefaultDesksAndBeats(currentTenant.tenantId);
    setDesks(NewsroomDeskService.getDesks(currentTenant.tenantId));
  };

  useEffect(() => {
    loadData();
  }, [currentTenant?.tenantId]);

  const handleCreateDesk = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await NewsroomDeskService.createDesk({
        tenantId: currentTenant.tenantId,
        name: deskName,
        description: deskDesc,
        section: deskSection,
        actorId: user?.uid || 'admin',
        actorName: user?.displayName || 'Admin',
      });
      setDeskName('');
      setDeskDesc('');
      setIsCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Newsroom Desks Console"
        subtitle={`Organize editorial workflows across desks (City, Crime, Business, Photo, Print, Digital) for ${currentTenant.organizationName}.`}
        breadcrumbs={[
          { label: 'Newsroom', href: '#' },
          { label: 'Desk Management' },
        ]}
        actions={
          can('newsroom.manage') ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create Newsroom Desk
            </Button>
          ) : undefined
        }
      />

      {/* Desks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {desks.map((desk) => (
          <Card key={desk.deskId} variant="editorial" className="p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-base font-bold font-sans text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  {desk.name}
                </h3>
                <Badge variant="blue">{desk.section}</Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{desk.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
              <span>Status: <strong className="text-emerald-600 dark:text-emerald-400">{desk.status}</strong></span>
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                {desk.editorIds.length} Editors
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal: Create Desk */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Newsroom Desk">
        <form onSubmit={handleCreateDesk} className="space-y-4">
          <Input
            label="Desk Name"
            required
            placeholder="e.g. Regional Bureau Desk"
            value={deskName}
            onChange={(e) => setDeskName(e.target.value)}
          />

          <Input
            label="Description"
            required
            placeholder="Scope and responsibilities of this desk"
            value={deskDesc}
            onChange={(e) => setDeskDesc(e.target.value)}
          />

          <Input
            label="Editorial Section"
            required
            placeholder="e.g. Metro, National, Sports, Business"
            value={deskSection}
            onChange={(e) => setDeskSection(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Desk
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
