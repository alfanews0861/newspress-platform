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
  isPhasePlanned?: boolean;
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
    title: 'Editorial Workspace',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/dashboard',
      },
      {
        id: 'news',
        label: 'Stories & Dispatches',
        href: '/newsroom/news',
        requiredPermission: 'news.read',
      },
      {
        id: 'editorial_queue',
        label: 'Review Queue',
        href: '/newsroom/editorial-queue',
        badge: 'Needs Action',
        requiredPermission: 'news.approve',
      },
      {
        id: 'editions',
        label: 'Newspaper Editions',
        href: '/newspaper/editions',
        requiredPermission: 'edition.view',
      },
      {
        id: 'page_designer',
        label: 'Page Designer Canvas',
        href: '/newspaper/page-designer',
        requiredPermission: 'editions.edit',
      },
      {
        id: 'downloads',
        label: 'Print-Ready Downloads',
        href: '/production/downloads',
        requiredPermission: 'production.download',
      },
      {
        id: 'marketplace_home',
        label: 'News Marketplace',
        href: '/marketplace',
        requiredPermission: 'marketplace.browse',
      },
      {
        id: 'reporters',
        label: 'Reporters & Staff',
        href: '/newsroom/reporters',
        requiredPermission: 'reporters.read',
      },
    ],
  },
  {
    id: 'system_tools',
    title: 'More Tools & Settings',
    defaultCollapsed: true,
    items: [
      {
        id: 'wallet',
        label: 'Finance & Wallet',
        href: '/finance/wallet',
        requiredPermission: 'billing.view',
      },
      {
        id: 'analytics',
        label: 'Analytics & Reports',
        href: '/analytics',
        requiredPermission: 'analytics.view',
      },
      {
        id: 'developer_apps',
        label: 'Developer & API',
        href: '/developer',
        requiredPermission: 'developer.view',
      },
      {
        id: 'reliability_console',
        label: 'Operations & Health',
        href: '/operations/reliability',
        requiredPermission: 'operations.reliability.view',
      },
      {
        id: 'settings',
        label: 'Settings',
        href: '/settings',
        requiredPermission: 'tenant.manage_settings',
      },
    ],
  },
];
