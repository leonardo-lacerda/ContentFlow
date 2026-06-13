import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';

// `SubscriptionService` (transitively, via `IntegrationService` →
// `IntegrationManager` → the Nostr provider) drags in `nostr-tools`, an
// ESM-only package the default ts-jest CommonJS transform can't parse.
// `StripeService` only calls `.createOrUpdateSubscription`/`.deleteSubscription`
// on it, so a lightweight stub is enough to keep this a true unit test of the
// webhook event-processing logic.
jest.mock(
  '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service',
  () => ({
    SubscriptionService: jest.fn().mockImplementation(() => ({
      createOrUpdateSubscription: jest.fn(),
      deleteSubscription: jest.fn(),
    })),
  })
);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { StripeService } = require('./stripe.service');
import type { StripeService as StripeServiceType } from './stripe.service';
import type { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import type { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import type { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import type { TrackService } from '@gitroom/nestjs-libraries/track/track.service';

const buildEvent = (overrides: {
  status?: string;
  customer?: string;
  cancelAt?: number | null;
  metadata?: Record<string, string>;
}) =>
  ({
    data: {
      object: {
        status: overrides.status ?? 'active',
        customer: overrides.customer ?? 'cus_123',
        cancel_at: overrides.cancelAt ?? null,
        metadata: overrides.metadata ?? {
          uniqueId: 'unique-1',
          billing: 'STANDARD',
          period: 'MONTHLY',
        },
      },
    },
  } as any);

describe('StripeService — webhook event processing', () => {
  let subscriptionService: SubscriptionService;
  let organizationService: OrganizationService;
  let usersService: UsersService;
  let trackService: TrackService;
  let service: StripeServiceType;

  beforeEach(() => {
    subscriptionService = {
      createOrUpdateSubscription: jest.fn().mockResolvedValue({ ok: true }),
      deleteSubscription: jest.fn().mockResolvedValue(undefined),
    } as unknown as SubscriptionService;
    organizationService = {} as unknown as OrganizationService;
    usersService = {} as unknown as UsersService;
    trackService = {} as unknown as TrackService;

    service = new StripeService(
      subscriptionService,
      organizationService,
      usersService,
      trackService
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createSubscription', () => {
    it('forwards the parsed metadata and pricing tier to the subscription service when the card check passes', async () => {
      jest.spyOn(service, 'checkValidCard').mockResolvedValue(true);

      const event = buildEvent({ status: 'active', customer: 'cus_123' });
      const result = await service.createSubscription(event);

      expect(subscriptionService.createOrUpdateSubscription).toHaveBeenCalledWith(
        false, // status === 'active' → not "stopped"
        'unique-1',
        'cus_123',
        pricing.STANDARD.channel,
        'STANDARD',
        'MONTHLY',
        null
      );
      expect(result).toEqual({ ok: true });
    });

    it('marks the subscription as stopped when the Stripe status is not active', async () => {
      jest.spyOn(service, 'checkValidCard').mockResolvedValue(true);

      await service.createSubscription(
        buildEvent({ status: 'incomplete', customer: 'cus_123' })
      );

      expect(subscriptionService.createOrUpdateSubscription).toHaveBeenCalledWith(
        true,
        expect.any(String),
        'cus_123',
        expect.any(Number),
        'STANDARD',
        'MONTHLY',
        null
      );
    });

    it('does not create a subscription when the card check fails', async () => {
      jest.spyOn(service, 'checkValidCard').mockResolvedValue(false);

      const result = await service.createSubscription(buildEvent({}));

      expect(subscriptionService.createOrUpdateSubscription).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: false });
    });

    it('treats a card-check failure as a declined subscription instead of throwing', async () => {
      jest.spyOn(service, 'checkValidCard').mockRejectedValue(new Error('stripe down'));

      const result = await service.createSubscription(buildEvent({}));

      expect(subscriptionService.createOrUpdateSubscription).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: false });
    });
  });

  describe('updateSubscription', () => {
    it('forwards the parsed metadata and pricing tier to the subscription service when the card check passes', async () => {
      jest.spyOn(service, 'checkValidCard').mockResolvedValue(true);

      const event = buildEvent({
        status: 'active',
        customer: 'cus_456',
        metadata: { uniqueId: 'unique-2', billing: 'PRO', period: 'YEARLY' },
      });
      const result = await service.updateSubscription(event);

      expect(subscriptionService.createOrUpdateSubscription).toHaveBeenCalledWith(
        false,
        'unique-2',
        'cus_456',
        pricing.PRO.channel,
        'PRO',
        'YEARLY',
        null
      );
      expect(result).toEqual({ ok: true });
    });

    it('does not update the subscription when the card check fails', async () => {
      jest.spyOn(service, 'checkValidCard').mockResolvedValue(false);

      const result = await service.updateSubscription(buildEvent({}));

      expect(subscriptionService.createOrUpdateSubscription).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: false });
    });
  });

  describe('deleteSubscription', () => {
    it('removes the subscription tied to the Stripe customer id', async () => {
      await service.deleteSubscription(buildEvent({ customer: 'cus_789' }));

      expect(subscriptionService.deleteSubscription).toHaveBeenCalledWith('cus_789');
    });
  });
});
