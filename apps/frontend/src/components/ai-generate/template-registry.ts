/**
 * Cache and fetcher for backend carousel templates.
 * Falls back gracefully when the backend is unavailable.
 */
import type { AiGenerateFetcher, ApiResult } from './ai-generate-images.api';
import type {
  BackendTemplateDefinition,
  TemplateListResponse,
  TemplateRecommendRequest,
  TemplateRecommendResponse,
  TemplateTrackEvent,
} from './template-registry.types';

// ---------------------------------------------------------------------------
// In-memory cache with 5-minute TTL
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  templates: BackendTemplateDefinition[];
  schemaVersion: string;
  fetchedAt: number;
};

let templateCache: CacheEntry | null = null;

const isCacheValid = () =>
  templateCache !== null && Date.now() - templateCache.fetchedAt < CACHE_TTL_MS;

/**
 * Invalidate the template cache so the next `fetchTemplates` call hits
 * the backend again. Useful after saving or activating templates.
 */
export const invalidateTemplateCache = () => {
  templateCache = null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const parseJson = async <T>(response: Response): Promise<T | null> =>
  response.json().catch(() => null);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch all active templates from the backend.
 * Returns `null` when the request fails (caller should fall back to static
 * defaults).  Results are cached in-memory for 5 minutes.
 */
export const fetchTemplates = async (
  fetcher: AiGenerateFetcher
): Promise<{ ok: boolean; templates: BackendTemplateDefinition[] | null; schemaVersion?: string; message?: string }> => {
  if (isCacheValid()) {
    return {
      ok: true,
      templates: templateCache!.templates,
      schemaVersion: templateCache!.schemaVersion,
    };
  }

  try {
    const response = await fetcher('/ai-generate/templates');
    const data = await parseJson<TemplateListResponse>(response);

    if (response.ok && data?.templates) {
      templateCache = {
        templates: data.templates,
        schemaVersion: data.schemaVersion,
        fetchedAt: Date.now(),
      };
      return {
        ok: true,
        templates: data.templates,
        schemaVersion: data.schemaVersion,
      };
    }

    return {
      ok: false,
      templates: null,
      message: 'Failed to load templates',
    };
  } catch {
    return {
      ok: false,
      templates: null,
      message: 'Network error loading templates',
    };
  }
};

/**
 * Ask the backend to rank templates by relevance to the given context.
 */
export const fetchRecommendations = async (
  fetcher: AiGenerateFetcher,
  params: TemplateRecommendRequest
): Promise<ApiResult<TemplateRecommendResponse>> => {
  const response = await fetcher('/ai-generate/templates/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await parseJson<TemplateRecommendResponse>(response);

  return {
    ok: response.ok,
    data,
    message: response.ok ? undefined : 'Failed to get recommendations',
  };
};

/**
 * Fire-and-forget tracking event for template usage analytics.
 * Never throws — errors are silently swallowed.
 */
export const trackTemplateUsage = async (
  fetcher: AiGenerateFetcher,
  templateId: string,
  event: TemplateTrackEvent
): Promise<void> => {
  try {
    await fetcher('/ai-generate/templates/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, event }),
    });
  } catch {
    // swallow — analytics failures must not break the UI
  }
};
