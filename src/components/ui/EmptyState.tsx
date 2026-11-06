/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Newspaper } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-white/80 dark:bg-slate-900/50 backdrop-blur-xs font-sans ${className}`}
    >
      <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-xs">
        {icon || <Newspaper className="w-7 h-7 stroke-[1.5]" />}
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-white font-sans tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
