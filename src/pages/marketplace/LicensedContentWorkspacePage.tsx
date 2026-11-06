/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LicensedContentWorkspacePage Component
 * Route: /marketplace/licensed
 * Phase 12 — Public Marketplace, Publisher Acquisition Portal & Licensed Content Workspace
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Clock,
  Layers,
  FileText,
  AlertCircle,
  Eye,
  Edit3,
  CheckCircle,
  Plus,
  Lock,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import {
  marketplaceContentWorkspaceService,
  LicensedWorkspaceItem
} from '../../services/marketplaceContentWorkspaceService';
import { marketplaceLicenseViewService, LicenseAlert } from '../../services/marketplaceLicenseViewService';
import { marketplaceService } from '../../services/marketplaceService';
import { formatDate } from '../../utils/formatters';

export const LicensedContentWorkspacePage: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMedia, setFilterMedia] = useState<string>('all');
  const [items, setItems] = useState<LicensedWorkspaceItem[]>([]);
  const [alerts, setAlerts] = useState<LicenseAlert[]>([]);

  // Reader / Derivative Modal
  const [selectedItem, setSelectedItem] = useState<LicensedWorkspaceItem | null>(null);
  const [isEditingDerivative, setIsEditingDerivative] = useState<boolean>(false);
  const [editedHeadline, setEditedHeadline] = useState<string>('');
  const [editedBody, setEditedBody] = useState<string>('');
  const [derivativeSuccess, setDerivativeSuccess] = useState<string | null>(null);
  const [derivativeError, setDerivativeError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Add to Edition Modal
  const [addToEditionItem, setAddToEditionItem] = useState<LicensedWorkspaceItem | null>(null);
  const [selectedEditionCode, setSelectedEditionCode] = useState<string>('MC-2026-10-05');
  const [additionSuccess, setAdditionSuccess] = useState<string | null>(null);

  const refreshWorkspace = () => {
    if (currentTenant) {
      const workspaceItems = marketplaceContentWorkspaceService.getLicensedWorkspaceItems(currentTenant.tenantId);
      setItems(workspaceItems);
      const activeAlerts = marketplaceLicenseViewService.getExpiringAlerts(currentTenant.tenantId);
      setAlerts(activeAlerts);
    }
  };

  useEffect(() => {
    refreshWorkspace();

    document.title = 'Licensed News Workspace | NewsPress Platform';
  }, [currentTenant]);

  const filteredItems = items.filter((item) => {
    if (filterStatus === 'active' && item.usageStatus.status !== 'ACTIVE' && item.usageStatus.status !== 'PARTIALLY_CONSUMED') return false;
    if (filterStatus === 'expiring' && item.usageStatus.status !== 'EXPIRING_SOON') return false;
    if (filterStatus === 'expired' && item.usageStatus.status !== 'EXPIRED') return false;
    if (filterStatus === 'consumed' && item.usageStatus.status !== 'CONSUMED') return false;
    if (filterStatus === 'unused' && item.usageStatus.usedInEditionsCount > 0) return false;

    if (filterMedia === 'print' && !item.license.allowedMedia?.includes('print_broadsheet')) return false;
    if (filterMedia === 'digital' && !item.license.allowedMedia?.includes('digital_web')) return false;
    if (filterMedia === 'exclusive' && !item.license.exclusivity) return false;

    return true;
  });

  const handleOpenReader = (item: LicensedWorkspaceItem) => {
    setSelectedItem(item);
    setEditedHeadline(item.articlePreview.headline);
    setEditedBody(item.articlePreview.leadParagraph);
    setIsEditingDerivative(false);
    setDerivativeSuccess(null);
    setDerivativeError(null);
  };

  const handleCreateDerivative = () => {
    if (!selectedItem || !currentTenant || !user) return;
    setDerivativeError(null);
    setDerivativeSuccess(null);

    try {
      marketplaceContentWorkspaceService.createEditorialDerivative({
        tenantId: currentTenant.tenantId,
        userId: user.uid,
        licenseId: selectedItem.license.licenseId,
        editedHeadline,
        editedBody
      });
      setDerivativeSuccess('Editorial version created successfully. Original author credit preserved.');
      setIsEditingDerivative(false);
    } catch (err: any) {
      setDerivativeError(err.message || 'Failed to create editorial derivative.');
    }
  };

  const handleAddToEditionConfirm = () => {
    if (!addToEditionItem || !currentTenant) return;

    // Validate license scope prior to reservation
    if (addToEditionItem.usageStatus.status === 'EXPIRED') {
      alert('License has expired! Cannot reserve for print edition.');
      return;
    }

    if (!addToEditionItem.license.allowedMedia?.includes('print_broadsheet') && addToEditionItem.license.type === 'DIGITAL_ONLY') {
      alert('This license is DIGITAL_ONLY and strictly prohibited from print edition placement.');
      return;
    }

    // Link edition code
    marketplaceService.linkLicenseToEdition(addToEditionItem.license.licenseId, selectedEditionCode);
    setAdditionSuccess(`Reserved for edition ${selectedEditionCode}. Print preflight verified.`);
    setTimeout(() => {
      setAddToEditionItem(null);
      setAdditionSuccess(null);
      refreshWorkspace();
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Publisher Licensed Content Workspace"
        subtitle="Repository of syndicated stories legally acquired by your newsroom. Prepare editorial derivatives, verify attribution, and reserve dispatches for upcoming print editions."
        breadcrumbs={[
          { label: 'Marketplace', href: '#/marketplace' },
          { label: 'Licensed Content' }
        ]}
      />

      {/* Expiring License Alerts Banner */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.alertId}
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-sans ${
                alert.alertType === 'EXPIRED'
                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{alert.message}</span>
              </div>
              <span className="font-semibold uppercase tracking-wider">{alert.alertType.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Licensed ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
              filterStatus === 'active'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Active Rights
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('expiring')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
              filterStatus === 'expiring'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Expiring Soon
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('expired')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
              filterStatus === 'expired'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Expired
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('unused')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
              filterStatus === 'unused'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Unused in Edition
          </button>
        </div>

        <div className="w-44 shrink-0">
          <Select
            value={filterMedia}
            onChange={(e) => setFilterMedia(e.target.value)}
            options={[
              { value: 'all', label: 'All Media Scopes' },
              { value: 'print', label: 'Print Broadsheet' },
              { value: 'digital', label: 'Digital Web/App' },
              { value: 'exclusive', label: 'Exclusive Only' },
            ]}
          />
        </div>
      </div>

      {/* Licensed Stories Workspace Grid */}
      {filteredItems.length === 0 ? (
        <Card variant="bordered" className="text-center py-12 space-y-4">
          <FileText className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-200">No Licensed Dispatches Match Filters</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Acquire rights from the syndication wire or adjust your status filters.
          </p>
          <Button variant="primary" size="sm" onClick={() => (window.location.hash = '#/marketplace')}>
            Browse Syndication Wire
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredItems.map((item) => {
            const isExpiring = item.usageStatus.status === 'EXPIRING_SOON';
            const isExpired = item.usageStatus.status === 'EXPIRED';

            return (
              <Card
                key={item.license.licenseId}
                variant="editorial"
                className={`p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border ${
                  isExpired
                    ? 'border-rose-200 dark:border-rose-800 bg-rose-50/20 opacity-80'
                    : isExpiring
                    ? 'border-amber-200 dark:border-amber-800 bg-amber-50/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-sans">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{item.license.type}</span>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-slate-600 dark:text-slate-300">{item.license.territory}</span>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-slate-500 dark:text-slate-400">ID: {item.license.licenseId}</span>

                    {/* Status Pill */}
                    {isExpired ? (
                      <span className="text-[10px] font-sans font-medium text-rose-700 bg-rose-50 border border-rose-200 dark:text-rose-300 dark:bg-rose-900/40 dark:border-rose-800 px-2 py-0.5 rounded">
                        EXPIRED ({formatDate(item.license.expiresAt || '')})
                      </span>
                    ) : isExpiring ? (
                      <span className="text-[10px] font-sans font-medium text-amber-700 bg-amber-50 border border-amber-200 dark:text-amber-300 dark:bg-amber-900/40 dark:border-amber-800 px-2 py-0.5 rounded">
                        EXPIRING SOON ({item.usageStatus.daysRemaining}d remaining)
                      </span>
                    ) : (
                      <span className="text-[10px] font-sans font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/40 dark:border-emerald-800 px-2 py-0.5 rounded">
                        ACTIVE RIGHTS ({item.usageStatus.daysRemaining}d)
                      </span>
                    )}

                    {item.license.exclusivity && (
                      <span className="flex items-center gap-1 text-[10px] font-sans font-medium text-blue-700 bg-blue-50 border border-blue-200 dark:text-blue-300 dark:bg-blue-900/40 dark:border-blue-800 px-1.5 py-0.5 rounded">
                        <Lock className="w-3 h-3" /> Exclusive
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-slate-900 dark:text-white font-sans leading-snug">
                    {item.articlePreview.headline}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-sans">
                    <span>Byline: <strong className="text-slate-700 dark:text-slate-200 font-medium">{item.articlePreview.byline}</strong></span>
                    <span>·</span>
                    <span>Source: {item.articlePreview.sourceTenantName || 'Freelance Correspondent'}</span>
                    <span>·</span>
                    <span>Used in {item.usageStatus.usedInEditionsCount} Edition(s)</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenReader(item)}
                  >
                    <Eye className="w-4 h-4 mr-1" /> Open Dispatch
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setAddToEditionItem(item)}
                    disabled={isExpired}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add to Edition
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reader & Editorial Derivative Modal */}
      {selectedItem && (
        <Modal
          isOpen={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          title={`Licensed Dispatch: ${selectedItem.articlePreview.headline}`}
          subtitle={`Byline: ${selectedItem.articlePreview.byline} • License ID: ${selectedItem.license.licenseId}`}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {derivativeSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-sans">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{derivativeSuccess}</span>
              </div>
            )}

            {derivativeError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-sans">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{derivativeError}</span>
              </div>
            )}

            {/* License Terms Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-sans">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium uppercase">LICENSE SCOPE</span>
                <span className="text-slate-900 dark:text-white font-semibold">{selectedItem.license.type}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium uppercase">TERRITORY</span>
                <span className="text-slate-900 dark:text-white font-semibold">{selectedItem.license.territory}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium uppercase">DERIVATIVE EDITS</span>
                <span className={selectedItem.articlePreview.derivativeEditingAllowed ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
                  {selectedItem.articlePreview.derivativeEditingAllowed ? 'PERMITTED' : 'BLOCKED'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium uppercase">ATTRIBUTION</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">Mandatory Byline</span>
              </div>
            </div>

            {/* Content or Derivative Editor */}
            {isEditingDerivative ? (
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <h4 className="text-xs uppercase font-sans text-blue-600 dark:text-blue-400 font-semibold">
                  Prepare Editorial Derivative for Newsroom
                </h4>
                <div className="space-y-2">
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-medium font-sans block">Headline:</label>
                  <input
                    type="text"
                    value={editedHeadline}
                    onChange={(e) => setEditedHeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-sans font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-medium font-sans block">Adapted Editorial Body:</label>
                  <textarea
                    rows={6}
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 font-sans leading-relaxed"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" size="sm" onClick={() => setIsEditingDerivative(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleCreateDerivative}>
                    Save Editorial Version
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 font-sans max-h-80 overflow-y-auto">
                <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed italic border-l-2 border-blue-600 pl-3">
                  {selectedItem.articlePreview.leadParagraph}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                  [Full verified syndicated wire dispatch released to {currentTenant?.organizationName}. Authorized for print broadsheet layout and web publishing under {selectedItem.license.type} terms.]
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                Attribution: <em>"{selectedItem.articlePreview.byline} / NewsPress Wire"</em>
              </span>

              <div className="flex items-center gap-2">
                {selectedItem.articlePreview.derivativeEditingAllowed && !isEditingDerivative && (
                  <Button variant="secondary" size="sm" onClick={() => setIsEditingDerivative(true)}>
                    <Edit3 className="w-4 h-4 mr-1" /> Edit Derivative
                  </Button>
                )}
                <Button variant="primary" size="sm" onClick={() => setSelectedItem(null)}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Add to Edition Modal */}
      {addToEditionItem && (
        <Modal
          isOpen={Boolean(addToEditionItem)}
          onClose={() => setAddToEditionItem(null)}
          title={`Reserve for Newspaper Edition: ${addToEditionItem.articlePreview.headline}`}
          subtitle="Select upcoming print publication date and edition code."
          maxWidth="md"
        >
          <div className="space-y-4">
            {additionSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-sans">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span>{additionSuccess}</span>
              </div>
            ) : (
              <>
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-sans space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium uppercase">STORY LICENSE</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{addToEditionItem.license.type}</span>
                  <span className="text-slate-500 dark:text-slate-400 block mt-1">ALLOWED MEDIA: {addToEditionItem.license.allowedMedia?.join(', ') || 'Print & Digital'}</span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-700 dark:text-slate-300 font-medium font-sans block">Target Edition Issue Code:</label>
                  <Select
                    value={selectedEditionCode}
                    onChange={(e) => setSelectedEditionCode(e.target.value)}
                    options={[
                      { value: 'MC-2026-10-05', label: 'MC-2026-10-05 (Tomorrow Morning Daily)' },
                      { value: 'MC-2026-10-06', label: 'MC-2026-10-06 (Wednesday Metro)' },
                      { value: 'SE-2026-10-08', label: 'SE-2026-10-08 (Sunday Special Broadsheet)' },
                    ]}
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setAddToEditionItem(null)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleAddToEditionConfirm}>
                    Confirm Reservation
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
