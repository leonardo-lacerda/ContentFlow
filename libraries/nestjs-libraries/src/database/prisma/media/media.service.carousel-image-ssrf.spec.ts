// Same rationale as media.service.carousel-logo.spec.ts for mocking
// SubscriptionService's module chain.
jest.mock('@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service', () => ({
  SubscriptionService: class SubscriptionService {},
}));

// The HTTP-fetching layer itself (size cap, timeout, redirect blocking) has
// its own direct coverage in bounded-fetch.spec.ts. Here we mock it so these
// tests exercise MediaService's own logic in isolation - the URL-validation
// gate, and that a fetched remote image is re-hosted through the normal
// upload pipeline rather than trusted verbatim - without depending on this
// environment's real outbound-network behavior for "not found"/unreachable
// hosts (which isn't guaranteed to fail the way a unit test needs).
jest.mock('@gitroom/nestjs-libraries/upload/bounded-fetch', () => {
  const actual = jest.requireActual('@gitroom/nestjs-libraries/upload/bounded-fetch');
  return { ...actual, fetchBufferWithLimit: jest.fn() };
});

import { HttpException } from '@nestjs/common';
import * as webhookUrlValidator from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';
import { MediaService } from './media.service';
import {
  fetchBufferWithLimit,
  RemoteFetchError,
} from '@gitroom/nestjs-libraries/upload/bounded-fetch';

const mockedFetchBufferWithLimit = fetchBufferWithLimit as jest.MockedFunction<
  typeof fetchBufferWithLimit
>;

// Regression coverage for the carousel-image SSRF fix: `SaveMediaCarouselDto.images[].image`
// used to be trusted verbatim as `Media.path` whenever it looked like an
// http(s) URL, with no validation and no fetch at accept time - later
// re-fetched unguarded by CarouselImageCompositorService on every slide/zip
// download. Any authenticated org member could point it at cloud metadata or
// internal Docker-network services. The fix validates the URL with the same
// public-HTTPS/no-private-IP guard used elsewhere (this part uses the REAL
// guard, unmocked, so these tests prove the actual production check), then
// downloads it server-side with a size/time cap and re-hosts the bytes
// through the normal upload pipeline - so `Media.path` is always our own
// trusted storage URL.

