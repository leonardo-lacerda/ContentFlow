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
    it('parses the synthetic group id and forwards the child ids and logo config', async () => {
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
      expect(mediaRepository.setCarouselLogo).toHaveBeenCalledWith('org-1', ['slide-1', 'slide-2'], logo);
      expect(result).toEqual({ ok: true });
    });

    it('passes null through to remove the logo when the request omits it', async () => {
      await service.setCarouselLogo('org-1', { groupId: 'carousel:slide-1:slide-2' });
      expect(mediaRepository.setCarouselLogo).toHaveBeenCalledWith('org-1', ['slide-1', 'slide-2'], null);
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
