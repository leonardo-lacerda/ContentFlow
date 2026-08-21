import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';

type ResourceConfig = {
  model: string;
  permission: string;
  writePermission?: string;
  search: string[];
  fields: string[];
  sensitive?: string[];
  softDelete?: boolean;
  // Fields that can never be written through this generic CRUD endpoint,
  // because a dedicated endpoint handles the same change plus side effects
  // (session invalidation, ledger entries, notifications) that this
  // generic path does not and must not silently skip. Attempting to write
  // one throws — the caller must use the dedicated endpoint instead.
  blockedFields?: string[];
  // Fields whose presence in the update body forces CRITICAL severity
  // (fresh MFA step-up) on this write, matching the severity the dedicated
  // action/endpoint for the same state change already requires. '*' means
  // any write to this resource is CRITICAL.
  criticalFields?: string[] | '*';
};

const RESOURCE_CONFIG: Record<string, ResourceConfig> = {
  // `email` is excluded on purpose: changing a user's login email enables
  // full account takeover (change email -> /auth/forgot -> reset from the
  // attacker's inbox). That flow has its own CRITICAL endpoint
  // (AdminUsersController.updateEmail) which also invalidates sessions and
  // notifies the old address — this generic path must not be able to set
  // it directly and skip all of that.
  users: { model: 'user', permission: 'users.read', writePermission: 'users.write.basic', search: ['id', 'email', 'name', 'lastName'], fields: ['id', 'email', 'name', 'lastName', 'providerName', 'activated', 'createdAt', 'lastOnline', 'deletedAt'], softDelete: true, blockedFields: ['email'] },
  // `status` is critical: it's how an org gets suspended, which the
  // dedicated POST /organizations/:id/suspend endpoint requires CRITICAL
  // severity for. Writing it through this generic PATCH must match that.
  organizations: { model: 'organization', permission: 'orgs.read', writePermission: 'orgs.write', search: ['id', 'name', 'paymentId'], fields: ['id', 'name', 'description', 'status', 'allowTrial', 'isTrailing', 'createdAt', 'updatedAt', 'deletedAt'], softDelete: true, criticalFields: ['status'] },
  plans: { model: 'billingPlan', permission: 'billing.read', writePermission: 'billing.write', search: ['id', 'code', 'name'], fields: ['id', 'code', 'name', 'priceCents', 'monthlyCredits', 'active', 'createdAt', 'updatedAt'], criticalFields: '*' },
  prices: { model: 'billingPrice', permission: 'billing.read', writePermission: 'billing.write', search: ['id', 'code', 'kind', 'provider'], fields: ['id', 'planId', 'code', 'kind', 'provider', 'amountCents', 'credits', 'validityDays', 'active', 'validFrom', 'validUntil'], criticalFields: '*' },
  // `status`/`planId`/`cancelAtPeriodEnd` reflect what the customer is
  // actually entitled to. These must normally only move via a verified
  // Stripe/Cakto webhook, never a free-form admin PATCH — treat any write
  // to them as CRITICAL so at minimum a fresh MFA step-up is required.
  subscriptions: { model: 'billingSubscription', permission: 'billing.read', writePermission: 'billing.write', search: ['id', 'organizationId', 'status', 'providerSubscriptionId'], fields: ['id', 'organizationId', 'planId', 'provider', 'status', 'currentPeriodStart', 'currentPeriodEnd', 'cancelAtPeriodEnd', 'failedAt', 'createdAt', 'updatedAt'], criticalFields: ['status', 'planId', 'cancelAtPeriodEnd', 'currentPeriodEnd'] },
  // Same reasoning: `status`/`amountCents`/`creditsGranted` are the fields
  // a forged/direct write could use to fabricate a paid invoice or grant
  // credits without a real payment ever happening.
  invoices: { model: 'billingInvoice', permission: 'billing.read', writePermission: 'billing.write', search: ['id', 'organizationId', 'providerInvoiceId', 'status'], fields: ['id', 'organizationId', 'provider', 'providerInvoiceId', 'type', 'status', 'amountCents', 'currency', 'priceCode', 'creditsGranted', 'periodStart', 'periodEnd', 'paidAt', 'createdAt'], criticalFields: ['status', 'amountCents', 'creditsGranted'] },
  // Both credit resources' balance fields must only move through
  // AdminDomainService.adjustCredits() (the `adjust` action), which writes
  // an immutable CreditTransaction/FinancialAdjustment ledger entry and
  // enforces the SUPPORT-role daily limit. Writing `debtCredits`/
  // `remainingCredits`/`totalCredits`/`status` directly here would silently
  // change an org's balance with no ledger entry and no limit at all.
  credits: { model: 'creditAccount', permission: 'credits.read', writePermission: 'credits.adjust', search: ['id', 'organizationId', 'status'], fields: ['id', 'organizationId', 'status', 'debtCredits', 'createdAt', 'updatedAt'], blockedFields: ['debtCredits', 'status'] },
  creditLots: { model: 'creditLot', permission: 'credits.read', writePermission: 'credits.adjust', search: ['id', 'organizationId', 'source', 'status'], fields: ['id', 'organizationId', 'source', 'sourceReference', 'totalCredits', 'remainingCredits', 'expiresAt', 'status', 'createdAt', 'updatedAt'], blockedFields: ['totalCredits', 'remainingCredits', 'status'] },
  transactions: { model: 'creditTransaction', permission: 'credits.read', search: ['id', 'organizationId', 'type', 'operation', 'provider', 'model'], fields: ['id', 'organizationId', 'type', 'credits', 'operation', 'provider', 'model', 'estimatedCostUsd', 'actualCostUsd', 'costBrlCents', 'createdAt'] },
  providerCosts: { model: 'providerCostRecord', permission: 'ai.costs.read', search: ['id', 'organizationId', 'provider', 'model', 'operation'], fields: ['id', 'organizationId', 'provider', 'model', 'operation', 'providerRequestId', 'estimatedCostUsd', 'actualCostUsd', 'costBrlCents', 'creditsCharged', 'createdAt'] },
  jobs: { model: 'generationJob', permission: 'ai.jobs.read', writePermission: 'ai.jobs.write', search: ['id', 'organizationId', 'type', 'status', 'provider', 'model'], fields: ['id', 'organizationId', 'type', 'status', 'progress', 'error', 'model', 'provider', 'costEstimate', 'createdAt', 'updatedAt', 'startedAt', 'completedAt'] },
  generationCosts: { model: 'generationCost', permission: 'ai.costs.read', search: ['id', 'organizationId', 'type', 'label', 'provider', 'model'], fields: ['id', 'organizationId', 'generationJobId', 'type', 'label', 'costUsd', 'costBrl', 'usdToBrl', 'tokens', 'provider', 'model', 'createdAt'] },
  posts: { model: 'post', permission: 'content.read', writePermission: 'content.moderate', search: ['id', 'organizationId', 'state', 'title', 'content'], fields: ['id', 'organizationId', 'state', 'publishDate', 'title', 'description', 'createdAt', 'updatedAt', 'deletedAt'] },
  announcements: { model: 'announcement', permission: 'content.read', writePermission: 'content.write', search: ['id', 'title', 'description', 'color'], fields: ['id', 'title', 'description', 'color', 'createdAt'] },
  templates: { model: 'marketplaceTemplate', permission: 'content.read', writePermission: 'content.moderate', search: ['id', 'name', 'description', 'category', 'status'], fields: ['id', 'creatorOrgId', 'name', 'description', 'category', 'source', 'status', 'version', 'previewImageUrl', 'tags', 'usageCount', 'installCount', 'rating', 'createdAt', 'updatedAt', 'deletedAt'], softDelete: true },
  projects: { model: 'creativeProject', permission: 'content.read', search: ['id', 'organizationId', 'name', 'status'], fields: ['id', 'organizationId', 'name', 'status', 'createdAt', 'updatedAt'] },
  integrations: { model: 'integration', permission: 'integrations.read', writePermission: 'integrations.write', search: ['id', 'organizationId', 'name', 'providerIdentifier', 'type'], fields: ['id', 'organizationId', 'name', 'providerIdentifier', 'type', 'disabled', 'tokenExpiration', 'profile', 'deletedAt', 'createdAt', 'updatedAt'], sensitive: ['token', 'refreshToken'] },
  oauthApps: { model: 'oAuthApp', permission: 'integrations.read', writePermission: 'integrations.write', search: ['id', 'organizationId', 'name', 'clientId'], fields: ['id', 'organizationId', 'name', 'description', 'redirectUrl', 'clientId', 'createdAt', 'updatedAt', 'deletedAt'], sensitive: ['clientSecret'] },
  webhooks: { model: 'webhook', permission: 'integrations.read', writePermission: 'integrations.write', search: ['id', 'organizationId', 'url', 'status'], fields: ['id', 'organizationId', 'url', 'events', 'status', 'failureCount', 'lastTriggeredAt', 'lastResponseStatus', 'createdAt', 'updatedAt', 'deletedAt'], sensitive: ['secret'] },
  errors: { model: 'errors', permission: 'system.errors.read', search: ['id', 'organizationId', 'platform', 'message'], fields: ['id', 'organizationId', 'platform', 'message', 'body', 'postId', 'createdAt', 'updatedAt'] },
  flags: { model: 'featureFlag', permission: 'system.read', writePermission: 'system.flags.write', search: ['id', 'key', 'description'], fields: ['id', 'key', 'enabled', 'rolloutPercent', 'targetOrgIds', 'targetPlans', 'description', 'updatedBy', 'updatedAt'] },
  settings: { model: 'platformSetting', permission: 'system.read', writePermission: 'system.settings.write', search: ['id', 'key', 'category', 'description'], fields: ['id', 'key', 'value', 'category', 'description', 'isSecret', 'updatedBy', 'updatedAt'], criticalFields: '*' },
  affiliate: { model: 'affiliate', permission: 'analytics.read', writePermission: 'analytics.write', search: ['id', 'organizationId', 'code', 'name', 'email', 'status'], fields: ['id', 'organizationId', 'code', 'name', 'email', 'status', 'commissionRate', 'totalReferrals', 'totalConversions', 'totalEarnings', 'paidEarnings', 'createdAt', 'updatedAt', 'deletedAt'] },
};

