import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AdminSessionGuard } from '@gitroom/backend/services/auth/admin/admin-session.guard';
import { AdminPermissionGuard } from '@gitroom/backend/services/auth/admin/admin-permission.guard';
import {
  AdminPermission,
  GetAdminUserFromRequest,
} from '@gitroom/backend/services/auth/admin/admin-permission.decorator';
import { AdminUserWithAccount } from '@gitroom/backend/services/auth/admin/admin-auth.service';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { randomBytes } from 'crypto';
import { Response } from 'express';

const SAFE_USER = {
  id: true,
  email: true,
  name: true,
  lastName: true,
  providerName: true,
  activated: true,
  timezone: true,
  createdAt: true,
  updatedAt: true,
  lastOnline: true,
  deletedAt: true,
};

const SAFE_ORG = {
  id: true,
  name: true,
  description: true,
  status: true,
  allowTrial: true,
  isTrailing: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

@Controller('/admin/users')
@UseGuards(AdminSessionGuard, AdminPermissionGuard)
export class AdminUsersController {
  constructor(private readonly _prisma: PrismaService) {}

  @Get('/')
  @AdminPermission('users.read', { resourceType: 'User' })
  async list(
    @Query('page') page = '0',
    @Query('limit') limit = '25',
    @Query('search') search?: string,
    @Query('activated') activated?: string,
    @Query('deleted') deleted?: string
  ) {
    const take = Math.min(100, Math.max(1, Number(limit) || 25));
    const skip = Math.max(0, Number(page) || 0) * take;
    const where: any = {};
    if (deleted === 'true') where.deletedAt = { not: null };
    else where.deletedAt = null;
    if (activated === 'true' || activated === 'false') where.activated = activated === 'true';
    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { id: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { name: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this._prisma.user.findMany({ where, select: SAFE_USER, orderBy: { createdAt: 'desc' }, skip, take }),
      this._prisma.user.count({ where }),
    ]);
    return { items, total, page: Math.floor(skip / take), limit: take, hasMore: skip + items.length < total };
  }

  @Get('/:id')
  @AdminPermission('users.read', { resourceType: 'User' })
  get(@Param('id') id: string) {
    return this._prisma.user.findUnique({
      where: { id },
      select: {
        ...SAFE_USER,
        organizations: {
          include: { organization: { select: { ...SAFE_ORG, subscription: true, billingSubscription: { include: { plan: true } }, creditAccount: true } } },
        },
        adminUser: { select: { id: true, role: true, status: true, mfaEnabled: true, lastAccessAt: true } },
      },
    });
  }

  @Patch('/:id')
  @AdminPermission('users.write', { severity: 'WARNING', requireReason: true, resourceType: 'User' })
  async update(
    @Param('id') id: string,
    @Body() body: { email?: string; name?: string; lastName?: string; timezone?: number; activated?: boolean; reason?: string }
  ) {
    const data: Record<string, unknown> = {};
    if (body.email !== undefined) data.email = body.email.trim().toLowerCase();
    if (body.name !== undefined) data.name = body.name;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.timezone !== undefined) data.timezone = Number(body.timezone);
    if (body.activated !== undefined) data.activated = !!body.activated;
    if (!Object.keys(data).length) throw new BadRequestException('No user changes supplied');
    return this._prisma.user.update({ where: { id }, data, select: SAFE_USER });
  }

  @Post('/:id/password-reset')
  @AdminPermission('users.password.reset', { severity: 'CRITICAL', requireReason: true, resourceType: 'User' })
  async forcePasswordReset(@Param('id') id: string) {
    const temporaryPassword = randomBytes(18).toString('base64url');
    const user = await this._prisma.user.update({
      where: { id },
      data: { password: AuthService.hashPassword(temporaryPassword), passwordResetRequired: true },
      select: { id: true, email: true },
    });
    return { user, temporaryPassword };
  }

  @Post('/:id/sessions/revoke')
  @AdminPermission('users.sessions.revoke', { severity: 'CRITICAL', requireReason: true, resourceType: 'User' })
  async revokeSessions(@Param('id') id: string) {
    await this._prisma.user.update({ where: { id }, data: { authSessionVersion: { increment: 1 } } });
    return { ok: true };
  }

  @Post('/:id/activate')
  @AdminPermission('users.write', { severity: 'WARNING', requireReason: true, resourceType: 'User' })
  activate(@Param('id') id: string) { return this._prisma.user.update({ where: { id }, data: { activated: true }, select: SAFE_USER }); }

  @Post('/:id/deactivate')
  @AdminPermission('users.write', { severity: 'WARNING', requireReason: true, resourceType: 'User' })
  deactivate(@Param('id') id: string) { return this._prisma.user.update({ where: { id }, data: { activated: false }, select: SAFE_USER }); }

  @Delete('/:id')
  @AdminPermission('users.delete', { severity: 'CRITICAL', requireReason: true, resourceType: 'User' })
  async softDelete(@Param('id') id: string, @GetAdminUserFromRequest() actor: AdminUserWithAccount) {
    if (id === actor.userId) throw new HttpException('An admin cannot delete their own account', 400);
    return this._prisma.user.update({ where: { id }, data: { deletedAt: new Date(), activated: false, authSessionVersion: { increment: 1 } }, select: SAFE_USER });
  }

  @Post('/:id/restore')
  @AdminPermission('users.delete', { severity: 'WARNING', requireReason: true, resourceType: 'User' })
  async restore(@Param('id') id: string) {
    const user = await this._prisma.user.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!user?.deletedAt || user.deletedAt < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) throw new HttpException('The 30-day restoration window has expired', 400);
    return this._prisma.user.update({ where: { id }, data: { deletedAt: null, activated: true }, select: SAFE_USER });
  }

  @Get('/:id/export')
  @AdminPermission('users.export', { severity: 'WARNING', resourceType: 'User' })
  async export(@Param('id') id: string, @Res({ passthrough: true }) response: Response) {
    const user = await this._prisma.user.findUnique({ where: { id }, select: { ...SAFE_USER, organizations: { include: { organization: { select: SAFE_ORG } } }, comments: true } });
    if (!user) throw new HttpException('User not found', 404);
    response.setHeader('Content-Disposition', `attachment; filename="user-${id}.json"`);
    return user;
  }
}

