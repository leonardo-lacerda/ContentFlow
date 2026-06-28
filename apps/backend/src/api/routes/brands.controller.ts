import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';
import { CreateBrandProfileDto } from '@gitroom/nestjs-libraries/dtos/settings/create-brand-profile.dto';
import { UpdateBrandProfileDto } from '@gitroom/nestjs-libraries/dtos/settings/update-brand-profile.dto';

@ApiTags('Brands')
@Controller('/brands')
export class BrandsController {
  constructor(private brandProfileService: BrandProfileService) {}

  @Get('/')
  async getBrands(@GetOrgFromRequest() org: Organization) {
    return this.brandProfileService.getBrands(org.id);
  }

  @Get('/selected')
  async getSelectedBrand(@GetOrgFromRequest() org: Organization) {
    return this.brandProfileService.getSelectedBrand(org.id);
  }

  @Get('/:id')
  async getBrand(@Param('id') id: string) {
    return this.brandProfileService.getBrand(id);
  }

  @Post('/')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async createBrand(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateBrandProfileDto
  ) {
    return this.brandProfileService.createBrand(org.id, body);
  }

  @Put('/:id')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async updateBrand(
    @Param('id') id: string,
    @Body() body: UpdateBrandProfileDto
  ) {
    return this.brandProfileService.updateBrand(id, body);
  }

  @Delete('/:id')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async deleteBrand(@Param('id') id: string) {
    return this.brandProfileService.deleteBrand(id);
  }

  @Post('/:id/select')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async selectBrand(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.brandProfileService.selectBrand(org.id, id);
  }

  @Get('/:id/dna')
  async getDnaSnapshots(@Param('id') id: string) {
    return this.brandProfileService.getDnaSnapshots(id);
  }

  @Get('/:id/assets')
  async getAssets(
    @Param('id') id: string,
    @Body() body?: { type?: string }
  ) {
    return this.brandProfileService.getAssets(id, body?.type);
  }

  @Post('/:id/assets')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async createAsset(
    @Param('id') id: string,
    @Body() body: { type: string; mediaId?: string; sourceUrl?: string; metadata?: any }
  ) {
    return this.brandProfileService.createAsset(id, body);
  }
}