const READ_ONLY_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'lastOnline', 'lastAccessAt']);
const SECRETS = new Set(['password', 'token', 'refreshToken', 'secret', 'clientSecret', 'accessToken', 'authorizationCode', 'apiKey', 'mfaSecret', 'mfaBackupCodes']);

@Injectable()
export class AdminDomainService {
  constructor(private _prisma: PrismaService) {}

  config(resource: string) {
    const config = RESOURCE_CONFIG[resource];
    if (!config) throw new NotFoundException(`Unknown admin resource: ${resource}`);
    return config;
  }

  async list(resource: string, params: { page?: number; limit?: number; search?: string; status?: string; organizationId?: string }) {
    const config = this.config(resource);
    const page = Math.max(0, params.page || 0);
    const limit = Math.min(Math.max(1, params.limit || 25), 100);
    const where: any = {};
    if (config.softDelete) where.deletedAt = null;
    if (params.organizationId && config.fields.includes('organizationId')) where.organizationId = params.organizationId;
    if (params.status && config.fields.includes('status')) where.status = params.status;
    if (params.search) where.OR = config.search.map((field) => ({ [field]: { contains: params.search, mode: 'insensitive' } }));
    const delegate: any = (this._prisma as any)[config.model];
    if (!delegate) throw new NotFoundException(`Admin model unavailable: ${resource}`);
    const [rows, total] = await Promise.all([
      delegate.findMany({ where, select: Object.fromEntries(config.fields.map((field) => [field, true])), orderBy: { createdAt: 'desc' }, skip: page * limit, take: limit }),
      delegate.count({ where }),
    ]);
    return { items: rows.map((row: any) => this.redact(row, config.sensitive)), total, page, limit, hasMore: page * limit + rows.length < total };
  }

