import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import {
  SocialPostBatchSchema,
  PLATFORM_CONSTRAINTS,
} from './schemas/social-post.schema';
import type { SocialPostBatch } from './schemas/social-post.schema';
import { validateAiResponse } from './ai-response-validator';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';
import { ContentIdeaService } from '@gitroom/nestjs-libraries/database/prisma/content-ideas/content-idea.service';
import { CarouselProjectService } from '@gitroom/nestjs-libraries/database/prisma/carousel-projects/carousel-project.service';
import { GenerationJobService } from '@gitroom/nestjs-libraries/database/prisma/generation-jobs/generation-job.service';
import { GenerateSocialPostsDto } from '@gitroom/nestjs-libraries/dtos/ai-generate/generate-social-posts.dto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
});

const SYSTEM_PROMPT = `You are a world-class social media content strategist working for ContentFlow.
You generate platform-optimized social media posts from brand content.

You must:
1. Adapt tone, vocabulary, and structure for each platform's unique audience
2. Respect strict character limits per platform
3. Use platform-appropriate hashtag strategy (quantity and style)
4. Include a compelling, platform-native CTA
5. Avoid any forbidden terms from brand constraints
6. Make content feel organic to the platform - never cross-posted

Platform-specific rules:
- Instagram: Use line breaks for readability, emojis liberally, 5-30 hashtags, "link in bio" CTA
- LinkedIn: Professional tone, personal story hooks, 3-5 hashtags max, "comment below" CTA
- TikTok: Short punchy lines, trend-aware language, 5-8 hashtags, "follow for more" CTA
- Twitter/X: Under 280 chars, minimal emojis, 3-5 hashtags, punchy CTA
- Threads: Conversational, authentic, under 500 chars, 3-5 hashtags
- Facebook: Longer storytelling OK, 1-3 hashtags, "share your thoughts" CTA

FOR EACH POST, YOU MUST PROVIDE RICH STRATEGIC GUIDANCE:

1. rationale: Explain WHY this specific post structure, hook, and angle will work. What psychology is at play?
2. hookAnalysis: Analyze the opening line. Why will it stop the scroll? What pattern interrupt does it use?
3. platformOptimization: How does this post leverage the platform's algorithm? (e.g. LinkedIn rewards comments, Instagram rewards saves)
4. visualGuidance: Recommend the visual content (photo type, style, colors, text overlays) that would pair with this post
5. engagementStrategy: Name the engagement technique and explain how it drives interaction
6. postingStrategy: Best time, day, frequency, and how to repurpose this content elsewhere
7. growthTips: 2-3 actionable tips specific to this post (e.g. "Pin this post", "Reply to first 10 comments within 1 hour")
8. expectedEngagement: Realistic ranges for likes, comments, shares/saves

Be specific, actionable, and strategic. The user should feel like they have a social media consultant guiding them.`;

@Injectable()
export class SocialPostGenerateService {
  private readonly logger = new Logger(SocialPostGenerateService.name);

  constructor(
    private brandProfileService: BrandProfileService,
    private contentIdeaService: ContentIdeaService,
    private carouselProjectService: CarouselProjectService,
    private generationJobService: GenerationJobService,
  ) {}

