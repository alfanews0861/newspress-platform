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
    {
      label: lang === 'hi' ? 'डैशबोर्ड' : 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      iconBoxClass: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800',
    },
    {
      label: lang === 'hi' ? 'समाचार' : 'Stories',
      path: '/newsroom/news',
      icon: Newspaper,
      iconBoxClass: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800',
    },
    {
      label: lang === 'hi' ? 'संस्करण' : 'Editions',
      path: '/newspaper/editions',
      icon: BookOpen,
      iconBoxClass: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800',
    },
    {
      label: lang === 'hi' ? 'मार्केटप्लेस' : 'Marketplace',
      path: '/marketplace',
      icon: ShoppingBag,
      iconBoxClass: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800',
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full h-16 bg-white dark:bg-[#1f1f1f] border-b border-[#dadce0] dark:border-[#3c4043] transition-colors shadow-none">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-3">
          {/* Left: Mobile Toggle, Brand & Workspace */}
          <div className="flex items-center gap-3">
            {isInsideNewsroom && onToggleSidebarMobile && (
              <button
                onClick={onToggleSidebarMobile}
                className="lg:hidden p-2 -ml-1 rounded-full text-[#5f6368] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#28292a] transition-colors"
                aria-label="Toggle sidebar"
              >
                <MenuIcon className="w-5 h-5" />
              </button>
            )}

            {/* Google-Style 4-Color Brand Logo */}
            <div
              className="flex items-center gap-2.5 cursor-pointer group select-none"
              onClick={() => navigateTo(isInsideNewsroom ? '/dashboard' : '/')}
              title="NewsPress Home"
            >
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] flex items-center justify-center shadow-xs group-hover:border-[#1a73e8] transition-all">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="16" rx="3" stroke="#1a73e8" strokeWidth="2" />
                  <line x1="7" y1="8" x2="12" y2="8" stroke="#ea4335" strokeWidth="2" strokeLinecap="round" />
                  <line x1="7" y1="12" x2="17" y2="12" stroke="#fbbc04" strokeWidth="2" strokeLinecap="round" />
                  <line x1="7" y1="16" x2="15" y2="16" stroke="#34a853" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="15.5" cy="8.5" r="1.5" fill="#1a73e8" />
                </svg>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight">
                  <span className="text-[#1a73e8]">N</span>
                  <span className="text-[#ea4335]">e</span>
                  <span className="text-[#fbbc04]">w</span>
                  <span className="text-[#1a73e8]">s</span>
                  <span className="text-[#34a853]">P</span>
                  <span className="text-[#202124] dark:text-[#f2f2f2]">ress</span>
                </span>
                <span className="text-[10px] font-medium tracking-wide px-2 py-0.5 rounded-full bg-[#e8f0fe] dark:bg-[#004a77] text-[#1a73e8] dark:text-[#a8c7fa] border border-[#d2e3fc] dark:border-[#1a73e8]">
                  Workspace
                </span>
              </div>
            </div>

            {/* Workspace Selector (Google Workspace Style) */}
            {isInsideNewsroom && (
              <button
                onClick={() => setIsTenantModalOpen(true)}
                className="hidden md:flex flex-row items-center gap-2 ml-2 px-3 py-1.5 rounded-full bg-[#f1f3f4] dark:bg-[#28292a] hover:bg-[#e8eaed] dark:hover:bg-[#333537] border border-[#dadce0] dark:border-[#444746] transition-all text-xs font-medium text-[#3c4043] dark:text-[#e3e3e3] cursor-pointer"
                title="Switch Workspace"
              >
                <span className="w-5 h-5 rounded-md bg-[#e8f0fe] dark:bg-[#004a77] text-[#1a73e8] dark:text-[#8ab4f8] flex items-center justify-center shrink-0 border border-[#d2e3fc] dark:border-[#1a73e8]">
                  <Building2 className="w-3 h-3" />
                </span>
                <span className="truncate max-w-[130px] font-medium">{currentTenant.organizationName}</span>
                <ChevronDown className="w-3 h-3 text-[#5f6368]" />
              </button>
            )}
          </div>

          {/* Center: Clean Google-style Pill Nav (Only inside newsroom) */}
          {isInsideNewsroom && (
            <nav className="hidden lg:flex flex-row items-center gap-1.5 bg-[#f1f3f4] dark:bg-[#28292a] p-1 rounded-full border border-[#dadce0]/70 dark:border-[#444746]/70">
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
                    className={`flex flex-row items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-white dark:bg-[#1a73e8] text-[#1a73e8] dark:text-white shadow-xs'
                        : 'text-[#3c4043] dark:text-[#c4c7c5] hover:text-[#202124] dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#333537]'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md flex flex-row items-center justify-center shrink-0 border ${
                        isActive
                          ? 'bg-[#1a73e8] text-white border-[#1a73e8] dark:bg-white dark:text-[#1a73e8]'
                          : item.iconBoxClass
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right: Quick Write Action + Settings + User */}
          <div className="flex flex-row items-center gap-2">
            {/* Quick Write Story Button (Google Primary Pill) */}
            {isInsideNewsroom && (
              <button
                onClick={() => (onQuickNewStory ? onQuickNewStory() : setIsQuickStoryOpen(true))}
                className="flex flex-row items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium shadow-none hover:shadow-xs transition-all cursor-pointer"
                title="Create a new story"
              >
                <span className="w-5 h-5 rounded-md bg-white/20 text-white flex items-center justify-center shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                </span>
                <span className="hidden sm:inline">{lang === 'hi' ? 'नया समाचार' : 'Write Story'}</span>
              </button>
            )}

            {/* Language Switcher */}
            <div className="flex items-center rounded-full bg-[#f1f3f4] dark:bg-[#28292a] p-0.5 border border-[#dadce0] dark:border-[#444746] text-[11px] font-semibold">
              <button
                onClick={() => handleLanguageChange('en')}
                className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                  lang === 'en'
                    ? 'bg-white dark:bg-[#1a73e8] text-[#1a73e8] dark:text-white shadow-xs'
                    : 'text-[#5f6368] dark:text-[#8e918f] hover:text-[#202124]'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => handleLanguageChange('hi')}
                className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                  lang === 'hi'
                    ? 'bg-white dark:bg-[#1a73e8] text-[#1a73e8] dark:text-white shadow-xs'
                    : 'text-[#5f6368] dark:text-[#8e918f] hover:text-[#202124]'
                }`}
              >
                हिं
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#5f6368] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#28292a] transition-colors cursor-pointer"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
            </button>

            {/* User Profile / Menu */}
            {isInsideNewsroom ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-1.5 p-1 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#28292a] transition-colors cursor-pointer"
                >
                  <img
                    src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&auto=format&fit=crop&q=80'}
                    alt={user?.displayName || 'User'}
                    className="w-7 h-7 rounded-full object-cover border border-[#dadce0] dark:border-[#444746]"
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-[#5f6368]" />
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] shadow-lg py-1.5 z-50 text-xs">
                    <div className="px-3 py-2 border-b border-[#dadce0] dark:border-[#444746]">
                      <div className="font-semibold text-[#202124] dark:text-[#f2f2f2] truncate">
                        {user?.displayName || 'Sofia Chen'}
                      </div>
                      <div className="text-[11px] text-[#5f6368] dark:text-[#a8aaad] capitalize flex items-center gap-1 mt-0.5">
                        <ShieldCheck className="w-3 h-3 text-[#1a73e8]" />
                        <span>{roleLabel.replace(/_/g, ' ')}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setIsPersonaModalOpen(true);
                      }}
                      className="w-full px-3 py-2 text-left text-[#3c4043] dark:text-[#e3e3e3] hover:bg-[#f1f3f4] dark:hover:bg-[#333537] flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <User className="w-4 h-4 text-[#5f6368]" />
                      <span>Switch Role Persona</span>
                    </button>

                    <button
                      onClick={() => navigateTo('/')}
                      className="w-full px-3 py-2 text-left text-[#3c4043] dark:text-[#e3e3e3] hover:bg-[#f1f3f4] dark:hover:bg-[#333537] flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Globe className="w-4 h-4 text-[#5f6368]" />
                      <span>View Public Website</span>
                    </button>

                    <div className="my-1 border-t border-[#dadce0] dark:border-[#444746]" />

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logout();
                      }}
                      className="w-full px-3 py-2 text-left text-[#d93025] hover:bg-[#fce8e6] dark:hover:bg-[#3c1410] flex items-center gap-2 cursor-pointer font-medium"
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
                className="px-4 py-1.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium transition-all shadow-none hover:shadow-xs cursor-pointer"
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
