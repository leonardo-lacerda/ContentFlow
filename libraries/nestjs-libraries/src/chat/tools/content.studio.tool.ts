import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CarouselProjectStatus } from '@prisma/client';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { ContentIdeaService } from '@gitroom/nestjs-libraries/database/prisma/content-ideas/content-idea.service';
import { CarouselProjectService } from '@gitroom/nestjs-libraries/database/prisma/carousel-projects/carousel-project.service';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';
import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { StudioArtifactService } from '@gitroom/nestjs-libraries/chat/studio/studio-artifact.service';

const operations = [
  'list-ideas',
  'save-idea',
  'list-carousels',
  'save-carousel',
  'update-carousel',
  'approve-carousel',
] as const;

const slideSchema = z.object({
  index: z.number().int().nonnegative().optional(),
  role: z.string().optional(),
  headline: z.string(),
  body: z.string(),
  cta: z.string().optional(),
  imagePrompt: z.string().optional(),
  altText: z.string().optional(),
});

type ContentStudioInput = {
  operation: (typeof operations)[number];
  brandProfileId?: string;
  title?: string;
  hook?: string;
  goal?: string;
  angle?: string;
  templateSuggestion?: string;
  platformSuggestion?: string;
  score?: number;
  slides?: Array<z.infer<typeof slideSchema>>;
  caption?: string;
  hashtags?: string[];
  designSpec?: Record<string, unknown>;
  contentIdeaId?: string;
  carouselProjectId?: string;
  status?: 'DRAFT' | 'GENERATING' | 'REVIEW' | 'READY' | 'PUBLISHED' | 'FAILED';
  rejectionReason?: string;
};

@Injectable()
export class ContentStudioTool implements AgentToolInterface {
  name = 'contentStudioTool';

  constructor(private readonly moduleRef: ModuleRef) {}

  private getServices() {
    const contentIdeaService = this.moduleRef.get(ContentIdeaService, {
      strict: false,
    });
    const carouselProjectService = this.moduleRef.get(CarouselProjectService, {
      strict: false,
    });
    const brandProfileService = this.moduleRef.get(BrandProfileService, {
      strict: false,
    });
    if (!contentIdeaService || !carouselProjectService || !brandProfileService) {
      throw new Error('Content Studio services are not available.');
    }
    return { contentIdeaService, carouselProjectService, brandProfileService };
  }

  private async resolveBrand(
    brandProfileService: BrandProfileService,
    organizationId: string,
    brandProfileId?: string
  ) {
    if (brandProfileId) {
      const brand = await brandProfileService.getBrand(
        brandProfileId,
        organizationId
      );
      if (!brand) throw new Error('A marca informada não foi encontrada.');
      return brand;
    }

    const selected = await brandProfileService.getSelectedBrand(
      organizationId
    );
    if (selected) return selected;

    const brands = await brandProfileService.getBrands(organizationId);
    if (brands[0]) return brands[0];

    throw new Error(
      'Configure uma marca antes de salvar este conteúdo. Você pode criar uma marca em Marca.'
    );
  }

  private async linkArtifactToThread(context: any, artifact: any, type: string) {
    const threadId = context?.agent?.threadId;
    const mastra = context?.mastra;
    if (!threadId || !mastra?.getAgent) return;
    try {
      const memory = await mastra.getAgent('contentflow').getMemory();
      const thread = await memory.getThreadById({ threadId });
      if (!thread) return;
      let metadata: Record<string, any> = {};
      if (typeof thread.metadata === 'string' && thread.metadata.trim()) {
        metadata = JSON.parse(thread.metadata);
      } else if (thread.metadata && typeof thread.metadata === 'object') {
        metadata = thread.metadata as Record<string, any>;
      }
      const previous = Array.isArray(metadata.studioArtifacts)
        ? metadata.studioArtifacts
        : [];
      metadata.studioArtifacts = [
        ...previous.filter((item: any) => item?.id !== artifact?.id),
        {
          id: artifact?.id,
          type,
          title: artifact?.title || artifact?.name || type,
          createdAt: new Date().toISOString(),
        },
      ].slice(-50);
      await memory.updateThread({
        id: threadId,
        title: thread.title || 'ContentFlow Studio',
        metadata,
      });
    } catch {
      // Artifact persistence must not make a successful save fail.
    }
  }

