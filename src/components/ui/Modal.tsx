/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      {/* High-Contrast Solid Backdrop */}
      <div
        className="fixed inset-0 bg-black/65 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="min-h-full flex items-center justify-center p-4 text-center">
        <div
          className={`w-full ${maxWidthStyles[maxWidth]} transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-left align-middle shadow-2xl transition-all relative z-50`}
          style={{ backgroundColor: 'var(--color-surface, #ffffff)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
            <div>
              <h3 className="text-base font-bold text-black dark:text-white font-sans tracking-tight">
                {title}
              </h3>
              {subtitle && <p className="text-xs text-black dark:text-slate-300 font-medium mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-black dark:text-slate-200 hover:text-red-600 dark:hover:text-white p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 max-h-[75vh] overflow-y-auto text-sm text-black dark:text-slate-100 bg-white dark:bg-slate-900 font-sans">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 bg-slate-50 dark:bg-[#202124] border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 font-sans">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
