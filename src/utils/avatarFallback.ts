/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Crisp Local SVG Initials Avatar Generator
 * Avoids broken or mismatched external stock portrait URLs.
 */

const PALETTES = [
  ['#1a73e8', '#ffffff'],
  ['#0f766e', '#ffffff'],
  ['#7c3aed', '#ffffff'],
  ['#b45309', '#ffffff'],
  ['#be123c', '#ffffff'],
  ['#1e293b', '#f8fafc'],
];

export function getInitialsAvatarDataUrl(name?: string | null): string {
  const clean = (name || 'NP').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0][0]}${words[1][0]}`.toUpperCase()
      : clean.slice(0, 2).toUpperCase() || 'NP';

  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const [bg, fg] = PALETTES[Math.abs(hash) % PALETTES.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="${bg}"/><text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" fill="${fg}" font-family="system-ui,-apple-system,sans-serif" font-size="36" font-weight="700">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
