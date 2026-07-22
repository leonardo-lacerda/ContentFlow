'use client';

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useSelectedBrand } from '@gitroom/frontend/components/brand-dna/brand-dna.hooks';

import type {
  CarouselIdea,
  CarouselImageJob,
  CarouselPlan,
  CarouselSlide,
  CompanyIdea,
  CompanyInspiration,
  CompanyProfile,
  CostEstimate,
  CostHistoryResponse,
  EditorialReview,
  ReferenceImage,
  SavedAiProject,
  SlideImageResult,
  StyleReference,
  VisualDirectionMode,
} from './ai-generate-images.types';
import {
  MAX_CAROUSEL_SLIDES,
  MIN_CAROUSEL_SLIDES,
  REFERENCE_PAGE_SIZE,
  carouselTemplates,
  defaultVisualStyle,
} from './ai-generate-images.constants';
import { defaultVisualPresets } from './ai-generate-images.presets';
import {
  buildDirectionRenderSpec,
  buildDirectionSpec,
  defaultDirectionSpec,
  normalizeDirectionSpec,
} from './direction-compiler';
import type { DirectionAxisKey, DirectionSpec } from './direction-compiler';
import {
  buildLimitedBrief,
  buildSlideImagePrompt,
  companyBrandReferences,
  getEditorialIssues,
  imagePayload,
  inferReferenceCategory,
  sumCosts,
} from './ai-generate-images.utils';
import { aiGenerateImagesApi } from './ai-generate-images.api';
import { fetchTemplates, fetchRecommendations, trackTemplateUsage } from './template-registry';
import type { BackendTemplateDefinition, TemplateRecommendation } from './template-registry.types';

// ── Sub-hooks ──
import { useCarouselUndoRedo } from './use-carousel-undo-redo';
import { useCarouselSlideOps } from './use-carousel-slide-ops';
import { useCarouselReferences } from './use-carousel-references';
import { useCarouselGeneration } from './use-carousel-generation';
import { useCarouselExport } from './use-carousel-export';
import { useCarouselProjects } from './use-carousel-projects';

const normalizePlatformParam = (raw: string) => {
  const value = raw.trim().toLowerCase();
  if (!value) return '';
  if (value.includes('instagram') || value === 'ig') return 'instagram';
  if (value.includes('linkedin') || value === 'li') return 'linkedin';
  if (value === 'x' || value.includes('twitter')) return 'x';
  if (value.includes('facebook') || value === 'fb') return 'facebook';
  if (value.includes('tiktok')) return 'tiktok';
  if (value.includes('thread')) return 'threads';
  return value;
};