describe('MediaService — carousel image SSRF guard (saveCarousel)', () => {
  let mediaRepository: Record<string, jest.Mock>;
  let storage: Record<string, jest.Mock>;
  let service: MediaService;

  beforeEach(() => {
    mediaRepository = {
      saveFile: jest.fn().mockImplementation((org, fileName, filePath) =>
        Promise.resolve({ id: 'saved-1', path: filePath })
      ),
      saveMediaInformation: jest.fn(),
    };
    storage = {
      uploadFile: jest.fn().mockResolvedValue({
        filename: 'abc.png',
        path: 'https://our-own-storage.example/uploads/abc.png',
        mimetype: 'image/png',
        originalname: 'abc.png',
      }),
    };
    service = new MediaService(
      mediaRepository as any,
      {} as any, // OpenaiService, unused
      {} as any, // SubscriptionService, unused
      {} as any, // VideoManager, unused
      {} as any // CarouselImageCompositorService, unused by saveCarousel
    );
    (service as any).storage = storage;
    mockedFetchBufferWithLimit.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const saveWithImage = (image: string) =>
    service.saveCarousel('org-1', {
      title: 'Meu Carrossel',
      images: [{ index: 1, image }],
    } as any);

  it('blocks a carousel image URL pointing at the cloud metadata address, without ever fetching it', async () => {
    await expect(saveWithImage('http://169.254.169.254/latest/meta-data/')).rejects.toBeInstanceOf(
      HttpException
    );
    expect(mockedFetchBufferWithLimit).not.toHaveBeenCalled();
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it('blocks a carousel image URL pointing at localhost', async () => {
    await expect(saveWithImage('http://localhost:6379/')).rejects.toBeInstanceOf(HttpException);
    expect(mockedFetchBufferWithLimit).not.toHaveBeenCalled();
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it('blocks a carousel image URL pointing at a loopback IP', async () => {
    await expect(saveWithImage('http://127.0.0.1:5432/')).rejects.toBeInstanceOf(HttpException);
    expect(mockedFetchBufferWithLimit).not.toHaveBeenCalled();
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it('blocks a carousel image URL pointing at a Docker-internal/private address', async () => {
    await expect(saveWithImage('http://172.18.0.5:9200/_cluster/health')).rejects.toBeInstanceOf(
      HttpException
    );
    expect(mockedFetchBufferWithLimit).not.toHaveBeenCalled();
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it('blocks a plain http:// (non-HTTPS) remote image URL even for a public-looking host', async () => {
    await expect(saveWithImage('http://example.com/image.png')).rejects.toBeInstanceOf(HttpException);
    expect(mockedFetchBufferWithLimit).not.toHaveBeenCalled();
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it('blocks an IPv6 loopback/link-local carousel image URL', async () => {
    await expect(saveWithImage('http://[::1]/')).rejects.toBeInstanceOf(HttpException);
    expect(mockedFetchBufferWithLimit).not.toHaveBeenCalled();
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it('downloads a legitimate public HTTPS image and re-hosts it through the normal upload pipeline, never storing the raw external URL', async () => {
    jest.spyOn(webhookUrlValidator, 'isSafePublicHttpsUrl').mockResolvedValue(true);
    mockedFetchBufferWithLimit.mockResolvedValue({
      buffer: Buffer.from('fake-jpeg-bytes'),
      contentType: 'image/jpeg',
    });

    const result = await saveWithImage('https://images.unsplash.com/photo.jpg');

    expect(mockedFetchBufferWithLimit).toHaveBeenCalledTimes(1);
    const [, fetchOptions] = mockedFetchBufferWithLimit.mock.calls[0];
    expect(fetchOptions).toMatchObject({ blockRedirects: true });
    expect(fetchOptions.dispatcher).toBeDefined(); // must go through the SSRF-safe dispatcher

    expect(storage.uploadFile).toHaveBeenCalledTimes(1);
    const uploadArg = storage.uploadFile.mock.calls[0][0];
    expect(uploadArg.mimetype).toBe('image/jpeg');
    expect(uploadArg.buffer.toString()).toBe('fake-jpeg-bytes');

    // Media.path must end up as OUR storage's URL, never the attacker/
    // externally-supplied one.
    expect(mediaRepository.saveFile).toHaveBeenCalledWith(
      'org-1',
      expect.any(String),
      'https://our-own-storage.example/uploads/abc.png',
      expect.any(String)
    );
    expect(result).toBeDefined();
  });

  it('rejects when the download exceeds the size/time bound, without ever calling storage.uploadFile', async () => {
    jest.spyOn(webhookUrlValidator, 'isSafePublicHttpsUrl').mockResolvedValue(true);
    mockedFetchBufferWithLimit.mockRejectedValue(new RemoteFetchError('Response exceeds the allowed size limit'));

    await expect(saveWithImage('https://images.unsplash.com/huge.jpg')).rejects.toBeInstanceOf(
      HttpException
    );
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it('rejects a blocked-redirect failure instead of ever trusting an unvalidated redirect target', async () => {
    jest.spyOn(webhookUrlValidator, 'isSafePublicHttpsUrl').mockResolvedValue(true);
    mockedFetchBufferWithLimit.mockRejectedValue(new RemoteFetchError('Redirects are not allowed'));

    await expect(saveWithImage('https://images.unsplash.com/redirector')).rejects.toBeInstanceOf(
      HttpException
    );
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it('still accepts a base64 data-URL image (unrelated code path, must keep working)', async () => {
    const buffer = Buffer.from('tiny-fake-image');
    const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;

    await saveWithImage(dataUrl);

    expect(mockedFetchBufferWithLimit).not.toHaveBeenCalled();
    expect(storage.uploadFile).toHaveBeenCalledTimes(1);
    expect(storage.uploadFile.mock.calls[0][0].mimetype).toBe('image/png');
  });
});
