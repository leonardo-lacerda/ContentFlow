'use client';

import { ChangeEvent, useCallback, useMemo } from 'react';
import type {
  CarouselIdea,
  CarouselPlan,
  CompanyIdea,
  CompanyProfile,
  SavedAiProject,
  SlideImageResult,
} from './ai-generate-images.types';
import { ensureSlideIds } from './slide-operations';
import { aiGenerateImagesApi } from './ai-generate-images.api';
import { normalizeDirectionSpec } from './direction-compiler';
import type { DirectionSpec } from './direction-compiler';

/* ──────────────────────────── Params ──────────────────────────── */

export interface UseCarouselProjectsParams {
  fetch: ReturnType<typeof import('@gitroom/helpers/utils/custom.fetch').useFetch>;
  mediaDirectory: ReturnType<typeof import('@gitroom/react/helpers/use.media.directory').useMediaDirectory>;
  brandProfileId: string | undefined;

  // Current form/config values (defaults for loadProjectIntoStudio)
  platform: string;
  selectedTemplate: string;
  goal: string;
  audience: string;
  tone: string;
  visualStyle: string;
  textModel: string;
  imageProvider: 'ia_generate' | 'openai_official';
  imageModel: string;
  logoUsage: string;
  logoPosition: string;
  logoScale: string;
  autoReviewBeforeImages: boolean;
  costLimitBrl: number;
  trimmedTopic: string;
  trimmedTextModel: string;
  companyContext: string;
  hasRequiredCompanySummary: boolean;
  companyIdeas: CarouselIdea[];

  // Data state
  savedProjects: SavedAiProject[];
  companyProfile: CompanyProfile | null;
  companyProfiles: CompanyProfile[];
  selectedCompanyId: string;

  // Setters
  setPlan: React.Dispatch<React.SetStateAction<CarouselPlan | null>>;
  setSlideImages: React.Dispatch<React.SetStateAction<Record<string, SlideImageResult>>>;
  setTopic: React.Dispatch<React.SetStateAction<string>>;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<string>>;
  setGoal: React.Dispatch<React.SetStateAction<string>>;
  setAudience: React.Dispatch<React.SetStateAction<string>>;
  setTone: React.Dispatch<React.SetStateAction<string>>;
  setPlatform: React.Dispatch<React.SetStateAction<string>>;
  setSlideCount: (value: number) => void;
  setVisualStyle: React.Dispatch<React.SetStateAction<string>>;
  setFinalCreativeBrief: React.Dispatch<React.SetStateAction<string>>;
  setDirectionSpecState: React.Dispatch<React.SetStateAction<DirectionSpec>>;
  setDirectionDirty: React.Dispatch<React.SetStateAction<boolean>>;
  setTextModel: React.Dispatch<React.SetStateAction<string>>;
  setImageProvider: React.Dispatch<React.SetStateAction<'ia_generate' | 'openai_official'>>;
  setImageModel: React.Dispatch<React.SetStateAction<string>>;
  setLogoUsage: React.Dispatch<React.SetStateAction<string>>;
  setLogoPosition: React.Dispatch<React.SetStateAction<string>>;
  setLogoScale: React.Dispatch<React.SetStateAction<string>>;
  setSelectedLogoReferenceId: React.Dispatch<React.SetStateAction<string>>;
  setEditorialReview: React.Dispatch<React.SetStateAction<any>>;
  setAutoReviewBeforeImages: React.Dispatch<React.SetStateAction<boolean>>;
  setAllowGenerateWithReviewIssues: React.Dispatch<React.SetStateAction<boolean>>;
  setSlideHistory: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  setSlideImageHistory: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  setCostLimitBrl: React.Dispatch<React.SetStateAction<number>>;
  setAllowOverBudget: React.Dispatch<React.SetStateAction<boolean>>;
  setSavedCarouselCount: React.Dispatch<React.SetStateAction<number>>;
  setSavedCarouselProject: React.Dispatch<React.SetStateAction<string>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setSelectedCompanyId: React.Dispatch<React.SetStateAction<string>>;
  setBrandName: React.Dispatch<React.SetStateAction<string>>;
  setBrandColors: React.Dispatch<React.SetStateAction<string>>;
  setBrandFonts: React.Dispatch<React.SetStateAction<string>>;
  setDefaultCta: React.Dispatch<React.SetStateAction<string>>;
  setForbiddenTerms: React.Dispatch<React.SetStateAction<string>>;
  setBrandNotes: React.Dispatch<React.SetStateAction<string>>;
  setCompanyIdeas: React.Dispatch<React.SetStateAction<CarouselIdea[]>>;
  setCompanyProfiles: React.Dispatch<React.SetStateAction<CompanyProfile[]>>;
  setLoadingSavedProjects: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadingIdeas: React.Dispatch<React.SetStateAction<boolean>>;
  setIdeasError: React.Dispatch<React.SetStateAction<string>>;
  setReferenceImages: React.Dispatch<React.SetStateAction<any[]>>;

