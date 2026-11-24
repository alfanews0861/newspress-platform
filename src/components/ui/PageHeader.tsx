/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  tagline?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  breadcrumbs,
  className = '',
}) => {
  return (
    <div
      className={`mb-5 pb-4 border-b border-[#e0e3e7] dark:border-[#3c4043] font-sans w-full min-w-0 ${className}`}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="mb-1.5 hidden sm:block">
          <Breadcrumb items={breadcrumbs} />
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-[#202124] dark:text-[#f8f9fa] break-words">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[#5f6368] dark:text-[#9aa0a6] mt-1 max-w-2xl leading-relaxed line-clamp-2">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
