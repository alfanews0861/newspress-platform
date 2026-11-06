/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'amber' | 'emerald' | 'blue' | 'purple' | 'rose' | 'primary';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5 font-medium',
    md: 'text-xs px-3 py-1 font-medium',
  };

  const variantStyles = {
    default: 'bg-slate-100 dark:bg-slate-800 text-black dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold',
    outline: 'border border-slate-400 dark:border-slate-700 text-black dark:text-slate-200 bg-white dark:bg-slate-800/60 font-semibold shadow-2xs',
    primary: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 font-semibold',
    amber: 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 font-semibold',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 font-semibold',
    blue: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 font-semibold',
    purple: 'bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 font-semibold',
    rose: 'bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-sans ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
