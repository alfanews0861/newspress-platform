/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  Newspaper,
  BookOpen,
  ShoppingBag,
  Menu,
} from 'lucide-react';

export interface MobileBottomNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentPath,
  onNavigate,
  onOpenMenu,
}) => {
  const isDashboardActive =
    currentPath === '/dashboard' || currentPath === '/overview';
  const isStoriesActive = currentPath.startsWith('/newsroom/news');
  const isNewspaperActive =
    currentPath.startsWith('/newspaper/page-designer') ||
    currentPath.startsWith('/newspaper/editions');
  const isMarketplaceActive =
    currentPath.startsWith('/marketplace') &&
    !currentPath.startsWith('/marketplace/my-listings');

  const items = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: LayoutDashboard,
      isActive: isDashboardActive,
      onClick: () => onNavigate('/dashboard'),
    },
    {
      id: 'stories',
      label: 'Stories',
      icon: Newspaper,
      isActive: isStoriesActive,
      onClick: () => onNavigate('/newsroom/news'),
    },
    {
      id: 'newspaper',
      label: 'Newspaper',
      icon: BookOpen,
      isActive: isNewspaperActive,
      onClick: () => onNavigate('/newspaper/page-designer'),
    },
    {
      id: 'marketplace',
      label: 'Market',
      icon: ShoppingBag,
      isActive: isMarketplaceActive,
      onClick: () => onNavigate('/marketplace'),
    },
    {
      id: 'menu',
      label: 'Menu',
      icon: Menu,
      isActive: false,
      onClick: onOpenMenu,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1f1f1f]/95 backdrop-blur-md border-t border-[#dadce0] dark:border-[#3c4043] lg:hidden select-none shadow-[0_-2px_10px_rgba(0,0,0,0.05)] transition-colors pb-[max(0.25rem,env(safe-area-inset-bottom))]"
    >
      <div className="h-14 px-2 max-w-lg mx-auto flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
                item.isActive
                  ? 'text-[#1a73e8] dark:text-[#8ab4f8]'
                  : 'text-[#5f6368] dark:text-[#8e918f] hover:text-[#202124] dark:hover:text-white'
              }`}
            >
              {/* Active Indicator Pill */}
              <div
                className={`w-10 h-7 rounded-full flex items-center justify-center transition-all ${
                  item.isActive
                    ? 'bg-[#e8f0fe] dark:bg-[#004a77] text-[#1a73e8] dark:text-[#8ab4f8]'
                    : 'bg-transparent text-current'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight ${
                  item.isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
