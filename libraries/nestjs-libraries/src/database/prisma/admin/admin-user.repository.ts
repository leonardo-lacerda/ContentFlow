import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { AdminRoleType } from '@prisma/client';
import { AuthService } from '@gitroom/helpers/auth/auth.service';

@Injectable()
export class AdminUserRepository {
  constructor(private _adminUser: PrismaRepository<'adminUser'>) {}

  getByUserId(userId: string) {
    return this._adminUser.model.adminUser.findUnique({
      where: { userId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  getById(id: string) {
    return this._adminUser.model.adminUser.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  list() {
    return this._adminUser.model.adminUser.findMany({
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  updatePermissions(id: string, permissions: Record<string, boolean> | null) {
    return this._adminUser.model.adminUser.update({
      where: { id },
      data: { permissions: permissions as any },
    });
  }

  create(params: {
    userId: string;
    role: AdminRoleType;
    createdBy?: string;
  }) {
    return this._adminUser.model.adminUser.create({
      data: {
        userId: params.userId,
        role: params.role,
        createdBy: params.createdBy,
      },
    });
  }

  updateMfaPending(id: string, mfaSecret: string) {
    return this._adminUser.model.adminUser.update({
      where: { id },
      data: { mfaSecret: AuthService.fixedEncryption(mfaSecret) },
    });
  }

  enableMfa(id: string, backupCodeHashes: string[]) {
    return this._adminUser.model.adminUser.update({
      where: { id },
      data: {
        mfaEnabled: true,
        mfaBackupCodes: backupCodeHashes,
      },
    });
  }

  disableMfa(id: string) {
    return this._adminUser.model.adminUser.update({
      where: { id },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
      },
    });
  }

  consumeBackupCode(id: string, remainingHashes: string[]) {
    return this._adminUser.model.adminUser.update({
      where: { id },
      data: { mfaBackupCodes: remainingHashes },
    });
  }

  touchLastAccess(id: string) {
    return this._adminUser.model.adminUser.update({
      where: { id },
      data: { lastAccessAt: new Date() },
    });
  }

  setStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
    return this._adminUser.model.adminUser.update({
      where: { id },
      data: { status },
    });
  }

  setRole(id: string, role: AdminRoleType) {
    return this._adminUser.model.adminUser.update({
      where: { id },
      data: { role },
    });
  }
}
