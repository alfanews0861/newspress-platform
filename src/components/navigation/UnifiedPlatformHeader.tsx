/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  ShieldCheck,
  User,
} from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { TenantSwitcherModal } from '../../layouts/TenantSwitcherModal';
import { PersonaSwitcherModal } from '../../layouts/PersonaSwitcherModal';
import { QuickStoryModal } from '../editorial/QuickStoryModal';
import { navigateTo as navigateToUtil } from '../../utils/navigation';

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
  const { user, currentMembership, isPlatformAdmin, logout } = useAuth();

  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [isQuickStoryOpen, setIsQuickStoryOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Theme state: Default to light mode
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('newspress_theme');
      return saved === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });

  // Language state: English or Hindi
  const [lang, setLang] = useState<'en' | 'hi'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('newspress_lang');
      return saved === 'hi' ? 'hi' : 'en';
    }
    return 'en';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('newspress_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLanguageChange = (newLang: 'en' | 'hi') => {
    setLang(newLang);
    localStorage.setItem('newspress_lang', newLang);
    window.dispatchEvent(new CustomEvent('languagechange', { detail: newLang }));
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

  const isInsideNewsroom =
    currentPath !== '/' &&
    currentPath !== '/landing' &&
    !currentPath.startsWith('/legal') &&
    !currentPath.startsWith('/privacy') &&
    !currentPath.startsWith('/terms');

  const roleLabel =
    currentMembership?.organizationRole || (isPlatformAdmin ? 'Super Admin' : 'Chief Editor');

  const navLinks = [
    { label: lang === 'hi' ? 'डैशबोर्ड' : 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: lang === 'hi' ? 'समाचार' : 'Stories', path: '/newsroom/news', icon: Newspaper },
    { label: lang === 'hi' ? 'संस्करण' : 'Editions', path: '/newspaper/editions', icon: BookOpen },
    { label: lang === 'hi' ? 'मार्केटप्लेस' : 'Marketplace', path: '/marketplace', icon: ShoppingBag },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full h-16 bg-white dark:bg-[#1a1b1e] border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-3">
          {/* Left: Mobile Toggle, Brand & Workspace */}
          <div className="flex items-center gap-3">
            {isInsideNewsroom && onToggleSidebarMobile && (
              <button
                onClick={onToggleSidebarMobile}
                className="lg:hidden p-2 -ml-1 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle sidebar"
              >
                <MenuIcon className="w-5 h-5" />
              </button>
            )}

            {/* Logo */}
            <div
              className="flex items-center gap-2.5 cursor-pointer group select-none"
              onClick={() => navigateTo(isInsideNewsroom ? '/dashboard' : '/')}
              title="NewsPress Home"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-xs group-hover:scale-105 transition-transform">
                NP
              </div>
              <div className="hidden sm:block">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  NewsPress
                </span>
              </div>
            </div>

            {/* Workspace Selector (Clean & Compact) */}
            {isInsideNewsroom && (
              <button
                onClick={() => setIsTenantModalOpen(true)}
                className="hidden md:flex items-center gap-2 ml-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-all text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
                title="Switch Workspace"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="truncate max-w-[130px] font-semibold">{currentTenant.organizationName}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>

          {/* Center: Clean Primary Nav (Only inside newsroom) */}
          {isInsideNewsroom && (
            <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.path === '/dashboard'
                    ? currentPath === '/dashboard' || currentPath === '/overview'
                    : currentPath.startsWith(item.path);

                return (
                  <button
                    key={item.path}
                    onClick={() => navigateTo(item.path)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-blue-600 text-blue-700 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right: Quick Write Action + Settings + User */}
          <div className="flex items-center gap-2">
            {/* Quick Write Story Button (Minimal user work!) */}
            {isInsideNewsroom && (
              <button
                onClick={() => (onQuickNewStory ? onQuickNewStory() : setIsQuickStoryOpen(true))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
                title="Create a new story"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{lang === 'hi' ? 'नया समाचार' : 'Write Story'}</span>
              </button>
            )}

            {/* Language Switcher */}
            <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
              <button
                onClick={() => handleLanguageChange('en')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  lang === 'en'
                    ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => handleLanguageChange('hi')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  lang === 'hi'
                    ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                हिं
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {/* User Profile / Menu */}
            {isInsideNewsroom ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 p-1 pl-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <img
                    src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&auto=format&fit=crop&q=80'}
                    alt={user?.displayName || 'User'}
                    className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-[#202124] border border-slate-200 dark:border-slate-700 shadow-lg py-1.5 z-50 text-xs">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {user?.displayName || 'Sofia Chen'}
                      </div>
                      <div className="text-[11px] text-slate-500 capitalize flex items-center gap-1 mt-0.5">
                        <ShieldCheck className="w-3 h-3 text-blue-500" />
                        <span>{roleLabel.replace(/_/g, ' ')}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setIsPersonaModalOpen(true);
                      }}
                      className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Switch Role Persona</span>
                    </button>

                    <button
                      onClick={() => navigateTo('/')}
                      className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                    >
                      <Globe className="w-4 h-4 text-slate-400" />
                      <span>View Public Website</span>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logout();
                      }}
                      className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigateTo('/login')}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tenant Switcher Modal */}
      <TenantSwitcherModal
        isOpen={isTenantModalOpen}
        onClose={() => setIsTenantModalOpen(false)}
      />

      {/* Persona Switcher Modal */}
      <PersonaSwitcherModal
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
      />

      {/* Quick Story Composer Modal */}
      <QuickStoryModal
        isOpen={isQuickStoryOpen}
        onClose={() => setIsQuickStoryOpen(false)}
        onStoryCreated={() => {
          // Notify any listeners
          window.dispatchEvent(new CustomEvent('story_created'));
        }}
      />
    </>
  );
};
