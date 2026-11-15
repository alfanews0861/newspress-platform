/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard,
  Newspaper,
  FileText,
  Users,
  CheckCircle2,
  BookOpen,
  Palette,
  ShoppingBag,
  FileDown,
  Wallet,
  BarChart3,
  Settings,
  Terminal,
  Activity,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Search,
  Sliders,
  Youtube,
} from 'lucide-react';
import { NAVIGATION_SECTIONS, NavigationItem } from '../config/navigation';
import { usePermission } from '../hooks/usePermission';

const ICON_MAP: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard className="w-4 h-4" />,
  news: <Newspaper className="w-4 h-4" />,
  youtube_studio: <Youtube className="w-4 h-4 text-red-600" />,
  editorial_queue: <CheckCircle2 className="w-4 h-4" />,
  editions: <BookOpen className="w-4 h-4" />,
  page_designer: <Palette className="w-4 h-4" />,
  paper_settings: <Sliders className="w-4 h-4" />,
  downloads: <FileDown className="w-4 h-4" />,
  marketplace_home: <ShoppingBag className="w-4 h-4" />,
  reporters: <Users className="w-4 h-4" />,
  wallet: <Wallet className="w-4 h-4" />,
  analytics: <BarChart3 className="w-4 h-4" />,
  developer_apps: <Terminal className="w-4 h-4" />,
  reliability_console: <Activity className="w-4 h-4" />,
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
  const [searchQuery, setSearchQuery] = useState('');

  // Default expanded sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    primary: true,
    system_tools: false,
  });

  // Ensure active section expands on route change
  useEffect(() => {
    for (const section of NAVIGATION_SECTIONS) {
      if (section.items.some((item) => item.href === currentPath)) {
        setExpandedSections((prev) => ({ ...prev, [section.id]: true }));
        break;
      }
    }
  }, [currentPath]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return NAVIGATION_SECTIONS.map((section) => {
      const visibleItems = section.items.filter((item) => {
        if (item.requiredPermission && !can(item.requiredPermission)) {
          return false;
        }
        if (!q) return true;
        return (
          item.label.toLowerCase().includes(q) ||
          item.href.toLowerCase().includes(q) ||
          section.title.toLowerCase().includes(q)
        );
      });
      return {
        ...section,
        visibleItems,
      };
    }).filter((s) => s.visibleItems.length > 0);
  }, [searchQuery, can]);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 lg:top-16 bottom-0 left-0 z-30 bg-white dark:bg-[#1f1f1f] border-r border-[#dadce0] dark:border-[#3c4043] flex flex-col transition-all duration-200 ${
          isCollapsed ? 'w-20' : 'w-60'
        } ${isOpenMobile ? 'translate-x-0 top-0 z-50' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Newsroom Sidebar Header & Collapse Toggle */}
        <div className="h-12 px-4 border-b border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between shrink-0">
          {!isCollapsed ? (
            <span className="text-[11px] font-semibold text-[#5f6368] dark:text-[#8e918f] uppercase tracking-wider">
              Newsroom Navigation
            </span>
          ) : (
            <span className="text-xs font-bold text-[#1a73e8] dark:text-[#8ab4f8] mx-auto">
              NP
            </span>
          )}

          {/* Desktop Collapse Toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-full text-[#5f6368] hover:text-[#202124] dark:text-[#8e918f] dark:hover:text-white hover:bg-[#f1f3f4] dark:hover:bg-[#28292a] transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-full text-[#5f6368] hover:text-[#202124] dark:hover:text-white hover:bg-[#f1f3f4] dark:hover:bg-[#28292a] transition-colors cursor-pointer ml-auto"
            title="Close Menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Filter (Google Clean Search Pill) */}
        {!isCollapsed && (
          <div className="px-3 pt-3 pb-1.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#5f6368] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Jump to..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-7 py-1.5 text-xs bg-[#f1f3f4] dark:bg-[#28292a] focus:bg-white dark:focus:bg-[#1f1f1f] border border-transparent focus:border-[#1a73e8] rounded-full text-[#202124] dark:text-[#f2f2f2] placeholder-[#70757a] focus:outline-none transition-all font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5f6368] hover:text-[#202124] dark:hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3 text-sm font-sans">
          {filteredSections.map((section) => {
            const isExpanded = searchQuery.length > 0 || !!expandedSections[section.id];
            const hasActiveItem = section.visibleItems.some((item) => item.href === currentPath);

            return (
              <div key={section.id} className="space-y-0.5">
                {/* Section Title */}
                {!isCollapsed && (
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={`w-full flex items-center justify-between px-3 py-1 text-left text-[11px] font-medium tracking-wide uppercase transition-colors cursor-pointer rounded-full ${
                      hasActiveItem
                        ? 'text-[#1a73e8] dark:text-[#8ab4f8]'
                        : 'text-[#5f6368] hover:text-[#202124] dark:text-[#8e918f] dark:hover:text-white'
                    }`}
                  >
                    <span>{section.title}</span>
                    <span>
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </span>
                  </button>
                )}

                {/* Section Items */}
                {(isExpanded || isCollapsed) && (
                  <div className="space-y-0.5">
                    {section.visibleItems.map((item) => {
                      const isActive =
                        item.href === '/dashboard'
                          ? currentPath === '/dashboard' || currentPath === '/overview'
                          : currentPath.startsWith(item.href);
                      const icon = ICON_MAP[item.id] || <FileText className="w-4 h-4" />;

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onNavigate(item.href);
                            onCloseMobile();
                          }}
                          title={isCollapsed ? item.label : undefined}
                          className={`w-full inline-flex flex-row items-center ${
                            isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2'
                          } rounded-full text-xs font-semibold transition-all cursor-pointer select-none whitespace-nowrap ${
                            isActive
                              ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#004a77] dark:text-[#c2e7ff]'
                              : 'text-[#3c4043] dark:text-[#c4c7c5] hover:text-[#202124] dark:hover:text-white hover:bg-[#f1f3f4] dark:hover:bg-[#28292a]'
                          }`}
                        >
                          <div className="inline-flex flex-row items-center gap-2.5 truncate">
                            <span
                              className={`w-6 h-6 rounded-md inline-flex items-center justify-center shrink-0 border transition-colors ${
                                isActive
                                  ? 'bg-[#1a73e8] text-white border-[#1a73e8] dark:bg-[#1a73e8] dark:text-white dark:border-[#1a73e8]'
                                  : 'bg-white dark:bg-[#28292a] text-[#5f6368] dark:text-[#8e918f] border-[#dadce0] dark:border-[#444746]'
                              }`}
                            >
                              {React.isValidElement(icon)
                                ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-3.5 h-3.5' })
                                : icon}
                            </span>
                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                          </div>

                          {!isCollapsed && item.badge && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#fef7e0] text-[#b06000] dark:bg-[#382c00] dark:text-[#fdd663] ml-1.5 shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Quick Status */}
        <div className="p-3 border-t border-[#dadce0] dark:border-[#3c4043] bg-[#f8fafd] dark:bg-[#1f1f1f]">
          {!isCollapsed ? (
            <div className="flex items-center justify-between text-xs text-[#5f6368] dark:text-[#8e918f]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1e8e3e]" />
                <span>System Online</span>
              </span>
              <span className="text-[10px] font-mono">v2.5</span>
            </div>
          ) : (
            <div className="flex justify-center" title="System Online">
              <span className="w-2 h-2 rounded-full bg-[#1e8e3e]" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
