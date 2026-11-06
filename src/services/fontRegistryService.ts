/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Font Registry & Typography Shaping Service
 * Manages production font licenses, font embedding permissions,
 * and Telugu Unicode script rendering verification.
 */

import { RegisteredFont } from '../types/production';

export class FontRegistryService {
  private static registeredFonts: Map<string, RegisteredFont> = new Map([
    [
      'font-noto-serif-telugu',
      {
        fontId: 'font-noto-serif-telugu',
        fontFamily: 'Noto Serif Telugu',
        fontStyle: 'normal',
        fontWeight: 400,
        fontFileReference: 'fonts/telugu/NotoSerifTelugu-Regular.ttf',
        supportedScripts: ['telugu', 'latin', 'symbols'],
        embeddingAllowed: true,
        licenseTerms: 'SIL Open Font License 1.1',
        status: 'active',
      },
    ],
    [
      'font-suranna-telugu',
      {
        fontId: 'font-suranna-telugu',
        fontFamily: 'Suranna',
        fontStyle: 'normal',
        fontWeight: 400,
        fontFileReference: 'fonts/telugu/Suranna-Regular.ttf',
        supportedScripts: ['telugu', 'latin'],
        embeddingAllowed: true,
        licenseTerms: 'SIL Open Font License 1.1',
        status: 'active',
      },
    ],
    [
      'font-gidugu-telugu',
      {
        fontId: 'font-gidugu-telugu',
        fontFamily: 'Gidugu',
        fontStyle: 'normal',
        fontWeight: 400,
        fontFileReference: 'fonts/telugu/Gidugu-Regular.ttf',
        supportedScripts: ['telugu', 'latin'],
        embeddingAllowed: true,
        licenseTerms: 'SIL Open Font License 1.1',
        status: 'active',
      },
    ],
    [
      'font-ramabhadra-telugu',
      {
        fontId: 'font-ramabhadra-telugu',
        fontFamily: 'Ramabhadra',
        fontStyle: 'normal',
        fontWeight: 400,
        fontFileReference: 'fonts/telugu/Ramabhadra-Regular.ttf',
        supportedScripts: ['telugu', 'latin'],
        embeddingAllowed: true,
        licenseTerms: 'SIL Open Font License 1.1',
        status: 'active',
      },
    ],
    [
      'font-newsreader-serif',
      {
        fontId: 'font-newsreader-serif',
        fontFamily: 'Newsreader',
        fontStyle: 'normal',
        fontWeight: 400,
        fontFileReference: 'fonts/latin/Newsreader-Regular.ttf',
        supportedScripts: ['latin', 'symbols'],
        embeddingAllowed: true,
        licenseTerms: 'SIL Open Font License 1.1',
        status: 'active',
      },
    ],
    [
      'font-cinzel-serif',
      {
        fontId: 'font-cinzel-serif',
        fontFamily: 'Cinzel',
        fontStyle: 'normal',
        fontWeight: 700,
        fontFileReference: 'fonts/latin/Cinzel-Bold.ttf',
        supportedScripts: ['latin', 'symbols'],
        embeddingAllowed: true,
        licenseTerms: 'SIL Open Font License 1.1',
        status: 'active',
      },
    ],
    [
      'font-inter-sans',
      {
        fontId: 'font-inter-sans',
        fontFamily: 'Inter',
        fontStyle: 'normal',
        fontWeight: 400,
        fontFileReference: 'fonts/latin/Inter-Regular.ttf',
        supportedScripts: ['latin', 'symbols'],
        embeddingAllowed: true,
        licenseTerms: 'SIL Open Font License 1.1',
        status: 'active',
      },
    ],
    [
      'font-playfair-display',
      {
        fontId: 'font-playfair-display',
        fontFamily: 'Playfair Display',
        fontStyle: 'normal',
        fontWeight: 700,
        fontFileReference: 'fonts/latin/PlayfairDisplay-Bold.ttf',
        supportedScripts: ['latin', 'symbols'],
        embeddingAllowed: true,
        licenseTerms: 'SIL Open Font License 1.1',
        status: 'active',
      },
    ],
    [
      'font-restricted-commercial',
      {
        fontId: 'font-restricted-commercial',
        fontFamily: 'Helvetica Commercial Pro',
        fontStyle: 'normal',
        fontWeight: 400,
        fontFileReference: 'fonts/restricted/CommercialPro.otf',
        supportedScripts: ['latin'],
        embeddingAllowed: false, // Embedding restricted
        licenseTerms: 'Desktop Only - No Print PDF Embedding Allowed',
        status: 'restricted',
      },
    ],
  ]);

