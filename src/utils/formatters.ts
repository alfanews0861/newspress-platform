/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function formatCurrency(amount: number, currency = 'USD'): string {
  if (currency === 'INR') {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export function formatINR(rupees: number): string {
  return `₹${Number(rupees || 0).toLocaleString('en-IN')}`;
}

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatTimeLeft(isoDeadline: string): string {
  try {
    const target = new Date(isoDeadline).getTime();
    const now = Date.now();
    const diffMs = target - now;

    if (diffMs <= 0) return 'Press Deadline Passed';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h to lock`;
    }

    return `${hours}h ${mins}m to print lock`;
  } catch {
    return 'Deadline pending';
  }
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}
