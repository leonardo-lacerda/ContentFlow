import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { User } from '@prisma/client';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { getCookieUrlFromDomain } from '@gitroom/helpers/subdomain/subdomain.management';
import { HttpForbiddenException } from '@gitroom/nestjs-libraries/services/exception.filter';
import { MastraService } from '@gitroom/nestjs-libraries/chat/mastra.service';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { applyImpersonationIdentity } from '@gitroom/backend/services/auth/admin/admin-impersonation.policy';
import { AdminAuthService } from '@gitroom/backend/services/auth/admin/admin-auth.service';

export const removeAuth = (res: Response) => {
  res.cookie('auth', '', {
    domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
    ...(!process.env.NOT_SECURED
      ? {
          secure: true,
          httpOnly: true,
          sameSite: 'lax',
        }
      : {}),
    expires: new Date(0),
    maxAge: -1,
  });
  res.header('logout', 'true');
};

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private _organizationService: OrganizationService,
    private _userService: UsersService,
    private _prisma: PrismaService,
    private _adminAuthService: AdminAuthService
  ) {}
  async use(req: Request, res: Response, next: NextFunction) {
    const auth = req.headers.auth || req.cookies.auth;
    if (!auth) {
      // After MFA enrollment, the admin surface is authenticated exclusively
      // by admin_auth/admin_refresh. Do not make every elevated request depend
      // on the regular 30-day user JWT as well. Bootstrap endpoints that need
      // the regular identity still validate it explicitly.
      if (req.path.startsWith('/admin')) return next();
      throw new HttpForbiddenException();
    }
    try {
      let user = AuthService.verifyJWT(auth, 'session') as User | null;
      const orgHeader = req.cookies.showorg || req.headers.showorg;

      if (!user) {
        throw new HttpForbiddenException();
      }

      const currentUser = await this._userService.getUserById(user.id);
      if (!currentUser || currentUser.authSessionVersion !== (user as any).authSessionVersion) {
        throw new HttpForbiddenException();
      }
      user = currentUser;

      if (!user.activated || user.deletedAt) {
        throw new HttpForbiddenException();
      }

      const impersonate = req.cookies.impersonate || req.headers.impersonate;
      const adminUser = await this._prisma.adminUser.findUnique({ where: { userId: user.id } });
      if (adminUser && adminUser.status === 'ACTIVE' && impersonate) {
        const activeImpersonation = await this._prisma.adminImpersonation.findFirst({
          where: { adminUserId: adminUser.id, endedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { startedAt: 'desc' },
        });
        const loadImpersonate = await this._organizationService.getUserOrg(
          impersonate
        );

        // Every prior check here (adminUser.status, the AdminImpersonation
        // row's own endedAt/expiresAt) only proves the impersonation grant
        // itself hasn't been explicitly ended or timed out - it says
        // nothing about whether the admin_auth session that STARTED this
        // impersonation is still valid. Revoking that admin session (stolen
        // admin_auth token, MFA reset, an explicit "log this admin out")
        // used to leave an already-active impersonation usable for up to
        // its own 60-minute expiry regardless. Re-run the same admin
        // session validation AdminSessionGuard does on every request so
        // revoking the admin session ends the impersonation immediately,
        // not just at its own timeout.
        const adminAuthToken = (req.cookies?.admin_auth || req.headers?.['admin-auth']) as string | undefined;
        const adminSession = adminAuthToken
          ? await this._adminAuthService.validateToken(
              adminAuthToken,
              req.ip,
              req.headers?.['user-agent']?.toString()
            )
          : null;

        if (
          loadImpersonate &&
          activeImpersonation &&
          adminSession &&
          adminSession.adminUser.id === adminUser.id &&
          activeImpersonation.targetUserId === loadImpersonate.user.id &&
          activeImpersonation.targetOrgId === loadImpersonate.organization.id
        ) {
          if (activeImpersonation.readOnly && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            throw new HttpForbiddenException();
          }
          user = applyImpersonationIdentity(loadImpersonate.user);
          delete user.password;
          (req as any).adminUser = { id: adminUser.id, user: { email: (await this._prisma.user.findUnique({ where: { id: adminUser.userId }, select: { email: true } }))?.email || 'unknown' } };

          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          req.user = user;

          // @ts-ignore
          loadImpersonate.organization.users =
            loadImpersonate.organization.users.filter(
              (f) => f.userId === user.id
            );
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          req.org = loadImpersonate.organization;
          (req as any).impersonating = true;
          (req as any).impersonationId = activeImpersonation.id;
          next();
          return;
        }
        await this._prisma.adminImpersonation.updateMany({
          where: {
            adminUserId: adminUser.id,
            endedAt: null,
            // Naturally expired, OR the admin session that started it is no
            // longer valid — both end the grant, not just the first.
            OR: [{ expiresAt: { lte: new Date() } }, ...(activeImpersonation && !adminSession ? [{ id: activeImpersonation.id }] : [])],
          },
          data: { endedAt: new Date() },
        });
        res.cookie('impersonate', '', { httpOnly: true, expires: new Date(0), maxAge: -1, ...(!process.env.NOT_SECURED ? { secure: true, sameSite: 'lax' as const } : {}) });
      }

      delete user.password;
      const organization = (
        await this._organizationService.getOrgsByUserId(user.id)
      ).filter((f) => !f.users[0].disabled);
      const setOrg =
        organization.find((org) => org.id === orgHeader) || organization[0];

      if (!organization.length || !setOrg || setOrg.status === 'SUSPENDED' || setOrg.deletedAt) {
        throw new HttpForbiddenException();
      }

      if (!setOrg.apiKey) {
        await this._organizationService.updateApiKey(setOrg.id);
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      req.user = user;

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      req.org = setOrg;
    } catch (err) {
      throw new HttpForbiddenException();
    }
    next();
  }
}
