'use client';

import { useState, useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { socialPostsApi } from './social-posts.api';
import type {
  GenerateSocialPostsParams,
  SocialPostBatch,
} from './social-posts.types';

export function useSocialPosts() {
  const fetch = useFetch();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SocialPostBatch | null>(null);

  const generate = useCallback(
    async (params: GenerateSocialPostsParams) => {
      setGenerating(true);
      setError(null);
      try {
        const response = await socialPostsApi.generate(fetch, params);
        if (!response.ok || !response.data) {
          throw new Error(response.message || 'Failed to generate posts');
        }
        setResult(response.data);
        return response.data;
      } catch (err: any) {
        const msg = err.message || 'Failed to generate posts';
        setError(msg);
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    [fetch]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { generate, generating, error, result, reset };
}
