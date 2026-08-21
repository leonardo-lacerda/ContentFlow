import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { RealIP } from '@gitroom/nestjs-libraries/user/real.ip';
import { AdminRoleType, User } from '@prisma/client';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';
import { ApiTags } from '@nestjs/swagger';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { UserAgent } from '@gitroom/nestjs-libraries/user/user.agent';
import { AdminAlertService } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-alert.service';
import { getCookieUrlFromDomain } from '@gitroom/helpers/subdomain/subdomain.management';
import { AdminUserService } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-user.service';
import { AdminSessionService } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-session.service';
import { TotpService } from '@gitroom/nestjs-libraries/security/totp.service';
import {
  AdminAuthService,
  AdminUserWithAccount,
} from '@gitroom/backend/services/auth/admin/admin-auth.service';
import { AdminSessionGuard } from '@gitroom/backend/services/auth/admin/admin-session.guard';
import { AdminPermissionGuard } from '@gitroom/backend/services/auth/admin/admin-permission.guard';
import {
  AdminPermission,
  GetAdminSessionFromRequest,
  GetAdminUserFromRequest,
  AdminRequestSession,
} from '@gitroom/backend/services/auth/admin/admin-permission.decorator';

const TOTP_ISSUER = 'ContentFlow Admin';

function setAdminCookie(response: Response, token: string, expiresAt: Date) {
  response.cookie('admin_auth', token, {
    domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
    httpOnly: true,
    ...(!process.env.NOT_SECURED ? { secure: true, sameSite: 'lax' as const } : {}),
    expires: expiresAt,
  });
}

function clearAdminCookie(response: Response) {
  response.cookie('admin_auth', '', {
    domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
    httpOnly: true,
    ...(!process.env.NOT_SECURED ? { secure: true, sameSite: 'lax' as const } : {}),
    expires: new Date(0),
    maxAge: -1,
  });
  response.cookie('admin_refresh', '', {
    domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
    httpOnly: true,
    ...(!process.env.NOT_SECURED ? { secure: true, sameSite: 'lax' as const } : {}),
    expires: new Date(0),
    maxAge: -1,
  });
}

function setRefreshCookie(response: Response, token: string, expiresAt: Date) {
  response.cookie('admin_refresh', token, {
    domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
    httpOnly: true,
    ...(!process.env.NOT_SECURED ? { secure: true, sameSite: 'lax' as const } : {}),
    expires: expiresAt,
  });
}

function decryptMfaSecret(value: string): string {
  try {
    return AuthService.secureDecryption(value);
  } catch {
    // Keep compatibility with the short window where pending secrets could
    // have been stored without encryption.
    return value;
  }
}

// Step-up flow: a regular logged-in user with an AdminUser record proves
// possession of their TOTP device here to obtain the short-lived, revocable
// `admin_auth` session used by every other /admin/* route. See
// docs/admin/PLANO-SISTEMA-ADMIN.md §4.1-4.2.
@ApiTags('Admin Security')
@Controller('/admin/auth')
export class AdminSecurityController {
  constructor(
    private _adminUserService: AdminUserService,
    private _adminSessionService: AdminSessionService,
    private _adminAuthService: AdminAuthService,
    private _totpService: TotpService,
    private _prisma: PrismaService,
    private _emailService: EmailService,
    private _adminAlertService: AdminAlertService
  ) {}

  @Get('/status')
  async status(@GetUserFromRequest() user: User | undefined) {
    if (!user) return { isAdmin: false };
    const adminUser = await this._adminUserService.getByUserId(user.id);
    if (!adminUser) {
      return { isAdmin: false };
    }
    return {
      isAdmin: true,
      role: adminUser.role,
      status: adminUser.status,
      mfaEnabled: adminUser.mfaEnabled,
      permissions: adminUser.permissions || undefined,
    };
  }

