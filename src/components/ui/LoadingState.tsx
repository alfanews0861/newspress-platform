/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface LoadingStateProps {
  message?: string;
  submessage?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading newsroom systems...',
  submessage = 'Syncing tenant permissions and editorial records',
  className = '',
}) => {
  return (
    <div className={`py-16 flex flex-col items-center justify-center text-center font-sans ${className}`}>
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-400 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-sans text-blue-600 dark:text-blue-400 font-bold">
          NP
        </div>
      </div>
      <p className="text-sm font-medium text-slate-900 dark:text-white font-sans">{message}</p>
      {submessage && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs font-sans">{submessage}</p>}
    </div>
  );
};
