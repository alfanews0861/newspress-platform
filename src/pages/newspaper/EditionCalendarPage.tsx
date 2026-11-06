/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 9 — Edition Operating Calendar
 * Displays scheduled editions, content deadlines, print deadlines, and readiness status.
 */

import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Printer,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { EditionPlanningService } from '../../services/editionPlanningService';
import { SubscriptionEntitlementService } from '../../services/subscriptionEntitlementService';
import { MOCK_BRANDS, MOCK_TEMPLATES } from '../../services/mockDataService';
import { formatDate } from '../../utils/formatters';

interface EditionCalendarPageProps {
  onNavigate?: (path: string) => void;
}

export const EditionCalendarPage: React.FC<EditionCalendarPageProps> = ({ onNavigate }) => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { can } = usePermission();

  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'upcoming' | 'past'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form states for new edition
  const [editionDate, setEditionDate] = useState('2026-10-05');
  const [editionType, setEditionType] = useState('MORNING');
  const [pageCount, setPageCount] = useState(8);
  const [contentDeadlineTime, setContentDeadlineTime] = useState('07:30');
  const [printDeadlineTime, setPrintDeadlineTime] = useState('10:00');
  const [selectedBrand, setSelectedBrand] = useState(MOCK_BRANDS[0]?.brandId || 'brand-metro-chronicle');
  const [selectedTemplate, setSelectedTemplate] = useState(MOCK_TEMPLATES[0]?.templateId || 'template-broadsheet-8col');

  const tenantEditions = EditionPlanningService.getEditions(currentTenant.tenantId);

  const handleCreateEdition = () => {
    setCreateError(null);
    const contentDeadline = `${editionDate}T${contentDeadlineTime}:00Z`;
    const printDeadline = `${editionDate}T${printDeadlineTime}:00Z`;

    const res = EditionPlanningService.createEdition({
      tenantId: currentTenant.tenantId,
      brandId: selectedBrand,
      templateId: selectedTemplate,
      editionType,
      editionDate,
      publicationDate: editionDate,
      publicationTimezone: currentTenant.primaryTimezone || 'Asia/Kolkata',
      pageCount: Number(pageCount),
      contentDeadline,
      printDeadline,
      createdBy: user?.uid || 'editor-1',
    });

    if (!res.success) {
      setCreateError(res.error || 'Failed to create edition');
    } else {
      setShowCreateModal(false);
      if (onNavigate) {
        onNavigate('/newspaper/edition-planning');
      }
    }
  };

  const entitlement = SubscriptionEntitlementService.canCreateEdition(currentTenant.tenantId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edition Operating Calendar & Publishing Schedule"
        subtitle={`Daily press runs, content cutoff schedules, and print deadlines for ${currentTenant.organizationName} (${currentTenant.primaryTimezone}).`}
        breadcrumbs={[
          { label: 'Newspaper', href: '#' },
          { label: 'Edition Calendar' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {can('edition.create') && (
              <Button
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setShowCreateModal(true)}
              >
                Plan New Edition
              </Button>
            )}
          </div>
        }
      />

      {/* Subscription entitlement notice if nearing limit */}
      {!entitlement.allowed && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Edition Creation Limit Reached</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">{entitlement.reason}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('/settings')}>
            Upgrade Publishing Plan
          </Button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {(['all', 'today', 'upcoming', 'past'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setFilterPeriod(period)}
            className={`px-3 py-1.5 rounded-lg text-xs font-sans capitalize font-medium transition-colors cursor-pointer ${
              filterPeriod === period
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {period} Editions
          </button>
        ))}
      </div>

      {/* Calendar List */}
      <div className="space-y-4">
        {tenantEditions.length === 0 ? (
          <Card variant="bordered" className="text-center py-12">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Editions Scheduled</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Schedule your first daily morning edition or weekend supplement to start content collection and page planning.
            </p>
            {can('edition.create') && (
              <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
                Create First Edition
              </Button>
            )}
          </Card>
        ) : (
          tenantEditions.map((edition) => (
            <Card
              key={edition.editionId}
              variant="editorial"
              className="hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold font-sans text-slate-900 dark:text-slate-100">
                      {edition.editionDate} — {edition.editionType} Edition
                    </span>
                    <Badge variant="outline" size="sm">
                      {edition.editionCode}
                    </Badge>
                    <StatusBadge status={edition.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-sans text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <Clock className="w-3.5 h-3.5" /> Content Deadline:{' '}
                      {edition.contentDeadline?.slice(11, 16) || '07:30'}
                    </span>
                    <span className="flex items-center gap-1 text-sky-400">
                      <Printer className="w-3.5 h-3.5" /> Print Deadline:{' '}
                      {edition.printDeadline?.slice(11, 16) || '10:00'}
                    </span>
                    <span className="flex items-center gap-1 text-slate-300">
                      <FileText className="w-3.5 h-3.5" /> {edition.pageCount || 8} Pages
                    </span>
                    <span className="text-slate-400">
                      Timezone: {edition.publicationTimezone || currentTenant.primaryTimezone}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end lg:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate?.('/newspaper/edition-planning')}
                  >
                    Content Planning
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onNavigate?.('/newspaper/readiness')}
                  >
                    Readiness
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                    onClick={() => onNavigate?.('/newspaper/review')}
                  >
                    Review Desk
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Plan New Edition Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Plan New Newspaper Edition"
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateEdition}>
              Confirm & Plan Edition
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {createError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Publication Date"
              type="date"
              value={editionDate}
              onChange={(e) => setEditionDate(e.target.value)}
            />
            <Select
              label="Edition Type"
              value={editionType}
              onChange={(e) => setEditionType(e.target.value)}
              options={[
                { value: 'MORNING', label: 'Morning Daily' },
                { value: 'EVENING', label: 'Evening Courier' },
                { value: 'SUNDAY', label: 'Sunday Broadsheet' },
                { value: 'WEEKLY', label: 'Weekly Journal' },
                { value: 'SPECIAL', label: 'Special Investigative' },
                { value: 'SUPPLEMENT', label: 'Weekend Supplement' },
                { value: 'EMERGENCY_REPRINT', label: 'Emergency Breaking Reprint' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Content Deadline (Cutoff)"
              type="time"
              value={contentDeadlineTime}
              onChange={(e) => setContentDeadlineTime(e.target.value)}
            />
            <Input
              label="Print Press Deadline"
              type="time"
              value={printDeadlineTime}
              onChange={(e) => setPrintDeadlineTime(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Planned Page Count"
              type="number"
              min={2}
              max={64}
              step={2}
              value={pageCount}
              onChange={(e) => setPageCount(Number(e.target.value))}
            />
            <Select
              label="Masthead Brand"
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              options={MOCK_BRANDS.map((b) => ({ value: b.brandId, label: b.name }))}
            />
          </div>

          <Select
            label="Layout Master Template"
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            options={MOCK_TEMPLATES.map((t) => ({ value: t.templateId, label: t.name }))}
          />
        </div>
      </Modal>
    </div>
  );
};
