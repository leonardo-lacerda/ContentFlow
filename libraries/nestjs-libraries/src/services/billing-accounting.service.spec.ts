import { BillingAccountingService } from './billing-accounting.service';

// Regression coverage for 2026-08-20 payment-security audit findings V-5,
// P-1 and P-3:
//   V-5 — charge.refunded only flipped BillingInvoice.status; the credits
//         already granted for that invoice were never clawed back, so a
//         refunded/charged-back top-up (or subscription payment) stayed
//         permanently spendable.
//   P-1 — charge.dispute.created only blocked credit *spending*
//         (creditAccount.status), never the subscription's plan-tier
//         features — resolveAccess() only reads billingSubscription.status.
//   P-3 — recordWebhook's unique constraint on eventId meant a webhook that
//         failed partway through (leaving e.g. a subscription upserted but
//         its credits ungranted) could never be retried: Stripe's retry of
//         the same event id always hit the row from the first, failed
//         attempt and was silently treated as a duplicate.

describe('BillingAccountingService.revokeCreditsForInvoice (V-5)', () => {
  const buildService = (invoice: any) => {
    const prisma = {
      billingInvoice: {
        findUnique: jest.fn().mockResolvedValue(invoice),
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    const credits = { adjust: jest.fn().mockResolvedValue(undefined) };
    const service = new BillingAccountingService(prisma as any, credits as any);
    return { service, prisma, credits };
  };

  it('claws back the credits and marks the invoice REFUNDED', async () => {
    const { service, prisma, credits } = buildService({
      id: 'inv_1',
      organizationId: 'org-1',
      status: 'PAID',
      creditsGranted: 10000,
    });

    const result = await service.revokeCreditsForInvoice('pi_123', 'stripe:charge.refunded:ch_1');

    expect(prisma.billingInvoice.update).toHaveBeenCalledWith({
      where: { id: 'inv_1' },
      data: { status: 'REFUNDED' },
    });
    expect(credits.adjust).toHaveBeenCalledWith(
      'org-1',
      -10000,
      'stripe:charge.refunded:ch_1',
      'system:stripe-refund',
      'pi_123'
    );
    expect(result).toEqual({ revoked: true, organizationId: 'org-1', creditsRevoked: 10000 });
  });

  it('is a no-op (but not an error) when no matching invoice exists', async () => {
    const { service, credits } = buildService(null);

    const result = await service.revokeCreditsForInvoice('pi_unknown', 'reason');

    expect(credits.adjust).not.toHaveBeenCalled();
    expect(result).toEqual({ revoked: false, why: 'invoice_not_found' });
  });

  it('does not double-revoke an invoice that was already refunded (idempotent under webhook redelivery)', async () => {
    const { service, prisma, credits } = buildService({
      id: 'inv_2',
      organizationId: 'org-1',
      status: 'REFUNDED',
      creditsGranted: 10000,
    });

    const result = await service.revokeCreditsForInvoice('pi_456', 'reason');

    expect(prisma.billingInvoice.update).not.toHaveBeenCalled();
    expect(credits.adjust).not.toHaveBeenCalled();
    expect(result).toEqual({ revoked: false, why: 'already_refunded' });
  });

  it('marks the invoice refunded without touching credits when nothing was ever granted', async () => {
    const { service, prisma, credits } = buildService({
      id: 'inv_3',
      organizationId: 'org-1',
      status: 'PENDING',
      creditsGranted: 0,
    });

    const result = await service.revokeCreditsForInvoice('pi_789', 'reason');

    expect(prisma.billingInvoice.update).toHaveBeenCalled();
    expect(credits.adjust).not.toHaveBeenCalled();
    expect(result).toEqual({ revoked: true, organizationId: 'org-1', creditsRevoked: 0 });
  });
});

describe('BillingAccountingService.markSubscriptionDisputed (P-1)', () => {
  it('blocks credit spend AND revokes plan-tier subscription status', async () => {
    const prisma = {
      creditAccount: { upsert: jest.fn().mockResolvedValue(undefined) },
      billingSubscription: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const service = new BillingAccountingService(prisma as any, {} as any);

    await service.markSubscriptionDisputed('org-1', 'stripe:charge.dispute.created:dp_1');

    expect(prisma.creditAccount.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org-1' },
      update: { status: 'CHARGEBACK' },
    }));
    expect(prisma.billingSubscription.updateMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      data: { status: 'DISPUTED', metadata: { reason: 'stripe:charge.dispute.created:dp_1' } },
    });
  });
});

describe('BillingAccountingService.recordWebhook (P-3)', () => {
  const buildService = (existingRow: any) => {
    const prisma = {
      billingWebhookEvent: {
        findUnique: jest.fn().mockResolvedValue(existingRow),
        create: jest.fn().mockResolvedValue({ id: 'row-new', status: 'RECEIVED' }),
        update: jest.fn().mockResolvedValue({ id: existingRow?.id, status: 'RECEIVED' }),
      },
    };
    const service = new BillingAccountingService(prisma as any, {} as any);
    return { service, prisma };
  };

  it('claims a brand new event id', async () => {
    const { service, prisma } = buildService(null);

    const result = await service.recordWebhook({ id: 'evt_1', type: 'charge.refunded', payload: {} });

    expect(prisma.billingWebhookEvent.create).toHaveBeenCalled();
    expect(result).toEqual({ id: 'row-new', status: 'RECEIVED' });
  });

  it('treats an already-PROCESSED event as a genuine duplicate', async () => {
    const { service, prisma } = buildService({ id: 'row-1', status: 'PROCESSED' });

    const result = await service.recordWebhook({ id: 'evt_2', type: 'charge.refunded', payload: {} });

    expect(prisma.billingWebhookEvent.create).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('treats a currently in-flight (RECEIVED) event as a duplicate, not a retry', async () => {
    const { service, prisma } = buildService({ id: 'row-1', status: 'RECEIVED' });

    const result = await service.recordWebhook({ id: 'evt_3', type: 'charge.refunded', payload: {} });

    expect(prisma.billingWebhookEvent.create).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('re-claims an event whose previous attempt FAILED, instead of silently dropping the retry', async () => {
    const { service, prisma } = buildService({ id: 'row-1', status: 'FAILED' });

    const result = await service.recordWebhook({ id: 'evt_4', type: 'charge.refunded', payload: {} });

    expect(prisma.billingWebhookEvent.update).toHaveBeenCalledWith({
      where: { eventId: 'evt_4' },
      data: { status: 'RECEIVED', error: null },
    });
    expect(result).not.toBeNull();
  });

  it('recovers from a concurrent-insert race (P2002) by re-checking the row that won', async () => {
    const prisma = {
      billingWebhookEvent: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null) // first check: not found yet
          .mockResolvedValueOnce({ id: 'row-1', status: 'PROCESSED' }), // re-check after conflict
        create: jest.fn().mockRejectedValue({ code: 'P2002' }),
        update: jest.fn(),
      },
    };
    const service = new BillingAccountingService(prisma as any, {} as any);

    const result = await service.recordWebhook({ id: 'evt_5', type: 'charge.refunded', payload: {} });

    expect(result).toBeNull();
  });
});
