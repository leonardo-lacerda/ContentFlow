jest.mock('@gitroom/nestjs-libraries/upload/bounded-fetch', () => {
  const actual = jest.requireActual('@gitroom/nestjs-libraries/upload/bounded-fetch');
  return { ...actual, fetchBufferWithLimit: jest.fn() };
});

import * as webhookUrlValidator from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';
import { fetchBufferWithLimit } from '@gitroom/nestjs-libraries/upload/bounded-fetch';
import { fetchMediaForPublish } from './safe-media-fetch';

const mockedFetchBufferWithLimit = fetchBufferWithLimit as jest.MockedFunction<
  typeof fetchBufferWithLimit
>;

// Regression coverage for the 2026-08-20 audit's SSRF finding, extended past
// the original carousel-specific scope: every social provider's `.post()`
// downloads `post.media[].path` server-side to re-upload it to that
// platform's API. That value is caller-controlled (a chat tool's
// `attachments: string[]` field accepts any string), so the same guard
// applied to carousel images/logos must apply here too.

describe('fetchMediaForPublish', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mockedFetchBufferWithLimit.mockReset();
    process.env.FRONTEND_URL = 'http://localhost:4200';
    process.env.MAIN_URL = 'https://app.contentflow.example';
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('fetches an own-storage URL (matching FRONTEND_URL, e.g. local dev) directly, without the public-HTTPS guard', async () => {
    mockedFetchBufferWithLimit.mockResolvedValue({
      buffer: Buffer.from('video-bytes'),
      contentType: 'video/mp4',
    });

    const result = await fetchMediaForPublish('http://localhost:4200/uploads/2026/08/x.mp4');

    expect(result.buffer.toString()).toBe('video-bytes');
    const [, options] = mockedFetchBufferWithLimit.mock.calls[0];
    expect(options.dispatcher).toBeUndefined(); // no SSRF dispatcher needed for our own origin
  });

  it('fetches an own-storage URL matching MAIN_URL (production) directly too', async () => {
    mockedFetchBufferWithLimit.mockResolvedValue({ buffer: Buffer.from('x'), contentType: null });
    await fetchMediaForPublish('https://app.contentflow.example/uploads/x.png');
    const [, options] = mockedFetchBufferWithLimit.mock.calls[0];
    expect(options.dispatcher).toBeUndefined();
  });

  it('rejects a media URL pointing at the cloud metadata address', async () => {
    await expect(
      fetchMediaForPublish('http://169.254.169.254/latest/meta-data/')
    ).rejects.toThrow(/not allowed/);
    expect(mockedFetchBufferWithLimit).not.toHaveBeenCalled();
  });

  it('rejects a media URL pointing at a Docker-internal/private address', async () => {
    await expect(
      fetchMediaForPublish('http://172.18.0.5:6379/')
    ).rejects.toThrow(/not allowed/);
    expect(mockedFetchBufferWithLimit).not.toHaveBeenCalled();
  });

  it('rejects a plain http:// URL for a third-party (non-own-origin) host', async () => {
    await expect(
      fetchMediaForPublish('http://attacker-controlled.example/payload.png')
    ).rejects.toThrow(/not allowed/);
    expect(mockedFetchBufferWithLimit).not.toHaveBeenCalled();
  });

  it('fetches a legitimate third-party HTTPS media URL through the SSRF-safe dispatcher', async () => {
    jest.spyOn(webhookUrlValidator, 'isSafePublicHttpsUrl').mockResolvedValue(true);
    mockedFetchBufferWithLimit.mockResolvedValue({
      buffer: Buffer.from('remote-bytes'),
      contentType: 'image/png',
    });

    const result = await fetchMediaForPublish('https://images.example.com/photo.png');

    expect(result.buffer.toString()).toBe('remote-bytes');
    const [, options] = mockedFetchBufferWithLimit.mock.calls[0];
    expect(options.dispatcher).toBeDefined();
    expect(options.blockRedirects).toBe(true);
  });
});
