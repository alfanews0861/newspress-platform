/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'editorial' | 'bordered';
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  footer,
  className = '',
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'bg-white dark:bg-slate-900 border border-[#dadce0] dark:border-slate-800 shadow-[0_1px_2px_0_rgba(60,64,67,0.08),0_1px_3px_1px_rgba(60,64,67,0.04)] rounded-xl',
    editorial: 'bg-white dark:bg-slate-900 border-t-2 border-t-[#1a73e8] border-x border-b border-[#dadce0] dark:border-slate-800 rounded-xl shadow-[0_1px_2px_0_rgba(60,64,67,0.08)]',
    bordered: 'bg-white dark:bg-slate-900 border border-[#dadce0] dark:border-slate-800 rounded-xl',
  };

  return (
    <div className={`overflow-hidden text-black dark:text-slate-100 ${variantStyles[variant]} ${className}`}>
      {(title || subtitle || action) && (
        <div className="px-5 py-4 border-b border-[#dadce0] dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            {title && (
              <h3 className="text-sm font-bold text-black dark:text-slate-100 font-sans tracking-normal">
                {title}
              </h3>
            )}
            {subtitle && <p className="text-xs text-black dark:text-slate-300 mt-0.5 font-sans font-medium">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && (
        <div className="px-5 py-3 bg-[#f8fafd] dark:bg-[#202124] border-t border-[#dadce0] dark:border-slate-800 text-xs text-black dark:text-slate-300 font-sans font-medium">
          {footer}
        </div>
      )}
    </div>
  );
};
