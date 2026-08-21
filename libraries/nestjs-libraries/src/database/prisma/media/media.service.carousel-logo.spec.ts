// media.service.ts imports SubscriptionService, whose module chain pulls in
// IntegrationService -> integration.manager.ts -> nostr.provider.ts ->
// nostr-tools, an ESM package Jest can't parse out of the box (pre-existing
// gap, unrelated to this file - see creative-catalog.tool.spec.ts for the
// same rationale/pattern). This spec injects its own fake SubscriptionService
// via the constructor anyway, so the real implementation is never used -
// mock the module out rather than chase the transitive ESM chain.
jest.mock('@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service', () => ({
  SubscriptionService: class SubscriptionService {},
}));

import { NotFoundException } from '@nestjs/common';
import { MediaService } from './media.service';
import { serializeCarouselProjectMetadata } from './media.repository';

// Focused spec for the carousel-logo/download methods added to MediaService -
// the other methods (video generation, AI image generation, etc.) are
// unrelated and already have their own coverage elsewhere/none at all; this
// file only exercises the new write path (setCarouselLogo) and the two
// download paths (single slide, zip), which orchestrate MediaRepository +
// CarouselImageCompositorService and had no coverage before this feature.

describe('MediaService — carousel logo & downloads', () => {
  let mediaRepository: Record<string, jest.Mock>;
  let compositor: Record<string, jest.Mock>;
  let service: MediaService;

  const group = [
    { id: 'slide-1', name: 'carousel-slide-01', originalName: 'Carrossel: Meu Post (2026-08-17 10:00)', path: 'https://cdn/1.png', alt: null, createdAt: new Date() },
    { id: 'slide-2', name: 'carousel-slide-02', originalName: 'Carrossel: Meu Post (2026-08-17 10:00)', path: 'https://cdn/2.png', alt: null, createdAt: new Date() },
  ];

  beforeEach(() => {
    mediaRepository = {
      setCarouselLogo: jest.fn().mockResolvedValue({ id: 'slide-1' }),
      getCarouselGroup: jest.fn().mockResolvedValue(group),
      getMediaById: jest.fn().mockResolvedValue({ id: 'logo-1', path: 'https://cdn/logo.png' }),
    };
    compositor = {
      renderSlide: jest.fn().mockResolvedValue(Buffer.from('fake-png-bytes')),
      streamZip: jest.fn().mockResolvedValue(undefined),
    };
    service = new MediaService(
      mediaRepository as any,
      {} as any, // OpenaiService, unused by these methods
      {} as any, // SubscriptionService, unused by these methods
      {} as any, // VideoManager, unused by these methods
      compositor as any
    );
  });

  describe('setCarouselLogo', () => {
    it('parses the synthetic group id, verifies the logo media belongs to the org, and forwards its own stored path', async () => {
      const logo = {
        mediaId: 'logo-1',
        url: 'https://cdn/logo.png',
        position: 'top-right' as const,
        widthPct: 18,
        opacity: 1,
      };
      const result = await service.setCarouselLogo('org-1', {
        groupId: 'carousel:slide-1:slide-2',
        logo,
      });
      expect(mediaRepository.getMediaById).toHaveBeenCalledWith('org-1', 'logo-1');
      expect(mediaRepository.setCarouselLogo).toHaveBeenCalledWith(
        'org-1',
        ['slide-1', 'slide-2'],
        expect.objectContaining({ mediaId: 'logo-1', url: 'https://cdn/logo.png', position: 'top-right' })
      );
      expect(result).toEqual({ ok: true });
    });

    // Regression test for the SSRF fix: `logo.url` in the request body must
    // never be trusted, even when it points at an internal/cloud-metadata
    // address - only the URL that was actually stored on the org's own
    // media row (looked up server-side by mediaId) may ever reach the
    // compositor's later unguarded fetch().
    it('ignores a client-supplied logo.url entirely and always uses the media row\'s own stored path', async () => {
      mediaRepository.getMediaById.mockResolvedValue({
        id: 'logo-1',
        path: 'https://cdn/trusted-logo.png',
      });
      const logo = {
        mediaId: 'logo-1',
        url: 'http://169.254.169.254/latest/meta-data/', // attacker-supplied, must be discarded
        position: 'center' as const,
        widthPct: 20,
        opacity: 1,
      };
      await service.setCarouselLogo('org-1', {
        groupId: 'carousel:slide-1:slide-2',
        logo,
      });
      const [, , storedLogo] = mediaRepository.setCarouselLogo.mock.calls[0];
      expect(storedLogo.url).toBe('https://cdn/trusted-logo.png');
      expect(storedLogo.url).not.toContain('169.254.169.254');
    });

    it('throws NotFoundException when the logo mediaId does not belong to this org (or does not exist)', async () => {
      mediaRepository.getMediaById.mockResolvedValue(null);
      await expect(
        service.setCarouselLogo('org-1', {
          groupId: 'carousel:slide-1:slide-2',
          logo: {
            mediaId: 'someone-elses-media',
            url: 'https://cdn/logo.png',
            position: 'center' as const,
            widthPct: 20,
            opacity: 1,
          },
        })
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mediaRepository.setCarouselLogo).not.toHaveBeenCalled();
    });

    it('passes null through to remove the logo when the request omits it', async () => {
      await service.setCarouselLogo('org-1', { groupId: 'carousel:slide-1:slide-2' });
      expect(mediaRepository.setCarouselLogo).toHaveBeenCalledWith('org-1', ['slide-1', 'slide-2'], null);
      expect(mediaRepository.getMediaById).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the repository finds no matching carousel', async () => {
      mediaRepository.setCarouselLogo.mockResolvedValue(null);
      await expect(
        service.setCarouselLogo('org-1', { groupId: 'carousel:not-mine' })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a malformed group id before ever touching the repository', async () => {
      await expect(
        service.setCarouselLogo('org-1', { groupId: 'not-a-carousel-id' })
      ).rejects.toThrow(/Invalid carousel group id/);
      expect(mediaRepository.setCarouselLogo).not.toHaveBeenCalled();
    });
  });

  describe('downloadCarouselSlide', () => {
    it('renders the requested slide with the carousel\'s current logo and a predictable filename', async () => {
      mediaRepository.getCarouselGroup.mockResolvedValue([
        { ...group[0], alt: serializeCarouselProjectMetadata({ logo: { mediaId: 'l1', url: 'https://cdn/logo.png', position: 'center', widthPct: 20, opacity: 1 } }) },
        group[1],
      ]);

      const result = await service.downloadCarouselSlide('org-1', 'carousel:slide-1:slide-2', 'slide-2');

      expect(compositor.renderSlide).toHaveBeenCalledWith(
        'https://cdn/2.png',
        expect.objectContaining({ mediaId: 'l1' })
      );
      expect(result.filename).toBe('meu-post-slide-02.png');
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('renders with no logo when none is configured', async () => {
      await service.downloadCarouselSlide('org-1', 'carousel:slide-1:slide-2', 'slide-1');
      expect(compositor.renderSlide).toHaveBeenCalledWith('https://cdn/1.png', null);
    });

    it('throws NotFoundException when the requested slide is not part of the group', async () => {
      await expect(
        service.downloadCarouselSlide('org-1', 'carousel:slide-1:slide-2', 'not-in-group')
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when the carousel itself resolves to no rows (wrong org)', async () => {
      mediaRepository.getCarouselGroup.mockResolvedValue([]);
      await expect(
        service.downloadCarouselSlide('org-1', 'carousel:slide-1', 'slide-1')
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('renderCarouselForZip / streamZipTo', () => {
    it('renders every slide in the group and names them sequentially', async () => {
      const { title, entries } = await service.renderCarouselForZip('org-1', 'carousel:slide-1:slide-2');
      expect(title).toBe('meu-post');
      expect(entries).toHaveLength(2);
      expect(entries[0].filename).toBe('meu-post-slide-01.png');
      expect(entries[1].filename).toBe('meu-post-slide-02.png');
      expect(compositor.renderSlide).toHaveBeenCalledTimes(2);
    });

    it('delegates streaming to the compositor', async () => {
      const fakeStream = {} as any;
      const entries = [{ filename: 'a.png', buffer: Buffer.from('x') }];
      await service.streamZipTo(fakeStream, entries);
      expect(compositor.streamZip).toHaveBeenCalledWith(fakeStream, entries);
    });
  });
});
