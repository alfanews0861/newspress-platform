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
  BookOpen,
  Palette,
  ShoppingBag,
  Settings,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Sliders,
  Youtube,
  UploadCloud,
} from 'lucide-react';
import { NAVIGATION_SECTIONS } from '../config/navigation';
import { usePermission } from '../hooks/usePermission';

const ICON_MAP: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard className="w-4 h-4" />,
  news: <Newspaper className="w-4 h-4" />,
  youtube_studio: <Youtube className="w-4 h-4 text-red-600" />,
  editions: <BookOpen className="w-4 h-4" />,
  page_designer: <Palette className="w-4 h-4" />,
  paper_settings: <Sliders className="w-4 h-4" />,
  marketplace_home: <ShoppingBag className="w-4 h-4" />,
  my_listings: <UploadCloud className="w-4 h-4" />,
  reporters: <Users className="w-4 h-4" />,
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

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    primary: true,
    setup: true,
  });

  useEffect(() => {
    for (const section of NAVIGATION_SECTIONS) {
      if (section.items.some((item) => currentPath.startsWith(item.href))) {
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
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 lg:top-16 bottom-0 left-0 z-30 bg-white dark:bg-[#1f1f1f] border-r border-[#dadce0] dark:border-[#3c4043] flex flex-col transition-all duration-200 ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isOpenMobile ? 'translate-x-0 top-0 z-50' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="h-12 px-4 border-b border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between shrink-0">
          {!isCollapsed ? (
            <span className="text-[11px] font-semibold text-[#5f6368] dark:text-[#8e918f] uppercase tracking-wider">
              Workspace Menu
            </span>
          ) : (
            <span className="text-xs font-bold text-[#1a73e8] dark:text-[#8ab4f8] mx-auto">
              NP
            </span>
          )}

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-full text-[#5f6368] hover:text-[#202124] dark:text-[#8e918f] dark:hover:text-white hover:bg-[#f1f3f4] dark:hover:bg-[#28292a] transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-full text-[#5f6368] hover:text-[#202124] dark:hover:text-white hover:bg-[#f1f3f4] dark:hover:bg-[#28292a] transition-colors cursor-pointer ml-auto"
            title="Close Menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 text-sm font-sans">
          {visibleSections.map((section) => {
            const isExpanded = !!expandedSections[section.id];
            const hasActiveItem = section.visibleItems.some((item) => currentPath.startsWith(item.href));

            return (
              <div key={section.id} className="space-y-1">
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
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </span>
                  </button>
                )}

                {(isExpanded || isCollapsed) && (
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
                          onClick={() => {
                            onNavigate(item.href);
                            onCloseMobile();
                          }}
                          title={item.label}
                          className={`w-full flex flex-row items-center ${
                            isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
                          } rounded-full text-xs font-semibold transition-all cursor-pointer select-none whitespace-nowrap ${
                            isActive
                              ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#004a77] dark:text-[#c2e7ff]'
                              : 'text-[#3c4043] dark:text-[#c4c7c5] hover:text-[#202124] dark:hover:text-white hover:bg-[#f1f3f4] dark:hover:bg-[#28292a]'
                          }`}
                        >
                          <div className={`flex flex-row items-center gap-2.5 ${isCollapsed ? '' : 'min-w-0 flex-1'}`}>
                            <span
                              className={`w-6 h-6 rounded-md inline-flex items-center justify-center shrink-0 border transition-colors ${
                                isActive
                                  ? 'bg-[#1a73e8] text-white border-[#1a73e8]'
                                  : 'bg-white dark:bg-[#28292a] text-[#5f6368] dark:text-[#8e918f] border-[#dadce0] dark:border-[#444746]'
                              }`}
                            >
                              {React.isValidElement(icon)
                                ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-3.5 h-3.5' })
                                : icon}
                            </span>
                            {!isCollapsed && <span className="truncate text-left">{item.label}</span>}
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
      </aside>
    </>
  );
};
