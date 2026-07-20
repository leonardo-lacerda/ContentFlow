import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import {
  AdCreativeBatchSchema,
  type AdCreativeBatch,
  AD_PLATFORM_CONSTRAINTS,
} from './schemas/ad-creative.schema';
import { validateAiResponse } from './ai-response-validator';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';
import { ContentIdeaService } from '@gitroom/nestjs-libraries/database/prisma/content-ideas/content-idea.service';
import { CarouselProjectService } from '@gitroom/nestjs-libraries/database/prisma/carousel-projects/carousel-project.service';
import { GenerationJobService } from '@gitroom/nestjs-libraries/database/prisma/generation-jobs/generation-job.service';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { PlanLimitsService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/plan-limits.service';
import { adTemplateRegistry } from './ad-templates/ad-template-registry';
import { runAdPolicyChecks } from './ad-templates/ad-policy-checker';
import { GenerateAdCreativesDto } from '@gitroom/nestjs-libraries/dtos/ai-generate/generate-ad-creatives.dto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
});

const SYSTEM_PROMPT = `You are a world-class performance marketing creative strategist working for ContentFlow.
You generate high-converting ad creatives for paid campaigns on Meta (Facebook/Instagram) and LinkedIn.

You MUST:
1. Generate ad copy that is distinct from organic social media content - this is PAID advertising
2. Respect strict character limits per platform:
   - Meta Feed: headline 125 chars, primary text 125 chars (recommended) / 500 max
   - Instagram Feed: headline 125 chars, primary text 125 chars / 500 max
   - LinkedIn: headline 70 chars, primary text 150 chars / 3000 max
3. Use platform-appropriate CTA buttons (LEARN_MORE, SHOP_NOW, SIGN_UP, etc.)
4. Follow ad copy best practices: benefit-driven, clear value proposition, strong CTA
5. Avoid any claims that violate ad policies:
   - No guaranteed results
   - No before/after body manipulation
   - No fake urgency or false scarcity
   - No misleading health claims
   - No superlatives without proof
6. Generate image prompts that match the ad's message and platform format
7. For carousel ads, ensure each slide has a clear purpose in the narrative flow
8. Include policy warnings for any potentially sensitive claims
9. For EACH ad, you MUST provide rich strategic context that helps the user understand and optimize:

FOR EACH AD, YOU MUST INCLUDE:
- rationale: Explain WHY this specific headline, copy, and CTA combination works. Be specific about the psychology.
- emotionalHook: Name the primary emotional trigger (fear of missing out, social proof, desire for growth, pain relief, aspiration, curiosity)
- platformOptimization: Explain specifically how this ad leverages the platform's algorithm, user behavior, and format
- targeting: 1-2 detailed audience targeting recommendations with demographics, interests, exclusions, and rationale
- abTests: 2-3 specific A/B test suggestions with hypothesis (e.g. "Test this headline against a question-based headline because...")
- growthTips: 2-3 actionable growth tips with category (budget, creative, targeting, landing-page, retargeting) and impact timeline
- preLaunchChecklist: 3-4 specific items to verify before launching
- expectedMetrics: Realistic CTR, CPC, and conversion rate ranges with context

AD TEMPLATE STRATEGIES:
- Problem-Solution: Hook with pain point, agitate, present solution, show benefit, CTA
- Social Proof: Lead with results/data, show testimonial, build trust, CTA
- Offer/Promotion: Lead with the offer, show value, create urgency, CTA
- Comparison/Before-After: Show current state, contrast with desired state, CTA
- Testimonial/Case: Feature customer voice, show results, CTA

IMPORTANT: These are NOT organic posts. They are PAID ADS. The language should be
direct, benefit-focused, and conversion-oriented. Always include rich strategic guidance.`;

@Injectable()
export class AdCreativeGenerateService {
  private readonly logger = new Logger(AdCreativeGenerateService.name);

