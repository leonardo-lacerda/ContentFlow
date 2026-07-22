'use client';

// Fase 1 — Preview verdadeiro do modo "Sistema de design".
//
// Busca no backend o MESMO HTML por slide que o Playwright renderiza no
// export final e o exibe em iframes escalados. Como os dois lados são o mesmo
// HTML no mesmo motor (Chromium), o que aparece aqui É o resultado — pixel a
// pixel. Nenhum render/PNG é gasto nesta prévia.

import { memo, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { aiGenerateImagesApi } from './ai-generate-images.api';
import { Spinner } from './ai-generate-images.loaders';
import type { CarouselPlan, DesignRecipe } from './ai-generate-images.types';

type PreviewSlide = {
  slideIndex: number;
  templateId?: string;
  role?: string;
  width: number;
  height: number;
  html: string;
};

type DesignLivePreviewProps = {
  plan: CarouselPlan;
  designSizeId: string;
  designHandle: string;
  brandColors: string;
  brandFonts?: string;
  designRecipe?: DesignRecipe | null;
  query?: string;
};

const THUMB_WIDTH = 230;

export const DesignLivePreview = memo(function DesignLivePreview(
  props: DesignLivePreviewProps
) {
  const {
    plan,
    designSizeId,
    designHandle,
    brandColors,
    brandFonts,
    designRecipe,
    query,
  } = props;
  const fetch = useFetch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slides, setSlides] = useState<PreviewSlide[]>([]);

  const loadPreview = useCallback(async () => {
    if (!plan?.slides?.length) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const brandColorList = brandColors
        .split(/[,\n]/)
        .map((c) => c.trim())
        .filter(Boolean);

      const { ok, data, message } = await aiGenerateImagesApi.previewDesignHtml(
        fetch,
        {
          slides: plan.slides.map((slide) => ({
            slideIndex: slide.index,
            headline: slide.headline,
            body: slide.body,
            cta: slide.cta,
          })),
          recipe: designRecipe
            ? {
                directionId: designRecipe.directionId,
                paletteId: designRecipe.paletteId,
                fontId: designRecipe.fontId,
                sizeId: designRecipe.sizeId || designSizeId,
                motifs: designRecipe.motifs,
                handle: designHandle || designRecipe.handle,
              }
            : undefined,
          autoIdeate: !designRecipe,
          query: query || plan.title,
          sizeId: designSizeId || 'ig-portrait',
          handle: designHandle || undefined,
          brand: {
            handle: designHandle || undefined,
            colors: brandColorList,
            fontFamily: brandFonts || undefined,
            accentStrategy: 'catalog-blend',
          },
        }
      );

      if (!ok || !data?.slides?.length) {
        setError(message || 'Não foi possível montar a pré-visualização.');
        return;
      }
      setSlides(data.slides);
    } catch {
      setError('Não foi possível montar a pré-visualização.');
    } finally {
      setLoading(false);
    }
  }, [
    brandColors,
    brandFonts,
    designHandle,
    designRecipe,
    designSizeId,
    fetch,
    plan,
    query,
  ]);

  return (
    <div className="mt-[16px] rounded-[14px] border border-black/10 bg-stone-50 p-[16px] dark:border-white/10 dark:bg-white/5 md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-[10px]">
        <div>
          <span className="text-[14px] font-[800] text-black dark:text-white">
            Pré-visualização exata
          </span>
          <p className="mt-[2px] text-[12px] text-black/55 dark:text-white/55">
            O que aparece aqui é o mesmo HTML do PNG final — preview =
            resultado, sem custo de render.
          </p>
        </div>
        <button
          type="button"
          onClick={loadPreview}
          disabled={loading || !plan?.slides?.length}
          className="flex items-center gap-[8px] rounded-[10px] border border-stone-950 bg-stone-950 px-[14px] py-[9px] text-[13px] font-[800] text-white transition hover:bg-stone-800 disabled:opacity-50 dark:border-white dark:bg-white dark:text-stone-950"
        >
          {loading && <Spinner size={14} />}
          {loading
            ? 'Montando...'
            : slides.length
            ? 'Atualizar prévia'
            : 'Pré-visualizar (exato)'}
        </button>
      </div>

      {error && (
        <p className="mt-[10px] text-[12px] text-red-500">{error}</p>
      )}

      {slides.length > 0 && (
        <div className="mt-[14px] flex gap-[12px] overflow-x-auto pb-[8px]">
          {slides.map((slide) => {
            const scale = THUMB_WIDTH / slide.width;
            const thumbHeight = Math.round(slide.height * scale);
            return (
              <div
                key={`ds-preview-${slide.slideIndex}`}
                className="shrink-0 overflow-hidden rounded-[10px] border border-black/10 bg-white shadow-sm dark:border-white/15"
                style={{ width: THUMB_WIDTH, height: thumbHeight }}
              >
                <iframe
                  title={`Prévia do slide ${slide.slideIndex}`}
                  srcDoc={slide.html}
                  sandbox=""
                  scrolling="no"
                  style={{
                    width: slide.width,
                    height: slide.height,
                    border: 'none',
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
