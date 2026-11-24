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
    title: 'Workspace',
    items: [
      {
        id: 'dashboard',
        label: 'Home',
        href: '/dashboard',
      },
      {
        id: 'news',
        label: 'Stories',
        href: '/newsroom/news',
        requiredPermission: 'news.read',
      },
      {
        id: 'editions',
        label: 'Editions',
        href: '/newspaper/editions',
        requiredPermission: 'edition.view',
      },
      {
        id: 'page_designer',
        label: 'Page Designer',
        href: '/newspaper/page-designer',
        requiredPermission: 'editions.edit',
      },
      {
        id: 'youtube_studio',
        label: 'Broadcast Studio',
        href: '/newsroom/youtube-studio',
      },
      {
        id: 'marketplace_home',
        label: 'Marketplace',
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
    title: 'Manage',
    defaultCollapsed: false,
    items: [
      {
        id: 'paper_settings',
        label: 'Paper & Brand',
        href: '/newspaper/brands',
        requiredPermission: 'edition.view',
      },
      {
        id: 'reporters',
        label: 'Reporters',
        href: '/newsroom/reporters',
        requiredPermission: 'reporters.read',
      },
      {
        id: 'user_portal',
        label: 'Account & Wallet',
        href: '/user/portal',
      },
      {
        id: 'wire_feeds',
        label: 'Wire Feeds',
        href: '/admin/wire-feeds',
        requiredPermission: 'platform.admin',
      },
      {
        id: 'settings',
        label: 'Settings',
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
