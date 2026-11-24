/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { NewsPage } from '../pages/newsroom/NewsPage';
import { SubmissionsPage } from '../pages/newsroom/SubmissionsPage';
import { ReportersPage } from '../pages/newsroom/ReportersPage';
import { EditorialQueuePage } from '../pages/newsroom/EditorialQueuePage';
import { YouTubeNewsStudioPage } from '../pages/newsroom/YouTubeNewsStudioPage';
import { EditionsPage } from '../pages/newspaper/EditionsPage';
import { EditionCalendarPage } from '../pages/newspaper/EditionCalendarPage';
import { EditionPlanningPage } from '../pages/newspaper/EditionPlanningPage';
import { FrontPagePlannerPage } from '../pages/newspaper/FrontPagePlannerPage';
import { EditionReadinessPage } from '../pages/newspaper/EditionReadinessPage';
import { EditionReviewPage } from '../pages/newspaper/EditionReviewPage';
import { PageDesignerPage } from '../pages/newspaper/PageDesignerPage';
import { TemplatesPage } from '../pages/newspaper/TemplatesPage';
import { BrandsPage } from '../pages/newspaper/BrandsPage';
import { MarketplacePage } from '../pages/marketplace/MarketplacePage';
import { MarketplaceHomePage } from '../pages/marketplace/MarketplaceHomePage';
import { MarketplaceSearchPage } from '../pages/marketplace/MarketplaceSearchPage';
import { MarketplaceStoryDetailPage } from '../pages/marketplace/MarketplaceStoryDetailPage';
import { PurchaseConfirmationPage } from '../pages/marketplace/PurchaseConfirmationPage';
import { LicensedContentWorkspacePage } from '../pages/marketplace/LicensedContentWorkspacePage';
import { MarketplacePurchaseHistoryPage } from '../pages/marketplace/MarketplacePurchaseHistoryPage';
import { LicenseDetailPage } from '../pages/marketplace/LicenseDetailPage';
import { MarketplaceAdminPage } from '../pages/marketplace/MarketplaceAdminPage';
import { MarketplaceAnalyticsDashboard } from '../pages/marketplace/MarketplaceAnalyticsDashboard';
import { PurchasedNewsPage } from '../pages/marketplace/PurchasedNewsPage';
import { MyListingsPage } from '../pages/marketplace/MyListingsPage';
import { LicensesPage } from '../pages/marketplace/LicensesPage';
import { FinalizedEditionsPage } from '../pages/production/FinalizedEditionsPage';
import { ProductionQueuePage } from '../pages/production/ProductionQueuePage';
import { DownloadsPage } from '../pages/production/DownloadsPage';
import { ProductionOperationsDashboard } from '../pages/production/ProductionOperationsDashboard';
import { EditionProductionDetailPage } from '../pages/production/EditionProductionDetailPage';
import { VendorManagementPage } from '../pages/production/VendorManagementPage';
import { RegionManagementPage } from '../pages/production/RegionManagementPage';
import { WalletPage } from '../pages/finance/WalletPage';
import { TransactionsPage } from '../pages/finance/TransactionsPage';
import { ReporterEarningsPage } from '../pages/finance/ReporterEarningsPage';
import { PayoutsPage } from '../pages/finance/PayoutsPage';
import { AnalyticsPage } from '../pages/analytics/AnalyticsPage';
import { ExecutiveIntelligenceDashboard } from '../pages/analytics/ExecutiveIntelligenceDashboard';
import { MISReportBuilderPage } from '../pages/analytics/MISReportBuilderPage';
import { PublisherBillingPage } from '../pages/finance/PublisherBillingPage';
import { BillingAdminPage } from '../pages/admin/BillingAdminPage';
import { AffiliateProgramPage } from '../pages/affiliate/AffiliateProgramPage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { StaffManagementPage } from '../pages/newsroom/StaffManagementPage';
import { MobileOperationsPage } from '../pages/mobile/MobileOperationsPage';
import { ReporterProfilePage } from '../pages/newsroom/ReporterProfilePage';
import { BeatManagementPage } from '../pages/newsroom/BeatManagementPage';
import { DeskManagementPage } from '../pages/newsroom/DeskManagementPage';
import { AssignmentManagementPage } from '../pages/newsroom/AssignmentManagementPage';
import { NewsroomDeskPage } from '../pages/newsroom/NewsroomDeskPage';
import { ReporterDashboardPage } from '../pages/newsroom/ReporterDashboardPage';
import { ReporterInvitationPage } from '../pages/newsroom/ReporterInvitationPage';
import { DeveloperAppsPage } from '../pages/developer/DeveloperAppsPage';
import { ApiKeysPage } from '../pages/developer/ApiKeysPage';
import { WebhooksPage } from '../pages/developer/WebhooksPage';
import { WebhookDeliveriesPage } from '../pages/developer/WebhookDeliveriesPage';
import { ApiUsagePage } from '../pages/developer/ApiUsagePage';
import { ApiDocumentationPage } from '../pages/developer/ApiDocumentationPage';
import { ReliabilitySecurityOperationsPage } from '../pages/operations/ReliabilitySecurityOperationsPage';
import { PlatformSuperAdminPage } from '../pages/admin/PlatformSuperAdminPage';
import { SupportOperationsPage } from '../pages/admin/SupportOperationsPage';
import { LaunchReadinessDashboardPage } from '../pages/admin/LaunchReadinessDashboardPage';
import { CustomerHandoverDocumentationPage } from '../pages/admin/CustomerHandoverDocumentationPage';
import { WireFeedsAdminPage } from '../pages/admin/WireFeedsAdminPage';
import { LandingPage } from '../pages/public/LandingPage';
import { LegalCenterPage, LegalTabKey } from '../pages/public/LegalCenterPage';
import { AccountDeletionPage } from '../pages/public/AccountDeletionPage';
import { UserPortalPage, UserPortalTabKey } from '../pages/user/UserPortalPage';
import { useAuth } from '../hooks/useAuth';
import { LoadingState } from '../components/ui/LoadingState';
import { getCurrentPath, navigateTo } from '../utils/navigation';
import { updateSEO } from '../utils/seo';

