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
      label: 'Paper',
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
      label: 'More',
      icon: Menu,
      isActive: false,
      onClick: onOpenMenu,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1a1c1e]/95 backdrop-blur-md border-t border-[#e0e3e7] dark:border-[#3c4043] lg:hidden select-none pb-[env(safe-area-inset-bottom)]"
    >
      <div className="h-14 max-w-lg mx-auto grid grid-cols-5 items-center px-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                item.isActive
                  ? 'text-[#1a73e8] dark:text-[#8ab4f8]'
                  : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={item.isActive ? 2.25 : 1.75} />
              <span className={`text-[10px] leading-none ${item.isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
