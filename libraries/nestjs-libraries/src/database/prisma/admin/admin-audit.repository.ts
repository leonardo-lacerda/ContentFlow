import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

export interface AdminAuditLogEntry {
  adminUserId?: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  targetOrgId?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  success?: boolean;
  errorMessage?: string;
}

interface ListAuditParams {
  page?: number;
  limit?: number;
  adminUserId?: string;
  action?: string;
  targetOrgId?: string;
  severity?: string;
}

@Injectable()
export class AdminAuditRepository {
  constructor(private _adminAuditLog: PrismaRepository<'adminAuditLog'>) {}

  write(entry: AdminAuditLogEntry) {
    return this._adminAuditLog.model.adminAuditLog.create({
      data: {
        adminUserId: entry.adminUserId,
        actorEmail: entry.actorEmail,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        targetOrgId: entry.targetOrgId,
        before: entry.before as any,
        after: entry.after as any,
        reason: entry.reason,
        ip: entry.ip,
        userAgent: entry.userAgent,
        requestId: entry.requestId,
        severity: entry.severity || 'INFO',
        success: entry.success ?? true,
        errorMessage: entry.errorMessage,
      },
    });
  }

  async list(params: ListAuditParams) {
    const page = Math.max(0, params.page || 0);
    const limit = Math.min(Math.max(1, params.limit || 50), 200);
    const skip = page * limit;
    const where: any = {};
    if (params.adminUserId) where.adminUserId = params.adminUserId;
    if (params.action) where.action = { contains: params.action };
    if (params.targetOrgId) where.targetOrgId = params.targetOrgId;
    if (params.severity) where.severity = params.severity;

    const [items, total] = await Promise.all([
      this._adminAuditLog.model.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this._adminAuditLog.model.adminAuditLog.count({ where }),
    ]);

    return { items, total, page, limit, hasMore: skip + items.length < total };
  }

  export(params: { from?: Date; to?: Date; limit?: number }) {
    const where: any = {};
    if (params.from || params.to) where.createdAt = { ...(params.from ? { gte: params.from } : {}), ...(params.to ? { lte: params.to } : {}) };
    return this._adminAuditLog.model.adminAuditLog.findMany({ where, orderBy: { createdAt: 'asc' }, take: Math.min(params.limit || 10000, 50000) });
  }
}
