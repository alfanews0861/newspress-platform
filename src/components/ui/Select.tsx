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
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-[#3c4043] dark:text-[#dadce0]"
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`w-full min-h-[44px] sm:min-h-[40px] bg-white dark:bg-[#1a1c1e] border rounded-xl px-3.5 py-2 text-sm text-[#202124] dark:text-[#f8f9fa] transition-colors focus:outline-none ${
            error
              ? 'border-[#d93025] focus:border-[#d93025] focus:ring-2 focus:ring-[#d93025]/20'
              : 'border-[#dadce0] dark:border-[#3c4043] hover:border-[#bdc1c6] dark:hover:border-[#5f6368] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
              className="bg-white dark:bg-[#242629] text-[#202124] dark:text-[#f8f9fa]"
            >
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-[#d93025] dark:text-[#f28b82] mt-1">{error}</p>}
        {!error && helperText && (
          <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
