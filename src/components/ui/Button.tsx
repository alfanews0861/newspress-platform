/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'editorial';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  type = 'button',
  ...props
}) => {
  const baseStyles =
    'inline-flex flex-row items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]/40 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer whitespace-nowrap shrink-0';

  const sizeStyles = {
    sm: 'text-xs min-h-[38px] sm:min-h-[34px] px-3.5 py-1.5 rounded-full gap-1.5',
    md: 'text-sm min-h-[44px] sm:min-h-[40px] px-4 py-2 rounded-full gap-2',
    lg: 'text-sm sm:text-base min-h-[48px] px-6 py-2.5 rounded-full gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white font-semibold',
    secondary:
      'bg-[#f1f3f4] hover:bg-[#e8eaed] dark:bg-[#2e3135] dark:hover:bg-[#3c4043] text-[#202124] dark:text-[#f8f9fa] font-medium',
    outline:
      'border border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#242629] hover:bg-[#f8fafd] dark:hover:bg-[#2e3135] text-[#1a73e8] dark:text-[#8ab4f8] font-medium',
    ghost:
      'text-[#5f6368] dark:text-[#bdc1c6] hover:text-[#202124] dark:hover:text-white hover:bg-[#f1f3f4] dark:hover:bg-[#2e3135] font-medium',
    danger: 'bg-[#d93025] hover:bg-[#c5221f] text-white font-semibold',
    editorial:
      'bg-[#e8f0fe] dark:bg-[#173054] text-[#1a73e8] dark:text-[#8ab4f8] border border-[#d2e3fc] dark:border-[#1a73e8]/60 hover:bg-[#d2e3fc]/70 font-semibold',
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4 text-current shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : leftIcon ? (
        <span className="shrink-0 inline-flex items-center justify-center">{leftIcon}</span>
      ) : null}
      {children}
      {!isLoading && rightIcon && (
        <span className="shrink-0 inline-flex items-center justify-center">{rightIcon}</span>
      )}
    </button>
  );
};
