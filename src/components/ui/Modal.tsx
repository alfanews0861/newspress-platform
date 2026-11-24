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
      <div
        className="fixed inset-0 bg-[#202124]/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Native bottom-sheet on mobile, centered dialog on desktop */}
      <div className="min-h-full flex items-end sm:items-center justify-center sm:p-4 text-center">
        <div
          className={`w-full ${maxWidthStyles[maxWidth]} transform overflow-hidden rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#242629] border-t sm:border border-[#e0e3e7] dark:border-[#3c4043] text-left align-middle shadow-2xl transition-all relative z-50`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile sheet grab handle */}
          <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
            <div className="w-10 h-1 rounded-full bg-[#dadce0] dark:bg-[#5f6368]" />
          </div>

          {/* Header */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#e0e3e7] dark:border-[#3c4043] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-[#202124] dark:text-[#f8f9fa] font-sans tracking-tight truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[#5f6368] dark:text-[#bdc1c6] hover:text-[#202124] dark:hover:text-white rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#2e3135] transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 sm:px-6 py-4 sm:py-5 max-h-[78dvh] sm:max-h-[75vh] overflow-y-auto text-sm text-[#3c4043] dark:text-[#dadce0] font-sans">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-4 sm:px-6 py-3 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 bg-[#f8fafd] dark:bg-[#1f2124] border-t border-[#e0e3e7] dark:border-[#3c4043] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 font-sans">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
