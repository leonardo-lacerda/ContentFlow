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
  blobToBytes,
  buildLimitedBrief,
  buildSlideImagePrompt,
  canvasToBlob,
  compactText,
  companyBrandReferences,
  createPdfBlob,
  createZipBlob,
  downloadBlob,
  getEditorialIssues,
  imagePayload,
  imageSrc,
  imageToCanvas,
  inferReferenceCategory,
  resizeImageBlobToDataUrl,
  slugifyFileName,
  sumCosts,
} from './ai-generate-images.utils';
import { aiGenerateImagesApi } from './ai-generate-images.api';
import { fetchTemplates, fetchRecommendations, trackTemplateUsage } from './template-registry';
import {
  addSlideToPlan,
  createSnapshot,
  duplicateSlideInPlan,
  moveSlideInPlan,
  pushSnapshot,
  removeSlideFromPlan,
  restoreSnapshot,
} from './slide-operations';
import type { BackendTemplateDefinition, TemplateRecommendation } from './template-registry.types';

export function useAiGenerateImagesStudio() {
  const fetch = useFetch();
  const mediaDirectory = useMediaDirectory();
  const toaster = useToaster();
  const { data: selectedBrand } = useSelectedBrand();
  const brandProfileId = selectedBrand?.id || selectedBrand?.data?.id || undefined;
  const referenceDataUrlCache = useRef(new Map<string, string>());
  const generationAbortRef = useRef<AbortController | null>(null);
  const importProjectInputRef = useRef<HTMLInputElement | null>(null);
  const [topic, setTopic] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(
    carouselTemplates[0].id
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
  const [planning, setPlanning] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<CarouselPlan | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [slideImages, setSlideImages] = useState<
    Record<number, SlideImageResult>
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
  const [slideLoading, setSlideLoading] = useState<Record<number, string>>({});
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
    Record<number, CarouselSlide[]>
  >({});
  const [slideImageHistory, setSlideImageHistory] = useState<
    Record<number, SlideImageResult[]>
  >({});
  // Ajuste rápido por slide: texto em linguagem natural que o usuário escreve
  // para refinar a imagem ("mais escuro", "menos texto") sem reescrever o
  // prompt inteiro. Aplicado na regeneração daquele slide.
  const [slideImageAdjustments, setSlideImageAdjustments] = useState<
    Record<number, string>
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
  const trimmedTopic = topic.trim();
  const trimmedTextModel = textModel.trim();
  const trimmedImageModel = imageModel.trim();
  const companyProfile =
    companyProfiles.find((company) => company.id === selectedCompanyId) ||
    companyProfiles.find((company) => company.summary.trim()) ||
    companyProfiles[0] ||
    null;
  const hasRequiredCompanySummary = !!companyProfile?.summary?.trim();
  const template =
    carouselTemplates.find((item) => item.id === selectedTemplate) ||
    carouselTemplates[0];
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
        template.label,
        goal,
        platform.charAt(0).toUpperCase() + platform.slice(1),
        hasBrandPalette ? `Brand Kit · ${brandName || 'marca'}` : '',
      ].filter(Boolean),
    [brandName, goal, hasBrandPalette, platform, template.label]
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
    return (
      generatingImages ||
      !plan?.slides?.length ||
      !trimmedImageModel ||
      plan.slides.some(
        (slide) => !slide.headline.trim() || !slide.imagePrompt.trim()
      )
    );
  }, [generatingImages, plan?.slides, trimmedImageModel]);
  const imageDisabledReason = useMemo(() => {
    if (generatingImages) {
      return 'A geração de imagens já está em andamento.';
    }
    if (!plan?.slides?.length) {
      return 'Gere ou importe um plano de carrossel antes de criar imagens.';
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
  }, [generatingImages, plan?.slides, trimmedImageModel]);

  const textCost = plan?.cost_estimate || null;
  const imageCost = sumCosts(
    Object.values(slideImages).map((item) => item.cost_estimate)
  );
  const totalCost = {
    usd: (textCost?.usd || 0) + imageCost.usd,
    brl: (textCost?.brl || 0) + imageCost.brl,
    tokens: (textCost?.tokens.totalTokens || 0) + imageCost.tokens,
  };
  const estimatedGenerationBrl = preflightEstimate?.brl || 0;
  const projectedCostBrl = (costHistory?.totals.brl || 0) + estimatedGenerationBrl;
  const isOverSoftLimit =
    !!costHistory?.softLimitBrl && projectedCostBrl >= costHistory.softLimitBrl;
  const isOverUserLimit = costLimitBrl > 0 && projectedCostBrl >= costLimitBrl;
  const selectedBackendTemplate =
    backendTemplates.find((bt) => bt.id === selectedTemplate) || null;
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
      imagePayload(slideImages[slide.index]?.image)
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
    const hasReferences = selectedReferences.length > 0;
    const inspirationMode = visualDirectionMode === 'inspiration' && hasReferences;
    const brandMode = !hasReferences;

    const referencesList = selectedReferences
      .map(
        (reference) =>
          `${reference.name} (${reference.category || reference.source}${
            reference.approved ? ', aprovada pela empresa' : ''
          })${reference.description ? `: ${reference.description}` : ''}`
      )
      .join(' | ');

    const referencesLine = !hasReferences
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
        adjustment: slideImageAdjustments[slide.index]?.trim() || undefined,
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
    (slideIndex: number, value: string) => {
      setSlideImageAdjustments((current) => ({
        ...current,
        [slideIndex]: value,
      }));
    },
    []
  );

  const syncBrandReferences = useCallback((company?: CompanyProfile | null) => {
    const brandReferences = companyBrandReferences(company);
    setReferenceImages((current) => [
      ...brandReferences,
      ...current.filter(
        (image) => image.source !== 'brand' && image.source !== 'company'
      ),
    ]);
  }, []);

  const loadSavedProjects = useCallback(async () => {
    setLoadingSavedProjects(true);
    try {
      const { data } = await aiGenerateImagesApi.loadSavedProjects(fetch);
      setSavedProjects((data || []).slice(0, 12));
    } finally {
      setLoadingSavedProjects(false);
    }
  }, [fetch]);

  const loadProjectIntoStudio = useCallback(
    (project: SavedAiProject) => {
      const metadata = project.carouselProject || {};
      const loadedPlan = metadata.plan;
      if (!loadedPlan?.slides?.length) {
        setError('Este projeto salvo não tem dados suficientes para reabrir.');
        return;
      }

      const nextPlan: CarouselPlan = {
        title: loadedPlan.title || 'Carrossel salvo',
        platform: metadata.platform || platform,
        language: 'pt-BR',
        caption: loadedPlan.caption || '',
        hashtags: Array.isArray(loadedPlan.hashtags)
          ? loadedPlan.hashtags
          : [],
        imageStyleGuide: loadedPlan.imageStyleGuide || '',
        slides: loadedPlan.slides.map((slide: any, index: number) => ({
          index: Number(slide.index || index + 1),
          headline: slide.headline || '',
          body: slide.body || '',
          cta: slide.cta || '',
          imagePrompt: slide.imagePrompt || '',
          altText: slide.altText || slide.headline || '',
        })),
        provider: loadedPlan.provider,
        model: loadedPlan.model,
        cost_estimate: loadedPlan.cost_estimate || null,
      };

      const images: Record<number, SlideImageResult> = {};
      (project.children || []).forEach((child, index) => {
        images[index + 1] = {
          image: {
            url: mediaDirectory.set(child.path),
            mediaId: child.id,
          },
        };
      });

      setTopic(metadata.topic || loadedPlan.title || '');
      setSelectedTemplate(metadata.template || selectedTemplate);
      setGoal(metadata.goal || goal);
      setAudience(metadata.audience || audience);
      setTone(metadata.tone || tone);
      setPlatform(metadata.platform || platform);
      setSlideCount(loadedPlan.slides.length);
      setVisualStyle(metadata.visualStyle || visualStyle);
      setFinalCreativeBrief(metadata.creativeBrief || '');
      if (metadata.directionSpec) {
        setDirectionSpecState(normalizeDirectionSpec(metadata.directionSpec));
        setDirectionDirty(true);
      } else {
        setDirectionDirty(false);
      }
      setTextModel(metadata.generation?.textModel || textModel);
      setImageProvider(metadata.generation?.imageProvider || imageProvider);
      setImageModel(metadata.generation?.imageModel || imageModel);
      setLogoUsage(metadata.logo?.usage || logoUsage);
      setLogoPosition(metadata.logo?.position || logoPosition);
      setLogoScale(metadata.logo?.scale || logoScale);
      setSelectedLogoReferenceId(metadata.logo?.referenceId || '');
      setEditorialReview(metadata.editorialReview || null);
      setAutoReviewBeforeImages(
        typeof metadata.autoReviewBeforeImages === 'boolean'
          ? metadata.autoReviewBeforeImages
          : autoReviewBeforeImages
      );
      setAllowGenerateWithReviewIssues(false);
      setPlan(nextPlan);
      setSlideImages(images);
      setSlideHistory(metadata.history?.slideHistory || {});
      setSlideImageHistory(metadata.history?.slideImageHistory || {});
      setCostLimitBrl(metadata.costControls?.limitBrl || costLimitBrl);
      setAllowOverBudget(false);
      setSavedCarouselCount(project.children?.length || 0);
      setSavedCarouselProject(loadedPlan.title || 'Projeto reaberto');
      setError('');

      if (metadata.company?.id) {
        setSelectedCompanyId(metadata.company.id);
      }
      const metadataCompanyName =
        metadata.company?.name || metadata.company?.companyName || '';
      if (metadataCompanyName) {
        setBrandName(metadataCompanyName);
      }
      if (metadata.company?.brandColors) {
        setBrandColors(metadata.company.brandColors);
      }
      if (metadata.company?.brandFonts) {
        setBrandFonts(metadata.company.brandFonts);
      }
      if (metadata.company?.defaultCta) {
        setDefaultCta(metadata.company.defaultCta);
      }
      if (metadata.company?.forbiddenTerms) {
        setForbiddenTerms(metadata.company.forbiddenTerms);
      }
      if (metadata.company?.contentPreferences || metadata.company?.visualIdentitySummary) {
        setBrandNotes(
          [
            metadata.company.contentPreferences &&
              `Preferências de conteúdo: ${metadata.company.contentPreferences}`,
            metadata.company.visualIdentitySummary &&
              `Identidade visual: ${metadata.company.visualIdentitySummary}`,
          ]
            .filter(Boolean)
            .join('\n\n')
        );
      }
      if (metadata.brandNotes) {
        setBrandNotes(metadata.brandNotes);
      }

      if (Array.isArray(metadata.selectedReferences)) {
        const savedReferences = metadata.selectedReferences.slice(0, 3);
        setReferenceImages((current) =>
          current.map((reference) => ({
            ...reference,
            selected: savedReferences.some(
              (item: any) =>
                item.id === reference.id ||
                (item.source === reference.source && item.name === reference.name)
            ),
            favorite:
              reference.favorite ||
              savedReferences.some(
                (item: any) =>
                  item.favorite &&
                  (item.id === reference.id ||
                    (item.source === reference.source &&
                      item.name === reference.name))
              ),
          }))
        );
      }
    },
    [
      audience,
      autoReviewBeforeImages,
      costLimitBrl,
      goal,
      imageModel,
      imageProvider,
      logoPosition,
      logoScale,
      logoUsage,
      mediaDirectory,
      platform,
      selectedTemplate,
      textModel,
      tone,
      visualStyle,
    ]
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
        syncBrandReferences(selectedCompany);
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
  }, [applyCompanyBrandKit, syncBrandReferences]);

  // Carrega as ideias já salvas da empresa selecionada (sem gastar tokens).
  useEffect(() => {
    const company =
      companyProfiles.find((item) => item.id === selectedCompanyId) ||
      companyProfiles.find((item) => item.summary?.trim()) ||
      companyProfiles[0] ||
      null;
    setCompanyIdeas(company?.ideasLibrary || []);
    setIdeasError('');
  }, [companyProfiles, selectedCompanyId]);

  useEffect(() => {
    return () => {
      generationAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!imageJob?.id || !['queued', 'running'].includes(imageJob.status)) {
      return;
    }

    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const { ok, data } = await aiGenerateImagesApi.loadImageJob(fetch, imageJob.id);
        if (!ok || !data || cancelled) {
          return;
        }

        setImageJob(data);
        setSlideImages((current) => {
          const next = { ...current };
          data.slides.forEach((slide) => {
            if (slide.status === 'completed' && slide.result?.images?.[0]) {
              next[slide.slideIndex] = {
                image: slide.result.images[0],
                cost_estimate: slide.result.cost_estimate,
              };
            }
            if (slide.status === 'failed') {
              next[slide.slideIndex] = {
                error: slide.error || 'Falha ao gerar imagem.',
              };
            }
          });
          return next;
        });

        if (data.status === 'completed' || data.status === 'failed') {
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
  }, [fetch, imageJob?.id, imageJob?.status]);

  useEffect(() => {
    loadSavedProjects();
  }, [loadSavedProjects]);

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

  const applyTemplate = (templateId: string) => {
    const nextTemplate =
      carouselTemplates.find((item) => item.id === templateId) ||
      carouselTemplates[0];
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

  const updateSlide = (
    index: number,
    field: keyof CarouselSlide,
    value: string
  ) => {
    setPlan((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        slides: current.slides.map((slide) =>
          slide.index === index ? { ...slide, [field]: value } : slide
        ),
      };
    });
  };

  const saveSnapshot = useCallback(() => {
    const snapshot = createSnapshot(plan, slideImages);
    setUndoStack((stack) => pushSnapshot(stack, snapshot));
    setRedoStack([]);
  }, [plan, slideImages]);

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const raw = stack[stack.length - 1];
      setRedoStack((redo) => {
        const snapshot = createSnapshot(plan, slideImages);
        return [...redo, snapshot];
      });
      const { plan: prevPlan, slideImages: prevImages } = restoreSnapshot(raw);
      setPlan(prevPlan);
      setSlideImages(prevImages);
      return stack.slice(0, -1);
    });
  }, [plan, slideImages]);

  const redo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack;
      const raw = stack[stack.length - 1];
      setUndoStack((undo) => {
        const snapshot = createSnapshot(plan, slideImages);
        return [...undo, snapshot];
      });
      const { plan: nextPlan, slideImages: nextImages } = restoreSnapshot(raw);
      setPlan(nextPlan);
      setSlideImages(nextImages);
      return stack.slice(0, -1);
    });
  }, [plan, slideImages]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  // Keyboard shortcuts for undo (Ctrl+Z) and redo (Ctrl+Shift+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const addSlide = useCallback(
    (afterIndex: number) => {
      saveSnapshot();
      setPlan((current) => addSlideToPlan(current, afterIndex));
    },
    [saveSnapshot]
  );

  const removeSlide = useCallback(
    (index: number) => {
      saveSnapshot();
      setPlan((current) => removeSlideFromPlan(current, index));
    },
    [saveSnapshot]
  );

  const duplicateSlide = useCallback(
    (index: number) => {
      saveSnapshot();
      setPlan((current) => duplicateSlideInPlan(current, index));
    },
    [saveSnapshot]
  );

  const moveSlide = useCallback(
    (fromIndex: number, toIndex: number) => {
      saveSnapshot();
      setPlan((current) => moveSlideInPlan(current, fromIndex, toIndex));
    },
    [saveSnapshot]
  );

  const uploadReferenceImages = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []).filter(
      (file) => file.type.startsWith('image/') && file.size <= 8 * 1024 * 1024
    );

    const resizedFiles = await Promise.all(
      files.slice(0, 12).map(async (file) => ({
        file,
        src: await resizeImageBlobToDataUrl(file, 1024, 0.72),
      }))
    );

    setReferenceImages((current) => {
      let selectedCount = current.filter((image) => image.selected).length;
      const additions = resizedFiles
        .filter((item) => item.src)
        .map(({ file, src }) => {
          const selected = selectedCount < 3;
          if (selected) {
            selectedCount += 1;
          }

          return {
            id: `${file.name}-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}`,
            name: file.name,
            src,
            source: 'upload' as const,
            favorite: false,
            selected,
            approved: false,
            category: 'upload',
            description: '',
          };
        });

      additions.forEach((image) => {
        referenceDataUrlCache.current.set(image.id, image.src);
      });

      return [...current, ...additions];
    });

    event.target.value = '';
  };

  const toggleReferenceSelection = (id: string) => {
    setReferenceImages((current) => {
      const selectedCount = current.filter((image) => image.selected).length;

      return current.map((image) => {
        if (image.id !== id) {
          return image;
        }

        if (!image.selected && selectedCount >= 3) {
          return image;
        }

        return { ...image, selected: !image.selected };
      });
    });
  };

  const toggleReferenceFavorite = (id: string) => {
    const image = referenceImages.find((item) => item.id === id);
    const nextFavorite = !image?.favorite;
    setReferenceImages((current) =>
      current.map((item) =>
        item.id === id ? { ...item, favorite: nextFavorite } : item
      )
    );

    if (image && companyProfile) {
      persistReferenceInCompanyLibrary(image, {
        favorite: nextFavorite,
        approved: image.approved,
      });
    }
  };

  const persistReferenceInCompanyLibrary = async (
    image: ReferenceImage,
    overrides: Partial<CompanyInspiration> = {}
  ) => {
    if (!companyProfile?.id || image.source === 'brand') {
      return;
    }

    setSavingReferenceLibrary(image.id);
    setError('');

    const rawId = image.id.replace(`company-${companyProfile.id}-`, '');
    const library = companyProfile.inspirationLibrary || [];
    const previous = library.find(
      (item) =>
        item.id === rawId ||
        item.src === image.src ||
        item.name === image.name
    );
    const nextItem: CompanyInspiration = {
      id: previous?.id || rawId || `inspiration-${Date.now()}`,
      name: image.name,
      src: image.src,
      source: image.source,
      category: overrides.category || image.category || previous?.category || 'geral',
      favorite:
        typeof overrides.favorite === 'boolean'
          ? overrides.favorite
          : image.favorite || previous?.favorite || false,
      approved:
        typeof overrides.approved === 'boolean'
          ? overrides.approved
          : image.approved || previous?.approved || false,
      description: overrides.description || image.description || previous?.description || '',
    };
    const nextLibrary = previous
      ? library.map((item) => (item.id === previous.id ? nextItem : item))
      : [nextItem, ...library].slice(0, 80);
    const nextCompany = {
      ...companyProfile,
      inspirationLibrary: nextLibrary,
    };

    try {
      const { ok, data: savedCompany, message } =
        await aiGenerateImagesApi.saveCompanyProfile(fetch, nextCompany);
      if (!ok || !savedCompany) {
        setError(message || 'Não foi possível salvar a inspiração na empresa.');
        return;
      }

      setCompanyProfiles((current) =>
        current.map((company) =>
          company.id === savedCompany.id ? savedCompany : company
        )
      );
      setReferenceImages((current) =>
        current.map((item) =>
          item.id === image.id
            ? {
                ...item,
                favorite: nextItem.favorite,
                approved: nextItem.approved,
                category: nextItem.category,
                description: nextItem.description,
              }
            : item
        )
      );
    } catch (err) {
      setError('Não foi possível salvar a biblioteca da empresa.');
    } finally {
      setSavingReferenceLibrary('');
    }
  };

  const approveReferenceForCompany = (image: ReferenceImage) => {
    persistReferenceInCompanyLibrary(image, {
      approved: !image.approved,
      favorite: true,
    });
  };

  // Salva o Brand Kit atual (cores, fontes, CTA, termos) como padrão da empresa
  // selecionada — para vir pré-preenchido nos próximos carrosséis.
  const saveBrandDefaults = useCallback(async () => {
    if (!companyProfile?.id) {
      setError('Selecione uma empresa para salvar o padrão da marca.');
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

  // Galeria por empresa: carrosséis salvos da empresa selecionada, com miniatura.
  const companyGallery = useMemo(() => {
    return savedProjects
      .filter((project) => {
        const meta = project.carouselProject || {};
        if (!selectedCompanyId) {
          return true;
        }
        return (
          meta.company?.id === selectedCompanyId ||
          (!!companyProfile?.companyName &&
            meta.company?.name === companyProfile.companyName)
        );
      })
      .map((project) => {
        const meta = project.carouselProject || {};
        const firstChild = project.children?.[0];
        return {
          id: project.id,
          title:
            meta.plan?.title ||
            project.originalName?.replace('Carrossel: ', '') ||
            'Carrossel salvo',
          slideCount: project.children?.length || meta.plan?.slides?.length || 0,
          platform: meta.platform || '',
          thumbnail: firstChild ? mediaDirectory.set(firstChild.path) : '',
          project,
        };
      });
  }, [companyProfile, mediaDirectory, savedProjects, selectedCompanyId]);

  const removeReferenceImage = (id: string) => {
    referenceDataUrlCache.current.delete(id);
    setReferenceImages((current) =>
      current.filter((image) => image.id !== id || image.source === 'global')
    );
  };

  const generateCompanyIdeas = async () => {
    if (!hasRequiredCompanySummary) {
      setIdeasError(
        'Selecione uma empresa com resumo obrigatório antes de gerar ideias.'
      );
      return;
    }

    setLoadingIdeas(true);
    setIdeasError('');

    try {
      // Envia as ideias já salvas para a IA não repetir os mesmos temas.
      const existingTitles = companyIdeas
        .map((idea) => idea.title)
        .filter(Boolean);

      const { ok, data, message } = await aiGenerateImagesApi.generateCompanyIdeas(fetch, {
        topicHint: trimmedTopic || undefined,
        companyContext: companyContext || undefined,
        language: 'pt-BR',
        textModel: trimmedTextModel,
        existingTitles: existingTitles.length ? existingTitles : undefined,
        brandProfileId,
      });

      if (!ok) {
        setIdeasError(
          message || 'Nao foi possivel gerar ideias.'
        );
        return;
      }

      const freshIdeas = Array.isArray(data?.ideas) ? data.ideas : [];
      if (!freshIdeas.length) {
        setIdeasError(
          'A IA não retornou ideias novas desta vez. Tente novamente ou ajuste o tema.'
        );
        return;
      }

      const normalizeTitle = (title: string) =>
        title
          .toLowerCase()
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .replace(/[^a-z0-9]+/g, ' ')
          .trim();

      // Mescla ideias novas (no topo) com as salvas, removendo duplicadas.
      const seen = new Set<string>();
      const mergedLibrary: CompanyIdea[] = [];
      const pushIdea = (idea: CarouselIdea | CompanyIdea) => {
        const normalized = normalizeTitle(idea.title || '');
        if (!normalized || seen.has(normalized)) {
          return;
        }
        seen.add(normalized);
        const existing = idea as Partial<CompanyIdea>;
        mergedLibrary.push({
          id:
            existing.id ||
            `idea_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          title: idea.title,
          hook: idea.hook || '',
          goal: idea.goal || '',
          angle: idea.angle || '',
          createdAt: existing.createdAt || new Date().toISOString(),
        });
      };

      freshIdeas.forEach(pushIdea);
      companyIdeas.forEach(pushIdea);

      const cappedLibrary = mergedLibrary.slice(0, 120);
      setCompanyIdeas(cappedLibrary);

      // Persiste as ideias no perfil da empresa para não gastar tokens de novo.
      if (companyProfile?.id) {
        const { ok: savedOk, data: savedCompany } =
          await aiGenerateImagesApi.saveCompanyProfile(fetch, {
            ...companyProfile,
            ideasLibrary: cappedLibrary,
          });

        if (savedOk && savedCompany) {
          setCompanyProfiles((current) =>
            current.map((company) =>
              company.id === savedCompany.id ? savedCompany : company
            )
          );
        }
      }
    } catch (err) {
      setIdeasError('Nao foi possivel conectar ao servidor para gerar ideias.');
    } finally {
      setLoadingIdeas(false);
    }
  };

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

      const nextPlan = data;
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
          next[slide.index] = [...(next[slide.index] || []), slide].slice(-6);
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
          next[slide.index] = [...(next[slide.index] || []), slide].slice(-8);
        });
        return next;
      });
      setPlan(data);
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

  const restoreImageVersion = (slideIndex: number, versionIndex: number) => {
    const version = slideImageHistory[slideIndex]?.[versionIndex];
    if (!version) {
      return;
    }

    setSlideImages((current) => ({
      ...current,
      [slideIndex]: version,
    }));
    setSavedCarouselCount(0);
  };

  const importProjectJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text());
      const metadata = parsed.carouselProject || parsed;
      const importedPlan = metadata.plan;

      if (!importedPlan?.slides?.length) {
        setError('O JSON importado não tem um plano de carrossel válido.');
        return;
      }

      loadProjectIntoStudio({
        id: `imported-${Date.now()}`,
        originalName: file.name,
        carouselProject: metadata,
        children: [],
      });
      setSavedCarouselCount(0);
      setSavedCarouselProject('');
    } catch (err) {
      setError('Não foi possível importar o JSON do projeto.');
    }
  };

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
                  cost_estimate: slideImages[slide.index]?.cost_estimate,
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
        const image = imageSrc(slideImages[slide.index]?.image);
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
      Object.entries(slideImages).forEach(([index, result]) => {
        const slideIndex = Number(index);
        if (result?.image) {
          next[slideIndex] = [...(next[slideIndex] || []), result].slice(-6);
        }
      });
      return next;
    });
    setSlideImages(
      plan.slides.reduce<Record<number, SlideImageResult>>((acc, slide) => {
        acc[slide.index] = {};
        return acc;
      }, {})
    );
    setSavedCarouselCount(0);

    try {
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

  const generateSlideImage = async (slide: CarouselSlide) => {
    if (!plan) {
      return;
    }

    setSlideLoading((current) => ({ ...current, [slide.index]: 'imagem' }));
    setSlideImages((current) => ({ ...current, [slide.index]: {} }));
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
          [slide.index]: {
            error: message || 'Falha ao gerar imagem.',
          },
        }));
        return;
      }

      const result = data;
      setSlideImageHistory((current) => {
        const previous = slideImages[slide.index];
        if (!previous?.image) {
          return current;
        }
        return {
          ...current,
          [slide.index]: [...(current[slide.index] || []), previous].slice(-6),
        };
      });
      setSlideImages((current) => ({
        ...current,
        [slide.index]: {
          image: result.images?.[0],
          cost_estimate: result.cost_estimate,
        },
      }));
      await loadCostHistory();
    } catch (err) {
      setSlideImages((current) => ({
        ...current,
        [slide.index]: { error: 'Não foi possível conectar ao servidor.' },
      }));
    } finally {
      setSlideLoading((current) => ({ ...current, [slide.index]: '' }));
    }
  };

  const regenerateSlideCopy = async (slide: CarouselSlide, mode: string) => {
    if (!plan) {
      return;
    }

    setSlideLoading((current) => ({ ...current, [slide.index]: mode }));

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
        [slide.index]: [...(current[slide.index] || []), slide].slice(-6),
      }));
      setPlan((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          slides: current.slides.map((item) =>
            item.index === slide.index
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
      setSlideImages((current) => ({ ...current, [slide.index]: {} }));
      setSavedCarouselCount(0);
    } catch (err) {
      setError('Não foi possível conectar ao servidor do ContentFlow.');
    } finally {
      setSlideLoading((current) => ({ ...current, [slide.index]: '' }));
    }
  };

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
            imageMediaId: slideImages[slide.index]?.image?.mediaId,
            imageCostEstimate: slideImages[slide.index]?.cost_estimate,
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
                  Object.entries(slideHistory).map(([slideIndex, versions]) => [
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
                  Object.entries(slideImageHistory).map(([slideIndex, versions]) => [
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
            image: imagePayload(slideImages[slide.index]?.image),
            mediaId: slideImages[slide.index]?.image?.mediaId,
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

  const restoreSlideVersion = (slideIndex: number, versionIndex: number) => {
    const version = slideHistory[slideIndex]?.[versionIndex];
    if (!version) {
      return;
    }

    setPlan((current) =>
      current
        ? {
            ...current,
            slides: current.slides.map((slide) =>
              slide.index === slideIndex ? version : slide
            ),
          }
        : current
    );
    setSlideImages((current) => ({ ...current, [slideIndex]: {} }));
  };


  return {
    activePreview,
    allowGenerateWithReviewIssues,
    allowOverBudget,
    applyCompanyBrandKit,
    applyEditorialQuickFixes,
    applyTemplate,
    approveReferenceForCompany,
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
    cancelCarouselGeneration,
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
    exportCarouselPackage,
    exportHeight,
    exportingPackage,
    exportWidth,
    favoriteReferences,
    finalCreativeBrief,
    fixCarouselWithAi,
    forbiddenTerms,
    generateCarouselImages,
    generateCompanyIdeas,
    generatePlan,
    generateSlideImage,
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
    importProjectInputRef,
    importProjectJson,
    includePdfExport,
    isOverSoftLimit,
    isOverUserLimit,
    ideasError,
    lightboxIndex,
    loadProjectIntoStudio,
    loadSavedProjects,
    loadingCompanyProfile,
    loadingIdeas,
    loadingSavedProjects,
    logoPosition,
    logoScale,
    logoUsage,
    persistReferenceInCompanyLibrary,
    plan,
    planDisabled,
    planning,
    platform,
    preflightEstimate,
    projectedCostBrl,
    referenceCategoryFilter,
    referenceCategories,
    referenceImages,
    refreshCreativeBrief,
    regenerateSlideCopy,
    removeReferenceImage,
    restoreImageVersion,
    restoreSlideVersion,
    reviewCarouselQuality,
    reviewingEditorial,
    saveCarouselToMedia,
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
    companyGallery,
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
    syncBrandReferences,
    template,
    textCost,
    textModel,
    toggleReferenceFavorite,
    toggleReferenceSelection,
    tone,
    topic,
    totalCost,
    trimmedImageModel,
    trimmedTextModel,
    trimmedTopic,
    updateSlide,
    addSlide,
    removeSlide,
    duplicateSlide,
    moveSlide,
    undo,
    redo,
    canUndo,
    canRedo,
    uploadReferenceImages,
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
