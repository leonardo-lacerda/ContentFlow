import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { BillingAccountingService } from './billing-accounting.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_nothing');

@Injectable()
export class BillingStripeService {
  private readonly logger = new Logger(BillingStripeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounting: BillingAccountingService,
  ) {}

  private assertConfigured() {
    if (!process.env.STRIPE_SECRET_KEY) throw new ServiceUnavailableException('Stripe is not configured');
  }

  validateRequest(rawBody: Buffer, signature: string, endpointSecret: string) {
    return stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  }

  async createSubscriptionCheckout(input: {
    organizationId: string;
    userId: string;
    email: string;
    organizationName: string;
    planCode: string;
    successUrl?: string;
    cancelUrl?: string;
  }) {
    this.assertConfigured();
    const plan = await this.accounting.getPlan(input.planCode);
    if (plan.code === 'FREE') throw new Error('The Free plan does not require checkout');
    const price = await this.accounting.getPrice(`${plan.code}_MONTHLY`);
    const stripePriceId = await this.ensureStripePrice(price, plan.name, plan.priceCents);
    const customer = await this.createOrGetCustomer(input.organizationId, input.email, input.organizationName);
    const session = await stripe.checkout.sessions.create({
      customer,
      mode: 'subscription',
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: input.successUrl || `${process.env.FRONTEND_URL || ''}/billing?success=true`,
      cancel_url: input.cancelUrl || `${process.env.FRONTEND_URL || ''}/billing?cancel=true`,
      subscription_data: {
        metadata: {
          service: 'contentflow-billing-v2',
          organizationId: input.organizationId,
          userId: input.userId,
          planCode: plan.code,
          priceCode: price.code,
        },
      },
      metadata: {
        service: 'contentflow-billing-v2',
        organizationId: input.organizationId,
        userId: input.userId,
        planCode: plan.code,
        priceCode: price.code,
        billingType: 'SUBSCRIPTION',
      },
    });
    return { id: session.id, url: session.url, mode: session.mode, planCode: plan.code };
  }

  async createTopupCheckout(input: {
    organizationId: string;
    userId: string;
    email: string;
    organizationName: string;
    priceCode: string;
    successUrl?: string;
    cancelUrl?: string;
  }) {
    this.assertConfigured();
    const price = await this.accounting.getPrice(input.priceCode);
    if (price.kind !== 'TOPUP') throw new Error('Selected price is not a top-up');
    const stripePriceId = await this.ensureStripePrice(price, price.code, price.amountCents, false);
    const customer = await this.createOrGetCustomer(input.organizationId, input.email, input.organizationName);
    const session = await stripe.checkout.sessions.create({
      customer,
      mode: 'payment',
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: input.successUrl || `${process.env.FRONTEND_URL || ''}/billing?topup=success`,
      cancel_url: input.cancelUrl || `${process.env.FRONTEND_URL || ''}/billing?topup=cancel`,
      metadata: {
        service: 'contentflow-billing-v2',
        organizationId: input.organizationId,
        userId: input.userId,
        priceCode: price.code,
        billingType: 'TOPUP',
      },
    });
    return { id: session.id, url: session.url, mode: session.mode, priceCode: price.code };
  }

