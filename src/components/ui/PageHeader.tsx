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
  tagline,
  badge,
  actions,
  breadcrumbs,
  className = '',
}) => {
  return (
    <div className={`mb-6 pb-5 border-b border-[#dadce0] font-sans ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="mb-2.5">
          <Breadcrumb items={breadcrumbs} />
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-sm text-black dark:text-slate-300 mt-1 max-w-3xl leading-relaxed font-normal">
              {subtitle}
            </p>
          )}
          {tagline && (
            <p className="text-xs text-[#1a73e8] dark:text-[#8ab4f8] font-semibold tracking-normal mt-1">
              {tagline}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
};
