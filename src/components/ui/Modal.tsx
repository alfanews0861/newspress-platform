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
      {/* Google Soft Backdrop */}
      <div
        className="fixed inset-0 bg-[#202124]/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="min-h-full flex items-center justify-center p-4 text-center">
        <div
          className={`w-full ${maxWidthStyles[maxWidth]} transform overflow-hidden rounded-3xl bg-white dark:bg-[#28292a] border border-[#dadce0] dark:border-[#444746] text-left align-middle shadow-xl transition-all relative z-50`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#dadce0] dark:border-[#444746] flex items-center justify-between bg-white dark:bg-[#28292a]">
            <div>
              <h3 className="text-base font-semibold text-[#202124] dark:text-[#f2f2f2] font-sans tracking-tight">
                {title}
              </h3>
              {subtitle && <p className="text-xs text-[#5f6368] dark:text-[#8e918f] font-normal mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-[#5f6368] dark:text-[#c4c7c5] hover:text-[#202124] dark:hover:text-white p-2 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#333537] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 max-h-[75vh] overflow-y-auto text-sm text-[#3c4043] dark:text-[#e3e3e3] bg-white dark:bg-[#28292a] font-sans">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 bg-[#f8fafd] dark:bg-[#202124] border-t border-[#dadce0] dark:border-[#444746] flex items-center justify-end gap-3 font-sans">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
