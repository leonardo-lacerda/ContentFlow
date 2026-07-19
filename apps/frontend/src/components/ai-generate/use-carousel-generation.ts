'use client';

import { FormEvent, useCallback, useEffect, useRef } from 'react';
import type {
  CarouselImageJob,
  CarouselPlan,
  CarouselSlide,
  CompanyProfile,
  EditorialReview,
  ReferenceImage,
  SlideImageResult,
} from './ai-generate-images.types';
import {
  MAX_CAROUSEL_SLIDES,
  MIN_CAROUSEL_SLIDES,
} from './ai-generate-images.constants';
import { buildLimitedBrief, compactText } from './ai-generate-images.utils';
import { aiGenerateImagesApi } from './ai-generate-images.api';
import { ensureSlideIds } from './slide-operations';
import type { DirectionSpec } from './direction-compiler';
import { trackTemplateUsage } from './template-registry';

/* ──────────────────────────── Params ──────────────────────────── */

export interface UseCarouselGenerationParams {
  // External dependencies
  fetch: ReturnType<typeof import('@gitroom/helpers/utils/custom.fetch').useFetch>;
  brandProfileId: string | undefined;
  generationAbortRef: React.MutableRefObject<AbortController | null>;

  // Form / config values (read-only snapshots)
  trimmedTopic: string;
  sourceUrl: string;
  sourceText: string;
  goal: string;
  audience: string;
  tone: string;
  platform: string;
  slideCount: number;
  visualStyle: string;
  brandNotes: string;
  brandName: string;
  brandColors: string;
  brandFonts: string;
  forbiddenTerms: string;
  defaultCta: string;
  trimmedTextModel: string;
  imageProvider: 'ia_generate' | 'openai_official';
  trimmedImageModel: string;
  /** Dual-mode: AI image models vs HTML design system (xniper-style) */
  renderMode: 'ai_image' | 'design_system';
  designRecipe: import('./ai-generate-images.types').DesignRecipe | null;
  designSizeId: string;
  designHandle: string;
  selectedTemplate: string;
  hasRequiredCompanySummary: boolean;
  companyProfile: CompanyProfile | null;
  companyContext: string;
  computedCreativeBrief: string;
  finalCreativeBrief: string;
  effectiveDirectionSpec: DirectionSpec;
  selectedReferences: ReferenceImage[];
  brandLogoReferences: ReferenceImage[];
  editorialIssues: Array<{ slide: number; label: string; tone: 'warning' | 'danger' }>;
  autoReviewBeforeImages: boolean;
  allowGenerateWithReviewIssues: boolean;
  isOverUserLimit: boolean;
  isOverSoftLimit: boolean;
  allowOverBudget: boolean;
  template: { label: string; instruction: string };

  // Current data state
  plan: CarouselPlan | null;
  slideImages: Record<string, SlideImageResult>;

  // Setters
  setPlan: React.Dispatch<React.SetStateAction<CarouselPlan | null>>;
  setSlideImages: React.Dispatch<React.SetStateAction<Record<string, SlideImageResult>>>;
  setPlanning: React.Dispatch<React.SetStateAction<boolean>>;
  setGeneratingImages: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setActivePreview: React.Dispatch<React.SetStateAction<number>>;
  setDirectionDirty: React.Dispatch<React.SetStateAction<boolean>>;
  setFinalCreativeBrief: React.Dispatch<React.SetStateAction<string>>;
  setSavedCarouselCount: React.Dispatch<React.SetStateAction<number>>;
  setEditorialReview: React.Dispatch<React.SetStateAction<EditorialReview | null>>;
  setReviewingEditorial: React.Dispatch<React.SetStateAction<boolean>>;
  setCorrectingEditorial: React.Dispatch<React.SetStateAction<boolean>>;
  setAllowGenerateWithReviewIssues: React.Dispatch<React.SetStateAction<boolean>>;
  setSlideHistory: React.Dispatch<React.SetStateAction<Record<string, CarouselSlide[]>>>;
  setSlideImageHistory: React.Dispatch<React.SetStateAction<Record<string, SlideImageResult[]>>>;
  setSlideLoading: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setImageJob: React.Dispatch<React.SetStateAction<CarouselImageJob | null>>;
  setSlideImageAdjustments: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  // Functions from other hooks
  buildSlidePromptFor: (slide: CarouselSlide) => string;
  loadCostHistory: () => Promise<void>;
  saveSnapshot: () => void;

