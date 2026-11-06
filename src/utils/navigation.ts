/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Centralized Multi-Page HTML5 History Router & Navigation Utility
 * Ensures proper URL updates, browser history management (back/forward),
 * and SEO synchronization across the application.
 */

import { updateSEO } from './seo';

export interface NavigationOptions {
  replace?: boolean;
  preserveScroll?: boolean;
}

/**
 * Returns the current URL pathname from the browser
 */
export function getCurrentPath(): string {
  if (typeof window === 'undefined') return '/';
  const pathname = window.location.pathname;
  return pathname && pathname !== '' ? pathname : '/';
}

/**
 * Navigates to a specific route, updating browser URL, history, and SEO tags
 */
export function navigateTo(path: string, options: NavigationOptions = {}): void {
  if (typeof window === 'undefined') return;

  const current = getCurrentPath();
  const target = path.startsWith('/') ? path : `/${path}`;

  // Update browser history and address bar URL
  if (options.replace) {
    window.history.replaceState({ path: target }, '', target);
  } else if (current !== target) {
    window.history.pushState({ path: target }, '', target);
  }

  // Update Document Title & SEO Meta Tags
  updateSEO(target);

  // Dispatch custom navigate event for application root listeners
  window.dispatchEvent(new CustomEvent('navigate', { detail: target }));

  // Scroll to top unless specified
  if (!options.preserveScroll) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
