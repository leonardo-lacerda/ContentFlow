import { Injectable } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AdminSessionService } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-session.service';
import { AdminUserService } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-user.service';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { createHash, randomBytes } from 'crypto';
import { AdminRefreshTokenService } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-refresh-token.service';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

const ADMIN_SESSION_TTL_MS = 60 * 60 * 1000; // 60 minutes, see PLANO-SISTEMA-ADMIN.md §4.1
const ADMIN_SESSION_CACHE_TTL_SECONDS = 30;
const ADMIN_REFRESH_TTL_MS = 8 * 60 * 60 * 1000;

// Derived from the repository's actual `include: { user: {...} }` query so this
// type can never drift from what getById() really returns.
export type AdminUserWithAccount = NonNullable<
  Awaited<ReturnType<AdminUserService['getById']>>
>;

export interface AdminAuthContext {
  adminUser: AdminUserWithAccount;
  sessionId: string;
  jti: string;
  mfaVerifiedAt: Date | null;
}

interface CachedSession {
  sessionId: string;
  adminUserId: string;
  expiresAt: string;
  revokedAt: string | null;
  mfaVerifiedAt: string | null;
  ip: string | null;
  userAgent: string | null;
}

// Deliberately separate from the regular 30-day user JWT (helpers/auth.service.ts):
// short-lived, carries a `jti` that is revalidated against AdminSession on every
// request, so revoking an admin has an immediate effect instead of waiting out
// a token's remaining lifetime.
@Injectable()
export class AdminAuthService {
  constructor(
    private _adminSessionService: AdminSessionService,
    private _adminUserService: AdminUserService,
    private _refreshTokenService: AdminRefreshTokenService,
    private _prisma: PrismaService
  ) {}

  private cacheKey(jti: string) {
    return `admin:session:${jti}`;
  }

  async issueSession(params: {
    adminUserId: string;
    ip?: string;
    userAgent?: string;
  }): Promise<{ token: string; refreshToken: string; expiresAt: Date }> {
    const jti = uuidv4();
    const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MS);
    const mfaVerifiedAt = new Date();

    await this._adminSessionService.create({
      adminUserId: params.adminUserId,
      jti,
      ip: params.ip,
      userAgent: params.userAgent,
      expiresAt,
      mfaVerifiedAt,
    });

