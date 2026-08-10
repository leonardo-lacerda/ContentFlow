import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { PlanLimitsService, GenerationType } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/plan-limits.service';
import { SubscriptionRepository } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.repository';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';

@ApiTags('Plan Limits')
@Controller('/plan-limits')
export class PlanLimitsController {
  constructor(
    private readonly _planLimitsService: PlanLimitsService,
    private readonly _subscriptionRepository: SubscriptionRepository,
  ) {}

  @Get('/usage')
  async getUsage(@GetOrgFromRequest() org: Organization) {
    const subscription =
      await this._subscriptionRepository.getSubscriptionByOrganizationId(org.id);

    const tier = subscription?.subscriptionTier || 'FREE';
    const planLimits = pricing[tier];

    const types: GenerationType[] = [
      'carousel_generation',
      'dna_extraction',
      'content_idea',
      'brand_profile',
      'editorial_plan',
      'image_generation',
      'video_generation',
      'ad_kit',
      'email_campaign',
      'video_script',
    ];

    const usage: Record<string, { current: number; limit: number; unlimited: boolean }> = {};

    for (const type of types) {
      const result = await this._planLimitsService.checkLimit(org.id, type);
      usage[type] = {
        current: result.current,
        limit: result.limit,
        unlimited: result.limit === -1,
      };
    }

    return {
      plan: tier,
      usage,
    };
  }
}
