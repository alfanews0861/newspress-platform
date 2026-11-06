/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Print Vendor Management Page (Phase 10)
 * Allows publishers to configure print vendors, rotary offset capabilities, daily capacities,
 * and emergency reprint capabilities.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import {
  Printer,
  Plus,
  CheckCircle,
  Clock,
  Shield,
  MapPin,
  FileCheck,
  AlertTriangle,
  Building,
  Edit2,
  Trash2,
} from 'lucide-react';
import { PrintVendor, PrintVendorCapability, VendorType } from '../../types/production';
import { PrintVendorService } from '../../services/printVendorService';
import { Button, Modal, Input, Badge } from '../../components/ui';

export const VendorManagementPage: React.FC = () => {
  const { user, currentMembership } = useAuth();
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.tenantId || 'tenant-metro-chronicle';

  const [vendors, setVendors] = useState<PrintVendor[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dailyCapacity, setDailyCapacity] = useState(50000);
  const [vendorType, setVendorType] = useState<VendorType>('EXTERNAL_PRINT_VENDOR');
  const [regionsInput, setRegionsInput] = useState('VIJAYAWADA, AMARAVATI');

  const loadData = () => {
    PrintVendorService.seedDefaultVendors(tenantId);
    setVendors(PrintVendorService.getVendorsForTenant(tenantId));
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const handleAddVendor = async () => {
    if (!name.trim()) return;

    const regionsList = regionsInput.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);

    await PrintVendorService.createVendor(
      {
        tenantId,
        name,
        legalName: legalName || name,
        contactName: contactName || 'Press Supervisor',
        email: email || 'press@example.com',
        phone: phone || '+91 800 000 0000',
        address: address || 'Industrial Area',
        regions: regionsList,
        supportedFormats: ['broadsheet', 'tabloid', 'A4'],
        supportedColorProfiles: ['cmyk', 'grayscale'],
        supportedPaperSizes: ['Broadsheet 350x540mm', 'Tabloid 280x380mm'],
        dailyCapacity,
        active: true,
        priority: 1,
        vendorType,
      },
      {
        paperSizes: ['Broadsheet 350x540mm', 'Tabloid 280x380mm'],
        pageCounts: { min: 4, max: 64 },
        supportsColor: true,
        supportsMonochrome: true,
        printProfiles: ['ISOcoated_v2_eci.icc'],
        bleedRequirementsMm: 3.5,
        acceptedFileFormats: ['PDF/X-1a:2001', 'Print-Ready PDF 1.6+'],
        maximumDailyCapacity: dailyCapacity,
        regionalServiceArea: regionsList,
        productionCutoffTime: '23:00',
        dispatchCutoffTime: '01:00',
        emergencyReprintSupport: true,
      },
      user?.uid || 'user-admin',
      currentMembership?.organizationRole || user?.platformRole || 'owner'
    );

    setShowAddModal(false);
    setName('');
    setLegalName('');
    setContactName('');
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
            Print Vendor Directory & Capabilities
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure contracted rotary web offset presses, internal print units, and regional production capacities.
          </p>
        </div>

        <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Vendor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.map((vendor) => {
          const cap = PrintVendorService.getVendorCapability(tenantId, vendor.id);

          return (
            <div key={vendor.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white font-sans text-base">{vendor.name}</h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{vendor.legalName}</span>
                </div>
                <Badge variant="outline" className="text-[11px] font-mono">
                  {vendor.vendorType}
                </Badge>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{vendor.address}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Contact: </span>
                  {vendor.contactName} ({vendor.phone})
                </div>
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Daily Capacity: </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{vendor.dailyCapacity.toLocaleString()}</span> copies
                </div>
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Service Zones: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {vendor.regions.map((reg) => (
                      <span key={reg} className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono">
                        {reg}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {cap && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-600 dark:text-slate-300 space-y-1 font-mono">
                  <div>Cutoff: Prod {cap.productionCutoffTime} / Disp {cap.dispatchCutoffTime}</div>
                  <div>Pages: {cap.pageCounts.min} - {cap.pageCounts.max} pages</div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Emergency Reprint Supported
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Vendor Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Register New Print Vendor">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 uppercase">Vendor Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Deccan Printworks" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 uppercase">Legal Entity Name</label>
            <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="e.g. Deccan Printworks Pvt Ltd" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 uppercase">Contact Person</label>
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Name" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 uppercase">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 uppercase">Address / Press Facility</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Autonagar, Vijayawada" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Vendor Type</label>
              <select
                value={vendorType}
                onChange={(e: any) => setVendorType(e.target.value)}
                className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                <option value="INTERNAL_PRINT_UNIT">Internal Print Unit</option>
                <option value="EXTERNAL_PRINT_VENDOR">External Print Vendor</option>
                <option value="CONTRACT_PRINT_VENDOR">Contract Print Vendor</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Daily Capacity (Copies)</label>
              <Input type="number" value={dailyCapacity} onChange={(e) => setDailyCapacity(Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Service Regions (Comma Separated)</label>
            <Input value={regionsInput} onChange={(e) => setRegionsInput(e.target.value)} placeholder="VIJAYAWADA, AMARAVATI, GUNTUR" />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddVendor} className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Vendor
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VendorManagementPage;
