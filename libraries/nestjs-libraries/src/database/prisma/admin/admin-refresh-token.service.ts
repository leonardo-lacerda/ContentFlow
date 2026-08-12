import { Injectable } from '@nestjs/common';
import { AdminRefreshTokenRepository } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-refresh-token.repository';

@Injectable()
export class AdminRefreshTokenService {
  constructor(private _repository: AdminRefreshTokenRepository) {}
  create(data: { adminUserId: string; tokenHash: string; expiresAt: Date; ip?: string; userAgent?: string }) {
    return this._repository.create(data);
  }
  consume(tokenHash: string) {
    return this._repository.consume(tokenHash);
  }
  get(tokenHash: string) {
    return this._repository.get(tokenHash);
  }
  revokeAll(adminUserId: string) {
    return this._repository.revokeAll(adminUserId);
  }
}
