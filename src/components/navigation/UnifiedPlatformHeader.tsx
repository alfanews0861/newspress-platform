/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Newspaper,
  BookOpen,
  ShoppingBag,
  LayoutDashboard,
  Building2,
  ChevronDown,
  Sun,
  Moon,
  Menu as MenuIcon,
  X,
  Plus,
  Globe,
  LogOut,
  User,
  Settings,
} from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { TenantSwitcherModal } from '../../layouts/TenantSwitcherModal';
import { QuickStoryModal } from '../editorial/QuickStoryModal';
import { navigateTo as navigateToUtil } from '../../utils/navigation';
import { getInitialsAvatarDataUrl } from '../../utils/avatarFallback';

export interface UnifiedPlatformHeaderProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
  onToggleSidebarMobile?: () => void;
  onQuickNewStory?: () => void;
}

export const UnifiedPlatformHeader: React.FC<UnifiedPlatformHeaderProps> = ({
  currentPath = '/',
  onNavigate,
  onToggleSidebarMobile,
  onQuickNewStory,
}) => {
  const { currentTenant } = useTenant();
  const { user, logout } = useAuth();

  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isQuickStoryOpen, setIsQuickStoryOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('newspress_theme');
      return saved === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('newspress_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isProfileMenuOpen]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const navigateTo = (path: string) => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigateToUtil(path);
    }
  };

  const scrollToSection = (sectionId: string) => {
    setIsMobileMenuOpen(false);
    if (currentPath !== '/' && currentPath !== '/landing') {
      navigateTo('/');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const isInsideNewsroom =
    currentPath !== '/' &&
    currentPath !== '/landing' &&
    !currentPath.startsWith('/legal') &&
    !currentPath.startsWith('/privacy') &&
    !currentPath.startsWith('/terms');

  const workspaceNavLinks = [
    { label: 'Home', path: '/dashboard', matchPrefix: '/dashboard', icon: LayoutDashboard },
    { label: 'Stories', path: '/newsroom/news', matchPrefix: '/newsroom/news', icon: Newspaper },
    { label: 'Editions', path: '/newspaper/editions', matchPrefix: '/newspaper', icon: BookOpen },
    { label: 'Marketplace', path: '/marketplace', matchPrefix: '/marketplace', icon: ShoppingBag },
  ];

  // Public Website Top Bar (Strict 3-Zone Contract)
  if (!isInsideNewsroom) {
    return (
      <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#1a1c1e]/95 backdrop-blur-md border-b border-[#e0e3e7] dark:border-[#3c4043] transition-colors select-none">
        <div className="h-[2px] w-full google-spectrum-bar" />
        <div className="max-w-7xl mx-auto h-14 sm:h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => navigateTo('/')}
            className="flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8] rounded-lg"
            aria-label="NewsPress Home"
          >
            <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="2.5" y="3.5" width="19" height="17" rx="4" stroke="#4285f4" strokeWidth="2.2" />
              <line x1="6.5" y1="8.5" x2="12.5" y2="8.5" stroke="#ea4335" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="6.5" y1="12.5" x2="17.5" y2="12.5" stroke="#fbbc04" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="6.5" y1="16.5" x2="14.5" y2="16.5" stroke="#34a853" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="16.2" cy="8.5" r="1.6" fill="#4285f4" />
            </svg>
            <span className="font-bold text-lg sm:text-xl tracking-tight whitespace-nowrap shrink-0">
              <span className="text-[#4285f4]">N</span>
              <span className="text-[#ea4335]">e</span>
              <span className="text-[#fbbc04]">w</span>
              <span className="text-[#4285f4]">s</span>
              <span className="text-[#34a853]">P</span>
              <span className="text-[#ea4335]">r</span>
              <span className="text-[#202124] dark:text-[#f8f9fa]">ess</span>
            </span>
          </button>

          {/* Zone 2: 4 Concise Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5f6368] dark:text-[#bdc1c6]">
            <button
              type="button"
              onClick={() => scrollToSection('suite')}
              className="hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Products
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('pricing')}
              className="hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => navigateTo('/marketplace')}
              className="hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Marketplace
            </button>
            <button
              type="button"
              onClick={() => navigateTo('/legal')}
              className="hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Legal
            </button>
          </nav>

          {/* Zone 3: Primary Action + Mobile Menu */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigateTo('/dashboard')}
              className="min-h-[40px] px-4 sm:px-5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Open App
            </button>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-full text-[#5f6368] dark:text-[#bdc1c6] hover:bg-[#f1f3f4] dark:hover:bg-[#2e3135] transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Public Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-[#1a1c1e] border-t border-[#e0e3e7] dark:border-[#3c4043] px-4 py-3 space-y-1 shadow-lg">
            <button
              type="button"
              onClick={() => scrollToSection('suite')}
              className="w-full min-h-[44px] text-left px-3 rounded-xl text-sm font-medium text-[#202124] dark:text-[#f8f9fa] hover:bg-[#f1f3f4] dark:hover:bg-[#2e3135] cursor-pointer"
            >
              Products
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('pricing')}
              className="w-full min-h-[44px] text-left px-3 rounded-xl text-sm font-medium text-[#202124] dark:text-[#f8f9fa] hover:bg-[#f1f3f4] dark:hover:bg-[#2e3135] cursor-pointer"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => navigateTo('/marketplace')}
              className="w-full min-h-[44px] text-left px-3 rounded-xl text-sm font-medium text-[#202124] dark:text-[#f8f9fa] hover:bg-[#f1f3f4] dark:hover:bg-[#2e3135] cursor-pointer"
            >
              Marketplace
            </button>
            <button
              type="button"
              onClick={() => navigateTo('/legal')}
              className="w-full min-h-[44px] text-left px-3 rounded-xl text-sm font-medium text-[#202124] dark:text-[#f8f9fa] hover:bg-[#f1f3f4] dark:hover:bg-[#2e3135] cursor-pointer"
            >
              Legal
            </button>
            <div className="pt-2 mt-1 border-t border-[#e0e3e7] dark:border-[#3c4043] flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigateTo('/login')}
                className="min-h-[44px] text-sm font-semibold text-[#1a73e8] dark:text-[#8ab4f8] px-3 cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#5f6368] dark:text-[#bdc1c6] hover:bg-[#f1f3f4] dark:hover:bg-[#2e3135] cursor-pointer"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-[#fbbc04]" />}
              </button>
            </div>
          </div>
        )}
      </header>
    );
  }

  // Workspace Console Header (Compact 56px mobile / 60px desktop)
  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-[#1a1c1e] border-b border-[#e0e3e7] dark:border-[#3c4043] transition-colors select-none">
        <div className="h-[2px] w-full google-spectrum-bar" />
        <div className="h-[54px] sm:h-[58px] px-3 sm:px-5 flex items-center justify-between gap-2">
          {/* Left: Mobile Menu + Brand + Organization */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            {onToggleSidebarMobile && (
              <button
                type="button"
                onClick={onToggleSidebarMobile}
                className="lg:hidden min-h-[44px] min-w-[44px] -ml-1.5 flex items-center justify-center rounded-full text-[#5f6368] dark:text-[#bdc1c6] hover:bg-[#f1f3f4] dark:hover:bg-[#2e3135] transition-colors cursor-pointer shrink-0"
                aria-label="Open menu"
              >
                <MenuIcon className="w-5 h-5" />
              </button>
            )}

            <button
              type="button"
              className="flex items-center gap-2 cursor-pointer shrink-0"
              onClick={() => navigateTo('/dashboard')}
              title="NewsPress Home"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="2.5" y="3.5" width="19" height="17" rx="4" stroke="#4285f4" strokeWidth="2.2" />
                <line x1="6.5" y1="8.5" x2="12.5" y2="8.5" stroke="#ea4335" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="6.5" y1="12.5" x2="17.5" y2="12.5" stroke="#fbbc04" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="6.5" y1="16.5" x2="14.5" y2="16.5" stroke="#34a853" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="16.2" cy="8.5" r="1.6" fill="#4285f4" />
              </svg>
              <span className="font-bold text-base sm:text-lg tracking-tight whitespace-nowrap">
                <span className="text-[#4285f4]">N</span>
                <span className="text-[#ea4335]">e</span>
                <span className="text-[#fbbc04]">w</span>
                <span className="text-[#4285f4]">s</span>
                <span className="text-[#34a853]">P</span>
                <span className="text-[#ea4335]">r</span>
                <span className="text-[#202124] dark:text-[#f8f9fa]">ess</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsTenantModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 ml-1 px-3 py-1.5 rounded-full bg-[#f8fafd] dark:bg-[#242629] hover:bg-[#eef4ff] dark:hover:bg-[#2e3135] border border-[#e0e3e7] dark:border-[#3c4043] text-xs font-medium text-[#3c4043] dark:text-[#e8eaed] cursor-pointer whitespace-nowrap shrink-0"
              title="Switch Organization"
            >
              <Building2 className="w-3.5 h-3.5 text-[#1a73e8] dark:text-[#8ab4f8] shrink-0" />
              <span className="truncate max-w-[140px]">{currentTenant.organizationName}</span>
              <ChevronDown className="w-3 h-3 text-[#5f6368] shrink-0" />
            </button>
          </div>

          {/* Center: Clean Desktop Quick Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#f8fafd] dark:bg-[#242629] p-1 rounded-full border border-[#e0e3e7] dark:border-[#3c4043]">
            {workspaceNavLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/dashboard'
                  ? currentPath === '/dashboard' || currentPath === '/overview'
                  : currentPath.startsWith(item.matchPrefix);

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigateTo(item.path)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#173054] dark:text-[#8ab4f8]'
                      : 'text-[#5f6368] dark:text-[#bdc1c6] hover:text-[#202124] dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Write + Theme + Account */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => (onQuickNewStory ? onQuickNewStory() : setIsQuickStoryOpen(true))}
              className="min-h-[38px] px-3 sm:px-4 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Write a new story"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Write</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="min-h-[40px] min-w-[40px] rounded-full flex items-center justify-center text-[#5f6368] dark:text-[#bdc1c6] hover:bg-[#f1f3f4] dark:hover:bg-[#2e3135] transition-colors cursor-pointer shrink-0"
              title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-[#fbbc04]" />}
            </button>

            {/* Streamlined Account Menu */}
            <div className="relative shrink-0" ref={profileRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#2e3135] transition-colors cursor-pointer"
                aria-label="Account menu"
              >
                <img
                  src={user?.avatarUrl || getInitialsAvatarDataUrl(user?.displayName)}
                  alt={user?.displayName || 'Account'}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-[#dadce0] dark:border-[#5f6368]"
                />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#242629] border border-[#e0e3e7] dark:border-[#3c4043] shadow-xl py-1.5 z-50 text-xs overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-[#e0e3e7] dark:border-[#3c4043]">
                    <div className="font-semibold text-sm text-[#202124] dark:text-[#f8f9fa] truncate">
                      {user?.displayName || 'Editor'}
                    </div>
                    <div className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] truncate mt-0.5">
                      {currentTenant.organizationName}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigateTo('/user/portal')}
                    className="w-full min-h-[40px] px-4 text-left text-[#202124] dark:text-[#f8f9fa] hover:bg-[#f1f3f4] dark:hover:bg-[#2e3135] flex items-center gap-2.5 cursor-pointer font-medium"
                  >
                    <User className="w-4 h-4 text-[#1a73e8]" />
                    <span>Account &amp; Wallet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setIsTenantModalOpen(true);
                    }}
                    className="w-full min-h-[40px] px-4 text-left text-[#202124] dark:text-[#f8f9fa] hover:bg-[#f1f3f4] dark:hover:bg-[#2e3135] flex items-center gap-2.5 cursor-pointer font-medium md:hidden"
                  >
                    <Building2 className="w-4 h-4 text-[#5f6368]" />
                    <span>Switch Organization</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTo('/settings')}
                    className="w-full min-h-[40px] px-4 text-left text-[#202124] dark:text-[#f8f9fa] hover:bg-[#f1f3f4] dark:hover:bg-[#2e3135] flex items-center gap-2.5 cursor-pointer font-medium"
                  >
                    <Settings className="w-4 h-4 text-[#5f6368]" />
                    <span>Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTo('/')}
                    className="w-full min-h-[40px] px-4 text-left text-[#202124] dark:text-[#f8f9fa] hover:bg-[#f1f3f4] dark:hover:bg-[#2e3135] flex items-center gap-2.5 cursor-pointer font-medium"
                  >
                    <Globe className="w-4 h-4 text-[#5f6368]" />
                    <span>Public Site</span>
                  </button>

                  <div className="my-1 border-t border-[#e0e3e7] dark:border-[#3c4043]" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      logout();
                    }}
                    className="w-full min-h-[40px] px-4 text-left text-[#d93025] dark:text-[#f28b82] hover:bg-[#fce8e6] dark:hover:bg-[#3c1816] flex items-center gap-2.5 cursor-pointer font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <TenantSwitcherModal
        isOpen={isTenantModalOpen}
        onClose={() => setIsTenantModalOpen(false)}
      />

      <QuickStoryModal
        isOpen={isQuickStoryOpen}
        onClose={() => setIsQuickStoryOpen(false)}
        onStoryCreated={() => {
          window.dispatchEvent(new CustomEvent('story_created'));
        }}
      />
    </>
  );
};