  async generateSocialPosts(
    orgId: string,
    dto: GenerateSocialPostsDto,
  ): Promise<SocialPostBatch> {
    // 1. Validate that at least one input source is provided
    if (!dto.topic && !dto.contentIdeaId && !dto.carouselProjectId) {
      throw new BadRequestException(
        'At least one of topic, contentIdeaId, or carouselProjectId must be provided',
      );
    }

    // 2. Load brand DNA if brandProfileId is provided
    let dna: any = null;
    if (dto.brandProfileId) {
      const brand = await this.brandProfileService.getBrand(dto.brandProfileId, orgId);
      if (!brand || brand.organizationId !== orgId) {
        throw new BadRequestException('Brand not found or access denied');
      }
      dna = await this.brandProfileService.getLatestDnaSnapshot(
        dto.brandProfileId,
      );
    }

    // 3. Load source content (content idea, carousel, or standalone topic)
    let sourceContent: {
      title: string;
      hook: string;
      goal: string;
      angle: string;
      caption?: string;
      slides?: any;
    };

    if (dto.contentIdeaId) {
      const idea = await this.contentIdeaService.getIdea(dto.contentIdeaId, orgId);
      if (!idea) throw new BadRequestException('Content idea not found');
      sourceContent = {
        title: idea.title,
        hook: idea.hook,
        goal: idea.goal,
        angle: idea.angle,
      };
    } else if (dto.carouselProjectId) {
      const project = await this.carouselProjectService.getProject(
        dto.carouselProjectId,
        orgId,
      );
      if (!project) throw new BadRequestException('Carousel project not found');
      sourceContent = {
        title: project.title,
        hook: '',
        goal: '',
        angle: '',
        caption: project.caption || undefined,
        slides: project.slides,
      };
    } else {
      // Standalone topic-based generation
      sourceContent = {
        title: dto.topic!,
        hook: dto.topic!,
        goal: 'Engage audience with compelling content',
        angle: dto.additionalContext || 'General audience appeal',
      };
    }

    // 4. Create generation job
    const job = await this.generationJobService.createJob({
      organizationId: orgId,
      brandProfileId: dto.brandProfileId,
      type: 'SOCIAL_POST_GENERATION',
      model: 'gpt-4.1',
      provider: 'openai',
      promptVersion: '2.0.0',
      schemaVersion: '2.0.0',
    });

    try {
      await this.generationJobService.startJob(job.id);

      // 5. Build prompt with Brand DNA context
      const prompt = this.buildPrompt(
        dna,
        sourceContent,
        dto.platforms,
        dto.additionalContext,
        dto.tone,
        dto.language,
      );

      // 6. Call OpenAI with structured output
      const rawResponse = await openai.chat.completions.parse({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        response_format: zodResponseFormat(
          SocialPostBatchSchema,
          'socialPosts',
        ),
      });

      const parsed = rawResponse.choices[0].message.parsed;
      if (!parsed) throw new Error('Failed to parse AI response');

      // 7. Validate with schema
      const validation = validateAiResponse(
        'social-post',
        JSON.stringify(parsed),
      );
      if (!validation.success) {
        throw new Error('AI response validation failed');
      }

      // 8. Complete job
      await this.generationJobService.completeJob(job.id, validation.data);

      this.logger.log(
        `Social posts generated (brand: ${dto.brandProfileId || 'topic-based'}), job ${job.id}`,
      );
      return validation.data as SocialPostBatch;
    } catch (error: any) {
      await this.generationJobService.failJob(job.id, error.message);
      this.logger.error(`Social post generation failed: ${error.message}`);
      throw error;
    }
  }

  async getPostsByContentIdea(ideaId: string) {
    return [];
  }

  async getPostsByCarouselProject(carouselId: string) {
    return [];
  }

  private buildPrompt(
    dna: any,
    source: {
      title: string;
      hook: string;
      goal: string;
      angle: string;
      caption?: string;
      slides?: any;
    },
    platforms: string[],
    additionalContext?: string,
    tone?: string,
    language?: string,
  ): string {
    const platformInfo = platforms
      .map((p) => {
        const constraints =
          PLATFORM_CONSTRAINTS[p] || { maxChars: 2200, minHashtags: 3, maxHashtags: 10 };
        return `- ${p}: max ${constraints.maxChars} chars, ${constraints.minHashtags}-${constraints.maxHashtags} hashtags`;
      })
      .join('\n');

    let prompt = `Generate social media posts for the following content.\n`;

    if (language) {
      prompt += `\n## Language\nWrite all content in: ${language}\n`;
    }

    if (tone) {
      prompt += `\n## Global Tone\nApply this tone across all platforms: ${tone}\n`;
    }

    if (dna) {
      prompt += `\n## Brand DNA
Brand Name: ${dna?.brandProfile?.name || 'Unknown'}
Industry: ${dna?.brandProfile?.industry || 'General'}
Voice: ${JSON.stringify(dna?.voice || {})}
Target Audience: ${JSON.stringify(dna?.audience || {})}
Value Proposition: ${JSON.stringify(dna?.offer || {})}
Forbidden Terms: ${JSON.stringify(dna?.constraints?.forbiddenTerms || [])}\n`;
    }

    prompt += `\n## Source Content
Title: ${source.title}
Hook: ${source.hook}
Goal: ${source.goal}
Angle: ${source.angle}`;

    if (source.caption) {
      prompt += `\nExisting Caption: ${source.caption}`;
    }
    if (source.slides) {
      prompt += `\nSlides: ${JSON.stringify(source.slides)}`;
    }

    prompt += `\n\n## Target Platforms\n${platformInfo}`;

    if (additionalContext) {
      prompt += `\n\n## Additional Instructions\n${additionalContext}`;
    }

    prompt += `\n\nSTRATEGIC GUIDANCE REQUIRED for each post:
- rationale: WHY this hook, structure, and angle will work on this platform
- hookAnalysis: Why the opening line will stop the scroll
- platformOptimization: How this leverages the platform algorithm
- visualGuidance: What visual should pair with this post (type, style, colors, text overlay)
- engagementStrategy: Technique used and expected engagement type
- postingStrategy: Best time, day, frequency, and repurpose ideas
- growthTips: 2-3 actionable tips specific to this post
- expectedEngagement: Realistic likes, comments, shares ranges

Generate a post for EACH platform above. Return JSON with the posts array.`;

    return prompt;
  }
}
