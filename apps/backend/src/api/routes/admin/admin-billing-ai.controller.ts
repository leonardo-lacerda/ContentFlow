import { BadRequestException, Body, Controller, Delete, Get, HttpException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { BillingAccountingService } from '@gitroom/nestjs-libraries/services/billing-accounting.service';
import { PricingCatalogService } from '@gitroom/nestjs-libraries/services/pricing-catalog.service';
import { AdminSessionGuard } from '@gitroom/backend/services/auth/admin/admin-session.guard';
import { AdminPermissionGuard } from '@gitroom/backend/services/auth/admin/admin-permission.guard';
import { AdminPermission, GetAdminUserFromRequest } from '@gitroom/backend/services/auth/admin/admin-permission.decorator';
import { AdminUserWithAccount } from '@gitroom/backend/services/auth/admin/admin-auth.service';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';

@Controller('/admin/billing')
@UseGuards(AdminSessionGuard, AdminPermissionGuard)
export class AdminBillingController {
  constructor(private readonly _prisma: PrismaService, private readonly _billing: BillingAccountingService, private readonly _pricing: PricingCatalogService, private readonly _stripe: StripeService) {}

  @Get('/summary')
  @AdminPermission('billing.summary.read', { resourceType: 'Billing' })
  summary() { return this._billing.adminSummary(); }

  @Get('/plans')
  @AdminPermission('billing.plans.read', { resourceType: 'BillingPlan' })
  plans() { return this._prisma.billingPlan.findMany({ include: { prices: true, _count: { select: { subscriptions: true } } }, orderBy: { priceCents: 'asc' } }); }

  @Post('/plans')
  @AdminPermission('billing.plans.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'BillingPlan' })
  createPlan(@Body() body: { code?: string; name?: string; priceCents?: number; monthlyCredits?: number }) {
    if (!body.code || !body.name || !Number.isInteger(body.priceCents) || !Number.isInteger(body.monthlyCredits)) throw new BadRequestException('code, name, priceCents and monthlyCredits are required');
    return this._prisma.billingPlan.create({ data: { code: body.code.toUpperCase(), name: body.name, priceCents: body.priceCents!, monthlyCredits: body.monthlyCredits! } });
  }

  @Patch('/plans/:id')
  @AdminPermission('billing.plans.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'BillingPlan' })
  updatePlan(@Param('id') id: string, @Body() body: { name?: string; priceCents?: number; monthlyCredits?: number; active?: boolean }) { return this._prisma.billingPlan.update({ where: { id }, data: body }); }

  @Delete('/plans/:id')
  @AdminPermission('billing.plans.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'BillingPlan' })
  removePlan(@Param('id') id: string) { return this._prisma.billingPlan.update({ where: { id }, data: { active: false } }); }

  @Get('/prices')
  @AdminPermission('billing.pricing.read', { resourceType: 'BillingPrice' })
  prices() { return this._prisma.billingPrice.findMany({ include: { plan: true }, orderBy: { amountCents: 'asc' } }); }

  @Post('/prices')
  @AdminPermission('billing.pricing.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'BillingPrice' })
  createPrice(@Body() body: { code?: string; planId?: string; kind?: string; amountCents?: number; credits?: number; validityDays?: number; provider?: string }) {
    if (!body.code || !Number.isInteger(body.amountCents) || !Number.isInteger(body.credits)) throw new BadRequestException('code, amountCents and credits are required');
    return this._prisma.billingPrice.create({ data: { code: body.code.toUpperCase(), planId: body.planId, kind: body.kind || 'PLAN', amountCents: body.amountCents!, credits: body.credits!, validityDays: body.validityDays, provider: body.provider || 'STRIPE' } });
  }

  @Patch('/prices/:id')
  @AdminPermission('billing.pricing.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'BillingPrice' })
  updatePrice(@Param('id') id: string, @Body() body: { amountCents?: number; credits?: number; validityDays?: number; active?: boolean }) { return this._prisma.billingPrice.update({ where: { id }, data: body }); }

  @Delete('/prices/:id')
  @AdminPermission('billing.pricing.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'BillingPrice' })
  removePrice(@Param('id') id: string) { return this._prisma.billingPrice.update({ where: { id }, data: { active: false, validUntil: new Date() } }); }

  @Get('/subscriptions')
  @AdminPermission('billing.subscriptions.read', { resourceType: 'BillingSubscription' })
  subscriptions(@Query('status') status?: string) { return this._prisma.billingSubscription.findMany({ where: status ? { status } : undefined, include: { plan: true, organization: { select: { id: true, name: true, status: true } } }, orderBy: { updatedAt: 'desc' }, take: 500 }); }

  @Post('/subscriptions')
  @AdminPermission('billing.subscriptions.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'BillingSubscription' })
  createSubscription(@Body() body: { organizationId?: string; planId?: string; provider?: string }) {
    if (!body.organizationId || !body.planId) throw new BadRequestException('organizationId and planId are required');
    return this._prisma.billingSubscription.create({ data: { organizationId: body.organizationId, planId: body.planId, provider: body.provider || 'STRIPE' } });
  }

  @Patch('/subscriptions/:id')
  @AdminPermission('billing.subscriptions.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'BillingSubscription' })
  changeSubscription(@Param('id') id: string, @Body() body: { planId?: string; cancelAtPeriodEnd?: boolean }) { return this._prisma.billingSubscription.update({ where: { id }, data: body }); }

  @Post('/subscriptions/:id/cancel')
  @AdminPermission('billing.subscriptions.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'BillingSubscription' })
  cancelSubscription(@Param('id') id: string) { return this._prisma.billingSubscription.update({ where: { id }, data: { status: 'CANCELLED', cancelAtPeriodEnd: false } }); }

  @Post('/subscriptions/:id/reactivate')
  @AdminPermission('billing.subscriptions.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'BillingSubscription' })
  reactivateSubscription(@Param('id') id: string) { return this._prisma.billingSubscription.update({ where: { id }, data: { status: 'ACTIVE', cancelAtPeriodEnd: false, failedAt: null } }); }

  @Get('/invoices')
  @AdminPermission('billing.invoices.read', { resourceType: 'BillingInvoice' })
  invoices(@Query('organizationId') organizationId?: string, @Query('status') status?: string) { return this._prisma.billingInvoice.findMany({ where: { ...(organizationId ? { organizationId } : {}), ...(status ? { status } : {}) }, orderBy: { createdAt: 'desc' }, take: 500 }); }

  @Post('/refunds')
  @AdminPermission('billing.refund', { severity: 'CRITICAL', requireReason: true, resourceType: 'BillingRefund' })
  async refund(@Body() body: { organizationId?: string; chargeIds?: string[]; amountCents?: number }) {
    if (!body.organizationId || !body.chargeIds?.length) throw new BadRequestException('organizationId and chargeIds are required');
    if (Math.abs(body.amountCents || 0) > 100000) throw new HttpException('Refunds above R$1,000 require an approved request', 409);
    return this._stripe.refundCharges(body.organizationId, body.chargeIds);
  }

  @Get('/margins')
  @AdminPermission('billing.margin.read', { resourceType: 'FinancialReport' })
  async margins(@Query('organizationId') organizationId?: string) {
    const where = organizationId ? { organizationId } : {};
    const [revenue, cost, credits] = await Promise.all([
      this._prisma.billingInvoice.aggregate({ where: { ...where, status: 'PAID' }, _sum: { amountCents: true } }),
      this._prisma.providerCostRecord.aggregate({ where, _sum: { costBrlCents: true, actualCostUsd: true } }),
      this._prisma.creditTransaction.aggregate({ where, _sum: { credits: true } }),
    ]);
    return { revenueCents: revenue._sum.amountCents || 0, providerCostBrlCents: cost._sum.costBrlCents || 0, providerCostUsd: cost._sum.actualCostUsd || 0, credits: credits._sum.credits || 0 };
  }
}

@Controller('/admin/credits')
@UseGuards(AdminSessionGuard, AdminPermissionGuard)
export class AdminCreditsController {
  constructor(private readonly _prisma: PrismaService, private readonly _billing: BillingAccountingService) {}

  @Get('/accounts')
  @AdminPermission('credits.read', { resourceType: 'CreditAccount' })
  accounts(@Query('organizationId') organizationId?: string) { return this._prisma.creditAccount.findMany({ where: organizationId ? { organizationId } : undefined, include: { organization: { select: { id: true, name: true } } }, orderBy: { updatedAt: 'desc' }, take: 500 }); }

  @Get('/ledger')
  @AdminPermission('credits.read', { resourceType: 'CreditTransaction' })
  ledger(@Query('organizationId') organizationId?: string, @Query('limit') limit = '100') { if (!organizationId) throw new BadRequestException('organizationId is required'); return this._billing.getLedger(organizationId, Math.min(500, Number(limit) || 100)); }

  @Post('/adjust')
  @AdminPermission('credits.adjust', { severity: 'CRITICAL', requireReason: true, resourceType: 'FinancialAdjustment' })
  async adjust(@Body() body: { organizationId?: string; credits?: number; reason?: string; reference?: string }, @GetAdminUserFromRequest() actor: AdminUserWithAccount) {
    if (!body.organizationId || !Number.isInteger(body.credits) || !body.credits || !body.reason?.trim()) throw new BadRequestException('organizationId, non-zero integer credits and reason are required');
    const admin = await this._prisma.adminUser.findUnique({ where: { id: actor.id } });
    const limit = admin?.role === 'SUPPORT' ? 500 : admin?.role === 'FINANCE' ? 50000 : 50000;
    if (Math.abs(body.credits) > limit) throw new HttpException(`Credit adjustment exceeds role limit of ${limit}`, 403);
    return this._billing.adjustCredits(body.organizationId, body.credits, body.reason, actor.id, body.reference);
  }
}

@Controller('/admin/ai')
@UseGuards(AdminSessionGuard, AdminPermissionGuard)
export class AdminAiController {
  constructor(private readonly _prisma: PrismaService, private readonly _pricing: PricingCatalogService) {}

  @Get('/pricing')
  @AdminPermission('ai.pricing.read', { resourceType: 'PricingVersion' })
  pricing() { return this._prisma.pricingVersion.findMany({ orderBy: [{ provider: 'asc' }, { operation: 'asc' }] }); }

  @Get('/providers')
  @AdminPermission('ai.providers.read', { resourceType: 'PlatformSetting' })
  providers() { return this._prisma.platformSetting.findMany({ where: { category: 'ai', key: { startsWith: 'ai.provider.' } }, orderBy: { key: 'asc' } }).then((rows) => rows.map((row) => row.isSecret ? { ...row, value: '[REDACTED]' } : row)); }

  @Patch('/providers/:provider')
  @AdminPermission('ai.providers.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'PlatformSetting' })
  provider(@Param('provider') provider: string, @Body() body: { config?: unknown; disabled?: boolean }, @GetAdminUserFromRequest() actor: AdminUserWithAccount) {
    return this._prisma.platformSetting.upsert({ where: { key: `ai.provider.${provider}.config` }, update: { value: { config: body.config, disabled: !!body.disabled } as any, updatedBy: actor.id }, create: { key: `ai.provider.${provider}.config`, category: 'ai', value: { config: body.config, disabled: !!body.disabled } as any, updatedBy: actor.id } });
  }

  @Patch('/pricing/:code')
  @AdminPermission('ai.pricing.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'PricingVersion' })
  updatePricing(@Param('code') code: string, @Body() body: { baseCredits?: number; minCredits?: number; providerCostUsd?: number; active?: boolean }, @GetAdminUserFromRequest() actor: AdminUserWithAccount) { return this._pricing.update(code, { ...body, updatedBy: actor.id }); }

  @Get('/jobs')
  @AdminPermission('ai.jobs.read', { resourceType: 'GenerationJob' })
  jobs(@Query('organizationId') organizationId?: string, @Query('status') status?: string) { return this._prisma.generationJob.findMany({ where: { organizationId, status: status as any }, orderBy: { createdAt: 'desc' }, take: 500 }); }

  @Post('/jobs/:id/cancel')
  @AdminPermission('ai.jobs.write', { severity: 'WARNING', requireReason: true, resourceType: 'GenerationJob' })
  cancelJob(@Param('id') id: string) { return this._prisma.generationJob.update({ where: { id }, data: { status: 'CANCELLED', completedAt: new Date() } }); }

  @Post('/jobs/:id/retry')
  @AdminPermission('ai.jobs.write', { severity: 'WARNING', requireReason: true, resourceType: 'GenerationJob' })
  retryJob(@Param('id') id: string) { return this._prisma.generationJob.update({ where: { id }, data: { status: 'QUEUED', error: null, completedAt: null } }); }

  @Post('/jobs/:id/prioritize')
  @AdminPermission('ai.jobs.write', { severity: 'WARNING', requireReason: true, resourceType: 'GenerationJob' })
  prioritizeJob(@Param('id') id: string) { return this._prisma.generationJob.update({ where: { id }, data: { progress: { adminPriority: true } } }); }

  @Get('/costs')
  @AdminPermission('ai.costs.read', { resourceType: 'ProviderCostRecord' })
  costs(@Query('organizationId') organizationId?: string, @Query('provider') provider?: string) { return this._prisma.providerCostRecord.findMany({ where: { organizationId, provider }, orderBy: { createdAt: 'desc' }, take: 500 }); }

  @Post('/providers/:provider/kill-switch')
  @AdminPermission('ai.providers.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'PlatformSetting' })
  async killSwitch(@Param('provider') provider: string, @Body('enabled') enabled: boolean, @GetAdminUserFromRequest() actor: AdminUserWithAccount) {
    return this._prisma.platformSetting.upsert({ where: { key: `ai.provider.${provider}.disabled` }, update: { value: !!enabled, updatedBy: actor.id }, create: { key: `ai.provider.${provider}.disabled`, value: !!enabled, category: 'ai', description: `Kill switch for ${provider}`, updatedBy: actor.id } });
  }
}
