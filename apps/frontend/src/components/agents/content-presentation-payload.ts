export type ContentPresentationResolution = {
  operation: 'ideas' | 'carousel';
  payload: Record<string, any>;
};

/**
 * Studio renders an idea/carousel card from two independent paths: the
 * structured `contentPresentationTool` action and a text-fallback parser over
 * raw assistant messages. Retries and re-renders used to stack several
 * identical cards. This registry lets the first renderer of a given content
 * signature "own" that card so every other path with the same content skips it.
 * Ownership is keyed by a stable owner id, so re-renders of the same owner keep
 * rendering while a different message/path with identical content yields.
 */
const artifactCardOwners = new Map<string, string>();

export const resetArtifactCardOwners = () => artifactCardOwners.clear();

const signaturePart = (value: unknown) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const artifactSignature = (
  operation: string,
  payload: Record<string, any> | null | undefined
): string => {
  if (!payload) return '';
  if (operation === 'ideas') {
    const parts = (payload.ideas || [])
      .map((idea: any) => signaturePart(idea?.title || idea?.hook))
      .filter(Boolean);
    return parts.length ? `ideas:${parts.join('|')}` : '';
  }
  if (operation === 'carousel') {
    const parts = (payload.slides || [])
      .map((slide: any) => signaturePart(slide?.headline))
      .filter(Boolean);
    return parts.length ? `carousel:${parts.join('|')}` : '';
  }
  return '';
};

/**
 * Returns true when `ownerId` may render the card for `signature`: either it is
 * the first to claim it, or it already owns it. A structured render should win
 * over a text fallback, so pass `takeOver` to overwrite a previous owner.
 */
export const claimArtifactCard = (
  signature: string,
  ownerId: string,
  takeOver = false
): boolean => {
  if (!signature) return true;
  const current = artifactCardOwners.get(signature);
  if (!current || (takeOver && current !== ownerId)) {
    artifactCardOwners.set(signature, ownerId);
    return true;
  }
  return current === ownerId;
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
