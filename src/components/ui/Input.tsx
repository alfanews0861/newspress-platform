/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left font-sans">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold text-black dark:text-slate-200">
            {label}
          </label>
        )}
        <div className="relative rounded-lg shadow-xs">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-black dark:text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-white dark:bg-slate-900 border rounded-lg px-3.5 py-2 text-sm text-black dark:text-slate-100 placeholder-slate-500 transition-all focus:outline-none ${
              leftIcon ? 'pl-10' : ''
            } ${rightIcon ? 'pr-10' : ''} ${
              error
                ? 'border-[#d93025] focus:border-[#d93025] focus:ring-2 focus:ring-[#d93025]/20'
                : 'border-slate-300 dark:border-slate-800 hover:border-black focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-black dark:text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-[#d93025] mt-1">{error}</p>}
        {!error && helperText && <p className="text-xs text-black dark:text-slate-400 mt-1 font-medium">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
