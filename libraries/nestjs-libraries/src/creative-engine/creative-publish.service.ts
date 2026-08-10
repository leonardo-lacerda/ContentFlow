import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { sanitizePostContent } from '@gitroom/helpers/utils/sanitize.post.content';
import { CreativeMetricsService } from './creative-metrics.service';
import { CreativeWebhookService } from './creative-webhook.service';
import { scopeCreativeIdempotencyKey } from './creative-engine.types';

type PublishInput = {
  integrationId: string;
  type?: 'draft' | 'schedule' | 'now';
  date?: string;
  shortLink?: boolean;
  content?: string;
  idempotencyKey?: string;
};

@Injectable()
export class CreativePublishService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posts: PostsService,
    private readonly integrations: IntegrationService,
    private readonly metrics: CreativeMetricsService,
    private readonly webhooks: CreativeWebhookService,
  ) {}

  async publishVariant(organizationId: string, projectId: string, variantId: string, input: PublishInput) {
    const variant = await this.prisma.creativeVariant.findFirst({
      where: { id: variantId, projectId, organizationId },
    });
    if (!variant) throw new NotFoundException('Creative variant not found');
    if (variant.status !== 'READY' || !variant.videoUrl) {
      throw new BadRequestException('Only a ready creative variant with an output video can be published');
    }
    const type = input.type || 'draft';
    const scheduledAt = type === 'now'
      ? new Date()
      : new Date(input.date || Date.now() + 60 * 60 * 1000);
    if (Number.isNaN(scheduledAt.getTime())) throw new BadRequestException('Invalid publication date');
    const idempotencyKey = input.idempotencyKey
      ? scopeCreativeIdempotencyKey(organizationId, input.idempotencyKey)
      : createHash('sha256')
        .update(JSON.stringify({ organizationId, projectId, variantId, input: { ...input, type, scheduledAt: scheduledAt.toISOString() } }))
        .digest('hex');
    const existing = await this.prisma.creativePublication.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;

    const integration = await this.integrations.getIntegrationById(organizationId, input.integrationId);
    if (!integration) throw new NotFoundException('Social integration not found');
    const media = await this.prisma.media.create({
      data: {
        organizationId,
        name: `creative-${variant.id}.mp4`,
        originalName: `creative-${variant.id}.mp4`,
        path: variant.videoUrl,
        type: 'video',
        fileSize: Number((variant.output as any)?.fileSize || 0),
      },
    });
    const publication = await this.prisma.creativePublication.create({
      data: {
        organizationId,
        projectId,
        variantId,
        integrationId: input.integrationId,
        type,
        scheduledAt,
        idempotencyKey,
      },
    });
    try {
      const content = sanitizePostContent(input.content || `<p>Creative variant ${variant.id}</p>`);
      const output = await this.posts.createPost(organizationId, {
        date: scheduledAt.toISOString(),
        type,
        shortLink: Boolean(input.shortLink),
        tags: [],
        posts: [{
          integration,
          group: `creative-${publication.id}`,
          settings: { __type: integration.providerIdentifier } as any,
          value: [{
            content,
            id: randomUUID(),
            delay: 0,
            image: [{ id: media.id, path: variant.videoUrl, thumbnail: variant.thumbnailUrl || undefined }],
          }],
        }],
      } as any);
      const postIds = (output || []).map((post: any) => String(post.postId || post.id)).filter(Boolean);
      const updated = await this.prisma.creativePublication.update({
        where: { id: publication.id },
        data: { status: 'CREATED', postIds },
      });
      await this.metrics.record({
        organizationId,
        projectId,
        jobId: null,
        event: 'creative.variant.published',
        value: postIds.length,
        metadata: { variantId, integrationId: input.integrationId, type, publicationId: publication.id },
      });
      await this.webhooks.emit(organizationId, 'creative.variant.published', {
        projectId,
        variantId,
        publicationId: publication.id,
        integrationId: input.integrationId,
        postIds,
        type,
      });
      return updated;
    } catch (error) {
      await this.prisma.creativePublication.update({
        where: { id: publication.id },
        data: { status: 'FAILED', error: error instanceof Error ? error.message : String(error) },
      });
      throw error;
    }
  }

  async list(organizationId: string, projectId?: string) {
    return this.prisma.creativePublication.findMany({
      where: { organizationId, ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