export function useAiGenerateImagesStudio() {
  const fetch = useFetch();
  const mediaDirectory = useMediaDirectory();
  const toaster = useToaster();
  const searchParams = useSearchParams();
  const { data: selectedBrand } = useSelectedBrand();
  const brandProfileId = selectedBrand?.id || selectedBrand?.data?.id || undefined;
  const referenceDataUrlCache = useRef(new Map<string, string>());
  const generationAbortRef = useRef<AbortController | null>(null);
  const importProjectInputRef = useRef<HTMLInputElement | null>(null);
  const ideaPrefillDoneRef = useRef(false);
  const [topic, setTopic] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(
    () => carouselTemplates?.[0]?.id || 'educational'
  );
  const [goal, setGoal] = useState('educar e gerar engajamento');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('claro, prático e persuasivo');
  const [platform, setPlatform] = useState('instagram');
  const [slideCount, setSlideCount] = useState(5);
  const [visualStyle, setVisualStyle] = useState(defaultVisualStyle);
  const [brandNotes, setBrandNotes] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandColors, setBrandColors] = useState('#FFFFFF, #111111, #0B5CFF');
  const [brandFonts, setBrandFonts] = useState(
    'Serif editorial para headlines, sans limpa para apoio'
  );
  const [forbiddenTerms, setForbiddenTerms] = useState('');
  const [defaultCta, setDefaultCta] = useState('Salve para rever depois');
  const [textModel, setTextModel] = useState('gpt-4.1-mini');
  const [imageProvider, setImageProvider] = useState<
    'ia_generate' | 'openai_official'
  >('openai_official');
  const [imageModel, setImageModel] = useState('gpt-image-2');
  const [renderMode, setRenderMode] = useState<
    import('./ai-generate-images.types').CarouselRenderMode
  >('design_system');
  const [designRecipe, setDesignRecipe] = useState<
    import('./ai-generate-images.types').DesignRecipe | null
  >(null);
  const [designSizeId, setDesignSizeId] = useState('ig-portrait');
  const [designHandle, setDesignHandle] = useState('');
  const [designCatalogEnabled, setDesignCatalogEnabled] = useState(true);
  const [planning, setPlanning] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<CarouselPlan | null>(null);
  const [slideImages, setSlideImages] = useState<
    Record<string, SlideImageResult>
  >({});
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [referenceDisplayLimit, setReferenceDisplayLimit] =
    useState(REFERENCE_PAGE_SIZE);
  const [referenceCategoryFilter, setReferenceCategoryFilter] = useState('todas');
  const [savingReferenceLibrary, setSavingReferenceLibrary] = useState('');
  const [savingBrandDefaults, setSavingBrandDefaults] = useState(false);
  const [globalReferencesLoaded, setGlobalReferencesLoaded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activePreview, setActivePreview] = useState(0);
  const [slideLoading, setSlideLoading] = useState<Record<string, string>>({});
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [savingCarousel, setSavingCarousel] = useState(false);
  const [savedCarouselCount, setSavedCarouselCount] = useState(0);
  const [savedCarouselProject, setSavedCarouselProject] = useState('');
  const [savedCarouselProjectId, setSavedCarouselProjectId] = useState('');
  const [savedProjects, setSavedProjects] = useState<SavedAiProject[]>([]);
  const [loadingSavedProjects, setLoadingSavedProjects] = useState(false);
  const [exportingPackage, setExportingPackage] = useState(false);
  const [exportWidth, setExportWidth] = useState(1080);
  const [exportHeight, setExportHeight] = useState(1080);
  const [includePdfExport, setIncludePdfExport] = useState(true);
  const [imageJob, setImageJob] = useState<CarouselImageJob | null>(null);
  const [editorialReview, setEditorialReview] =
    useState<EditorialReview | null>(null);
  const [reviewingEditorial, setReviewingEditorial] = useState(false);
  const [correctingEditorial, setCorrectingEditorial] = useState(false);
  const [autoReviewBeforeImages, setAutoReviewBeforeImages] = useState(true);
  const [allowGenerateWithReviewIssues, setAllowGenerateWithReviewIssues] =
    useState(false);
  const [costHistory, setCostHistory] = useState<CostHistoryResponse | null>(null);
  const [preflightEstimate, setPreflightEstimate] =
    useState<CostEstimate | null>(null);
  const [costLimitBrl, setCostLimitBrl] = useState(25);
  const [allowOverBudget, setAllowOverBudget] = useState(false);
  const [slideHistory, setSlideHistory] = useState<
    Record<string, CarouselSlide[]>
  >({});
  const [slideImageHistory, setSlideImageHistory] = useState<
    Record<string, SlideImageResult[]>
  >({});
  // Ajuste rápido por slide: texto em linguagem natural que o usuário escreve
  // para refinar a imagem ("mais escuro", "menos texto") sem reescrever o
  // prompt inteiro. Aplicado na regeneração daquele slide.
  const [slideImageAdjustments, setSlideImageAdjustments] = useState<
    Record<string, string>
  >({});
  const [logoUsage, setLogoUsage] = useState('subtle');
  const [logoPosition, setLogoPosition] = useState('top-right');
  const [logoScale, setLogoScale] = useState('small');
  const [selectedLogoReferenceId, setSelectedLogoReferenceId] = useState('');
  const [companyProfiles, setCompanyProfiles] = useState<CompanyProfile[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [loadingCompanyProfile, setLoadingCompanyProfile] = useState(false);
  const [companyIdeas, setCompanyIdeas] = useState<CarouselIdea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [ideasError, setIdeasError] = useState('');
  const [finalCreativeBrief, setFinalCreativeBrief] = useState('');
  // Repurpose: gerar carrossel a partir de um link/artigo ou texto colado.
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceText, setSourceText] = useState('');
  // Legenda do post (texto fora da imagem) + hashtags por rede.
  const [captionPlatform, setCaptionPlatform] = useState('');
  const [postCaption, setPostCaption] = useState('');
  const [postHashtags, setPostHashtags] = useState<string[]>([]);
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [captionError, setCaptionError] = useState('');
  // Blocos visuais prontos (a pessoa escolhe em vez de escrever prompt).
  const [structurePreset, setStructurePreset] = useState(
    defaultVisualPresets.structurePreset
  );
  const [colorPreset, setColorPreset] = useState(
    defaultVisualPresets.colorPreset
  );
  const [stylePreset, setStylePreset] = useState(
    defaultVisualPresets.stylePreset
  );
  const [typographyPreset, setTypographyPreset] = useState(
    defaultVisualPresets.typographyPreset
  );
  // Quando há inspirações selecionadas, por padrão elas assumem o visual.
  const [inspirationsLeadVisual, setInspirationsLeadVisual] = useState(true);
  // Direção Criativa: 6 eixos de características visuais. O spec é derivado da
  // estratégia (template + objetivo + plataforma + Brand Kit) e fica "sujo"
  // assim que o usuário ajusta um dial — aí passa a valer o override.
  const [directionSpec, setDirectionSpecState] =
    useState<DirectionSpec>(defaultDirectionSpec);
  const [directionDirty, setDirectionDirty] = useState(false);
  // Referências visuais: imagens geradas (o usuário escolhe o estilo pela
  // imagem; o prompt associado fica interno e alimenta a geração final).
  const [styleReferences, setStyleReferences] = useState<StyleReference[]>([]);
  const [selectedStyleReferenceId, setSelectedStyleReferenceId] = useState('');
  const [loadingStyleReferences, setLoadingStyleReferences] = useState(false);
  const [styleReferencesError, setStyleReferencesError] = useState('');
  const [backendTemplates, setBackendTemplates] = useState<BackendTemplateDefinition[]>([]);
  const [templateRecommendations, setTemplateRecommendations] = useState<TemplateRecommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [selectedNiche, setSelectedNiche] = useState('');
  const setClampedSlideCount = useCallback((value: number) => {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) {
      setSlideCount(MIN_CAROUSEL_SLIDES);
      return;
    }

    setSlideCount(
      Math.min(
        MAX_CAROUSEL_SLIDES,
        Math.max(MIN_CAROUSEL_SLIDES, Math.round(nextValue))
      )
    );
  }, []);

  /* ──────────────────────── Derived values ──────────────────────── */

  const trimmedTopic = topic.trim();
  const trimmedTextModel = textModel.trim();
  const trimmedImageModel = imageModel.trim();
  const companyProfile =
    companyProfiles?.find((company) => company.id === selectedCompanyId) ||
    companyProfiles?.find((company) => company.summary?.trim()) ||
    companyProfiles?.[0] ||
    null;
  const hasRequiredCompanySummary = !!companyProfile?.summary?.trim();
  const template =
    backendTemplates?.find((bt) => bt.id === selectedTemplate) ??
    carouselTemplates?.find((item) => item.id === selectedTemplate) ??
    carouselTemplates?.[0];
  const hasBrandPalette = !!(
    companyProfile?.brandPalettes?.length || brandColors.trim()
  );
  // Defaults sugeridos pela estratégia. Recalcula quando template/objetivo/
  // plataforma/Brand Kit mudam, mas só vale enquanto o usuário não ajusta.
  const derivedDirectionSpec = useMemo(
    () =>
      buildDirectionSpec(
        { templateId: selectedTemplate, goal, platform },
        { hasPalette: hasBrandPalette }
      ),
    [goal, hasBrandPalette, platform, selectedTemplate]
  );
  const effectiveDirectionSpec = directionDirty
    ? directionSpec
    : derivedDirectionSpec;
  const setDirectionSpec = useCallback((next: DirectionSpec) => {
    setDirectionSpecState(normalizeDirectionSpec(next));
    setDirectionDirty(true);
  }, []);
  const directionSuggestedAxes = useMemo<DirectionAxisKey[]>(
    () =>
      directionDirty
        ? []
        : (Object.keys(effectiveDirectionSpec) as DirectionAxisKey[]),
    [directionDirty, effectiveDirectionSpec]
  );
  const directionDerivedFrom = useMemo(
    () =>
      [
        template?.label || selectedTemplate,
        goal,
        platform.charAt(0).toUpperCase() + platform.slice(1),
        hasBrandPalette ? `Brand Kit · ${brandName || 'marca'}` : '',
      ].filter(Boolean),
    [brandName, goal, hasBrandPalette, platform, selectedTemplate, template?.label]
  );
  const hasGenerationInput =
    !!trimmedTopic || !!sourceUrl.trim() || !!sourceText.trim();
  const planDisabled = useMemo(() => {
    return (
      planning ||
      !hasGenerationInput ||
      !trimmedTextModel ||
      !hasRequiredCompanySummary ||
      slideCount < MIN_CAROUSEL_SLIDES ||
      slideCount > MAX_CAROUSEL_SLIDES
    );
  }, [
    hasGenerationInput,
    hasRequiredCompanySummary,
    planning,
    slideCount,
    trimmedTextModel,
  ]);

  const imageDisabled = useMemo(() => {
    if (generatingImages || !plan?.slides?.length) {
      return true;
    }
    if (renderMode === 'design_system') {
      return plan.slides.some((slide) => !slide.headline.trim());
    }
    return (
      !trimmedImageModel ||
      plan.slides.some(
        (slide) => !slide.headline.trim() || !slide.imagePrompt.trim()
      )
    );
  }, [generatingImages, plan?.slides, trimmedImageModel, renderMode]);
  const imageDisabledReason = useMemo(() => {
    if (generatingImages) {
      return 'A geração de imagens já está em andamento.';
    }
    if (!plan?.slides?.length) {
      return 'Gere ou importe um plano de carrossel antes de criar imagens.';
    }
    if (renderMode === 'design_system') {
      const incompleteSlide = plan.slides.find((slide) => !slide.headline.trim());
      if (incompleteSlide) {
        return `Complete o título do slide ${incompleteSlide.index}.`;
      }
      return '';
    }
    if (!trimmedImageModel) {
      return 'Informe o modelo de imagem nas opções avançadas.';
    }
    const incompleteSlide = plan.slides.find(
      (slide) => !slide.headline.trim() || !slide.imagePrompt.trim()
    );
    if (incompleteSlide) {
      return `Complete o título e o prompt visual do slide ${incompleteSlide.index}.`;
    }
    return '';
  }, [generatingImages, plan?.slides, trimmedImageModel, renderMode]);

  const textCost = plan?.cost_estimate || null;
  const imageCost = sumCosts(
    Object.values(slideImages).map((item) => item.cost_estimate)
  );
  const totalCost = {
    usd: (textCost?.usd || 0) + imageCost.usd,
    brl: (textCost?.brl || 0) + imageCost.brl,
    tokens: (textCost?.tokens?.totalTokens || 0) + imageCost.tokens,
  };
  const estimatedGenerationBrl = preflightEstimate?.brl || 0;
  const projectedCostBrl = (costHistory?.totals.brl || 0) + estimatedGenerationBrl;
  const isOverSoftLimit =
    !!costHistory?.softLimitBrl && projectedCostBrl >= costHistory.softLimitBrl;
  const isOverUserLimit = costLimitBrl > 0 && projectedCostBrl >= costLimitBrl;
  const selectedBackendTemplate =
    backendTemplates?.find((bt) => bt.id === selectedTemplate) || null;
  const editorialIssues = plan
    ? getEditorialIssues(plan.slides, forbiddenTerms, selectedBackendTemplate)
    : [];
  const selectedReferences = referenceImages
    .filter((image) => image.selected)
    .slice(0, 3);
  const visibleReferenceImages = useMemo(() => {
    const filteredReferences =
      referenceCategoryFilter === 'todas'
        ? referenceImages
        : referenceImages.filter(
            (image) => (image.category || image.source) === referenceCategoryFilter
          );
    const priorityImages = filteredReferences.filter(
      (image) => image.selected || image.favorite || image.source === 'upload'
    );
    const priorityIds = new Set(priorityImages.map((image) => image.id));
    const regularImages = filteredReferences.filter(
      (image) => !priorityIds.has(image.id)
    );
    return [
      ...priorityImages,
      ...regularImages.slice(0, referenceDisplayLimit),
    ];
  }, [referenceCategoryFilter, referenceDisplayLimit, referenceImages]);
  const hiddenReferenceCount = Math.max(
    0,
    referenceImages.length - visibleReferenceImages.length
  );
  const generatedSlides =
    plan?.slides.filter((slide) =>
      imagePayload(slideImages[slide.id]?.image)
    ) || [];
  const imageJobProgress = imageJob
    ? Math.round(((imageJob.completed + imageJob.failed) / imageJob.total) * 100)
    : 0;
  const canSaveCarousel =
    !!plan?.slides?.length &&
    generatedSlides.length === plan.slides.length &&
    !generatingImages &&
    !savingCarousel &&
    savedCarouselCount === 0;
  const favoriteReferences = referenceImages.filter((image) => image.favorite);
  const globalReferencesCount = referenceImages.filter(
    (image) => image.source === 'global'
  ).length;
  const uploadReferencesCount = referenceImages.filter(
    (image) => image.source === 'upload'
  ).length;
  const brandReferencesCount = referenceImages.filter(
    (image) => image.source === 'brand'
  ).length;
  const companyReferencesCount = referenceImages.filter(
    (image) => image.source === 'company'
  ).length;
  const approvedReferencesCount = referenceImages.filter(
    (image) => image.approved
  ).length;
  const referenceCategories = useMemo(
    () =>
      Array.from(
        new Set(
          referenceImages
            .map((image) => image.category || image.source)
            .filter(Boolean)
        )
      ),
    [referenceImages]
  );
  const brandLogoReferences = referenceImages.filter(
    (image) => image.source === 'brand'
  );
  const selectedLogoReference =
    referenceImages.find((image) => image.id === selectedLogoReferenceId) || null;
  const companyContext = useMemo(() => {
    if (!companyProfile) {
      return '';
    }

    return [
      companyProfile.companyName && `Empresa: ${companyProfile.companyName}`,
      companyProfile.website && `Website: ${companyProfile.website}`,
      companyProfile.industry && `Setor: ${companyProfile.industry}`,
      companyProfile.targetAudience &&
        `Publico-alvo: ${companyProfile.targetAudience}`,
      companyProfile.productsOrServices &&
        `Produtos/Servicos: ${companyProfile.productsOrServices}`,
      companyProfile.differentials &&
        `Diferenciais: ${companyProfile.differentials}`,
      companyProfile.toneOfVoice && `Tom de voz: ${companyProfile.toneOfVoice}`,
      companyProfile.summary && `Resumo da empresa: ${companyProfile.summary}`,
      companyProfile.visualIdentitySummary &&
        `Identidade visual da marca: ${companyProfile.visualIdentitySummary}`,
      companyProfile.brandColors && `Cores da marca: ${companyProfile.brandColors}`,
      companyProfile.brandFonts && `Tipografia da marca: ${companyProfile.brandFonts}`,
      companyProfile.brandPalettes?.length &&
        `Paletas oficiais: ${companyProfile.brandPalettes
          .map((palette) => `${palette.name}: ${palette.colors.join(', ')} (${palette.usage})`)
          .join(' | ')}`,
      companyProfile.brandFontPresets?.length &&
        `Fontes oficiais: ${companyProfile.brandFontPresets
          .map((font) => `${font.name}: headline ${font.headline}; apoio ${font.body}; ${font.usage}`)
          .join(' | ')}`,
      companyProfile.defaultCta && `CTA padrao: ${companyProfile.defaultCta}`,
      companyProfile.forbiddenTerms && `Termos proibidos: ${companyProfile.forbiddenTerms}`,
      companyProfile.styleRules?.length &&
        `Regras de estilo: ${companyProfile.styleRules
          .map((rule) => `${rule.type === 'dont' ? 'Evitar' : 'Usar'}: ${rule.text}`)
          .join(' | ')}`,
      companyProfile.contentPreferences &&
        `Preferencias de conteudo: ${companyProfile.contentPreferences}`,
    ]
      .filter(Boolean)
      .join('\n');
  }, [companyProfile]);
  // Estilo visual escolhido pela imagem de referência (o prompt fica interno).
  const selectedStyleReference = useMemo(
    () =>
      styleReferences.find(
        (reference) => reference.id === selectedStyleReferenceId
      ) || null,
    [styleReferences, selectedStyleReferenceId]
  );
  const selectedStylePrompt = selectedStyleReference?.prompt || '';
  // Modo derivado (compat com o backend): inspirações comandam o visual quando
  // há referências selecionadas e o toggle está ligado; senão, equilíbrio.
  const visualDirectionMode: VisualDirectionMode =
    selectedReferences.length > 0 && inspirationsLeadVisual
      ? 'inspiration'
      : 'balanced';
  const computedCreativeBrief = useMemo(() => {
    // No modo "inspiration" a identidade visual da marca sai do brief para
    // nao competir com as inspiracoes; ficam apenas as regras de seguranca
    // (logo, CTA, termos proibidos) e o contexto estrategico.
    const hasRefs = selectedReferences.length > 0;
    const inspirationMode = visualDirectionMode === 'inspiration' && hasRefs;
    const brandMode = !hasRefs;

    const referencesList = selectedReferences
      .map(
        (reference) =>
          `${reference.name} (${reference.category || reference.source}${
            reference.approved ? ', aprovada pela empresa' : ''
          })${reference.description ? `: ${reference.description}` : ''}`
      )
      .join(' | ');

    const referencesLine = !hasRefs
      ? 'Sem inspiracoes temporarias selecionadas; priorize a identidade visual da marca.'
      : inspirationMode
      ? `Inspiracoes selecionadas (DIRECAO VISUAL PRINCIPAL): ${referencesList}. Elas mandam na composicao, enquadramento, paleta, tipografia, textura e atmosfera; em caso de conflito com qualquer outra instrucao de estilo, siga as inspiracoes. Nao copie marcas, logos, rostos ou elementos protegidos.`
      : brandMode
      ? `Inspiracoes selecionadas (apenas tempero visual): ${referencesList}. Em caso de conflito, priorize sempre a identidade visual da marca. Nao copie marcas, logos, rostos ou elementos protegidos.`
      : `Inspiracoes selecionadas: ${referencesList}. Use-as como referencia forte de composicao, hierarquia, textura, paleta e atmosfera, em equilibrio com a identidade da marca, sem copiar marcas, logos, rostos ou elementos protegidos.`;

    return buildLimitedBrief(
      [
        `Empresa: ${companyProfile?.companyName || brandName || 'marca selecionada'}.`,
        companyProfile?.summary &&
          `Resumo estrategico: ${companyProfile.summary}`,
        !inspirationMode &&
          companyProfile?.visualIdentitySummary &&
          `Identidade visual permanente: ${companyProfile.visualIdentitySummary}`,
        !inspirationMode &&
          brandColors.trim() &&
          `Cores a respeitar: ${brandColors.trim()}.`,
        !inspirationMode &&
          brandFonts.trim() &&
          `Tipografia desejada: ${brandFonts.trim()}.`,
        !inspirationMode &&
          companyProfile?.brandPalettes?.length &&
          `Paletas salvas no Brand Kit: ${companyProfile.brandPalettes
            .map((palette) => `${palette.name} [${palette.colors.join(', ')}] - ${palette.usage}`)
            .join(' | ')}`,
        !inspirationMode &&
          companyProfile?.brandFontPresets?.length &&
          `Presets oficiais de fonte: ${companyProfile.brandFontPresets
            .map((font) => `${font.name}: headline ${font.headline}; apoio ${font.body}; ${font.usage}`)
            .join(' | ')}`,
        defaultCta.trim() && `CTA padrao: ${defaultCta.trim()}.`,
        forbiddenTerms.trim() &&
          `Evitar termos/claims: ${forbiddenTerms.trim()}.`,
        !inspirationMode &&
          companyProfile?.styleRules?.length &&
          `Regras fixas de marca: ${companyProfile.styleRules
            .map((rule) => `${rule.type === 'dont' ? 'Nao fazer' : 'Fazer'}: ${rule.text}`)
            .join(' | ')}`,
        `Logo/assinatura: ${
          logoUsage === 'none'
            ? 'nao usar logo nem selo de marca'
            : logoUsage === 'text'
            ? `usar apenas selo textual com o nome ${brandName || 'da marca'}`
            : `usar assinatura visual discreta, posicao ${logoPosition}, tamanho ${logoScale}`
        }.`,
        selectedLogoReference &&
          `Referencia de logo/assinatura selecionada: ${selectedLogoReference.name}. Use somente como orientacao de proporcao, presença e posicionamento, sem copiar marcas se a imagem nao pertencer ao usuario.`,
        companyProfile?.contentPreferences &&
          `Preferencias de conteudo: ${companyProfile.contentPreferences}`,
        !inspirationMode &&
          visualStyle.trim() &&
          `Direcao visual escolhida para este carrossel: ${visualStyle.trim()}`,
        selectedStylePrompt &&
          `Direcao visual principal (estilo escolhido pelo usuario): ${selectedStylePrompt}. Siga fielmente este estilo (estetica, enquadramento, composicao, iluminacao, textura e atmosfera) em todos os slides; em caso de conflito com outras instrucoes de estilo, priorize esta direcao.`,
        referencesLine,
        'Regra central: cada slide deve parecer uma peça pronta de carrossel premium, com texto legivel dentro da imagem, alto contraste, margens seguras e unidade visual entre os slides.',
      ],
      2200
    );
  }, [
    brandColors,
    brandFonts,
    brandName,
    companyProfile,
    defaultCta,
    forbiddenTerms,
    logoPosition,
    logoScale,
    logoUsage,
    selectedLogoReference,
    selectedReferences,
    selectedStylePrompt,
    visualDirectionMode,
    visualStyle,
  ]);

  const refreshCreativeBrief = useCallback(() => {
    setFinalCreativeBrief(computedCreativeBrief);
  }, [computedCreativeBrief]);

  // Carrega as referências visuais ESTÁTICAS (geradas uma vez por um script e
  // versionadas em /public/style-references). Sem geração em runtime: o usuário
  // só vê as imagens; cada uma traz o prompt associado, que alimenta a geração.
  const loadStyleReferences = useCallback(async () => {
    setLoadingStyleReferences(true);
    setStyleReferencesError('');

    try {
      const response = await window.fetch('/style-references/index.json', {
        cache: 'no-store',
      });
      const data = (await response.json().catch(() => null)) as {
        references?: Array<{
          id?: string;
          file?: string;
          label?: string;
          prompt?: string;
          dataUrl?: string;
        }>;
      } | null;

      const rawReferences = Array.isArray(data?.references)
        ? data!.references
        : [];

      const mapped: StyleReference[] = rawReferences
        .filter((reference) => reference?.prompt && (reference.file || reference.dataUrl))
        .map((reference) => ({
          id: reference.id || reference.file || '',
          label: reference.label,
          prompt: reference.prompt as string,
          dataUrl: reference.dataUrl || `/style-references/${reference.file}`,
        }))
        .filter((reference) => reference.id && reference.dataUrl);

      if (!mapped.length) {
        setStyleReferences([]);
        setStyleReferencesError(
          'Nenhuma referência visual disponível. Rode o script de geração (scripts/generate-style-references.mjs).'
        );
        return;
      }

      setStyleReferences(mapped);
      setSelectedStyleReferenceId((current) =>
        mapped.some((reference) => reference.id === current) ? current : ''
      );
    } catch {
      setStyleReferencesError(
        'Não foi possível carregar as referências visuais.'
      );
    } finally {
      setLoadingStyleReferences(false);
    }
  }, []);

  const selectStyleReference = useCallback((id: string) => {
    setSelectedStyleReferenceId((current) => (current === id ? '' : id));
  }, []);

  // Monta o prompt de cada slide a partir da Direção Criativa (6 eixos). O
  // compilador resolve as escolhas em fragmentos determinísticos e injeta no
  // builder existente — sem imagens de referência no comando.
  const buildSlidePromptFor = useCallback(
    (slide: CarouselSlide) =>
      buildSlideImagePrompt(plan as CarouselPlan, slide, {
        ...buildDirectionRenderSpec(effectiveDirectionSpec, {
          brandColors,
          brief: finalCreativeBrief || computedCreativeBrief,
        }),
        hasBrandLogos: brandLogoReferences.length > 0,
        adjustment: slideImageAdjustments[slide.id]?.trim() || undefined,
      }),
    [
      brandColors,
      computedCreativeBrief,
      effectiveDirectionSpec,
      finalCreativeBrief,
      brandLogoReferences.length,
      plan,
      slideImageAdjustments,
    ]
  );

  const setSlideImageAdjustment = useCallback(
    (slideId: string, value: string) => {
      setSlideImageAdjustments((current) => ({
        ...current,
        [slideId]: value,
      }));
    },
    []
  );

  const applyCompanyBrandKit = useCallback((company?: CompanyProfile | null) => {
    if (!company) {
      return;
    }

    if (company.companyName) {
      setBrandName(company.companyName);
    }
    if (company.targetAudience) {
      setAudience(company.targetAudience);
    }
    if (company.toneOfVoice) {
      setTone(company.toneOfVoice);
    }
    if (company.brandColors) {
      setBrandColors(company.brandColors);
    } else if (company.brandPalettes?.[0]?.colors?.length) {
      setBrandColors(company.brandPalettes[0].colors.join(', '));
    }
    if (company.brandFonts) {
      setBrandFonts(company.brandFonts);
    } else if (company.brandFontPresets?.[0]) {
      const preset = company.brandFontPresets[0];
      setBrandFonts(
        [preset.headline && `Headline: ${preset.headline}`, preset.body && `Apoio: ${preset.body}`]
          .filter(Boolean)
          .join(' | ')
      );
    }
    if (company.defaultCta) {
      setDefaultCta(company.defaultCta);
    }
    if (company.forbiddenTerms) {
      setForbiddenTerms(company.forbiddenTerms);
    }
    if (company.contentPreferences || company.visualIdentitySummary) {
      setBrandNotes(
        [
          company.contentPreferences &&
            `Preferências de conteúdo: ${company.contentPreferences}`,
          company.visualIdentitySummary &&
            `Identidade visual: ${company.visualIdentitySummary}`,
        ]
          .filter(Boolean)
          .join('\n\n')
      );
    }
  }, []);



  const loadCostHistory = useCallback(async () => {
    try {
      const { ok, data } = await aiGenerateImagesApi.loadCostHistory(fetch);
      if (ok && data) {
        setCostHistory(data);
      }
    } catch {
      // Cost history should never block the creative workflow.
    }
  }, [fetch]);


  const estimateGenerationCost = useCallback(async () => {
    if (!plan?.slides?.length) {
      return;
    }

    try {
      const { ok, data } = await aiGenerateImagesApi.estimateGenerationCost(fetch, {
        slideCount: plan.slides.length,
        referenceCount: selectedReferences.length,
        promptChars: (finalCreativeBrief || computedCreativeBrief).length,
      });
      if (ok && data?.cost_estimate) {
        setPreflightEstimate(data.cost_estimate);
        await loadCostHistory();
      }
    } catch {
      // Best-effort estimate only.
    }
  }, [
    computedCreativeBrief,
    fetch,
    finalCreativeBrief,
    loadCostHistory,
    plan?.slides.length,
    selectedReferences.length,
  ]);


  /* ──────────────────────── Sub-hooks ──────────────────────── */

  // 1. Undo/Redo
  const undoRedo = useCarouselUndoRedo({
    plan,
    slideImages,
    setPlan,
    setSlideImages,
  });

  // 2. Slide operations
  const slideOps = useCarouselSlideOps({
    saveSnapshot: undoRedo.saveSnapshot,
    setPlan,
    setSlideImages,
    slideHistory,
    slideImageHistory,
    setSavedCarouselCount,
  });

  // 3. References
  const references = useCarouselReferences({
    referenceImages,
    setReferenceImages,
    referenceDataUrlCache,
    companyProfile,
    setCompanyProfiles,
    setSavingReferenceLibrary,
    setError,
    fetch,
  });

  // 4. Generation
  const generation = useCarouselGeneration({
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
    saveSnapshot: undoRedo.saveSnapshot,
    editorialReview,
  });

  // 5. Export
  const exportHooks = useCarouselExport({
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
  });

  // 6. Projects
  const projects = useCarouselProjects({
    fetch,
    mediaDirectory,
    brandProfileId,
    platform,
    selectedTemplate,
    goal,
    audience,
    tone,
    visualStyle,
    textModel,
    imageProvider,
    imageModel,
    logoUsage,
    logoPosition,
    logoScale,
    autoReviewBeforeImages,
    costLimitBrl,
    trimmedTopic,
    trimmedTextModel,
    companyContext,
    hasRequiredCompanySummary,
    companyIdeas,
    savedProjects,
    companyProfile,
    companyProfiles,
    selectedCompanyId,
    setPlan,
    setSlideImages,
    setTopic,
    setSelectedTemplate,
    setGoal,
    setAudience,
    setTone,
    setPlatform,
    setSlideCount: setClampedSlideCount,
    setVisualStyle,
    setFinalCreativeBrief,
    setDirectionSpecState,
    setDirectionDirty,
    setTextModel,
    setImageProvider,
    setImageModel,
    setLogoUsage,
    setLogoPosition,
    setLogoScale,
    setSelectedLogoReferenceId,
    setEditorialReview,
    setAutoReviewBeforeImages,
    setAllowGenerateWithReviewIssues,
    setSlideHistory,
    setSlideImageHistory,
    setCostLimitBrl,
    setAllowOverBudget,
    setSavedCarouselCount,
    setSavedCarouselProject,
    setError,
    setSelectedCompanyId,
    setBrandName,
    setBrandColors,
    setBrandFonts,
    setDefaultCta,
    setForbiddenTerms,
    setBrandNotes,
    setCompanyIdeas,
    setCompanyProfiles,
    setLoadingSavedProjects,
    setSavedProjects,
    setLoadingIdeas,
    setIdeasError,
    setReferenceImages,
    resetHistory: undoRedo.resetHistory,
  });


  /* ──────────────────────── Effects ──────────────────────── */

  useEffect(() => {
    let mounted = true;

    const loadCompanyProfile = async () => {
      setLoadingCompanyProfile(true);
      try {
        const { ok, data } = await aiGenerateImagesApi.loadCompanyProfiles(fetch);
        if (!ok || !data || !mounted) {
          return;
        }

        const companies = Array.isArray(data?.companies)
          ? (data.companies as CompanyProfile[])
          : [];
        const nextSelectedId =
          data?.selectedCompanyId ||
          companies.find((company) => company.summary?.trim())?.id ||
          companies[0]?.id ||
          '';
        const selectedCompany =
          companies.find((company) => company.id === nextSelectedId) ||
          companies[0];

        setCompanyProfiles(companies);
        setSelectedCompanyId(nextSelectedId);

        applyCompanyBrandKit(selectedCompany);
        references.syncBrandReferences(selectedCompany);
      } finally {
        if (mounted) {
          setLoadingCompanyProfile(false);
        }
      }
    };

    loadCompanyProfile();

    return () => {
      mounted = false;
    };
  }, [applyCompanyBrandKit, references.syncBrandReferences]);

  /**
   * Content Swipe → Gerar: pré-preenche tópico, brief e meta da ideia.
   * Query: topic, hook, angle, goal, platform, template, ideaId
   */
  useEffect(() => {
    if (ideaPrefillDoneRef.current) return;

    const topicParam = searchParams.get('topic')?.trim() || '';
    const hook = searchParams.get('hook')?.trim() || '';
    const angle = searchParams.get('angle')?.trim() || '';
    const goalParam = searchParams.get('goal')?.trim() || '';
    const platformParam = searchParams.get('platform')?.trim() || '';
    const templateParam = searchParams.get('template')?.trim() || '';
    const fromSwipe = searchParams.get('from') === 'swipe';

    if (!topicParam && !hook && !angle && !fromSwipe) {
      return;
    }

    ideaPrefillDoneRef.current = true;

    if (topicParam) {
      setTopic(topicParam);
    } else if (hook) {
      setTopic(hook);
    }

    if (goalParam) {
      setGoal(goalParam);
    }

    const platform = normalizePlatformParam(platformParam);
    if (platform) {
      setPlatform(platform);
    }

    const briefParts: string[] = [];
    if (hook) briefParts.push(`Hook: ${hook}`);
    if (angle) briefParts.push(`Ângulo: ${angle}`);
    if (goalParam) briefParts.push(`Objetivo: ${goalParam}`);
    if (topicParam && topicParam !== hook) {
      briefParts.unshift(`Tema: ${topicParam}`);
    }
    if (briefParts.length > 0) {
      setSourceText(briefParts.join('\n'));
    }

    if (templateParam) {
      const needle = templateParam.toLowerCase();
      const match = (carouselTemplates || []).find((tpl) => {
        const id = String(tpl.id || '').toLowerCase();
        const name = String((tpl as any).name || '').toLowerCase();
        return (
          id === needle ||
          name === needle ||
          needle.includes(id) ||
          id.includes(needle) ||
          name.includes(needle)
        );
      });
      if (match?.id) {
        setSelectedTemplate(match.id);
      }
    }
  }, [searchParams]);

  // Carrega as ideias já salvas da empresa selecionada (sem gastar tokens).
  useEffect(() => {
    const comp =
      companyProfiles?.find((item) => item.id === selectedCompanyId) ||
      companyProfiles?.find((item) => item.summary?.trim()) ||
      companyProfiles?.[0] ||
      null;
    setCompanyIdeas(comp?.ideasLibrary || []);
    setIdeasError('');
  }, [companyProfiles, selectedCompanyId]);


  useEffect(() => {
    return () => {
      generationAbortRef.current?.abort();
    };
  }, []);


  // Image / design-system job polling
  useEffect(() => {
    if (!imageJob?.id || !['queued', 'running'].includes(imageJob.status)) {
      return;
    }

    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const loader =
          renderMode === 'design_system'
            ? aiGenerateImagesApi.loadDesignJob
            : aiGenerateImagesApi.loadImageJob;
        const { ok, data } = await loader(fetch, imageJob.id);
        if (!ok || !data || cancelled) {
          return;
        }

        setImageJob(data);
        setSlideImages((current) => {
          const next = { ...current };
          const slides = plan?.slides || [];
          data.slides.forEach((slide) => {
            // Map backend slideIndex (1-based number) to slide.id (UUID)
            const matchingSlide = slides.find((s) => s.index === slide.slideIndex);
            const slideKey = matchingSlide?.id || String(slide.slideIndex);
            if (slide.status === 'completed' && slide.result?.images?.[0]) {
              next[slideKey] = {
                image: slide.result.images[0],
                cost_estimate: slide.result.cost_estimate,
              };
            }
            if (slide.status === 'failed') {
              next[slideKey] = {
                error: slide.error || 'Falha ao gerar imagem.',
              };
            }
          });
          return next;
        });

        if (data.status === 'completed' || data.status === 'failed' || data.status === 'partial') {
          setGeneratingImages(false);
          setAllowGenerateWithReviewIssues(false);
          void loadCostHistory();
        }
      } catch (err) {
        if (!cancelled) {
          setError('Não foi possível consultar o progresso da geração.');
        }
      }
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [fetch, imageJob?.id, imageJob?.status, renderMode]);


  useEffect(() => {
    projects.loadSavedProjects();
  }, [projects.loadSavedProjects]);


  useEffect(() => {
    loadCostHistory();
  }, [loadCostHistory]);


  useEffect(() => {
    estimateGenerationCost();
  }, [estimateGenerationCost]);


  useEffect(() => {
    let mounted = true;

    const loadGlobalReferences = async () => {
      try {
        const { ok, data: manifest } =
          await aiGenerateImagesApi.loadGlobalReferenceManifest();
        if (!ok) {
          return;
        }
        const files = Array.isArray(manifest?.files) ? manifest.files : [];
        if (!files.length || !mounted) {
          return;
        }

        setReferenceImages((current) => {
          const uploadOnly = current.filter(
            (image) =>
              image.source === 'upload' ||
              image.source === 'brand' ||
              image.source === 'company'
          );
          const globalImages: ReferenceImage[] = files.map((fileName) => ({
            id: `global-${fileName}`,
            name: fileName,
            src: `/ai-references/${encodeURIComponent(fileName)}`,
            source: 'global',
            favorite: false,
            selected: false,
            approved: false,
            category: inferReferenceCategory(fileName),
            description: '',
          }));

          return [...globalImages, ...uploadOnly];
        });
      } finally {
        if (mounted) {
          setGlobalReferencesLoaded(true);
        }
      }
    };

    loadGlobalReferences();

    return () => {
      mounted = false;
    };
  }, []);


  useEffect(() => {
    fetchTemplates(fetch).then((result) => {
      if (result.ok && result.templates) {
        setBackendTemplates(result.templates);
        setTemplatesLoaded(true);
      }
    });
  }, []);


  /* ──────────────────────── Template helpers ──────────────────────── */

  const applyTemplate = (templateId: string) => {
    // Prefer backend templates (enriched with narrative/slide rules) when loaded
    const backendTmpl = backendTemplates?.find((bt) => bt.id === templateId);
    if (backendTmpl) {
      setSelectedTemplate(templateId);
      setGoal(backendTmpl.goal);
      setTone(backendTmpl.tone);
      setClampedSlideCount(backendTmpl.recommendedSlideCount.default);
      setVisualStyle(backendTmpl.visualStyle);
      trackTemplateUsage(fetch, templateId, 'select').catch(() => {});
      return;
    }
    // Fallback to static frontend templates
    const nextTemplate =
      carouselTemplates?.find((item) => item.id === templateId) ||
      carouselTemplates?.[0];
    setSelectedTemplate(templateId);
    setGoal(nextTemplate.goal);
    setTone(nextTemplate.tone);
    setClampedSlideCount(nextTemplate.slideCount);
    setVisualStyle(nextTemplate.visualStyle);
    trackTemplateUsage(fetch, templateId, 'select').catch(() => {});
  };

  const requestRecommendations = useCallback(async () => {
    if (!trimmedTopic && !goal) return;
    setLoadingRecommendations(true);
    const result = await fetchRecommendations(fetch, {
      topic: trimmedTopic || undefined,
      goal: goal || undefined,
      platform: platform || undefined,
      niche: selectedNiche || undefined,
    });
    if (result.ok && result.data?.recommendations) {
      setTemplateRecommendations(result.data.recommendations);
    }
    setLoadingRecommendations(false);
  }, [trimmedTopic, goal, platform, selectedNiche]);
  /* ──────────────────────── Brand defaults ──────────────────────── */

  // Salva o Brand Kit atual (cores, fontes, CTA, termos) como padrão da empresa
  // selecionada — para vir pré-preenchido nos próximos carrosséis.
  const saveBrandDefaults = useCallback(async () => {
    if (!companyProfile?.id) {
      setError('Selecione a marca para salvar o Brand Kit no DNA.');
      return false;
    }

    setSavingBrandDefaults(true);
    setError('');

    const nextCompany = {
      ...companyProfile,
      brandColors,
      brandFonts,
      defaultCta,
      forbiddenTerms,
    };

    try {
      const { ok, data: savedCompany, message } =
        await aiGenerateImagesApi.saveCompanyProfile(fetch, nextCompany);
      if (!ok || !savedCompany) {
        setError(message || 'Não foi possível salvar o padrão da marca.');
        return false;
      }
      setCompanyProfiles((current) =>
        current.map((company) =>
          company.id === savedCompany.id ? savedCompany : company
        )
      );
      return true;
    } catch (err) {
      setError('Não foi possível salvar o padrão da marca.');
      return false;
    } finally {
      setSavingBrandDefaults(false);
    }
  }, [brandColors, brandFonts, companyProfile, defaultCta, fetch, forbiddenTerms]);

  /* ──────────────────────── Caption generation ──────────────────────── */

  // Gera legenda + hashtags adaptadas à rede a partir do carrossel atual.
  const generateCaption = useCallback(
    async (captionPlatformArg: string) => {
      if (!plan) {
        return;
      }
      setGeneratingCaption(true);
      setCaptionError('');
      setCaptionPlatform(captionPlatformArg);

      try {
        const { ok, data, message } = await aiGenerateImagesApi.generateCaption(
          fetch,
          {
            title: plan.title,
            slides: plan.slides.map((slide) => ({
              headline: slide.headline,
              body: slide.body,
            })),
            platform: captionPlatformArg,
            tone: tone.trim() || undefined,
            language: 'pt-BR',
            companyContext: companyContext || undefined,
            forbiddenTerms: forbiddenTerms.trim() || undefined,
            defaultCta: defaultCta.trim() || undefined,
            textModel: trimmedTextModel,
            brandProfileId,
          }
        );

        if (!ok || !data) {
          setCaptionError(message || 'Não foi possível gerar a legenda.');
          return;
        }

        setPostCaption(data.caption || '');
        setPostHashtags(Array.isArray(data.hashtags) ? data.hashtags : []);
      } catch {
        setCaptionError('Não foi possível conectar ao servidor.');
      } finally {
        setGeneratingCaption(false);
      }
    },
    [companyContext, defaultCta, fetch, forbiddenTerms, plan, tone, trimmedTextModel]
  );

  /* ──────────────────────── Return ──────────────────────── */

  return {
    activePreview,
    allowGenerateWithReviewIssues,
    allowOverBudget,
    applyCompanyBrandKit,
    applyEditorialQuickFixes: generation.applyEditorialQuickFixes,
    applyTemplate,
    approveReferenceForCompany: references.approveReferenceForCompany,
    approvedReferencesCount,
    audience,
    autoReviewBeforeImages,
    brandColors,
    brandFonts,
    brandLogoReferences,
    brandName,
    brandNotes,
    brandReferencesCount,
    canSaveCarousel,
    cancelCarouselGeneration: generation.cancelCarouselGeneration,
    companyIdeas,
    companyProfile,
    companyProfiles,
    companyReferencesCount,
    computedCreativeBrief,
    correctingEditorial,
    costHistory,
    costLimitBrl,
    defaultCta,
    editorialIssues,
    editorialReview,
    error,
    estimateGenerationCost,
    exportCarouselPackage: exportHooks.exportCarouselPackage,
    exportSingleSlide: exportHooks.exportSingleSlide,
    exportHeight,
    exportingPackage,
    exportWidth,
    favoriteReferences,
    finalCreativeBrief,
    fixCarouselWithAi: generation.fixCarouselWithAi,
    forbiddenTerms,
    generateCarouselImages: generation.generateCarouselImages,
    generateCompanyIdeas: projects.generateCompanyIdeas,
    generatePlan: generation.generatePlan,
    generateSlideImage: generation.generateSlideImage,
    generatedSlides,
    generatingImages,
    globalReferencesCount,
    globalReferencesLoaded,
    goal,
    hasRequiredCompanySummary,
    hiddenReferenceCount,
    imageCost,
    imageDisabled,
    imageDisabledReason,
    imageJob,
    imageJobProgress,
    imageModel,
    imageProvider,
    renderMode,
    setRenderMode,
    designRecipe,
    setDesignRecipe,
    designSizeId,
    setDesignSizeId,
    designHandle,
    setDesignHandle,
    designCatalogEnabled,
    importProjectInputRef,
    importProjectJson: projects.importProjectJson,
    includePdfExport,
    isOverSoftLimit,
    isOverUserLimit,
    ideasError,
    lightboxIndex,
    loadProjectIntoStudio: projects.loadProjectIntoStudio,
    loadSavedProjects: projects.loadSavedProjects,
    loadingCompanyProfile,
    loadingIdeas,
    loadingSavedProjects,
    logoPosition,
    logoScale,
    logoUsage,
    persistReferenceInCompanyLibrary: references.persistReferenceInCompanyLibrary,
    plan,
    planDisabled,
    planning,
    platform,
    preflightEstimate,
    projectedCostBrl,
    referenceCategoryFilter,
    referenceCategories,
    referenceDisplayLimit,
    referenceImages,
    refreshCreativeBrief,
    regenerateSlideCopy: generation.regenerateSlideCopy,
    removeReferenceImage: references.removeReferenceImage,
    restoreImageVersion: slideOps.restoreImageVersion,
    restoreSlideVersion: slideOps.restoreSlideVersion,
    reviewCarouselQuality: generation.reviewCarouselQuality,
    reviewingEditorial,
    saveCarouselToMedia: exportHooks.saveCarouselToMedia,
    savedCarouselCount,
    savedCarouselProject,
    savedCarouselProjectId,
    savedProjects,
    savingCarousel,
    savingReferenceLibrary,
    saveBrandDefaults,
    savingBrandDefaults,
    generateCaption,
    generatingCaption,
    captionPlatform,
    postCaption,
    setPostCaption,
    postHashtags,
    captionError,
    companyGallery: projects.companyGallery,
    selectedCompanyId,
    selectedLogoReference,
    selectedLogoReferenceId,
    selectedReferences,
    selectedTemplate,
    selectedBackendTemplate,
    setActivePreview,
    setAllowGenerateWithReviewIssues,
    setAllowOverBudget,
    setAudience,
    setAutoReviewBeforeImages,
    setBrandColors,
    setBrandFonts,
    setBrandName,
    setBrandNotes,
    setCompanyIdeas,
    setCostLimitBrl,
    setDefaultCta,
    setExportHeight,
    setExportWidth,
    setFinalCreativeBrief,
    setForbiddenTerms,
    setGoal,
    setIdeasError,
    setImageModel,
    setImageProvider,
    renderMode,
    setRenderMode,
    setIncludePdfExport,
    setLightboxIndex,
    setLogoPosition,
    setLogoScale,
    setLogoUsage,
    setPlan,
    setPlatform,
    setReferenceCategoryFilter,
    setReferenceDisplayLimit,
    setReferenceImages,
    setSelectedCompanyId,
    setSelectedLogoReferenceId,
    setShowAdvanced,
    sourceUrl,
    setSourceUrl,
    sourceText,
    setSourceText,
    setSlideCount: setClampedSlideCount,
    setTextModel,
    setTone,
    setTopic,
    setVisualStyle,
    showAdvanced,
    slideCount,
    slideHistory,
    slideImageAdjustments,
    setSlideImageAdjustment,
    slideImageHistory,
    slideImages,
    slideLoading,
    syncBrandReferences: references.syncBrandReferences,
    template,
    textCost,
    textModel,
    toggleReferenceFavorite: references.toggleReferenceFavorite,
    toggleReferenceSelection: references.toggleReferenceSelection,
    tone,
    topic,
    totalCost,
    trimmedImageModel,
    trimmedTextModel,
    trimmedTopic,
    updateSlide: slideOps.updateSlide,
    addSlide: slideOps.addSlide,
    removeSlide: slideOps.removeSlide,
    duplicateSlide: slideOps.duplicateSlide,
    moveSlide: slideOps.moveSlide,
    undo: undoRedo.undo,
    redo: undoRedo.redo,
    canUndo: undoRedo.canUndo,
    canRedo: undoRedo.canRedo,
    uploadReferenceImages: references.uploadReferenceImages,
    uploadReferencesCount,
    visibleReferenceImages,
    visualDirectionMode,
    structurePreset,
    setStructurePreset,
    colorPreset,
    setColorPreset,
    stylePreset,
    setStylePreset,
    typographyPreset,
    setTypographyPreset,
    inspirationsLeadVisual,
    setInspirationsLeadVisual,
    directionSpec: effectiveDirectionSpec,
    setDirectionSpec,
    directionSuggestedAxes,
    directionDerivedFrom,
    visualStyle,
    // Referências visuais de estilo
    styleReferences,
    selectedStyleReferenceId,
    selectedStylePrompt,
    loadingStyleReferences,
    styleReferencesError,
    loadStyleReferences,
    selectStyleReference,
    backendTemplates,
    templateRecommendations,
    loadingRecommendations,
    templatesLoaded,
    requestRecommendations,
    selectedNiche,
    setSelectedNiche,
  };
}
