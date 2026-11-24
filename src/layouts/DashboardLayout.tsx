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
    <div className="min-h-screen bg-[#f8fafd] dark:bg-[#1a1c1e] text-[#202124] dark:text-[#f8f9fa] flex flex-col font-sans transition-colors w-full max-w-full overflow-x-clip">
      <UnifiedPlatformHeader
        currentPath={currentPath}
        onNavigate={onNavigate}
        onToggleSidebarMobile={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onQuickNewStory={() => setIsQuickStoryOpen(true)}
      />

      <div className="flex flex-1 relative w-full min-w-0 max-w-full overflow-x-clip">
        <Sidebar
          currentPath={currentPath}
          onNavigate={onNavigate}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />

        <div
          className={`transition-all duration-200 flex-1 flex flex-col min-w-0 w-full max-w-full ${
            isFullBleed
              ? 'h-[calc(100dvh-56px-56px)] sm:h-[calc(100dvh-60px-56px)] lg:h-[calc(100vh-60px)] overflow-hidden'
              : 'min-h-[calc(100dvh-56px)] sm:min-h-[calc(100dvh-60px)] overflow-x-clip'
          } ${isCollapsed ? 'lg:pl-20' : 'lg:pl-60'}`}
        >
          <main
            className={
              isFullBleed
                ? 'flex-1 min-h-0 flex flex-col w-full h-full overflow-hidden p-0'
                : 'flex-1 min-w-0 px-3.5 py-4 sm:p-6 lg:p-7 max-w-7xl w-full mx-auto pb-24 lg:pb-8'
            }
          >
            {children}
          </main>

          {!isFullBleed && (
            <footer className="hidden lg:flex py-3 px-6 border-t border-[#e0e3e7] dark:border-[#3c4043] text-xs text-[#5f6368] dark:text-[#9aa0a6] items-center justify-between bg-white dark:bg-[#1a1c1e]">
              <span>NewsPress</span>
              <span>Editorial &amp; Publishing Suite</span>
            </footer>
          )}
        </div>
      </div>

      <MobileBottomNav
        currentPath={currentPath}
        onNavigate={onNavigate}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
      />

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
