import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { GenerationJobService } from '@gitroom/nestjs-libraries/database/prisma/generation-jobs/generation-job.service';

@ApiTags('Generation Jobs')
@Controller('/generation-jobs')
export class GenerationJobController {
  constructor(private generationJobService: GenerationJobService) {}

  @Get('/')
  async getJobs(@GetOrgFromRequest() org: Organization) {
    return this.generationJobService.getJobs(org.id);
  }

  @Get('/:id')
  async getJob(@Param('id') id: string) {
    return this.generationJobService.getJob(id);
  }

  @Post('/')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async createJob(
    @GetOrgFromRequest() org: Organization,
    @Body() body: {
      brandProfileId?: string;
      carouselProjectId?: string;
      type: string;
      idempotencyKey?: string;
      model?: string;
      provider?: string;
      promptVersion?: string;
      schemaVersion?: string;
      costEstimate?: number;
    }
  ) {
    return this.generationJobService.createJob({
      organizationId: org.id,
      ...body,
      type: body.type as any,
    });
  }

  @Patch('/:id/cancel')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async cancelJob(@Param('id') id: string) {
    return this.generationJobService.cancelJob(id);
  }

  @Get('/active/count')
  async countActiveJobs(@GetOrgFromRequest() org: Organization) {
    const count = await this.generationJobService.countActiveJobs(org.id);
    return { count };
  }
}
