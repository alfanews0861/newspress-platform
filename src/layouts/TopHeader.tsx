/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Menu,
  Building2,
  ChevronDown,
  Clock,
  ShieldCheck,
  LogOut,
  Smartphone,
  Sun,
  Moon,
  Globe,
  BookOpen,
  Newspaper,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { useTenant } from '../hooks/useTenant';
import { useAuth } from '../hooks/useAuth';
import { Badge } from '../components/ui/Badge';
import { TenantSwitcherModal } from './TenantSwitcherModal';
import { PersonaSwitcherModal } from './PersonaSwitcherModal';
import { formatTimeLeft } from '../utils/formatters';
import { MOCK_CURRENT_EDITION } from '../services/mockDataService';
import { navigateTo } from '../utils/navigation';

export interface TopHeaderProps {
  onToggleMobileMenu: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onToggleMobileMenu }) => {
  const { currentTenant } = useTenant();
  const { user, currentMembership, isPlatformAdmin, logout } = useAuth();

  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('newspress_theme');
      return saved === 'dark' || saved === 'light' ? saved : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('newspress_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const roleLabel =
    currentMembership?.organizationRole || (isPlatformAdmin ? 'Super Admin' : 'Member');

  return (
    <>
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 px-3 sm:px-6 flex items-center justify-between gap-3 font-sans transition-colors">
        {/* Left: Mobile Toggle, Brand Link & Tenant Workspace Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Quick NewsPress Brand Badge */}
          <button
            onClick={() => navigateTo('/')}
            className="flex items-center gap-2 group cursor-pointer pr-2 border-r border-slate-200 dark:border-slate-800"
            title="Go to Public Landing Page"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-sans font-black text-xs shadow-xs group-hover:scale-105 transition-transform">
              NP
            </div>
            <div className="hidden xl:block text-left">
              <span className="font-sans font-black text-xs tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 block leading-tight">
                NEWSPRESS
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold block leading-none">
                Newsroom
              </span>
            </div>
          </button>

          {/* Tenant Selector Dropdown trigger */}
          <button
            onClick={() => setIsTenantModalOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all cursor-pointer text-left group"
            title="Switch Workspace Organization"
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 dark:bg-slate-700 border border-blue-200 dark:border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
              {currentTenant.logoUrl ? (
                <img
                  src={currentTenant.logoUrl}
                  alt={currentTenant.organizationName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1 max-w-[140px]">
                  {currentTenant.organizationName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </div>
            </div>
          </button>
        </div>

        {/* Center: Live Edition Deadline Bar & Fast Navigation */}
        <div className="hidden lg:flex items-center gap-4">
          <div
            onClick={() => navigateTo('/newspaper/editions')}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs hover:border-blue-500 cursor-pointer transition-colors"
            title="Click to view Active Edition"
          >
            <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-slate-900 dark:text-white font-medium">
              {MOCK_CURRENT_EDITION.brandName} #{MOCK_CURRENT_EDITION.issueNumber}
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">
              {formatTimeLeft(MOCK_CURRENT_EDITION.printDeadline)}
            </span>
          </div>

          {/* Quick Header Nav Links */}
          <nav className="flex items-center gap-1 text-xs font-semibold">
            <button
              onClick={() => navigateTo('/dashboard')}
              className="px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigateTo('/newsroom/news')}
              className="px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Newsroom
            </button>
            <button
              onClick={() => navigateTo('/newspaper/editions')}
              className="px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Editions
            </button>
            <button
              onClick={() => navigateTo('/marketplace')}
              className="px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Wire
            </button>
            <button
              onClick={() => navigateTo('/legal')}
              className="px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Legal & SLA
            </button>
          </nav>
        </div>

        {/* Right: Quick actions, Theme, Landing Link, Role & User menu */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Public Portal Button */}
          <button
            onClick={() => navigateTo('/')}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs font-bold transition-all cursor-pointer"
            title="View Public Landing Page"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Public Site</span>
          </button>

          {/* Theme Toggle Button (Light mode default) */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer border border-slate-200 dark:border-slate-700"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-slate-700" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* Mobile App Launch button */}
          <button
            onClick={() => navigateTo('/mobile')}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-blue-600 dark:text-blue-400 cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Open Mobile Field App"
          >
            <Smartphone className="w-4 h-4" />
          </button>

          {/* RBAC Persona Switcher Trigger */}
          <button
            onClick={() => setIsPersonaModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition-all text-blue-700 dark:text-blue-400 text-xs font-semibold cursor-pointer"
            title="Switch Simulated Role"
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="capitalize hidden md:inline truncate max-w-[100px]">
              {roleLabel.replace(/_/g, ' ')}
            </span>
            <ChevronDown className="w-3 h-3 opacity-70 shrink-0" />
          </button>

          {/* User Profile display */}
          <div className="flex items-center gap-2 pl-1.5 border-l border-slate-200 dark:border-slate-700">
            <img
              src={
                user?.avatarUrl ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&auto=format&fit=crop&q=80'
              }
              alt={user?.displayName || 'User'}
              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
            <button
              onClick={() => logout()}
              className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Sign Out / Reset Persona"
            >
              <LogOut className="w-4 h-4" />
            </button>
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
    </>
  );
};
