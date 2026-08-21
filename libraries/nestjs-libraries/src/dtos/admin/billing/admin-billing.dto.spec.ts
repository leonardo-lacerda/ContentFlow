import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AdminAdjustCreditsDto,
  AdminChangeSubscriptionDto,
  AdminCreatePlanDto,
  AdminCreatePriceDto,
  AdminUpdatePlanDto,
  AdminUpdatePriceDto,
} from './admin-billing.dto';

// Regression coverage for the 2026-08-20 payment-security audit finding M-2
// (MEDIUM): admin-billing-ai.controller.ts's createPlan/updatePlan/
// createPrice/updatePrice/createSubscription/changeSubscription endpoints
// typed @Body() as a plain TS object literal instead of a class-validator
// DTO. Nest's global ValidationPipe (whitelist: true,
// forbidNonWhitelisted: true, main.ts) only actually validates a parameter
// whose reflected metatype is a real decorated class — a plain object-type
// literal reflects as `Object` and is silently skipped, so an
// already-authenticated admin could smuggle extra fields straight into a
// Prisma `update`/`create` call. These options (whitelist,
// forbidNonWhitelisted) are exactly what the pipe passes to class-validator,
// so exercising validate() directly with the same options is a faithful
// reproduction of what the pipe enforces at runtime.

const validateOptions = { whitelist: true, forbidNonWhitelisted: true } as const;

describe('Admin billing DTOs reject mass-assignment and out-of-bounds values (M-2)', () => {
  it('AdminCreatePlanDto rejects an unexpected extra field instead of forwarding it to Prisma', async () => {
    const instance = plainToInstance(AdminCreatePlanDto, {
      code: 'PRO',
      name: 'Pro',
      priceCents: 9900,
      monthlyCredits: 5000,
      isSecretlyFree: true, // not a real field — must not survive validation
    });

    const errors = await validate(instance, validateOptions);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'isSecretlyFree')).toBe(true);
  });

  it('AdminCreatePlanDto rejects missing required fields', async () => {
    const instance = plainToInstance(AdminCreatePlanDto, { code: 'PRO' });
    const errors = await validate(instance, validateOptions);
    const properties = errors.map((e) => e.property);
    expect(properties).toEqual(expect.arrayContaining(['name', 'priceCents', 'monthlyCredits']));
  });

  it('AdminCreatePlanDto rejects a non-positive priceCents', async () => {
    const instance = plainToInstance(AdminCreatePlanDto, {
      code: 'PRO',
      name: 'Pro',
      priceCents: 0,
      monthlyCredits: 5000,
    });
    const errors = await validate(instance, validateOptions);
    expect(errors.some((e) => e.property === 'priceCents')).toBe(true);
  });

  it('AdminCreatePlanDto rejects a negative monthlyCredits', async () => {
    const instance = plainToInstance(AdminCreatePlanDto, {
      code: 'PRO',
      name: 'Pro',
      priceCents: 9900,
      monthlyCredits: -1,
    });
    const errors = await validate(instance, validateOptions);
    expect(errors.some((e) => e.property === 'monthlyCredits')).toBe(true);
  });

  it('AdminCreatePlanDto accepts a well-formed payload with no errors', async () => {
    const instance = plainToInstance(AdminCreatePlanDto, {
      code: 'PRO',
      name: 'Pro',
      priceCents: 9900,
      monthlyCredits: 5000,
    });
    const errors = await validate(instance, validateOptions);
    expect(errors).toHaveLength(0);
  });

  it('AdminUpdatePlanDto rejects an unexpected extra field', async () => {
    const instance = plainToInstance(AdminUpdatePlanDto, { active: true, code: 'HACKED' });
    const errors = await validate(instance, validateOptions);
    expect(errors.some((e) => e.property === 'code')).toBe(true);
  });

  it('AdminCreatePriceDto rejects an unexpected extra field and a non-positive amount', async () => {
    const instance = plainToInstance(AdminCreatePriceDto, {
      code: 'TOPUP_SMALL',
      amountCents: -500,
      credits: 100,
      stripePriceId: 'price_forged', // not a real field on this DTO
    });
    const errors = await validate(instance, validateOptions);
    const properties = errors.map((e) => e.property);
    expect(properties).toEqual(expect.arrayContaining(['amountCents', 'stripePriceId']));
  });

  it('AdminUpdatePriceDto rejects a negative credits value', async () => {
    const instance = plainToInstance(AdminUpdatePriceDto, { credits: -10 });
    const errors = await validate(instance, validateOptions);
    expect(errors.some((e) => e.property === 'credits')).toBe(true);
  });

  it('AdminChangeSubscriptionDto rejects an unexpected extra field like organizationId', async () => {
    const instance = plainToInstance(AdminChangeSubscriptionDto, {
      cancelAtPeriodEnd: true,
      organizationId: 'org-someone-elses',
    });
    const errors = await validate(instance, validateOptions);
    expect(errors.some((e) => e.property === 'organizationId')).toBe(true);
  });

  it('AdminAdjustCreditsDto rejects a non-integer credits value', async () => {
    const instance = plainToInstance(AdminAdjustCreditsDto, {
      organizationId: 'org-1',
      credits: 12.5,
      reason: 'goodwill credit',
    });
    const errors = await validate(instance, validateOptions);
    expect(errors.some((e) => e.property === 'credits')).toBe(true);
  });
});
