/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  CreditCard,
  CheckCircle2,
  Save,
  Youtube,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { getInitialsAvatarDataUrl } from '../../utils/avatarFallback';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DataTable } from '../../components/ui/DataTable';
import { useTenant } from '../../hooks/useTenant';
import { usePermission } from '../../hooks/usePermission';
import { MOCK_TENANT_MEMBERS, MOCK_USERS, MOCK_SUBSCRIPTION } from '../../services/mockDataService';
import { formatCurrency } from '../../utils/formatters';

import { PublishingPlanSection } from './PublishingPlanSection';
import { YouTubeChannelSettingsSection } from './YouTubeChannelSettingsSection';

export const SettingsPage: React.FC = () => {
  const { currentTenant, updateCurrentTenant } = useTenant();
  const { can } = usePermission();

  const getInitialTab = (): string => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab');
      if (tabParam === 'youtube') return 'youtube';
      if (tabParam === 'billing' || tabParam === 'rbac' || tabParam === 'team') return 'team_plan';
    }
    return 'general';
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setActiveTab(getInitialTab());
  }, []);

  const [orgName, setOrgName] = useState(currentTenant.organizationName);
  const [legalName, setLegalName] = useState(currentTenant.legalName);
  const [tagline, setTagline] = useState(currentTenant.tagline || '');
  const [contactEmail, setContactEmail] = useState(currentTenant.contact.email);
  const [city, setCity] = useState(currentTenant.contact.city || '');
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
        },
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <Building2 className="w-4 h-4" /> },
    { id: 'youtube', label: 'Broadcast Channel', icon: <Youtube className="w-4 h-4 text-[#ea4335]" /> },
    { id: 'team_plan', label: 'Team & Plan', icon: <CreditCard className="w-4 h-4" /> },
  ];

  const members = MOCK_TENANT_MEMBERS.filter((m) => m.tenantId === currentTenant.tenantId);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <PageHeader
        title="Settings"
        subtitle={currentTenant.organizationName}
      />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab 1: General Profile */}
      {activeTab === 'general' && (
        <Card
          title="Organization Details"
          footer={
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {saveSuccess ? (
                <span className="text-[#1e8e3e] dark:text-[#81c995] flex items-center gap-1.5 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Saved
                </span>
              ) : (
                <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                  Edition: <span className="capitalize font-medium text-[#202124] dark:text-[#f8f9fa]">{currentTenant.publicationFrequency}</span>
                </span>
              )}
              {can('tenant.update') && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Save className="w-4 h-4" />}
                  isLoading={isSaving}
                  onClick={handleSaveGeneral}
                  className="w-full sm:w-auto"
                >
                  Save Changes
                </Button>
              )}
            </div>
          }
        >
          <div className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Organization Name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={!can('tenant.update')}
              />
              <Input
                label="Legal Name"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                disabled={!can('tenant.update')}
              />
            </div>

            <Input
              label="Tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              disabled={!can('tenant.update')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Desk Email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={!can('tenant.update')}
              />
              <Input
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!can('tenant.update')}
              />
              <Input
                label="Timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={!can('tenant.update')}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Tab 2: Broadcast Channel Settings */}
      {activeTab === 'youtube' && <YouTubeChannelSettingsSection />}

      {/* Tab 3: Team & Plan */}
      {activeTab === 'team_plan' && (
        <div className="space-y-5">
          <Card title="Current Plan">
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#202124] dark:text-[#f8f9fa]">
                    {MOCK_SUBSCRIPTION.planName}
                  </h3>
                  <StatusBadge status={MOCK_SUBSCRIPTION.status} />
                </div>
                <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] tabular-nums">
                  {formatCurrency(MOCK_SUBSCRIPTION.monthlyPriceCents || 0)} / month · {MOCK_SUBSCRIPTION.seatsUsed}/{MOCK_SUBSCRIPTION.seatsAllocated} seats · {MOCK_SUBSCRIPTION.editionsUsedThisCycle}/{MOCK_SUBSCRIPTION.editionsPerMonthLimit} editions
                </p>
              </div>
            </div>
          </Card>

          <PublishingPlanSection />

          <Card title="Team Members">
            <DataTable
              data={members}
              keyExtractor={(row) => row.memberId}
              columns={[
                {
                  key: 'member',
                  header: 'Member',
                  render: (row) => {
                    const user = MOCK_USERS.find((u) => u.uid === row.userId);
                    return (
                      <div className="flex items-center gap-3 min-w-[180px]">
                        <img
                          src={user?.avatarUrl || getInitialsAvatarDataUrl(user?.displayName || 'User')}
                          alt={user?.displayName || 'User'}
                          className="w-8 h-8 rounded-full object-cover border border-[#e0e3e7] dark:border-[#3c4043] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-[#202124] dark:text-[#f8f9fa] text-xs sm:text-sm truncate">
                            {user?.displayName}
                          </div>
                          <div className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] truncate">
                            {row.title || 'Team Member'}
                          </div>
                        </div>
                      </div>
                    );
                  },
                },
                {
                  key: 'orgRole',
                  header: 'Role',
                  render: (row) => (
                    <span className="capitalize text-xs font-medium text-[#202124] dark:text-[#e8eaed] whitespace-nowrap">
                      {row.organizationRole.replace(/_/g, ' ')}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => <StatusBadge status={row.status} />,
                },
              ]}
            />
          </Card>
        </div>
      )}
    </div>
  );
};
