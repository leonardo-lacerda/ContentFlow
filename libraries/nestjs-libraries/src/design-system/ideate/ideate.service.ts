import { Injectable } from '@nestjs/common';
import { DesignSystemCatalogService } from '../catalog/catalog.service';
import type {
  DesignDirection,
  DesignFontPairing,
  DesignPalette,
  DesignRecipe,
  DesignSlideInput,
  DesignSlideRole,
  DesignTemplateMeta,
  IdeateOption,
  IdeateRequest,
} from '../types/design-system.types';

function tokens(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9à-ü]+/i)
    .filter(Boolean);
}

function tagScore(itemTags: string[] | undefined, queryTerms: string[]): number {
  const tags = new Set((itemTags || []).map((t) => t.toLowerCase()));
  return queryTerms.reduce((acc, q) => acc + (tags.has(q) ? 1 : 0), 0);
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

@Injectable()
export class IdeateService {
  constructor(private readonly catalog: DesignSystemCatalogService) {}

  ideate(request: IdeateRequest = {}): IdeateOption[] {
    const count = Math.max(1, Math.min(12, Number(request.count) || 6));
    const seed =
      request.seed == null ? Math.floor(Math.random() * 1e9) : Number(request.seed);
    const rng = mulberry32(seed);
    const q = tokens(request.query || '');
    const size = this.catalog.requireSize(request.sizeId || 'ig-portrait');
    const handle = request.handle || '@yourbrand';

    const directions = this.catalog.listDirections();
    const palettes = this.catalog.listPalettes();
    const fonts = this.catalog.listFonts();
    if (!directions.length || !palettes.length || !fonts.length) {
      return [];
    }

    const usedDirections = new Set<string>();
    const usedPalettes = new Set<string>();
    const options: IdeateOption[] = [];

    for (let i = 0; i < count; i++) {
      let direction: DesignDirection | undefined;
      if (request.directionId) {
        direction = this.catalog.getDirection(request.directionId);
      }
      if (!direction) {
        const pool = directions
          .filter((d) => !usedDirections.has(d.id))
          .sort(
            (a, b) =>
              tagScore(b.tags, q) +
              rng() * 0.5 -
              (tagScore(a.tags, q) + rng() * 0.5)
          );
        direction = pool[0] || directions[Math.floor(rng() * directions.length)];
      }
      usedDirections.add(direction.id);

      const palette = this.pick(
        palettes,
        direction.example_palettes || [],
        [...q, ...(direction.tags || [])],
        usedPalettes,
        rng
      );
      usedPalettes.add(palette.id);

      const font = this.pick(
        fonts,
        direction.example_fonts || [],
        [...q, ...(direction.tags || [])],
        new Set(),
        rng
      );

      const motifs = (direction.motifs || []).slice(0, 3);
      const recipe: IdeateOption = {
        directionId: direction.id,
        directionName: direction.name,
        paletteId: palette.id,
        fontId: font.id,
        motifs,
        sizeId: size.id,
        width: size.width,
        height: size.height,
        handle,
        vibe: direction.vibe,
        avoid: direction.avoid,
        seed: seed + i,
        score: tagScore(direction.tags, q),
        designRead: `Reading this as ${size.width}x${size.height} in the ${direction.id} direction — ${palette.id} palette, ${font.id} type, with ${(motifs[0] && motifs[1]) ? `${motifs[0]} + ${motifs[1]}` : motifs[0] || 'signature motifs'}.`,
      };
      options.push(recipe);
    }

    return options;
  }

  /**
   * Assign templates + roles for a locked recipe across N slides
   * (cover → content… → cta), xniper carousel_plan parity.
   */
  planSlides(
    recipe: DesignRecipe,
    slides: Array<{
      slideIndex: number;
      headline?: string;
      body?: string;
      cta?: string;
    }>
  ): DesignSlideInput[] {
    const templates = this.catalog.listTemplates();
    const ids = new Set(templates.map((t) => t.id));
    const cover = ids.has('carousel-cover')
      ? 'carousel-cover'
      : ids.has('quote-bold')
        ? 'quote-bold'
        : templates[0]?.id || 'quote-bold';
    const ctaT = ids.has('cta-endcard')
      ? 'cta-endcard'
      : ids.has('announcement')
        ? 'announcement'
        : cover;
    const bodyPool = [
      'tip-card',
      'stat-card',
      'checklist-rows',
      'blueprint-diagram',
      'quote-bold',
      'editorial-vintage',
    ].filter((id) => ids.has(id));
    if (!bodyPool.length && templates[1]) {
      bodyPool.push(templates[1].id);
    }
    if (!bodyPool.length) {
      bodyPool.push(cover);
    }

    const n = slides.length;
    return slides.map((slide, i) => {
      const isFirst = i === 0;
      const isLast = i === n - 1 && n > 1;
      let role: DesignSlideRole = 'content';
      let templateId = bodyPool[i % bodyPool.length];
      if (isFirst) {
        role = 'cover';
        templateId = cover;
      } else if (isLast) {
        role = 'cta';
        templateId = ctaT;
      }

      return {
        slideIndex: slide.slideIndex,
        role,
        templateId,
        headline: slide.headline,
        body: slide.body,
        subhead: slide.body,
        cta: slide.cta || (isLast ? 'Salvar' : isFirst ? 'Arraste' : ''),
        eyebrow: `${i + 1}/${n}`,
        index: String(i + 1).padStart(2, '0'),
        handle: recipe.handle,
      };
    });
  }

  private pick<T extends { id: string; tags?: string[] }>(
    items: T[],
    preferredIds: string[],
    queryTerms: string[],
    used: Set<string>,
    rng: () => number
  ): T {
    const byId = new Map(items.map((it) => [it.id, it]));
    const preferred = preferredIds
      .map((id) => byId.get(id))
      .filter((it): it is T => Boolean(it) && !used.has(it.id));
    if (preferred.length) {
      return preferred[Math.floor(rng() * preferred.length)];
    }

    const ranked = [...items]
      .filter((it) => !used.has(it.id))
      .sort(
        (a, b) =>
          tagScore(b.tags, queryTerms) +
          rng() * 0.3 -
          (tagScore(a.tags, queryTerms) + rng() * 0.3)
      );
    if (ranked.length) {
      return ranked[0];
    }
    return items[Math.floor(rng() * items.length)];
  }

  /** Convenience for tests / callers that need palette+font objects */
  resolveRecipeAssets(recipe: DesignRecipe): {
    palette: DesignPalette;
    font: DesignFontPairing;
    direction?: DesignDirection;
    template?: DesignTemplateMeta;
  } {
    return {
      palette: this.catalog.requirePalette(recipe.paletteId),
      font: this.catalog.requireFont(recipe.fontId),
      direction: this.catalog.getDirection(recipe.directionId),
    };
  }
}
