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
} from 'lucide-react';
import { NAVIGATION_SECTIONS, NavigationItem } from '../config/navigation';
import { usePermission } from '../hooks/usePermission';

const ICON_MAP: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard className="w-4 h-4" />,
  news: <Newspaper className="w-4 h-4" />,
  editorial_queue: <CheckCircle2 className="w-4 h-4" />,
  editions: <BookOpen className="w-4 h-4" />,
  page_designer: <Palette className="w-4 h-4" />,
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
        className={`fixed top-0 lg:top-16 bottom-0 left-0 z-30 bg-white dark:bg-[#1a1b1e] border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-200 ${
          isCollapsed ? 'w-20' : 'w-60'
        } ${isOpenMobile ? 'translate-x-0 top-0 z-50' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Newsroom Sidebar Header & Collapse Toggle */}
        <div className="h-12 px-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          {!isCollapsed ? (
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Newsroom Navigation
            </span>
          ) : (
            <span className="text-xs font-black text-blue-600 dark:text-blue-400 mx-auto">
              NP
            </span>
          )}

          {/* Desktop Collapse Toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-auto"
            title="Close Menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Filter (Only when expanded) */}
        {!isCollapsed && (
          <div className="px-3 pt-2.5 pb-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Jump to..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
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
                    className={`w-full flex items-center justify-between px-2.5 py-1 text-left text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer rounded-md ${
                      hasActiveItem
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
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
                          className={`w-full flex items-center ${
                            isCollapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-1.5'
                          } rounded-lg text-xs font-medium transition-all cursor-pointer select-none ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 font-bold dark:bg-blue-950/60 dark:text-blue-300'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span
                              className={`shrink-0 ${
                                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                              }`}
                            >
                              {icon}
                            </span>
                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                          </div>

                          {!isCollapsed && item.badge && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 ml-1.5 shrink-0">
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
        <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          {!isCollapsed ? (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>System Online</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">v2.5</span>
            </div>
          ) : (
            <div className="flex justify-center" title="System Online">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
