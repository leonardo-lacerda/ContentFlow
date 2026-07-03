import type {
  GenerateSocialPostsParams,
  SocialPostBatch,
} from './social-posts.types';

export type SocialPostsFetcher = (
  input: string,
  init?: RequestInit
) => Promise<Response>;

type ApiResult<T> = {
  ok: boolean;
  data: T | null;
  message?: string;
};

const parseJson = async <T>(response: Response, fallback: T | null = null) =>
  (await response.json().catch(() => fallback)) as T | null;

const errorMessage = (data: unknown) => {
  if (!data || typeof data !== 'object') return undefined;
  const payload = data as { message?: string; error?: string };
  return payload.message || payload.error;
};

const getJson = async <T>(
  fetcher: SocialPostsFetcher,
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
  fetcher: SocialPostsFetcher,
  url: string,
  body: unknown
): Promise<ApiResult<T>> => {
  const response = await fetcher(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parseJson<T>(response);
  return {
    ok: response.ok,
    data,
    message: response.ok ? undefined : errorMessage(data),
  };
};

export const socialPostsApi = {
  generate: async (
    fetcher: SocialPostsFetcher,
    params: GenerateSocialPostsParams
  ) => postJson<SocialPostBatch>(fetcher, '/social-posts/generate', params),

  getPostsFromIdea: async (fetcher: SocialPostsFetcher, ideaId: string) =>
    getJson<any[]>(fetcher, `/social-posts/from-idea/${ideaId}`),

  getPostsFromCarousel: async (fetcher: SocialPostsFetcher, carouselId: string) =>
    getJson<any[]>(fetcher, `/social-posts/from-carousel/${carouselId}`),
};