  constructor(
    private readonly brandProfileService: BrandProfileService,
    private readonly contentIdeaService: ContentIdeaService,
    private readonly carouselProjectService: CarouselProjectService,
    private readonly generationJobService: GenerationJobService,
    private readonly prisma: PrismaService,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  /**
   * Generate ad creatives for paid campaigns.
   */
  async generateAdCreatives(
    orgId: string,
    dto: GenerateAdCreativesDto,
  ): Promise<AdCreativeBatch> {
    await this.planLimitsService.enforceLimit(orgId, 'ad_kit');

    // 1. Validate brand ownership
    const brand = await this.brandProfileService.getBrand(dto.brandProfileId, orgId);
    if (!brand || brand.organizationId !== orgId) {
      throw new HttpException('Brand not found or access denied', HttpStatus.NOT_FOUND);
    }

    const dna = await this.brandProfileService.getLatestDnaSnapshot(dto.brandProfileId);

    // 2. Load source content
    let sourceContent: {
      title: string;
      hook: string;
      goal: string;
      angle: string;
      slides?: any;
    } | null = null;

    if (dto.contentIdeaId) {
      const idea = await this.contentIdeaService.getIdea(dto.contentIdeaId, orgId);
      if (!idea) throw new HttpException('Content idea not found', HttpStatus.NOT_FOUND);
      sourceContent = {
        title: idea.title,
        hook: idea.hook,
        goal: idea.goal,
        angle: idea.angle,
      };
    } else if (dto.carouselProjectId) {
      const project = await this.carouselProjectService.getProject(dto.carouselProjectId, orgId);
      if (!project) throw new HttpException('Carousel project not found', HttpStatus.NOT_FOUND);
      sourceContent = {
        title: project.title,
        hook: '',
        goal: '',
        angle: project.caption || '',
        slides: project.slides,
      };
    } else if (dto.contentObjective) {
      sourceContent = {
        title: dto.contentObjective,
        hook: dto.contentObjective,
        goal: dto.objective,
        angle: dto.productOrService || '',
      };
    } else {
      throw new HttpException(
        'Either contentIdeaId, carouselProjectId, or contentObjective must be provided',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 3. Create generation job
    const job = await this.generationJobService.createJob({
      organizationId: orgId,
      brandProfileId: dto.brandProfileId,
      type: 'AD_CREATIVE_GENERATION',
      model: 'gpt-4.1',
      provider: 'openai',
      promptVersion: '2.0.0',
      schemaVersion: '2.0.0',
    });

    try {
      await this.generationJobService.startJob(job.id);

      // 4. Get ad template instructions
      let templateInstruction = '';
      if (dto.adTemplateId) {
        const template = adTemplateRegistry.get(dto.adTemplateId);
        if (template) {
          templateInstruction = template.promptInstruction;
        }
      }

      // 5. Build prompt
      const prompt = this.buildPrompt(dna, sourceContent, dto, templateInstruction);

      // 6. Call OpenAI with structured output
      const rawResponse = await openai.chat.completions.parse({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        response_format: zodResponseFormat(AdCreativeBatchSchema, 'adCreatives'),
      });

      const parsed = rawResponse.choices[0].message.parsed;
      if (!parsed) throw new Error('Failed to parse AI response');

      // 7. Validate with schema
      const validation = validateAiResponse('ad-creative', JSON.stringify(parsed));
      if (!validation.success) {
        throw new Error('AI response validation failed');
      }

      const batch = validation.data as AdCreativeBatch;

      // 8. Run policy checks on each ad
      for (const ad of batch.ads) {
        const policyResult = runAdPolicyChecks(ad, {
          forbiddenTerms: dna?.constraints?.avoid as string[],
          complianceNotes: dna?.constraints?.do as string[],
        });
        ad.policyWarnings = policyResult.warnings as any;
        ad.claimsFlags = ad.claimsFlags || [];
        for (const flag of policyResult.claimsFlags) {
          ad.claimsFlags.push(flag as any);
        }
      }

      // 9. Complete job
      await this.generationJobService.completeJob(job.id, batch);
      this.logger.log(`Ad creatives generated, job ${job.id}`);

      return batch;
    } catch (error: any) {
      this.logger.error('Ad creative generation failed', error);
      await this.generationJobService.failJob(job.id, error.message);
      throw error;
    }
  }

  /**
   * Save generated ad creatives to the database.
   */
  async saveAdCreatives(
    orgId: string,
    batch: AdCreativeBatch,
    source: {
      brandProfileId: string;
      contentIdeaId?: string;
      carouselProjectId?: string;
    },
    jobId?: string,
  ): Promise<any[]> {
    const saved = [];
    for (const ad of batch.ads) {
      const record = await this.prisma.adCreative.create({
        data: {
          organizationId: orgId,
          brandProfileId: source.brandProfileId,
          contentIdeaId: source.contentIdeaId || null,
          carouselProjectId: source.carouselProjectId || null,
          type: ad.type,
          platform: ad.platform as any,
          objective: ad.objective as any,
          adTemplateId: ad.adTemplateId || null,
          headline: ad.headline,
          primaryText: ad.primaryText,
          description: ad.description || null,
          ctaButton: ad.ctaButton,
          destinationUrl: ad.destinationUrl || null,
          slides: ad.slides ? JSON.parse(JSON.stringify(ad.slides)) : null,
          slideCount: ad.slideCount || (ad.slides ? ad.slides.length : null),
          policyWarnings: ad.policyWarnings ? JSON.parse(JSON.stringify(ad.policyWarnings)) : null,
          claimsFlags: ad.claimsFlags ? JSON.parse(JSON.stringify(ad.claimsFlags)) : null,
          mediaAssets: ad.imagePrompts ? JSON.parse(JSON.stringify(ad.imagePrompts)) : null,
          generationJobId: jobId || null,
          schemaVersion: '2.0.0',
          promptVersion: '2.0.0',
          status: 'DRAFT',
        },
      });
      saved.push(record);
    }
    return saved;
  }

  /**
   * Get ad creatives for an organization with optional filters.
   */
  async getAdCreatives(
    orgId: string,
    filters?: {
      platform?: string;
      type?: string;
      status?: string;
      brandProfileId?: string;
    },
  ): Promise<any[]> {
    const where: any = {
      organizationId: orgId,
      deletedAt: null,
    };
    if (filters?.platform) where.platform = filters.platform;
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.brandProfileId) where.brandProfileId = filters.brandProfileId;

    return this.prisma.adCreative.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single ad creative by ID.
   */
  async getAdCreativeById(orgId: string, id: string): Promise<any> {
    const ad = await this.prisma.adCreative.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!ad) throw new HttpException('Ad creative not found', HttpStatus.NOT_FOUND);
    return ad;
  }

  /**
   * Update an ad creative.
   */
  async updateAdCreative(
    orgId: string,
    id: string,
    updates: Partial<{
      headline: string;
      primaryText: string;
      description: string;
      ctaButton: string;
      destinationUrl: string;
      status: string;
    }>,
  ): Promise<any> {
    await this.getAdCreativeById(orgId, id); // verify ownership
    return this.prisma.adCreative.update({
      where: { id },
      data: updates,
    });
  }

  /**
   * Soft-delete an ad creative.
   */
  async deleteAdCreative(orgId: string, id: string): Promise<any> {
    await this.getAdCreativeById(orgId, id); // verify ownership
    return this.prisma.adCreative.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Export ad creatives in platform-specific format.
   */
  async exportAdCreative(
    orgId: string,
    adCreativeId: string,
    format: 'META_CSV' | 'LINKEDIN_CSV' | 'JSON' | 'NATIVE_FORMAT',
  ): Promise<any> {
    const ad = await this.getAdCreativeById(orgId, adCreativeId);

    switch (format) {
      case 'META_CSV':
        return this.exportMetaCsv(ad);
      case 'LINKEDIN_CSV':
        return this.exportLinkedInCsv(ad);
      case 'JSON':
        return ad;
      case 'NATIVE_FORMAT':
        return this.exportNativeFormat(ad);
      default:
        throw new HttpException('Unsupported export format', HttpStatus.BAD_REQUEST);
    }
  }

  // ---- Private helpers ----

  private buildPrompt(
    dna: any,
    source: any,
    dto: GenerateAdCreativesDto,
    templateInstruction: string,
  ): string {
    const platformConstraints = dto.platforms
      .map((p) => {
        const c = AD_PLATFORM_CONSTRAINTS[p];
        return c
          ? `- ${p}: headline max ${c.maxHeadline} chars, primary text max ${c.maxPrimaryText} chars, supported CTAs: ${c.supportedCtas.join(', ')}`
          : `- ${p}: (custom platform)`;
      })
      .join('\n');

    return `Generate ${dto.variants || 1} ad creative(s) for each platform: ${dto.platforms.join(', ')}

## Brand DNA
Brand Name: ${dna?.brandProfile?.name || dna?.summary?.tagline || 'Unknown'}
Industry: ${dna?.brandProfile?.industry || dna?.summary?.industry || 'Unknown'}
Voice: ${dna?.voice?.tone || 'professional'} - Style: ${dna?.voice?.style || 'clear'}
Target Audience: ${dna?.audience?.demographics || 'General'}
Pain Points: ${Array.isArray(dna?.audience?.painPoints) ? dna.audience.painPoints.join(', ') : 'N/A'}
Value Proposition: ${Array.isArray(dna?.offer?.uniqueSellingPoints) ? dna.offer.uniqueSellingPoints.join(', ') : 'N/A'}
Forbidden Terms: ${Array.isArray(dna?.constraints?.avoid) ? dna.constraints.avoid.join(', ') : 'None'}

## Source Content
Title: ${source.title}
Hook: ${source.hook}
Goal/Objective: ${dto.objective}
${source.angle ? `Angle: ${source.angle}` : ''}
${dto.productOrService ? `Product/Service: ${dto.productOrService}` : ''}

## Campaign Details
Objective: ${dto.objective}
Ad Type: ${dto.adType}
${dto.ctaButton ? `CTA Preference: ${dto.ctaButton}` : ''}
${dto.destinationUrl ? `Destination URL: ${dto.destinationUrl}` : ''}

## Platform Constraints
${platformConstraints}

## Ad Template Strategy
${templateInstruction || 'No specific template. Choose the best approach for the objective.'}

## Additional Context
${dto.additionalContext || 'None'}

IMPORTANT REMINDERS:
- These are PAID ADS, not organic social posts. Be direct and conversion-focused.
- Every ad needs: headline, primary text, CTA button
- Include imagePrompts with specific descriptions for ad images
- Run mental policy checks and include policyWarnings for anything sensitive
- For carousel type, generate 3-5 slides with clear narrative flow
- Each slide needs a headline and body text

STRATEGIC GUIDANCE (REQUIRED for each ad):
- rationale: Explain the strategic reasoning behind your choices. Why headline X? Why CTA Y? What psychology is at play?
- emotionalHook: Name the primary emotional trigger you are using
- platformOptimization: How does this ad leverage the specific platform's algorithm and user behavior?
- targeting: Provide 1-2 detailed audience targeting configs with demographics, interests, exclusions, and WHY
- abTests: Suggest 2-3 A/B test variations with hypothesis (e.g. "Test headline A vs question headline B because...")
- growthTips: 2-3 actionable growth tips (budget allocation, creative refresh, retargeting, landing page, etc.)
- preLaunchChecklist: 3-4 specific verification items before going live
- expectedMetrics: Realistic CTR, CPC, conversion rate ranges for this ad type on this platform`;
  }

  private exportMetaCsv(ad: any): object {
    return {
      'Campaign Name': ad.headline,
      'Ad Name': `${ad.platform} - ${ad.type}`,
      'Headline': ad.headline,
      'Primary Text': ad.primaryText,
      'Description': ad.description || '',
      'Destination URL': ad.destinationUrl || '',
      'CTA': ad.ctaButton,
      'Status': 'Active',
    };
  }

  private exportLinkedInCsv(ad: any): object {
    return {
      'Campaign Name': ad.headline,
      'Ad Name': `${ad.platform} - ${ad.type}`,
      'Introduction': ad.headline,
      'Headline': ad.headline,
      'Description': ad.description || ad.primaryText,
      'Destination URL': ad.destinationUrl || '',
      'CTA': ad.ctaButton,
    };
  }

  private exportNativeFormat(ad: any): object {
    return {
      _format: 'contentflow-ad-v1',
      _exportedAt: new Date().toISOString(),
      ad,
    };
  }
}
