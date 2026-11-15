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
  ...props
}) => {
  const baseStyles = 'inline-flex flex-row items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer whitespace-nowrap';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-1.5 rounded-full gap-2',
    md: 'text-sm px-4.5 py-2 rounded-full gap-2.5',
    lg: 'text-base px-6 py-2.5 rounded-full gap-3',
  };

  const variantStyles = {
    primary: 'bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white shadow-none hover:shadow-xs font-semibold',
    secondary: 'bg-[#f1f3f4] hover:bg-[#e8eaed] dark:bg-[#28292a] dark:hover:bg-[#333537] text-[#3c4043] dark:text-[#e3e3e3] font-medium',
    outline: 'border border-[#dadce0] dark:border-[#444746] bg-white dark:bg-[#28292a] hover:bg-[#f8fafd] dark:hover:bg-[#333537] text-[#1a73e8] dark:text-[#8ab4f8] font-medium shadow-xs',
    ghost: 'text-[#5f6368] dark:text-[#c4c7c5] hover:text-[#202124] dark:hover:text-white hover:bg-[#f1f3f4] dark:hover:bg-[#28292a] font-medium',
    danger: 'bg-[#d93025] hover:bg-[#c5221f] text-white shadow-none font-semibold',
    editorial: 'bg-[#e8f0fe] dark:bg-[#004a77] text-[#1a73e8] dark:text-[#a8c7fa] border border-[#d2e3fc] dark:border-[#1a73e8] hover:bg-[#d2e3fc]/60 font-semibold',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4 text-current shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