  // Functions from other hooks
  resetHistory: () => void;
}

/* ──────────────────────────── Return ──────────────────────────── */

export interface UseCarouselProjectsReturn {
  loadProjectIntoStudio: (project: SavedAiProject) => void;
  loadSavedProjects: () => Promise<void>;
  importProjectJson: (event: ChangeEvent<HTMLInputElement>) => void;
  generateCompanyIdeas: () => Promise<void>;
  companyGallery: Array<{
    id: string;
    title: string;
    slideCount: number;
    platform: string;
    thumbnail: string;
    project: SavedAiProject;
  }>;
}

/* ──────────────────────────── Hook ──────────────────────────── */

export function useCarouselProjects(
  params: UseCarouselProjectsParams
): UseCarouselProjectsReturn {
  const {
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
    selectedCompanyId,
    setPlan,
    setSlideImages,
    setTopic,
    setSelectedTemplate,
    setGoal,
    setAudience,
    setTone,
    setPlatform,
    setSlideCount,
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
    setLoadingIdeas,
    setIdeasError,
    setReferenceImages,
    resetHistory,
  } = params;

  /* ─────────────── Load saved projects ─────────────── */

  const loadSavedProjects = useCallback(async () => {
    setLoadingSavedProjects(true);
    try {
      const { data } = await aiGenerateImagesApi.loadSavedProjects(fetch);
      setSavedProjects((data || []).slice(0, 12));
    } finally {
      setLoadingSavedProjects(false);
    }
  }, [fetch, setLoadingSavedProjects, setSavedProjects]);

  /* ─────────────── Company gallery (derived) ─────────────── */

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

  /* ─────────────── Load project into studio ─────────────── */

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
        slides: ensureSlideIds(loadedPlan.slides.map((slide: any, index: number) => ({
          id: slide.id || '',
          index: Number(slide.index || index + 1),
          headline: slide.headline || '',
          body: slide.body || '',
          cta: slide.cta || '',
          imagePrompt: slide.imagePrompt || '',
          altText: slide.altText || slide.headline || '',
        }))),
        provider: loadedPlan.provider,
        model: loadedPlan.model,
        cost_estimate: loadedPlan.cost_estimate || null,
      };

      const images: Record<string, SlideImageResult> = {};
      nextPlan.slides.forEach((slide, index) => {
        const child = project.children?.[index];
        if (child) {
          images[slide.id] = {
            image: {
              url: mediaDirectory.set(child.path),
              mediaId: child.id,
            },
          };
        }
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
      resetHistory();
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
        setReferenceImages((current: any[]) =>
          current.map((reference: any) => ({
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
      // Setters are stable refs, no need to list
      setPlan, setSlideImages, setTopic, setSelectedTemplate,
      setGoal, setAudience, setTone, setPlatform, setSlideCount,
      setVisualStyle, setFinalCreativeBrief, setDirectionSpecState,
      setDirectionDirty, setTextModel, setImageProvider, setImageModel,
      setLogoUsage, setLogoPosition, setLogoScale, setSelectedLogoReferenceId,
      setEditorialReview, setAutoReviewBeforeImages,
      setAllowGenerateWithReviewIssues, setSlideHistory,
      setSlideImageHistory, setCostLimitBrl, setAllowOverBudget,
      setSavedCarouselCount, setSavedCarouselProject, setError,
      setSelectedCompanyId, setBrandName, setBrandColors, setBrandFonts,
      setDefaultCta, setForbiddenTerms, setBrandNotes, setReferenceImages,
      resetHistory,
    ]
  );

  /* ─────────────── Import project JSON ─────────────── */

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

  /* ─────────────── Generate company ideas ─────────────── */

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

  return {
    loadProjectIntoStudio,
    loadSavedProjects,
    importProjectJson,
    generateCompanyIdeas,
    companyGallery,
  };
}
