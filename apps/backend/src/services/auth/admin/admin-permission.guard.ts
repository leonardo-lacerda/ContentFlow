import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  ADMIN_PERMISSION_KEY,
  AdminPermissionMetadata,
  AdminRequestSession,
} from '@gitroom/backend/services/auth/admin/admin-permission.decorator';
import { AdminUserWithAccount } from '@gitroom/backend/services/auth/admin/admin-auth.service';
import {
  isAdminPermissionAllowed,
  isStepUpValid,
  isIpAllowed,
} from '@gitroom/nestjs-libraries/security/admin-permissions';
import {
  AdminPermissionDeniedException,
  AdminReasonRequiredException,
  AdminStepUpRequiredException,
  AdminIpNotAllowedException,
  AdminApprovalRequiredException,
} from '@gitroom/backend/services/auth/admin/admin.exceptions';
import { RESOURCE_CONFIG } from '@gitroom/backend/api/routes/admin/admin-domain.service';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { AdminAlertService } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-alert.service';

// Deny-by-default: a handler under an Admin*Controller with no @AdminPermission
// decorator is rejected outright rather than silently allowed. This is what
// keeps the next 80 admin routes from repeating the old `if (!user.isSuperAdmin)`
// copy-paste pattern — see docs/admin/PLANO-SISTEMA-ADMIN.md §4.3.
@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(private _reflector: Reflector, private _prisma: PrismaService, private _alerts: AdminAlertService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this._reflector.get<AdminPermissionMetadata | undefined>(
      ADMIN_PERMISSION_KEY,
      context.getHandler()
    );

    if (!metadata) {
      throw new HttpException(
        'Admin route is missing an @AdminPermission() declaration',
        500
      );
    }

    const request: Request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error set by AdminSessionGuard, which must run first
    const adminUser: AdminUserWithAccount = request.adminUser;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error set by AdminSessionGuard, which must run first
    const adminSession: AdminRequestSession = request.adminSession;

    const resource = (request.params as Record<string, string> | undefined)?.resource;
    let effectivePermission = metadata.key;
    if (resource && (metadata.key === 'system.read' || metadata.key === 'system.write')) {
      const config = RESOURCE_CONFIG[resource];
      if (config) effectivePermission = metadata.key === 'system.write' ? (config.writePermission || config.permission) : config.permission;
    }

    if (
      !isAdminPermissionAllowed(
        adminUser.role,
        adminUser.permissions as Record<string, boolean> | null,
        effectivePermission
      )
    ) {
      throw new AdminPermissionDeniedException(effectivePermission);
    }

    const ip = request.ip || request.headers['x-forwarded-for']?.toString().split(',')[0].trim();
    if (!isIpAllowed(ip, adminUser.ipAllowlist || [])) {
      void this._alerts.emit({ type: 'ADMIN_IP_DENIED', severity: 'CRITICAL', title: 'Acesso administrativo fora da allowlist', message: `Acesso bloqueado para ${adminUser.user.email} a partir de ${ip || 'IP desconhecido'}`, adminUserId: adminUser.id });
      throw new AdminIpNotAllowedException();
    }

    if (metadata.severity === 'CRITICAL' && !isStepUpValid(adminSession?.mfaVerifiedAt)) {
      throw new AdminStepUpRequiredException();
    }

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && effectivePermission !== 'system.settings.write') {
      const readonly = await this._prisma.platformSetting.findUnique({ where: { key: 'system.readonly_mode' }, select: { value: true } });
      if (readonly?.value === true) throw new HttpException('Platform is in read-only mode', 423);
    }

    if (metadata.requireReason) {
      const reason = (request.body as Record<string, unknown> | undefined)?.reason || (request.query as Record<string, unknown> | undefined)?.reason;
      if (typeof reason !== 'string' || !reason.trim()) {
        throw new AdminReasonRequiredException();
      }
    }

    const approvalRequired = metadata.requireApproval || [
      'orgs.delete',
      'billing.plans.write',
      'billing.pricing.write',
      'billing.refund',
      'admins.write',
      'system.settings.write',
      'orgs.transfer',
      'orgs.cleanup',
    ].includes(effectivePermission);
    if (approvalRequired) {
      const approvalId = (request.body as Record<string, unknown> | undefined)?.approvalId;
      if (typeof approvalId !== 'string') throw new AdminApprovalRequiredException();
      const approval = await this._prisma.adminApprovalRequest.findUnique({ where: { id: approvalId } });
      if (!approval || approval.status !== 'APPROVED' || approval.approvedBy === adminUser.id || approval.expiresAt <= new Date() || approval.action !== effectivePermission) {
        throw new AdminApprovalRequiredException();
      }
    }

    return true;
  }
}
