'use client';

import { useCallback } from 'react';
import type {
  CarouselPlan,
  CompanyProfile,
  CostEstimate,
  CostHistoryResponse,
  EditorialReview,
  ReferenceImage,
  SlideImageResult,
} from './ai-generate-images.types';
import {
  blobToBytes,
  buildLimitedBrief,
  compactText,
  createPdfBlob,
  createZipBlob,
  downloadBlob,
  imagePayload,
  imageSrc,
  imageToCanvas,
  canvasToBlob,
  slugifyFileName,
} from './ai-generate-images.utils';
import { aiGenerateImagesApi } from './ai-generate-images.api';
import type { DirectionSpec } from './direction-compiler';

/* ──────────────────────────── Params ──────────────────────────── */

export interface UseCarouselExportParams {
  fetch: ReturnType<typeof import('@gitroom/helpers/utils/custom.fetch').useFetch>;

  // Current data
  plan: CarouselPlan | null;
  slideImages: Record<string, SlideImageResult>;
  selectedReferences: ReferenceImage[];
  slideHistory: Record<string, unknown>;
  slideImageHistory: Record<string, unknown>;

  // Form / config values
  trimmedTopic: string;
  selectedTemplate: string;
  goal: string;
  audience: string;
  tone: string;
  platform: string;
  slideCount: number;
  visualStyle: string;
  brandNotes: string;
  trimmedTextModel: string;
  imageProvider: 'ia_generate' | 'openai_official';
  trimmedImageModel: string;
  effectiveDirectionSpec: DirectionSpec;
  companyProfile: CompanyProfile | null;
  computedCreativeBrief: string;
  finalCreativeBrief: string;
  costLimitBrl: number;
  allowOverBudget: boolean;
  preflightEstimate: CostEstimate | null;
  costHistory: CostHistoryResponse | null;
  totalCost: { usd: number; brl: number; tokens: number };
  logoUsage: string;
  logoPosition: string;
  logoScale: string;
  selectedLogoReferenceId: string;
  selectedLogoReference: ReferenceImage | null;
  editorialReview: EditorialReview | null;
  autoReviewBeforeImages: boolean;

  // Export settings
  exportWidth: number;
  exportHeight: number;
  includePdfExport: boolean;

  // Setters
  setSavingCarousel: React.Dispatch<React.SetStateAction<boolean>>;
  setSavedCarouselCount: React.Dispatch<React.SetStateAction<number>>;
  setSavedCarouselProject: React.Dispatch<React.SetStateAction<string>>;
  setSavedCarouselProjectId: React.Dispatch<React.SetStateAction<string>>;
  setExportingPackage: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string>>;

  // Derived values
  canSaveCarousel: boolean;
}

/* ──────────────────────────── Return ──────────────────────────── */

export interface UseCarouselExportReturn {
  saveCarouselToMedia: () => Promise<void>;
  exportCarouselPackage: () => Promise<void>;
  exportSingleSlide: (slideId: string) => Promise<void>;
}

/* ──────────────────────────── Hook ──────────────────────────── */