  private getStudioArtifactService() {
    return this.moduleRef.get(StudioArtifactService, { strict: false });
  }

  private async persistStudioArtifact(
    context: any,
    organizationId: string,
    input: {
      type: string;
      title: string;
      content: unknown;
      sourceId?: string;
      brandProfileId?: string;
    },
  ) {
    const service = this.getStudioArtifactService();
    if (!service) return null;
    const threadId = context?.agent?.threadId;
    return service.create(organizationId, {
      threadId,
      type: input.type,
      title: input.title,
      content: input.content,
      source: 'contentflow_chat_studio',
      brandProfileId: input.brandProfileId,
      metadata: { sourceId: input.sourceId, sourceType: input.type },
    });
  }

  private async versionStudioArtifact(
    context: any,
    organizationId: string,
    sourceId: string,
    type: string,
    content: unknown,
    title?: string,
  ) {
    const service = this.getStudioArtifactService();
    const threadId = context?.agent?.threadId;
    if (!service || !threadId) return null;
    const candidates = await service.list(organizationId, { threadId, type });
    const target = candidates.find((item: any) => {
      const metadata = item.metadata as Record<string, unknown> | null;
      return metadata?.sourceId === sourceId;
    });
    if (!target) {
      return this.persistStudioArtifact(context, organizationId, {
        type,
        title: title || type,
        content,
        sourceId,
      });
    }
    return service.createVersion(target.id, organizationId, {
      content,
      title,
      changeSummary: 'Revisado pelo chat',
    });
  }

