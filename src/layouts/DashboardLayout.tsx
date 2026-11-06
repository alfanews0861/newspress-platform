/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { UnifiedPlatformHeader } from '../components/navigation/UnifiedPlatformHeader';
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
    <div className="min-h-screen bg-[#f8fafd] dark:bg-[#151619] text-[#202124] dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* 1. Clean Sleek 64px Header */}
      <UnifiedPlatformHeader
        currentPath={currentPath}
        onNavigate={onNavigate}
        onToggleSidebarMobile={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onQuickNewStory={() => setIsQuickStoryOpen(true)}
      />

      {/* 2. Workspace Body */}
      <div className="flex flex-1 relative">
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
          className={`transition-all duration-200 flex-1 flex flex-col ${
            isFullBleed ? 'h-[calc(100vh-64px)] overflow-hidden' : 'min-h-[calc(100vh-64px)]'
          } ${isCollapsed ? 'lg:pl-20' : 'lg:pl-60'}`}
        >
          <main className={isFullBleed ? 'flex-1 w-full h-full overflow-hidden p-0' : 'flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto'}>
            {children}
          </main>

          {!isFullBleed && (
            <footer className="py-3 px-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-sans flex flex-col sm:flex-row items-center justify-between gap-2 bg-white dark:bg-[#1a1b1e]">
              <span>NewsPress Multi-Tenant Platform</span>
              <span className="text-blue-600 dark:text-blue-400 font-medium">Simplified Editorial Console</span>
            </footer>
          )}
        </div>
      </div>

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
