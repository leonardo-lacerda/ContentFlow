// Regression coverage for the 2026-08-20 payment-security audit finding P-4
// (lifetime-code padding-oracle hardening): AuthService.fixedDecryption is
// unauthenticated CBC — any ciphertext that happens to decrypt with valid
// PKCS7 padding (roughly 1 in 256 random inputs) was previously accepted as
// a "valid" code as long as it wasn't already in UsedCodes, with no check
// that the plaintext actually matches the shape codes.service.ts ever
// generates (`<providerToken>:<index 0-9999>`). This only narrows what's
// accepted post-decryption — it doesn't and can't change the underlying
// padding-guess probability, which is why the endpoint stays behind
// V1SurfaceGuard regardless.

jest.mock(
  '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service',
  () => ({
    SubscriptionService: jest.fn().mockImplementation(() => ({
      createOrUpdateSubscription: jest.fn(),
      deleteSubscription: jest.fn(),
      getSubscriptionByOrganizationId: jest.fn(),
      getCode: jest.fn(),
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
import { AuthService } from '@gitroom/helpers/auth/auth.service';

describe('StripeService.lifetimeDeal — code format hardening (P-4)', () => {
  let subscriptionService: SubscriptionService;
  let service: StripeServiceType;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
  });

  beforeEach(() => {
    subscriptionService = {
      createOrUpdateSubscription: jest.fn().mockResolvedValue({ ok: true }),
      deleteSubscription: jest.fn(),
      getSubscriptionByOrganizationId: jest.fn().mockResolvedValue(null),
      getCode: jest.fn().mockResolvedValue(null),
    } as any;
    service = new StripeService(
      subscriptionService,
      {} as OrganizationService,
      {} as UsersService,
      {} as TrackService
    );
  });

  it('accepts a code shaped exactly like ones codes.service.ts actually generates', async () => {
    const code = AuthService.fixedEncryption('APPSUMO_TIER1:42');

    const result = await service.lifetimeDeal('org-1', code);

    expect(result).toEqual({ success: true });
    expect(subscriptionService.createOrUpdateSubscription).toHaveBeenCalledWith(
      false,
      expect.any(String),
      'org-1',
      expect.any(Number),
      'STANDARD',
      'MONTHLY',
      null,
      'APPSUMO_TIER1:42',
      'org-1'
    );
  });

  it('rejects a ciphertext that decrypts successfully but not to the <token>:<index> shape', async () => {
    // A real forgery attempt: some ciphertext that happens to pass CBC
    // padding validation, but the plaintext it decrypts to was never a code
    // this app issued.
    const forged = AuthService.fixedEncryption('just some guessed plaintext');

    const result = await service.lifetimeDeal('org-1', forged);

    expect(result).toEqual({ success: false });
    expect(subscriptionService.createOrUpdateSubscription).not.toHaveBeenCalled();
  });

  it('rejects an index outside the 0-9999 range codes.service.ts ever generates', async () => {
    const outOfRange = AuthService.fixedEncryption('APPSUMO_TIER1:99999');

    const result = await service.lifetimeDeal('org-1', outOfRange);

    expect(result).toEqual({ success: false });
    expect(subscriptionService.createOrUpdateSubscription).not.toHaveBeenCalled();
  });

  it('rejects a code that has already been redeemed', async () => {
    (subscriptionService.getCode as jest.Mock).mockResolvedValue({ code: 'APPSUMO_TIER1:7' });
    const code = AuthService.fixedEncryption('APPSUMO_TIER1:7');

    const result = await service.lifetimeDeal('org-1', code);

    expect(result).toEqual({ success: false });
    expect(subscriptionService.createOrUpdateSubscription).not.toHaveBeenCalled();
  });

  it('rejects a code that cannot be decrypted at all', async () => {
    const result = await service.lifetimeDeal('org-1', 'not-valid-hex-ciphertext');

    expect(result).toEqual({ success: false });
    expect(subscriptionService.createOrUpdateSubscription).not.toHaveBeenCalled();
  });
});