  run() {
    return createTool({
      id: 'contentStudioTool',
      description:
        'Persist ContentFlow Studio ideas and carousels as reusable organization resources. Use after the assistant has created a structured idea list or carousel plan and the user wants to save, approve or continue editing it. Never save content that was not requested or confirmed by the user.',
      mcp: {
        annotations: {
          title: 'Content Studio Artifacts',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
      },
      inputSchema: z.object({
        operation: z.enum(operations),
        brandProfileId: z.string().optional(),
        title: z.string().max(240).optional(),
        hook: z.string().max(500).optional(),
        goal: z.string().max(500).optional(),
        angle: z.string().max(2000).optional(),
        templateSuggestion: z.string().max(240).optional(),
        platformSuggestion: z.string().max(80).optional(),
        score: z.number().min(0).max(100).optional(),
        slides: z.array(slideSchema).optional(),
        caption: z.string().max(5000).optional(),
        hashtags: z.array(z.string()).optional(),
        designSpec: z.record(z.any()).optional(),
        contentIdeaId: z.string().optional(),
        carouselProjectId: z.string().optional(),
        status: z.enum(['DRAFT', 'GENERATING', 'REVIEW', 'READY', 'PUBLISHED', 'FAILED']).optional(),
        rejectionReason: z.string().max(2000).optional(),
      }),
      outputSchema: z.object({ result: z.any() }),
      execute: async (input: ContentStudioInput, context) => {
        checkAuth(input, context);
        const rawOrganization = (context?.requestContext as any)?.get(
          'organization'
        );
        if (!rawOrganization) {
          throw new Error('Esta operação exige uma organização autenticada.');
        }
        const organization = JSON.parse(rawOrganization) as { id: string };
        const {
          contentIdeaService,
          carouselProjectService,
          brandProfileService,
        } = this.getServices();

        switch (input.operation) {
          case 'list-ideas':
            return {
              result: {
                type: 'IDEA_LIST',
                ideas: await contentIdeaService.getIdeas(organization.id),
              },
            };
          case 'list-carousels':
            return {
              result: {
                type: 'CAROUSEL_LIBRARY',
                carousels: await carouselProjectService.getProjects(
                  organization.id
                ),
              },
            };
          case 'save-idea': {
            if (!input.title || !input.hook || !input.goal || !input.angle) {
              throw new Error(
                'title, hook, goal e angle são obrigatórios para salvar uma ideia.'
              );
            }
            const brand = await this.resolveBrand(
              brandProfileService,
              organization.id,
              input.brandProfileId
            );
            const score =
              input.score === undefined
                ? undefined
                : input.score <= 10
                ? input.score * 10
                : input.score;
            const artifact = await contentIdeaService.createIdea({
                  organizationId: organization.id,
                  brandProfileId: brand.id,
                  title: input.title,
                  hook: input.hook,
                  goal: input.goal,
                  angle: input.angle,
                  templateSuggestion: input.templateSuggestion,
                  platformSuggestion: input.platformSuggestion,
                  score,
                });
            const studioArtifact = await this.persistStudioArtifact(context, organization.id, {
              type: 'IDEA',
              title: artifact.title,
              content: artifact,
              sourceId: artifact.id,
              brandProfileId: brand.id,
            });
            await this.linkArtifactToThread(context, studioArtifact || artifact, 'IDEA');
            return {
              result: {
                type: 'IDEA',
                artifact,
                studioArtifact,
              },
            };
          }
          case 'save-carousel': {
            if (!input.title || !input.slides?.length) {
              throw new Error(
                'title e slides são obrigatórios para salvar um carrossel.'
              );
            }
            const brand = await this.resolveBrand(
              brandProfileService,
              organization.id,
              input.brandProfileId
            );
            const slides = input.slides.map((slide, index) => ({
              ...slide,
              index: slide.index ?? index,
            }));
            const artifact = await carouselProjectService.createProject({
                  organizationId: organization.id,
                  brandProfileId: brand.id,
                  contentIdeaId: input.contentIdeaId,
                  title: input.title,
                  slides,
                  caption: input.caption,
                  hashtags: input.hashtags,
                  metadata: { source: 'contentflow_chat_studio', designSpec: input.designSpec },
                });
            const studioArtifact = await this.persistStudioArtifact(context, organization.id, {
              type: 'CAROUSEL',
              title: artifact.title,
              content: artifact,
              sourceId: artifact.id,
              brandProfileId: brand.id,
            });
            await this.linkArtifactToThread(context, studioArtifact || artifact, 'CAROUSEL');
            return {
              result: {
                type: 'CAROUSEL',
                artifact,
                studioArtifact,
              },
            };
          }
          case 'update-carousel': {
            if (!input.carouselProjectId) {
              throw new Error('carouselProjectId e obrigatorio para atualizar um carrossel.');
            }
            if (!input.title && !input.slides?.length && input.caption === undefined && !input.hashtags?.length && input.designSpec === undefined) {
              throw new Error('Informe ao menos um campo para atualizar o carrossel.');
            }
            const slides = input.slides?.map((slide, index) => ({
              ...slide,
              index: slide.index ?? index,
            }));
            const artifact = await carouselProjectService.updateProject(
                  input.carouselProjectId,
                  organization.id,
                  {
                    ...(input.title ? { title: input.title } : {}),
                    ...(slides?.length ? { slides } : {}),
                    ...(input.caption !== undefined ? { caption: input.caption } : {}),
                    ...(input.hashtags?.length ? { hashtags: input.hashtags } : {}),
                    ...(input.designSpec !== undefined ? { metadata: { source: 'contentflow_chat_studio', designSpec: input.designSpec } } : {}),
                  },
                );
            const studioArtifact = await this.versionStudioArtifact(
              context,
              organization.id,
              artifact.id,
              'CAROUSEL',
              artifact,
              artifact.title,
            );
            await this.linkArtifactToThread(context, studioArtifact || artifact, 'CAROUSEL');
            return {
              result: {
                type: 'CAROUSEL_UPDATED',
                artifact,
                studioArtifact,
              },
            };
          }
          case 'approve-carousel': {
            if (!input.carouselProjectId) {
              throw new Error('carouselProjectId e obrigatorio para aprovar um carrossel.');
            }
            const artifact = await carouselProjectService.updateProject(
                  input.carouselProjectId,
                  organization.id,
                  {
                    status: CarouselProjectStatus.READY,
                    approvalStatus: 'APPROVED',
                    approvedAt: new Date(),
                    rejectionReason: input.rejectionReason,
                  },
                );
            const studioArtifact = await this.versionStudioArtifact(
              context,
              organization.id,
              artifact.id,
              'CAROUSEL',
              artifact,
              artifact.title,
            );
            await this.linkArtifactToThread(context, studioArtifact || artifact, 'CAROUSEL');
            return {
              result: {
                type: 'CAROUSEL_APPROVED',
                artifact,
                studioArtifact,
              },
            };
          }
        }
      },
    });
  }
}
