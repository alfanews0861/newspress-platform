/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Safe Guarded localStorage Helper
 * Persists state cleanly in the browser while safely no-oping in Node/Vitest/tsx test runners.
 */

export function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function readLocalJson<T>(key: string, fallback: T): T {
  if (!hasLocalStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeLocalJson<T>(key: string, value: T): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[localStore] Failed to persist "${key}":`, err);
  }
}

export function readLocalString(key: string, fallback: string): string {
  if (!hasLocalStorage()) return fallback;
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalString(key: string, value: string): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
}

export function removeLocalKey(key: string): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