  async get(resource: string, id: string) {
    const config = this.config(resource);
    const delegate: any = (this._prisma as any)[config.model];
    const include = resource === 'users'
      ? { organizations: { include: { organization: { select: { id: true, name: true, status: true } } } } }
      : resource === 'organizations'
        ? { users: { include: { user: { select: { id: true, email: true, name: true, activated: true } } } }, subscription: true, billingSubscription: true, creditAccount: true }
        : undefined;
    const row = await delegate.findUnique({ where: { id }, select: { ...Object.fromEntries(config.fields.map((field) => [field, true])), ...(include ? Object.fromEntries(Object.keys(include).map((key) => [key, include[key as keyof typeof include]])) : {}) } });
    if (!row) throw new NotFoundException('Resource not found');
    return this.redact(row, config.sensitive);
  }

  async update(resource: string, id: string, input: Record<string, unknown>, actorId: string) {
    const config = this.config(resource);
    if (!config.writePermission) throw new ForbiddenException('Resource is read-only');
    await this.assertPlatformWritable(resource, input);
    if (['plans', 'prices'].includes(resource)) await this.consumeApproval(input.approvalId as string | undefined, actorId, `billing.${resource}.update`);
    const data = this.pickWritable(config, input);
    if (!Object.keys(data).length) throw new BadRequestException('No writable fields supplied');
    if (config.model === 'platformSetting') data.updatedBy = actorId;
    if (config.model === 'featureFlag') data.updatedBy = actorId;
    const delegate: any = (this._prisma as any)[config.model];
    const row = await delegate.update({ where: { id }, data });
    return this.redact(row, config.sensitive);
  }