  @Post('/mfa/enroll')
  async enroll(@GetUserFromRequest() user: User) {
    if (!user) throw new HttpException('Regular authentication is required to enroll admin MFA', 401);
    const adminUser = await this._adminUserService.getByUserId(user.id);
    if (!adminUser) {
      throw new HttpException('Not an admin', 403);
    }
    if (adminUser.mfaEnabled) {
      throw new HttpException(
        'MFA is already enabled; contact an OWNER to reset it',
        400
      );
    }

    const secret = this._totpService.generateSecret();
    await this._adminUserService.updateMfaPending(adminUser.id, secret);

    const otpauthUrl = this._totpService.buildOtpAuthUrl({
      secret,
      accountName: user.email,
      issuer: TOTP_ISSUER,
    });
    const qrDataUrl = await this._totpService.generateQrDataUrl(otpauthUrl);

    return { secret, otpauthUrl, qrDataUrl };
  }

  @Post('/mfa/confirm')
  async confirm(@GetUserFromRequest() user: User, @Body('code') code: string) {
    if (!user) throw new HttpException('Regular authentication is required to confirm admin MFA', 401);
    const adminUser = await this._adminUserService.getByUserId(user.id);
    if (!adminUser || !adminUser.mfaSecret || adminUser.mfaEnabled) {
      throw new HttpException('No pending MFA enrollment', 400);
    }
    const mfaSecret = decryptMfaSecret(adminUser.mfaSecret);
    if (!this._totpService.verifyToken(mfaSecret, code)) {
      throw new HttpException('Invalid code', 400);
    }

    const backupCodes = this._totpService.generateBackupCodes();
    const hashes = backupCodes.map((c) => this._totpService.hashBackupCode(c));
    await this._adminUserService.enableMfa(adminUser.id, hashes);

    return { backupCodes };
  }

  @Post('/mfa/verify')
  async verify(
    @GetUserFromRequest() user: User,
    @Body('code') code: string,
    @RealIP() ip: string,
    @UserAgent() userAgent: string,
    @Res({ passthrough: true }) response: Response
  ) {
    if (!user) throw new HttpException('Regular authentication is required to verify admin MFA', 401);
    const adminUser = await this._adminUserService.getByUserId(user.id);
    if (!adminUser) {
      throw new HttpException('Admin MFA is not set up', 403);
    }
    if (adminUser.status !== 'ACTIVE') {
      throw new HttpException('Admin access suspended', 403);
    }
    // MFA is mandatory for every admin role, including READONLY. This used
    // to be skippable for READONLY admins who hadn't enrolled MFA yet
    // (`mfaOptional`), which meant taking over that admin's regular USER
    // session (e.g. XSS, a stolen cookie) was enough on its own to obtain a
    // full admin session with no second factor at all — for a role that
    // already has broad read access (audit logs, billing, user PII,
    // security alerts). MFA enrollment (`/mfa/enroll` + `/mfa/confirm`)
    // only requires the regular user session, not an admin session, so
    // every role can and must complete it before their first `/mfa/verify`.
    if (!adminUser.mfaEnabled) {
      throw new HttpException('Admin MFA is not set up', 403);
    }
    if (await this._adminAuthService.isMfaLockedOut(adminUser.id, ip)) {
      throw new HttpException(
        'Too many failed attempts. Try again in a few minutes.',
        429
      );
    }

    const ok = await this.verifyCodeOrBackup(adminUser, code);
    if (!ok) {
      await this._adminAuthService.registerFailedMfaAttempt(adminUser.id, ip);
      void this._adminAlertService.emit({ type: 'ADMIN_MFA_FAILURE', severity: 'CRITICAL', title: 'Falha de MFA administrativo', message: `Falha de MFA para ${adminUser.user.email} a partir de ${ip || 'IP desconhecido'}`, adminUserId: adminUser.id });
      throw new HttpException('Invalid code', 400);
    }
    await this._adminAuthService.clearFailedMfaAttempts(adminUser.id, ip);

    const { token, refreshToken, expiresAt } = await this._adminAuthService.issueSession({
      adminUserId: adminUser.id,
      ip,
      userAgent,
    });
    setAdminCookie(response, token, expiresAt);
    setRefreshCookie(response, refreshToken, new Date(Date.now() + 8 * 60 * 60 * 1000));

    return { expiresAt };
  }

