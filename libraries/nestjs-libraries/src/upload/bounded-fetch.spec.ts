import { fetchBufferWithLimit, RemoteFetchError } from './bounded-fetch';

// `Buffer.from(str).buffer` is NOT reliably sized to `str` - for short
// strings Node allocates from an internal shared pool, so `.buffer` can be
// the whole (much larger) pool ArrayBuffer. `new Uint8Array(buf)` copies into
// a correctly-sized, unpooled ArrayBuffer, matching what a real fetch
// Response.arrayBuffer() would return.
function toArrayBuffer(text: string): ArrayBuffer {
  return new Uint8Array(Buffer.from(text, 'utf8')).buffer;
}

function fakeStream(chunks: Buffer[]) {
  let i = 0;
  return {
    getReader() {
      return {
        async read() {
          if (i >= chunks.length) return { done: true, value: undefined };
          const value = chunks[i++];
          return { done: false, value };
        },
        async cancel() {
          i = chunks.length;
        },
      };
    },
  };
}

function mockFetchResponse(overrides: Partial<Record<string, unknown>> = {}) {
  const headers = new Map<string, string>(
    Object.entries((overrides.headersMap as Record<string, string>) || {})
  );
  return {
    ok: overrides.ok ?? true,
    status: overrides.status ?? 200,
    headers: { get: (k: string) => headers.get(k.toLowerCase()) ?? null },
    body: overrides.body ?? undefined,
    arrayBuffer: overrides.arrayBuffer ?? (async () => toArrayBuffer('ok')),
  };
}

describe('fetchBufferWithLimit', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('returns the full buffer and content-type for a small, well-behaved response', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockFetchResponse({
        headersMap: { 'content-type': 'image/png', 'content-length': '5' },
        arrayBuffer: async () => toArrayBuffer('hello'),
      })
    ) as any;

    const { buffer, contentType } = await fetchBufferWithLimit('https://example.com/x.png', {
      maxBytes: 1024,
      timeoutMs: 5000,
    });

    expect(buffer.toString()).toBe('hello');
    expect(contentType).toBe('image/png');
  });

  it('rejects up front when Content-Length exceeds the limit, without reading the body', async () => {
    const arrayBuffer = jest.fn();
    global.fetch = jest.fn().mockResolvedValue(
      mockFetchResponse({
        headersMap: { 'content-length': String(10 * 1024 * 1024) },
        arrayBuffer,
      })
    ) as any;

    await expect(
      fetchBufferWithLimit('https://example.com/huge.png', { maxBytes: 1024, timeoutMs: 5000 })
    ).rejects.toBeInstanceOf(RemoteFetchError);
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it('rejects mid-stream when a server omits/lies about Content-Length but sends too many bytes', async () => {
    const bigChunk = Buffer.alloc(2000, 'a');
    global.fetch = jest.fn().mockResolvedValue(
      mockFetchResponse({ body: fakeStream([bigChunk, bigChunk]) })
    ) as any;

    await expect(
      fetchBufferWithLimit('https://example.com/huge.png', { maxBytes: 1024, timeoutMs: 5000 })
    ).rejects.toBeInstanceOf(RemoteFetchError);
  });

  it('rejects a non-2xx response', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockFetchResponse({ ok: false, status: 404 })) as any;
    await expect(
      fetchBufferWithLimit('https://example.com/missing.png', { maxBytes: 1024, timeoutMs: 5000 })
    ).rejects.toBeInstanceOf(RemoteFetchError);
  });

  it('blocks a 3xx redirect when blockRedirects is set (classic SSRF-via-redirect bypass)', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockFetchResponse({ status: 302 })) as any;
    await expect(
      fetchBufferWithLimit('https://example.com/redirect', {
        maxBytes: 1024,
        timeoutMs: 5000,
        blockRedirects: true,
      })
    ).rejects.toThrow(/[Rr]edirect/);
  });

  it('passes redirect through when blockRedirects is not set', async () => {
    // 'follow' just needs to be threaded to fetch(); a manually-crafted 3xx
    // mock response with no real redirect target is treated as the final
    // response since our mock never actually follows it.
    global.fetch = jest.fn().mockResolvedValue(
      mockFetchResponse({ headersMap: { 'content-type': 'image/png' } })
    ) as any;
    await fetchBufferWithLimit('https://example.com/ok.png', { maxBytes: 1024, timeoutMs: 5000 });
    expect((global.fetch as jest.Mock).mock.calls[0][1]).toMatchObject({ redirect: 'follow' });
  });

  it('aborts and throws when the fetch takes longer than timeoutMs', async () => {
    global.fetch = jest.fn().mockImplementation(
      (_url: string, init: any) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new Error('aborted')));
        })
    ) as any;

    await expect(
      fetchBufferWithLimit('https://example.com/slow.png', { maxBytes: 1024, timeoutMs: 20 })
    ).rejects.toBeInstanceOf(RemoteFetchError);
  });
});
