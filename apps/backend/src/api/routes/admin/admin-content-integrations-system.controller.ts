import { BadRequestException, Body, Controller, Delete, Get, HttpException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { AdminSessionGuard } from '@gitroom/backend/services/auth/admin/admin-session.guard';
import { AdminPermissionGuard } from '@gitroom/backend/services/auth/admin/admin-permission.guard';
import { AdminPermission, GetAdminUserFromRequest } from '@gitroom/backend/services/auth/admin/admin-permission.decorator';
import { AdminUserWithAccount } from '@gitroom/backend/services/auth/admin/admin-auth.service';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';

@Controller('/admin/content')
@UseGuards(AdminSessionGuard, AdminPermissionGuard)
export class AdminContentController {
  constructor(private readonly _prisma: PrismaService) {}

  @Get('/posts')
  @AdminPermission('content.read', { resourceType: 'Post' })
  posts(@Query('organizationId') organizationId?: string, @Query('state') state?: string, @Query('search') search?: string, @Query('page') page = '0', @Query('limit') limit = '50') {
    const take = Math.min(200, Math.max(1, Number(limit) || 50));
    const pageNumber = Math.max(0, Number(page) || 0);
    const where: any = { deletedAt: null, organizationId, state: state as any };
    if (search?.trim()) where.OR = [{ id: { contains: search.trim(), mode: 'insensitive' } }, { title: { contains: search.trim(), mode: 'insensitive' } }, { content: { contains: search.trim(), mode: 'insensitive' } }];
    return Promise.all([this._prisma.post.findMany({ where, include: { organization: { select: { id: true, name: true } }, integration: { select: { id: true, name: true, providerIdentifier: true } } }, orderBy: { publishDate: 'desc' }, skip: pageNumber * take, take }), this._prisma.post.count({ where })]).then(([items, total]) => ({ items, total, page: pageNumber, limit: take, hasMore: (pageNumber + 1) * take < total }));
  }

  @Get('/posts/:id')
  @AdminPermission('content.read', { resourceType: 'Post' })
  post(@Param('id') id: string) { return this._prisma.post.findUnique({ where: { id }, include: { organization: true, integration: { select: { id: true, name: true, providerIdentifier: true, disabled: true } }, errors: true, comments: true } }); }

  @Get('/projects')
  @AdminPermission('content.read', { resourceType: 'ContentProject' })
  async projects(@Query('organizationId') organizationId?: string) {
    const where = organizationId ? { organizationId } : undefined;
    const [carouselProjects, creatives, shortVideos, emailCampaigns] = await Promise.all([
      this._prisma.carouselProject.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 500 }),
      this._prisma.adCreative.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 500 }),
      this._prisma.shortVideoProject.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 500 }),
      this._prisma.emailCampaign.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 500 }),
    ]);
    return { carouselProjects, creatives, shortVideos, emailCampaigns };
  }

  @Post('/posts/:id/cancel')
  @AdminPermission('content.moderate', { severity: 'WARNING', requireReason: true, resourceType: 'Post' })
  cancelPost(@Param('id') id: string) { return this._prisma.post.update({ where: { id }, data: { state: 'DRAFT', publishDate: new Date() } }); }

  @Delete('/posts/:id')
  @AdminPermission('content.moderate', { severity: 'CRITICAL', requireReason: true, resourceType: 'Post' })
  removePost(@Param('id') id: string) { return this._prisma.post.update({ where: { id }, data: { deletedAt: new Date(), state: 'DRAFT' } }); }

  @Get('/announcements')
  @AdminPermission('content.read', { resourceType: 'Announcement' })
  announcements() { return this._prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }); }

  @Post('/announcements')
  @AdminPermission('content.write', { severity: 'WARNING', requireReason: true, resourceType: 'Announcement' })
  createAnnouncement(@Body() body: { title?: string; description?: string; color?: 'INFO' | 'WARNING' | 'ERROR' }) { if (!body.title || !body.description) throw new BadRequestException('title and description are required'); return this._prisma.announcement.create({ data: { title: body.title, description: body.description, color: body.color || 'INFO' } }); }

  @Delete('/announcements/:id')
  @AdminPermission('content.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'Announcement' })
  deleteAnnouncement(@Param('id') id: string) { return this._prisma.announcement.delete({ where: { id } }); }

  @Get('/templates')
  @AdminPermission('content.read', { resourceType: 'MarketplaceTemplate' })
  templates(@Query('status') status?: string, @Query('category') category?: string) { return this._prisma.marketplaceTemplate.findMany({ where: { status: status as any, category }, orderBy: { updatedAt: 'desc' }, take: 500 }); }

  @Post('/templates/:id/approve')
  @AdminPermission('content.moderate', { severity: 'WARNING', requireReason: true, resourceType: 'MarketplaceTemplate' })
  approveTemplate(@Param('id') id: string) { return this._prisma.marketplaceTemplate.update({ where: { id }, data: { status: 'APPROVED' } }); }

  @Post('/templates/:id/reject')
  @AdminPermission('content.moderate', { severity: 'WARNING', requireReason: true, resourceType: 'MarketplaceTemplate' })
  rejectTemplate(@Param('id') id: string, @Body('reason') reason: string) { return this._prisma.marketplaceTemplate.update({ where: { id }, data: { status: 'REJECTED', metadata: { moderationReason: reason } } }); }

  @Post('/templates/:id/unpublish')
  @AdminPermission('content.moderate', { severity: 'CRITICAL', requireReason: true, resourceType: 'MarketplaceTemplate' })
  unpublishTemplate(@Param('id') id: string) { return this._prisma.marketplaceTemplate.update({ where: { id }, data: { status: 'ARCHIVED', deletedAt: new Date() } }); }
}

