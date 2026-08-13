export type ContentPresentationResolution = {
  operation: 'ideas' | 'carousel';
  payload: Record<string, any>;
};

/**
 * Resolves the current tool payload without retaining render history. React
 * can call this repeatedly while a streamed message settles; the same valid
 * artifact must remain renderable on every call.
 */
export const resolveContentPresentation = (
  args?: Record<string, any>,
  status?: string
): ContentPresentationResolution | null => {
  if (status === 'inProgress') return null;
  const rawPayload = (args || {}) as Record<string, any>;
  const firstResult = rawPayload.result as Record<string, any> | undefined;
  const payload = (
    firstResult?.ideas || firstResult?.slides
      ? firstResult
      : firstResult?.result || rawPayload
  ) as Record<string, any>;
  const operation =
    payload.operation ||
    (payload.ideas?.length ? 'ideas' : payload.slides?.length ? 'carousel' : '');
  if (operation === 'ideas' && payload.ideas?.length) {
    return { operation: 'ideas', payload };
  }
  if (operation === 'carousel' && payload.slides?.length) {
    return { operation: 'carousel', payload };
  }
  return null;
};
