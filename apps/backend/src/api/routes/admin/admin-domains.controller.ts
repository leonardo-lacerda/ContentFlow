import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminDomainService } from '@gitroom/backend/api/routes/admin/admin-domain.service';
import { AdminPermission, GetAdminUserFromRequest } from '@gitroom/backend/services/auth/admin/admin-permission.decorator';
import { AdminSessionGuard } from '@gitroom/backend/services/auth/admin/admin-session.guard';
import { AdminPermissionGuard } from '@gitroom/backend/services/auth/admin/admin-permission.guard';
import { AdminUserWithAccount } from '@gitroom/backend/services/auth/admin/admin-auth.service';

@Controller('/admin')
@UseGuards(AdminSessionGuard, AdminPermissionGuard)
export class AdminDomainsController {
  constructor(private _service: AdminDomainService) {}

  @Get('/analytics/summary')
  @AdminPermission('analytics.read', { resourceType: 'Platform' })
  summary() { return this._service.analytics(); }

  @Get('/system/health')
  @AdminPermission('system.read', { resourceType: 'PlatformHealth' })
  health() { return this._service.health(); }

  @Get('/:resource')
  @AdminPermission('system.read')
  list(@Param('resource') resource: string, @Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string, @Query('status') status?: string, @Query('organizationId') organizationId?: string) {
    return this._service.list(resource, { page: page ? Number(page) : 0, limit: limit ? Number(limit) : 25, search, status, organizationId });
  }

  @Get('/:resource/:id')
  @AdminPermission('system.read')
  get(@Param('resource') resource: string, @Param('id') id: string) { return this._service.get(resource, id); }

  @Post('/:resource')
  @AdminPermission('system.write', { severity: 'WARNING', requireReason: true })
  create(@Param('resource') resource: string, @Body() body: Record<string, unknown>, @GetAdminUserFromRequest() admin: AdminUserWithAccount) { return this._service.create(resource, body, admin.id); }

  @Patch('/:resource/:id')
  @AdminPermission('system.write', { severity: 'WARNING', requireReason: true })
  update(@Param('resource') resource: string, @Param('id') id: string, @Body() body: Record<string, unknown>, @GetAdminUserFromRequest() admin: AdminUserWithAccount) { return this._service.update(resource, id, body, admin.id); }

  @Post('/:resource/:id/actions/:action')
  @AdminPermission('system.write', { severity: 'CRITICAL', requireReason: true })
  action(@Param('resource') resource: string, @Param('id') id: string, @Param('action') action: string, @Body() body: Record<string, unknown>, @GetAdminUserFromRequest() admin: AdminUserWithAccount) { return this._service.action(resource, id, action, body, admin.id); }
}
