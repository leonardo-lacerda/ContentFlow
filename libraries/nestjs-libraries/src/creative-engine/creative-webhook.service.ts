import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { isSafePublicHttpsUrl } from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';
import { ssrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';

@Injectable()
export class CreativeWebhookService {
  private readonly logger = new Logger(CreativeWebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, input: { url: string; events?: string[] }) {
    const url = new URL(input.url);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Webhook URL must use HTTP or HTTPS');
    await this.assertSafeDestination(url);
    return this.prisma.creativeWebhookSubscription.create({
      data: {
        organizationId,
        url: input.url,
        events: input.events || [
          'creative.job.completed',
          'creative.job.failed',
          'creative.workflow.completed',
          'creative.workflow.failed',
          'creative.workflow.cancelled',
          'creative.project.taken_down',
        ],
        secret: randomBytes(32).toString('hex'),
      },
      select: { id: true, url: true, events: true, active: true, secret: true, createdAt: true },
    });
  }

  list(organizationId: string) {
    return this.prisma.creativeWebhookSubscription.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, url: true, events: true, active: true, failureCount: true, createdAt: true },
    });
  }

  listDeliveries(organizationId: string, subscriptionId?: string) {
    return this.prisma.creativeWebhookDelivery.findMany({
      where: {
        ...(subscriptionId ? { subscriptionId } : {}),
        subscription: { organizationId },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        subscriptionId: true,
        event: true,
        status: true,
        responseStatus: true,
        attempts: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string, organizationId: string) {
    return this.prisma.creativeWebhookSubscription.updateMany({
      where: { id, organizationId },
      data: { active: false },
    });
  }

  async replay(deliveryId: string, organizationId: string) {
    const delivery = await this.prisma.creativeWebhookDelivery.findFirst({
      where: {
        id: deliveryId,
        subscription: { organizationId },
      },
      include: { subscription: true },
    });
    if (!delivery) throw new NotFoundException('Creative webhook delivery not found');

    const replayedDeliveryId = await this.deliver(
      delivery.subscription,
      delivery.event,
      (delivery.payload && typeof delivery.payload === 'object'
        ? delivery.payload
        : {}) as Record<string, unknown>,
    );
    return this.prisma.creativeWebhookDelivery.findUnique({
      where: { id: replayedDeliveryId },
    });
  }

  async emit(organizationId: string, event: string, payload: Record<string, unknown>) {
    const subscriptions = await this.prisma.creativeWebhookSubscription.findMany({
      where: { organizationId, active: true, events: { has: event } },
    });
    await Promise.all(subscriptions.map(async (subscription) => {
      try {
        await this.deliver(subscription, event, payload);
      } catch (error) {
        this.logger.warn(`Creative webhook delivery failed for ${subscription.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }));
  }

  private async deliver(subscription: any, event: string, payload: Record<string, unknown>) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({ event, data: payload, sentAt: new Date().toISOString() });
    const signature = createHmac('sha256', subscription.secret).update(`${timestamp}.${body}`).digest('hex');
    const delivery = await this.prisma.creativeWebhookDelivery.create({
      data: { subscriptionId: subscription.id, event, payload: JSON.parse(body) },
    });
    const maxAttempts = Math.min(5, Math.max(1, Number(process.env.CREATIVE_WEBHOOK_MAX_ATTEMPTS || 3)));
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await fetch(subscription.url, {
          method: 'POST',
          // @ts-expect-error undici dispatcher is supported by the runtime fetch implementation.
          dispatcher: ssrfSafeDispatcher,
          headers: {
            'Content-Type': 'application/json',
            'X-ContentFlow-Signature': signature,
            'X-ContentFlow-Timestamp': timestamp,
            'X-ContentFlow-Event': event,
          },
          body,
          signal: AbortSignal.timeout(10000),
        });
        if (response.ok) {
          await this.prisma.creativeWebhookDelivery.update({
            where: { id: delivery.id },
            data: { status: 'DELIVERED', responseStatus: response.status, attempts: attempt },
          });
          await this.prisma.creativeWebhookSubscription.update({
            where: { id: subscription.id },
            data: { failureCount: 0, updatedAt: new Date() },
          });
          return delivery.id;
        }
        await this.prisma.creativeWebhookDelivery.update({
          where: { id: delivery.id },
          data: { responseStatus: response.status, attempts: attempt },
        });
      } catch {
        await this.prisma.creativeWebhookDelivery.update({
          where: { id: delivery.id },
          data: { attempts: attempt },
        });
      }
      if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
    }
    await this.prisma.creativeWebhookDelivery.update({ where: { id: delivery.id }, data: { status: 'FAILED' } });
    await this.prisma.creativeWebhookSubscription.update({
      where: { id: subscription.id },
      data: { failureCount: { increment: 1 }, updatedAt: new Date() },
    });
    return delivery.id;
  }

  private async assertSafeDestination(url: URL) {
    if (process.env.CREATIVE_ALLOW_PRIVATE_WEBHOOKS === 'true') return;
    if (!(await isSafePublicHttpsUrl(url.toString()))) {
      throw new Error('Private or unsafe webhook destinations are disabled');
    }
  }
}
