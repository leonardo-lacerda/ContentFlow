import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { BrandLearningService } from '@gitroom/nestjs-libraries/database/prisma/brand-learning/brand-learning.service';
import { CreateBrandLearningDto } from '@gitroom/nestjs-libraries/dtos/brand-learning/create-brand-learning.dto';
import { QueryBrandLearningDto } from '@gitroom/nestjs-libraries/dtos/brand-learning/query-brand-learning.dto';

@ApiTags('Brand Learning')
@Controller('/brand-learning')
export class BrandLearningController {
  constructor(private brandLearningService: BrandLearningService) {}

  @Get('/brand/:brandId')
  async getLearnings(
    @Param('brandId') brandId: string,
    @Query() query: QueryBrandLearningDto
  ) {
    return this.brandLearningService.getLearnings(brandId, query.status);
  }

  @Get('/:id')
  async getLearning(@Param('id') id: string) {
    return this.brandLearningService.getLearning(id);
  }

  @Post('/')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async createLearning(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateBrandLearningDto
  ) {
    return this.brandLearningService.createLearning({
      ...body,
      organizationId: org.id,
    });
  }

  @Patch('/:id/approve')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async approveLearning(@Param('id') id: string) {
    return this.brandLearningService.approveLearning(id);
  }

  @Patch('/:id/reject')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async rejectLearning(@Param('id') id: string) {
    return this.brandLearningService.rejectLearning(id);
  }

  @Patch('/:id/apply')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async applyLearning(
    @Param('id') id: string,
    @Body() body: { version: number }
  ) {
    return this.brandLearningService.applyLearning(id, body.version);
  }
}
