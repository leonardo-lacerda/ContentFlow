import { isSafePublicHttpsUrl } from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';
import { ssrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
import { fetchBufferWithLimit } from '@gitroom/nestjs-libraries/upload/bounded-fetch';

// Matches the existing upload-time ceiling for video attachments
// (custom.upload.validation.ts) — a publish-time fetch should never need
// more bytes than an upload was ever allowed to store.
const DEFAULT_MAX_MEDIA_BYTES = 1024 * 1024 * 1024;
const DEFAULT_MEDIA_FETCH_TIMEOUT_MS = 120_000;

function isOwnStorageOrigin(url: string): boolean {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return false;
  }
  for (const base of [
    process.env.FRONTEND_URL,
    process.env.MAIN_URL,
    process.env.NEXT_PUBLIC_BACKEND_URL,
  ]) {
    if (!base) continue;
    try {
      if (new URL(base).origin === target.origin) return true;
    } catch {
      // Malformed env value — not a match, keep checking the others.
    }
  }
  return false;
}

/**
 * Every social provider's `.post()` needs to download the org's attached
 * media (image/video) so it can re-upload the bytes to that platform's own
 * API. That media value (`post.media[].path` / a chat tool's `attachments`
 * array) is a plain string the caller controls — normally it's this app's
 * own `Media.path` (produced by the upload pipeline, org-scoped, magic-byte
 * validated), but nothing at the type level stops it from being an
 * arbitrary URL, so every fetch of it must be treated as attacker-supplied
 * unless it's provably one of this app's own storage/backend origins.
 *
 * Own-origin URLs skip the public-HTTPS/no-private-IP guard and
 * ssrfSafeDispatcher on purpose: local dev's own storage is legitimately
 * `http://localhost:PORT/uploads/...`, which that guard would incorrectly
 * block as "unsafe" (same reasoning as
 * CarouselImageCompositorService.fetchImageBuffer). Everything else must
 * pass the full public-HTTPS-only, no-private/loopback-IP check and is
 * fetched through the SSRF-safe dispatcher, which pins the resolved
 * address at connect time and blocks redirects to an unvalidated target.
 */
export async function fetchMediaForPublish(
  url: string,
  options: { maxBytes?: number; timeoutMs?: number } = {}
): Promise<{ buffer: Buffer; contentType: string | null }> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_MEDIA_BYTES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_MEDIA_FETCH_TIMEOUT_MS;

  if (isOwnStorageOrigin(url)) {
    return fetchBufferWithLimit(url, { maxBytes, timeoutMs });
  }

  if (!(await isSafePublicHttpsUrl(url))) {
    throw new Error(`Media URL is not allowed: ${url}`);
  }

  return fetchBufferWithLimit(url, {
    dispatcher: ssrfSafeDispatcher,
    maxBytes,
    timeoutMs,
    blockRedirects: true,
  });
}
