/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * URL Safety & External Source Validation Utilities
 * Prevents private network, loopback, metadata, and unsafe scheme URLs
 * from being saved in feed configurations or rendered as media sources.
 */

const PRIVATE_IPV4_PATTERNS = [
  /^127\./,
  /^10\./,
  /^0\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata',
  '0.0.0.0',
  '::1',
  '[::1]',
]);

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  error?: string;
}

export function validateExternalFeedUrl(rawInput: string): UrlValidationResult {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Source URL is required.' };
  }
  if (trimmed.length > 1024) {
    return { valid: false, error: 'Source URL exceeds maximum length (1,024 characters).' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Enter a valid web address starting with https:// or http://.' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, error: 'Only http:// and https:// news URLs are supported.' };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, error: 'URLs with embedded credentials are not permitted.' };
  }

  const host = parsed.hostname.toLowerCase();
  if (!host || !host.includes('.')) {
    return { valid: false, error: 'Source URL must include a public domain name.' };
  }

  if (
    BLOCKED_HOSTNAMES.has(host) ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost') ||
    PRIVATE_IPV4_PATTERNS.some((rx) => rx.test(host))
  ) {
    return {
      valid: false,
      error: 'Private network, loopback, and internal metadata addresses are not allowed.',
    };
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
  };
}

export function sanitizeImageUrl(rawUrl?: string | null): string | undefined {
  if (!rawUrl || typeof rawUrl !== 'string') return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;

  // Allow local bundled assets under /assets/ or /src/assets/
  if (trimmed.startsWith('/assets/') || trimmed.startsWith('/src/assets/')) {
    return trimmed;
  }

  const check = validateExternalFeedUrl(trimmed);
  return check.valid ? check.normalizedUrl : undefined;
}