  async create(resource: string, input: Record<string, unknown>, actorId: string) {
    const config = this.config(resource);
    if (!['platformSetting', 'featureFlag', 'billingPlan', 'billingPrice', 'announcement'].includes(config.model)) throw new ForbiddenException('Creation is not enabled for this resource');
    await this.assertPlatformWritable(resource, input);
    if (['billingPlan', 'billingPrice'].includes(resource)) await this.consumeApproval(input.approvalId as string | undefined, actorId, `billing.${resource}.create`);
    const data = this.pickWritable(config, input);
    if (config.model === 'platformSetting' || config.model === 'featureFlag') data.updatedBy = actorId;
    const row = await (this._prisma as any)[config.model].create({ data });
    return this.redact(row, config.sensitive);
  }

  async action(resource: string, id: string, action: string, input: Record<string, unknown>, actorId: string) {
    const config = this.config(resource);
    const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
    if (!reason) throw new BadRequestException('A reason is required');
    if (action === 'dry-run') {
      const token = randomUUID();
      await ioRedis.set(`admin:dry-run:${token}`, JSON.stringify({ resource, id, action: input.executeAction || 'unknown', actorId }), 'EX', 15 * 60);
      return { dryRun: true, token, resource, id, preview: 'The requested operation was validated and is ready for execution.' };
    }
    if (input.dryRunToken) {
      const dryRun = await ioRedis.get(`admin:dry-run:${input.dryRunToken}`);
      if (!dryRun) throw new BadRequestException('Dry-run token is missing or expired');
      await ioRedis.del(`admin:dry-run:${input.dryRunToken}`);
    }
    await this.assertPlatformWritable(resource, input);
    const delegate: any = (this._prisma as any)[config.model];
    const current = await delegate.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Resource not found');
    if (action === 'soft-delete' && config.softDelete) {
      if (config.model === 'organization') await this.consumeApproval(input.approvalId as string | undefined, actorId, 'orgs.delete');
      if (config.model === 'user') await this.consumeApproval(input.approvalId as string | undefined, actorId, 'users.delete');
      return delegate.update({ where: { id }, data: { deletedAt: new Date() } });
    }
    if (action === 'restore' && config.softDelete) {
      if (!current.deletedAt || current.deletedAt < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) throw new BadRequestException('The 30-day restoration window has expired');
      return delegate.update({ where: { id }, data: { deletedAt: null } });
    }
    if (action === 'activate' && config.model === 'user') return delegate.update({ where: { id }, data: { activated: true } });
    if (action === 'deactivate' && config.model === 'user') return delegate.update({ where: { id }, data: { activated: false } });
    if (action === 'suspend' && config.model === 'organization') return delegate.update({ where: { id }, data: { status: 'SUSPENDED' } });
    if (action === 'unsuspend' && config.model === 'organization') return delegate.update({ where: { id }, data: { status: 'ACTIVE' } });
    if (action === 'toggle' && config.model === 'featureFlag') return delegate.update({ where: { id }, data: { enabled: !current.enabled, updatedBy: actorId } });
    if (action === 'disable' && config.model === 'integration') return delegate.update({ where: { id }, data: { disabled: true } });
    if (action === 'enable' && config.model === 'integration') return delegate.update({ where: { id }, data: { disabled: false } });
    if (['cancel', 'retry', 'prioritize'].includes(action) && config.model === 'generationJob') {
      const status = action === 'cancel' ? 'CANCELLED' : action === 'retry' ? 'QUEUED' : 'RUNNING';
      return delegate.update({ where: { id }, data: { status } });
    }
    if (action === 'adjust' && config.model === 'creditAccount') {
      const credits = Number(input.credits);
      const admin = await this._prisma.adminUser.findUnique({ where: { id: actorId } });
      const limit = admin?.role === 'SUPPORT' ? 500 : 50000;
      if (!Number.isInteger(credits) || Math.abs(credits) > limit) throw new ForbiddenException(`This role can adjust at most ${limit} credits per operation`);
      if (Math.abs(credits) > 1000) await this.consumeApproval(input.approvalId as string | undefined, actorId, 'credits.adjust.large');
      if (admin?.role === 'SUPPORT') {
        const since = new Date(); since.setUTCHours(0, 0, 0, 0);
        const total = await this._prisma.financialAdjustment.aggregate({ _sum: { credits: true }, where: { createdBy: actorId, type: 'ADMIN_CREDIT_ADJUSTMENT', createdAt: { gte: since } } });
        if (Math.abs((total._sum.credits || 0) + credits) > 500) throw new ForbiddenException('Support daily credit limit exceeded');
      }
      return this.adjustCredits(current.organizationId, credits, reason, actorId, input.reference as string | undefined);
    }
    if (action === 'approve' && config.model === 'marketplaceTemplate') return delegate.update({ where: { id }, data: { status: 'APPROVED' } });
    if (action === 'reject' && config.model === 'marketplaceTemplate') return delegate.update({ where: { id }, data: { status: 'REJECTED' } });
    throw new BadRequestException(`Action ${action} is not available for ${resource}`);
  }

