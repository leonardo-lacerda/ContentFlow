import { Injectable } from '@nestjs/common';
import { DesignSystemCatalogService } from '../catalog/catalog.service';
import type {
  DesignFontPairing,
  DesignPalette,
  DesignRecipe,
} from '../types/design-system.types';

export type BrandVisualInput = {
  handle?: string;
  colors?: string[];
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  logoUrl?: string;
  paletteId?: string;
  fontPairingId?: string;
  accentStrategy?: 'brand-first' | 'catalog-blend';
};

function hexLuminance(hex: string): number {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 3 && clean.length !== 6) {
    return 0.5;
  }
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const toLin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

function normalizeHex(input?: string): string | undefined {
  if (!input) return undefined;
  const m = String(input).trim().match(/#?[0-9a-fA-F]{3,8}/);
  if (!m) return undefined;
  let h = m[0].replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.length < 6) return undefined;
  return `#${h.slice(0, 6).toUpperCase()}`;
}

const BANNED_DISPLAY = new Set([
  'inter',
  'arial',
  'helvetica',
  'roboto',
  'open sans',
  'lato',
  'system-ui',
]);

@Injectable()
export class BrandTokenMapper {
  constructor(private readonly catalog: DesignSystemCatalogService) {}

  /**
   * Merge a design recipe with optional brand visual DNA.
   * Returns a recipe (possibly overriding palette/font/handle) + resolved assets.
   */
  applyBrand(
    recipe: DesignRecipe,
    brand?: BrandVisualInput | null
  ): {
    recipe: DesignRecipe;
    palette: DesignPalette;
    font: DesignFontPairing;
    logoUrl?: string;
  } {
    let palette = this.catalog.requirePalette(recipe.paletteId);
    let font = this.catalog.requireFont(recipe.fontId);
    let handle = recipe.handle || '@yourbrand';
    let logoUrl: string | undefined;

    if (!brand) {
      return { recipe: { ...recipe, handle }, palette, font };
    }

    if (brand.handle) {
      handle = brand.handle.startsWith('@')
        ? brand.handle
        : `@${brand.handle}`;
    }

    if (brand.logoUrl) {
      logoUrl = brand.logoUrl;
    }

    if (brand.paletteId && this.catalog.getPalette(brand.paletteId)) {
      palette = this.catalog.requirePalette(brand.paletteId);
    } else if (brand.fontPairingId && this.catalog.getFont(brand.fontPairingId)) {
      // keep palette, override font below
    }

    if (brand.fontPairingId && this.catalog.getFont(brand.fontPairingId)) {
      font = this.catalog.requireFont(brand.fontPairingId);
    } else if (brand.fontFamily) {
      const matched = this.matchFont(brand.fontFamily);
      if (matched) {
        font = matched;
      }
    }

    const strategy = brand.accentStrategy || 'catalog-blend';
    if (strategy === 'brand-first' || brand.colors?.length || brand.primaryColor) {
      palette = this.blendPalette(palette, brand);
    }

    return {
      recipe: {
        ...recipe,
        paletteId: palette.id,
        fontId: font.id,
        handle,
      },
      palette,
      font,
      logoUrl,
    };
  }

  private matchFont(hint: string): DesignFontPairing | undefined {
    const q = hint.toLowerCase();
    if (BANNED_DISPLAY.has(q)) {
      return undefined;
    }
    const fonts = this.catalog.listFonts();
    return (
      fonts.find((f) => f.display.toLowerCase().includes(q)) ||
      fonts.find((f) => f.name.toLowerCase().includes(q)) ||
      fonts.find((f) => (f.tags || []).some((t) => q.includes(t)))
    );
  }

  private blendPalette(
    base: DesignPalette,
    brand: BrandVisualInput
  ): DesignPalette {
    const colors = (brand.colors || [])
      .map(normalizeHex)
      .filter((c): c is string => Boolean(c));
    const primary =
      normalizeHex(brand.primaryColor) || colors[0] || base.accent;
    const secondary =
      normalizeHex(brand.secondaryColor) || colors[1] || base.accent2 || primary;
    const bg =
      normalizeHex(brand.backgroundColor) ||
      colors.find((c) => hexLuminance(c) < 0.25) ||
      base.bg;
    const text =
      normalizeHex(brand.textColor) ||
      colors.find((c) => hexLuminance(c) > 0.7) ||
      base.text;

    // Return a virtual palette id so fill still works; keep gradient simple.
    return {
      ...base,
      id: `${base.id}+brand`,
      name: `${base.name} × brand`,
      bg,
      text,
      accent: primary,
      accent2: secondary,
      surface: base.surface,
      muted: base.muted,
      gradient: `radial-gradient(110% 80% at 80% 10%, ${primary}33, transparent 55%), ${bg}`,
    };
  }
}
