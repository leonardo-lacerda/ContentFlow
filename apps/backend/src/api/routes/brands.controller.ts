import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { Response } from 'express';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';
import { CreateBrandProfileDto } from '@gitroom/nestjs-libraries/dtos/settings/create-brand-profile.dto';
import { UpdateBrandProfileDto } from '@gitroom/nestjs-libraries/dtos/settings/update-brand-profile.dto';
import { AnalyzeBrandDto } from '@gitroom/nestjs-libraries/dtos/settings/analyze-brand.dto';
import { CreateBrandDnaSnapshotDto } from '@gitroom/nestjs-libraries/dtos/settings/create-brand-dna-snapshot.dto';

@ApiTags('Brands')
@Controller('/brands')
export class BrandsController {
  constructor(private brandProfileService: BrandProfileService) {}

  @Get('/')
  async getBrands(@GetOrgFromRequest() org: Organization) {
    return this.brandProfileService.getBrands(org.id);
  }

  @Get('/selected')
  async getSelectedBrand(
    @GetOrgFromRequest() org: Organization,
    @Res() res: Response
  ) {
    // Nest drops the body when the handler returns null. Force JSON null so the
    // frontend can parse it instead of hitting an empty 200 response.
    const selected = await this.brandProfileService.getSelectedBrand(org.id);
    return res.status(200).json(selected ?? null);
  }

  @Get('/:id')
  async getBrand(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.brandProfileService.getBrand(id, org.id);
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
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: UpdateBrandProfileDto
  ) {
    return this.brandProfileService.updateBrand(id, org.id, body);
  }

  @Delete('/:id')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async deleteBrand(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.brandProfileService.deleteBrand(id, org.id);
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
  async getDnaSnapshots(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    const brand = await this.brandProfileService.getBrand(id, org.id);
    if (!brand) throw new Error('Brand not found');
    return this.brandProfileService.getDnaSnapshots(id);
  }

  @Get('/:id/assets')
  async getAssets(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body?: { type?: string }
  ) {
    const brand = await this.brandProfileService.getBrand(id, org.id);
    if (!brand) throw new Error('Brand not found');
    return this.brandProfileService.getAssets(id, body?.type);
  }

  @Post('/:id/assets')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async createAsset(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: { type: string; mediaId?: string; sourceUrl?: string; metadata?: any }
  ) {
    return this.brandProfileService.createAsset(org.id, id, body);
  }

  @Post('/:id/analyze')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async analyzeBrand(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: AnalyzeBrandDto
  ) {
    return this.brandProfileService.analyzeBrand(org.id, id, body);
  }

  @Get('/:id/dna/latest')
  async getLatestDna(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    const brand = await this.brandProfileService.getBrand(id, org.id);
    if (!brand) throw new Error('Brand not found');
    return this.brandProfileService.getLatestDnaSnapshot(id);
  }

  @Post('/:id/dna')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async createBrandDnaSnapshot(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: CreateBrandDnaSnapshotDto
  ) {
    return this.brandProfileService.createDnaSnapshot(org.id, id, body);
  }

  @Patch('/:id/assets/:assetId/approve')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async approveAsset(
    @GetOrgFromRequest() org: Organization,
    @Param('id') brandId: string,
    @Param('assetId') assetId: string
  ) {
    return this.brandProfileService.approveAsset(org.id, brandId, assetId);
  }

  @Delete('/:id/assets/:assetId')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async deleteAsset(
    @GetOrgFromRequest() org: Organization,
    @Param('id') brandId: string,
    @Param('assetId') assetId: string
  ) {
    return this.brandProfileService.deleteAsset(org.id, brandId, assetId);
  }
}
