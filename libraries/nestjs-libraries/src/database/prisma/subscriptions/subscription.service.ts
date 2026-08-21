import { Injectable } from '@nestjs/common';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { SubscriptionRepository } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.repository';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { Organization } from '@prisma/client';
import dayjs from 'dayjs';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { CreditAccountingService } from '@gitroom/nestjs-libraries/services/credit-accounting.service';
import { PricingCatalogService } from '@gitroom/nestjs-libraries/services/pricing-catalog.service';
import { BillingEntitlementsService } from '@gitroom/nestjs-libraries/services/billing-entitlements.service';
import { randomUUID } from 'crypto';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly _subscriptionRepository: SubscriptionRepository,
    private readonly _integrationService: IntegrationService,
    private readonly _organizationService: OrganizationService,
    private readonly credits: CreditAccountingService,
    private readonly pricingCatalog: PricingCatalogService,
    private readonly entitlements: BillingEntitlementsService,
  ) {}

  getSubscriptionByOrganizationId(organizationId: string) {
    return this._subscriptionRepository.getSubscriptionByOrganizationId(
      organizationId
    );
  }

  async useCredit<T>(
    organization: Organization,
    type = 'ai_images',
    func: () => Promise<T>,
    // A stable hash of the actual request content (prompt, params, ...), so
    // a dropped connection or client-side double-submit of the *same*
    // request collapses onto one reservation instead of reserving (and
    // eventually billing) credits twice for what the user experienced as
    // one click. Falls back to a random, never-colliding key for any caller
    // that doesn't have meaningful request content to key on — same
    // (correct, but non-deduplicating) behavior as before this existed.
    dedupeSeed?: string
  ): Promise<T> {
    const isVideo = type === 'ai_videos';
    await this.entitlements.assertFeature(organization.id, isVideo ? 'video-generation' : 'image-generation');
    const quote = await this.pricingCatalog.quote({ operation: isVideo ? 'seedance-2.5-480p-10' : 'image-basic' });
    const idempotencyKey = dedupeSeed
      ? `legacy-generation:${organization.id}:${type}:${dedupeSeed}:${Math.floor(Date.now() / 30000)}`
      : `legacy-generation:${organization.id}:${type}:${randomUUID()}`;
    const reservation = await this.credits.reserve(organization.id, quote.credits, {
      quoteId: quote.quoteId,
      idempotencyKey,
      operation: quote.operation,
      provider: quote.provider,
      model: quote.model,
      metadata: { compatibilityPath: true },
    });
    try {
      const result = await func();
      await this.credits.settle(reservation.id, quote.credits);
      return result;
    } catch (error) {
      await this.credits.refund(reservation.id, 'legacy-generation-failed');
      throw error;
    }
  }

  getCode(code: string) {
    return this._subscriptionRepository.getCode(code);
  }

  async deleteSubscription(customerId: string) {
    await this.modifySubscription(
      customerId,
      pricing.FREE.channel || 0,
      'FREE'
    );
    return this._subscriptionRepository.deleteSubscriptionByCustomerId(
      customerId
    );
  }

  updateCustomerId(organizationId: string, customerId: string) {
    return this._subscriptionRepository.updateCustomerId(
      organizationId,
      customerId
    );
  }

  async checkSubscription(organizationId: string, subscriptionId: string) {
    return await this._subscriptionRepository.checkSubscription(
      organizationId,
      subscriptionId
    );
  }

  async modifySubscriptionByOrg(
    organizationId: string,
    totalChannels: number,
    billing: 'FREE' | 'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE'
  ) {
    if (!organizationId) {
      return false;
    }

    const getCurrentSubscription =
      (await this._subscriptionRepository.getSubscriptionByOrgId(
        organizationId
      ))!;

    const from = pricing[getCurrentSubscription?.subscriptionTier || 'FREE'];
    const to = pricing[billing];

    const currentTotalChannels = (
      await this._integrationService.getIntegrationsList(organizationId)
    ).filter((f) => !f.disabled);

    if (currentTotalChannels.length > totalChannels) {
      await this._integrationService.disableIntegrations(
        organizationId,
        currentTotalChannels.length - totalChannels
      );
    }

    if (from.team_members && !to.team_members) {
      await this._organizationService.disableOrEnableNonSuperAdminUsers(
        organizationId,
        true
      );
    }

    if (!from.team_members && to.team_members) {
      await this._organizationService.disableOrEnableNonSuperAdminUsers(
        organizationId,
        false
      );
    }

    if (billing === 'FREE') {
      await this._integrationService.changeActiveCron(organizationId);
    }

    return true;
  }

  async modifySubscription(
    customerId: string,
    totalChannels: number,
    billing: 'FREE' | 'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE'
  ) {
    if (!customerId) {
      return false;
    }

    const getOrgByCustomerId =
      await this._subscriptionRepository.getOrganizationByCustomerId(
        customerId
      );

    const getCurrentSubscription =
      (await this._subscriptionRepository.getSubscriptionByCustomerId(
        customerId
      ))!;

    if (
      !getOrgByCustomerId ||
      (getCurrentSubscription && getCurrentSubscription?.isLifetime)
    ) {
      return false;
    }

    const from = pricing[getCurrentSubscription?.subscriptionTier || 'FREE'];
    const to = pricing[billing];

    const currentTotalChannels = (
      await this._integrationService.getIntegrationsList(
        getOrgByCustomerId?.id!
      )
    ).filter((f) => !f.disabled);

    if (currentTotalChannels.length > totalChannels) {
      await this._integrationService.disableIntegrations(
        getOrgByCustomerId?.id!,
        currentTotalChannels.length - totalChannels
      );
    }

    if (from.team_members && !to.team_members) {
      await this._organizationService.disableOrEnableNonSuperAdminUsers(
        getOrgByCustomerId?.id!,
        true
      );
    }

    if (!from.team_members && to.team_members) {
      await this._organizationService.disableOrEnableNonSuperAdminUsers(
        getOrgByCustomerId?.id!,
        false
      );
    }

    if (billing === 'FREE') {
      await this._integrationService.changeActiveCron(getOrgByCustomerId?.id!);
    }

    return true;
  }

  async createOrUpdateSubscription(
    isTrailing: boolean,
    identifier: string,
    customerId: string,
    totalChannels: number,
    billing: 'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE',
    period: 'MONTHLY' | 'YEARLY',
    cancelAt: number | null,
    code?: string,
    org?: string
  ) {
    if (!code) {
      try {
        const load = await this.modifySubscription(
          customerId,
          totalChannels,
          billing
        );
        if (!load) {
          return {};
        }
      } catch (e) {
        return {};
      }
    }
    return this._subscriptionRepository.createOrUpdateSubscription(
      isTrailing,
      identifier,
      customerId,
      totalChannels,
      billing,
      period,
      cancelAt,
      code,
      org ? { id: org } : undefined
    );
  }

  getSubscriptionByIdentifier(identifier: string) {
    return this._subscriptionRepository.getSubscriptionByIdentifier(identifier);
  }

  async getSubscription(organizationId: string) {
    return this._subscriptionRepository.getSubscription(organizationId);
  }

  async checkCredits(organization: Organization, checkType = 'ai_images') {
    const feature = checkType === 'ai_videos' ? 'video-generation' : 'image-generation';
    const access = await this.entitlements.resolveAccess(organization.id);
    if (!access.features.includes(feature)) return { credits: 0, available: 0, featureIncluded: false };
    const balance = await this.credits.getBalance(organization.id);
    return { credits: balance.balance, available: balance.balance, reserved: balance.reserved, featureIncluded: true };
  }

  async lifeTime(orgId: string, identifier: string, subscription: any) {
    return this.createOrUpdateSubscription(
      false,
      identifier,
      identifier,
      pricing[subscription].channel!,
      subscription,
      'YEARLY',
      null,
      identifier,
      orgId
    );
  }

  async addSubscription(orgId: string, userId: string, subscription: any) {
    await this._subscriptionRepository.setCustomerId(orgId, userId);
    return this.createOrUpdateSubscription(
      false,
      makeId(5),
      userId,
      pricing[subscription].channel!,
      subscription,
      'MONTHLY',
      null,
      undefined,
      orgId
    );
  }
}
