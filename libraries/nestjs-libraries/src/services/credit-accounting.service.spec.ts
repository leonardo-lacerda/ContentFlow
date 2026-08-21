import { HttpException } from '@nestjs/common';
import { CreditAccountingService } from './credit-accounting.service';

// Regression coverage for the 2026-08-20 payment-security audit finding P-7
// (LOW/MEDIUM, latent): reserve()/grant() looked up an existing row purely
// by the globally-unique idempotencyKey and handed it back without checking
// it actually belongs to the requesting organization. Every current caller
// happens to prefix the key with the org id, so this wasn't reachable in
// practice, but it was a convention, not a check — a future caller (or a
// client-influenced idempotency key on a path that forgot to re-scope it)
// would otherwise silently receive another org's credit data.

describe('CreditAccountingService — idempotency lookups are org-scoped (P-7)', () => {
  describe('grant()', () => {
    it('returns the existing transaction when it belongs to the requesting org', async () => {
      const prisma = {
        creditAccount: { upsert: jest.fn().mockResolvedValue(undefined) },
        creditTransaction: {
          findUnique: jest.fn().mockResolvedValue({ id: 'tx-1', organizationId: 'org-1' }),
        },
      };
      const service = new CreditAccountingService(prisma as any);

      const result = await service.grant('org-1', {
        source: 'ADMIN',
        sourceReference: 'ref-1',
        credits: 100,
      }, 'shared-key');

      expect(result).toEqual({ id: 'tx-1', organizationId: 'org-1' });
    });

    it('throws instead of silently returning another organization\'s transaction for a colliding key', async () => {
      const prisma = {
        creditAccount: { upsert: jest.fn().mockResolvedValue(undefined) },
        creditTransaction: {
          findUnique: jest.fn().mockResolvedValue({ id: 'tx-1', organizationId: 'org-OTHER' }),
        },
      };
      const service = new CreditAccountingService(prisma as any);

      await expect(
        service.grant('org-1', { source: 'ADMIN', sourceReference: 'ref-1', credits: 100 }, 'shared-key')
      ).rejects.toBeInstanceOf(HttpException);
    });
  });

  describe('reserve()', () => {
    const buildService = (existingReservation: any) => {
      const prisma = {
        creditAccount: { findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE', debtCredits: 0 }) },
        creditReservation: { findUnique: jest.fn().mockResolvedValue(existingReservation) },
      };
      const service = new CreditAccountingService(prisma as any);
      jest.spyOn(service, 'ensureAccount').mockResolvedValue(undefined as any);
      return service;
    };

    it('returns the existing reservation when it belongs to the requesting org', async () => {
      const service = buildService({ id: 'res-1', organizationId: 'org-1' });

      const result = await service.reserve('org-1', 10, { idempotencyKey: 'shared-key' });

      expect(result).toEqual({ id: 'res-1', organizationId: 'org-1' });
    });

    it('throws instead of silently returning another organization\'s reservation for a colliding key', async () => {
      const service = buildService({ id: 'res-1', organizationId: 'org-OTHER' });

      await expect(
        service.reserve('org-1', 10, { idempotencyKey: 'shared-key' })
      ).rejects.toBeInstanceOf(HttpException);
    });
  });
});
