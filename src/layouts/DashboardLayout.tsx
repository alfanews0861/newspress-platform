/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { UnifiedPlatformHeader } from '../components/navigation/UnifiedPlatformHeader';
import { MobileBottomNav } from '../components/navigation/MobileBottomNav';
import { QuickStoryModal } from '../components/editorial/QuickStoryModal';

export interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (href: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  currentPath,
  onNavigate,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQuickStoryOpen, setIsQuickStoryOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('newspress_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const isFullBleed = currentPath === '/newspaper/page-designer';

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('newspress_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafd] dark:bg-[#1f1f1f] text-[#202124] dark:text-[#f2f2f2] flex flex-col font-sans transition-colors w-full max-w-full overflow-x-hidden">
      {/* 1. Clean Sleek 64px Header */}
      <UnifiedPlatformHeader
        currentPath={currentPath}
        onNavigate={onNavigate}
        onToggleSidebarMobile={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onQuickNewStory={() => setIsQuickStoryOpen(true)}
      />

      {/* 2. Workspace Body */}
      <div className="flex flex-1 relative w-full min-w-0 max-w-full overflow-x-hidden">
        <Sidebar
          currentPath={currentPath}
          onNavigate={onNavigate}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />

        {/* Main Content Area */}
        <div
          className={`transition-all duration-200 flex-1 flex flex-col min-w-0 w-full max-w-full ${
            isFullBleed ? 'h-[calc(100dvh-64px-56px)] lg:h-[calc(100vh-64px)] overflow-hidden' : 'min-h-[calc(100dvh-64px)] overflow-x-hidden'
          } ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}
        >
          <main className={isFullBleed ? 'flex-1 min-h-0 flex flex-col w-full h-full overflow-hidden p-0' : 'flex-1 min-w-0 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-20 lg:pb-8'}>
            {children}
          </main>

          {!isFullBleed && (
            <footer className="py-3 px-6 border-t border-[#dadce0] dark:border-[#3c4043] text-xs text-[#5f6368] dark:text-[#8e918f] font-sans flex flex-col sm:flex-row items-center justify-between gap-2 bg-white dark:bg-[#1f1f1f] mb-14 lg:mb-0">
              <span>NewsPress Multi-Tenant Platform</span>
              <span className="text-[#1a73e8] dark:text-[#8ab4f8] font-medium">Simplified Editorial Console</span>
            </footer>
          )}
        </div>
      </div>

      {/* 3. Mobile Bottom Navigation Bar (Phone & Tablet) */}
      <MobileBottomNav
        currentPath={currentPath}
        onNavigate={onNavigate}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Global Quick Story Composer */}
      <QuickStoryModal
        isOpen={isQuickStoryOpen}
        onClose={() => setIsQuickStoryOpen(false)}
        onStoryCreated={() => {
          window.dispatchEvent(new CustomEvent('story_created'));
        }}
      />
    </div>
  );
};
