import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';

type AlertInput = {
  type: string;
  severity?: string;
  title: string;
  message: string;
  adminUserId?: string;
  resourceId?: string;
  payload?: unknown;
};

@Injectable()
export class AdminAlertService {
  private lastBurstAlertAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService
  ) {}

  async emit(input: AlertInput) {
    const alert = await this.prisma.adminSecurityAlert.create({
      data: {
        type: input.type,
        severity: input.severity || 'WARNING',
        title: input.title,
        message: input.message,
        adminUserId: input.adminUserId,
        resourceId: input.resourceId,
        payload: input.payload as any,
      },
    });

    const recipients = (process.env.ADMIN_ALERT_EMAILS || '')
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
    await Promise.allSettled(
      recipients.map((recipient) =>
        this.email.sendEmailSync(recipient, `[Admin] ${input.title}`, `<p>${input.message}</p>`)
      )
    );

    const webhook = process.env.ADMIN_ALERT_WEBHOOK_URL;
    if (webhook && typeof fetch === 'function') {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          content: `[${input.severity || 'WARNING'}] ${input.title}: ${input.message}`,
          type: input.type,
          createdAt: alert.createdAt,
          payload: input.payload,
        }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => undefined);
    }
    return alert;
  }

  async observeAdminAction(params: {
    adminUserId?: string;
    action: string;
    success: boolean;
    severity: string;
    resourceId?: string;
  }) {
    if (!params.success || params.severity === 'CRITICAL') {
      await this.emit({
        type: params.success ? 'CRITICAL_ACTION' : 'FAILED_ADMIN_ACTION',
        severity: params.success ? 'WARNING' : 'CRITICAL',
        title: params.success ? 'Ação administrativa crítica' : 'Falha em ação administrativa',
        message: `${params.action}${params.resourceId ? ` (${params.resourceId})` : ''}`,
        adminUserId: params.adminUserId,
        resourceId: params.resourceId,
      }).catch(() => undefined);
    }

    const since = new Date(Date.now() - 5 * 60 * 1000);
    const count = await this.prisma.adminAuditLog.count({
      where: { adminUserId: params.adminUserId, createdAt: { gte: since } },
    }).catch(() => 0);
    if (count > 50 && Date.now() - this.lastBurstAlertAt > 5 * 60 * 1000) {
      this.lastBurstAlertAt = Date.now();
      await this.prisma.adminAnomalyEvent.create({
        data: {
          kind: 'ADMIN_ACTION_BURST',
          metric: 'admin_actions_5m',
          value: count,
          threshold: 50,
          windowStart: since,
          windowEnd: new Date(),
          adminUserId: params.adminUserId,
        },
      }).catch(() => undefined);
      await this.emit({
        type: 'ADMIN_ACTION_BURST',
        severity: 'CRITICAL',
        title: 'Mais de 50 ações administrativas em 5 minutos',
        message: `Foram registradas ${count} ações no período monitorado.`,
        adminUserId: params.adminUserId,
      }).catch(() => undefined);
    }
  }
}
