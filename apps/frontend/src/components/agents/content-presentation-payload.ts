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
 *
 * Owner ids are namespaced with a `structured:` or `text:` prefix (see
 * `claimArtifactCard`) so ownership transfer only ever flows one direction:
 * a structured render may reclaim a card from a stale text-fallback owner, but
 * never from another structured owner. Two *different* structured tool calls
 * that happen to carry identical content (the actual bug this was built to
 * catch: the model re-emitting the same ideas/carousel card) are therefore
 * still mutually exclusive — first claim wins, the second yields.
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
    // Includes each slide's image state (not just the headline) so a
    // legitimate follow-up render of the *same* carousel — the agent re-calling
    // contentPresentationTool once generated images replace placeholders —
    // produces a different signature and is not mistaken for a duplicate.
    const parts = (payload.slides || [])
      .map((slide: any) =>
        signaturePart(`${slide?.headline}|${slide?.imageUrl || slide?.image?.url || ''}`)
      )
      .filter(Boolean);
    return parts.length ? `carousel:${parts.join('|')}` : '';
  }
  return '';
};

/**
 * Returns true when `ownerId` may render the card for `signature`.
 *
 * - No owner yet, or `ownerId` already owns it (e.g. a re-render of the same
 *   tool call as its status advances): claims/keeps ownership, renders.
 * - A different owner already holds it: yields (renders nothing) UNLESS
 *   `takeOver` is set AND the current owner is a stale `text:`-fallback render
 *   — a structured tool result should always supersede a text-parsed guess of
 *   the same content, but must never steal a card from another *structured*
 *   owner, since that would just let a genuine duplicate tool call win instead
 *   of being suppressed.
 */
export const claimArtifactCard = (
  signature: string,
  ownerId: string,
  takeOver = false
): boolean => {
  if (!signature) return true;
  const current = artifactCardOwners.get(signature);
  if (!current || current === ownerId) {
    artifactCardOwners.set(signature, ownerId);
    return true;
  }
  if (takeOver && current.startsWith('text:') && !ownerId.startsWith('text:')) {
    artifactCardOwners.set(signature, ownerId);
    return true;
  }
  return false;
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
