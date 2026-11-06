/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left font-sans">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-medium text-[#202124] dark:text-slate-200">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`w-full bg-white dark:bg-slate-900 border rounded-lg px-3.5 py-2 text-sm text-[#202124] dark:text-slate-100 transition-all focus:outline-none ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        {!error && helperText && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
