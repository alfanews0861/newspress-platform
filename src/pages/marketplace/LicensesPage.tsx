/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Syndication Licenses & Compliance Ledger Page
 * Phase 3 — News Marketplace, Licensing & Reporter Revenue Engine
 * 
 * Authoritative registry of all syndication rights, territorial bounds,
 * attribution mandates, and compliance records across publishers.
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  Search,
  Filter,
  Lock,
  Download,
  Calendar,
  CheckCircle,
  ExternalLink,
  Award
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useTenant } from '../../hooks/useTenant';
import { marketplaceService } from '../../services/marketplaceService';
import { NewsLicense } from '../../types/marketplace';
import { formatDate } from '../../utils/formatters';

export const LicensesPage: React.FC = () => {
  const { currentTenant } = useTenant();

  const [licenses, setLicenses] = useState<NewsLicense[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedLicense, setSelectedLicense] = useState<NewsLicense | null>(null);

  useEffect(() => {
    // Get all licenses across the platform
    setLicenses(marketplaceService.getLicenses());
  }, [currentTenant]);

  const filtered = licenses.filter((lic) => {
    if (typeFilter !== 'all' && lic.type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        lic.articleTitle.toLowerCase().includes(q) ||
        lic.licenseId.toLowerCase().includes(q) ||
        lic.buyerTenantName?.toLowerCase().includes(q) ||
        lic.sellerReporterName?.toLowerCase().includes(q) ||
        lic.territory.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Syndication Licenses & Rights Ledger"
        subtitle="Complete legal audit trail of acquired rights, expiry dates, territorial boundaries, and syndication compliance certificates."
        breadcrumbs={[
          { label: 'Marketplace', href: '#' },
          { label: 'Licenses' },
        ]}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by license ID, story, or buyer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-48">
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All License Types' },
                { value: 'DIGITAL_ONLY', label: 'Digital Only' },
                { value: 'PRINT_ONLY', label: 'Print Only' },
                { value: 'DIGITAL_AND_PRINT', label: 'Digital & Print' },
                { value: 'SINGLE_EDITION', label: 'Single Edition' },
                { value: 'MULTI_EDITION', label: 'Multi Edition' },
                { value: 'EXCLUSIVE', label: 'Exclusive Territorial' },
              ]}
            />
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400 font-sans ml-auto">
            <strong className="text-blue-600 dark:text-blue-400 font-semibold">{filtered.length}</strong> active licenses
          </span>
        </div>
      </div>

      {/* Licenses Table */}
      <Card variant="editorial" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-sans font-semibold uppercase text-[11px] border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5">License ID & Scope</th>
                <th className="p-3.5">Story Headline</th>
                <th className="p-3.5">Licensee (Buyer)</th>
                <th className="p-3.5">Reporter Byline</th>
                <th className="p-3.5">Territory</th>
                <th className="p-3.5">Granted / Valid Until</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filtered.map((item) => (
                <tr key={item.licenseId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5">
                    <span className="font-sans font-semibold text-blue-600 dark:text-blue-400 block">{item.licenseId}</span>
                    <Badge variant={item.exclusivity ? 'rose' : 'purple'} size="sm" className="mt-1">
                      {item.type}
                    </Badge>
                  </td>
                  <td className="p-3.5 max-w-xs">
                    <span className="font-medium text-slate-900 dark:text-white block truncate font-sans">
                      {item.articleTitle}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                      Ref: {item.newsId}
                    </span>
                  </td>
                  <td className="p-3.5 font-medium text-slate-900 dark:text-slate-200">
                    {item.buyerTenantName || item.buyerTenantId}
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300">
                    {item.sellerReporterName || item.sellerReporterId}
                  </td>
                  <td className="p-3.5 font-sans text-slate-600 dark:text-slate-300">
                    {item.territory}
                  </td>
                  <td className="p-3.5 font-sans text-xs">
                    <span className="text-slate-900 dark:text-slate-200 block font-medium">{formatDate(item.grantedAt)}</span>
                    <span className="text-slate-500">
                      {item.expiresAt ? `Until ${formatDate(item.expiresAt)}` : 'Perpetual'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="font-sans text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/40 dark:border-emerald-800 px-2 py-0.5 rounded font-medium">
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedLicense(item)}
                    >
                      <Award className="w-3.5 h-3.5 mr-1 text-blue-600 dark:text-blue-400" />
                      View Certificate
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Certificate Modal */}
      {selectedLicense && (
        <Modal
          isOpen={Boolean(selectedLicense)}
          onClose={() => setSelectedLicense(null)}
          title="Official Certificate of News Syndication Rights"
          subtitle={`Issued by NewsPress Platform Authority • Verification Token: ${selectedLicense.licenseId}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-blue-200 dark:border-blue-800 text-center space-y-4">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] uppercase font-sans font-semibold tracking-widest text-blue-600 dark:text-blue-400 block">
                  NEWSROOM SYNDICATION CLEARANCE
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-sans mt-1">
                  "{selectedLicense.articleTitle}"
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-sans">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">LICENSEE:</span>
                  <span className="text-slate-900 dark:text-white font-semibold">{selectedLicense.buyerTenantName}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">ORIGINAL JOURNALIST:</span>
                  <span className="text-slate-900 dark:text-white font-semibold">{selectedLicense.sellerReporterName}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">PERMITTED MEDIA:</span>
                  <span className="text-slate-900 dark:text-white font-semibold">{selectedLicense.allowedMedia.join(', ')}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">AUTHORIZED TERRITORY:</span>
                  <span className="text-slate-900 dark:text-white font-semibold">{selectedLicense.territory}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">RESALE ALLOWED:</span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">Prohibited (Resale strictly forbidden)</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">MANDATORY BYLINE:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Required attribution</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto italic font-sans">
                This document certifies that the acquiring news organization holds lawful syndication clearance under the terms above. All intellectual property warranties are backed by Phase 2 originality verification.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedLicense(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