  async createPortal(organizationId: string) {
    this.assertConfigured();
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!organization?.paymentId) throw new Error('Stripe customer not found');
    const session = await stripe.billingPortal.sessions.create({
      customer: organization.paymentId,
      return_url: `${process.env.FRONTEND_URL || ''}/billing`,
    });
    return { url: session.url };
  }

  async changePlan(organizationId: string, planCode: string) {
    this.assertConfigured();
    const target = await this.accounting.getPlan(planCode);
    const current = await this.accounting.getSubscription(organizationId);
    if (!current?.providerSubscriptionId) throw new Error('Active Stripe subscription not found');
    if (current.plan.code === target.code) return { status: current.status, plan: target.code };
    const targetPrice = await this.accounting.getPrice(`${target.code}_MONTHLY`);
    const priceId = await this.ensureStripePrice(targetPrice, target.name, target.priceCents);
    const subscription = await stripe.subscriptions.retrieve(current.providerSubscriptionId);
    const item = subscription.items.data[0];
    if (!item) throw new Error('Stripe subscription has no price item');

    if (target.priceCents < current.plan.priceCents) {
      await this.accounting.upsertSubscription({
        organizationId,
        planCode: current.plan.code,
        providerCustomerId: current.providerCustomerId || undefined,
        providerSubscriptionId: current.providerSubscriptionId,
        status: current.status,
        currentPeriodStart: current.currentPeriodStart,
        currentPeriodEnd: current.currentPeriodEnd,
        pendingPlanCode: target.code,
      });
      return { status: 'SCHEDULED', effectiveAt: current.currentPeriodEnd, plan: target.code };
    }

    await stripe.subscriptions.update(current.providerSubscriptionId, {
      items: [{ id: item.id, price: priceId }],
      proration_behavior: 'always_invoice',
      metadata: { service: 'contentflow-billing-v2', organizationId, planCode: target.code, priceCode: targetPrice.code },
    });
    return { status: 'PROCESSING', plan: target.code };
  }

  async cancel(organizationId: string) {
    this.assertConfigured();
    const current = await this.accounting.getSubscription(organizationId);
    if (!current?.providerSubscriptionId) return { status: 'FREE' };
    const subscription = await stripe.subscriptions.update(current.providerSubscriptionId, { cancel_at_period_end: true });
    await this.accounting.upsertSubscription({
      organizationId,
      planCode: current.plan.code,
      providerCustomerId: current.providerCustomerId || undefined,
      providerSubscriptionId: current.providerSubscriptionId,
      status: current.status,
      currentPeriodStart: current.currentPeriodStart,
      currentPeriodEnd: current.currentPeriodEnd,
      cancelAtPeriodEnd: true,
      pendingPlanCode: current.pendingPlanCode,
    });
    return { status: subscription.status, cancelAtPeriodEnd: subscription.cancel_at_period_end, currentPeriodEnd: current.currentPeriodEnd };
  }

  async isBillingV2Event(event: Stripe.Event) {
    const object = event.data.object as any;
    if (object?.metadata?.service === 'contentflow-billing-v2') return true;
    const customerId = typeof object?.customer === 'string' ? object.customer : object?.customer?.id;
    if (!customerId) return false;
    const existing = await this.prisma.billingSubscription.findFirst({ where: { providerCustomerId: customerId } });
    if (existing) return true;
    if (event.type === 'checkout.session.completed' && object?.metadata?.billingType) return true;
    if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.payment_failed') {
      const priceId = object?.lines?.data?.[0]?.price?.id;
      if (priceId && await this.accounting.getPriceByStripeId(priceId)) return true;
    }
    return false;
  }

  async handleWebhook(event: Stripe.Event) {
    const existing = await this.accounting.recordWebhook({ id: event.id, type: event.type, payload: event });
    if (!existing) return { ok: true, duplicate: true };
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscription(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoiceFailed(event.data.object as Stripe.Invoice);
          break;
        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object as Stripe.Charge);
          break;
        case 'charge.dispute.created':
          await this.handleDispute(event.data.object as Stripe.Dispute);
          break;
      }
      await this.accounting.completeWebhook(event.id);
      return { ok: true, handled: true };
    } catch (error: any) {
      await this.accounting.completeWebhook(event.id, 'FAILED', error?.message || String(error));
      this.logger.error(`Stripe billing webhook ${event.id} failed`, error?.stack || error);
      throw error;
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const metadata = session.metadata || {};
    const organizationId = metadata.organizationId;
    if (!organizationId) return;
    if (metadata.billingType === 'TOPUP' && session.payment_status === 'paid') {
      await this.accounting.grantTopup({
        organizationId,
        priceCode: metadata.priceCode,
        providerPaymentId: session.payment_intent as string || session.id,
        amountCents: session.amount_total || 0,
        metadata: { checkoutSessionId: session.id },
      });
    }
    if (metadata.billingType === 'SUBSCRIPTION' && session.subscription) {
      await this.accounting.upsertSubscription({
        organizationId,
        planCode: metadata.planCode,
        providerCustomerId: session.customer as string,
        providerSubscriptionId: session.subscription as string,
        status: 'PENDING',
        metadata,
      });
    }
  }

  private async handleSubscription(subscription: Stripe.Subscription) {
    const metadata = subscription.metadata || {};
    const customerId = subscription.customer as string;
    const organizationId = metadata.organizationId || (await this.prisma.organization.findFirst({ where: { paymentId: customerId }, select: { id: true } }))?.id;
    if (!organizationId) return;
    const priceId = subscription.items.data[0]?.price?.id;
    const price = priceId ? await this.accounting.getPriceByStripeId(priceId) : null;
    const planCode = metadata.planCode || price?.plan?.code || 'FREE';
    await this.accounting.upsertSubscription({
      organizationId,
      planCode,
      providerCustomerId: customerId,
      providerSubscriptionId: subscription.id,
      status: this.normalizeSubscriptionStatus(subscription.status),
      currentPeriodStart: this.dateFromUnix((subscription as any).current_period_start),
      currentPeriodEnd: this.dateFromUnix((subscription as any).current_period_end),
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      pendingPlanCode: metadata.pendingPlanCode,
      metadata,
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    const current = await this.prisma.billingSubscription.findFirst({ where: { providerSubscriptionId: subscription.id } });
    if (!current) return;
    await this.accounting.upsertSubscription({
      organizationId: current.organizationId,
      planCode: 'FREE',
      providerCustomerId: customerId,
      providerSubscriptionId: subscription.id,
      status: 'CANCELED',
      cancelAtPeriodEnd: false,
      currentPeriodStart: current.currentPeriodStart,
      currentPeriodEnd: current.currentPeriodEnd,
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    let current = await this.prisma.billingSubscription.findFirst({ where: { providerCustomerId: customerId }, include: { plan: true } });
    const line = invoice.lines.data[0];
    const price = line?.price?.id ? await this.accounting.getPriceByStripeId(line.price.id) : null;
    if (!current && typeof (invoice as any).subscription === 'string') {
      const remoteSubscription = await stripe.subscriptions.retrieve((invoice as any).subscription);
      const metadata = remoteSubscription.metadata || {};
      const organizationId = metadata.organizationId || (await this.prisma.organization.findFirst({ where: { paymentId: customerId }, select: { id: true } }))?.id;
      if (organizationId) {
        current = await this.accounting.upsertSubscription({
          organizationId,
          planCode: metadata.planCode || price?.plan?.code || 'FREE',
          providerCustomerId: customerId,
          providerSubscriptionId: remoteSubscription.id,
          status: 'ACTIVE',
          currentPeriodStart: this.dateFromUnix((remoteSubscription as any).current_period_start),
          currentPeriodEnd: this.dateFromUnix((remoteSubscription as any).current_period_end),
          cancelAtPeriodEnd: Boolean(remoteSubscription.cancel_at_period_end),
          metadata,
        });
      }
    }
    if (!current) return;
    const planCode = current.pendingPlanCode || price?.plan?.code || current.plan.code;
    const billingReason = (invoice as any).billing_reason as string | undefined;
    const plan = await this.accounting.getPlan(planCode);
    const proratedCredits = billingReason === 'subscription_update'
      ? Math.min(plan.monthlyCredits, Math.max(0, Math.ceil((invoice.amount_paid || 0) / Math.max(1, plan.priceCents) * plan.monthlyCredits)))
      : undefined;
    await this.accounting.upsertSubscription({
      organizationId: current.organizationId,
      planCode,
      providerCustomerId: customerId,
      providerSubscriptionId: current.providerSubscriptionId || undefined,
      status: 'ACTIVE',
      currentPeriodStart: this.dateFromUnix((invoice as any).period_start) || current.currentPeriodStart,
      currentPeriodEnd: this.dateFromUnix((invoice as any).period_end) || current.currentPeriodEnd,
      cancelAtPeriodEnd: current.cancelAtPeriodEnd,
      pendingPlanCode: null,
    });
    await this.accounting.grantSubscriptionCredits({
      organizationId: current.organizationId,
      planCode,
      invoiceId: invoice.id,
      providerInvoiceId: invoice.id,
      amountCents: invoice.amount_paid || invoice.amount_due || 0,
      periodStart: this.dateFromUnix((invoice as any).period_start),
      periodEnd: this.dateFromUnix((invoice as any).period_end),
      creditsOverride: proratedCredits,
      metadata: { billingReason: (invoice as any).billing_reason, subscriptionId: current.providerSubscriptionId },
    });
    await this.accounting.markPaymentRecovered(current.organizationId);
  }

  private async handleInvoiceFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    let current = await this.prisma.billingSubscription.findFirst({ where: { providerCustomerId: customerId } });
    if (!current && typeof (invoice as any).subscription === 'string') {
      try {
        const remoteSubscription = await stripe.subscriptions.retrieve((invoice as any).subscription);
        const organizationId = remoteSubscription.metadata?.organizationId
          || (await this.prisma.organization.findFirst({ where: { paymentId: customerId }, select: { id: true } }))?.id;
        if (organizationId) {
          current = await this.accounting.upsertSubscription({
            organizationId,
            planCode: remoteSubscription.metadata?.planCode || 'FREE',
            providerCustomerId: customerId,
            providerSubscriptionId: remoteSubscription.id,
            status: 'PAST_DUE',
            currentPeriodStart: this.dateFromUnix((remoteSubscription as any).current_period_start),
            currentPeriodEnd: this.dateFromUnix((remoteSubscription as any).current_period_end),
            cancelAtPeriodEnd: Boolean(remoteSubscription.cancel_at_period_end),
            metadata: remoteSubscription.metadata,
          });
        }
      } catch (error) {
        this.logger.warn(`Could not resolve subscription for failed invoice ${invoice.id}: ${String(error)}`);
      }
    }
    if (current) await this.accounting.markPaymentFailed(current.organizationId, `invoice:${invoice.id}`);
  }

  private async handleChargeRefunded(charge: Stripe.Charge) {
    const invoiceId = typeof charge.invoice === 'string' ? charge.invoice : undefined;
    if (invoiceId) await this.prisma.billingInvoice.updateMany({ where: { providerInvoiceId: invoiceId }, data: { status: 'REFUNDED' } });
  }

  private async handleDispute(dispute: Stripe.Dispute) {
    const customerId = (dispute as any).customer as string | undefined;
    if (!customerId) return;
    const current = await this.prisma.billingSubscription.findFirst({ where: { providerCustomerId: customerId } });
    if (current) {
      await this.accounting.ensureAccount(current.organizationId);
      await this.prisma.creditAccount.update({ where: { organizationId: current.organizationId }, data: { status: 'CHARGEBACK' } });
    }
  }

  private async createOrGetCustomer(organizationId: string, email: string, name: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (organization?.paymentId) return organization.paymentId;
    const customer = await stripe.customers.create({ email, name, metadata: { organizationId } });
    await this.prisma.organization.update({ where: { id: organizationId }, data: { paymentId: customer.id } });
    return customer.id;
  }

  private async ensureStripePrice(price: any, displayName: string, amountCents: number, recurring = true) {
    if (price.stripePriceId) {
      try {
        const existing = await stripe.prices.retrieve(price.stripePriceId);
        if (existing.active) return existing.id;
      } catch {}
    }
    const product = await stripe.products.create({ name: `ContentFlow ${displayName}`, metadata: { contentflowPriceCode: price.code } });
    const created = await stripe.prices.create({
      product: product.id,
      currency: 'brl',
      unit_amount: amountCents,
      ...(recurring ? { recurring: { interval: 'month' as const } } : {}),
      metadata: { contentflowPriceCode: price.code },
    });
    await this.prisma.billingPrice.update({ where: { id: price.id }, data: { stripePriceId: created.id } });
    return created.id;
  }

  private normalizeSubscriptionStatus(status: Stripe.Subscription.Status) {
    if (status === 'active' || status === 'trialing') return 'ACTIVE';
    if (status === 'past_due' || status === 'unpaid') return 'PAST_DUE';
    if (status === 'canceled' || status === 'incomplete_expired') return 'CANCELED';
    return 'PENDING';
  }

  private dateFromUnix(value?: number | null) {
    return value ? new Date(value * 1000) : null;
  }
}
