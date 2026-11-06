/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Newspaper Layout Templates Library
 * Configures broadsheet, tabloid, and A4 page templates, baseline grids, and advertisement zones.
 */

import React, { useState } from 'react';
import { Plus, LayoutGrid, Columns, Ruler, Sliders, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useTenant } from '../../hooks/useTenant';
import { usePermission } from '../../hooks/usePermission';
import { NewspaperTemplate } from '../../types/edition';
import { MOCK_TEMPLATES } from '../../services/mockDataService';

export const TemplatesPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { can } = usePermission();
  const [templates] = useState<NewspaperTemplate[]>(MOCK_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<NewspaperTemplate>(MOCK_TEMPLATES[0]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Newspaper Layout Templates"
        subtitle={`Reusable broadsheet, tabloid, and A4 page templates for ${currentTenant.organizationName}.`}
        breadcrumbs={[
          { label: 'Newspaper', href: '#' },
          { label: 'Templates Library' },
        ]}
        actions={
          can('editions.create') ? (
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Create New Template
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {templates.map((tmpl) => (
          <div
            key={tmpl.templateId}
            onClick={() => setSelectedTemplate(tmpl)}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              selectedTemplate.templateId === tmpl.templateId
                ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-600 ring-1 ring-blue-500 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <Badge variant={tmpl.isDefault ? 'primary' : 'outline'} className="text-[10px] font-sans">
                  {tmpl.pageSize}
                </Badge>
                <span className="text-xs font-sans font-bold text-blue-600 dark:text-blue-400">
                  {tmpl.columnCount} Columns
                </span>
              </div>
              <h4 className="font-sans font-bold text-slate-900 dark:text-slate-100 text-sm">{tmpl.name}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{tmpl.description}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-sans text-slate-500 dark:text-slate-400 flex justify-between">
              <span>Gutter: {tmpl.columnGutterMm}mm</span>
              <span>Grid: {tmpl.baselineGridPt}pt</span>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Template Deep-Dive */}
      <Card
        variant="editorial"
        title={`Template Specifications: ${selectedTemplate.name}`}
        subtitle="Physical page dimensions, margin boundaries, and baseline grid calibration."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h5 className="text-xs font-sans uppercase font-bold text-slate-700 dark:text-slate-300">Physical Size</h5>
            <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1 text-xs font-sans">
              <div className="flex justify-between">
                <span className="text-slate-500">Format:</span>
                <span className="text-slate-900 dark:text-slate-200 font-bold">{selectedTemplate.pageSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dimensions:</span>
                <span className="text-slate-900 dark:text-slate-200 font-bold">{selectedTemplate.pageWidthMm} × {selectedTemplate.pageHeightMm} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Orientation:</span>
                <span className="text-slate-900 dark:text-slate-200 font-bold capitalize">{selectedTemplate.pageOrientation}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-xs font-sans uppercase font-bold text-slate-700 dark:text-slate-300">Grid Calibration</h5>
            <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1 text-xs font-sans">
              <div className="flex justify-between">
                <span className="text-slate-500">Columns:</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">{selectedTemplate.columnCount} Columns</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Column Gutter:</span>
                <span className="text-slate-900 dark:text-slate-200 font-bold">{selectedTemplate.columnGutterMm} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Baseline Grid:</span>
                <span className="text-slate-900 dark:text-slate-200 font-bold">{selectedTemplate.baselineGridPt} pt</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-xs font-sans uppercase font-bold text-slate-700 dark:text-slate-300">Page Margins</h5>
            <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1 text-xs font-sans">
              <div className="flex justify-between">
                <span className="text-slate-500">Top / Bottom:</span>
                <span className="text-slate-900 dark:text-slate-200 font-bold">{selectedTemplate.pageMarginsMm.top}mm / {selectedTemplate.pageMarginsMm.bottom}mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Left / Right:</span>
                <span className="text-slate-900 dark:text-slate-200 font-bold">{selectedTemplate.pageMarginsMm.left}mm / {selectedTemplate.pageMarginsMm.right}mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ad Zones:</span>
                <span className="text-slate-900 dark:text-slate-200 font-bold">{selectedTemplate.advertisementZones.length} Configured</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
