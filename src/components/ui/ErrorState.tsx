/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'System Error Encountered',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`border border-rose-900/60 bg-rose-950/20 rounded-xl p-8 flex flex-col items-center justify-center text-center ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-rose-900/30 border border-rose-700/50 flex items-center justify-center text-rose-400 mb-3">
        <AlertTriangle className="w-6 h-6 stroke-[1.75]" />
      </div>
      <h3 className="text-sm font-semibold text-rose-200 font-mono tracking-wider uppercase mb-1">
        {title}
      </h3>
      <p className="text-xs text-rose-300/80 max-w-md mb-5 leading-relaxed">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary" size="sm">
          Retry Operation
        </Button>
      )}
    </div>
  );
};
