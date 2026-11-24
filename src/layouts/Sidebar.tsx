/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  LayoutDashboard,
  Newspaper,
  FileText,
  Users,
  BookOpen,
  Palette,
  ShoppingBag,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Sliders,
  Youtube,
  User,
  Rss,
} from 'lucide-react';
import { NAVIGATION_SECTIONS } from '../config/navigation';
import { usePermission } from '../hooks/usePermission';

const ICON_MAP: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard className="w-4 h-4" />,
  news: <Newspaper className="w-4 h-4" />,
  youtube_studio: <Youtube className="w-4 h-4" />,
  editions: <BookOpen className="w-4 h-4" />,
  page_designer: <Palette className="w-4 h-4" />,
  paper_settings: <Sliders className="w-4 h-4" />,
  marketplace_home: <ShoppingBag className="w-4 h-4" />,
  reporters: <Users className="w-4 h-4" />,
  user_portal: <User className="w-4 h-4" />,
  wire_feeds: <Rss className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
};

export interface SidebarProps {
  currentPath: string;
  onNavigate: (href: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { can } = usePermission();

  const visibleSections = useMemo(() => {
    return NAVIGATION_SECTIONS.map((section) => ({
      ...section,
      visibleItems: section.items.filter(
        (item) => !item.requiredPermission || can(item.requiredPermission)
      ),
    })).filter((s) => s.visibleItems.length > 0);
  }, [can]);

  return (
    <>
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-[#202124]/50 z-50 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 lg:top-[60px] bottom-0 left-0 z-50 bg-white dark:bg-[#1a1c1e] border-r border-[#e0e3e7] dark:border-[#3c4043] flex flex-col transition-transform duration-200 shadow-2xl lg:shadow-none ${
          isCollapsed ? 'lg:w-20 w-72' : 'w-72 lg:w-60'
        } ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top bar inside sidebar */}
        <div className="h-14 px-4 border-b border-[#e0e3e7] dark:border-[#3c4043] flex items-center justify-between shrink-0 lg:h-12">
          <span className={`text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6] ${isCollapsed ? 'lg:hidden' : ''}`}>
            Navigation
          </span>

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg text-[#5f6368] hover:text-[#202124] dark:text-[#9aa0a6] dark:hover:text-white hover:bg-[#f1f3f4] dark:hover:bg-[#2e3135] transition-colors cursor-pointer ml-auto"
              title={isCollapsed ? 'Expand menu' : 'Collapse menu'}
              aria-label={isCollapsed ? 'Expand menu' : 'Collapse menu'}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-full text-[#5f6368] hover:text-[#202124] dark:text-[#bdc1c6] dark:hover:text-white hover:bg-[#f1f3f4] dark:hover:bg-[#2e3135] transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {visibleSections.map((section) => (
            <div key={section.id} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[11px] font-semibold text-[#70757a] dark:text-[#9aa0a6]">
                  {section.title}
                </div>
              )}

              <div className="space-y-0.5">
                {section.visibleItems.map((item) => {
                  const isActive =
                    item.href === '/dashboard'
                      ? currentPath === '/dashboard' || currentPath === '/overview'
                      : item.href === '/marketplace'
                      ? currentPath === '/marketplace' ||
                        (currentPath.startsWith('/marketplace/') && !currentPath.startsWith('/marketplace/my-listings'))
                      : currentPath.startsWith(item.href);

                  const icon = ICON_MAP[item.id] || <FileText className="w-4 h-4" />;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onNavigate(item.href);
                        onCloseMobile();
                      }}
                      title={item.label}
                      className={`w-full min-h-[44px] lg:min-h-[38px] flex items-center ${
                        isCollapsed ? 'lg:justify-center lg:px-0 px-3' : 'px-3'
                      } gap-3 rounded-xl text-sm lg:text-[13px] font-medium transition-colors cursor-pointer select-none whitespace-nowrap ${
                        isActive
                          ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#173054] dark:text-[#8ab4f8] font-semibold'
                          : 'text-[#3c4043] dark:text-[#dadce0] hover:text-[#202124] dark:hover:text-white hover:bg-[#f1f3f4] dark:hover:bg-[#2e3135]'
                      }`}
                    >
                      <span className="shrink-0">{icon}</span>
                      <span className={`truncate text-left ${isCollapsed ? 'lg:hidden' : ''}`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};
