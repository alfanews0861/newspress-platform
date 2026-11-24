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
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[#3c4043] dark:text-[#dadce0]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5f6368] dark:text-[#9aa0a6]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full min-h-[44px] sm:min-h-[40px] bg-white dark:bg-[#1a1c1e] border rounded-xl px-3.5 py-2 text-sm text-[#202124] dark:text-[#f8f9fa] placeholder-[#70757a] dark:placeholder-[#9aa0a6] transition-colors focus:outline-none ${
              leftIcon ? 'pl-10' : ''
            } ${rightIcon ? 'pr-10' : ''} ${
              error
                ? 'border-[#d93025] focus:border-[#d93025] focus:ring-2 focus:ring-[#d93025]/20'
                : 'border-[#dadce0] dark:border-[#3c4043] hover:border-[#bdc1c6] dark:hover:border-[#5f6368] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#5f6368] dark:text-[#9aa0a6]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-[#d93025] dark:text-[#f28b82] mt-1">{error}</p>}
        {!error && helperText && (
          <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
