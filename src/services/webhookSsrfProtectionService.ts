/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Enterprise Webhook Platform — SSRF Protection & URL Sanitizer
 * Phase 15 Implementation
 */

export interface SsrfValidationResult {
  safe: boolean;
  reason?: string;
  normalizedUrl?: string;
}

export class WebhookSsrfProtectionService {
  /**
   * Blocked hostnames and TLDs
   */
  private static readonly BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'localhost.localdomain',
    'metadata.google.internal',
    'metadata.internal',
    '169.254.169.254',
    'instance-data',
    'cloud-metadata',
  ]);

  /**
   * Evaluates if an IPv4 address falls within prohibited ranges (private, loopback, metadata, multicast)
   */
  public static isProhibitedIpv4(ip: string): boolean {
    const parts = ip.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return false; // Not a standard dotted IPv4
    }

    const [a, b, c, d] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;

    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;

    // 10.0.0.0/8 (Private RFC 1918)
    if (a === 10) return true;

    // 172.16.0.0/12 (Private RFC 1918)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16 (Private RFC 1918)
    if (a === 192 && b === 168) return true;

    // 169.254.0.0/16 (Link-Local & Cloud Metadata 169.254.169.254)
    if (a === 169 && b === 254) return true;

    // 100.64.0.0/10 (Carrier-Grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;

    // 240.0.0.0/4 (Reserved / Future Use)
    if (a >= 240) return true;

    return false;
  }

  /**
   * Evaluates if an IPv6 address falls within prohibited ranges
   */
  public static isProhibitedIpv6(ip: string): boolean {
    const normalized = ip.toLowerCase();
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true; // Loopback
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true; // Unspecified
    if (normalized.startsWith('fe80:')) return true; // Link-local
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // Unique local (fc00::/7)

    // IPv4-mapped IPv6 (::ffff:127.0.0.1)
    if (normalized.includes('::ffff:')) {
      const parts = normalized.split('::ffff:');
      if (parts[1] && this.isProhibitedIpv4(parts[1])) return true;
    }

    return false;
  }

  /**
   * Validate webhook endpoint destination URL against strict SSRF rules
   * @param rawUrl The URL to validate
   * @param allowHttpSandbox Set to true strictly during mock sandbox/unit testing
   */
  public static validateDestinationUrl(rawUrl: string, allowHttpSandbox = false): SsrfValidationResult {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return { safe: false, reason: 'URL cannot be empty' };
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl.trim());
    } catch {
      return { safe: false, reason: 'Malformed URL format' };
    }

    // Protocol enforcement
    if (parsed.protocol === 'http:' && !allowHttpSandbox) {
      return { safe: false, reason: 'Webhooks must use HTTPS protocol in production' };
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { safe: false, reason: `Unsupported protocol ${parsed.protocol}: only HTTPS is permitted` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check blocked hostnames
    if (this.BLOCKED_HOSTNAMES.has(hostname)) {
      return { safe: false, reason: `Destination host '${hostname}' is strictly prohibited by SSRF security policy` };
    }

    // Prohibit localhost variations
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return { safe: false, reason: `Internal domain '${hostname}' is prohibited` };
    }

    // Direct IP address evaluation
    if (this.isProhibitedIpv4(hostname)) {
      return { safe: false, reason: `Private/internal IPv4 address '${hostname}' is prohibited` };
    }

    // Strip brackets from IPv6
    const cleanIpv6 = hostname.replace(/^\[|\]$/g, '');
    if (this.isProhibitedIpv6(cleanIpv6)) {
      return { safe: false, reason: `Private/internal IPv6 address '${cleanIpv6}' is prohibited` };
    }

    // Disallow non-standard webhook ports in production (permit 443, 8443, 80 for sandbox)
    if (parsed.port && parsed.port !== '443' && parsed.port !== '8443' && !allowHttpSandbox) {
      return { safe: false, reason: `Non-standard port '${parsed.port}' is prohibited` };
    }

    return {
      safe: true,
      normalizedUrl: parsed.toString(),
    };
  }

  /**
   * Validate redirect destination to prevent SSRF via redirect chaining
   */
  public static validateRedirectUrl(redirectUrl: string, allowHttpSandbox = false): SsrfValidationResult {
    return this.validateDestinationUrl(redirectUrl, allowHttpSandbox);
  }
}
