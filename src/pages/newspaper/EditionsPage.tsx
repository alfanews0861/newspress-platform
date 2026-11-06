/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BookOpen, Plus, Clock, FileDown, Lock, Layers } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useTenant } from '../../hooks/useTenant';
import { usePermission } from '../../hooks/usePermission';
import { NewspaperEdition } from '../../types/edition';
import { MOCK_CURRENT_EDITION, TELUGU_NEWSPAPER_EDITION } from '../../services/mockDataService';
import { formatDate, formatTimeLeft } from '../../utils/formatters';

export const EditionsPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { can } = usePermission();

  const [editions, setEditions] = useState<NewspaperEdition[]>([
    TELUGU_NEWSPAPER_EDITION,
    MOCK_CURRENT_EDITION,
    {
      editionId: 'ed-yesterday-evening',
      tenantId: currentTenant.tenantId,
      brandId: 'brand-metro-evening',
      brandName: 'The Metropolitan Chronicle (Evening Edition)',
      editionCode: 'MC-2026-10-03-EVE',
      issueNumber: 47821,
      volumeNumber: 132,
      publicationDate: '2026-10-03',
      status: 'finalized',
      totalPages: 24,
      placedArticlesCount: 24,
      printDeadline: '2026-10-02T22:30:00.000Z',
      pressSpecs: {
        format: 'broadsheet',
        colorMode: 'cmyk',
        bleedMm: 3.5,
        dpi: 300,
      },
      createdAt: '2026-10-01T18:00:00.000Z',
      updatedAt: '2026-10-02T22:45:00.000Z',
    },
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Newspaper Editions Desk"
        subtitle={`Schedule, layout, and prepare daily & weekend print editions for ${currentTenant.organizationName}.`}
        breadcrumbs={[
          { label: 'Newspaper', href: '#' },
          { label: 'Editions Desk' },
        ]}
        actions={
          can('editions.create') ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Plan New Print Edition
            </Button>
          ) : undefined
        }
      />

      <Card
        variant="default"
        title="Active Print Runs & Issue Calendar"
        subtitle="Current and recent newspaper issues configured for print press production."
      >
        <DataTable
          data={editions}
          keyExtractor={(row) => row.editionId}
          columns={[
            {
              key: 'edition',
              header: 'Brand & Issue Code',
              render: (row) => (
                <div>
                  <div className="font-medium text-slate-900 dark:text-white font-sans text-sm">
                    {row.brandName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                    Code: <span className="text-blue-600 dark:text-blue-400 font-medium">{row.editionCode}</span> • Issue #{row.issueNumber} (Vol. {row.volumeNumber})
                  </div>
                </div>
              ),
            },
            {
              key: 'format',
              header: 'Press Specs',
              width: '140px',
              render: (row) => (
                <span className="font-sans text-xs capitalize text-slate-500 dark:text-slate-400">
                  {row.pressSpecs.format} • {row.pressSpecs.colorMode.toUpperCase()}
                </span>
              ),
            },
            {
              key: 'pages',
              header: 'Page Placements',
              width: '150px',
              render: (row) => (
                <div className="text-xs font-sans">
                  <span className="text-slate-500 dark:text-slate-400">{row.placedArticlesCount} / {row.totalPages} Pages</span>
                  <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-1 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${(row.placedArticlesCount / row.totalPages) * 100}%` }}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Production State',
              width: '140px',
              render: (row) => <StatusBadge status={row.status} />,
            },
            {
              key: 'deadline',
              header: 'Press Deadline',
              width: '150px',
              render: (row) => (
                <span className="text-xs font-sans text-slate-500 dark:text-slate-400">
                  {formatTimeLeft(row.printDeadline)}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              width: '130px',
              render: (row) => (
                <a
                  href="#/newspaper/page-designer"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.hash = '/newspaper/page-designer';
                    // Trigger navigation in AppContent if custom router or state is used
                    const event = new CustomEvent('navigate', { detail: '/newspaper/page-designer' });
                    window.dispatchEvent(event);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-sans hover:bg-blue-100 dark:hover:bg-blue-900/60 font-medium transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" />
                  Designer
                </a>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};