@Controller('/admin/organizations')
@UseGuards(AdminSessionGuard, AdminPermissionGuard)
export class AdminOrganizationsController {
  constructor(private readonly _prisma: PrismaService) {}

  @Get('/')
  @AdminPermission('orgs.read', { resourceType: 'Organization' })
  async list(@Query('page') page = '0', @Query('limit') limit = '25', @Query('search') search?: string, @Query('status') status?: string) {
    const take = Math.min(100, Math.max(1, Number(limit) || 25));
    const pageNumber = Math.max(0, Number(page) || 0);
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (search?.trim()) where.OR = [{ id: { contains: search.trim(), mode: 'insensitive' } }, { name: { contains: search.trim(), mode: 'insensitive' } }];
    const [items, total] = await Promise.all([
      this._prisma.organization.findMany({ where, select: { ...SAFE_ORG, subscription: true, billingSubscription: { include: { plan: true } }, creditAccount: true, _count: { select: { users: true, post: true, generationJobs: true } } }, orderBy: { createdAt: 'desc' }, skip: pageNumber * take, take }),
      this._prisma.organization.count({ where }),
    ]);
    return { items, total, page: pageNumber, limit: take, hasMore: (pageNumber + 1) * take < total };
  }

  @Get('/:id')
  @AdminPermission('orgs.read', { resourceType: 'Organization' })
  get(@Param('id') id: string) {
    return this._prisma.organization.findUnique({ where: { id }, include: { users: { include: { user: { select: SAFE_USER } } }, subscription: true, billingSubscription: { include: { plan: true } }, billingInvoices: { orderBy: { createdAt: 'desc' }, take: 100 }, creditAccount: true, creditLots: { orderBy: { createdAt: 'desc' }, take: 100 }, Integration: { select: { id: true, name: true, providerIdentifier: true, disabled: true, tokenExpiration: true, createdAt: true } } } });
  }

  @Post('/')
  @AdminPermission('orgs.write', { severity: 'WARNING', requireReason: true, resourceType: 'Organization' })
  create(@Body() body: { name?: string; description?: string }) {
    if (!body.name?.trim()) throw new BadRequestException('Organization name is required');
    return this._prisma.organization.create({ data: { name: body.name.trim(), description: body.description?.trim() || undefined } , select: SAFE_ORG });
  }

