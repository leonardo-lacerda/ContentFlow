import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { CreativeWorkflowService } from '@gitroom/nestjs-libraries/creative-engine/creative-workflow.service';
import { CreateCreativeWorkflowDto, CreativeDuplicateWorkflowDto, CreativeWorkflowQuoteDto, RunCreativeWorkflowDto } from '@gitroom/nestjs-libraries/dtos/creative';
import { CreativeFeatureFlagGuard } from '@gitroom/nestjs-libraries/creative-engine/creative-feature-flag.guard';

@ApiTags('Creative Workflows')
@Controller('/creative/workflows')
@UseGuards(CreativeFeatureFlagGuard)
export class CreativeWorkflowsController {
  constructor(private readonly workflows: CreativeWorkflowService) {}

  @Get('/')
  list(@GetOrgFromRequest() org: Organization) {
    return this.workflows.list(org.id);
  }

  @Post('/')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  create(@GetOrgFromRequest() org: Organization, @Body() body: CreateCreativeWorkflowDto) {
    return this.workflows.create(org.id, body);
  }

  @Get('/:id')
  get(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.workflows.get(id, org.id);
  }

  @Post('/:id/duplicate')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  duplicate(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeDuplicateWorkflowDto) {
    return this.workflows.duplicate(id, org.id, body);
  }

  @Post('/:id/validate')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  validate(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.workflows.validate(id, org.id);
  }

  @Post('/:id/quote')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  quote(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeWorkflowQuoteDto) {
    return this.workflows.quote(id, org.id, body || {});
  }

  @Post('/:id/runs')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  run(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: RunCreativeWorkflowDto) {
    return this.workflows.run(id, org.id, body || {});
  }

  @Get('/runs/:id')
  getRun(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.workflows.getRun(id, org.id);
  }

  @Delete('/runs/:id')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  cancelRun(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.workflows.cancelRun(id, org.id);
  }
}
