import { Ability, AbilityBuilder, AbilityClass } from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { AuthorizationActions, Sections } from './permission.exception.class';
import { BillingEntitlementsService } from '@gitroom/nestjs-libraries/services/billing-entitlements.service';

export type AppAbility = Ability<[AuthorizationActions, Sections]>;

@Injectable()
export class PermissionsService {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _integrationService: IntegrationService,
    private _entitlements: BillingEntitlementsService
  ) {}
  async getPackageOptions(orgId: string) {
    const subscription =
      await this._subscriptionService.getSubscriptionByOrganizationId(orgId);

    const tier =
      subscription?.subscriptionTier ||
      (!process.env.STRIPE_PUBLISHABLE_KEY ? 'PRO' : 'FREE');

    const { channel, ...all } = pricing[tier];
    return {
      subscription,
      options: {
        ...all,
        ...{ channel: tier === 'FREE' ? channel : -10 },
      },
    };
  }

  async check(
    orgId: string,
    created_at: Date,
    permission: 'USER' | 'ADMIN' | 'SUPERADMIN',
    requestedPermission: Array<[AuthorizationActions, Sections]>,
    refreshChannelId?: string
  ) {
    const { can, build } = new AbilityBuilder<
      Ability<[AuthorizationActions, Sections]>
    >(Ability as AbilityClass<AppAbility>);

    if (
      requestedPermission.length === 0 ||
      !process.env.STRIPE_PUBLISHABLE_KEY
    ) {
      for (const [action, section] of requestedPermission) {
        can(action, section);
      }
      return build({
        detectSubjectType: (item) =>
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          item.constructor,
      });
    }

    const [{ options }, access] = await Promise.all([
      this.getPackageOptions(orgId),
      this._entitlements.resolveAccess(orgId),
    ]);
    for (const [action, section] of requestedPermission) {
      // Billing v2 is the commercial source of truth. Feature-specific checks
      // happen in the domain service before credits are reserved.
      if (section === Sections.AI) {
        if (access.features.includes('studio')) can(action, section);
        continue;
      }

      if (section === Sections.VIDEOS_PER_MONTH) {
        if (access.features.includes('video-generation')) can(action, section);
        continue;
      }

      // Publishing is no longer count-limited by the subscription tier.
      if (section === Sections.POSTS_PER_MONTH) {
        can(action, section);
        continue;
      }

      // check for the amount of channels
      if (section === Sections.CHANNEL) {
        // Refreshing an existing channel doesn't add a new one, so skip the limit check
        // but only if the channel actually belongs to this org
        if (refreshChannelId) {
          const existingIntegration =
            await this._integrationService.getIntegrationById(
              orgId,
              refreshChannelId
            );
          if (existingIntegration) {
            can(action, section);
            continue;
          }
        }

        const totalChannels = (
          await this._integrationService.getIntegrationsList(orgId)
        ).filter((f) => !f.refreshNeeded).length;

        if (access.capacities.channels > totalChannels) {
          can(action, section);
        }
        continue;
      }

      if (section === Sections.WEBHOOKS) {
        if (access.features.includes('webhooks')) can(action, section);
        continue;
      }

      if (section === Sections.TEAM_MEMBERS && options.team_members) {
        can(action, section);
        continue;
      }

      if (
        section === Sections.ADMIN &&
        ['ADMIN', 'SUPERADMIN'].includes(permission)
      ) {
        can(action, section);
        continue;
      }

      if (
        section === Sections.COMMUNITY_FEATURES &&
        options.community_features
      ) {
        can(action, section);
        continue;
      }

      if (
        section === Sections.FEATURED_BY_GITROOM &&
        options.featured_by_gitroom
      ) {
        can(action, section);
        continue;
      }

      if (
        section === Sections.IMPORT_FROM_CHANNELS &&
        options.import_from_channels
      ) {
        can(action, section);
      }
    }

    return build({
      detectSubjectType: (item) =>
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        item.constructor,
    });
  }
}
