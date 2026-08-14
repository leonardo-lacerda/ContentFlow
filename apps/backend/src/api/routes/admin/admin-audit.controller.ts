import { Controller, Get, Query, Res, UseGuards, ServiceUnavailableException } from '@nestjs/common';
import { Response } from 'express';
import { createHmac } from 'crypto';
import { ApiTags } from '@nestjs/swagger';
import { AdminAuditService } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-audit.service';
import { AdminSessionGuard } from '@gitroom/backend/services/auth/admin/admin-session.guard';
import { AdminPermissionGuard } from '@gitroom/backend/services/auth/admin/admin-permission.guard';
import { AdminPermission } from '@gitroom/backend/services/auth/admin/admin-permission.decorator';

@ApiTags('Admin Audit')
@Controller('/admin/audit-log')
@UseGuards(AdminSessionGuard, AdminPermissionGuard)
export class AdminAuditController {
  constructor(private _adminAuditService: AdminAuditService) {}

  @Get('/')
  @AdminPermission('security.audit.read')
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('targetOrgId') targetOrgId?: string,
    @Query('severity') severity?: string
  ) {
    return this._adminAuditService.list({
      page: page ? parseInt(page, 10) : 0,
      limit: limit ? parseInt(limit, 10) : 50,
      action: action || undefined,
      targetOrgId: targetOrgId || undefined,
      severity: severity || undefined,
    });
  }

  @Get('/export')
  @AdminPermission('security.audit.export', { severity: 'CRITICAL', requireReason: true, resourceType: 'AdminAuditLog' })
  async export(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('format') format: string | undefined,
    @Res({ passthrough: true }) response: Response
  ) {
    const rows = await this._adminAuditService.export({ from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined });
    const payload = format === 'csv'
      ? ['id,createdAt,actorEmail,action,resourceType,resourceId,severity,success,reason', ...rows.map((row) => [row.id, row.createdAt.toISOString(), row.actorEmail, row.action, row.resourceType, row.resourceId || '', row.severity, row.success, row.reason || ''].map((value) => JSON.stringify(value)).join(','))].join('\n')
      : JSON.stringify(rows);
    const signingSecret = process.env.ADMIN_AUDIT_EXPORT_SECRET;
    if (!signingSecret) {
      throw new ServiceUnavailableException('Audit export signing is not configured');
    }
    const signature = createHmac('sha256', signingSecret).update(payload).digest('hex');
    response.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    response.setHeader('X-Audit-Export-Signature', signature);
    return payload;
  }
}
