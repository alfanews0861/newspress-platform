/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 13 — Mobile Profile & Settings Screen
 * Reporter credential overview, Low-Bandwidth mode toggle, offline cache cleanup,
 * and push notification category preferences.
 */

import React, { useState, useEffect } from 'react';
import {
  User,
  Bell,
  Wifi,
  Trash2,
  Shield,
  LogOut,
  CheckCircle2,
  Smartphone,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { OfflineReportingStore } from '../../services/mobileOfflineStore';
import { MobilePushNotificationService } from '../../services/mobilePushNotificationService';
import { MobileAppVersionService } from '../../services/mobileAppVersionService';
import { NotificationPreferences, MobileBandwidthMode } from '../../types/mobile';

interface MobileProfileScreenProps {
  onLogout?: () => void;
}

export const MobileProfileScreen: React.FC<MobileProfileScreenProps> = ({ onLogout }) => {
  const { user, currentMembership, logout } = useAuth();
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.tenantId || 'tenant-metro-chronicle';
  const userId = user?.uid || user?.userId || 'rep_sofia_chen';

  const [bandwidthMode, setBandwidthMode] = useState<MobileBandwidthMode>(
    OfflineReportingStore.getBandwidthMode()
  );
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    MobilePushNotificationService.getPreferences(userId, tenantId)
  );
  const [cleanedCount, setCleanedCount] = useState<string | null>(null);

  const versionInfo = MobileAppVersionService.getVersionInfo();

  const handleToggleBandwidth = () => {
    const next = bandwidthMode === 'NORMAL' ? 'LOW_BANDWIDTH' : 'NORMAL';
    setBandwidthMode(next);
    OfflineReportingStore.setBandwidthMode(next);
  };

  const handleTogglePreference = (key: keyof NotificationPreferences) => {
    if (key === 'system') return; // Locked security invariant

    const updated = MobilePushNotificationService.updatePreferences(userId, tenantId, {
      [key]: !preferences[key],
    });
    setPreferences(updated);
  };

  const handleCleanupCache = () => {
    const draftsCleaned = OfflineReportingStore.cleanupSyncedDrafts(tenantId);
    const uploadsCleaned = OfflineReportingStore.cleanupTemporaryUploads(tenantId);
    setCleanedCount(`Cleaned ${draftsCleaned} synced drafts and ${uploadsCleaned} uploaded media buffers.`);
    setTimeout(() => setCleanedCount(null), 3000);
  };

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <User className="w-5 h-5 text-amber-400" />
            <span>Mobile Reporter Profile</span>
          </h2>
          <p className="text-xs text-slate-400">Credentials, bandwidth & push notifications</p>
        </div>
      </div>

      {/* User Card */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-base border border-amber-500/40">
            {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'RC'}
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100">{user?.displayName || 'Sofia Chen'}</h3>
            <p className="text-xs text-slate-400">{user?.email || 'reporter@metrochronicle.com'}</p>
            <span className="inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
              {(currentMembership?.organizationRole || 'member').toUpperCase()} • {(currentMembership?.reporterRole || 'staff').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Low-Bandwidth Mode Switch */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <Wifi className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-slate-200">Low-Bandwidth Mode</h4>
          </div>
          <p className="text-[11px] text-slate-400">
            Defers large media & compresses previews. Preserves original evidence integrity.
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleBandwidth}
          className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
            bandwidthMode === 'LOW_BANDWIDTH' ? 'bg-amber-500' : 'bg-slate-700'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white transition-transform ${
              bandwidthMode === 'LOW_BANDWIDTH' ? 'translate-x-5' : 'translate-x-0.5'
            } top-0.5 absolute`}
          />
        </button>
      </div>

      {/* Push Notification Preferences */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex items-center space-x-2">
          <Bell className="w-4 h-4 text-sky-400" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Push Notification Channels
          </h4>
        </div>

        <div className="space-y-2 text-xs">
          {[
            { key: 'assignments' as const, label: 'Field Assignments & Deadlines', desc: 'Alerts when dispatched or approaching deadline' },
            { key: 'editorial' as const, label: 'Editorial Revisions & Approvals', desc: 'Direct alerts from desk editors' },
            { key: 'breakingNews' as const, label: 'Breaking News Flashes', desc: 'Priority wire advisory notifications' },
            { key: 'marketplace' as const, label: 'Marketplace Syndication', desc: 'Story purchases & licensing updates' },
            { key: 'production' as const, label: 'Night Production & Press', desc: 'Press plate status & distribution alerts' },
            { key: 'financial' as const, label: 'Royalty & Payout Alerts', desc: 'Balance settlements and payouts' },
            { key: 'system' as const, label: 'Critical System & Security Alerts', desc: 'Required system notifications (locked)', locked: true },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800/80"
            >
              <div className="pr-2">
                <p className="font-semibold text-slate-200 flex items-center space-x-1.5">
                  <span>{item.label}</span>
                  {item.locked && <Lock className="w-3 h-3 text-amber-400" />}
                </p>
                <p className="text-[10px] text-slate-400">{item.desc}</p>
              </div>

              <button
                type="button"
                disabled={item.locked}
                onClick={() => handleTogglePreference(item.key)}
                className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
                  preferences[item.key] ? 'bg-amber-500' : 'bg-slate-700'
                } ${item.locked ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    preferences[item.key] ? 'translate-x-4' : 'translate-x-0.5'
                  } top-0.5 absolute`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Local Data & Cache Cleanup */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex items-center space-x-2">
          <Trash2 className="w-4 h-4 text-rose-400" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Local Storage & Data Hygiene
          </h4>
        </div>

        <p className="text-xs text-slate-400">
          Clear local temporary media caches and already-synced drafts without deleting server records.
        </p>

        {cleanedCount && (
          <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl text-xs border border-emerald-500/40">
            {cleanedCount}
          </div>
        )}

        <button
          type="button"
          onClick={handleCleanupCache}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition"
        >
          Purge Synced Offline Caches
        </button>
      </div>

      {/* Version & Device Info */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1 text-xs text-slate-400">
        <div className="flex justify-between">
          <span>Client App Version:</span>
          <span className="font-mono text-slate-200">{versionInfo.currentVersion}</span>
        </div>
        <div className="flex justify-between">
          <span>Minimum Required Version:</span>
          <span className="font-mono text-slate-200">{versionInfo.minimumRequiredVersion}</span>
        </div>
        <div className="flex justify-between">
          <span>Security Protocol:</span>
          <span className="text-emerald-400 font-medium">Tenant Isolated ABAC</span>
        </div>
      </div>

      {/* Logout */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => {
            logout();
            if (onLogout) onLogout();
          }}
          className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold rounded-xl text-xs transition flex items-center justify-center space-x-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Secure Sign Out</span>
        </button>
      </div>
    </div>
  );
};
