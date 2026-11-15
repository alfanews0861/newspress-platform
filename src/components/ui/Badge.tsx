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
    default: 'bg-[#f1f3f4] dark:bg-[#28292a] text-[#3c4043] dark:text-[#e3e3e3] border border-[#dadce0] dark:border-[#444746] font-medium',
    outline: 'border border-[#dadce0] dark:border-[#444746] text-[#3c4043] dark:text-[#e3e3e3] bg-white dark:bg-[#28292a] font-medium',
    primary: 'bg-[#e8f0fe] dark:bg-[#004a77] text-[#1a73e8] dark:text-[#a8c7fa] border border-[#d2e3fc] dark:border-[#1a73e8] font-medium',
    amber: 'bg-[#fef7e0] dark:bg-[#382c00] text-[#b06000] dark:text-[#fdd663] border border-[#feefc3] dark:border-[#f9ab00] font-medium',
    emerald: 'bg-[#e6f4ea] dark:bg-[#0d2818] text-[#137333] dark:text-[#81c995] border border-[#ceead6] dark:border-[#137333] font-medium',
    blue: 'bg-[#e8f0fe] dark:bg-[#004a77] text-[#1a73e8] dark:text-[#a8c7fa] border border-[#d2e3fc] dark:border-[#1a73e8] font-medium',
    purple: 'bg-[#f3e8fd] dark:bg-[#2e1065] text-[#7627bb] dark:text-[#d8b4fe] border border-[#e9d5ff] font-medium',
    rose: 'bg-[#fce8e6] dark:bg-[#3c1410] text-[#c5221f] dark:text-[#f28b82] border border-[#fad2cf] dark:border-[#d93025] font-medium',
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-sans ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