  private async adjustCredits(organizationId: string, credits: number, reason: string, actorId: string, reference?: string) {
    if (!Number.isInteger(credits) || credits === 0 || Math.abs(credits) > 50000) throw new BadRequestException('Credits must be an integer between -50000 and 50000');
    const key = `admin-${randomUUID()}`;
    return this._prisma.$transaction(async (tx) => {
      const account = await tx.creditAccount.upsert({ where: { organizationId }, create: { organizationId }, update: {} });
      const lot = credits > 0 ? await tx.creditLot.create({ data: { organizationId, source: 'ADMIN_ADJUSTMENT', sourceReference: reference, totalCredits: credits, remainingCredits: credits, status: 'AVAILABLE' } }) : null;
      const transaction = await tx.creditTransaction.create({ data: { organizationId, lotId: lot?.id, type: 'ADMIN_ADJUSTMENT', credits, idempotencyKey: key, metadata: { reason, actorId, reference } } });
      if (credits < 0) await tx.creditAccount.update({ where: { id: account.id }, data: { debtCredits: { increment: Math.abs(credits) } } });
      await tx.financialAdjustment.create({ data: { organizationId, type: 'ADMIN_CREDIT_ADJUSTMENT', credits, reason, createdBy: actorId, reference } });
      return { account, lot, transaction };
    });
  }

