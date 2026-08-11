import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, BillingPlan, BillingPrice } from '@prisma/client';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { CreditAccountingService } from './credit-accounting.service';
import {
  addDays,
  BILLING_CATALOG_PLANS,
  BILLING_CATALOG_TOPUPS,
  BillingPlanCode,
} from './billing-catalog';

@Injectable()
export class BillingAccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditAccountingService,
  ) {}

  async ensureCatalog() {
    // Concurrent callers race to seed the same rows; a row already existing is
    // the desired end state, so the loser's unique violation is not an error.
    for (const plan of BILLING_CATALOG_PLANS) {
      const dbPlan =
        (await this.prisma.billingPlan
          .upsert({
            where: { code: plan.code },
            update: {},
            create: plan,
          })
          .catch((error: any) => {
            if (error?.code !== 'P2002') throw error;
            return null;
          })) ||
        (await this.prisma.billingPlan.findUnique({ where: { code: plan.code } }));
      if (!dbPlan) continue;
      await this.prisma.billingPrice.upsert({
        where: { code: `${plan.code}_MONTHLY` },
        update: {},
        create: {
          code: `${plan.code}_MONTHLY`,
          planId: dbPlan.id,
          kind: 'PLAN',
          amountCents: plan.priceCents,
          credits: plan.monthlyCredits,
          active: true,
        },
      }).catch((error: any) => {
        if (error?.code !== 'P2002') throw error;
      });
    }
    for (const topup of BILLING_CATALOG_TOPUPS) {
      await this.prisma.billingPrice.upsert({
        where: { code: topup.code },
        update: {},
        create: {
          code: topup.code,
          kind: 'TOPUP',
          amountCents: topup.amountCents,
          credits: topup.credits,
          validityDays: topup.validityDays,
          active: true,
        },
      }).catch((error: any) => {
        if (error?.code !== 'P2002') throw error;
      });
    }
  }

  async listPlans() {
    await this.ensureCatalog();
    return this.prisma.billingPlan.findMany({ where: { active: true }, orderBy: { priceCents: 'asc' }, include: { prices: { where: { active: true } } } });
  }

  async listTopups() {
    await this.ensureCatalog();
    return this.prisma.billingPrice.findMany({ where: { kind: 'TOPUP', active: true }, orderBy: { amountCents: 'asc' } });
  }

  async getPlan(code: string) {
    await this.ensureCatalog();
    const plan = await this.prisma.billingPlan.findUnique({ where: { code: code.toUpperCase() }, include: { prices: true } });
    if (!plan) throw new NotFoundException('Billing plan not found');
    return plan;
  }

  async getPrice(code: string) {
    await this.ensureCatalog();
    const price = await this.prisma.billingPrice.findUnique({ where: { code: code.toUpperCase() }, include: { plan: true } });
    if (!price || !price.active) throw new NotFoundException('Billing price not found');
    return price;
  }

  async getPriceByStripeId(stripePriceId: string) {
    return this.prisma.billingPrice.findUnique({ where: { stripePriceId }, include: { plan: true } });
  }

  async updatePlan(code: string, input: { name?: string; priceCents?: number; monthlyCredits?: number; active?: boolean; updatedBy?: string }) {
    const current = await this.getPlan(code);
    const plan = await this.prisma.billingPlan.update({
      where: { id: current.id },
      data: {
        name: input.name,
        priceCents: input.priceCents,
        monthlyCredits: input.monthlyCredits,
        active: input.active,
        metadata: { ...(current.metadata as Record<string, unknown> || {}), lastUpdatedBy: input.updatedBy, lastUpdatedAt: new Date().toISOString() },
      },
    });
    await this.prisma.billingPrice.updateMany({
      where: { planId: current.id, kind: 'PLAN', active: true },
      data: { amountCents: input.priceCents, credits: input.monthlyCredits, active: input.active },
    });
    return plan;
  }

  async updateTopup(code: string, input: { amountCents?: number; credits?: number; validityDays?: number; active?: boolean; updatedBy?: string }) {
    const current = await this.getPrice(code);
    return this.prisma.billingPrice.update({
      where: { id: current.id },
      data: {
        amountCents: input.amountCents,
        credits: input.credits,
        validityDays: input.validityDays,
        active: input.active,
        metadata: { ...(current.metadata as Record<string, unknown> || {}), lastUpdatedBy: input.updatedBy, lastUpdatedAt: new Date().toISOString() },
      },
    });
  }

  async getSubscription(organizationId: string) {
    return this.prisma.billingSubscription.findUnique({ where: { organizationId }, include: { plan: true } });
  }

  async getInvoices(organizationId: string) {
    return this.prisma.billingInvoice.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async getUsage(organizationId: string, days = 30) {
    return this.credits.usage(organizationId, days);
  }

  async getBalance(organizationId: string) {
    return this.credits.getBalance(organizationId);
  }

  async getLedger(organizationId: string, limit = 100) {
    return this.credits.list(organizationId, limit);
  }

  async upsertSubscription(input: {
    organizationId: string;
    planCode: BillingPlanCode | string;
    providerCustomerId?: string;
    providerSubscriptionId?: string;
    status: string;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
    pendingPlanCode?: string | null;
    failedAt?: Date | null;
    metadata?: Record<string, unknown>;
  }) {
    const plan = await this.getPlan(input.planCode);
    return this.prisma.billingSubscription.upsert({
      where: { organizationId: input.organizationId },
      update: {
        planId: plan.id,
        providerCustomerId: input.providerCustomerId,
        providerSubscriptionId: input.providerSubscriptionId,
        status: input.status,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        pendingPlanCode: input.pendingPlanCode,
        failedAt: input.failedAt,
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue : undefined,
      },
      create: {
        organizationId: input.organizationId,
        planId: plan.id,
        providerCustomerId: input.providerCustomerId,
        providerSubscriptionId: input.providerSubscriptionId,
        status: input.status,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        pendingPlanCode: input.pendingPlanCode,
        failedAt: input.failedAt,
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue : undefined,
      },
      include: { plan: true },
    });
  }

  async grantSubscriptionCredits(input: {
    organizationId: string;
    planCode: string;
    invoiceId: string;
    providerInvoiceId: string;
    amountCents: number;
    periodStart?: Date | null;
    periodEnd?: Date | null;
    creditsOverride?: number;
    metadata?: Record<string, unknown>;
  }) {
    const plan = await this.getPlan(input.planCode);
    const creditsGranted = Math.max(0, Math.floor(input.creditsOverride ?? plan.monthlyCredits));
    const invoice = await this.prisma.billingInvoice.upsert({
      where: { providerInvoiceId: input.providerInvoiceId },
      update: {
        status: 'PAID',
        amountCents: input.amountCents,
        creditsGranted,
        paidAt: new Date(),
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue : undefined,
      },
      create: {
        organizationId: input.organizationId,
        providerInvoiceId: input.providerInvoiceId,
        type: 'SUBSCRIPTION',
        status: 'PAID',
        amountCents: input.amountCents,
        creditsGranted,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        paidAt: new Date(),
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue : undefined,
      },
    });
    if (creditsGranted > 0) {
      await this.credits.grant(input.organizationId, {
        source: 'SUBSCRIPTION',
        sourceReference: input.providerInvoiceId,
        credits: creditsGranted,
        expiresAt: input.periodEnd || addDays(new Date(), 31),
        invoiceId: invoice.id,
        periodStart: input.periodStart || undefined,
        periodEnd: input.periodEnd || undefined,
        metadata: { planCode: plan.code, ...(input.metadata || {}) },
      }, `credit-v2:subscription:${input.providerInvoiceId}`);
    }
    return invoice;
  }

  async grantTopup(input: {
    organizationId: string;
    priceCode: string;
    providerPaymentId: string;
    amountCents: number;
    metadata?: Record<string, unknown>;
  }) {
    const price = await this.getPrice(input.priceCode);
    const invoice = await this.prisma.billingInvoice.upsert({
      where: { providerInvoiceId: input.providerPaymentId },
      update: { status: 'PAID', amountCents: input.amountCents, creditsGranted: price.credits, paidAt: new Date() },
      create: {
        organizationId: input.organizationId,
        providerInvoiceId: input.providerPaymentId,
        providerPaymentId: input.providerPaymentId,
        type: 'TOPUP',
        status: 'PAID',
        amountCents: input.amountCents,
        creditsGranted: price.credits,
        paidAt: new Date(),
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue : undefined,
      },
    });
    await this.credits.grant(input.organizationId, {
      source: 'TOPUP',
      sourceReference: input.providerPaymentId,
      credits: price.credits,
      expiresAt: addDays(new Date(), price.validityDays || 90),
      invoiceId: invoice.id,
      metadata: { priceCode: price.code, ...(input.metadata || {}) },
    }, `credit-v2:topup:${input.providerPaymentId}`);
    return invoice;
  }

  async markPaymentFailed(organizationId: string, reason?: string) {
    await this.prisma.creditAccount.upsert({ where: { organizationId }, update: { status: 'PAYMENT_FAILED' }, create: { organizationId, status: 'PAYMENT_FAILED' } });
    return this.prisma.billingSubscription.updateMany({ where: { organizationId }, data: { status: 'PAST_DUE', failedAt: new Date(), metadata: reason ? { reason } : undefined } });
  }

  async markPaymentRecovered(organizationId: string) {
    await this.prisma.creditAccount.upsert({ where: { organizationId }, update: { status: 'ACTIVE' }, create: { organizationId, status: 'ACTIVE' } });
  }

  async recordWebhook(event: { id: string; type: string; payload: unknown; organizationId?: string }) {
    try {
      return await this.prisma.billingWebhookEvent.create({
        data: {
          eventId: event.id,
          eventType: event.type,
          organizationId: event.organizationId,
          payload: JSON.parse(JSON.stringify(event.payload)) as Prisma.InputJsonValue,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') return null;
      throw error;
    }
  }

  completeWebhook(eventId: string, status = 'PROCESSED', error?: string) {
    return this.prisma.billingWebhookEvent.update({ where: { eventId }, data: { status, error, processedAt: new Date() } });
  }

  async adminSummary() {
    await this.ensureCatalog();
    const [invoices, costs, credits] = await Promise.all([
      this.prisma.billingInvoice.aggregate({ where: { status: 'PAID' }, _sum: { amountCents: true } }),
      this.prisma.providerCostRecord.aggregate({ _sum: { costBrlCents: true } }),
      this.prisma.creditTransaction.groupBy({ by: ['type'], _sum: { credits: true } }),
    ]);
    return { revenueCents: invoices._sum.amountCents || 0, providerCostBrlCents: costs._sum.costBrlCents || 0, creditsByType: credits };
  }

  adjustCredits(organizationId: string, credits: number, reason: string, createdBy?: string, reference?: string) {
    return this.credits.adjust(organizationId, credits, reason, createdBy, reference);
  }
}
