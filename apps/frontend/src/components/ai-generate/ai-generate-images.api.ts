import type {
  CarouselIdea,
  CarouselImageJob,
  CarouselPlan,
  CompanyProfile,
  CostEstimate,
  CostHistoryResponse,
  EditorialReview,
  GenerateImageResponse,
  SavedAiProject,
} from './ai-generate-images.types';
import type {
  BackendTemplateDefinition,
  TemplateRecommendRequest,
  TemplateRecommendResponse,
  TemplateTrackEvent,
} from './template-registry.types';
import {
  brandDnaToCompanyProfile,
  companyProfileToDnaPayload,
} from './brand-company-bridge';

export type AiGenerateFetcher = (
  input: string,
  init?: RequestInit
) => Promise<Response>;

export type ApiResult<T> = {
  ok: boolean;
  data: T | null;
  message?: string;
};

const parseJson = async <T>(response: Response, fallback: T | null = null) =>
  (await response.json().catch(() => fallback)) as T | null;

const errorMessage = (data: unknown) => {
  if (!data || typeof data !== 'object') {
    return undefined;
  }

  const payload = data as { message?: string; error?: string };
  return payload.message || payload.error;
};

const getJson = async <T>(
  fetcher: AiGenerateFetcher,
  url: string
): Promise<ApiResult<T>> => {
  const response = await fetcher(url);
  const data = await parseJson<T>(response);

  return {
    ok: response.ok,
    data,
    message: response.ok ? undefined : errorMessage(data),
  };
};