  // Editorial state (read-only snapshot)
  editorialReview: EditorialReview | null;
}

/* ──────────────────────────── Return ──────────────────────────── */

export interface UseCarouselGenerationReturn {
  generatePlan: (event: FormEvent) => Promise<void>;
  generateCarouselImages: () => Promise<void>;
  generateSlideImage: (slide: CarouselSlide) => Promise<void>;
  regenerateSlideCopy: (slide: CarouselSlide, mode: string) => Promise<void>;
  reviewCarouselQuality: (silent?: boolean) => Promise<EditorialReview | null>;
  applyEditorialQuickFixes: () => void;
  fixCarouselWithAi: () => Promise<void>;
  cancelCarouselGeneration: () => void;
}

/* ──────────────────────────── Hook ──────────────────────────── */

export function useCarouselGeneration(
  params: UseCarouselGenerationParams
): UseCarouselGenerationReturn {
  const {
    fetch,
    brandProfileId,
    generationAbortRef,
    trimmedTopic,
    sourceUrl,
    sourceText,
    goal,
    audience,
    tone,
    platform,
    slideCount,
    visualStyle,
    brandNotes,
    brandName,
    brandColors,
    brandFonts,
    forbiddenTerms,
    defaultCta,
    trimmedTextModel,
    imageProvider,
    trimmedImageModel,
    renderMode,
    designRecipe,
    designSizeId,
    designHandle,
    selectedTemplate,
    hasRequiredCompanySummary,
    companyProfile,
    companyContext,
    computedCreativeBrief,
    finalCreativeBrief,
    effectiveDirectionSpec,
    selectedReferences,
    brandLogoReferences,
    editorialIssues,
    autoReviewBeforeImages,
    allowGenerateWithReviewIssues,
    isOverUserLimit,
    isOverSoftLimit,
    allowOverBudget,
    template,
    plan,
    slideImages,
    setPlan,
    setSlideImages,
    setPlanning,
    setGeneratingImages,
    setError,
    setActivePreview,
    setDirectionDirty,
    setFinalCreativeBrief,
    setSavedCarouselCount,
    setEditorialReview,
    setReviewingEditorial,
    setCorrectingEditorial,
    setAllowGenerateWithReviewIssues,
    setSlideHistory,
    setSlideImageHistory,
    setSlideLoading,
    setImageJob,
    setSlideImageAdjustments,
    buildSlidePromptFor,
    loadCostHistory,
    saveSnapshot,
    editorialReview,
  } = params;

  /* ─────────────── Image job polling ─────────────── */

  const imageJobRef = useRef(params.plan);
  imageJobRef.current = params.plan;

  // Note: The imageJob polling effect uses plan's slides array and several
  // setters. We expose the imageJob state via the parent; the parent sets
  // imageJob and we react to it. The actual polling effect remains in the
  // main hook because it needs to react to imageJob state changes there.

  /* ─────────────── Generate plan ─────────────── */

  const generatePlan = async (event: FormEvent) => {
    event.preventDefault();

    if (!trimmedTopic && !sourceUrl.trim() && !sourceText.trim()) {
      setError('Digite o tema, ou cole um link/texto de origem.');
      return;
    }

    if (!hasRequiredCompanySummary) {
      setError(
        'Selecione uma empresa com resumo obrigatório antes de gerar o carrossel.'
      );
      return;
    }

    setPlanning(true);
    setError('');
    setPlan(null);
    setSlideImages({});
    setSlideImageAdjustments({});
    setSavedCarouselCount(0);
    setActivePreview(0);
    // Novo carrossel: volta a seguir a direção sugerida pela estratégia.
    setDirectionDirty(false);

    try {
      const brandBrief = buildLimitedBrief([
        template.instruction,
        brandName.trim() && `Marca: ${brandName.trim()}.`,
        brandColors.trim() && `Cores da marca: ${brandColors.trim()}.`,
        brandFonts.trim() &&
          `Fontes/direção tipográfica: ${brandFonts.trim()}.`,
        defaultCta.trim() && `CTA padrão: ${defaultCta.trim()}.`,
        forbiddenTerms.trim() && `Evitar termos: ${forbiddenTerms.trim()}.`,
        companyContext &&
          `Contexto da empresa para orientar a copy:\n${companyContext}`,
        brandNotes.trim(),
      ]);

      const { ok, data, message } = await aiGenerateImagesApi.generateCarouselPlan(
        fetch,
        {
          topic: trimmedTopic || undefined,
          sourceUrl: sourceUrl.trim() || undefined,
          sourceText: sourceText.trim() || undefined,
          goal: goal.trim(),
          audience: audience.trim(),
          tone: tone.trim(),
          platform,
          slideCount: Math.min(
            MAX_CAROUSEL_SLIDES,
            Math.max(MIN_CAROUSEL_SLIDES, slideCount)
          ),
          visualStyle: visualStyle.trim(),
          brandNotes: brandBrief,
          language: 'pt-BR',
          textModel: trimmedTextModel,
          templateId: selectedTemplate,
          brandProfileId,
        }
      );

      if (!ok || !data) {
        setError(
          message || 'Não foi possível gerar o carrossel.'
        );
        return;
      }

      const nextPlan = { ...data, slides: ensureSlideIds(data.slides) };
      setPlan(nextPlan);
      // Restore persisted editorial review if available
      try {
        const reviewKey = `editorial-review-${nextPlan.title || 'untitled'}`;
        const savedReview = localStorage.getItem(reviewKey);
        if (savedReview) {
          setEditorialReview(JSON.parse(savedReview));
        }
      } catch { /* ignore */ }
      trackTemplateUsage(fetch, selectedTemplate, 'generate').catch(() => {});
      setFinalCreativeBrief(
        buildLimitedBrief(
          [
            computedCreativeBrief,
            nextPlan.imageStyleGuide &&
              `Guia visual gerado pela IA para este carrossel: ${nextPlan.imageStyleGuide}`,
          ],
          2600
        )
      );
    } catch (err) {
      setError('Não foi possível conectar ao servidor do ContentFlow.');
    } finally {
      setPlanning(false);
    }
  };

  /* ─────────────── Review quality ─────────────── */

  const reviewCarouselQuality = async (silent = false) => {
    if (!plan) {
      return null;
    }

    setReviewingEditorial(true);
    if (!silent) {
      setError('');
    }

    try {
      const { ok, data, message } = await aiGenerateImagesApi.reviewCarousel(
        fetch,
        {
          topic: trimmedTopic || plan.title,
          textModel: trimmedTextModel,
          reviewPayload: JSON.stringify({
            companyContext,
            creativeBrief: finalCreativeBrief || computedCreativeBrief,
            plan,
            editorialIssues,
          }),
        }
      );
      if (!ok || !data) {
        if (!silent) {
          setError(message || 'Não foi possível revisar.');
        }
        return null;
      }
      const review = data;
      setEditorialReview(review);
      // Persist review to localStorage for recovery
      try {
        const reviewKey = `editorial-review-${plan.title || 'untitled'}`;
        localStorage.setItem(reviewKey, JSON.stringify(review));
      } catch { /* ignore localStorage errors */ }
      return review;
    } catch (err) {
      if (!silent) {
        setError('Não foi possível conectar ao revisor editorial.');
      }
      return null;
    } finally {
      setReviewingEditorial(false);
    }
  };

  /* ─────────────── Apply editorial quick fixes ─────────────── */

  const applyEditorialQuickFixes = () => {
    if (!plan || !editorialReview?.issues?.length) {
      return;
    }

    const issuesBySlide = new Map<number, string[]>();
    editorialReview.issues.forEach((issue) => {
      if (!issue.slide) {
        return;
      }

      const current = issuesBySlide.get(issue.slide) || [];
      current.push(issue.suggestion || issue.issue);
      issuesBySlide.set(issue.slide, current);
    });

    setSlideHistory((current) => {
      const next = { ...current };
      plan.slides.forEach((slide) => {
        if (issuesBySlide.has(slide.index)) {
          next[slide.id] = [...(next[slide.id] || []), slide].slice(-6);
        }
      });
      return next;
    });

    setPlan((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        slides: current.slides.map((slide) => {
          const suggestions = issuesBySlide.get(slide.index);
          if (!suggestions?.length) {
            return slide;
          }

          return {
            ...slide,
            headline: compactText(slide.headline, 78),
            body: compactText(slide.body, 140),
            imagePrompt: compactText(
              [
                slide.imagePrompt,
                `Ajuste editorial automatico: ${suggestions.join(' ')}`,
                'Priorize legibilidade, menos elementos competindo com o texto, respiro, contraste alto e uma função clara para este slide.',
              ].join('\n'),
              900
            ),
          };
        }),
      };
    });
    setSlideImages({});
    setSavedCarouselCount(0);
    setError('');
  };

  /* ─────────────── Fix carousel with AI ─────────────── */

  const fixCarouselWithAi = async () => {
    if (!plan) {
      return;
    }

    const review = editorialReview || (await reviewCarouselQuality(true));
    if (!review) {
      setError('Rode a crítica editorial antes de corrigir os slides.');
      return;
    }

    setCorrectingEditorial(true);
    setError('');

    try {
      const { ok, data, message } = await aiGenerateImagesApi.fixCarousel(
        fetch,
        {
          topic: trimmedTopic || plan.title,
          goal,
          audience,
          tone,
          platform,
          slideCount: plan.slides.length,
          visualStyle,
          brandNotes: buildLimitedBrief([
            companyContext && `Contexto da empresa:\n${companyContext}`,
            finalCreativeBrief || computedCreativeBrief,
          ]),
          language: 'pt-BR',
          textModel: trimmedTextModel,
          reviewPayload: JSON.stringify({
            companyContext,
            creativeBrief: finalCreativeBrief || computedCreativeBrief,
            review,
            plan,
            localEditorialIssues: editorialIssues,
          }),
        }
      );

      if (!ok || !data?.slides?.length) {
        setError(
          message || 'Não foi possível corrigir os slides.'
        );
        return;
      }

      setSlideHistory((current) => {
        const next = { ...current };
        plan.slides.forEach((slide) => {
          next[slide.id] = [...(next[slide.id] || []), slide].slice(-8);
        });
        return next;
      });
      setPlan({ ...data, slides: ensureSlideIds(data.slides) });
      setFinalCreativeBrief(
        buildLimitedBrief([
          finalCreativeBrief || computedCreativeBrief,
          data.imageStyleGuide &&
            `Guia visual revisado pela correção editorial: ${data.imageStyleGuide}`,
          Array.isArray(data.fixSummary) &&
            `Correções aplicadas: ${data.fixSummary.join('; ')}`,
        ])
      );
      setSlideImages({});
      setSavedCarouselCount(0);
      setEditorialReview(null);
      await loadCostHistory();
    } catch (err) {
      setError('Não foi possível conectar ao corretor editorial.');
    } finally {
      setCorrectingEditorial(false);
    }
  };

  /* ─────────────── Generate carousel images ─────────────── */

  const generateCarouselImages = async () => {
    if (!plan?.slides?.length) {
      setError('Gere ou importe um plano de carrossel antes de criar imagens.');
      return;
    }

    if (!trimmedImageModel) {
      setError('Informe o modelo de imagem nas opções avançadas.');
      return;
    }

    const incompleteSlide = plan.slides.find(
      (slide) => !slide.headline.trim() || !slide.imagePrompt.trim()
    );
    if (incompleteSlide) {
      setError(
        `Complete o título e o prompt visual do slide ${incompleteSlide.index} antes de gerar imagens.`
      );
      return;
    }

    if ((isOverUserLimit || isOverSoftLimit) && !allowOverBudget) {
      setError(
        'A estimativa de custo ultrapassa o limite configurado. Ajuste o limite ou marque "gerar mesmo assim".'
      );
      return;
    }

    // Auto-review gate: block image generation when editorial issues exist
    if (
      autoReviewBeforeImages &&
      editorialIssues.length > 0 &&
      !allowGenerateWithReviewIssues
    ) {
      setError(
        `Existem ${editorialIssues.length} problema${editorialIssues.length !== 1 ? 's' : ''} editorial${editorialIssues.length !== 1 ? 'is' : ''} não resolvido${editorialIssues.length !== 1 ? 's' : ''}. Resolva os problemas ou marque "gerar mesmo assim" para continuar.`
      );
      return;
    }

    // Auto-review gate: block when editorial score is below 60
    if (
      autoReviewBeforeImages &&
      editorialReview &&
      editorialReview.score < 60 &&
      !allowGenerateWithReviewIssues
    ) {
      setError(
        `A nota editorial é ${editorialReview.score}/100, inferior ao mínimo de 60. Corrija os problemas ou marque "gerar mesmo assim" para continuar.`
      );
      return;
    }

    setGeneratingImages(true);
    setError('');
    setImageJob(null);
    setSlideImageHistory((current) => {
      const next = { ...current };
      Object.entries(slideImages).forEach(([slideId, result]) => {
        if (result?.image) {
          next[slideId] = [...(next[slideId] || []), result].slice(-6);
        }
      });
      return next;
    });
    setSlideImages(
      plan.slides.reduce<Record<string, SlideImageResult>>((acc, slide) => {
        acc[slide.id] = {};
        return acc;
      }, {})
    );
    setSavedCarouselCount(0);

    try {
      if (renderMode === 'design_system') {
        const brandColorList = brandColors
          .split(/[,\n]/)
          .map((c) => c.trim())
          .filter(Boolean);

        const { ok, data, message } = await aiGenerateImagesApi.createDesignJob(
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
            query: [trimmedTopic, plan.title, goal].filter(Boolean).join(' — '),
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

        if (!ok || !data) {
          setError(
            message || 'Não foi possível iniciar o render do design system.'
          );
          setGeneratingImages(false);
          return;
        }

        setImageJob(data);
        return;
      }

      const slides = plan.slides.map((slide) => {
        const requestBody: Record<string, unknown> = {
          provider: imageProvider,
          prompt: buildSlidePromptFor(slide),
          model: trimmedImageModel,
          n: 1,
          brandProfileId,
        };

        if (imageProvider === 'ia_generate') {
          requestBody.response_format = 'b64_json';
        }

        return {
          slideIndex: slide.index,
          request: requestBody,
        };
      });

      const { ok, data, message } = await aiGenerateImagesApi.createImageJob(
        fetch,
        slides
      );

      if (!ok || !data) {
        setError(
          message || 'Não foi possível iniciar a fila de imagens.'
        );
        setGeneratingImages(false);
        return;
      }

      setImageJob(data);
    } catch (err) {
      setError('Não foi possível conectar ao servidor para iniciar a fila.');
      setGeneratingImages(false);
    }
  };

  /* ─────────────── Cancel generation ─────────────── */

  const cancelCarouselGeneration = () => {
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
    setImageJob((current) =>
      current && ['queued', 'running'].includes(current.status)
        ? { ...current, status: 'failed' }
        : current
    );
    setGeneratingImages(false);
  };

  /* ─────────────── Generate single slide image ─────────────── */

  const generateSlideImage = async (slide: CarouselSlide) => {
    if (!plan) {
      return;
    }

    setSlideLoading((current) => ({ ...current, [slide.id]: 'imagem' }));
    setSlideImages((current) => ({ ...current, [slide.id]: {} }));
    setSavedCarouselCount(0);

    try {
      const requestBody: Record<string, unknown> = {
        provider: imageProvider,
        prompt: buildSlidePromptFor(slide),
        model: trimmedImageModel,
        n: 1,
        brandProfileId,
      };

      if (imageProvider === 'ia_generate') {
        requestBody.response_format = 'b64_json';
      }

      const { ok, data, message } = await aiGenerateImagesApi.generateImage(
        fetch,
        requestBody
      );

      if (!ok || !data) {
        setSlideImages((current) => ({
          ...current,
          [slide.id]: {
            error: message || 'Falha ao gerar imagem.',
          },
        }));
        return;
      }

      const result = data;
      setSlideImageHistory((current) => {
        const previous = slideImages[slide.id];
        if (!previous?.image) {
          return current;
        }
        return {
          ...current,
          [slide.id]: [...(current[slide.id] || []), previous].slice(-6),
        };
      });
      setSlideImages((current) => ({
        ...current,
        [slide.id]: {
          image: result.images?.[0],
          cost_estimate: result.cost_estimate,
        },
      }));
      await loadCostHistory();
    } catch (err) {
      setSlideImages((current) => ({
        ...current,
        [slide.id]: { error: 'Não foi possível conectar ao servidor.' },
      }));
    } finally {
      setSlideLoading((current) => ({ ...current, [slide.id]: '' }));
    }
  };

  /* ─────────────── Regenerate slide copy ─────────────── */

  const regenerateSlideCopy = async (slide: CarouselSlide, mode: string) => {
    if (!plan) {
      return;
    }

    saveSnapshot();
    setSlideLoading((current) => ({ ...current, [slide.id]: mode }));

    try {
      const { ok, data, message } = await aiGenerateImagesApi.generateCarouselPlan(
        fetch,
        {
          topic: `${trimmedTopic}. Reescreva apenas um slide do carrossel. Slide atual: ${slide.headline} ${slide.body}. Modo: ${mode}.`,
          goal,
          audience,
          tone:
            mode === 'premium'
              ? 'especialista, direto e premium'
              : mode === 'provocativo'
              ? 'leve, divertido e provocativo'
              : tone,
          platform,
          slideCount: 2,
          visualStyle,
          brandNotes: buildLimitedBrief([
            `Mantenha o papel do slide ${slide.index} dentro do carrossel "${plan.title}".`,
            'Retorne a melhor versão como primeiro slide.',
            mode === 'direto' &&
              'Deixe a copy mais curta, objetiva e escaneável.',
            mode === 'premium' &&
              'Deixe a copy mais sofisticada, estratégica e madura.',
            mode === 'provocativo' &&
              'Deixe a copy mais provocativa, sem exageros e sem promessas falsas.',
            mode === 'estilo' &&
              'Mantenha a copy e varie principalmente a direção visual.',
            mode === 'marca' &&
              'Deixe o slide mais fiel ao Brand Kit, identidade visual, tom de voz e posicionamento da empresa.',
            mode === 'inspiracao' &&
              'Mantenha a copy, mas aproxime a direção visual das inspirações selecionadas, sem copiar elementos protegidos.',
            mode === 'menos-inspiracao' &&
              'Afaste a direção visual das inspirações selecionadas e priorize a identidade visual própria da marca.',
            mode === 'espaco-texto' &&
              'Aumente o espaço negativo e reduza a complexidade visual para melhorar a leitura do texto dentro da imagem.',
            mode === 'metafora' &&
              'Troque principalmente a metáfora visual do slide, mantendo a função editorial e a copy.',
            mode === 'manter-layout' &&
              'Mantenha a estrutura e hierarquia do layout, alterando apenas detalhes de imagem, objeto ou atmosfera.',
            brandName.trim() && `Marca: ${brandName.trim()}.`,
            forbiddenTerms.trim() && `Evitar termos: ${forbiddenTerms.trim()}.`,
            companyContext && `Contexto da empresa:\n${companyContext}`,
            (finalCreativeBrief || computedCreativeBrief) &&
              `Direção criativa final:\n${finalCreativeBrief || computedCreativeBrief}`,
          ]),
          language: 'pt-BR',
          textModel: trimmedTextModel,
        }
      );

      if (!ok || !data?.slides?.[0]) {
        setError(
          message || 'Não foi possível regenerar o slide.'
        );
        return;
      }

      const nextSlide = data.slides[0];
      setSlideHistory((current) => ({
        ...current,
        [slide.id]: [...(current[slide.id] || []), slide].slice(-6),
      }));
      setPlan((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          slides: current.slides.map((item) =>
            item.id === slide.id
              ? {
                  ...item,
                  headline: nextSlide.headline || item.headline,
                  body: nextSlide.body || item.body,
                  cta: nextSlide.cta || item.cta,
                  imagePrompt: nextSlide.imagePrompt || item.imagePrompt,
                  altText: nextSlide.altText || item.altText,
                }
              : item
          ),
        };
      });
      setSlideImages((current) => ({ ...current, [slide.id]: {} }));
      setSavedCarouselCount(0);
    } catch (err) {
      setError('Não foi possível conectar ao servidor do ContentFlow.');
    } finally {
      setSlideLoading((current) => ({ ...current, [slide.id]: '' }));
    }
  };

  return {
    generatePlan,
    generateCarouselImages,
    generateSlideImage,
    regenerateSlideCopy,
    reviewCarouselQuality,
    applyEditorialQuickFixes,
    fixCarouselWithAi,
    cancelCarouselGeneration,
  };
}
