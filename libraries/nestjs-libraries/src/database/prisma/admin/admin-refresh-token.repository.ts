import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class AdminRefreshTokenRepository {
  constructor(private _refreshToken: PrismaRepository<'adminRefreshToken'>) {}

  create(data: { adminUserId: string; tokenHash: string; expiresAt: Date; ip?: string; userAgent?: string }) {
    return this._refreshToken.model.adminRefreshToken.create({ data });
  }

  consume(tokenHash: string) {
    return this._refreshToken.model.adminRefreshToken.updateMany({
      where: {
        tokenHash,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });
  }

  get(tokenHash: string) {
    return this._refreshToken.model.adminRefreshToken.findUnique({
      where: { tokenHash },
    });
  }

  revokeAll(adminUserId: string) {
    return this._refreshToken.model.adminRefreshToken.updateMany({
      where: { adminUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
