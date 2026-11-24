/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NewsPress Reporter Directory
 */

import React, { useState } from 'react';
import { Search, Plus, Users } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useTenant } from '../../hooks/useTenant';
import { usePermission } from '../../hooks/usePermission';
import { MOCK_REPORTER_PROFILES } from '../../services/mockDataService';
import { formatCurrency } from '../../utils/formatters';
import { REPORTER_PORTRAIT_LIST } from '../../data/indianMediaAssets';

export const ReportersPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { can } = usePermission();

  const [profiles, setProfiles] = useState(MOCK_REPORTER_PROFILES);
  const [filterType, setFilterType] = useState<'all' | 'staff_reporter' | 'freelance_reporter'>('all');
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Add reporter form state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'staff_reporter' | 'freelance_reporter'>('staff_reporter');
  const [newBeat, setNewBeat] = useState('');
  const [newPressCard, setNewPressCard] = useState('');

  const reporters = profiles.filter((r) => {
    const matchesType = filterType === 'all' || r.reporterType === filterType;
    const matchesSearch =
      !search.trim() ||
      r.byline.toLowerCase().includes(search.toLowerCase()) ||
      r.beats.some((b) => b.toLowerCase().includes(search.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const handleAddReporter = () => {
    if (!newName.trim()) return;
    const beatsList = newBeat
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);

    setProfiles((prev) => [
      {
        reporterId: `rep-${Date.now()}`,
        userId: `usr-${Date.now()}`,
        tenantId: currentTenant.tenantId,
        byline: newName.trim(),
        reporterType: newType,
        verificationStatus: 'verified',
        originalityScore: 100,
        bio: `${newType === 'staff_reporter' ? 'Staff correspondent' : 'Freelance contributor'} covering ${beatsList.join(', ') || 'General News'}.`,
        beats: beatsList.length > 0 ? beatsList : ['General News'],
        pressCardNumber: newPressCard.trim() || undefined,
        pressCardIssuer: newPressCard.trim() ? currentTenant.organizationName : undefined,
        articlesPublishedCount: 0,
        availableBalanceCents: 0,
      } as (typeof MOCK_REPORTER_PROFILES)[number],
      ...prev,
    ]);

    setNewName('');
    setNewBeat('');
    setNewPressCard('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Reporters"
        subtitle={currentTenant.organizationName}
        actions={
          can('reporters.manage') ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Add Reporter
            </Button>
          ) : undefined
        }
      />

      {/* Search & Type Filter */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#242629] border border-[#e0e3e7] dark:border-[#3c4043] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search reporter or beat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="grid grid-cols-3 sm:flex items-center gap-1.5">
          {([
            { id: 'all', label: 'All' },
            { id: 'staff_reporter', label: 'Staff' },
            { id: 'freelance_reporter', label: 'Freelance' },
          ] as const).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilterType(item.id)}
              className={`min-h-[40px] sm:min-h-[36px] px-3.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                filterType === item.id
                  ? 'bg-[#1a73e8] text-white font-semibold'
                  : 'bg-[#f1f3f4] dark:bg-[#1b1c1f] text-[#3c4043] dark:text-[#bdc1c6] hover:bg-[#e8eaed] dark:hover:bg-[#2f3136]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reporters Grid */}
      {reporters.length === 0 ? (
        <div className="text-center py-12 px-5 rounded-2xl border border-dashed border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#242629]">
          <Users className="w-9 h-9 mx-auto text-[#9aa0a6] mb-2.5 stroke-1.5" />
          <p className="text-sm font-medium text-[#202124] dark:text-white">No reporters found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reporters.map((rep, idx) => {
            const portraitSrc = REPORTER_PORTRAIT_LIST[idx % REPORTER_PORTRAIT_LIST.length];
            const roleLabel = rep.reporterType === 'staff_reporter' ? 'Staff' : 'Freelance';
            return (
              <article
                key={rep.reporterId}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#242629] border border-[#e0e3e7] dark:border-[#3c4043] flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={portraitSrc}
                        alt={rep.byline}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full object-cover object-top border border-[#e0e3e7] dark:border-[#3c4043] shrink-0"
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-semibold text-[#202124] dark:text-white truncate">
                          {rep.byline}
                        </h3>
                        <div className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5 capitalize">
                          {roleLabel} · {rep.verificationStatus.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 tabular-nums">
                      <div className="text-sm font-bold text-[#137333] dark:text-[#81c995]">
                        {rep.originalityScore}%
                      </div>
                      <div className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">Score</div>
                    </div>
                  </div>

                  <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] leading-relaxed line-clamp-2">
                    {rep.bio}
                  </p>

                  <div className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                    <span className="font-medium text-[#3c4043] dark:text-[#e8eaed]">Beats:</span>{' '}
                    {rep.beats.join(', ')}
                    {rep.pressCardNumber && (
                      <>
                        {' '}· <span className="tabular-nums">ID: {rep.pressCardNumber}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#eceff1] dark:border-[#3c4043] flex items-center justify-between text-xs text-[#5f6368] dark:text-[#9aa0a6] tabular-nums">
                  <span>{rep.articlesPublishedCount} published</span>
                  <span className="font-medium text-[#202124] dark:text-white">
                    {formatCurrency(rep.availableBalanceCents)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add Reporter Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Reporter"
        subtitle={currentTenant.organizationName}
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddReporter} disabled={!newName.trim()}>
              Save Reporter
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            placeholder="e.g. Ananya Deshmukh"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#3c4043] dark:text-[#e8eaed]">
              Role Type
            </label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as typeof newType)}
              className="w-full min-h-[44px] sm:min-h-[40px] bg-white dark:bg-[#1b1c1f] border border-[#dadce0] dark:border-[#3c4043] rounded-xl px-3.5 text-sm text-[#202124] dark:text-[#f8f9fa] focus:outline-none focus:border-[#1a73e8]"
            >
              <option value="staff_reporter">Staff Reporter</option>
              <option value="freelance_reporter">Freelance Reporter</option>
            </select>
          </div>
          <Input
            label="Beats (comma separated)"
            placeholder="e.g. Metro, Civic, Education"
            value={newBeat}
            onChange={(e) => setNewBeat(e.target.value)}
          />
          <Input
            label="Press Card ID (optional)"
            placeholder="e.g. PRESS-2026-412"
            value={newPressCard}
            onChange={(e) => setNewPressCard(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};
