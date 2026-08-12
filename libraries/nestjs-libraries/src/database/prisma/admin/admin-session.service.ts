import { Injectable } from '@nestjs/common';
import { AdminSessionRepository } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-session.repository';

@Injectable()
export class AdminSessionService {
  constructor(private _adminSessionRepository: AdminSessionRepository) {}

  create(params: {
    adminUserId: string;
    jti: string;
    ip?: string;
    userAgent?: string;
    expiresAt: Date;
    mfaVerifiedAt?: Date;
  }) {
    return this._adminSessionRepository.create(params);
  }

  getByJti(jti: string) {
    return this._adminSessionRepository.getByJti(jti);
  }

  getById(id: string) {
    return this._adminSessionRepository.getById(id);
  }

  touchMfaVerified(id: string) {
    return this._adminSessionRepository.touchMfaVerified(id);
  }

  listActiveForAdminUser(adminUserId: string) {
    return this._adminSessionRepository.listActiveForAdminUser(adminUserId);
  }

  revoke(id: string, revokedBy: string) {
    return this._adminSessionRepository.revoke(id, revokedBy);
  }

  revokeByJti(jti: string, revokedBy: string) {
    return this._adminSessionRepository.revokeByJti(jti, revokedBy);
  }

  revokeAllForAdminUser(adminUserId: string, revokedBy: string) {
    return this._adminSessionRepository.revokeAllForAdminUser(
      adminUserId,
      revokedBy
    );
  }
}
