import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { AdminSessionGuard } from '@gitroom/backend/services/auth/admin/admin-session.guard';
import { AdminPermissionGuard } from '@gitroom/backend/services/auth/admin/admin-permission.guard';
import { AdminPermission, GetAdminUserFromRequest } from '@gitroom/backend/services/auth/admin/admin-permission.decorator';
import { AdminUserWithAccount } from '@gitroom/backend/services/auth/admin/admin-auth.service';

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dayKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

@ApiTags('Admin Analytics')
@Controller('/admin/analytics')
@UseGuards(AdminSessionGuard, AdminPermissionGuard)
export class AdminAnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('/summary')
  @AdminPermission('analytics.read')
  async summary() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const [users, organizations, activeSubscriptions, currentRevenue, previousRevenue, cancelled30d, costs, affiliate] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.organization.count({ where: { deletedAt: null } }),
      this.prisma.billingSubscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.billingInvoice.aggregate({ where: { status: 'PAID', paidAt: { gte: monthStart } }, _sum: { amountCents: true } }),
      this.prisma.billingInvoice.aggregate({ where: { status: 'PAID', paidAt: { gte: previousMonthStart, lt: monthStart } }, _sum: { amountCents: true } }),
      this.prisma.billingSubscription.count({ where: { status: { in: ['CANCELLED', 'CANCELED'] }, updatedAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
      this.prisma.generationCost.aggregate({ _sum: { costBrl: true, costUsd: true } }),
      this.prisma.affiliate.aggregate({ _sum: { totalEarnings: true, paidEarnings: true, totalReferrals: true, totalConversions: true } }),
    ]);
    const mrr = Number(currentRevenue._sum.amountCents || 0) / 100;
    const churnRate = activeSubscriptions + cancelled30d > 0 ? cancelled30d / (activeSubscriptions + cancelled30d) : 0;
    return {
      users,
      organizations,
      activeSubscriptions,
      mrr,
      arr: mrr * 12,
      churnRate,
      ltv: churnRate > 0 ? mrr / churnRate : null,
      revenue: { currentMonth: mrr, previousMonth: Number(previousRevenue._sum.amountCents || 0) / 100 },
      aiCosts: costs._sum,
      affiliate: affiliate._sum,
    };
  }

  @Get('/timeseries')
  @AdminPermission('analytics.read')
  async timeseries(@Query('days') daysRaw?: string) {
    const days = Math.min(Math.max(Number(daysRaw || 30), 7), 365);
    const since = new Date(Date.now() - days * 86400000);
    const [users, organizations, invoices, costs] = await Promise.all([
      this.prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      this.prisma.organization.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      this.prisma.billingInvoice.findMany({ where: { createdAt: { gte: since }, status: 'PAID' }, select: { createdAt: true, amountCents: true } }),
      this.prisma.generationCost.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, costBrl: true } }),
    ]);
    const buckets = new Map<string, { users: number; organizations: number; revenue: number; aiCost: number }>();
    for (let i = 0; i <= days; i++) {
      const key = dayKey(startOfDay(new Date(since.getTime() + i * 86400000)));
      buckets.set(key, { users: 0, organizations: 0, revenue: 0, aiCost: 0 });
    }
    users.forEach(({ createdAt }) => { const bucket = buckets.get(dayKey(createdAt)); if (bucket) bucket.users++; });
    organizations.forEach(({ createdAt }) => { const bucket = buckets.get(dayKey(createdAt)); if (bucket) bucket.organizations++; });
    invoices.forEach(({ createdAt, amountCents }) => { const bucket = buckets.get(dayKey(createdAt)); if (bucket) bucket.revenue += amountCents / 100; });
    costs.forEach(({ createdAt, costBrl }) => { const bucket = buckets.get(dayKey(createdAt)); if (bucket) bucket.aiCost += costBrl; });
    return [...buckets.entries()].map(([date, values]) => ({ date, ...values }));
  }

  @Get('/feature-usage')
  @AdminPermission('analytics.read')
  async featureUsage() {
    const [posts, jobs, integrations, transactions] = await Promise.all([
      this.prisma.post.findMany({ select: { state: true }, take: 10000 }),
      this.prisma.generationJob.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.integration.groupBy({ by: ['providerIdentifier'], _count: { _all: true } }),
      this.prisma.creditTransaction.groupBy({ by: ['operation'], _sum: { credits: true }, _count: { _all: true } }),
    ]);
    const postUsage = posts.reduce<Record<string, number>>((result, row) => { const key = row.state || 'UNKNOWN'; result[key] = (result[key] || 0) + 1; return result; }, {});
    return { posts: postUsage, generationJobs: jobs, integrations, creditOperations: transactions };
  }
}

@ApiTags('Admin Security Operations')
@Controller('/admin/security')
@UseGuards(AdminSessionGuard, AdminPermissionGuard)
export class AdminSecurityOperationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('/overview')
  @AdminPermission('security.alerts.read')
  async overview() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [sessions, logs, alerts, anomalies] = await Promise.all([
      this.prisma.adminSession.findMany({ where: { revokedAt: null, expiresAt: { gt: new Date() } }, include: { adminUser: { include: { user: { select: { email: true, name: true } } } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.adminAuditLog.findMany({ where: { createdAt: { gte: since }, severity: 'CRITICAL' }, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.adminSecurityAlert.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.adminAnomalyEvent.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 100 }),
    ]);
    const byIp = sessions.reduce<Record<string, number>>((result, session) => { const key = session.ip || 'unknown'; result[key] = (result[key] || 0) + 1; return result; }, {});
    return { activeSessions: sessions, criticalActions: logs, alerts, anomalies, sessionsByIp: byIp };
  }

  @Get('/alerts')
  @AdminPermission('security.alerts.read')
  alerts(@Query('acknowledged') acknowledged?: string) {
    return this.prisma.adminSecurityAlert.findMany({ where: acknowledged === undefined ? undefined : { acknowledgedAt: acknowledged === 'true' ? { not: null } : null }, orderBy: { createdAt: 'desc' }, take: 200 });
  }

  @Patch('/alerts/:id/acknowledge')
  @AdminPermission('security.alerts.write', { severity: 'WARNING', requireReason: true, resourceType: 'AdminSecurityAlert' })
  acknowledge(@Param('id') id: string, @GetAdminUserFromRequest() actor: AdminUserWithAccount) {
    return this.prisma.adminSecurityAlert.update({ where: { id }, data: { acknowledgedAt: new Date(), acknowledgedBy: actor.id } });
  }

  @Get('/anomalies')
  @AdminPermission('security.anomalies.read')
  anomalies() { return this.prisma.adminAnomalyEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }); }
}
