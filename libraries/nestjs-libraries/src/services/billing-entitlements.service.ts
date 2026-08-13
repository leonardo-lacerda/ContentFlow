import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { SubscriptionRepository } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.repository';
import {
  BillingCapacityCode,
  BillingFeatureCode,
  BillingModelAccessCode,
  BillingPlanCode,
  getBillingCatalogPlan,
} from './billing-catalog';

const LEGACY_PLAN_MAP: Record<string, BillingPlanCode> = {
  FREE: 'FREE',
  STANDARD: 'CREATOR',
  PRO: 'PRO',
  TEAM: 'STUDIO',
  ULTIMATE: 'AGENCY',
};

const PAYMENT_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export type ResolvedPlanAccess = {
  plan: BillingPlanCode;
  features: BillingFeatureCode[];
  models: BillingModelAccessCode[];
  capacities: Record<BillingCapacityCode, number>;
  cycleCredits: number;
  renewsAt: Date | null;
  subscriptionStatus: string;
  source: 'billing-v2' | 'legacy' | 'free';
};

@Injectable()
export class BillingEntitlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionRepository,
  ) {}

  async resolveAccess(organizationId: string): Promise<ResolvedPlanAccess> {
    const subscription = await this.prisma.billingSubscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });

    if (subscription) {
      const now = Date.now();
      const periodIsActive = !subscription.currentPeriodEnd || subscription.currentPeriodEnd.getTime() > now;
      const status = subscription.status.toUpperCase();
      const failedAt = subscription.failedAt?.getTime() || subscription.updatedAt.getTime();
      const inPaymentGrace = status === 'PAST_DUE' && now - failedAt <= PAYMENT_GRACE_MS;
      const canUsePaidPlan = ['ACTIVE', 'TRIALING'].includes(status)
        || (subscription.cancelAtPeriodEnd && periodIsActive)
        || inPaymentGrace;
      const plan = getBillingCatalogPlan(canUsePaidPlan ? subscription.plan.code : 'FREE');
      return this.result(plan, subscription.currentPeriodEnd, status, 'billing-v2');
    }

    const legacy = await this.subscriptions.getSubscriptionByOrganizationId(organizationId);
    if (legacy?.subscriptionTier) {
      const mapped = LEGACY_PLAN_MAP[legacy.subscriptionTier.toUpperCase()] || 'FREE';
      return this.result(getBillingCatalogPlan(mapped), null, 'LEGACY', 'legacy');
    }

    return this.result(getBillingCatalogPlan('FREE'), null, 'ACTIVE', 'free');
  }

  async assertFeature(organizationId: string, feature: BillingFeatureCode) {
    const access = await this.resolveAccess(organizationId);
    if (!access.features.includes(feature)) {
      throw new HttpException({
        code: 'FEATURE_NOT_INCLUDED',
        message: 'Esta funcionalidade nao esta incluida no seu plano.',
        feature,
        plan: access.plan,
      }, HttpStatus.FORBIDDEN);
    }
    return access;
  }

  async assertModel(organizationId: string, model: BillingModelAccessCode) {
    const access = await this.resolveAccess(organizationId);
    if (!access.models.includes(model)) {
      throw new HttpException({
        code: 'FEATURE_NOT_INCLUDED',
        message: 'Este modelo de IA nao esta incluido no seu plano.',
        model,
        plan: access.plan,
      }, HttpStatus.FORBIDDEN);
    }
    return access;
  }

  async assertCapacity(organizationId: string, capacity: BillingCapacityCode, current: number) {
    const access = await this.resolveAccess(organizationId);
    const limit = access.capacities[capacity];
    if (current >= limit) {
      throw new HttpException({
        code: 'CAPACITY_REACHED',
        message: `A capacidade de ${capacity} do plano foi atingida.`,
        capacity,
        current,
        limit,
        plan: access.plan,
      }, HttpStatus.CONFLICT);
    }
    return access;
  }

  private result(
    plan: ReturnType<typeof getBillingCatalogPlan>,
    renewsAt: Date | null,
    subscriptionStatus: string,
    source: ResolvedPlanAccess['source'],
  ): ResolvedPlanAccess {
    return {
      plan: plan.code,
      features: [...plan.access.features],
      models: [...plan.access.models],
      capacities: { ...plan.access.capacities },
      cycleCredits: plan.monthlyCredits,
      renewsAt,
      subscriptionStatus,
      source,
    };
  }
}