export const AppContent: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(() => getCurrentPath());
  const { isLoading } = useAuth();

  React.useEffect(() => {
    // Initial SEO update for landing/current page
    updateSEO(currentPath);

    // Listen for custom navigation events
    const handleNavigate = (e: any) => {
      if (e.detail && typeof e.detail === 'string') {
        const nextPath = e.detail;
        setCurrentPath(nextPath);
        // Ensure browser address bar updates to the multi-page URL if not already matching
        try {
          const currentFull = `${window.location.pathname}${window.location.search}`;
          if (typeof window !== 'undefined' && currentFull !== nextPath) {
            window.history.pushState({ path: nextPath }, '', nextPath);
          }
        } catch {
          // Ignore sandboxed history errors
        }
        updateSEO(nextPath);
      }
    };

    // Listen for browser Back/Forward history navigation
    const handlePopState = () => {
      const nextPath = getCurrentPath();
      setCurrentPath(nextPath);
      updateSEO(nextPath);
    };

    window.addEventListener('navigate', handleNavigate);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);

    return () => {
      window.removeEventListener('navigate', handleNavigate);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafd] dark:bg-[#202124] flex items-center justify-center">
        <LoadingState
          message="Initializing NewsPress SaaS Platform..."
          submessage="Resolving multi-tenant permissions and newsroom schema"
        />
      </div>
    );
  }

  const basePath = currentPath.split('?')[0];

  if (basePath === '/login') {
    return <LoginPage onSuccess={() => navigateTo('/dashboard')} />;
  }

  // Standalone Public Landing Page (Zero login requirement, full-screen public experience)
  if (basePath === '/' || basePath === '/landing') {
    return <LandingPage onNavigate={navigateTo} />;
  }

  // Standalone Statutory & Legal Compliance Center
  if (
    basePath === '/legal' ||
    basePath === '/privacy' ||
    basePath === '/terms' ||
    basePath === '/editorial-policy' ||
    basePath === '/grievance' ||
    basePath === '/cookies' ||
    basePath === '/marketplace-terms' ||
    basePath === '/google-youtube-policy' ||
    basePath === '/play-store-policy' ||
    basePath === '/liability-refund'
  ) {
    let initialTab: LegalTabKey = 'terms';
    if (basePath === '/privacy') initialTab = 'privacy';
    else if (basePath === '/editorial-policy') initialTab = 'editorial';
    else if (basePath === '/grievance') initialTab = 'grievance';
    else if (basePath === '/cookies') initialTab = 'cookies';
    else if (basePath === '/marketplace-terms') initialTab = 'marketplace';
    else if (basePath === '/google-youtube-policy') initialTab = 'google-youtube';
    else if (basePath === '/play-store-policy') initialTab = 'play-store';
    else if (basePath === '/liability-refund') initialTab = 'liability-refund';

    return <LegalCenterPage initialTab={initialTab} onNavigate={navigateTo} />;
  }

  // Google Play Store Account & Data Deletion Public Web Page
  if (basePath === '/account-deletion' || basePath === '/user/account-deletion') {
    return <AccountDeletionPage onNavigate={navigateTo} />;
  }

  const renderCurrentPage = () => {
    switch (basePath) {
      case '/user':
      case '/user/portal':
      case '/user/account':
      case '/profile':
        return <UserPortalPage initialTab="profile" onNavigate={navigateTo} />;
      case '/user/plan':
        return <UserPortalPage initialTab="plan" onNavigate={navigateTo} />;
      case '/user/credits':
      case '/user/wallet':
        return <UserPortalPage initialTab="credits" onNavigate={navigateTo} />;
      case '/user/paper':
      case '/user/epaper':
        return <UserPortalPage initialTab="paper" onNavigate={navigateTo} />;
      case '/user/reporter':
        return <UserPortalPage initialTab="reporter" onNavigate={navigateTo} />;
      case '/user/youtube':
        return <UserPortalPage initialTab="youtube" onNavigate={navigateTo} />;
      case '/user/legal':
        return <UserPortalPage initialTab="legal" onNavigate={navigateTo} />;
      case '/dashboard':
      case '/overview':
        return <DashboardPage onNavigate={navigateTo} />;
      case '/newsroom/news':
        return <NewsPage />;
      case '/newsroom/youtube-studio':
        return <YouTubeNewsStudioPage />;
      case '/newsroom/submissions':
        return <SubmissionsPage />;
      case '/newsroom/reporters':
        return <ReportersPage />;
      case '/newsroom/editorial-queue':
        return <EditorialQueuePage />;
      case '/newsroom/desk':
        return <NewsroomDeskPage />;
      case '/newsroom/assignments':
        return <AssignmentManagementPage />;
      case '/newsroom/reporter-dashboard':
        return <ReporterDashboardPage />;
      case '/newsroom/staff':
        return <StaffManagementPage />;
      case '/newsroom/reporter-profile':
        return <ReporterProfilePage />;
      case '/newsroom/desks':
        return <DeskManagementPage />;
      case '/newsroom/beats':
        return <BeatManagementPage />;
      case '/invite':
        return <ReporterInvitationPage />;
      case '/newspaper/calendar':
        return <EditionCalendarPage onNavigate={navigateTo} />;
      case '/newspaper/edition-planning':
        return <EditionPlanningPage />;
      case '/newspaper/front-page':
        return <FrontPagePlannerPage />;
      case '/newspaper/readiness':
        return <EditionReadinessPage onNavigate={navigateTo} />;
      case '/newspaper/review':
        return <EditionReviewPage onNavigate={navigateTo} />;
      case '/newspaper/editions':
        return <EditionsPage />;
      case '/newspaper/page-designer':
        return <PageDesignerPage />;
      case '/newspaper/templates':
        return <TemplatesPage />;
      case '/newspaper/brands':
        return <BrandsPage />;
      case '/marketplace':
      case '/marketplace/wire':
        return <MarketplaceHomePage />;
      case '/marketplace/search':
        return <MarketplaceSearchPage />;
      case '/marketplace/licensed':
      case '/marketplace/purchased':
        return <LicensedContentWorkspacePage />;
      case '/marketplace/purchases':
      case '/marketplace/licenses':
        return <MarketplacePurchaseHistoryPage />;
      case '/marketplace/listings':
        return <MyListingsPage />;
      case '/marketplace/admin':
        return <MarketplaceAdminPage />;
      case '/marketplace/analytics':
        return <MarketplaceAnalyticsDashboard />;
      case '/production/operations':
        return <ProductionOperationsDashboard />;
      case '/production/detail':
        return <EditionProductionDetailPage />;
      case '/production/vendors':
        return <VendorManagementPage />;
      case '/production/regions':
        return <RegionManagementPage />;
      case '/production/finalized':
        return <FinalizedEditionsPage />;
      case '/production/queue':
        return <ProductionQueuePage />;
      case '/production/downloads':
        return <DownloadsPage />;
      case '/affiliate':
      case '/partner':
        return <AffiliateProgramPage />;
      case '/finance/billing':
        return <PublisherBillingPage />;
      case '/admin/billing':
        return <BillingAdminPage />;
      case '/finance/wallet':
        return <WalletPage />;
      case '/finance/transactions':
        return <TransactionsPage />;
      case '/finance/earnings':
        return <ReporterEarningsPage />;
      case '/finance/payouts':
        return <PayoutsPage />;
      case '/analytics':
        return <AnalyticsPage />;
      case '/admin/analytics/executive':
      case '/analytics/executive':
        return <ExecutiveIntelligenceDashboard />;
      case '/analytics/reports':
        return <MISReportBuilderPage />;
      case '/settings':
        return <SettingsPage />;
      case '/mobile':
        return <MobileOperationsPage />;
      case '/developer':
      case '/developer/apps':
        return <DeveloperAppsPage />;
      case '/developer/api-keys':
        return <ApiKeysPage />;
      case '/developer/webhooks':
        return <WebhooksPage />;
      case '/developer/webhook-deliveries':
        return <WebhookDeliveriesPage />;
      case '/developer/api-usage':
        return <ApiUsagePage />;
      case '/developer/docs':
        return <ApiDocumentationPage />;
      case '/operations':
      case '/operations/reliability':
        return <ReliabilitySecurityOperationsPage initialTab="health" />;
      case '/operations/threats':
        return <ReliabilitySecurityOperationsPage initialTab="threats" />;
      case '/operations/dr':
        return <ReliabilitySecurityOperationsPage initialTab="dr" />;
      case '/operations/runbooks':
        return <ReliabilitySecurityOperationsPage initialTab="runbooks" />;
      case '/operations/integrity':
        return <ReliabilitySecurityOperationsPage initialTab="integrity" />;
      case '/admin/platform':
        return <PlatformSuperAdminPage />;
      case '/admin/support':
        return <SupportOperationsPage />;
      case '/admin/readiness':
        return <LaunchReadinessDashboardPage />;
      case '/admin/docs':
        return <CustomerHandoverDocumentationPage />;
      case '/admin/wire-feeds':
      case '/marketplace/wire-feeds':
        return <WireFeedsAdminPage />;
      default:
        if (basePath.startsWith('/developer/apps/')) {
          return <DeveloperAppsPage />;
        }
        if (basePath.startsWith('/mobile')) {
          return <MobileOperationsPage />;
        }
        if (basePath.startsWith('/marketplace/story/')) {
          return <MarketplaceStoryDetailPage />;
        }
        if (basePath.startsWith('/marketplace/purchase-confirmation/')) {
          return <PurchaseConfirmationPage />;
        }
        if (basePath.startsWith('/marketplace/license/')) {
          return <LicenseDetailPage />;
        }
        return <DashboardPage onNavigate={navigateTo} />;
    }
  };

  return (
    <DashboardLayout currentPath={basePath} onNavigate={navigateTo}>
      {renderCurrentPage()}
    </DashboardLayout>
  );
};
