import { Injectable } from '@nestjs/common';
import { AdminUserRepository } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-user.repository';
import { AdminRoleType } from '@prisma/client';

@Injectable()
export class AdminUserService {
  constructor(private _adminUserRepository: AdminUserRepository) {}

  getByUserId(userId: string) {
    return this._adminUserRepository.getByUserId(userId);
  }

  getById(id: string) {
    return this._adminUserRepository.getById(id);
  }

  list() {
    return this._adminUserRepository.list();
  }

  create(params: { userId: string; role: AdminRoleType; createdBy?: string }) {
    return this._adminUserRepository.create(params);
  }

  updateMfaPending(id: string, mfaSecret: string) {
    return this._adminUserRepository.updateMfaPending(id, mfaSecret);
  }

  enableMfa(id: string, backupCodeHashes: string[]) {
    return this._adminUserRepository.enableMfa(id, backupCodeHashes);
  }

  disableMfa(id: string) {
    return this._adminUserRepository.disableMfa(id);
  }

  consumeBackupCode(id: string, remainingHashes: string[]) {
    return this._adminUserRepository.consumeBackupCode(id, remainingHashes);
  }

  touchLastAccess(id: string) {
    return this._adminUserRepository.touchLastAccess(id);
  }

  setStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
    return this._adminUserRepository.setStatus(id, status);
  }

  setRole(id: string, role: AdminRoleType) {
    return this._adminUserRepository.setRole(id, role);
  }

  updatePermissions(id: string, permissions: Record<string, boolean> | null) {
    return this._adminUserRepository.updatePermissions(id, permissions);
  }
}
