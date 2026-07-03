import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { TemplateMarketplaceService } from '@gitroom/nestjs-libraries/database/prisma/templates/template-marketplace.service';

@ApiTags('Template Marketplace')
@Controller('/template-marketplace')
export class TemplateMarketplaceController {
  constructor(
    private readonly _marketplaceService: TemplateMarketplaceService,
  ) {}

  @Get('/templates')
  async listTemplates(
    @Query('category') category?: string,
    @Query('source') source?: string,
    @Query('search') search?: string,
  ) {
    return this._marketplaceService.listTemplates({
      category,
      source,
      search,
    });
  }

  @Get('/templates/:id')
  async getTemplate(@Param('id') id: string) {
    return this._marketplaceService.getTemplate(id);
  }

  @Post('/templates')
  async createTemplate(
    @GetOrgFromRequest() org: Organization,
    @Body()
    body: {
      name: string;
      description: string;
      category: string;
      templateData: any;
      tags?: string[];
      previewImageUrl?: string;
      source?: 'OFFICIAL' | 'COMMUNITY' | 'PRIVATE';
    },
  ) {
    return this._marketplaceService.createTemplate(org.id, body);
  }

  @Post('/templates/:id/install')
  async installTemplate(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
  ) {
    return this._marketplaceService.installTemplate(org.id, id);
  }

  @Delete('/templates/:id/uninstall')
  async uninstallTemplate(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
  ) {
    return this._marketplaceService.uninstallTemplate(org.id, id);
  }

  @Get('/installed')
  async getInstalledTemplates(@GetOrgFromRequest() org: Organization) {
    return this._marketplaceService.getInstalledTemplates(org.id);
  }

  @Post('/templates/:id/review')
  async reviewTemplate(
    @Param('id') id: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; feedback?: string },
  ) {
    return this._marketplaceService.reviewTemplate(id, body.status, body.feedback);
  }

  @Post('/templates/:id/usage')
  async recordUsage(@Param('id') id: string) {
    await this._marketplaceService.recordUsage(id);
    return { success: true };
  }

  @Get('/abuse-detection')
  async detectAbuse() {
    return this._marketplaceService.detectAbuse();
  }

  @Post('/templates/:id/suspend')
  async suspendTemplate(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this._marketplaceService.suspendTemplate(id, body.reason);
  }
}
