import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { DesignSystemCatalogService } from '../catalog/catalog.service';
import { designSystemTemplatePath } from '../paths';
import type {
  DesignFontPairing,
  DesignPalette,
  DesignSlideInput,
  DesignTokens,
} from '../types/design-system.types';
import { escapeDesignCopy, fillTemplateTokens } from './token-escape';

export type FillSlideInput = {
  templateId: string;
  width: number;
  height: number;
  palette: DesignPalette;
  font: DesignFontPairing;
  slide: DesignSlideInput;
  handle?: string;
  logoUrl?: string;
  extraTokens?: DesignTokens;
};

@Injectable()
export class TemplateFillService {
  private readonly logger = new Logger(TemplateFillService.name);

  constructor(private readonly catalog: DesignSystemCatalogService) {}

  fillSlide(input: FillSlideInput): { html: string; leftover: string[] } {
    const meta = this.catalog.requireTemplate(input.templateId);
    const path = designSystemTemplatePath(meta.file);
    const tmpl = readFileSync(path, 'utf-8');
    const tokens = this.buildTokens(input);
    const { html, leftover } = fillTemplateTokens(tmpl, tokens);
    if (leftover.length) {
      this.logger.debug(
        `Unfilled tokens in ${input.templateId}: ${leftover.join(', ')}`
      );
    }
    return { html, leftover };
  }

  buildTokens(input: FillSlideInput): DesignTokens {
    const { palette, font, slide, width, height } = input;
    const handle = slide.handle || input.handle || '@yourbrand';
    const headline = escapeDesignCopy(slide.headline, 'Your headline here');
    const body = escapeDesignCopy(slide.body || slide.subhead, '');
    const subhead = escapeDesignCopy(slide.subhead || slide.body, '');
    const cta = escapeDesignCopy(slide.cta, '');
    const eyebrow = escapeDesignCopy(slide.eyebrow, '');
    const bigword = escapeDesignCopy(slide.bigword, '');
    const index = escapeDesignCopy(slide.index, String(slide.slideIndex));

    const base: DesignTokens = {
      W: String(width),
      H: String(height),
      FONTS_LINK: font.link,
      DISPLAY: font.display,
      BODY: font.body,
      DISPLAY_FONT: font.display,
      BODY_FONT: font.body,
      BG: palette.bg,
      SURFACE: palette.surface,
      TEXT: palette.text,
      MUTED: palette.muted,
      ACCENT: palette.accent,
      ACCENT2: palette.accent2 || palette.accent,
      GRADIENT: palette.gradient,
      EYEBROW: eyebrow,
      HEADLINE: headline,
      SUBHEAD: subhead,
      BODY_TEXT: body,
      CTA: cta,
      HANDLE: escapeDesignCopy(handle, '@yourbrand'),
      INDEX: index,
      BIGWORD: bigword,
      COUNTER: escapeDesignCopy(
        slide.eyebrow || `${slide.slideIndex}`,
        String(slide.slideIndex)
      ),
      LOGO_URL: input.logoUrl || '',
      SLIDE_ROLE: slide.role || 'content',
      GRAIN_SVG: '',
      MOTIF_SVG: '',
    };

    return { ...base, ...(input.extraTokens || {}) };
  }
}
