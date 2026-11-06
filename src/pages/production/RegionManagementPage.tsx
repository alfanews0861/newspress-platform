/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Production Region Management Page (Phase 10)
 * Allows publishers to configure regional distribution zones, geographic coverage,
 * timezones, and default assigned print vendors.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import {
  MapPin,
  Plus,
  Clock,
  Shield,
  Building,
  CheckCircle,
  Globe,
} from 'lucide-react';
import { ProductionRegion, PrintVendor } from '../../types/production';
import { ProductionRegionService } from '../../services/productionRegionService';
import { PrintVendorService } from '../../services/printVendorService';
import { Button, Modal, Input, Badge } from '../../components/ui';

export const RegionManagementPage: React.FC = () => {
  const { user, currentMembership } = useAuth();
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.tenantId || 'tenant-metro-chronicle';

  const [regions, setRegions] = useState<ProductionRegion[]>([]);
  const [vendors, setVendors] = useState<PrintVendor[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [coverageInput, setCoverageInput] = useState('');
  const [defaultVendorId, setDefaultVendorId] = useState('');

  const loadData = () => {
    PrintVendorService.seedDefaultVendors(tenantId);
    ProductionRegionService.seedDefaultRegions(tenantId);

    setRegions(ProductionRegionService.getRegionsForTenant(tenantId));
    setVendors(PrintVendorService.getVendorsForTenant(tenantId));
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const handleAddRegion = async () => {
    if (!name.trim() || !code.trim()) return;

    const coverage = coverageInput.split(',').map((s) => s.trim()).filter(Boolean);

    await ProductionRegionService.createRegion(
      {
        tenantId,
        name,
        code: code.toUpperCase(),
        timezone,
        geographicCoverage: coverage,
        defaultVendorId: defaultVendorId || undefined,
        active: true,
      },
      user?.uid || 'user-admin',
      currentMembership?.organizationRole || user?.platformRole || 'owner'
    );

    setShowAddModal(false);
    setName('');
    setCode('');
    setCoverageInput('');
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
            Production & Distribution Regions
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure regional distribution hubs, delivery territory coverage, timezones, and default printing units.
          </p>
        </div>

        <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Region
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {regions.map((region) => {
          const defaultVendor = vendors.find((v) => v.id === region.defaultVendorId);

          return (
            <div key={region.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white font-sans text-base">{region.name}</h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Code: {region.code}</span>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {region.timezone}
                </Badge>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Geographic Coverage:</span>
                  <div className="flex flex-wrap gap-1">
                    {region.geographicCoverage.map((area) => (
                      <span key={area} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 dark:text-slate-500 font-semibold block text-[11px] uppercase">Default Printing Unit</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                    {defaultVendor ? defaultVendor.name : 'None Assigned'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Region Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Distribution Region">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 uppercase">Region Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nellore Coastal Hub" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 uppercase">Region Code</label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. NELLORE" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 uppercase">Timezone</label>
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Asia/Kolkata" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 uppercase">Geographic Coverage (Comma Separated)</label>
            <Input
              value={coverageInput}
              onChange={(e) => setCoverageInput(e.target.value)}
              placeholder="e.g. SPSR Nellore District, Kavali, Gudur"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Default Assigned Vendor</label>
            <select
              value={defaultVendorId}
              onChange={(e) => setDefaultVendorId(e.target.value)}
              className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="">-- Select Default Vendor --</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddRegion} className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Region
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RegionManagementPage;
