import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { SubscriptionRepository } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.repository';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

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

@Injectable()
export class PlanLimitsService {
  constructor(
    private readonly _subscriptionRepository: SubscriptionRepository,
    private readonly _prisma: PrismaService,
  ) {}

  /**
   * Check if an organization can perform a generation action.
   * Throws HttpException if limit exceeded.
   */
  async enforceLimit(
    organizationId: string,
    type: GenerationType,
  ): Promise<LimitCheckResult> {
    const result = await this.checkLimit(organizationId, type);
    if (!result.allowed) {
      throw new HttpException(
        {
          message: `Limite do plano ${result.plan} atingido para ${this.getTypeLabel(type)}. Atual: ${result.current}/${result.limit}. Faça upgrade para continuar.`,
          code: 'PLAN_LIMIT_EXCEEDED',
          type,
          current: result.current,
          limit: result.limit,
          plan: result.plan,
          upgradeMessage: result.upgradeMessage,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    return result;
  }

  /**
   * Check limit without throwing. Returns whether the action is allowed.
   */
  async checkLimit(
    organizationId: string,
    type: GenerationType,
  ): Promise<LimitCheckResult> {
    const subscription =
      await this._subscriptionRepository.getSubscriptionByOrganizationId(
        organizationId,
      );

    const tier = subscription?.subscriptionTier || 'FREE';
    const planLimits = pricing[tier];

    if (!planLimits) {
      return {
        allowed: false,
        current: 0,
        limit: 0,
        plan: tier,
        upgradeMessage: 'Plano não encontrado. Entre em contato com o suporte.',
      };
    }

    const limit = this.getLimitForType(planLimits, type);
    // -1 means unlimited
    if (limit === -1) {
      return { allowed: true, current: 0, limit: -1, plan: tier };
    }

    const current = await this.getCurrentUsage(organizationId, type);
    const allowed = current < limit;

    return {
      allowed,
      current,
      limit,
      plan: tier,
      upgradeMessage: allowed
        ? undefined
        : this.getUpgradeMessage(tier, type),
    };
  }

  /**
   * Get current month's usage count for a generation type.
   */
  private async getCurrentUsage(
    organizationId: string,
    type: GenerationType,
  ): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    switch (type) {
      case 'carousel_generation':
        return this._prisma.generationJob.count({
          where: {
            organizationId,
            type: { in: ['CAROUSEL_PLAN', 'IMAGE_GENERATION', 'BULK_GENERATION'] },
            createdAt: { gte: startOfMonth },
          },
        });

      case 'dna_extraction':
        return this._prisma.generationJob.count({
          where: {
            organizationId,
            type: 'BRAND_DNA_EXTRACTION',
            createdAt: { gte: startOfMonth },
          },
        });

      case 'content_idea':
        return this._prisma.generationJob.count({
          where: {
            organizationId,
            type: 'IDEA_GENERATION',
            createdAt: { gte: startOfMonth },
          },
        });

      case 'brand_profile':
        return this._prisma.brandProfile.count({
          where: {
            organizationId,
            deletedAt: null,
          },
        });

      case 'editorial_plan':
        return this._prisma.editorialPlan.count({
          where: {
            organizationId,
          },
        });

      case 'image_generation':
        {
          const [legacy, creative] = await Promise.all([
            this._prisma.generationJob.count({
              where: {
                organizationId,
                type: 'IMAGE_GENERATION',
                createdAt: { gte: startOfMonth },
              },
            }),
            this._prisma.creativeJob.count({
              where: {
                organizationId,
                type: 'image-generation',
                createdAt: { gte: startOfMonth },
              },
            }),
          ]);
          return legacy + creative;
        }

      case 'video_generation':
      case 'video_script':
        {
          const legacy = await this._prisma.generationJob.count({
            where: {
              organizationId,
              type: { in: ['VIDEO_GENERATION', 'VIDEO_SCRIPT'] },
              createdAt: { gte: startOfMonth },
            },
          });
          if (type === 'video_script') return legacy;
          const creative = await this._prisma.creativeJob.count({
            where: {
              organizationId,
              type: { in: ['video-generation', 'b-roll'] },
              createdAt: { gte: startOfMonth },
            },
          });
          return legacy + creative;
        }

      case 'ad_kit':
        return this._prisma.adCreative.count({
          where: {
            organizationId,
            createdAt: { gte: startOfMonth },
          },
        });

      case 'email_campaign':
        return this._prisma.emailCampaign.count({
          where: {
            organizationId,
            createdAt: { gte: startOfMonth },
          },
        });

      default:
        return 0;
    }
  }

  private getLimitForType(planLimits: any, type: GenerationType): number {
    switch (type) {
      case 'carousel_generation':
        return planLimits.carousel_generations_per_month;
      case 'dna_extraction':
        return planLimits.dna_extractions_per_month;
      case 'content_idea':
        return planLimits.content_ideas_per_month;
      case 'brand_profile':
        return planLimits.brand_profiles;
      case 'editorial_plan':
        return planLimits.editorial_plans;
      case 'image_generation':
        return planLimits.image_generation_count;
      case 'video_generation':
        return planLimits.generate_videos;
      case 'ad_kit':
        return planLimits.ad_kits_per_month;
      case 'email_campaign':
        return planLimits.email_campaigns_per_month;
      case 'video_script':
        return planLimits.video_scripts_per_month ?? planLimits.generate_videos;
      default:
        return 0;
    }
  }

  private getTypeLabel(type: GenerationType): string {
    const labels: Record<GenerationType, string> = {
      carousel_generation: 'geração de carrossel',
      dna_extraction: 'extração de Brand DNA',
      content_idea: 'geração de ideias',
      editorial_plan: 'planos editoriais',
      brand_profile: 'perfis de marca',
      image_generation: 'geração de imagem',
      video_generation: 'geração de vídeo',
      ad_kit: 'kits de anúncio',
      email_campaign: 'campanhas de e-mail',
      video_script: 'roteiros de vídeo',
    };
    return labels[type] || type;
  }

  private getUpgradeMessage(currentTier: string, type: GenerationType): string {
    const tierOrder = ['FREE', 'STANDARD', 'PRO', 'TEAM', 'ULTIMATE'];
    const currentIndex = tierOrder.indexOf(currentTier);
    const nextTier = tierOrder[currentIndex + 1];

    if (!nextTier) {
      return 'Você já está no plano máximo. Entre em contato para limites personalizados.';
    }

    return `Faça upgrade para ${nextTier} para ter mais ${this.getTypeLabel(type)}.`;
  }
}
