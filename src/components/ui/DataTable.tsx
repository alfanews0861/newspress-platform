/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyState,
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-[#5f6368]">
        <svg className="animate-spin h-6 w-6 text-[#1a73e8] mb-2" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-xs font-medium text-[#5f6368]">Loading records...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="py-10">{emptyState || <p className="text-center text-sm text-[#5f6368]">No records found.</p>}</div>;
  }

  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs ${className}`}>
      <table className="w-full text-left text-sm text-black dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-[#f8fafd] dark:bg-[#202124] text-[12px] font-bold text-black dark:text-slate-300 font-sans border-b border-slate-300 dark:border-slate-800">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={`px-4 py-3.5 ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
          {data.map((row, idx) => (
            <tr
              key={keyExtractor(row, idx)}
              onClick={() => onRowClick?.(row)}
              className={`hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3.5 text-xs text-black dark:text-slate-200 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {col.render ? col.render(row, idx) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
