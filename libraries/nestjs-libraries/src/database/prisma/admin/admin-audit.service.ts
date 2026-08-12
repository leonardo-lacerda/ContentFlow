import { Injectable } from '@nestjs/common';
import {
  AdminAuditRepository,
  AdminAuditLogEntry,
} from '@gitroom/nestjs-libraries/database/prisma/admin/admin-audit.repository';

@Injectable()
export class AdminAuditService {
  constructor(private _adminAuditRepository: AdminAuditRepository) {}

  write(entry: AdminAuditLogEntry) {
    return this._adminAuditRepository.write(entry);
  }

  list(params: {
    page?: number;
    limit?: number;
    adminUserId?: string;
    action?: string;
    targetOrgId?: string;
    severity?: string;
  }) {
    return this._adminAuditRepository.list(params);
  }

  export(params: { from?: Date; to?: Date; limit?: number }) {
    return this._adminAuditRepository.export(params);
  }
}
