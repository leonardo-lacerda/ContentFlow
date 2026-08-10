import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { BillingSubscribeDto } from '@gitroom/nestjs-libraries/dtos/billing/billing.subscribe.dto';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { Organization, User } from '@prisma/client';

type ContentFlowBillingTier = 'STANDARD' | 'PRO' | 'TEAM' | 'ULTIMATE';
type CaktoOrderStatus =
  | 'paid'
  | 'authorized'
  | 'waiting_payment'
  | 'processing'
  | 'scheduled'
  | 'retrying'
  | 'refused'
  | 'in_protest'
  | 'prechargeback'
  | 'refund_requested'
  | 'refunded'
  | 'chargedback'
  | 'canceled'
  | 'blocked'
  | string;

type CaktoOrder = {
  id?: string;
  refId?: string;
  status?: CaktoOrderStatus;
  amount?: string | number | null;
  due_date?: string | null;
  paidAt?: string | null;
  canceledAt?: string | null;
  checkoutUrl?: string | null;
  subscription?: string | null;
  customer?: {
    name?: string | null;
    email?: string | null;
  } | null;
  sck?: string | null;
};

type ParsedCaktoWebhook = {
  eventId: string;
  eventType: string;
  orderId: string;
  status: CaktoOrderStatus;
  checkoutReference?: string;
  providerSubscriptionId?: string;
  dueAt?: string;
};

const caktoPlanByBilling: Record<ContentFlowBillingTier, string> = {
  STANDARD: 'starter',
  PRO: 'pro',
  TEAM: 'pro',
  ULTIMATE: 'scale',
};

function toBilling(value: string | undefined): ContentFlowBillingTier {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'STANDARD' || normalized === 'PRO' || normalized === 'TEAM' || normalized === 'ULTIMATE') {
    return normalized;
  }
  return 'STANDARD';
}

function isPaidStatus(status: string | undefined): boolean {
  const normalized = String(status || '').toLowerCase();
  return normalized === 'paid' || normalized === 'authorized';
}

function isCanceledStatus(status: string | undefined): boolean {
  const normalized = String(status || '').toLowerCase();
  return [
    'refused',
    'in_protest',
    'prechargeback',
    'refund_requested',
    'refunded',
    'chargedback',
    'canceled',
    'blocked',
  ].includes(normalized);
}

function asRecord(input: unknown): Record<string, unknown> | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return undefined;
  }
  return input as Record<string, unknown>;
}

