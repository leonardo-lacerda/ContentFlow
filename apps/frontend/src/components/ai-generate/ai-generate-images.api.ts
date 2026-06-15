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

  loadCompanyProfiles: async (fetcher: AiGenerateFetcher) =>
    getJson<{ companies?: CompanyProfile[]; selectedCompanyId?: string }>(
      fetcher,
      '/settings/company-profiles'
    ),

  saveCompanyProfile: async (
    fetcher: AiGenerateFetcher,
    company: CompanyProfile
  ) => postJson<CompanyProfile>(fetcher, '/settings/company-profiles', company),

  loadImageJob: async (fetcher: AiGenerateFetcher, id: string) =>
    getJson<CarouselImageJob>(
      fetcher,
      `/ai-generate/carousel-image-jobs/${id}`
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
  ) => postJson<unknown[]>(fetcher, '/media/carousel', payload),
};
