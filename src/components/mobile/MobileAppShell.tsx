/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 13 — Mobile App Shell & Role-Aware Navigation
 * Native-like mobile container with status bar, connection & bandwidth toggles,
 * dynamic RBAC bottom tabs, floating quick actions, and deep-link routing.
 */

import React, { useState, useEffect } from 'react';
import {
  Home,
  Briefcase,
  FileEdit,
  Camera,
  FileCheck,
  Newspaper,
  ShoppingCart,
  Printer,
  Wallet,
  User,
  Bell,
  Wifi,
  WifiOff,
  Layers,
  Smartphone,
  Maximize2,
  Minimize2,
  RefreshCw,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { MobileTab, MobileNetworkState, MobileBandwidthMode, MobilePushNotification } from '../../types/mobile';
import { OfflineReportingStore } from '../../services/mobileOfflineStore';
import { MobilePushNotificationService } from '../../services/mobilePushNotificationService';
import { MobileDashboardScreen } from './MobileDashboardScreen';
import { ReporterAssignmentsScreen } from './ReporterAssignmentsScreen';
import { MobileNewsEditor } from './MobileNewsEditor';
import { MobileEditorialReview } from './MobileEditorialReview';
import { MobileEditionStatusScreen } from './MobileEditionStatusScreen';
import { MobileMarketplaceScreen } from './MobileMarketplaceScreen';
import { MobileFinanceScreen } from './MobileFinanceScreen';
import { MobileProfileScreen } from './MobileProfileScreen';
import { MobileSyncQueueDrawer } from './MobileSyncQueueDrawer';
import { FieldEvidenceCaptureModal } from './FieldEvidenceCaptureModal';
import { NewsAssignment } from '../../types/newsroom';

export const MobileAppShell: React.FC = () => {
  const { user, currentMembership } = useAuth();
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.tenantId || 'tenant-metro-chronicle';
  const userId = user?.uid || user?.userId || 'rep_sofia_chen';

  const [activeTab, setActiveTab] = useState<MobileTab>('home');
  const [isDeviceFrame, setIsDeviceFrame] = useState<boolean>(true);
  const [networkState, setNetworkState] = useState<MobileNetworkState>(OfflineReportingStore.getNetworkState());
  const [bandwidthMode, setBandwidthMode] = useState<MobileBandwidthMode>(OfflineReportingStore.getBandwidthMode());
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState<boolean>(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [notificationsList, setNotificationsList] = useState<MobilePushNotification[]>([]);

  // Draft state linking
  const [selectedAssignmentForDraft, setSelectedAssignmentForDraft] = useState<NewsAssignment | null>(null);

  // Sync state subscriptions
  useEffect(() => {
    const unsub = OfflineReportingStore.subscribe(() => {
      setNetworkState(OfflineReportingStore.getNetworkState());
      setBandwidthMode(OfflineReportingStore.getBandwidthMode());
    });
    return unsub;
  }, []);

  // Notifications refresh
  useEffect(() => {
    const notifs = MobilePushNotificationService.getNotificationsForUser(userId, tenantId);
    setNotificationsList(notifs);
    setUnreadNotifications(MobilePushNotificationService.getUnreadCount(userId, tenantId));
  }, [userId, tenantId, isNotificationsOpen]);

  const toggleNetwork = () => {
    const next = networkState === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    OfflineReportingStore.setNetworkState(next);
  };

  const isReporter =
    currentMembership?.reporterRole === 'staff_reporter' ||
    currentMembership?.reporterRole === 'freelance_reporter';
  const isEditor =
    currentMembership?.organizationRole === 'editor' ||
    currentMembership?.organizationRole === 'editor_in_chief';
  const isPublisher =
    currentMembership?.organizationRole === 'owner' ||
    currentMembership?.organizationRole === 'administrator';

  // Dynamic tabs based on RBAC
  const getTabs = () => {
    const baseTabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
      { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    ];

    if (isReporter) {
      baseTabs.push(
        { id: 'assignments', label: 'Assignments', icon: <Briefcase className="w-5 h-5" /> },
        { id: 'drafts', label: 'Field Draft', icon: <FileEdit className="w-5 h-5" /> },
        { id: 'finance', label: 'Wallet', icon: <Wallet className="w-5 h-5" /> }
      );
    } else if (isEditor) {
      baseTabs.push(
        { id: 'review', label: 'Review Queue', icon: <FileCheck className="w-5 h-5" /> },
        { id: 'editions', label: 'Editions', icon: <Newspaper className="w-5 h-5" /> },
        { id: 'marketplace', label: 'Marketplace', icon: <ShoppingCart className="w-5 h-5" /> }
      );
    } else {
      baseTabs.push(
        { id: 'editions', label: 'Editions', icon: <Newspaper className="w-5 h-5" /> },
        { id: 'marketplace', label: 'Marketplace', icon: <ShoppingCart className="w-5 h-5" /> },
        { id: 'production', label: 'Production', icon: <Printer className="w-5 h-5" /> }
      );
    }

    baseTabs.push({ id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> });
    return baseTabs;
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <MobileDashboardScreen
            onNavigateTab={setActiveTab}
            onOpenDraft={(draftId) => {
              setSelectedAssignmentForDraft(null);
              setActiveTab('drafts');
            }}
          />
        );
      case 'assignments':
        return (
          <ReporterAssignmentsScreen
            onSelectAssignmentForDraft={(asg) => {
              setSelectedAssignmentForDraft(asg);
              setActiveTab('drafts');
            }}
          />
        );
      case 'drafts':
        return (
          <MobileNewsEditor
            assignmentId={selectedAssignmentForDraft?.assignmentId}
            initialHeadline={selectedAssignmentForDraft ? `Reporting on ${selectedAssignmentForDraft.title}` : ''}
            initialBeat={selectedAssignmentForDraft?.beat || 'Metro'}
            initialLocation={selectedAssignmentForDraft?.location || 'Downtown'}
            onBack={() => setActiveTab('home')}
            onSubmitSuccess={() => setActiveTab(isReporter ? 'assignments' : 'home')}
          />
        );
      case 'review':
        return <MobileEditorialReview />;
      case 'editions':
      case 'production':
        return <MobileEditionStatusScreen />;
      case 'marketplace':
        return <MobileMarketplaceScreen />;
      case 'finance':
        return <MobileFinanceScreen />;
      case 'profile':
        return <MobileProfileScreen />;
      default:
        return <MobileDashboardScreen onNavigateTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-950 flex flex-col items-center justify-start p-2 sm:p-4">
      {/* Top Device Frame Toolbar */}
      <div className="w-full max-w-md flex items-center justify-between px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl mb-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-amber-400">NewsPress Mobile Ops</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">Phase 13 Layer</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Toggle Device Frame / Fullscreen */}
          <button
            type="button"
            onClick={() => setIsDeviceFrame(!isDeviceFrame)}
            className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] transition"
          >
            {isDeviceFrame ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            <span>{isDeviceFrame ? 'Full Viewport' : 'Phone Frame'}</span>
          </button>
        </div>
      </div>

      {/* Main Container (Bezel or Full Viewport) */}
      <div
        className={`w-full transition-all flex flex-col overflow-hidden bg-slate-950 ${
          isDeviceFrame
            ? 'max-w-[420px] h-[840px] rounded-[36px] border-[8px] border-slate-800 shadow-2xl ring-1 ring-slate-700 relative'
            : 'max-w-3xl min-h-[780px] rounded-2xl border border-slate-800'
        }`}
      >
        {/* Device Status Bar */}
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between text-[11px]">
          {/* Clock & Tenant */}
          <div className="flex items-center space-x-2">
            <span className="font-mono font-bold text-slate-200">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-amber-400 font-medium truncate max-w-[90px]">
              {currentTenant?.organizationName || currentTenant?.name || 'Metro Chronicle'}
            </span>
          </div>

          {/* Connection Pill & Actions */}
          <div className="flex items-center space-x-1.5">
            {/* Network Toggle */}
            <button
              type="button"
              onClick={toggleNetwork}
              title="Click to toggle simulated offline field mode"
              className={`flex items-center space-x-1 px-2 py-0.5 rounded-full font-bold text-[10px] transition ${
                networkState === 'ONLINE'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : networkState === 'SYNCING'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}
            >
              {networkState === 'ONLINE' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{networkState}</span>
            </button>

            {/* Sync Queue Trigger */}
            <button
              type="button"
              onClick={() => setIsSyncDrawerOpen(true)}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 relative"
              title="Open Offline Sync Queue"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>

            {/* Notifications Bell */}
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(true)}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 relative"
              title="Push Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Screen Viewport */}
        <div className="flex-1 overflow-y-auto relative bg-slate-950">
          {renderActiveScreen()}
        </div>

        {/* Bottom Tab Bar */}
        <div className="bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around z-20">
          {getTabs().map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
                  isActive
                    ? 'text-amber-400 font-bold scale-105'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.icon}
                <span className="text-[10px] mt-0.5">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sync Queue Drawer */}
      <MobileSyncQueueDrawer
        isOpen={isSyncDrawerOpen}
        onClose={() => setIsSyncDrawerOpen(false)}
      />

      {/* Field Evidence Quick Capture Modal */}
      <FieldEvidenceCaptureModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        tenantId={tenantId}
        reporterId={userId}
        onEvidenceAdded={() => {}}
      />

      {/* Push Notifications Tray Modal */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">Push Notifications</h3>
              </div>
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {notificationsList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No new push notifications.
                </div>
              ) : (
                notificationsList.map((n) => (
                  <div
                    key={n.notificationId}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      n.read ? 'bg-slate-950 border-slate-800/80 text-slate-400' : 'bg-slate-900 border-amber-500/40 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100">{n.title}</span>
                      <span className="text-[10px] text-slate-500">{new Date(n.receivedAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{n.body}</p>
                    <div className="flex justify-between items-center pt-1 text-[10px] text-amber-400 font-mono">
                      <span>{n.category}</span>
                      <span className="text-slate-500">{n.deepLink}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-between">
              <button
                type="button"
                onClick={() => {
                  MobilePushNotificationService.markAllAsRead(userId, tenantId);
                  setUnreadNotifications(0);
                  setNotificationsList(MobilePushNotificationService.getNotificationsForUser(userId, tenantId));
                }}
                className="text-xs text-amber-400 hover:underline"
              >
                Mark all as read
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