function safeEquals(received: string, expected: string): boolean {
  if (!received || !expected) {
    return false;
  }
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

function normalizeHmacSignature(raw: string): string {
  const value = raw.trim();
  return value.toLowerCase().startsWith('sha256=')
    ? value.slice(7).trim()
    : value;
}

function verifyHmac(rawBody: string, rawSignature: string, secret: string): boolean {
  if (!rawBody || !rawSignature || !secret) {
    return false;
  }
  const signature = normalizeHmacSignature(rawSignature);
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest();
  if (/^[a-f0-9]{64}$/i.test(signature)) {
    return safeEqualsBuffer(Buffer.from(signature, 'hex'), expected);
  }
  try {
    return safeEqualsBuffer(Buffer.from(signature, 'base64'), expected);
  } catch {
    return false;
  }
}

function safeEqualsBuffer(received: Buffer, expected: Buffer): boolean {
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}

@Injectable()
export class CaktoService {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _organizationService: OrganizationService
  ) {}

  /**
   * ContentFlow v1: só Profissional na vitrine paga.
   * FREE (Início) é o default sem checkout.
   * PRO/TEAM/SCALE deixam de ser vendidos (grandfather no backend).
   */
  get commercialPlans() {
    return [
      {
        tier: 'starter',
        billing: 'STANDARD',
        name: 'Starter',
        price: pricing.STANDARD.month_price,
        yearlyPrice: pricing.STANDARD.year_price,
        channels: pricing.STANDARD.channel,
        postsPerMonth: pricing.STANDARD.posts_per_month,
        features: [
          `${pricing.STANDARD.brand_profiles} marca (Brand DNA)`,
          `${pricing.STANDARD.channel} canais (IG, FB, LinkedIn, X, TikTok)`,
          `${pricing.STANDARD.carousel_generations_per_month} carrosséis / mês`,
          `${pricing.STANDARD.content_ideas_per_month} ideias / mês`,
          `${pricing.STANDARD.image_generation_count} imagens IA / mês`,
          `${pricing.STANDARD.video_scripts_per_month} roteiros de vídeo / mês`,
          'Agendar e publicar',
        ],
      },
      {
        tier: 'pro',
        billing: 'TEAM',
        name: 'Pro',
        price: pricing.TEAM.month_price,
        yearlyPrice: pricing.TEAM.year_price,
        channels: pricing.TEAM.channel,
        postsPerMonth: pricing.TEAM.posts_per_month,
        features: [
          `${pricing.TEAM.brand_profiles} marcas (Brand DNA)`,
          `${pricing.TEAM.channel} canais`,
          `${pricing.TEAM.carousel_generations_per_month} carrosséis / mês`,
          `${pricing.TEAM.content_ideas_per_month} ideias / mês`,
          `${pricing.TEAM.image_generation_count} imagens IA / mês`,
          `${pricing.TEAM.video_scripts_per_month} roteiros de vídeo / mês`,
          `${pricing.TEAM.email_campaigns_per_month} campanhas de e-mail / mês`,
          'Agendar e publicar',
        ],
      },
      {
        tier: 'scale',
        billing: 'ULTIMATE',
        name: 'Scale',
        price: pricing.ULTIMATE.month_price,
        yearlyPrice: pricing.ULTIMATE.year_price,
        channels: pricing.ULTIMATE.channel,
        postsPerMonth: pricing.ULTIMATE.posts_per_month,
        features: [
          `${pricing.ULTIMATE.brand_profiles} marcas (Brand DNA)`,
          `${pricing.ULTIMATE.channel} canais`,
          'Carrosséis ilimitados',
          'Ideias ilimitadas',
          `${pricing.ULTIMATE.image_generation_count} imagens IA / mês`,
          'Roteiros ilimitados',
          'Campanhas de e-mail ilimitadas',
          'Agendar e publicar',
        ],
      },
    ];
  }

  isConfigured() {
    return Boolean(
      process.env.CAKTO_STARTER_CHECKOUT_URL ||
        process.env.CAKTO_PRO_CHECKOUT_URL ||
        process.env.CAKTO_SCALE_CHECKOUT_URL
    );
  }

  checkoutUrlForBilling(billing: ContentFlowBillingTier) {
    if (billing === 'STANDARD') {
      return process.env.CAKTO_STARTER_CHECKOUT_URL || '';
    }
    if (billing === 'TEAM') {
      return process.env.CAKTO_PRO_CHECKOUT_URL || '';
    }
    if (billing === 'ULTIMATE') {
      return process.env.CAKTO_SCALE_CHECKOUT_URL || '';
    }
    return process.env.CAKTO_PRO_CHECKOUT_URL || '';
  }

  async subscribe(
    uniqueId: string,
    organization: Organization,
    user: User,
    body: BillingSubscribeDto
  ) {
    const billing = toBilling(body.billing);
    const checkoutBase = this.checkoutUrlForBilling(billing);
    if (!checkoutBase) {
      throw new Error(`Cakto checkout URL not configured for ${billing}`);
    }

    const checkoutReference = makeId(10);
    const plan = caktoPlanByBilling[billing];
    const customerId = organization.paymentId || `cakto:${organization.id}`;
    const url = new URL(checkoutBase);
    url.searchParams.set('sck', checkoutReference);
    url.searchParams.set('ref', checkoutReference);
    url.searchParams.set('plan', plan);
    url.searchParams.set('billing', billing);
    url.searchParams.set('period', body.period);
    url.searchParams.set('org', organization.id);
    url.searchParams.set('email', user.email);
    url.searchParams.set('name', organization.name);

    if (!organization.paymentId) {
      await this._subscriptionService.updateCustomerId(
        organization.id,
        customerId
      );
      organization.paymentId = customerId;
    }

    await this._subscriptionService.createOrUpdateSubscription(
      true,
      checkoutReference,
      customerId,
      pricing[billing].channel!,
      billing,
      body.period,
      null,
      undefined,
      organization.id
    );

    return {
      id: checkoutReference,
      url: url.toString(),
      provider: 'cakto',
      plan,
      billing,
      period: body.period,
      uniqueId,
    };
  }

  validateWebhook(rawBody: string, headers: Record<string, string | string[] | undefined>) {
    const expectedToken = process.env.CAKTO_WEBHOOK_TOKEN || '';
    const expectedSecret = process.env.CAKTO_WEBHOOK_SECRET || '';
    const expectedHmacSecret = process.env.CAKTO_WEBHOOK_HMAC_SECRET || '';

    if (!expectedToken && !expectedSecret && !expectedHmacSecret) {
      // Fail closed. Without a configured secret there is nothing to verify, so
      // accepting the request would let anyone forge a paid subscription.
      // ALLOW_UNSIGNED_WEBHOOKS is an explicit, loud opt-out for local testing
      // only — never set it anywhere that touches real billing data.
      if (process.env.ALLOW_UNSIGNED_WEBHOOKS === 'true') {
        Logger.error(
          'Cakto webhook signature verification is DISABLED (ALLOW_UNSIGNED_WEBHOOKS=true). Anyone can forge subscription events.',
          'CaktoService'
        );
        return true;
      }

      Logger.error(
        'Rejected Cakto webhook: no CAKTO_WEBHOOK_TOKEN / CAKTO_WEBHOOK_SECRET / CAKTO_WEBHOOK_HMAC_SECRET configured.',
        'CaktoService'
      );
      return false;
    }

    if (expectedToken) {
      const rawToken = String(
        headers['x-cakto-token'] || headers.authorization || ''
      ).trim();
      const token = rawToken.toLowerCase().startsWith('bearer ')
        ? rawToken.slice(7).trim()
        : rawToken;
      if (!safeEquals(token, expectedToken)) {
        return false;
      }
    }

    if (expectedHmacSecret) {
      const signature = String(
        headers['x-cakto-signature'] ||
          headers['x-cakto-hmac-sha256'] ||
          headers['x-hub-signature-256'] ||
          headers['x-signature'] ||
          ''
      ).trim();
      if (!verifyHmac(rawBody, signature, expectedHmacSecret)) {
        return false;
      }
    }

    if (expectedSecret) {
      const body = JSON.parse(rawBody || '{}') as Record<string, unknown>;
      const payload = asRecord(body.payload);
      const data = asRecord(body.data);
      const receivedSecret = String(
        body.secret || payload?.secret || data?.secret || ''
      ).trim();
      if (!safeEquals(receivedSecret, expectedSecret)) {
        return false;
      }
    }

    return true;
  }

  parseWebhook(rawBody: string): ParsedCaktoWebhook | null {
    const body = JSON.parse(rawBody || '{}') as Record<string, unknown>;
    const eventType = String(body.event || body.type || 'cakto.order').trim();
    const data = asRecord(body.data);
    const payload = asRecord(body.payload);
    const payloadData = payload ? asRecord(payload.data) : undefined;
    const order = (data || payloadData || body) as CaktoOrder;
    if (!order?.id) {
      return null;
    }

    return {
      eventId: `${eventType}:${order.id}`,
      eventType,
      orderId: String(order.id),
      status: String(order.status || ''),
      checkoutReference:
        String(order.sck || '').trim() ||
        (String(order.refId || '').trim() || undefined),
      providerSubscriptionId: order.subscription
        ? String(order.subscription)
        : undefined,
      dueAt: order.due_date || undefined,
    };
  }

  async processWebhook(event: ParsedCaktoWebhook) {
    const subscription =
      await this._subscriptionService.getSubscriptionByIdentifier(
        event.checkoutReference || event.providerSubscriptionId || ''
      );
    if (!subscription) {
      return { ok: true, ignored: true, reason: 'subscription_not_found' };
    }

    if (isPaidStatus(event.status)) {
      const billing = subscription.subscriptionTier as ContentFlowBillingTier;
      await this._subscriptionService.createOrUpdateSubscription(
        false,
        event.providerSubscriptionId || event.checkoutReference || event.orderId,
        subscription.organization.paymentId || `cakto:${subscription.organization.id}`,
        pricing[billing].channel!,
        billing,
        subscription.period,
        null,
        undefined,
        subscription.organizationId
      );
      return { ok: true, status: 'active' };
    }

    if (isCanceledStatus(event.status)) {
      await this._subscriptionService.deleteSubscription(
        subscription.organization.paymentId || `cakto:${subscription.organization.id}`
      );
      return { ok: true, status: 'canceled' };
    }

    return { ok: true, status: 'pending' };
  }

  async cancel(organization: Organization) {
    if (!organization.paymentId) {
      await this._subscriptionService.deleteSubscription(
        `cakto:${organization.id}`
      );
      return { cancel_at: new Date(), provider: 'cakto' };
    }

    await this._subscriptionService.deleteSubscription(organization.paymentId);
    return { cancel_at: new Date(), provider: 'cakto' };
  }
}