  /**
   * Retrieves all registered fonts.
   */
  public static getAllFonts(): RegisteredFont[] {
    return Array.from(this.registeredFonts.values());
  }

  /**
   * Looks up a registered font by family name or ID.
   */
  public static findFont(familyOrId: string): RegisteredFont | undefined {
    // Exact ID lookup
    if (this.registeredFonts.has(familyOrId)) {
      return this.registeredFonts.get(familyOrId);
    }

    // Clean family name lookup
    const cleanName = familyOrId.replace(/['",]/g, '').trim().split(' ')[0].toLowerCase();
    for (const font of this.registeredFonts.values()) {
      if (
        font.fontFamily.toLowerCase().includes(cleanName) ||
        cleanName.includes(font.fontFamily.toLowerCase())
      ) {
        return font;
      }
    }
    return undefined;
  }

  /**
   * Detects script type in string content (Telugu, Latin, or Mixed).
   */
  public static detectScript(text: string): 'telugu' | 'latin' | 'mixed' | 'empty' {
    if (!text || text.trim().length === 0) return 'empty';

    // Telugu Unicode block: U+0C00–U+0C7F
    const teluguRegex = /[\u0C00-\u0C7F]/;
    const latinRegex = /[a-zA-Z]/;

    const hasTelugu = teluguRegex.test(text);
    const hasLatin = latinRegex.test(text);

    if (hasTelugu && hasLatin) return 'mixed';
    if (hasTelugu) return 'telugu';
    return 'latin';
  }

  /**
   * Validates whether a text string can be correctly shaped and rendered by the requested font.
   */
  public static validateFontForText(
    fontFamily: string,
    text: string
  ): {
    isValid: boolean;
    font?: RegisteredFont;
    reason?: string;
    script: 'telugu' | 'latin' | 'mixed' | 'empty';
  } {
    const script = this.detectScript(text);
    const font = this.findFont(fontFamily);

    if (!font) {
      return {
        isValid: false,
        reason: `Font "${fontFamily}" is not registered in the NewsPress production font registry.`,
        script,
      };
    }

    if (!font.embeddingAllowed) {
      return {
        isValid: false,
        font,
        reason: `Font "${font.fontFamily}" has embedding restrictions that legally forbid inclusion in print-ready PDF files.`,
        script,
      };
    }

    if (script === 'telugu' && !font.supportedScripts.includes('telugu')) {
      const teluguCompanion = this.findFont('Noto Serif Telugu');
      if (!teluguCompanion || !teluguCompanion.embeddingAllowed) {
        return {
          isValid: false,
          font,
          reason: `Font "${font.fontFamily}" does not support Telugu Unicode script glyphs and no Telugu companion font is registered.`,
          script,
        };
      }
    }

    if (script === 'mixed' && !font.supportedScripts.includes('telugu')) {
      const teluguCompanion = this.findFont('Noto Serif Telugu');
      if (!teluguCompanion || !teluguCompanion.embeddingAllowed) {
        return {
          isValid: false,
          font,
          reason: `Content contains mixed Telugu and English text, but font "${font.fontFamily}" lacks Telugu glyph shaping support.`,
          script,
        };
      }
    }

    return {
      isValid: true,
      font,
      script,
    };
  }

  /**
   * Verifies that Telugu glyph cluster shaping rules are preserved (consonant conjuncts + vowel signs).
   */
  public static testTeluguGlyphShaping(teluguText: string): {
    preserved: boolean;
    clusterCount: number;
    graphemes: string[];
  } {
    // Unicode grapheme segmenter or regex cluster splitter
    const clusters: string[] = [];
    // Matches Telugu base consonant + optional virama + consonants + vowel signs / anusvara
    const clusterRegex = /[\u0C05-\u0C39\u0C58-\u0C61](?:[\u0C4D][\u0C15-\u0C39])*[\u0C3E-\u0C4C\u0C55\u0C56\u0C01-\u0C03]?/g;
    
    let match: RegExpExecArray | null;
    while ((match = clusterRegex.exec(teluguText)) !== null) {
      clusters.push(match[0]);
    }

    return {
      preserved: clusters.length > 0 || teluguText.length === 0,
      clusterCount: clusters.length,
      graphemes: clusters,
    };
  }
}
