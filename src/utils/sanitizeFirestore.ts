/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sanitizes data payloads destined for Firestore by recursively stripping any 'undefined'
 * fields, which Firestore strictly rejects.
 */

export function sanitizeFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeFirestore) as any;
  }
  if (data instanceof Date) {
    return data.toISOString() as any;
  }
  if (typeof data === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeFirestore(value);
      }
    }
    return cleaned;
  }
  return data;
}
