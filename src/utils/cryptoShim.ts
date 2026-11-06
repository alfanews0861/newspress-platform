/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Isomorphic Crypto Shim
 * Provides cross-platform cryptographic utilities for both browser and Node.js.
 */

// Pure JS SHA-256 for fast synchronous hashing in browsers
function sha256Sync(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  let i, j;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  
  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }

  words[ascii.length >> 2] |= 0x80 << ((3 - (ascii.length % 4)) * 8);
  words[(((ascii.length + 8) >> 6) << 4) + 15] = asciiBitLength;

  for (i = 0; i < words.length; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice(0);

    for (j = 0; j < 64; j++) {
      let w15 = w[j - 15] || 0, w2 = w[j - 2] || 0;
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[j] = j < 16 ? (w[j] || 0) : ((w[j - 16] || 0) + s0 + (w[j - 7] || 0) + s1) | 0;

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp1 = (hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[j] + w[j]) | 0;
      const temp2 = ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj) | 0;

      hash = [(temp1 + temp2) | 0, hash[0], hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

// @ts-ignore
class FakeBuffer extends Uint8Array {
  static from(input: any, encoding?: string): FakeBuffer {
    if (typeof input === 'string') {
      if (encoding === 'hex') {
        const bytes = new Uint8Array(Math.floor(input.length / 2));
        for (let i = 0; i < bytes.length; i++) {
          bytes[i] = parseInt(input.substring(i * 2, i * 2 + 2), 16) || 0;
        }
        return new FakeBuffer(bytes.buffer);
      }
      const encoder = new TextEncoder();
      const encoded = encoder.encode(input);
      return new FakeBuffer(encoded.buffer);
    }
    if (input instanceof Uint8Array || Array.isArray(input)) {
      return new FakeBuffer(new Uint8Array(input).buffer);
    }
    return new FakeBuffer(0);
  }

  toString(encoding?: string): string {
    if (encoding === 'hex') {
      return Array.from(this).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    const decoder = new TextDecoder();
    return decoder.decode(this);
  }
}

// Global Buffer fallback if not present
if (typeof globalThis !== 'undefined' && !(globalThis as any).Buffer) {
  (globalThis as any).Buffer = FakeBuffer;
}

export const Buffer = (typeof globalThis !== 'undefined' && (globalThis as any).Buffer) || FakeBuffer;

export function randomBytes(size: number) {
  const bytes = new Uint8Array(size);
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < size; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return {
    toString(encoding?: string) {
      if (encoding === 'hex') {
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      }
      return String.fromCharCode(...bytes);
    },
    length: size,
    buffer: bytes.buffer,
  };
}

export function createHash(algorithm: string) {
  let content = '';
  return {
    update(data: any) {
      content += typeof data === 'string' ? data : String(data);
      return this;
    },
    digest(encoding?: string) {
      return sha256Sync(content);
    },
  };
}

export function createHmac(algorithm: string, key: string) {
  let content = '';
  return {
    update(data: any) {
      content += typeof data === 'string' ? data : String(data);
      return this;
    },
    digest(encoding?: string) {
      return sha256Sync(`${key}::${content}`);
    },
  };
}

export function timingSafeEqual(a: any, b: any): boolean {
  try {
    const lenA = a.length ?? a.byteLength ?? 0;
    const lenB = b.length ?? b.byteLength ?? 0;
    if (lenA !== lenB) return false;
    let diff = 0;
    for (let i = 0; i < lenA; i++) {
      diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

const cryptoShim = {
  randomBytes,
  createHash,
  createHmac,
  timingSafeEqual,
  Buffer,
};

export default cryptoShim;