@Controller('/admin/integrations')
@UseGuards(AdminSessionGuard, AdminPermissionGuard)
export class AdminIntegrationsController {
  constructor(private readonly _prisma: PrismaService) {}

  @Get('/')
  @AdminPermission('integrations.read', { resourceType: 'Integration' })
  list(@Query('organizationId') organizationId?: string, @Query('provider') providerIdentifier?: string, @Query('disabled') disabled?: string) { return this._prisma.integration.findMany({ where: { organizationId, providerIdentifier, disabled: disabled === undefined ? undefined : disabled === 'true', deletedAt: null }, select: { id: true, organizationId: true, name: true, picture: true, providerIdentifier: true, type: true, disabled: true, tokenExpiration: true, profile: true, refreshNeeded: true, createdAt: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 1000 }); }

  @Get('/:id')
  @AdminPermission('integrations.read', { resourceType: 'Integration' })
  get(@Param('id') id: string) { return this._prisma.integration.findUnique({ where: { id }, select: { id: true, organizationId: true, name: true, providerIdentifier: true, type: true, disabled: true, tokenExpiration: true, refreshNeeded: true, customInstanceDetails: true, createdAt: true, updatedAt: true } }); }

  @Post('/:id/disable')
  @AdminPermission('integrations.write', { severity: 'WARNING', requireReason: true, resourceType: 'Integration' })
  disable(@Param('id') id: string) { return this._prisma.integration.update({ where: { id }, data: { disabled: true } , select: { id: true, disabled: true } }); }

  @Post('/:id/enable')
  @AdminPermission('integrations.write', { severity: 'WARNING', requireReason: true, resourceType: 'Integration' })
  enable(@Param('id') id: string) { return this._prisma.integration.update({ where: { id }, data: { disabled: false } , select: { id: true, disabled: true } }); }

  @Post('/:id/disconnect')
  @AdminPermission('integrations.disconnect', { severity: 'CRITICAL', requireReason: true, resourceType: 'Integration' })
  disconnect(@Param('id') id: string) { return this._prisma.integration.update({ where: { id }, data: { deletedAt: new Date(), disabled: true }, select: { id: true, deletedAt: true, disabled: true } }); }

  @Post('/:id/refresh')
  @AdminPermission('integrations.refresh', { severity: 'WARNING', requireReason: true, resourceType: 'Integration' })
  refresh(@Param('id') id: string) { return this._prisma.integration.update({ where: { id }, data: { refreshNeeded: true }, select: { id: true, refreshNeeded: true } }); }

  @Get('/webhooks/all')
  @AdminPermission('integrations.webhooks.read', { resourceType: 'Webhook' })
  webhooks(@Query('organizationId') organizationId?: string) { return this._prisma.webhook.findMany({ where: organizationId ? { organizationId } : undefined, select: { id: true, organizationId: true, url: true, events: true, status: true, failureCount: true, lastTriggeredAt: true, lastResponseStatus: true, createdAt: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 1000 }); }

  @Post('/webhooks/:id/retry')
  @AdminPermission('integrations.webhooks.write', { severity: 'WARNING', requireReason: true, resourceType: 'Webhook' })
  retryWebhook(@Param('id') id: string) { return this._prisma.webhook.update({ where: { id }, data: { status: 'ACTIVE', failureCount: 0 } }); }
}

@Controller('/admin/system')
@UseGuards(AdminSessionGuard, AdminPermissionGuard)
export class AdminSystemController {
  constructor(private readonly _prisma: PrismaService) {}

  @Get('/errors')
  @AdminPermission('system.errors.read', { resourceType: 'Errors' })
  errors(@Query('organizationId') organizationId?: string, @Query('platform') platform?: string) { return this._prisma.errors.findMany({ where: { organizationId, platform }, include: { organization: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 500 }); }

  @Get('/health')
  @AdminPermission('system.read', { resourceType: 'PlatformHealth' })
  async health() {
    const started = Date.now();
    const [database, redis] = await Promise.all([
      this._prisma.$queryRaw`SELECT 1`.then(() => ({ ok: true })).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'database unavailable' })),
      ioRedis.ping().then(() => ({ ok: true })).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'redis unavailable' })),
    ]);
    return { database, redis, temporal: { ok: Boolean(process.env.DISABLE_TEMPORAL !== 'true'), configured: process.env.DISABLE_TEMPORAL !== 'true' }, latencyMs: Date.now() - started };
  }

  @Get('/settings')
  @AdminPermission('system.read', { resourceType: 'PlatformSetting' })
  settings(@Query('category') category?: string) { return this._prisma.platformSetting.findMany({ where: { category }, orderBy: { key: 'asc' } }).then((rows) => rows.map((row) => row.isSecret ? { ...row, value: '[REDACTED]' } : row)); }

  @Patch('/settings/:key')
  @AdminPermission('system.settings.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'PlatformSetting' })
  async setting(@Param('key') key: string, @Body() body: { value?: unknown; category?: string; description?: string; isSecret?: boolean }, @GetAdminUserFromRequest() actor: AdminUserWithAccount) {
    if (body.value === undefined) throw new BadRequestException('value is required');
    const row = await this._prisma.platformSetting.upsert({ where: { key }, update: { value: body.value as any, category: body.category, description: body.description, isSecret: body.isSecret, updatedBy: actor.id }, create: { key, value: body.value as any, category: body.category || 'system', description: body.description, isSecret: !!body.isSecret, updatedBy: actor.id } });
    return row.isSecret ? { ...row, value: '[REDACTED]' } : row;
  }

  @Get('/flags')
  @AdminPermission('system.read', { resourceType: 'FeatureFlag' })
  flags() { return this._prisma.featureFlag.findMany({ orderBy: { key: 'asc' } }); }

  @Patch('/flags/:key')
  @AdminPermission('system.flags.write', { severity: 'WARNING', requireReason: true, resourceType: 'FeatureFlag' })
  flag(@Param('key') key: string, @Body() body: { enabled?: boolean; rolloutPercent?: number; targetOrgIds?: string[]; targetPlans?: string[]; description?: string }, @GetAdminUserFromRequest() actor: AdminUserWithAccount) { const rolloutPercent = body.rolloutPercent === undefined ? undefined : Math.min(100, Math.max(0, Math.trunc(body.rolloutPercent))); return this._prisma.featureFlag.upsert({ where: { key }, update: { enabled: body.enabled, rolloutPercent, targetOrgIds: body.targetOrgIds, targetPlans: body.targetPlans, description: body.description, updatedBy: actor.id }, create: { key, enabled: body.enabled || false, rolloutPercent: rolloutPercent || 0, targetOrgIds: body.targetOrgIds || [], targetPlans: body.targetPlans || [], description: body.description, updatedBy: actor.id } }); }

  @Get('/deployments')
  @AdminPermission('system.read', { resourceType: 'Deployment' })
  deployments() { return { version: process.env.APP_VERSION || process.env.npm_package_version || 'unknown', commit: process.env.GIT_COMMIT || 'unknown', environment: process.env.NODE_ENV || 'development', startedAt: process.env.APP_STARTED_AT || null }; }

  @Get('/cache')
  @AdminPermission('system.read', { resourceType: 'Cache' })
  async cache() {
    const [, keys] = await ioRedis.scan(0, 'MATCH', 'admin:*', 'COUNT', 100);
    return { namespace: 'admin:*', keys, count: keys.length };
  }

  @Post('/cache/invalidate')
  @AdminPermission('system.cache.write', { severity: 'WARNING', requireReason: true, resourceType: 'Cache' })
  async invalidateCache(@Body('key') key?: string) {
    if (!key || !key.startsWith('admin:')) throw new BadRequestException('Only admin:* cache keys can be invalidated');
    return { key, deleted: await ioRedis.del(key) };
  }
}
