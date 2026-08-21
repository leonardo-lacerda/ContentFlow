import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { isSafePublicHttpsUrl } from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';
import { ssrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
import { designSystemTemplatePath } from '../paths';
import {
  escapeDesignCopy,
  fillTemplateTokens,
} from '../build/token-escape';
import { PlaywrightRenderService } from '../render/playwright-render.service';

// ─── Fase 2: Híbrido — fundo IA + camada de texto determinística ────────────
// A IA gera apenas o FUNDO (sem nenhum texto). Este serviço deita a camada
// tipográfica por cima usando o template overlay-text.html renderizado pelo
// mesmo Chromium do design system. Resultado: arte orgânica da IA com texto
// sempre nítido, na posição certa e com contraste garantido pelo scrim
// adaptativo do template (trava de acessibilidade da Fase 3).

export type HybridComposeCopy = {
  headline?: string;
  body?: string;
  cta?: string;
  eyebrow?: string;
  handle?: string;
  index?: number;
  total?: number;
};

export type HybridComposeBrand = {
  colors?: string[];
  fontFamily?: string;
};

export type HybridComposeInput = {
  width?: number;
  height?: number;
  /** Fundo como data URL (data:image/png;base64,...) — caminho preferido. */
  backgroundDataUrl?: string;
  /** Fundo como URL persistida (/uploads/... ou absoluta). */
  backgroundUrl?: string;
  copy?: HybridComposeCopy;
  brand?: HybridComposeBrand;
  scale?: number;
};

const OVERLAY_TEMPLATE_FILE = 'overlay-text.html';
const DEFAULT_FONTS_LINK =
  'https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800;900&family=Inter:wght@400;500;600&display=swap';

@Injectable()
export class HybridComposeService {
  private readonly logger = new Logger(HybridComposeService.name);

  constructor(private readonly render: PlaywrightRenderService) {}

  /** Normaliza o input vindo do DTO (Record<string, unknown>) com segurança. */
  parseComposeInput(raw: unknown): HybridComposeInput | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    const record = raw as Record<string, unknown>;
    const copy = (record.copy || {}) as Record<string, unknown>;
    const brand = (record.brand || {}) as Record<string, unknown>;
    const str = (v: unknown) =>
      typeof v === 'string' ? v.slice(0, 400) : undefined;
    const num = (v: unknown) => {
      const parsed = Number(v);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    };

    return {
      width: num(record.width),
      height: num(record.height),
      backgroundDataUrl: str(record.backgroundDataUrl),
      backgroundUrl: str(record.backgroundUrl),
      scale: num(record.scale),
      copy: {
        headline: str(copy.headline),
        body: str(copy.body),
        cta: str(copy.cta),
        eyebrow: str(copy.eyebrow),
        handle: str(copy.handle),
        index: num(copy.index),
        total: num(copy.total),
      },
      brand: {
        colors: Array.isArray(brand.colors)
          ? (brand.colors as unknown[])
              .map((c) => String(c).trim())
              .filter(Boolean)
              .slice(0, 6)
          : undefined,
        fontFamily: str(brand.fontFamily),
      },
    };
  }

  /**
   * Compõe a arte final: fundo (data URL / URL / cor sólida da marca) +
   * camada tipográfica do overlay. Retorna PNG.
   */
  async composeToPng(input: HybridComposeInput): Promise<Buffer> {
    const width = Math.round(input.width || 1080);
    const height = Math.round(input.height || 1080);
    const colors = input.brand?.colors || [];
    const bg = colors[0] || '#101418';
    const text = colors[1] || '#F5F6F2';
    const accent = colors[2] || '#2563EB';

    const backgroundDataUrl = await this.resolveBackground(input);

    // Escala tipográfica proporcional à largura do canvas (1080 = base).
    const unit = width / 1080;
    const px = (value: number) => String(Math.round(value * unit));

    const copy = input.copy || {};
    const tokens: Record<string, string> = {
      W: String(width),
      H: String(height),
      FONTS_LINK: DEFAULT_FONTS_LINK,
      DISPLAY: 'Archivo',
      BODYFONT: 'Inter',
      BG: bg,
      TEXT: text,
      ACCENT: accent,
      BG_IMAGE: backgroundDataUrl || '',
      EYEBROW: escapeDesignCopy(copy.eyebrow, ''),
      HEADLINE: escapeDesignCopy(copy.headline, ''),
      BODYCOPY: escapeDesignCopy(copy.body, ''),
      CTA: escapeDesignCopy(copy.cta, ''),
      HANDLE: escapeDesignCopy(copy.handle, ''),
      INDEX: String(copy.index || 1),
      TOTAL: String(copy.total || 1),
      HEADLINE_SIZE: px(88),
      BODY_SIZE: px(34),
      CTA_SIZE: px(28),
      EYEBROW_SIZE: px(24),
      COUNTER_SIZE: px(24),
      HANDLE_SIZE: px(26),
      GAP: px(22),
    };

    const template = readFileSync(
      designSystemTemplatePath(OVERLAY_TEMPLATE_FILE),
      'utf-8'
    );
    const { html, leftover } = fillTemplateTokens(template, tokens);
    if (leftover.length) {
      this.logger.debug(`Unfilled overlay tokens: ${leftover.join(', ')}`);
    }

    return this.render.renderHtmlToPng({
      html,
      width,
      height,
      scale: Math.max(1, Math.min(3, Number(input.scale || 2))),
    });
  }

  /** Resolve o fundo para data URL (embed) — URL persistida é baixada. */
  private async resolveBackground(
    input: HybridComposeInput
  ): Promise<string | null> {
    if (input.backgroundDataUrl?.startsWith('data:image/')) {
      return input.backgroundDataUrl;
    }

    const url = input.backgroundUrl?.trim();
    if (!url) {
      return null;
    }

    // `backgroundUrl` comes straight from the client's recompose request
    // body (ai-generate.controller.ts's /hybrid/recompose), so an absolute
    // http(s) value here is fully attacker-controlled and must go through
    // the same SSRF guard as every other outbound fetch of a user-supplied
    // address. A relative value is always resolved against our own
    // MAIN_URL/FRONTEND_URL below — same-origin by construction, so it
    // doesn't need the guard (see CLAUDE.md's note on not reflexively
    // wrapping trusted same-origin fetches).
    const isAbsolute = /^https?:\/\//i.test(url);
    if (isAbsolute && !(await isSafePublicHttpsUrl(url))) {
      this.logger.warn(`Hybrid background URL blocked by SSRF guard: ${url}`);
      return null;
    }

    const absolute = isAbsolute
      ? url
      : `${(process.env.MAIN_URL || process.env.FRONTEND_URL || '').replace(
          /\/$/,
          ''
        )}${url.startsWith('/') ? '' : '/'}${url}`;

    try {
      const response = await fetch(absolute, {
        // @ts-expect-error undici dispatcher is supported by the runtime fetch implementation.
        dispatcher: isAbsolute ? ssrfSafeDispatcher : undefined,
      });
      if (!response.ok) {
        this.logger.warn(
          `Hybrid background fetch failed (${response.status}): ${absolute}`
        );
        return null;
      }
      const contentType = response.headers.get('content-type') || 'image/png';
      const buffer = Buffer.from(await response.arrayBuffer());
      return `data:${contentType};base64,${buffer.toString('base64')}`;
    } catch (error) {
      this.logger.warn(
        `Hybrid background fetch error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }
}
