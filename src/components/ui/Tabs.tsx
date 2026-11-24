/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number | string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div
      className={`border-b border-[#e0e3e7] dark:border-[#3c4043] flex items-center gap-1 font-sans overflow-x-auto scrollbar-none min-w-0 max-w-full ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-2 min-h-[44px] sm:min-h-[40px] px-3.5 sm:px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer select-none shrink-0 whitespace-nowrap ${
              isActive
                ? 'border-[#1a73e8] text-[#1a73e8] dark:text-[#8ab4f8] dark:border-[#8ab4f8] font-semibold'
                : 'border-transparent text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-[11px] font-mono tabular-nums opacity-75">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