  @Post('/refresh')
  async refresh(
    @RealIP() ip: string,
    @UserAgent() userAgent: string,
    @Body('refreshToken') bodyRefreshToken: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const refreshToken = bodyRefreshToken || (response.req as any).cookies?.admin_refresh;
    if (!refreshToken) throw new HttpException('Invalid refresh token', 401);
    const rotated = await this._adminAuthService.rotateRefreshToken(refreshToken, ip, userAgent);
    if (!rotated) throw new HttpException('Invalid refresh token', 401);
    setAdminCookie(response, rotated.token, rotated.expiresAt);
    setRefreshCookie(response, rotated.refreshToken, new Date(Date.now() + 8 * 60 * 60 * 1000));
    return { expiresAt: rotated.expiresAt };
  }

  @Post('/step-up')
  @UseGuards(AdminSessionGuard, AdminPermissionGuard)
  @AdminPermission('security.session.self.stepup')
  async stepUp(
    @GetAdminUserFromRequest() adminUser: AdminUserWithAccount,
    @GetAdminSessionFromRequest() session: AdminRequestSession,
    @Body('code') code: string
  ) {
    if (await this._adminAuthService.isMfaLockedOut(adminUser.id)) {
      throw new HttpException(
        'Too many failed attempts. Try again in a few minutes.',
        429
      );
    }

    const ok = await this.verifyCodeOrBackup(adminUser, code);
    if (!ok) {
      await this._adminAuthService.registerFailedMfaAttempt(adminUser.id);
      void this._adminAlertService.emit({ type: 'ADMIN_STEP_UP_FAILURE', severity: 'CRITICAL', title: 'Falha de step-up administrativo', message: `Falha de revalidação MFA para ${adminUser.user.email}`, adminUserId: adminUser.id });
      throw new HttpException('Invalid code', 400);
    }
    await this._adminAuthService.clearFailedMfaAttempts(adminUser.id);
    await this._adminAuthService.recordStepUp(session.id, session.jti);

    return { ok: true };
  }

  @Get('/sessions')
  @UseGuards(AdminSessionGuard, AdminPermissionGuard)
  @AdminPermission('security.session.self.read')
  async sessions(@GetAdminUserFromRequest() adminUser: AdminUserWithAccount, @GetAdminSessionFromRequest() session: AdminRequestSession) {
    const active = await this._adminSessionService.listActiveForAdminUser(adminUser.id);
    return active.map((s) => ({
      id: s.id,
      ip: s.ip,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      mfaVerifiedAt: s.mfaVerifiedAt,
      current: s.id === session.id,
    }));
  }

  @Post('/sessions/:id/revoke')
  @UseGuards(AdminSessionGuard, AdminPermissionGuard)
  @AdminPermission('security.session.self.revoke', { severity: 'WARNING', resourceType: 'AdminSession' })
  async revokeSession(
    @GetAdminUserFromRequest() adminUser: AdminUserWithAccount,
    @Param('id') id: string
  ) {
    const target = await this._adminSessionService.getById(id);
    // Ownership check: an admin can only revoke their own sessions here.
    // Revoking another admin's session is a Fase 2+ "gestão de admins" action.
    if (!target || target.adminUserId !== adminUser.id) {
      throw new HttpException('Session not found', 404);
    }
    await this._adminAuthService.revokeSession(target.id, target.jti, adminUser.id);
    return { ok: true };
  }

  @Post('/sessions/revoke-all')
  @UseGuards(AdminSessionGuard, AdminPermissionGuard)
  @AdminPermission('security.session.self.revoke', { severity: 'WARNING', resourceType: 'AdminSession' })
  async revokeAll(
    @GetAdminUserFromRequest() adminUser: AdminUserWithAccount,
    @Res({ passthrough: true }) response: Response
  ) {
    await this._adminAuthService.revokeAllSessions(adminUser.id, adminUser.id);
    clearAdminCookie(response);
    return { ok: true };
  }

  @Post('/logout')
  @UseGuards(AdminSessionGuard, AdminPermissionGuard)
  @AdminPermission('security.session.self.revoke')
  async logout(
    @GetAdminUserFromRequest() adminUser: AdminUserWithAccount,
    @GetAdminSessionFromRequest() session: AdminRequestSession,
    @Res({ passthrough: true }) response: Response
  ) {
    await this._adminAuthService.revokeSession(session.id, session.jti, adminUser.id);
    clearAdminCookie(response);
    return { ok: true };
  }

