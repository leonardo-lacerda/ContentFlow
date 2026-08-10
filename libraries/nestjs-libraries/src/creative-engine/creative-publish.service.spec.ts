jest.mock('@gitroom/nestjs-libraries/database/prisma/posts/posts.service', () => ({ PostsService: class PostsService {} }));
jest.mock('@gitroom/nestjs-libraries/database/prisma/integrations/integration.service', () => ({ IntegrationService: class IntegrationService {} }));
jest.mock('@gitroom/helpers/utils/sanitize.post.content', () => ({
  sanitizePostContent: (value: unknown) => String(value).replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ''),
}));

import { CreativePublishService } from './creative-publish.service';

describe('CreativePublishService', () => {
  it('publishes a ready variant once and records the publication', async () => {
    const prisma = {
      creativeVariant: { findFirst: jest.fn().mockResolvedValue({ id: 'variant-1', status: 'READY', videoUrl: 'https://cdn.example/video.mp4', thumbnailUrl: null, output: {} }) },
      creativePublication: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'publication-1' }),
        update: jest.fn().mockResolvedValue({ id: 'publication-1', status: 'CREATED', postIds: ['post-1'] }),
      },
      media: { create: jest.fn().mockResolvedValue({ id: 'media-1' }) },
    };
    const posts = { createPost: jest.fn().mockResolvedValue([{ postId: 'post-1' }]) };
    const integrations = { getIntegrationById: jest.fn().mockResolvedValue({ id: 'integration-1', providerIdentifier: 'instagram', name: 'Instagram' }) };
    const metrics = { record: jest.fn().mockResolvedValue(undefined) };
    const webhooks = { emit: jest.fn().mockResolvedValue(undefined) };
    const service = new CreativePublishService(prisma as any, posts as any, integrations as any, metrics as any, webhooks as any);

    const result = await service.publishVariant('org-1', 'project-1', 'variant-1', {
      integrationId: 'integration-1',
      type: 'draft',
      content: '<p>Review</p><script>alert(1)</script>',
      idempotencyKey: 'publish-key',
    });

    expect(result.status).toBe('CREATED');
    expect(posts.createPost).toHaveBeenCalledWith('org-1', expect.objectContaining({ type: 'draft' }));
    expect(posts.createPost.mock.calls[0][1].posts[0].value[0].content).toBe('<p>Review</p>');
    expect(metrics.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'creative.variant.published' }));
    expect(webhooks.emit).toHaveBeenCalledWith('org-1', 'creative.variant.published', expect.any(Object));
  });

  it('returns the idempotent publication without publishing again', async () => {
    const existing = { id: 'publication-1', status: 'CREATED' };
    const prisma = {
      creativeVariant: { findFirst: jest.fn().mockResolvedValue({ id: 'variant-1', status: 'READY', videoUrl: 'https://cdn.example/video.mp4' }) },
      creativePublication: { findUnique: jest.fn().mockResolvedValue(existing) },
      media: { create: jest.fn() },
    };
    const posts = { createPost: jest.fn() };
    const integrations = { getIntegrationById: jest.fn() };
    const service = new CreativePublishService(prisma as any, posts as any, integrations as any, {} as any, {} as any);

    await expect(service.publishVariant('org-1', 'project-1', 'variant-1', { integrationId: 'integration-1', idempotencyKey: 'publish-key' })).resolves.toBe(existing);
    expect(posts.createPost).not.toHaveBeenCalled();
    expect(prisma.media.create).not.toHaveBeenCalled();
  });
});
