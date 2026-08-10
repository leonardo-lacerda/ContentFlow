import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { GenerationJobService } from '@gitroom/nestjs-libraries/database/prisma/generation-jobs/generation-job.service';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';
import { CreateGenerationJobDto } from '@gitroom/nestjs-libraries/dtos/generation-jobs/create-generation-job.dto';

@ApiTags('Generation Jobs')
@Controller('/generation-jobs')
export class GenerationJobController {
  constructor(
    private generationJobService: GenerationJobService,
    private brandProfileService: BrandProfileService
  ) {}

  @Get('/')
  async getJobs(@GetOrgFromRequest() org: Organization) {
    return this.generationJobService.getJobs(org.id);
  }

  @Get('/:id')
  async getJob(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.generationJobService.getJob(id, org.id);
  }

  @Post('/')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async createJob(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateGenerationJobDto
  ) {
    if (body.brandProfileId) {
      await this.brandProfileService.validateBrandOwnership(org.id, body.brandProfileId);
    }
    return this.generationJobService.createJob({
      organizationId: org.id,
      ...body,
      type: body.type as any,
    });
  }

  @Patch('/:id/cancel')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async cancelJob(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.generationJobService.cancelJob(id, org.id);
  }

  @Get('/active/count')
  async countActiveJobs(@GetOrgFromRequest() org: Organization) {
    const count = await this.generationJobService.countActiveJobs(org.id);
    return { count };
  }
}