const postJson = async <T>(
  fetcher: AiGenerateFetcher,
  url: string,
  body: unknown
): Promise<ApiResult<T>> => {
  const response = await fetcher(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await parseJson<T>(response);

  return {
    ok: response.ok,
    data,
    message: response.ok ? undefined : errorMessage(data),
  };
};

export const aiGenerateImagesApi = {
  loadSavedProjects: async (fetcher: AiGenerateFetcher) => {
    const result = await getJson<{ results?: SavedAiProject[] }>(
      fetcher,
      '/media?page=1&search=Carrossel'
    );
    const projects = Array.isArray(result.data?.results)
      ? result.data.results.filter((item) => item.carouselProject)
      : [];

    return {
      ...result,
      data: projects,
    };
  },

  /**
   * ContentFlow v1: Brand DNA é a fonte da verdade.
   * Mapeia /brands + DNA latest → shape CompanyProfile do estúdio.
   * Assets legados (inspiration library) vêm do company-profiles se existirem.
   */
  loadCompanyProfiles: async (fetcher: AiGenerateFetcher) => {
    const brandsRes = await getJson<any>(fetcher, '/brands');
    if (!brandsRes.ok) {
      return getJson<{
        companies?: CompanyProfile[];
        selectedCompanyId?: string;
      }>(fetcher, '/settings/company-profiles');
    }

    const brands: any[] = Array.isArray(brandsRes.data)
      ? brandsRes.data
      : brandsRes.data?.brands || brandsRes.data?.data || [];

    const legacyById = new Map<string, CompanyProfile>();
    const legacyByName = new Map<string, CompanyProfile>();
    try {
      const legacy = await getJson<{
        companies?: CompanyProfile[];
        selectedCompanyId?: string;
      }>(fetcher, '/settings/company-profiles');
      if (legacy.ok && Array.isArray(legacy.data?.companies)) {
        for (const c of legacy.data!.companies!) {
          if (c.id) legacyById.set(c.id, c);
          if (c.companyName) {
            legacyByName.set(c.companyName.toLowerCase(), c);
          }
        }
      }
    } catch {
      /* optional */
    }

    if (!brands.length) {
      if (legacyById.size > 0) {
        const companies = Array.from(legacyById.values());
        return {
          ok: true,
          data: {
            companies,
            selectedCompanyId: companies[0]?.id || '',
          },
        };
      }
      return { ok: true, data: { companies: [], selectedCompanyId: '' } };
    }

    const selected = brands.find((b) => b.selected) || brands[0];
    const companies: CompanyProfile[] = [];

    for (const brand of brands) {
      let dna: any = null;
      try {
        const dnaRes = await getJson<any>(
          fetcher,
          `/brands/${brand.id}/dna/latest`
        );
        if (dnaRes.ok) {
          dna = dnaRes.data?.data || dnaRes.data;
        }
      } catch {
        /* optional */
      }

      const legacy =
        legacyById.get(brand.id) ||
        legacyByName.get(String(brand.name || '').toLowerCase()) ||
        null;

      companies.push(brandDnaToCompanyProfile(brand, dna, legacy));
    }

    return {
      ok: true,
      data: {
        companies,
        selectedCompanyId: selected?.id || companies[0]?.id || '',
      },
    };
  },

  /**
   * Salva Brand Kit no Brand DNA (+ update brand name/website).
   * Assets de inspiration library ainda podem ir para company-profiles legado.
   */
  saveCompanyProfile: async (
    fetcher: AiGenerateFetcher,
    company: CompanyProfile
  ) => {
    if (!company.id) {
      return {
        ok: false,
        data: null as CompanyProfile | null,
        message: 'Marca não selecionada',
      };
    }

    try {
      await fetcher(`/brands/${company.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: company.companyName,
          website: company.website || undefined,
          industry: company.industry || undefined,
        }),
      });
    } catch {
      /* continue */
    }

    const dnaPayload = companyProfileToDnaPayload(company);
    const dnaRes = await postJson<any>(
      fetcher,
      `/brands/${company.id}/dna`,
      dnaPayload
    );

    if (
      (company.inspirationLibrary && company.inspirationLibrary.length > 0) ||
      (company.brandLogos && company.brandLogos.length > 0) ||
      (company.ideasLibrary && company.ideasLibrary.length > 0)
    ) {
      try {
        await postJson(fetcher, '/settings/company-profiles', {
          ...company,
          id: company.id,
          companyName: company.companyName,
        });
      } catch {
        /* ignore */
      }
    }

    const brand = {
      id: company.id,
      name: company.companyName,
      website: company.website,
      industry: company.industry,
    };
    const dna = dnaRes.data?.data || dnaRes.data || null;
    const mapped = brandDnaToCompanyProfile(brand, dna, company);

    return {
      ok: true,
      data: mapped,
      message: dnaRes.ok ? undefined : dnaRes.message,
    };
  },

  loadImageJob: async (fetcher: AiGenerateFetcher, id: string) =>
    getJson<CarouselImageJob>(
      fetcher,
      `/ai-generate/carousel-image-jobs/${id}`
    ),

  loadDesignJob: async (fetcher: AiGenerateFetcher, id: string) =>
    getJson<CarouselImageJob>(
      fetcher,
      `/ai-generate/carousel-design-jobs/${id}`
    ),

  createDesignJob: async (
    fetcher: AiGenerateFetcher,
    payload: Record<string, unknown>
  ) =>
    postJson<CarouselImageJob>(
      fetcher,
      '/ai-generate/carousel-design-jobs',
      payload
    ),

  loadDesignCatalogSummary: async (fetcher: AiGenerateFetcher) =>
    getJson<import('./ai-generate-images.types').DesignSystemCatalogSummary>(
      fetcher,
      '/ai-generate/design-system/summary'
    ),

  ideateDesign: async (
    fetcher: AiGenerateFetcher,
    payload: {
      query?: string;
      count?: number;
      seed?: number;
      sizeId?: string;
      handle?: string;
    }
  ) =>
    postJson<{ options: import('./ai-generate-images.types').DesignRecipe[] }>(
      fetcher,
      '/ai-generate/design-system/ideate',
      payload
    ),

  loadCostHistory: async (fetcher: AiGenerateFetcher) =>
    getJson<CostHistoryResponse>(fetcher, '/ai-generate/cost-history'),

  estimateGenerationCost: async (
    fetcher: AiGenerateFetcher,
    payload: {
      slideCount: number;
      referenceCount: number;
      promptChars: number;
    }
  ) =>
    postJson<{ cost_estimate?: CostEstimate }>(
      fetcher,
      '/ai-generate/cost-estimate',
      payload
    ),

  loadGlobalReferenceManifest: async () => {
    const response = await window.fetch('/ai-references/manifest.json', {
      cache: 'no-store',
    });
    const data = await parseJson<{ files?: string[] }>(response);

    return {
      ok: response.ok,
      data,
      message: response.ok ? undefined : errorMessage(data),
    };
  },

  generateCompanyIdeas: async (
    fetcher: AiGenerateFetcher,
    payload: {
      topicHint?: string;
      companyContext?: string;
      language: string;
      textModel: string;
      existingTitles?: string[];
      brandProfileId?: string;
    }
  ) =>
    postJson<{ ideas?: CarouselIdea[] }>(
      fetcher,
      '/ai-generate/carousel-ideas',
      payload
    ),

  generateCarouselPlan: async (
    fetcher: AiGenerateFetcher,
    payload: Record<string, unknown>
  ) => postJson<CarouselPlan>(fetcher, '/ai-generate/carousel-plan', payload),

  generateCaption: async (
    fetcher: AiGenerateFetcher,
    payload: {
      title?: string;
      slides?: Array<{ headline?: string; body?: string }>;
      platform?: string;
      tone?: string;
      language?: string;
      companyContext?: string;
      forbiddenTerms?: string;
      defaultCta?: string;
      textModel?: string;
      brandProfileId?: string;
    }
  ) =>
    postJson<{ caption?: string; hashtags?: string[]; platform?: string }>(
      fetcher,
      '/ai-generate/carousel-caption',
      payload
    ),

  reviewCarousel: async (
    fetcher: AiGenerateFetcher,
    payload: Record<string, unknown>
  ) =>
    postJson<EditorialReview>(
      fetcher,
      '/ai-generate/carousel-review',
      payload
    ),

  fixCarousel: async (
    fetcher: AiGenerateFetcher,
    payload: Record<string, unknown>
  ) => postJson<CarouselPlan & { fixSummary?: string[] }>(
    fetcher,
    '/ai-generate/carousel-fix',
    payload
  ),

  // Fase 1 — Preview verdadeiro do design system: devolve o MESMO HTML por
  // slide que o Playwright renderiza no export (preview = resultado).
  previewDesignHtml: async (
    fetcher: AiGenerateFetcher,
    payload: Record<string, unknown>
  ) =>
    postJson<{
      recipe: Record<string, unknown>;
      slides: Array<{
        slideIndex: number;
        templateId?: string;
        role?: string;
        width: number;
        height: number;
        html: string;
      }>;
    }>(fetcher, '/ai-generate/carousel-design-jobs/preview', payload),

  // Etapa 2 — Direção de Arte por LLM: expande os briefings crus dos slides
  // em render briefs cinematográficos amarrados a um conceito de campanha.
  artDirectCarousel: async (
    fetcher: AiGenerateFetcher,
    payload: {
      title?: string;
      imageStyleGuide?: string;
      directionSummary?: string;
      brandName?: string;
      brandColors?: string;
      textModel?: string;
      slides: Array<{
        index: number;
        headline?: string;
        body?: string;
        cta?: string;
        imagePrompt?: string;
      }>;
    }
  ) =>
    postJson<{
      campaignConcept: string;
      slides: Array<{ index: number; renderBrief: string }>;
    }>(fetcher, '/ai-generate/art-direction', payload),

  createImageJob: async (
    fetcher: AiGenerateFetcher,
    slides: Array<{ slideIndex: number; request: Record<string, unknown> }>
  ) =>
    postJson<CarouselImageJob>(
      fetcher,
      '/ai-generate/carousel-image-jobs',
      { slides }
    ),

  generateImage: async (
    fetcher: AiGenerateFetcher,
    requestBody: Record<string, unknown>
  ) =>
    postJson<GenerateImageResponse>(
      fetcher,
      '/ai-generate/images',
      requestBody
    ),

  // Fase 3 — recompõe só a camada de texto sobre um fundo híbrido já gerado
  // (sem nova chamada ao modelo de imagem; custo ~zero).
  recomposeSlide: async (
    fetcher: AiGenerateFetcher,
    payload: { compose: Record<string, unknown> }
  ) =>
    postJson<GenerateImageResponse>(
      fetcher,
      '/ai-generate/hybrid/recompose',
      payload
    ),

  saveCarousel: async (
    fetcher: AiGenerateFetcher,
    payload: {
      title: string;
      projectMetadata: string;
      images: Array<{
        index: number;
        image: string;
        mediaId?: string;
        alt: string;
      }>;
    }
  ) => postJson<Array<{ id: string; path: string }>>(fetcher, '/media/carousel', payload),

  /** Fetch all active carousel templates from the backend. */
  listTemplates: async (fetcher: AiGenerateFetcher) =>
    getJson<{ templates: BackendTemplateDefinition[]; schemaVersion: string }>(
      fetcher,
      '/ai-generate/templates'
    ),

  /** Ask the backend to recommend templates based on context. */
  recommendTemplates: async (
    fetcher: AiGenerateFetcher,
    params: TemplateRecommendRequest
  ) =>
    postJson<TemplateRecommendResponse>(
      fetcher,
      '/ai-generate/templates/recommend',
      params
    ),

  /** Fire-and-forget: track a template usage event. */
  trackTemplateUsage: async (
    fetcher: AiGenerateFetcher,
    templateId: string,
    event: TemplateTrackEvent
  ) => {
    try {
      await fetcher('/ai-generate/templates/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, event }),
      });
    } catch {
      /* swallow — analytics must not break the UI */
    }
  },
};
