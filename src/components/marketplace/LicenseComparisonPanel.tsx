/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LicenseComparisonPanel Component
 * Phase 12 — Public Marketplace, Publisher Acquisition Portal & Licensed Content Workspace
 */

import React from 'react';
import { Check, X, Shield, Globe, Lock, Edit3, Award } from 'lucide-react';
import { LicenseType } from '../../types/marketplace';
import { formatINR } from '../../utils/formatters';

interface LicenseSpec {
  type: LicenseType;
  title: string;
  scope: string;
  territory: string;
  durationDays: number;
  digitalScope: boolean;
  printScope: boolean;
  editionLimit: string;
  derivativeEditing: boolean;
  attribution: boolean;
  exclusivity: boolean;
  priceMultiplier: number;
}

const ALL_LICENSE_SPECS: Record<LicenseType, LicenseSpec> = {
  DIGITAL_ONLY: {
    type: 'DIGITAL_ONLY',
    title: 'Digital Only Release',
    scope: 'Web & Mobile Apps',
    territory: 'Regional',
    durationDays: 365,
    digitalScope: true,
    printScope: false,
    editionLimit: 'Unlimited Digital',
    derivativeEditing: true,
    attribution: true,
    exclusivity: false,
    priceMultiplier: 1.0
  },
  PRINT_ONLY: {
    type: 'PRINT_ONLY',
    title: 'Print Broadsheet Only',
    scope: 'Print Broadsheet',
    territory: 'District',
    durationDays: 30,
    digitalScope: false,
    printScope: true,
    editionLimit: '1 Print Edition',
    derivativeEditing: true,
    attribution: true,
    exclusivity: false,
    priceMultiplier: 1.0
  },
  DIGITAL_AND_PRINT: {
    type: 'DIGITAL_AND_PRINT',
    title: 'Digital & Print Combination',
    scope: 'Web + Broadsheet',
    territory: 'District / State',
    durationDays: 365,
    digitalScope: true,
    printScope: true,
    editionLimit: 'Multi-Edition',
    derivativeEditing: true,
    attribution: true,
    exclusivity: false,
    priceMultiplier: 1.5
  },
  SINGLE_EDITION: {
    type: 'SINGLE_EDITION',
    title: 'Single Print Issue Release',
    scope: '1 Specific Newspaper Issue',
    territory: 'District',
    durationDays: 7,
    digitalScope: false,
    printScope: true,
    editionLimit: '1 Single Issue',
    derivativeEditing: true,
    attribution: true,
    exclusivity: false,
    priceMultiplier: 0.8
  },
  MULTI_EDITION: {
    type: 'MULTI_EDITION',
    title: 'Multi-Edition Syndication',
    scope: 'Multiple Regional Print Issues',
    territory: 'Statewide',
    durationDays: 90,
    digitalScope: true,
    printScope: true,
    editionLimit: 'Up to 5 Issues',
    derivativeEditing: true,
    attribution: true,
    exclusivity: false,
    priceMultiplier: 2.0
  },
  REGIONAL: {
    type: 'REGIONAL',
    title: 'Regional Bureau License',
    scope: 'Regional Print & Digital',
    territory: 'Regional Zone',
    durationDays: 180,
    digitalScope: true,
    printScope: true,
    editionLimit: 'Unlimited Regional',
    derivativeEditing: true,
    attribution: true,
    exclusivity: false,
    priceMultiplier: 2.5
  },
  NATIONAL: {
    type: 'NATIONAL',
    title: 'National Wire Syndication',
    scope: 'National Web & Broadsheet',
    territory: 'National (All States)',
    durationDays: 365,
    digitalScope: true,
    printScope: true,
    editionLimit: 'Unlimited National',
    derivativeEditing: true,
    attribution: true,
    exclusivity: false,
    priceMultiplier: 3.5
  },
  EXCLUSIVE: {
    type: 'EXCLUSIVE',
    title: 'Exclusive Territorial Lock',
    scope: 'Exclusive Rights Freeze',
    territory: 'Designated Territory',
    durationDays: 7,
    digitalScope: true,
    printScope: true,
    editionLimit: 'Exclusive All Issues',
    derivativeEditing: true,
    attribution: true,
    exclusivity: true,
    priceMultiplier: 5.0
  }
};

interface LicenseComparisonPanelProps {
  availableLicenses: LicenseType[];
  basePrice: number;
  selectedLicense?: LicenseType;
  onSelectLicense?: (license: LicenseType) => void;
}

export const LicenseComparisonPanel: React.FC<LicenseComparisonPanelProps> = ({
  availableLicenses,
  basePrice,
  selectedLicense,
  onSelectLicense
}) => {
  const specs = availableLicenses.map(lic => ALL_LICENSE_SPECS[lic] || ALL_LICENSE_SPECS.DIGITAL_AND_PRINT);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white font-sans flex items-center gap-2">
          <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Compare Available Syndication Licenses</span>
        </h4>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">
          Select legal rights scope for your publication
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {specs.map((spec) => {
          const calculatedPrice = Math.round(basePrice * spec.priceMultiplier);
          const isSelected = selectedLicense === spec.type;

          return (
            <div
              key={spec.type}
              onClick={() => onSelectLicense && onSelectLicense(spec.type)}
              className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-blue-600/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {spec.type.replace(/_/g, ' ')}
                  </span>
                  {spec.exclusivity && (
                    <span className="flex items-center gap-1 text-[10px] font-sans font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                      <Lock className="w-3 h-3" /> Exclusive
                    </span>
                  )}
                </div>

                <div>
                  <h5 className="text-sm font-semibold text-slate-900 dark:text-white font-sans">{spec.title}</h5>
                  <span className="text-lg font-bold font-sans text-blue-600 dark:text-blue-400 mt-1 block">
                    {formatINR(calculatedPrice)}
                  </span>
                </div>

                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800 font-sans">
                  <li className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Digital Web/App:</span>
                    {spec.digitalScope ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Print Broadsheet:</span>
                    {spec.printScope ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Territory Bounds:</span>
                    <span className="font-sans text-[11px] text-slate-700 dark:text-slate-200 font-medium">{spec.territory}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Edition Scope:</span>
                    <span className="font-sans text-[11px] text-slate-700 dark:text-slate-200 font-medium">{spec.editionLimit}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Editorial Adapts:</span>
                    {spec.derivativeEditing ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Byline Credit:</span>
                    <span className="font-sans text-[11px] text-blue-600 dark:text-blue-400 font-medium">Mandatory</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Validity Term:</span>
                    <span className="font-sans text-[11px] text-slate-700 dark:text-slate-200 font-medium">{spec.durationDays} Days</span>
                  </li>
                </ul>
              </div>

              {onSelectLicense && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectLicense(spec.type);
                  }}
                  className={`w-full mt-4 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {isSelected ? 'Selected License' : 'Choose License'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
