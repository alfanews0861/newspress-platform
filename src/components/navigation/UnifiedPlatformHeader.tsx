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
  const { user, currentMembership, isPlatformAdmin, logout } = useAuth();

  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [isQuickStoryOpen, setIsQuickStoryOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('newspress_theme');
      return saved === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });

  const [lang, setLang] = useState<'en' | 'te' | 'hi'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('newspress_lang');
      if (saved === 'te' || saved === 'hi' || saved === 'en') return saved;
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

  const handleLanguageChange = (newLang: 'en' | 'te' | 'hi') => {
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
      label: lang === 'te' ? 'హోమ్' : lang === 'hi' ? 'होम' : 'Home',
      path: '/dashboard',
      matchPrefix: '/dashboard',
      icon: LayoutDashboard,
      iconBoxClass: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800',
    },
    {
      label: lang === 'te' ? 'వార్తలు' : lang === 'hi' ? 'समाचार' : 'Stories',
      path: '/newsroom/news',
      matchPrefix: '/newsroom/news',
      icon: Newspaper,
      iconBoxClass: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800',
    },
    {
      label: lang === 'te' ? 'న్యూస్ పేపర్' : lang === 'hi' ? 'अख़बार' : 'Newspaper',
      path: '/newspaper/editions',
      matchPrefix: '/newspaper',
      icon: BookOpen,
      iconBoxClass: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800',
    },
    {
      label: lang === 'te' ? 'మార్కెట్‌ప్లేస్' : lang === 'hi' ? 'मार्केटप्लेस' : 'Marketplace',
      path: '/marketplace',
      matchPrefix: '/marketplace',
      icon: ShoppingBag,
      iconBoxClass: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800',
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full h-16 bg-white dark:bg-[#1f1f1f] border-b border-[#dadce0] dark:border-[#3c4043] transition-colors shadow-none select-none">
        <div className="h-full px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Mobile Toggle, Brand & Workspace */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isInsideNewsroom && onToggleSidebarMobile ? (
              <button
                onClick={onToggleSidebarMobile}
                className="lg:hidden p-2 -ml-1 rounded-full text-[#5f6368] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#28292a] transition-colors cursor-pointer"
                aria-label="Toggle sidebar"
              >
                <MenuIcon className="w-5 h-5" />
              </button>
            ) : !isInsideNewsroom ? (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 -ml-1 rounded-full text-[#5f6368] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#28292a] transition-colors cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
              </button>
            ) : null}

            {/* Google-Style 4-Color Brand Logo */}
            <div
              className="flex items-center gap-2 cursor-pointer group select-none shrink-0"
              onClick={() => navigateTo(isInsideNewsroom ? '/dashboard' : '/')}
              title="NewsPress Home"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] flex items-center justify-center shadow-xs group-hover:border-[#1a73e8] transition-all shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="16" rx="3" stroke="#1a73e8" strokeWidth="2" />
                  <line x1="7" y1="8" x2="12" y2="8" stroke="#ea4335" strokeWidth="2" strokeLinecap="round" />
                  <line x1="7" y1="12" x2="17" y2="12" stroke="#fbbc04" strokeWidth="2" strokeLinecap="round" />
                  <line x1="7" y1="16" x2="15" y2="16" stroke="#34a853" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="15.5" cy="8.5" r="1.5" fill="#1a73e8" />
                </svg>
              </div>
              <div className="hidden xs:flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight">
                  <span className="text-[#1a73e8]">N</span>
                  <span className="text-[#ea4335]">e</span>
                  <span className="text-[#fbbc04]">w</span>
                  <span className="text-[#1a73e8]">s</span>
                  <span className="text-[#34a853]">P</span>
                  <span className="text-[#202124] dark:text-[#f2f2f2]">ress</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] font-medium tracking-wide px-2 py-0.5 rounded-full bg-[#e8f0fe] dark:bg-[#004a77] text-[#1a73e8] dark:text-[#a8c7fa] border border-[#d2e3fc] dark:border-[#1a73e8]">
                  Workspace
                </span>
              </div>
            </div>

            {/* Workspace Selector (Google Workspace Style) */}
            {isInsideNewsroom && (
              <button
                onClick={() => setIsTenantModalOpen(true)}
                className="hidden md:flex flex-row items-center gap-2 ml-1 px-3 py-1.5 rounded-full bg-[#f1f3f4] dark:bg-[#28292a] hover:bg-[#e8eaed] dark:hover:bg-[#333537] border border-[#dadce0] dark:border-[#444746] transition-all text-xs font-medium text-[#3c4043] dark:text-[#e3e3e3] cursor-pointer whitespace-nowrap shrink-0"
                title="Switch Workspace"
              >
                <span className="w-5 h-5 rounded-md bg-[#e8f0fe] dark:bg-[#004a77] text-[#1a73e8] dark:text-[#8ab4f8] flex items-center justify-center shrink-0 border border-[#d2e3fc] dark:border-[#1a73e8]">
                  <Building2 className="w-3 h-3" />
                </span>
                <span className="truncate max-w-[150px] font-medium">{currentTenant.organizationName}</span>
                <ChevronDown className="w-3 h-3 text-[#5f6368] shrink-0" />
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
                    : currentPath.startsWith(item.matchPrefix);

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

          {/* Right: Quick Write Action + Language + Theme + User */}
          <div className="flex flex-row items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Write Story Button (Google Primary Pill) */}
            {isInsideNewsroom && (
              <button
                onClick={() => (onQuickNewStory ? onQuickNewStory() : setIsQuickStoryOpen(true))}
                className="flex flex-row items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium shadow-none hover:shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
                title="Create a new story"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">
                  {lang === 'te' ? 'కొత్త వార్త' : lang === 'hi' ? 'नया समाचार' : 'Write Story'}
                </span>
              </button>
            )}

            {/* Language Switcher */}
            <div className="flex items-center rounded-full bg-[#f1f3f4] dark:bg-[#28292a] p-0.5 border border-[#dadce0] dark:border-[#444746] text-[10px] sm:text-[11px] font-semibold shrink-0">
              <button
                onClick={() => handleLanguageChange('en')}
                className={`px-1.5 sm:px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                  lang === 'en'
                    ? 'bg-white dark:bg-[#1a73e8] text-[#1a73e8] dark:text-white shadow-xs'
                    : 'text-[#5f6368] dark:text-[#8e918f] hover:text-[#202124]'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => handleLanguageChange('te')}
                className={`px-1.5 sm:px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                  lang === 'te'
                    ? 'bg-white dark:bg-[#1a73e8] text-[#1a73e8] dark:text-white shadow-xs'
                    : 'text-[#5f6368] dark:text-[#8e918f] hover:text-[#202124]'
                }`}
              >
                తె
              </button>
              <button
                onClick={() => handleLanguageChange('hi')}
                className={`px-1.5 sm:px-2 py-0.5 rounded-full transition-all cursor-pointer ${
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
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[#5f6368] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#28292a] transition-colors cursor-pointer shrink-0"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />}
            </button>

            {/* User Profile / Menu */}
            {isInsideNewsroom ? (
              <div className="relative shrink-0">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-1 p-0.5 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#28292a] transition-colors cursor-pointer"
                >
                  <img
                    src={user?.avatarUrl || getInitialsAvatarDataUrl(user?.displayName)}
                    alt={user?.displayName || 'User'}
                    className="w-7 h-7 rounded-full object-cover border border-[#dadce0] dark:border-[#444746]"
                  />
                  <ChevronDown className="w-3 h-3 text-[#5f6368] hidden xs:block" />
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] shadow-xl py-1.5 z-50 text-xs">
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
                        setIsTenantModalOpen(true);
                      }}
                      className="w-full px-3 py-2 text-left text-[#3c4043] dark:text-[#e3e3e3] hover:bg-[#f1f3f4] dark:hover:bg-[#333537] flex items-center gap-2 cursor-pointer font-medium md:hidden"
                    >
                      <Building2 className="w-4 h-4 text-[#5f6368]" />
                      <span>Switch Organization</span>
                    </button>

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
                className="px-3 sm:px-4 py-1.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium transition-all shadow-none hover:shadow-xs cursor-pointer shrink-0"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Public Mobile Drawer Menu (When not in newsroom) */}
        {!isInsideNewsroom && isMobileMenuOpen && (
          <div className="lg:hidden bg-white dark:bg-[#1f1f1f] border-b border-[#dadce0] dark:border-[#3c4043] px-4 py-4 space-y-2 shadow-xl animate-in slide-in-from-top-2 duration-200">
            <button
              onClick={() => navigateTo('/dashboard')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-semibold text-[#1a73e8] dark:text-[#8ab4f8] bg-[#e8f0fe] dark:bg-[#004a77] cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>Open Newsroom Console</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
            </button>

            <button
              onClick={() => navigateTo('/newspaper/page-designer')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-semibold text-[#3c4043] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#28292a] cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>Read Newspaper Edition</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
            </button>

            <button
              onClick={() => navigateTo('/marketplace')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-semibold text-[#3c4043] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#28292a] cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 text-amber-600" />
                <span>News Marketplace</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
            </button>

            <button
              onClick={() => navigateTo('/legal')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-semibold text-[#3c4043] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#28292a] cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Legal & Compliance Center</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
            </button>
          </div>
        )}
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
