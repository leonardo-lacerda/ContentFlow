// Shared helper for every place in the codebase that downloads a remote
// resource into memory. Centralizes the two protections that were missing
// from ad-hoc `fetch()` calls: a hard cap on response size (checked both via
// Content-Length and while streaming, since a server can omit or lie about
// Content-Length) and a hard timeout — both needed independently of whether
// the URL itself is trusted, because even a trusted host can be slow or
// return an unexpectedly large body.
export interface FetchBufferWithLimitOptions {
  // Pass `ssrfSafeDispatcher` when `url` is (even partially) attacker- or
  // user-supplied. Omit for URLs the server itself produced (e.g. its own
  // storage paths), where the safe dispatcher would incorrectly block
  // legitimate `http://localhost:PORT/uploads/...` targets in local dev.
  dispatcher?: unknown;
  maxBytes: number;
  timeoutMs: number;
  // Redirects are a classic SSRF bypass: an attacker-controlled server can
  // pass an initial URL-shape check and then 302 to an internal address that
  // was never validated. Block them for untrusted URLs; safe to allow for
  // the server's own trusted storage URLs.
  blockRedirects?: boolean;
}

export class RemoteFetchError extends Error {}

export async function fetchBufferWithLimit(
  url: string,
  options: FetchBufferWithLimitOptions
): Promise<{ buffer: Buffer; contentType: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        redirect: options.blockRedirects ? 'manual' : 'follow',
        // @ts-expect-error undici dispatcher is not part of the DOM fetch type.
        dispatcher: options.dispatcher,
      });
    } catch (err) {
      if (controller.signal.aborted) {
        throw new RemoteFetchError(`Timed out fetching ${url}`);
      }
      throw new RemoteFetchError(
        `Failed to fetch ${url}: ${(err as Error)?.message || err}`
      );
    }

    if (options.blockRedirects && response.status >= 300 && response.status < 400) {
      throw new RemoteFetchError(`Redirects are not allowed for ${url}`);
    }
    if (!response.ok) {
      throw new RemoteFetchError(`Failed to fetch (${response.status}): ${url}`);
    }

    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    if (contentLength && Number(contentLength) > options.maxBytes) {
      throw new RemoteFetchError(`Response exceeds the allowed size limit: ${url}`);
    }

    if (!response.body) {
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > options.maxBytes) {
        throw new RemoteFetchError(`Response exceeds the allowed size limit: ${url}`);
      }
      return { buffer, contentType };
    }

    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > options.maxBytes) {
          await reader.cancel().catch(() => undefined);
          throw new RemoteFetchError(`Response exceeds the allowed size limit: ${url}`);
        }
        chunks.push(Buffer.from(value));
      }
    }
    return { buffer: Buffer.concat(chunks), contentType };
  } finally {
    clearTimeout(timeout);
  }
}
