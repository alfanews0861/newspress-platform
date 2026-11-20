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
    default: 'border border-[#dadce0] dark:border-[#444746] rounded-2xl shadow-xs transition-shadow hover:shadow-sm',
    editorial: 'border-t-2 border-t-[#1a73e8] border-x border-b border-[#dadce0] dark:border-[#444746] rounded-2xl shadow-xs',
    bordered: 'border border-[#dadce0] dark:border-[#444746] rounded-2xl',
  };

  const hasBg = className.includes('bg-');
  const bgStyle = hasBg ? '' : 'bg-white dark:bg-[#1f1f1f]';

  return (
    <div className={`overflow-hidden text-[#3c4043] dark:text-[#e3e3e3] w-full min-w-0 ${bgStyle} ${variantStyles[variant]} ${className}`}>
      {(title || subtitle || action) && (
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#dadce0] dark:border-[#444746] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 min-w-0">
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-sm font-semibold text-[#202124] dark:text-[#f2f2f2] font-sans tracking-tight break-words">
                {title}
              </h3>
            )}
            {subtitle && <p className="text-xs text-[#5f6368] dark:text-[#8e918f] mt-0.5 font-sans font-normal leading-relaxed">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2 flex-wrap shrink-0">{action}</div>}
        </div>
      )}
      {children}
      {footer && (
        <div className="px-4 sm:px-5 py-3 bg-[#f8fafd] dark:bg-[#202124] border-t border-[#dadce0] dark:border-[#444746] text-xs text-[#5f6368] dark:text-[#8e918f] font-sans font-normal">
          {footer}
        </div>
      )}
    </div>
  );
};