  @Get('/admins')
  @UseGuards(AdminSessionGuard, AdminPermissionGuard)
  @AdminPermission('admins.read')
  async listAdmins() {
    return this._prisma.adminUser.findMany({
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Post('/admins')
  @UseGuards(AdminSessionGuard, AdminPermissionGuard)
  @AdminPermission('admins.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'AdminUser' })
  async createAdmin(
    @Body() body: { email?: string; role?: AdminRoleType; reason?: string },
    @GetAdminUserFromRequest() actor: AdminUserWithAccount
  ) {
    if (!body.email || !body.role) throw new HttpException('email and role are required', 400);
    const user = await this._prisma.user.findFirst({ where: { email: body.email } });
    if (!user) throw new HttpException('User not found', 404);
    const exists = await this._prisma.adminUser.findUnique({ where: { userId: user.id } });
    if (exists) throw new HttpException('User is already an admin', 409);
    return this._prisma.adminUser.create({ data: { userId: user.id, role: body.role, createdBy: actor.id } });
  }

  @Patch('/admins/:id')
  @UseGuards(AdminSessionGuard, AdminPermissionGuard)
  @AdminPermission('admins.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'AdminUser' })
  async updateAdmin(
    @Param('id') id: string,
    @Body() body: { role?: AdminRoleType; status?: 'ACTIVE' | 'SUSPENDED'; permissions?: Record<string, boolean> | null; reason?: string },
    @GetAdminUserFromRequest() actor: AdminUserWithAccount
  ) {
    if (id === actor.id && body.status === 'SUSPENDED') throw new HttpException('You cannot suspend your own admin account', 400);
    const data: Record<string, unknown> = {};
    if (body.role) data.role = body.role;
    if (body.status) data.status = body.status;
    if (body.permissions !== undefined) data.permissions = body.permissions;
    if (!Object.keys(data).length) throw new HttpException('No changes supplied', 400);
    const updated = await this._prisma.adminUser.update({ where: { id }, data: data as any });
    if (body.status === 'SUSPENDED') await this._adminAuthService.revokeAllSessions(id, actor.id);
    return updated;
  }

  @Post('/admins/:id/mfa/reset')
  @UseGuards(AdminSessionGuard, AdminPermissionGuard)
  @AdminPermission('admins.mfa.reset', { severity: 'CRITICAL', requireReason: true, resourceType: 'AdminUser' })
  async resetAdminMfa(@Param('id') id: string, @GetAdminUserFromRequest() actor: AdminUserWithAccount) {
    await this._adminUserService.disableMfa(id);
    await this._adminAuthService.revokeAllSessions(id, actor.id);
    return { ok: true };
  }

  @Get('/approvals')
  @UseGuards(AdminSessionGuard, AdminPermissionGuard)
  @AdminPermission('security.approvals.read')
  approvals() { return this._prisma.adminApprovalRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }); }

  @Post('/approvals')
  @UseGuards(AdminSessionGuard, AdminPermissionGuard)
  @AdminPermission('security.approvals.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'AdminApprovalRequest' })
  createApproval(@Body() body: { action?: string; payload?: unknown; reason?: string }, @GetAdminUserFromRequest() actor: AdminUserWithAccount) {
    if (!body.action || !body.reason) throw new HttpException('action and reason are required', 400);
    return this._prisma.adminApprovalRequest.create({ data: { requestedBy: actor.id, action: body.action, payload: (body.payload || {}) as any, reason: body.reason, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
  }

  @Post('/approvals/:id/approve')
  @UseGuards(AdminSessionGuard, AdminPermissionGuard)
  @AdminPermission('security.approvals.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'AdminApprovalRequest' })
  async approveApproval(@Param('id') id: string, @GetAdminUserFromRequest() actor: AdminUserWithAccount, @Body('reason') reason: string) {
    const approval = await this._prisma.adminApprovalRequest.findUnique({ where: { id } });
    if (!approval || approval.status !== 'PENDING' || approval.expiresAt <= new Date()) throw new HttpException('Approval is unavailable', 409);
    if (approval.requestedBy === actor.id) throw new HttpException('A second admin must approve this action', 403);
    return this._prisma.adminApprovalRequest.update({ where: { id }, data: { status: 'APPROVED', approvedBy: actor.id, approvedAt: new Date() } });
  }

  @Post('/approvals/:id/reject')
  @UseGuards(AdminSessionGuard, AdminPermissionGuard)
  @AdminPermission('security.approvals.write', { severity: 'CRITICAL', requireReason: true, resourceType: 'AdminApprovalRequest' })
  rejectApproval(@Param('id') id: string, @Body('reason') reason: string) {
    return this._prisma.adminApprovalRequest.update({ where: { id }, data: { status: 'REJECTED', rejectReason: reason } });
  }

  @Post('/impersonation/start')
  @UseGuards(AdminSessionGuard, AdminPermissionGuard)
  @AdminPermission('users.impersonate', { severity: 'CRITICAL', requireReason: true, resourceType: 'AdminImpersonation' })
  async startImpersonation(
    @Body() body: { targetUserId?: string; targetOrgId?: string; reason?: string; ticketRef?: string; readOnly?: boolean },
    @GetAdminUserFromRequest() actor: AdminUserWithAccount,
    @Res({ passthrough: true }) response: Response
  ) {
    if (!body.targetUserId || !body.targetOrgId || !body.reason) throw new HttpException('targetUserId, targetOrgId and reason are required', 400);
    const membership = await this._prisma.userOrganization.findUnique({ where: { userId_organizationId: { userId: body.targetUserId, organizationId: body.targetOrgId } } });
    if (!membership) throw new HttpException('Target user is not a member of the organization', 404);
    const active = await this._prisma.adminImpersonation.findFirst({ where: { adminUserId: actor.id, endedAt: null, expiresAt: { gt: new Date() } } });
    if (active) throw new HttpException('An impersonation is already active', 409);
    const impersonation = await this._prisma.adminImpersonation.create({ data: { adminUserId: actor.id, targetUserId: body.targetUserId, targetOrgId: body.targetOrgId, reason: body.reason, ticketRef: body.ticketRef, readOnly: body.readOnly !== false, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    const target = await this._prisma.user.findUnique({ where: { id: body.targetUserId }, select: { email: true } });
    if (target?.email) void this._emailService.sendEmail(target.email, 'ContentFlow support access started', `A ContentFlow administrator started a ${impersonation.readOnly ? 'read-only ' : ''}support session for your account. Reason: ${body.reason}. It expires at ${impersonation.expiresAt.toISOString()}.`, 'top');
    response.cookie('impersonate', membership.id, { httpOnly: true, ...(!process.env.NOT_SECURED ? { secure: true, sameSite: 'lax' as const } : {}), expires: impersonation.expiresAt });
    return { id: impersonation.id, expiresAt: impersonation.expiresAt, readOnly: impersonation.readOnly };
  }

  @Post('/impersonation/end')
  @UseGuards(AdminSessionGuard, AdminPermissionGuard)
  @AdminPermission('users.impersonate.end', { severity: 'WARNING', requireReason: true, resourceType: 'AdminImpersonation' })
  async endImpersonation(@GetAdminUserFromRequest() actor: AdminUserWithAccount, @Res({ passthrough: true }) response: Response) {
    await this._prisma.adminImpersonation.updateMany({ where: { adminUserId: actor.id, endedAt: null }, data: { endedAt: new Date() } });
    response.cookie('impersonate', '', { httpOnly: true, expires: new Date(0), maxAge: -1, ...(!process.env.NOT_SECURED ? { secure: true, sameSite: 'lax' as const } : {}) });
    return { ok: true };
  }

  private async verifyCodeOrBackup(
    adminUser: { id: string; mfaSecret: string | null; mfaBackupCodes: unknown },
    code: string
  ): Promise<boolean> {
    if (!code) return false;
    const mfaSecret = adminUser.mfaSecret
      ? decryptMfaSecret(adminUser.mfaSecret)
      : null;
    if (mfaSecret && this._totpService.verifyToken(mfaSecret, code)) {
      return true;
    }

    const hashes = Array.isArray(adminUser.mfaBackupCodes)
      ? (adminUser.mfaBackupCodes as string[])
      : [];
    const idx = this._totpService.verifyBackupCode(code, hashes);
    if (idx === -1) return false;

    const remaining = hashes.filter((_, i) => i !== idx);
    await this._adminUserService.consumeBackupCode(adminUser.id, remaining);
    return true;
  }
}
