import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ErrorsService } from '@gitroom/nestjs-libraries/database/prisma/errors/errors.service';
import { AdminSessionGuard } from '@gitroom/backend/services/auth/admin/admin-session.guard';
import { AdminPermissionGuard } from '@gitroom/backend/services/auth/admin/admin-permission.guard';
import { AdminPermission } from '@gitroom/backend/services/auth/admin/admin-permission.decorator';

@ApiTags('Admin')
@Controller('/admin')
@UseGuards(AdminSessionGuard, AdminPermissionGuard)
export class AdminController {
  constructor(private _errorsService: ErrorsService) {}

  @Get('/errors')
  @AdminPermission('system.errors.read', { resourceType: 'Errors' })
  async listErrors(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('platform') platform?: string,
    @Query('email') email?: string,
    @Query('unknownFirst') unknownFirst?: string
  ) {
    return this._errorsService.listErrors({
      page: page ? parseInt(page, 10) : 0,
      limit: limit ? parseInt(limit, 10) : 20,
      platform: platform || undefined,
      email: email || undefined,
      unknownFirst: unknownFirst === 'true' || unknownFirst === '1',
    });
  }

  @Get('/errors/platforms')
  @AdminPermission('system.errors.read', { resourceType: 'Errors' })
  async listPlatforms() {
    return this._errorsService.listPlatforms();
  }
}