  @Patch('/:id')
  @AdminPermission('orgs.write', { severity: 'WARNING', requireReason: true, resourceType: 'Organization' })
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string; status?: string; allowTrial?: boolean }) {
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.description !== undefined) data.description = body.description;
    if (body.status !== undefined) data.status = body.status;
    if (body.allowTrial !== undefined) data.allowTrial = !!body.allowTrial;
    if (!Object.keys(data).length) throw new BadRequestException('No organization changes supplied');
    return this._prisma.organization.update({ where: { id }, data, select: SAFE_ORG });
  }

  @Post('/:id/suspend')
  @AdminPermission('orgs.suspend', { severity: 'CRITICAL', requireReason: true, resourceType: 'Organization' })
  suspend(@Param('id') id: string) { return this._prisma.organization.update({ where: { id }, data: { status: 'SUSPENDED' }, select: SAFE_ORG }); }

  @Post('/:id/unsuspend')
  @AdminPermission('orgs.suspend', { severity: 'WARNING', requireReason: true, resourceType: 'Organization' })
  restoreSuspended(@Param('id') id: string) { return this._prisma.organization.update({ where: { id }, data: { status: 'ACTIVE' }, select: SAFE_ORG }); }

  @Post('/:id/trial')
  @AdminPermission('orgs.billing.write', { severity: 'WARNING', requireReason: true, resourceType: 'Organization' })
  grantTrial(@Param('id') id: string) { return this._prisma.organization.update({ where: { id }, data: { allowTrial: true, isTrailing: true }, select: SAFE_ORG }); }

  @Post('/:id/api-key/rotate')
  @AdminPermission('orgs.api-key.rotate', { severity: 'CRITICAL', requireReason: true, resourceType: 'Organization' })
  async rotateApiKey(@Param('id') id: string) {
    const apiKey = makeApiKey();
    await this._prisma.organization.update({
      where: { id },
      data: {
        apiKey: AuthService.secureEncryption(apiKey),
        apiKeyHash: AuthService.hashApiKey(apiKey),
      },
    });
    return { rotated: true, apiKey };
  }

  @Post('/:id/transfer-ownership')
  @AdminPermission('orgs.transfer', { severity: 'CRITICAL', requireReason: true, resourceType: 'Organization' })
  async transferOwnership(@Param('id') organizationId: string, @Body('userId') userId: string) {
    if (!userId) throw new BadRequestException('userId is required');
    const membership = await this._prisma.userOrganization.findUnique({ where: { userId_organizationId: { userId, organizationId } } });
    if (!membership) throw new HttpException('Target user is not an organization member', 404);
    return this._prisma.$transaction(async (transaction) => {
      await transaction.userOrganization.updateMany({ where: { organizationId, role: 'SUPERADMIN' }, data: { role: 'ADMIN' } });
      return transaction.userOrganization.update({ where: { userId_organizationId: { userId, organizationId } }, data: { role: 'SUPERADMIN', disabled: false } });
    });
  }

  @Delete('/:id')
  @AdminPermission('orgs.delete', { severity: 'CRITICAL', requireReason: true, resourceType: 'Organization' })
  softDelete(@Param('id') id: string) { return this._prisma.organization.update({ where: { id }, data: { deletedAt: new Date(), status: 'DELETED' }, select: SAFE_ORG }); }

  @Post('/:id/restore')
  @AdminPermission('orgs.delete', { severity: 'WARNING', requireReason: true, resourceType: 'Organization' })
  async restore(@Param('id') id: string) {
    const organization = await this._prisma.organization.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!organization?.deletedAt || organization.deletedAt < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) throw new HttpException('The 30-day restoration window has expired', 400);
    return this._prisma.organization.update({ where: { id }, data: { deletedAt: null, status: 'ACTIVE' }, select: SAFE_ORG });
  }

  @Post('/:id/cleanup')
  @AdminPermission('orgs.cleanup', { severity: 'CRITICAL', requireReason: true, resourceType: 'Organization' })
  async cleanup(@Param('id') organizationId: string) {
    const [posts, media, integrations] = await this._prisma.$transaction([
      this._prisma.post.updateMany({ where: { organizationId, deletedAt: null }, data: { deletedAt: new Date(), state: 'DRAFT' } }),
      this._prisma.media.updateMany({ where: { organizationId, deletedAt: null }, data: { deletedAt: new Date() } }),
      this._prisma.integration.updateMany({ where: { organizationId, deletedAt: null }, data: { deletedAt: new Date(), disabled: true } }),
    ]);
    return { organizationId, posts: posts.count, media: media.count, integrations: integrations.count };
  }

  @Get('/:id/members')
  @AdminPermission('orgs.members.read', { resourceType: 'Organization' })
  members(@Param('id') id: string) { return this._prisma.userOrganization.findMany({ where: { organizationId: id }, include: { user: { select: SAFE_USER } }, orderBy: { createdAt: 'asc' } }); }

  @Post('/:id/members')
  @AdminPermission('orgs.members.write', { severity: 'WARNING', requireReason: true, resourceType: 'Organization' })
  async addMember(@Param('id') organizationId: string, @Body() body: { userId?: string; email?: string; role?: 'USER' | 'ADMIN' | 'SUPERADMIN' }) {
    const user = body.userId ? await this._prisma.user.findUnique({ where: { id: body.userId } }) : body.email ? await this._prisma.user.findFirst({ where: { email: body.email } }) : null;
    if (!user) throw new HttpException('User not found', 404);
    return this._prisma.userOrganization.upsert({ where: { userId_organizationId: { userId: user.id, organizationId } }, update: { disabled: false, role: body.role || 'USER' }, create: { userId: user.id, organizationId, role: body.role || 'USER' } });
  }

  @Patch('/:id/members/:userId')
  @AdminPermission('orgs.members.write', { severity: 'WARNING', requireReason: true, resourceType: 'Organization' })
  updateMember(@Param('id') organizationId: string, @Param('userId') userId: string, @Body() body: { role?: 'USER' | 'ADMIN' | 'SUPERADMIN'; disabled?: boolean }) { return this._prisma.userOrganization.update({ where: { userId_organizationId: { userId, organizationId } }, data: { role: body.role, disabled: body.disabled } }); }

  @Delete('/:id/members/:userId')
  @AdminPermission('orgs.members.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'Organization' })
  removeMember(@Param('id') organizationId: string, @Param('userId') userId: string) { return this._prisma.userOrganization.update({ where: { userId_organizationId: { userId, organizationId } }, data: { disabled: true } }); }
}

function makeApiKey() { return randomBytes(32).toString('base64url'); }