    const token = sign({ sub: params.adminUserId, jti, typ: 'admin' }, this.jwtSecret(), {
      expiresIn: '60m',
    });
    const refreshToken = randomBytes(48).toString('base64url');
    await this._refreshTokenService.create({
      adminUserId: params.adminUserId,
      tokenHash: this.hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + ADMIN_REFRESH_TTL_MS),
      ip: params.ip,
      userAgent: params.userAgent,
    });

    return { token, refreshToken, expiresAt };
  }

  async validateToken(token: string, ip?: string, userAgent?: string): Promise<AdminAuthContext | null> {
    let payload: { sub: string; jti: string; typ: string };
    try {
      payload = verify(token, this.jwtSecret()) as typeof payload;
    } catch {
      return null;
    }
    if (payload?.typ !== 'admin' || !payload.jti) {
      return null;
    }

    const cached = await this.loadSession(payload.jti);
    if (!cached || cached.revokedAt) {
      return null;
    }
    if (!payload.sub || payload.sub !== cached.adminUserId) return null;
    const lockdown = await this._prisma.platformSetting.findUnique({ where: { key: 'system.admin_lockdown' } });
    if (lockdown?.value === true || (lockdown?.value && typeof lockdown.value === 'object' && (lockdown.value as any).enabled === true)) return null;
    if (new Date(cached.expiresAt).getTime() <= Date.now()) {
      return null;
    }
    if (cached.ip && ip && cached.ip !== ip) {
      await this.revokeSession(cached.sessionId, payload.jti, cached.adminUserId);
      return null;
    }
    if (cached.userAgent && userAgent && cached.userAgent !== userAgent) {
      await this.revokeSession(cached.sessionId, payload.jti, cached.adminUserId);
      return null;
    }

    const adminUser = await this._adminUserService.getById(cached.adminUserId);
    if (!adminUser || adminUser.status !== 'ACTIVE') {
      return null;
    }

    void this._adminUserService.touchLastAccess(adminUser.id);

    return {
      adminUser,
      sessionId: cached.sessionId,
      jti: payload.jti,
      mfaVerifiedAt: cached.mfaVerifiedAt ? new Date(cached.mfaVerifiedAt) : null,
    };
  }

  private async loadSession(jti: string): Promise<CachedSession | null> {
    const key = this.cacheKey(jti);
    const raw = await ioRedis.get(key);
    if (raw) {
      try {
        return JSON.parse(raw) as CachedSession;
      } catch {
        // corrupt cache entry: fall through and reload from the DB below
      }
    }

    const session = await this._adminSessionService.getByJti(jti);
    if (!session) {
      return null;
    }

    const cached: CachedSession = {
      sessionId: session.id,
      adminUserId: session.adminUserId,
      expiresAt: session.expiresAt.toISOString(),
      revokedAt: session.revokedAt ? session.revokedAt.toISOString() : null,
      mfaVerifiedAt: session.mfaVerifiedAt ? session.mfaVerifiedAt.toISOString() : null,
      ip: session.ip,
      userAgent: session.userAgent,
    };
    await ioRedis.set(key, JSON.stringify(cached), 'EX', ADMIN_SESSION_CACHE_TTL_SECONDS);
    return cached;
  }

  async recordStepUp(sessionId: string, jti: string) {
    await this._adminSessionService.touchMfaVerified(sessionId);
    await ioRedis.del(this.cacheKey(jti));
  }

  async revokeSession(id: string, jti: string, revokedBy: string) {
    await this._adminSessionService.revoke(id, revokedBy);
    await ioRedis.del(this.cacheKey(jti));
  }

  async revokeAllSessions(adminUserId: string, revokedBy: string) {
    const active = await this._adminSessionService.listActiveForAdminUser(adminUserId);
    await this._adminSessionService.revokeAllForAdminUser(adminUserId, revokedBy);
    await Promise.all(active.map((s) => ioRedis.del(this.cacheKey(s.jti))));
    await this._refreshTokenService.revokeAll(adminUserId);
  }

  async rotateRefreshToken(refreshToken: string, ip?: string, userAgent?: string) {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const existing = await this._refreshTokenService.get(tokenHash);
    if (!existing || existing.usedAt || existing.revokedAt || existing.expiresAt <= new Date()) {
      return null;
    }
    if ((existing.ip && ip && existing.ip !== ip) || (existing.userAgent && userAgent && existing.userAgent !== userAgent)) return null;
    const consumed = await this._refreshTokenService.consume(tokenHash);
    if (consumed.count !== 1) return null;
    return this.issueSession({ adminUserId: existing.adminUserId, ip, userAgent });
  }

  private hashRefreshToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private jwtSecret() {
    return process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET!;
  }

  // MFA brute-force guard: 5 failed codes within a rolling 15-minute window
  // locks the admin's MFA gate — see PLANO-SISTEMA-ADMIN.md §4.4.
  private lockoutKey(adminUserId: string) {
    return `admin:mfa:fail:${adminUserId}`;
  }

  async isMfaLockedOut(adminUserId: string, ip?: string): Promise<boolean> {
    const keys = [this.lockoutKey(adminUserId)];
    if (ip) keys.push(`admin:mfa:fail:ip:${ip}`);
    const counts = await Promise.all(keys.map((key) => ioRedis.get(key)));
    return counts.some((count) => !!count && parseInt(count, 10) >= 5);
  }

  async registerFailedMfaAttempt(adminUserId: string, ip?: string): Promise<void> {
    const keys = [this.lockoutKey(adminUserId)];
    if (ip) keys.push(`admin:mfa:fail:ip:${ip}`);
    await Promise.all(keys.map(async (key) => {
      const count = await ioRedis.incr(key);
      if (count === 1) await ioRedis.expire(key, 15 * 60);
    }));
  }

  async clearFailedMfaAttempts(adminUserId: string, ip?: string): Promise<void> {
    const keys = [this.lockoutKey(adminUserId)];
    if (ip) keys.push(`admin:mfa:fail:ip:${ip}`);
    await ioRedis.del(...keys);
  }
}
