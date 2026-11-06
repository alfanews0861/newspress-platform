/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  return (
    <nav className={`flex items-center space-x-1.5 text-xs text-black dark:text-slate-400 font-sans font-medium ${className}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-black dark:text-slate-500 shrink-0" />}
            {isLast || (!item.href && !item.onClick) ? (
              <span className={isLast ? 'text-blue-700 dark:text-amber-400/90 font-bold' : 'text-black dark:text-slate-400'}>
                {item.label}
              </span>
            ) : (
              <button
                onClick={item.onClick}
                className="hover:text-blue-600 dark:hover:text-slate-200 transition-colors cursor-pointer text-black dark:text-slate-300 font-semibold"
              >
                {item.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
