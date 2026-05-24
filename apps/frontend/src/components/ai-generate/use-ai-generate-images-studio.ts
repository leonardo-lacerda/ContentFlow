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

import type {
  CarouselIdea,
  CarouselImageJob,
  CarouselPlan,
  CarouselSlide,
  CompanyInspiration,
  CompanyProfile,
  CostEstimate,
  CostHistoryResponse,
  EditorialReview,
  ReferenceImage,
  SavedAiProject,
  SlideImageResult,
} from './ai-generate-images.types';
import {
  REFERENCE_PAGE_SIZE,
  carouselTemplates,
  defaultVisualStyle,
} from './ai-generate-images.constants';
import {
  blobToBytes,
  buildLimitedBrief,
  buildReferenceInstruction,
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
  resolveImageRequestSettings,
  selectedReferencesToDataUrls,
  slugifyFileName,
  sumCosts,
} from './ai-generate-images.utils';
import { aiGenerateImagesApi } from './ai-generate-images.api';

export function useAiGenerateImagesStudio() {
  const fetch = useFetch();
  const mediaDirectory = useMediaDirectory();
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
  const [slideImages, setSlideImages] = useState<
    Record<number, SlideImageResult>
  >({});
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [referenceDisplayLimit, setReferenceDisplayLimit] =
    useState(REFERENCE_PAGE_SIZE);
  const [referenceCategoryFilter, setReferenceCategoryFilter] = useState('todas');
  const [savingReferenceLibrary, setSavingReferenceLibrary] = useState('');
  const [globalReferencesLoaded, setGlobalReferencesLoaded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activePreview, setActivePreview] = useState(0);
  const [slideLoading, setSlideLoading] = useState<Record<number, string>>({});
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [savingCarousel, setSavingCarousel] = useState(false);
  const [savedCarouselCount, setSavedCarouselCount] = useState(0);
  const [savedCarouselProject, setSavedCarouselProject] = useState('');
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
  const planDisabled = useMemo(() => {
    return (
      planning ||
      !trimmedTopic ||
      !trimmedTextModel ||
      !hasRequiredCompanySummary ||
      slideCount < 2 ||
      slideCount > 10
    );
  }, [
    hasRequiredCompanySummary,
    planning,
    slideCount,
    trimmedTextModel,
    trimmedTopic,
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
  const editorialIssues = plan ? getEditorialIssues(plan.slides) : [];
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
  const computedCreativeBrief = useMemo(
    () =>
      buildLimitedBrief(
        [
          `Empresa: ${companyProfile?.companyName || brandName || 'marca selecionada'}.`,
          companyProfile?.summary &&
            `Resumo estrategico: ${companyProfile.summary}`,
          companyProfile?.visualIdentitySummary &&
            `Identidade visual permanente: ${companyProfile.visualIdentitySummary}`,
          brandColors.trim() && `Cores a respeitar: ${brandColors.trim()}.`,
          brandFonts.trim() && `Tipografia desejada: ${brandFonts.trim()}.`,
          companyProfile?.brandPalettes?.length &&
            `Paletas salvas no Brand Kit: ${companyProfile.brandPalettes
              .map((palette) => `${palette.name} [${palette.colors.join(', ')}] - ${palette.usage}`)
              .join(' | ')}`,
          companyProfile?.brandFontPresets?.length &&
            `Presets oficiais de fonte: ${companyProfile.brandFontPresets
              .map((font) => `${font.name}: headline ${font.headline}; apoio ${font.body}; ${font.usage}`)
              .join(' | ')}`,
          defaultCta.trim() && `CTA padrao: ${defaultCta.trim()}.`,
          forbiddenTerms.trim() &&
            `Evitar termos/claims: ${forbiddenTerms.trim()}.`,
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
          visualStyle.trim() &&
            `Direcao visual escolhida para este carrossel: ${visualStyle.trim()}`,
          selectedReferences.length
            ? `Inspiracoes selecionadas: ${selectedReferences
                .map(
                  (reference) =>
                    `${reference.name} (${reference.category || reference.source}${
                      reference.approved ? ', aprovada pela empresa' : ''
                    })${reference.description ? `: ${reference.description}` : ''}`
                )
                .join(' | ')}. Use-as como referencia de composicao, hierarquia, textura e atmosfera, sem copiar marcas, logos, rostos ou elementos protegidos.`
            : 'Sem inspiracoes temporarias selecionadas; priorize a identidade visual da marca.',
          'Regra central: cada slide deve parecer uma peça pronta de carrossel premium, com texto legivel dentro da imagem, alto contraste, margens seguras e unidade visual entre os slides.',
        ],
        2200
      ),
    [
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
      visualStyle,
    ]
  );

  const refreshCreativeBrief = useCallback(() => {
    setFinalCreativeBrief(computedCreativeBrief);
  }, [computedCreativeBrief]);

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

  const applyTemplate = (templateId: string) => {
    const nextTemplate =
      carouselTemplates.find((item) => item.id === templateId) ||
      carouselTemplates[0];
    setSelectedTemplate(templateId);
    setGoal(nextTemplate.goal);
    setTone(nextTemplate.tone);
    setSlideCount(nextTemplate.slideCount);
    setVisualStyle(nextTemplate.visualStyle);
  };

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
    setCompanyIdeas([]);

    try {
      const { ok, data, message } = await aiGenerateImagesApi.generateCompanyIdeas(fetch, {
        topicHint: trimmedTopic || undefined,
        companyContext: companyContext || undefined,
        language: 'pt-BR',
        textModel: trimmedTextModel,
      });

      if (!ok) {
        setIdeasError(
          message || 'Nao foi possivel gerar ideias.'
        );
        return;
      }

      const ideas = Array.isArray(data?.ideas)
        ? data.ideas
        : [];
      setCompanyIdeas(ideas);
    } catch (err) {
      setIdeasError('Nao foi possivel conectar ao servidor para gerar ideias.');
    } finally {
      setLoadingIdeas(false);
    }
  };

  const generatePlan = async (event: FormEvent) => {
    event.preventDefault();

    if (!trimmedTopic) {
      setError('Digite o tema ou título do post.');
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
    setSavedCarouselCount(0);
    setActivePreview(0);

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
          topic: trimmedTopic,
          goal: goal.trim(),
          audience: audience.trim(),
          tone: tone.trim(),
          platform,
          slideCount,
          visualStyle: visualStyle.trim(),
          brandNotes: brandBrief,
          language: 'pt-BR',
          textModel: trimmedTextModel,
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
      return;
    }

    if ((isOverUserLimit || isOverSoftLimit) && !allowOverBudget) {
      setError(
        'A estimativa de custo ultrapassa o limite configurado. Ajuste o limite ou marque "gerar mesmo assim".'
      );
      return;
    }

    if (autoReviewBeforeImages && !allowGenerateWithReviewIssues) {
      const review = editorialReview || (await reviewCarouselQuality(true));
      const hasHighRisk =
        (review?.score ?? 100) < 70 ||
        review?.issues?.some((issue) => issue.severity === 'high');

      if (hasHighRisk) {
        setError(
          'A revisão editorial encontrou riscos antes de gerar imagens. Ajuste os pontos indicados ou marque "gerar mesmo com alertas".'
        );
        return;
      }
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
    setSlideImages({});
    setSavedCarouselCount(0);

    const referenceDataUrls = selectedReferences.length
      ? await selectedReferencesToDataUrls(
          selectedReferences,
          referenceDataUrlCache.current
        )
      : [];

    const requestSettings = resolveImageRequestSettings(
      imageProvider,
      trimmedImageModel,
      referenceDataUrls.length
    );

    try {
      const slides = plan.slides.map((slide) => {
        const requestBody: Record<string, unknown> = {
          provider: requestSettings.provider,
          prompt: `${buildSlideImagePrompt(
            plan,
            slide,
            finalCreativeBrief || computedCreativeBrief
          )}${buildReferenceInstruction(referenceDataUrls.length)}`,
          model: requestSettings.model,
          n: 1,
        };

        if (referenceDataUrls.length) {
          requestBody.reference_images = referenceDataUrls;
          requestBody.reference_description_model = 'gpt-image-1.5';
        }

        if (requestSettings.provider === 'ia_generate') {
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
      setSlideImages(() =>
        plan.slides.reduce<Record<number, SlideImageResult>>((acc, slide) => {
          acc[slide.index] = {};
          return acc;
        }, {})
      );
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
      const referenceDataUrls = selectedReferences.length
        ? await selectedReferencesToDataUrls(
            selectedReferences,
            referenceDataUrlCache.current
          )
        : [];
      const requestSettings = resolveImageRequestSettings(
        imageProvider,
        trimmedImageModel,
        referenceDataUrls.length
      );
      const requestBody: Record<string, unknown> = {
        provider: requestSettings.provider,
        prompt: `${buildSlideImagePrompt(
          plan,
          slide,
          finalCreativeBrief || computedCreativeBrief
        )}${buildReferenceInstruction(referenceDataUrls.length)}`,
        model: requestSettings.model,
        n: 1,
      };

      if (referenceDataUrls.length) {
        requestBody.reference_images = referenceDataUrls;
        requestBody.reference_description_model = 'gpt-image-1.5';
      }

      if (requestSettings.provider === 'ia_generate') {
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
    savedProjects,
    savingCarousel,
    savingReferenceLibrary,
    selectedCompanyId,
    selectedLogoReference,
    selectedLogoReferenceId,
    selectedReferences,
    selectedTemplate,
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
    setSlideCount,
    setTextModel,
    setTone,
    setTopic,
    setVisualStyle,
    showAdvanced,
    slideCount,
    slideHistory,
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
    uploadReferenceImages,
    uploadReferencesCount,
    visibleReferenceImages,
    visualStyle,
  };
}
