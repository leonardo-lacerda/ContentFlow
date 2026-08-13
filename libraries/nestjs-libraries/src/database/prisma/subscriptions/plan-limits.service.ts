import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { BillingEntitlementsService } from '@gitroom/nestjs-libraries/services/billing-entitlements.service';
import { BillingFeatureCode } from '@gitroom/nestjs-libraries/services/billing-catalog';

export type GenerationType =
  | 'carousel_generation'
  | 'dna_extraction'
  | 'content_idea'
  | 'editorial_plan'
  | 'brand_profile'
  | 'image_generation'
  | 'video_generation'
  | 'ad_kit'
  | 'email_campaign'
  | 'video_script';

interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  plan: string;
  upgradeMessage?: string;
}

/**
 * Compatibility facade for callers that still use the former monthly-limit
 * service. Generation counts are analytics only; commercial authorization is
 * based on Billing v2 entitlements and available credits.
 */
@Injectable()
export class PlanLimitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: BillingEntitlementsService,
  ) {}

  async enforceLimit(organizationId: string, type: GenerationType): Promise<LimitCheckResult> {
    const access = await this.entitlements.assertFeature(organizationId, this.featureFor(type));
    const current = await this.getCurrentUsage(organizationId, type);
    if (type === 'brand_profile') {
      await this.entitlements.assertCapacity(organizationId, 'brands', current);
      return { allowed: true, current, limit: access.capacities.brands, plan: access.plan };
    }
    return { allowed: true, current, limit: -1, plan: access.plan };
  }

  async checkLimit(organizationId: string, type: GenerationType): Promise<LimitCheckResult> {
    const access = await this.entitlements.resolveAccess(organizationId);
    const current = await this.getCurrentUsage(organizationId, type);
    if (type === 'brand_profile') {
      const limit = access.capacities.brands;
      return { allowed: current < limit, current, limit, plan: access.plan };
    }
    const allowed = access.features.includes(this.featureFor(type));
    return { allowed, current, limit: allowed ? -1 : 0, plan: access.plan };
  }

  private featureFor(type: GenerationType): BillingFeatureCode {
    const features: Record<GenerationType, BillingFeatureCode> = {
      carousel_generation: 'carousel-copy',
      dna_extraction: 'brand-dna',
      content_idea: 'content-ideas',
      editorial_plan: 'editorial-plan',
      brand_profile: 'brand-dna',
      image_generation: 'image-generation',
      video_generation: 'video-generation',
      ad_kit: 'ad-kit',
      email_campaign: 'email-campaign',
      video_script: 'content-ideas',
    };
    return features[type];
  }

  private async getCurrentUsage(organizationId: string, type: GenerationType): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    switch (type) {
      case 'carousel_generation':
        return this.prisma.generationJob.count({ where: { organizationId, type: { in: ['CAROUSEL_PLAN', 'IMAGE_GENERATION', 'BULK_GENERATION'] }, createdAt: { gte: startOfMonth } } });
      case 'dna_extraction':
        return this.prisma.generationJob.count({ where: { organizationId, type: 'BRAND_DNA_EXTRACTION', createdAt: { gte: startOfMonth } } });
      case 'content_idea':
        return this.prisma.generationJob.count({ where: { organizationId, type: 'IDEA_GENERATION', createdAt: { gte: startOfMonth } } });
      case 'brand_profile':
        return this.prisma.brandProfile.count({ where: { organizationId, deletedAt: null } });
      case 'editorial_plan':
        return this.prisma.editorialPlan.count({ where: { organizationId } });
      case 'image_generation': {
        const [legacy, creative] = await Promise.all([
          this.prisma.generationJob.count({ where: { organizationId, type: 'IMAGE_GENERATION', createdAt: { gte: startOfMonth } } }),
          this.prisma.creativeJob.count({ where: { organizationId, type: 'image-generation', createdAt: { gte: startOfMonth } } }),
        ]);
        return legacy + creative;
      }
      case 'video_generation': {
        const [legacy, creative] = await Promise.all([
          this.prisma.generationJob.count({ where: { organizationId, type: { in: ['VIDEO_GENERATION', 'VIDEO_SCRIPT'] }, createdAt: { gte: startOfMonth } } }),
          this.prisma.creativeJob.count({ where: { organizationId, type: { in: ['video-generation', 'b-roll'] }, createdAt: { gte: startOfMonth } } }),
        ]);
        return legacy + creative;
      }
      case 'video_script':
        return this.prisma.generationJob.count({ where: { organizationId, type: { in: ['VIDEO_GENERATION', 'VIDEO_SCRIPT'] }, createdAt: { gte: startOfMonth } } });
      case 'ad_kit':
        return this.prisma.adCreative.count({ where: { organizationId, createdAt: { gte: startOfMonth } } });
      case 'email_campaign':
        return this.prisma.emailCampaign.count({ where: { organizationId, createdAt: { gte: startOfMonth } } });
      default:
        return 0;
    }
  }
}
