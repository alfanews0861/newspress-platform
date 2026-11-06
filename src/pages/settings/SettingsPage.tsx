/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Building2,
  Shield,
  CreditCard,
  Users,
  CheckCircle2,
  Clock,
  Globe,
  Save,
  Lock,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DataTable } from '../../components/ui/DataTable';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { ROLE_CATALOG } from '../../config/rbacMatrix';
import { MOCK_TENANT_MEMBERS, MOCK_USERS, MOCK_SUBSCRIPTION } from '../../services/mockDataService';
import { formatCurrency, formatDate } from '../../utils/formatters';

import { PublishingPlanSection } from './PublishingPlanSection';

export const SettingsPage: React.FC = () => {
  const { currentTenant, updateCurrentTenant } = useTenant();
  const { can, isPlatformAdmin } = usePermission();
  const { currentMembership } = useAuth();

  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [orgName, setOrgName] = useState(currentTenant.organizationName);
  const [legalName, setLegalName] = useState(currentTenant.legalName);
  const [tagline, setTagline] = useState(currentTenant.tagline || '');
  const [contactEmail, setContactEmail] = useState(currentTenant.contact.email);
  const [city, setCity] = useState(currentTenant.contact.city || '');
  const [country, setCountry] = useState(currentTenant.contact.country || '');
  const [timezone, setTimezone] = useState(currentTenant.primaryTimezone);

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updateCurrentTenant({
        organizationName: orgName,
        legalName,
        tagline,
        primaryTimezone: timezone,
        contact: {
          ...currentTenant.contact,
          email: contactEmail,
          city,
          country,
        },
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'Organization Profile', icon: <Building2 className="w-4 h-4" /> },
    { id: 'rbac', label: 'Members & Roles (RBAC)', icon: <Shield className="w-4 h-4" /> },
    { id: 'roles_catalog', label: 'Permission Matrix', icon: <Lock className="w-4 h-4" /> },
    { id: 'billing', label: 'Plan & Entitlements', icon: <CreditCard className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Settings & RBAC"
        subtitle={`Tenant administration, role-based access control, and subscription parameters for ${currentTenant.organizationName}.`}
        breadcrumbs={[
          { label: 'System', href: '#' },
          { label: 'Settings' },
        ]}
      />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab 1: General Organization Info */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card
              variant="editorial"
              title="Newspaper Organization Metadata"
              subtitle="Legal publishing entity and regional news desk parameters."
              footer={
                <div className="flex items-center justify-between">
                  {saveSuccess ? (
                    <span className="text-emerald-400 flex items-center gap-1.5 font-mono text-xs">
                      <CheckCircle2 className="w-4 h-4" /> Settings successfully saved.
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-mono">
                      Tenant ID: {currentTenant.tenantId}
                    </span>
                  )}
                  {can('tenant.update') && (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Save className="w-4 h-4" />}
                      isLoading={isSaving}
                      onClick={handleSaveGeneral}
                    >
                      Save Changes
                    </Button>
                  )}
                </div>
              }
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Organization Display Name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    disabled={!can('tenant.update')}
                  />
                  <Input
                    label="Registered Legal Entity Name"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    disabled={!can('tenant.update')}
                  />
                </div>

                <Input
                  label="Editorial Tagline / Motto"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  disabled={!can('tenant.update')}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Primary Desk Email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    disabled={!can('tenant.update')}
                  />
                  <Input
                    label="City / Metro Bureau"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!can('tenant.update')}
                  />
                  <Input
                    label="Country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    disabled={!can('tenant.update')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Publication Timezone (IANA)"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    disabled={!can('tenant.update')}
                  />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wider uppercase">
                      Publication Frequency
                    </label>
                    <div className="p-2.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 capitalize">
                      {currentTenant.publicationFrequency} Edition
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Tenant Isolation Guarantees" variant="bordered">
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  Every document created under <strong className="text-blue-600 dark:text-blue-400">{currentTenant.organizationName}</strong> is tagged with{' '}
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-700 dark:text-blue-300 border border-slate-200 dark:border-slate-700 font-mono">
                    tenantId: &quot;{currentTenant.tenantId}&quot;
                  </code>.
                </p>
                <p>
                  Firestore Security Rules mathematically block cross-tenant read/write queries unless authenticated as a platform super administrator.
                </p>
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 font-mono text-[11px]">
                  ✓ RBAC Multi-Tenancy Active
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Members & Current RBAC Assignments */}
      {activeTab === 'rbac' && (
        <Card
          variant="editorial"
          title="Tenant Members & Role Assignments"
          subtitle="Staff roster and permission assignments within this organization."
        >
          <DataTable
            data={MOCK_TENANT_MEMBERS.filter((m) => m.tenantId === currentTenant.tenantId)}
            keyExtractor={(row) => row.memberId}
            columns={[
              {
                key: 'member',
                header: 'Member Name & Title',
                render: (row) => {
                  const user = MOCK_USERS.find((u) => u.uid === row.userId);
                  return (
                    <div className="flex items-center gap-3">
                      <img
                        src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&auto=format&fit=crop&q=80'}
                        alt={user?.displayName || 'User'}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 font-sans text-sm">
                          {user?.displayName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {row.title || 'Team Member'} • {row.department || 'Newsroom'}
                        </div>
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'orgRole',
                header: 'Organization Role',
                width: '160px',
                render: (row) => (
                  <Badge variant="blue" size="sm">
                    {row.organizationRole}
                  </Badge>
                ),
              },
              {
                key: 'reporterRole',
                header: 'Reporter Affiliation',
                width: '160px',
                render: (row) => (
                  <Badge
                    variant={row.reporterRole !== 'none' ? 'emerald' : 'default'}
                    size="sm"
                  >
                    {row.reporterRole}
                  </Badge>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                width: '110px',
                render: (row) => <StatusBadge status={row.status} />,
              },
              {
                key: 'joined',
                header: 'Joined Date',
                width: '130px',
                render: (row) => <span className="text-xs font-mono text-slate-400">{formatDate(row.joinedAt)}</span>,
              },
            ]}
          />
        </Card>
      )}

      {/* Tab 3: System Role & Permission Catalog */}
      {activeTab === 'roles_catalog' && (
        <Card
          title="Extensible RBAC Permission Matrix"
          subtitle="Hierarchical system permissions mapped across platform, organization, and reporter roles."
        >
          <div className="space-y-4">
            {ROLE_CATALOG.map((role) => (
              <div
                key={role.roleKey}
                className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-sans">
                      {role.displayName}
                    </h4>
                    <Badge variant="outline" size="sm">
                      {role.category}
                    </Badge>
                  </div>
                  <span className="text-[11px] font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded">
                    Key: {role.roleKey}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">{role.description}</p>

                <div className="pt-2">
                  <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block mb-1">
                    Granted Permissions ({role.permissions.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 4: Subscription & Billing */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          <PublishingPlanSection />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card
              variant="editorial"
              title="Current Subscription Tier"
              subtitle="Plan entitlements and rotary press limits."
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold font-sans text-slate-900 dark:text-slate-100">
                      {MOCK_SUBSCRIPTION.planName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Billed Monthly</p>
                  </div>
                  <StatusBadge status={MOCK_SUBSCRIPTION.status} />
                </div>

                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500 dark:text-slate-400">Monthly License:</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      {formatCurrency(MOCK_SUBSCRIPTION.monthlyPriceCents || 0)} / month
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500 dark:text-slate-400">Seat Allocation:</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {MOCK_SUBSCRIPTION.seatsUsed} / {MOCK_SUBSCRIPTION.seatsAllocated} seats
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500 dark:text-slate-400">Monthly Editions Capacity:</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {MOCK_SUBSCRIPTION.editionsUsedThisCycle} / {MOCK_SUBSCRIPTION.editionsPerMonthLimit} editions
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Payment & Invoicing Gateway" variant="bordered">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4 font-sans">
                Newsroom billing gateway integration and automated rotary press metering will be provisioned in the Finance & Billing Phase.
              </p>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400 space-y-1">
                <div>Invoice Cycle Anchor: Oct 1, 2026</div>
                <div>Current Period End: Oct 31, 2026</div>
                <div>Auto-Renewal: Active</div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
