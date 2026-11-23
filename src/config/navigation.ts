/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppPermission } from '../types/rbac';

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  requiredPermission?: AppPermission;
  badge?: string;
}

export interface NavigationSection {
  id: string;
  title: string;
  items: NavigationItem[];
  defaultCollapsed?: boolean;
}

export const NAVIGATION_SECTIONS: NavigationSection[] = [
  {
    id: 'primary',
    title: 'Main Workspace',
    items: [
      {
        id: 'dashboard',
        label: 'Home',
        href: '/dashboard',
      },
      {
        id: 'news',
        label: 'Stories & Desk',
        href: '/newsroom/news',
        requiredPermission: 'news.read',
      },
      {
        id: 'editions',
        label: 'Newspaper Builder',
        href: '/newspaper/editions',
        requiredPermission: 'edition.view',
      },
      {
        id: 'page_designer',
        label: 'Read & Print Paper',
        href: '/newspaper/page-designer',
        requiredPermission: 'editions.edit',
      },
      {
        id: 'youtube_studio',
        label: 'YouTube Video Studio',
        href: '/newsroom/youtube-studio',
      },
      {
        id: 'marketplace_home',
        label: 'News Marketplace',
        href: '/marketplace',
        requiredPermission: 'marketplace.browse',
      },
    ],
  },
  {
    id: 'user_section',
    title: 'User Portal',
    defaultCollapsed: false,
    items: [
      {
        id: 'user_portal',
        label: 'My Account & KYC',
        href: '/user/portal',
        badge: 'Alfa Hub',
      },
      {
        id: 'user_plan',
        label: 'User Plan & Billing',
        href: '/user/portal?tab=plan',
      },
      {
        id: 'user_credits',
        label: 'Balance Credits & Wallet',
        href: '/user/portal?tab=credits',
      },
      {
        id: 'user_paper',
        label: 'My ePaper Editions',
        href: '/user/portal?tab=paper',
      },
      {
        id: 'user_reporter',
        label: 'As Reporter & Wire Desk',
        href: '/user/portal?tab=reporter',
      },
      {
        id: 'user_youtube',
        label: 'YouTube Settings',
        href: '/user/portal?tab=youtube',
      },
    ],
  },
  {
    id: 'setup',
    title: 'Setup & Reporters',
    defaultCollapsed: false,
    items: [
      {
        id: 'my_listings',
        label: 'Sell Story (Reporters)',
        href: '/marketplace/my-listings',
      },
      {
        id: 'paper_settings',
        label: 'Paper & Masthead',
        href: '/newspaper/brands',
        requiredPermission: 'edition.view',
      },
      {
        id: 'reporters',
        label: 'Reporters & Staff',
        href: '/newsroom/reporters',
        requiredPermission: 'reporters.read',
      },
      {
        id: 'settings',
        label: 'Channel & Settings',
        href: '/settings',
        requiredPermission: 'tenant.manage_settings',
      },
      {
        id: 'affiliate',
        label: 'Affiliate & Earn',
        href: '/affiliate',
        badge: '25% Cut',
      },
    ],
  },
];
