/**
 * The Studio composer embeds structured, machine-readable blocks in the plain
 * text it sends as a chat message - e.g. a button click becomes
 * `[--content-action--]\nACTION: ...\nPAYLOAD: {...}\n[--content-action--]`
 * appended to (or replacing) what the user typed, and the agent's prompt
 * (load.tools.service.ts) instructs the MODEL to parse these markers back out
 * of the raw text. That's a deliberate, documented trade-off (see the comment
 * on `liveSendMessage` in agent.chat.tsx): CopilotKit's only reliable send
 * path here is the plain chat-message channel, since the structured
 * `sendMessage` API is gated behind a paid CopilotKit Cloud key and the
 * legacy `appendMessage` API silently drops the run.
 *
 * A cleaner fix - having the backend parse these markers out of the incoming
 * request and pass them through RequestContext the same way it already does
 * for brandContext/studioAttachments/organization - was investigated and
 * intentionally NOT implemented: every existing read of the CopilotKit
 * request body in copilot.controller.ts (e.g. the threadId fallback chain at
 * `req.body?.threadId || req.body?.thread?.id || req.body?.variables?.threadId`)
 * already hedges across multiple possible shapes rather than asserting one
 * confidently, which means nobody has verified the exact GraphQL variable
 * path for the current user message with real traffic. Building new
 * request-context logic on that unverified a path would repeat the same
 * "sometimes fires, sometimes doesn't" failure pattern this whole robustness
 * pass exists to eliminate, not fix it. Flagged as a follow-up in
 * docs/studio-robustness-audit.md (R4) rather than guessed at here.
 *
 * What IS safe to make deterministic today: regardless of which side (model
 * or human) is meant to read a marker block, every UI surface that displays
 * the raw message text needs to strip it from view. That stripping was
 * previously duplicated as ad-hoc, untested regex chains in two places
 * (the assistant-message renderer and the user-message renderer in
 * agent.chat.tsx). This module is the single, tested source of truth for it.
 */
const STUDIO_MARKER_NAMES = [
  'integrations',
  'creation-options',
  'contentflow-intent',
  'content-action',
] as const;

export type StudioMarkerName = (typeof STUDIO_MARKER_NAMES)[number];

/**
 * Removes every `[--name--]...[--name--]` block for the given marker name(s)
 * from `content`. Defaults to all known Studio markers. Non-greedy and
 * multiline-safe (payloads commonly contain formatted JSON).
 */
export const stripStudioMarkerBlocks = (
  content: string,
  markers: readonly StudioMarkerName[] = STUDIO_MARKER_NAMES
): string =>
  markers.reduce((text, name) => {
    const pattern = new RegExp(`\\[--${name}--\\][\\s\\S]*?\\[--${name}--\\]`, 'g');
    return text.replace(pattern, '');
  }, content);
