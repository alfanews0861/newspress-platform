/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Newspaper Brands & Imprints Management Page
 * Allows publishers to configure masthead typography, Telugu/English language rules,
 * column defaults, color palettes, and circulation schedules per imprint.
 */

import React, { useState } from 'react';
import { Plus, BookOpen, Layers, Type, Globe, Sliders, Check } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useTenant } from '../../hooks/useTenant';
import { usePermission } from '../../hooks/usePermission';
import { NewspaperBrand } from '../../types/edition';
import { MOCK_BRANDS } from '../../services/mockDataService';

export const BrandsPage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { can } = usePermission();
  const [brands, setBrands] = useState<NewspaperBrand[]>(MOCK_BRANDS);
  const [selectedBrand, setSelectedBrand] = useState<NewspaperBrand>(MOCK_BRANDS[0]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Newspaper Brands & Mastheads"
        subtitle={`Configure multiple print mastheads, circulation imprints, and typography scales for ${currentTenant.organizationName}.`}
        breadcrumbs={[
          { label: 'Newspaper', href: '#' },
          { label: 'Brands & Imprints' },
        ]}
        actions={
          can('tenant.manage_settings') ? (
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Create New Brand
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Brand List */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
            Active Imprints ({brands.length})
          </h3>
          {brands.map((brand) => (
            <div
              key={brand.brandId}
              onClick={() => setSelectedBrand(brand)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                selectedBrand.brandId === brand.brandId
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-600 shadow-xs ring-1 ring-blue-500'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-sans font-bold text-slate-900 dark:text-slate-100 text-sm">{brand.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{brand.tagline}</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-sans uppercase">
                  {brand.code}
                </Badge>
              </div>

              <div className="mt-3 flex items-center gap-3 text-[11px] font-sans text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>{brand.defaultColumnCount} Columns</span>
                <span>•</span>
                <span className="capitalize">{brand.language} Script</span>
                <span>•</span>
                <span>{brand.masthead.priceText}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Brand Details & Masthead Preview */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            variant="editorial"
            title={`Masthead Preview: ${selectedBrand.name}`}
            subtitle="Print-ready linotype and digital masthead configuration."
          >
            {/* Live Masthead Canvas Preview */}
            <div className="bg-white text-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-xs space-y-2">
              <div className="text-[10px] font-sans uppercase tracking-widest border-b border-slate-200 py-1 flex justify-between text-slate-600">
                <span>ESTABLISHED 1894</span>
                <span>DAILY MORNING PRINT IMPRINT</span>
                <span>{selectedBrand.masthead.priceText}</span>
              </div>

              <h2
                className="font-sans font-black tracking-tight uppercase leading-none py-2 text-slate-900"
                style={{
                  fontSize: `${selectedBrand.masthead.fontSizePt * 0.75}px`,
                }}
              >
                {selectedBrand.masthead.title}
              </h2>

              <div className="text-[10px] font-sans uppercase tracking-widest border-t-2 border-slate-900 pt-1 flex justify-between text-slate-700">
                <span>04 OCTOBER 2026</span>
                <span>{selectedBrand.masthead.subtitle}</span>
                <span>ISSUE #47,822</span>
              </div>
            </div>

            {/* Typography Scale Grid */}
            <div className="mt-6 space-y-3">
              <h4 className="text-xs font-sans uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider">
                Typography Scale & Grid Specs
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block text-[10px]">LEAD HEADLINE</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                    {selectedBrand.defaultTypographyScale.leadHeadline} pt
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block text-[10px]">SECONDARY</span>
                  <span className="text-slate-900 dark:text-slate-200 font-bold text-sm">
                    {selectedBrand.defaultTypographyScale.secondaryLeadHeadline} pt
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block text-[10px]">BODY TEXT</span>
                  <span className="text-slate-900 dark:text-slate-200 font-bold text-sm">
                    {selectedBrand.defaultTypographyScale.body} pt
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block text-[10px]">DEFAULT COLUMNS</span>
                  <span className="text-slate-900 dark:text-slate-200 font-bold text-sm">
                    {selectedBrand.defaultColumnCount} Cols
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
