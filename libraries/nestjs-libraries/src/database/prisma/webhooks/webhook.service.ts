import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class WebhookService {
  constructor(private readonly _prisma: PrismaService) {}

  /**
   * Register a new webhook.
   */
  async createWebhook(
    orgId: string,
    data: { url: string; events: string[] },
  ) {
    const secret = randomBytes(32).toString('hex');

    return this._prisma.webhook.create({
      data: {
        organizationId: orgId,
        url: data.url,
        events: data.events,
        secret,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * List webhooks for an organization.
   */
  async listWebhooks(orgId: string) {
    return this._prisma.webhook.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single webhook.
   */
  async getWebhook(orgId: string, id: string) {
    const webhook = await this._prisma.webhook.findUnique({
      where: { id },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!webhook || webhook.organizationId !== orgId || webhook.deletedAt) {
      throw new HttpException('Webhook não encontrado', HttpStatus.NOT_FOUND);
    }

    return webhook;
  }

  /**
   * Update a webhook.
   */
  async updateWebhook(
    orgId: string,
    id: string,
    data: { url?: string; events?: string[]; status?: string },
  ) {
    const webhook = await this._prisma.webhook.findUnique({ where: { id } });
    if (!webhook || webhook.organizationId !== orgId) {
      throw new HttpException('Webhook não encontrado', HttpStatus.NOT_FOUND);
    }

    return this._prisma.webhook.update({
      where: { id },
      data: {
        url: data.url,
        events: data.events,
        status: data.status as any,
      },
    });
  }

  /**
   * Delete a webhook (soft delete).
   */
  async deleteWebhook(orgId: string, id: string) {
    const webhook = await this._prisma.webhook.findUnique({ where: { id } });
    if (!webhook || webhook.organizationId !== orgId) {
      throw new HttpException('Webhook não encontrado', HttpStatus.NOT_FOUND);
    }

    await this._prisma.webhook.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'DELETED' },
    });

    return { success: true };
  }

  /**
   * Trigger webhooks for an event.
   * Called by services when events occur (e.g., job.completed, idea.approved).
   */
  async triggerWebhooks(orgId: string, event: string, payload: any) {
    const webhooks = await this._prisma.webhook.findMany({
      where: {
        organizationId: orgId,
        status: 'ACTIVE',
        events: { has: event },
        deletedAt: null,
      },
    });

    for (const webhook of webhooks) {
      this.deliverWebhook(webhook, event, payload).catch(() => {});
    }

    return { triggered: webhooks.length };
  }

  /**
   * Deliver a webhook payload with retry.
   */
  private async deliverWebhook(
    webhook: { id: string; url: string; secret: string },
    event: string,
    payload: any,
    attempt = 1,
  ) {
    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    const signature = this.signPayload(body, webhook.secret);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ContentFlow-Signature': signature,
          'X-ContentFlow-Event': event,
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      const responseBody = await response.text().catch(() => '');

      await this._prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload,
          responseStatus: response.status,
          responseBody: responseBody.substring(0, 1000),
          success: response.ok,
          attemptCount: attempt,
        },
      });

      if (response.ok) {
        await this._prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            lastTriggeredAt: new Date(),
            lastResponseStatus: response.status,
            failureCount: 0,
          },
        });
      } else {
        await this.handleFailure(webhook.id, response.status);
      }
    } catch (error: any) {
      await this._prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload,
          success: false,
          responseBody: error.message?.substring(0, 1000),
          attemptCount: attempt,
        },
      });

      await this.handleFailure(webhook.id, 0);

      // Retry up to 3 times with exponential backoff
      if (attempt < 3) {
        setTimeout(
          () => this.deliverWebhook(webhook, event, payload, attempt + 1),
          Math.pow(2, attempt) * 1000,
        );
      }
    }
  }

  private async handleFailure(webhookId: string, status: number) {
    const webhook = await this._prisma.webhook.update({
      where: { id: webhookId },
      data: {
        failureCount: { increment: 1 },
        lastResponseStatus: status,
      },
    });

    // Auto-pause after 10 consecutive failures
    if (webhook.failureCount >= 10) {
      await this._prisma.webhook.update({
        where: { id: webhookId },
        data: { status: 'FAILED' },
      });
    }
  }

  private signPayload(body: string, secret: string): string {
    const crypto = require('crypto');
    return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  }
}
