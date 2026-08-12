import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminSessionRepository {
  constructor(private _adminSession: PrismaRepository<'adminSession'>) {}

  create(params: {
    adminUserId: string;
    jti: string;
    ip?: string;
    userAgent?: string;
    expiresAt: Date;
    mfaVerifiedAt?: Date;
  }) {
    return this._adminSession.model.adminSession.create({
      data: {
        adminUserId: params.adminUserId,
        jti: params.jti,
        ip: params.ip,
        userAgent: params.userAgent,
        expiresAt: params.expiresAt,
        mfaVerifiedAt: params.mfaVerifiedAt,
      },
    });
  }

  getByJti(jti: string) {
    return this._adminSession.model.adminSession.findUnique({
      where: { jti },
    });
  }

  getById(id: string) {
    return this._adminSession.model.adminSession.findUnique({
      where: { id },
    });
  }

  touchMfaVerified(id: string) {
    return this._adminSession.model.adminSession.update({
      where: { id },
      data: { mfaVerifiedAt: new Date() },
    });
  }

  listActiveForAdminUser(adminUserId: string) {
    return this._adminSession.model.adminSession.findMany({
      where: {
        adminUserId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  revoke(id: string, revokedBy: string) {
    return this._adminSession.model.adminSession.update({
      where: { id },
      data: { revokedAt: new Date(), revokedBy },
    });
  }

  revokeByJti(jti: string, revokedBy: string) {
    return this._adminSession.model.adminSession.update({
      where: { jti },
      data: { revokedAt: new Date(), revokedBy },
    });
  }

  revokeAllForAdminUser(adminUserId: string, revokedBy: string) {
    return this._adminSession.model.adminSession.updateMany({
      where: { adminUserId, revokedAt: null },
      data: { revokedAt: new Date(), revokedBy },
    });
  }
}