  async analytics() {
    const [users, organizations, posts, jobs, errors, subscriptions, revenue] = await Promise.all([
      this._prisma.user.count({ where: { deletedAt: null } }),
      this._prisma.organization.count({ where: { deletedAt: null } }),
      this._prisma.post.count({ where: { deletedAt: null } }),
      this._prisma.generationJob.count({ where: { status: 'COMPLETED' } }),
      this._prisma.errors.count(),
      this._prisma.billingSubscription.count({ where: { status: 'ACTIVE' } }),
      this._prisma.billingInvoice.aggregate({ _sum: { amountCents: true }, where: { status: 'PAID' } }),
    ]);
    return { users, organizations, posts, completedJobs: jobs, errors, activeSubscriptions: subscriptions, revenueCents: revenue._sum.amountCents || 0 };
  }

  async health() {
    const checks = await Promise.all([
      this._prisma.$queryRaw`SELECT 1`.then(() => ({ status: 'UP' })).catch((error) => ({ status: 'DOWN', error: error?.message })),
      ioRedis.ping().then(() => ({ status: 'UP' })).catch((error) => ({ status: 'DOWN', error: error?.message })),
    ]);
    return { status: checks.every((check) => check.status === 'UP') ? 'UP' : 'DEGRADED', database: checks[0], redis: checks[1], temporal: process.env.DISABLE_TEMPORAL === 'true' ? { status: 'DISABLED' } : { status: 'CONFIGURED' }, checkedAt: new Date().toISOString() };
  }

  private async assertPlatformWritable(resource: string, input: Record<string, unknown>) {
    if (resource === 'settings' && String(input.key || '').startsWith('system.readonly_mode')) return;
    const setting = await this._prisma.platformSetting.findUnique({ where: { key: 'system.readonly_mode' } });
    if (setting?.value === true || (setting?.value && typeof setting.value === 'object' && (setting.value as any).enabled === true)) {
      throw new ForbiddenException('Platform is in read-only mode');
    }
  }

  private async consumeApproval(id: string | undefined, actorId: string, expectedAction: string) {
    if (!id) throw new ForbiddenException(`A second-admin approval is required for ${expectedAction}`);
    const approval = await this._prisma.adminApprovalRequest.findUnique({ where: { id } });
    if (!approval || approval.status !== 'APPROVED' || approval.expiresAt <= new Date() || approval.requestedBy === actorId || approval.action !== expectedAction) {
      throw new ForbiddenException('Approval is invalid, expired, self-approved, or for another action');
    }
    await this._prisma.adminApprovalRequest.update({ where: { id }, data: { status: 'EXECUTED', executedAt: new Date() } });
  }

  private pickWritable(config: ResourceConfig, input: Record<string, unknown>) {
    const blocked = new Set(config.blockedFields || []);
    const data: Record<string, any> = {};
    for (const field of config.fields) {
      if (READ_ONLY_FIELDS.has(field) || !Object.prototype.hasOwnProperty.call(input, field)) continue;
      if (blocked.has(field)) {
        throw new ForbiddenException(
          `Field '${field}' cannot be written through this generic endpoint; use the dedicated endpoint for this change.`
        );
      }
      data[field] = input[field];
    }
    return data;
  }

  private redact(row: any, sensitive?: string[]) {
    const hidden = new Set([...(sensitive || []), ...SECRETS]);
    return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, hidden.has(key) || (key === 'value' && row.isSecret) ? '[REDACTED]' : value]));
  }
}

// Used by AdminPermissionGuard to decide whether a generic-resource write
// must be treated as CRITICAL severity (forcing a fresh MFA step-up),
// independent of the static severity on the generic route's own decorator.
// See admin-permission.guard.ts — this is the fix for the gap where
// PATCH /admin/organizations/:id {status:"SUSPENDED"} (WARNING) achieved
// the same state change as POST /admin/organizations/:id/suspend
// (CRITICAL) without the step-up the dedicated endpoint requires.
export function resourceWriteIsCritical(config: ResourceConfig, body: Record<string, unknown> | undefined): boolean {
  if (config.criticalFields === '*') return true;
  if (!config.criticalFields || !body) return false;
  return config.criticalFields.some((field) => Object.prototype.hasOwnProperty.call(body, field));
}

export { RESOURCE_CONFIG };
export type { ResourceConfig };
