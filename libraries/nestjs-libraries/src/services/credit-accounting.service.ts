import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { addDays, billingPeriodEnd } from './billing-catalog';

type CreditGrantInput = {
  source: 'SUBSCRIPTION' | 'TOPUP' | 'PROMOTION' | 'MIGRATION' | 'ADMIN';
  sourceReference: string;
  credits: number;
  expiresAt?: Date | null;
  invoiceId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  metadata?: Record<string, unknown>;
};

type ReservationInput = {
  quoteId?: string;
  jobId?: string;
  workflowRunId?: string;
  idempotencyKey: string;
  operation?: string;
  provider?: string;
  model?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class CreditAccountingService {
  private readonly logger = new Logger(CreditAccountingService.name);
  private readonly freeCredits = Math.max(0, Number(process.env.BILLING_FREE_CREDITS || 200));

  constructor(private readonly prisma: PrismaService) {}

  async ensureAccount(organizationId: string) {
    // Concurrent requests for the same org race here: both see "not found" and
    // both try to create. The row existing is the desired end state, so a
    // unique violation from the loser is not an error.
    await this.prisma.creditAccount.upsert({
      where: { organizationId },
      update: {},
      create: { organizationId },
    }).catch((error: any) => {
      if (error?.code !== 'P2002') throw error;
    });

    const bootstrapKey = `credit-v2:bootstrap:${organizationId}`;
    const bootstrapped = await this.prisma.creditTransaction.findUnique({
      where: { idempotencyKey: bootstrapKey },
    });

    if (!bootstrapped) {
      const legacy = await this.prisma.creativeCreditLedgerEntry.aggregate({
        where: { organizationId, status: { in: ['POSTED', 'RESERVED'] } },
        _sum: { credits: true },
      });
      const legacyBalance = Math.max(0, legacy._sum.credits || 0);
      if (legacyBalance > 0) {
        await this.grant(organizationId, {
          source: 'MIGRATION',
          sourceReference: 'legacy-creative-credit-ledger',
          credits: legacyBalance,
          metadata: { migratedFrom: 'CreativeCreditLedgerEntry' },
        }, bootstrapKey);
      } else {
        const monthKey = `credit-v2:${organizationId}:free:${new Date().toISOString().slice(0, 7)}`;
        await this.grant(organizationId, {
          source: 'SUBSCRIPTION',
          sourceReference: `free:${new Date().toISOString().slice(0, 7)}`,
          credits: this.freeCredits,
          expiresAt: billingPeriodEnd(),
          periodStart: new Date(),
          periodEnd: billingPeriodEnd(),
          metadata: { planCode: 'FREE', bootstrap: true },
        }, monthKey);
      }
    }

    await this.ensureFreeCycle(organizationId);
  }

  private async ensureFreeCycle(organizationId: string) {
    const subscription = await this.prisma.billingSubscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });
    if (subscription && subscription.plan.code !== 'FREE') return;
    if (!subscription) {
      const legacy = await this.prisma.subscription.findUnique({
        where: { organizationId },
        select: { subscriptionTier: true, deletedAt: true },
      });
      if (legacy && !legacy.deletedAt) return;
    }

    const now = new Date();
    const sourceReference = `free:${now.toISOString().slice(0, 7)}`;
    const key = `credit-v2:${organizationId}:${sourceReference}`;
    const existing = await this.prisma.creditTransaction.findUnique({ where: { idempotencyKey: key } });
    if (existing) return;

    await this.grant(organizationId, {
      source: 'SUBSCRIPTION',
      sourceReference,
      credits: this.freeCredits,
      expiresAt: billingPeriodEnd(now),
      periodStart: now,
      periodEnd: billingPeriodEnd(now),
      metadata: { planCode: 'FREE' },
    }, key);
  }

  async grant(organizationId: string, input: CreditGrantInput, idempotencyKey?: string) {
    const credits = Math.floor(Number(input.credits));
    if (!Number.isFinite(credits) || credits <= 0) {
      throw new BadRequestException('Credit grant must be positive');
    }
    await this.prisma.creditAccount.upsert({
      where: { organizationId },
      update: {},
      create: { organizationId },
    });

    const key = idempotencyKey || `credit-v2:grant:${input.source}:${input.sourceReference}`;
    const existing = await this.prisma.creditTransaction.findUnique({ where: { idempotencyKey: key } });
    if (existing) return existing;

    return this.prisma.$transaction(async (tx) => {
      const duplicate = await tx.creditTransaction.findUnique({ where: { idempotencyKey: key } });
      if (duplicate) return duplicate;
      const lot = await tx.creditLot.create({
        data: {
          organizationId,
          source: input.source,
          sourceReference: input.sourceReference,
          totalCredits: credits,
          remainingCredits: credits,
          expiresAt: input.expiresAt || null,
          invoiceId: input.invoiceId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue : undefined,
        },
      });
      return tx.creditTransaction.create({
        data: {
          organizationId,
          lotId: lot.id,
          type: 'GRANT',
          credits,
          idempotencyKey: key,
          metadata: {
            source: input.source,
            sourceReference: input.sourceReference,
            ...(input.metadata || {}),
          } as Prisma.InputJsonValue,
        },
      });
    });
  }

  async expireLots(organizationId?: string) {
    const lots = await this.prisma.creditLot.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        remainingCredits: { gt: 0 },
        expiresAt: { lte: new Date() },
        status: { not: 'EXPIRED' },
      },
      take: 500,
    });
    for (const lot of lots) {
      await this.prisma.$transaction(async (tx) => {
        const update = await tx.creditLot.updateMany({
          where: { id: lot.id, remainingCredits: { gt: 0 } },
          data: { remainingCredits: 0, status: 'EXPIRED' },
        });
        if (!update.count) return;
        await tx.creditTransaction.create({
          data: {
            organizationId: lot.organizationId,
            lotId: lot.id,
            type: 'EXPIRATION',
            credits: -lot.remainingCredits,
            idempotencyKey: `credit-v2:expiration:${lot.id}`,
            metadata: { expiresAt: lot.expiresAt },
          },
        }).catch((error: any) => {
          if (error?.code !== 'P2002') throw error;
        });
      });
    }
    return { expired: lots.length };
  }

  async getBalance(organizationId: string) {
    await this.ensureAccount(organizationId);
    await this.expireLots(organizationId);
    await this.reconcile(organizationId);
    const [lots, reservations] = await Promise.all([
      this.prisma.creditLot.aggregate({
        where: { organizationId, remainingCredits: { gt: 0 }, status: 'AVAILABLE' },
        _sum: { remainingCredits: true },
      }),
      this.prisma.creditAllocation.aggregate({
        where: { reservation: { organizationId, status: 'RESERVED' } },
        _sum: { credits: true },
      }),
    ]);
    const total = lots._sum.remainingCredits || 0;
    const reserved = reservations._sum.credits || 0;
    return {
      balance: Math.max(0, total - reserved),
      total,
      reserved,
      debt: (await this.prisma.creditAccount.findUnique({ where: { organizationId }, select: { debtCredits: true } }))?.debtCredits || 0,
    };
  }

  async reserve(organizationId: string, credits: number, input: ReservationInput) {
    const requested = Math.ceil(Number(credits));
    if (!Number.isFinite(requested) || requested <= 0) throw new BadRequestException('Credit reservation must be positive');
    await this.ensureAccount(organizationId);
    const account = await this.prisma.creditAccount.findUnique({ where: { organizationId }, select: { status: true, debtCredits: true } });
    if (account?.status && account.status !== 'ACTIVE') {
      throw new HttpException('New generations are blocked until billing is regularized', HttpStatus.PAYMENT_REQUIRED);
    }
    if ((account?.debtCredits || 0) > 0) {
      throw new HttpException('New generations are blocked while the account has a credit debt', HttpStatus.PAYMENT_REQUIRED);
    }
    const existing = await this.prisma.creditReservation.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) return existing;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const active = await tx.creditReservation.findMany({
            where: { organizationId, status: 'RESERVED' },
            select: { id: true },
          });
          const holds = active.length
            ? await tx.creditAllocation.findMany({ where: { reservationId: { in: active.map((item) => item.id) } } })
            : [];
          const heldByLot = new Map<string, number>();
          for (const hold of holds) heldByLot.set(hold.lotId, (heldByLot.get(hold.lotId) || 0) + hold.credits);
          const lots = await tx.creditLot.findMany({
            where: { organizationId, status: 'AVAILABLE', remainingCredits: { gt: 0 }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
            orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
          });
          const spendable = lots.reduce((sum, lot) => sum + lot.remainingCredits - (heldByLot.get(lot.id) || 0), 0);
          if (spendable < requested) {
            throw new HttpException({
              code: 'INSUFFICIENT_CREDITS',
              message: 'Saldo de creditos insuficiente para esta geracao.',
              required: requested,
              available: spendable,
            }, HttpStatus.PAYMENT_REQUIRED);
          }
          const reservation = await tx.creditReservation.create({
            data: {
              organizationId,
              quoteId: input.quoteId,
              idempotencyKey: input.idempotencyKey,
              requestedCredits: requested,
              jobId: input.jobId,
              workflowRunId: input.workflowRunId,
              expiresAt: addDays(new Date(), 1),
              metadata: {
                operation: input.operation,
                provider: input.provider,
                model: input.model,
                ...(input.metadata || {}),
              } as Prisma.InputJsonValue,
            },
          });
          let remaining = requested;
          for (const lot of lots) {
            const available = lot.remainingCredits - (heldByLot.get(lot.id) || 0);
            if (available <= 0) continue;
            const allocated = Math.min(available, remaining);
            await tx.creditAllocation.create({ data: { reservationId: reservation.id, lotId: lot.id, credits: allocated } });
            remaining -= allocated;
            if (!remaining) break;
          }
          await tx.creditTransaction.create({
            data: {
              organizationId,
              reservationId: reservation.id,
              type: 'RESERVATION',
              credits: -requested,
              operation: input.operation,
              provider: input.provider,
              model: input.model,
              idempotencyKey: `credit-v2:reservation:${input.idempotencyKey}`,
              metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue : undefined,
            },
          });
          return reservation;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error: any) {
        if (error?.code === 'P2002') {
          // The pre-flight idempotency check above runs outside this
          // transaction, so a concurrent request for the same key (or a retry
          // whose first attempt did commit) can get here. The key is what makes
          // the reservation unique, so reusing the winner's row is correct.
          const concurrent = await this.prisma.creditReservation.findUnique({
            where: { idempotencyKey: input.idempotencyKey },
          });
          if (concurrent) return concurrent;
        }
        if (error?.code !== 'P2034' || attempt === 3) throw error;
        this.logger.warn(`Retrying credit reservation after serialization conflict (${attempt}/3)`);
      }
    }
    throw new Error('Credit reservation retry limit reached');
  }

  async settle(reservationId: string, actualCredits?: number) {
    const reservation = await this.prisma.creditReservation.findUnique({ where: { id: reservationId }, include: { allocations: true } });
    if (!reservation) throw new BadRequestException('Credit reservation not found');
    if (reservation.status !== 'RESERVED') return reservation;
    const actual = Math.max(0, Math.min(reservation.requestedCredits, Math.ceil(actualCredits ?? reservation.requestedCredits)));

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.creditReservation.findUnique({ where: { id: reservationId }, include: { allocations: true } });
      if (!current || current.status !== 'RESERVED') return current;
      let remainingActual = actual;
      let released = 0;
      for (const allocation of current.allocations) {
        const consumed = Math.min(allocation.credits, remainingActual);
        if (consumed > 0) {
          await tx.creditLot.update({ where: { id: allocation.lotId }, data: { remainingCredits: { decrement: consumed }, status: 'AVAILABLE' } });
          await tx.creditTransaction.create({
            data: {
              organizationId: current.organizationId,
              lotId: allocation.lotId,
              reservationId,
              type: 'CONSUMPTION',
              credits: -consumed,
              idempotencyKey: `credit-v2:consumption:${reservationId}:${allocation.lotId}`,
              metadata: { requestedCredits: current.requestedCredits },
            },
          }).catch((error: any) => { if (error?.code !== 'P2002') throw error; });
          remainingActual -= consumed;
        }
        released += allocation.credits - consumed;
      }
      if (released > 0) {
        await tx.creditTransaction.create({
          data: {
            organizationId: current.organizationId,
            reservationId,
            type: 'RELEASE',
            credits: released,
            idempotencyKey: `credit-v2:release:${reservationId}`,
            metadata: { reason: 'settlement-difference' },
          },
        }).catch((error: any) => { if (error?.code !== 'P2002') throw error; });
      }
      await tx.creditAllocation.deleteMany({ where: { reservationId } });
      return tx.creditReservation.update({ where: { id: reservationId }, data: { status: 'SETTLED', settledCredits: actual } });
    });
  }

  async refund(reservationId: string, reason: string) {
    const reservation = await this.prisma.creditReservation.findUnique({ where: { id: reservationId }, include: { allocations: true } });
    if (!reservation) throw new BadRequestException('Credit reservation not found');
    if (reservation.status !== 'RESERVED') return reservation;
    const released = reservation.allocations.reduce((sum, item) => sum + item.credits, 0);
    return this.prisma.$transaction(async (tx) => {
      const update = await tx.creditReservation.updateMany({ where: { id: reservationId, status: 'RESERVED' }, data: { status: 'REFUNDED' } });
      if (!update.count) return tx.creditReservation.findUnique({ where: { id: reservationId } });
      await tx.creditAllocation.deleteMany({ where: { reservationId } });
      if (released > 0) {
        await tx.creditTransaction.create({
          data: {
            organizationId: reservation.organizationId,
            reservationId,
            type: 'REFUND',
            credits: released,
            idempotencyKey: `credit-v2:refund:${reservationId}`,
            metadata: { reason },
          },
        });
      }
      return tx.creditReservation.findUnique({ where: { id: reservationId } });
    });
  }

  async list(organizationId: string, limit = 100) {
    await this.ensureAccount(organizationId);
    return this.prisma.creditTransaction.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, take: Math.min(200, Math.max(1, limit)) });
  }

  async reconcile(organizationId: string) {
    const reservations = await this.prisma.creditReservation.findMany({ where: { organizationId, status: 'RESERVED' }, orderBy: { createdAt: 'asc' }, take: 1000 });
    const stale = reservations.filter((item) => item.expiresAt && item.expiresAt < new Date());
    for (const item of stale) await this.refund(item.id, 'reservation-expired');
    return { organizationId, checked: reservations.length, refunded: stale.length, remaining: reservations.length - stale.length };
  }

  async assertConcurrencyQuota(organizationId: string) {
    const limit = Math.min(100, Math.max(1, Number(process.env.CREATIVE_MAX_ACTIVE_JOBS || 20)));
    const [jobs, workflows] = await Promise.all([
      this.prisma.creativeJob.count({ where: { organizationId, status: { in: ['QUEUED', 'RESERVED', 'RUNNING', 'RETRYABLE'] } } }),
      this.prisma.creativeWorkflowRun.count({ where: { organizationId, status: { in: ['QUEUED', 'RUNNING', 'PARTIAL'] } } }),
    ]);
    if (jobs + workflows >= limit) {
      throw new HttpException({
        code: 'CONCURRENCY_LIMIT',
        message: 'Ha muitas geracoes em andamento. Aguarde uma delas terminar.',
        limit,
        active: jobs + workflows,
      }, HttpStatus.TOO_MANY_REQUESTS);
    }
    return { limit, activeJobs: jobs, activeWorkflows: workflows };
  }

  async usage(organizationId: string, days = 30) {
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - Math.min(365, Math.max(1, days)));
    return this.prisma.creditTransaction.findMany({ where: { organizationId, createdAt: { gte: from }, type: { in: ['CONSUMPTION', 'GRANT', 'TOPUP', 'REFUND', 'EXPIRATION'] } }, orderBy: { createdAt: 'desc' }, take: 1000 });
  }

  async adjust(organizationId: string, credits: number, reason: string, createdBy?: string, reference?: string) {
    const amount = Math.trunc(Number(credits));
    if (!Number.isFinite(amount) || amount === 0) throw new BadRequestException('Adjustment must be a non-zero integer');
    if (!reason?.trim()) throw new BadRequestException('Adjustment reason is required');
    const adjustment = await this.prisma.financialAdjustment.create({ data: { organizationId, type: 'ADMIN_ADJUSTMENT', credits: amount, reason: reason.trim(), createdBy, reference } });
    if (amount > 0) {
      await this.grant(organizationId, { source: 'ADMIN', sourceReference: adjustment.id, credits: amount, metadata: { reason: reason.trim(), createdBy } }, `credit-v2:adjustment:${adjustment.id}`);
      return { adjustment, balance: await this.getBalance(organizationId) };
    }

    await this.ensureAccount(organizationId);
    let remaining = Math.abs(amount);
    const lots = await this.prisma.creditLot.findMany({ where: { organizationId, status: 'AVAILABLE', remainingCredits: { gt: 0 } }, orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }] });
    for (const lot of lots) {
      if (!remaining) break;
      const removed = Math.min(remaining, lot.remainingCredits);
      await this.prisma.creditLot.update({ where: { id: lot.id }, data: { remainingCredits: { decrement: removed } } });
      await this.prisma.creditTransaction.create({ data: { organizationId, lotId: lot.id, type: 'ADMIN_ADJUSTMENT', credits: -removed, idempotencyKey: `credit-v2:adjustment:${adjustment.id}:${lot.id}`, metadata: { reason: reason.trim(), createdBy } } });
      remaining -= removed;
    }
    if (remaining > 0) await this.prisma.creditAccount.update({ where: { organizationId }, data: { debtCredits: { increment: remaining }, status: 'DEBT' } });
    return { adjustment, removed: Math.abs(amount) - remaining, debtAdded: remaining, balance: await this.getBalance(organizationId) };
  }
}