export function useCarouselExport(
  params: UseCarouselExportParams
): UseCarouselExportReturn {
  const {
    fetch,
    plan,
    slideImages,
    selectedReferences,
    slideHistory,
    slideImageHistory,
    trimmedTopic,
    selectedTemplate,
    goal,
    audience,
    tone,
    platform,
    slideCount,
    visualStyle,
    brandNotes,
    trimmedTextModel,
    imageProvider,
    trimmedImageModel,
    effectiveDirectionSpec,
    companyProfile,
    computedCreativeBrief,
    finalCreativeBrief,
    costLimitBrl,
    allowOverBudget,
    preflightEstimate,
    costHistory,
    totalCost,
    logoUsage,
    logoPosition,
    logoScale,
    selectedLogoReferenceId,
    selectedLogoReference,
    editorialReview,
    autoReviewBeforeImages,
    exportWidth,
    exportHeight,
    includePdfExport,
    setSavingCarousel,
    setSavedCarouselCount,
    setSavedCarouselProject,
    setSavedCarouselProjectId,
    setExportingPackage,
    setError,
    canSaveCarousel,
  } = params;

  /* ─────────────── Export single slide ─────────────── */

  const exportSingleSlide = async (slideId: string) => {
    if (!plan) return;
    const slide = plan.slides.find((s) => s.id === slideId);
    if (!slide) return;

    const result = slideImages[slide.id];
    const image = imageSrc(result?.image);
    if (!image) {
      setError('Este slide não possui imagem gerada.');
      return;
    }

    try {
      const canvas = await imageToCanvas(image, exportWidth, exportHeight);
      const pngBlob = await canvasToBlob(canvas, 'image/png');
      const fileName = `${String(slide.index).padStart(2, '0')}-${slugifyFileName(slide.headline || 'slide')}.png`;
      downloadBlob(pngBlob, fileName);
    } catch {
      setError('Não foi possível exportar este slide.');
    }
  };

  /* ─────────────── Export carousel package ─────────────── */

  const exportCarouselPackage = async () => {
    if (!plan) {
      return;
    }

    setExportingPackage(true);
    try {
      const encoder = new TextEncoder();
      const baseName = slugifyFileName(
        `${companyProfile?.companyName || 'marca'}-${plan.title || trimmedTopic || 'carrossel'}`
      );
      const dimensionsLabel = `${exportWidth}x${exportHeight}`;
      const files: Array<{ name: string; data: Uint8Array }> = [
        {
          name: `${baseName}/brief-criativo.txt`,
          data: encoder.encode(finalCreativeBrief || computedCreativeBrief),
        },
        {
          name: `${baseName}/legenda-${platform}.txt`,
          data: encoder.encode(
            [plan.caption, '', ...(plan.hashtags || [])].filter(Boolean).join('\n')
          ),
        },
        {
          name: `${baseName}/LEIA-ME.txt`,
          data: encoder.encode(
            [
              `Projeto: ${plan.title}`,
              `Empresa: ${companyProfile?.companyName || 'Sem empresa'}`,
              `Plataforma: ${platform}`,
              `Dimensões exportadas: ${dimensionsLabel}`,
              `Slides: ${plan.slides.length}`,
              '',
              'Arquivos:',
              '- slides-png/: imagens prontas em PNG na dimensão selecionada',
              '- carrossel.pdf: PDF com uma página por slide',
              '- legenda-*.txt: legenda e hashtags',
              '- projeto.json: dados editáveis do projeto',
            ].join('\n')
          ),
        },
        {
          name: `${baseName}/projeto.json`,
          data: encoder.encode(
            JSON.stringify(
              {
                topic: trimmedTopic,
                template: selectedTemplate,
                goal,
                audience,
                tone,
                platform,
                slideCount,
                visualStyle,
                brandNotes,
                company: companyProfile,
                plan,
                creativeBrief: finalCreativeBrief || computedCreativeBrief,
                selectedReferences: selectedReferences.map((reference) => ({
                  id: reference.id,
                  name: reference.name,
                  source: reference.source,
                  favorite: reference.favorite,
                })),
                logo: {
                  usage: logoUsage,
                  position: logoPosition,
                  scale: logoScale,
                  referenceId: selectedLogoReferenceId,
                  referenceName: selectedLogoReference?.name || '',
                },
                generation: {
                  textModel: trimmedTextModel,
                  imageProvider,
                  imageModel: trimmedImageModel,
                  totalCost,
                },
                history: {
                  slideHistory,
                  slideImageHistory,
                },
                costControls: {
                  limitBrl: costLimitBrl,
                  allowOverBudget,
                  preflightEstimate,
                  costHistorySnapshot: costHistory
                    ? {
                        totals: costHistory.totals,
                        entries: costHistory.entries.slice(0, 20),
                      }
                    : null,
                },
                costs: totalCost,
                export: {
                  width: exportWidth,
                  height: exportHeight,
                  platform,
                },
                editorialReview,
                autoReviewBeforeImages,
                slideImages: plan.slides.map((slide) => ({
                  index: slide.index,
                  file: `slides-png/${String(slide.index).padStart(2, '0')}-${slugifyFileName(slide.headline)}.png`,
                  cost_estimate: slideImages[slide.id]?.cost_estimate,
                })),
              },
              null,
              2
            )
          ),
        },
      ];

      const pdfPages: Array<{ jpeg: Uint8Array; width: number; height: number }> = [];

      await Promise.all(plan.slides.map(async (slide) => {
        const image = imageSrc(slideImages[slide.id]?.image);
        if (!image) {
          return;
        }

        const canvas = await imageToCanvas(image, exportWidth, exportHeight);
        const pngBlob = await canvasToBlob(canvas, 'image/png');
        files.push({
          name: `${baseName}/slides-png/${String(slide.index).padStart(2, '0')}-${slugifyFileName(slide.headline)}.png`,
          data: await blobToBytes(pngBlob),
        });

        if (includePdfExport) {
          const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
          pdfPages[slide.index - 1] = {
            jpeg: await blobToBytes(jpegBlob),
            width: exportWidth,
            height: exportHeight,
          };
        }
      }));

      if (includePdfExport && pdfPages.filter(Boolean).length) {
        files.push({
          name: `${baseName}/carrossel-${platform}-${dimensionsLabel}.pdf`,
          data: await blobToBytes(createPdfBlob(pdfPages.filter(Boolean))),
        });
      }

      downloadBlob(
        createZipBlob(files),
        `${baseName}-${platform}-${dimensionsLabel}-contentflow.zip`
      );
    } catch (err) {
      setError('Não foi possível exportar o pacote do carrossel.');
    } finally {
      setExportingPackage(false);
    }
  };

  /* ─────────────── Save carousel to media ─────────────── */

  const saveCarouselToMedia = async () => {
    if (!plan || !canSaveCarousel) {
      return;
    }

    setSavingCarousel(true);
    setError('');
    setSavedCarouselProject('');

    try {
      const metaText = (value: string | undefined, maxLength: number) =>
        value ? compactText(value, maxLength) : value;
      const projectMetadata = {
        kind: 'contentflow_ai_carousel_project',
        version: 1,
        savedAt: new Date().toISOString(),
        topic: trimmedTopic,
        template: selectedTemplate,
        goal,
        audience,
        tone,
        platform,
        slideCount,
        visualStyle,
        directionSpec: effectiveDirectionSpec,
        brandNotes: metaText(brandNotes, 900),
        company: companyProfile
          ? {
              id: companyProfile.id,
              name: companyProfile.companyName,
              website: companyProfile.website,
              summary: metaText(companyProfile.summary, 900),
              visualIdentitySummary: metaText(
                companyProfile.visualIdentitySummary,
                900
              ),
              brandColors: companyProfile.brandColors,
              brandFonts: companyProfile.brandFonts,
              defaultCta: companyProfile.defaultCta,
              forbiddenTerms: companyProfile.forbiddenTerms,
              contentPreferences: metaText(
                companyProfile.contentPreferences,
                700
              ),
            }
          : null,
        creativeBrief: metaText(
          finalCreativeBrief || computedCreativeBrief,
          1800
        ),
        selectedReferences: selectedReferences.map((reference) => ({
          id: reference.id,
          name: reference.name,
          source: reference.source,
          favorite: reference.favorite,
        })),
        logo: {
          usage: logoUsage,
          position: logoPosition,
          scale: logoScale,
          referenceId: selectedLogoReferenceId,
          referenceName: selectedLogoReference?.name || '',
        },
        editorialReview,
        autoReviewBeforeImages,
        plan: {
          title: plan.title,
          caption: metaText(plan.caption, 1200),
          hashtags: plan.hashtags,
          imageStyleGuide: metaText(plan.imageStyleGuide, 700),
          provider: plan.provider,
          model: plan.model,
          cost_estimate: plan.cost_estimate,
          slides: plan.slides.map((slide) => ({
            index: slide.index,
            headline: metaText(slide.headline, 180),
            body: metaText(slide.body, 400),
            cta: metaText(slide.cta, 160),
            imagePrompt: metaText(slide.imagePrompt, 600),
            altText: metaText(slide.altText, 300),
            imageMediaId: slideImages[slide.id]?.image?.mediaId,
            imageCostEstimate: slideImages[slide.id]?.cost_estimate,
          })),
        },
        generation: {
          textModel: trimmedTextModel,
          imageProvider,
          imageModel: trimmedImageModel,
          totalCost,
        },
        history: {
          slideHistory,
          slideImageHistory,
        },
        costControls: {
          limitBrl: costLimitBrl,
          allowOverBudget,
          preflightEstimate,
          costHistorySnapshot: costHistory
            ? {
                totals: costHistory.totals,
                entries: costHistory.entries.slice(0, 20),
              }
            : null,
        },
      };
      const projectMetadataJson = JSON.stringify(projectMetadata);
      const safeProjectMetadata =
        projectMetadataJson.length <= 11_500
          ? projectMetadataJson
          : JSON.stringify({
              ...projectMetadata,
              company: projectMetadata.company
                ? {
                    id: projectMetadata.company.id,
                    name: projectMetadata.company.name,
                    website: projectMetadata.company.website,
                    brandColors: projectMetadata.company.brandColors,
                    brandFonts: projectMetadata.company.brandFonts,
                    defaultCta: projectMetadata.company.defaultCta,
                  }
                : null,
              creativeBrief: metaText(projectMetadata.creativeBrief, 900),
              brandNotes: metaText(projectMetadata.brandNotes, 500),
              history: {
                slideHistory: Object.fromEntries(
                  Object.entries(slideHistory as Record<string, any[]>).map(([slideIndex, versions]) => [
                    slideIndex,
                    versions.slice(-3).map((version) => ({
                      index: version.index,
                      headline: metaText(version.headline, 140),
                      body: metaText(version.body, 180),
                      cta: metaText(version.cta, 120),
                      imagePrompt: metaText(version.imagePrompt, 240),
                      altText: metaText(version.altText, 160),
                    })),
                  ])
                ),
                slideImageHistory: Object.fromEntries(
                  Object.entries(slideImageHistory as Record<string, any[]>).map(([slideIndex, versions]) => [
                    slideIndex,
                    versions.slice(-3).map((version) => ({
                      image: version.image
                        ? {
                            url: version.image.url,
                            mediaId: version.image.mediaId,
                            revised_prompt: metaText(
                              version.image.revised_prompt,
                              180
                            ),
                          }
                        : undefined,
                      cost_estimate: version.cost_estimate,
                      error: version.error,
                    })),
                  ])
                ),
              },
              plan: {
                ...projectMetadata.plan,
                caption: metaText(projectMetadata.plan.caption, 500),
                imageStyleGuide: metaText(
                  projectMetadata.plan.imageStyleGuide,
                  400
                ),
                slides: projectMetadata.plan.slides.map((slide) => ({
                  index: slide.index,
                  headline: slide.headline,
                  body: metaText(slide.body, 180),
                  cta: slide.cta,
                  imageMediaId: slide.imageMediaId,
                })),
              },
            });

      const { ok, data, message } = await aiGenerateImagesApi.saveCarousel(
        fetch,
        {
          title: plan.title || trimmedTopic || 'Carrossel gerado por IA',
          projectMetadata: safeProjectMetadata,
          images: plan.slides.map((slide) => ({
            index: slide.index,
            image: imagePayload(slideImages[slide.id]?.image),
            mediaId: slideImages[slide.id]?.image?.mediaId,
            alt: slide.altText || slide.headline,
          })),
        }
      );

      if (!ok) {
        setError(
          message || 'Não foi possível salvar o carrossel na mídia.'
        );
        return;
      }

      setSavedCarouselCount(
        Array.isArray(data) ? data.length : plan.slides.length
      );
      setSavedCarouselProject(plan.title || trimmedTopic || 'Carrossel salvo');
      if (Array.isArray(data) && data.length > 0 && data[0]?.id) {
        setSavedCarouselProjectId(String(data[0].id));
      }
    } catch (err) {
      setError(
        'Não foi possível conectar ao servidor para salvar o carrossel.'
      );
    } finally {
      setSavingCarousel(false);
    }
  };

  return {
    saveCarouselToMedia,
    exportCarouselPackage,
    exportSingleSlide,
  };
}
