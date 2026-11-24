/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * URL Safety & SSRF Guard for the GCE e2-micro News Wire Worker.
 * Validates every outbound HTTP/HTTPS target and redirect hop against
 * private, loopback, link-local, metadata, and non-standard port ranges.
 */

import dns from 'node:dns/promises';
import net from 'node:net';

const ALLOWED_PORTS = new Set(['', '80', '443']);
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata',
  'instance-data',
]);

const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'ref',
  'ref_src',
  'source',
  'igshid',
]);

function isPrivateIpv4(ip) {
  const parts = ip.split('.').map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local & cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 0 && parts[2] === 0) return true; // 192.0.0.0/24
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15
  if (a >= 224) return true; // multicast & reserved
  return false;
}

function isPrivateIpv6(rawIp) {
  const ip = rawIp.toLowerCase().trim();
  if (ip === '::' || ip === '::1') return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // Unique local fc00::/7
  if (ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb')) {
    return true; // Link-local fe80::/10
  }
  if (ip.startsWith('ff')) return true; // Multicast
  // IPv4-mapped IPv6 e.g. ::ffff:169.254.169.254 or ::ffff:127.0.0.1
  if (ip.startsWith('::ffff:')) {
    const mapped = ip.slice('::ffff:'.length);
    if (net.isIPv4(mapped)) {
      return isPrivateIpv4(mapped);
    }
    return true;
  }
  return false;
}

export function isPrivateOrReservedIp(ip) {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

/**
 * Validates URL syntax and resolves DNS to ensure every target IP is public.
 */
export async function assertSafePublicUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    throw new Error('URL is empty');
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error(`Invalid URL syntax: ${rawUrl}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Blocked protocol: ${parsed.protocol}`);
  }

  if (parsed.username || parsed.password) {
    throw new Error('URLs with embedded credentials are not allowed');
  }

  if (!ALLOWED_PORTS.has(parsed.port)) {
    throw new Error(`Blocked port: ${parsed.port}`);
  }

  const host = parsed.hostname.toLowerCase();
  if (
    BLOCKED_HOSTNAMES.has(host) ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost')
  ) {
    throw new Error(`Blocked internal hostname: ${host}`);
  }

  if (net.isIP(host)) {
    if (isPrivateOrReservedIp(host)) {
      throw new Error(`Blocked private/reserved IP address: ${host}`);
    }
    return parsed;
  }

  let records;
  try {
    records = await dns.lookup(host, { all: true, verbatim: true });
  } catch (err) {
    throw new Error(`DNS lookup failed for ${host}: ${err.message}`);
  }

  if (!Array.isArray(records) || records.length === 0) {
    throw new Error(`No DNS records resolved for ${host}`);
  }

  for (const rec of records) {
    if (isPrivateOrReservedIp(rec.address)) {
      throw new Error(`DNS resolved ${host} to blocked private IP ${rec.address}`);
    }
  }

  return parsed;
}

/**
 * Normalizes an article URL for deterministic SHA-256 deduplication.
 */
export function canonicalizeUrl(rawUrl) {
  const parsed = new URL(rawUrl.trim());
  parsed.hash = '';
  parsed.hostname = parsed.hostname.toLowerCase();

  for (const key of [...parsed.searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (lower.startsWith('utm_') || TRACKING_PARAMS.has(lower)) {
      parsed.searchParams.delete(key);
    }
  }

  // Sort remaining query params for stable hashing
  const entries = [...parsed.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  parsed.search = '';
  for (const [k, v] of entries) {
    parsed.searchParams.append(k, v);
  }

  let out = parsed.toString();
  if (out.endsWith('/') && parsed.pathname.length > 1) {
    out = out.slice(0, -1);
  }
  return out;
}

/**
 * Safely resolves and validates an external image URL without fetching its bytes.
 */
export function sanitizeExternalImageUrl(candidateUrl, baseUrl) {
  if (!candidateUrl || typeof candidateUrl !== 'string') return undefined;
  const trimmed = candidateUrl.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('javascript:')) {
    return undefined;
  }

  try {
    const resolved = baseUrl ? new URL(trimmed, baseUrl) : new URL(trimmed);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return undefined;
    }
    if (resolved.username || resolved.password) return undefined;
    if (!ALLOWED_PORTS.has(resolved.port)) return undefined;

    const host = resolved.hostname.toLowerCase();
    if (
      BLOCKED_HOSTNAMES.has(host) ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      (net.isIP(host) && isPrivateOrReservedIp(host))
    ) {
      return undefined;
    }

    return resolved.toString().slice(0, 1024);
  } catch {
    return undefined;
  }
}

/**
 * Safe HTTP GET helper with manual redirect validation, timeout, and strict response size cap.
 */
export async function safeFetchText(rawUrl, options = {}) {
  const timeoutMs = Number(options.timeoutMs || process.env.FETCH_TIMEOUT_MS || 15000);
  const maxBytes = Number(options.maxBytes || process.env.MAX_RESPONSE_BYTES || 3 * 1024 * 1024);
  const maxRedirects = 4;

  let currentUrl = rawUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const safeUrl = await assertSafePublicUrl(currentUrl);

    const response = await fetch(safeUrl.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'User-Agent':
          'NewsPressWireBot/1.0 (+https://newspress.in; syndication-ingestion)',
        Accept:
          options.accept ||
          'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Redirect (${response.status}) missing Location header`);
      }
      currentUrl = new URL(location, safeUrl).toString();
      continue;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} for ${safeUrl.toString()}`);
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > maxBytes) {
      throw new Error(`Response exceeds size limit (${contentLength} > ${maxBytes} bytes)`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      const text = await response.text();
      return {
        finalUrl: safeUrl.toString(),
        contentType: response.headers.get('content-type') || '',
        body: text.slice(0, maxBytes),
      };
    }

    const chunks = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error(`Streamed response exceeded size limit (${maxBytes} bytes)`);
      }
      chunks.push(value);
    }

    const merged = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    return {
      finalUrl: safeUrl.toString(),
      contentType: response.headers.get('content-type') || '',
      body: merged.toString('utf8'),
    };
  }

  throw new Error(`Exceeded maximum redirects (${maxRedirects}) for ${rawUrl}`);
}
