import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { EditorialPlanService } from '@gitroom/nestjs-libraries/database/prisma/editorial-plans/editorial-plan.service';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';

@ApiTags('Editorial Plans')
@Controller('/editorial-plans')
export class EditorialPlansController {
  constructor(
    private editorialPlanService: EditorialPlanService,
    private brandProfileService: BrandProfileService
  ) {}

  @Get('/')
  async getPlans(@GetOrgFromRequest() org: Organization) {
    return this.editorialPlanService.getPlans(org.id);
  }

  @Get('/brand/:brandId')
  async getPlansByBrand(
    @GetOrgFromRequest() org: Organization,
    @Param('brandId') brandId: string
  ) {
    return this.editorialPlanService.getPlansByBrand(brandId, org.id);
  }

  @Get('/:id')
  async getPlan(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.editorialPlanService.getPlan(id, org.id);
  }

  @Post('/')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async createPlan(
    @GetOrgFromRequest() org: Organization,
    @Body() body: {
      brandProfileId: string;
      name: string;
      frequencyPerWeek?: number;
      platforms?: string[];
      pillars?: string[];
      objectives?: string[];
      languages?: string[];
      timezone?: string;
      blackoutDates?: string[];
      autoGenerate?: boolean;
    }
  ) {
    await this.brandProfileService.validateBrandOwnership(org.id, body.brandProfileId);
    return this.editorialPlanService.createPlan({
      organizationId: org.id,
      ...body,
    });
  }

  @Patch('/:id')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async updatePlan(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.editorialPlanService.updatePlan(id, org.id, body);
  }

  @Delete('/:id')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async deletePlan(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.editorialPlanService.deletePlan(id, org.id);
  }

  @Post('/:id/generate-calendar')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async generateCalendar(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: { days?: number }
  ) {
    return this.editorialPlanService.generateCalendar(id, org.id, body.days || 30);
  }

  @Get('/:id/slots')
  async getSlots(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.editorialPlanService.getSlots(id, org.id);
  }

  @Patch('/slots/:slotId')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async updateSlot(
    @GetOrgFromRequest() org: Organization,
    @Param('slotId') slotId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.editorialPlanService.updateSlot(slotId, org.id, body);
  }

  @Post('/:id/run-generation')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async runGeneration(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.editorialPlanService.runGeneration(id, org.id);
  }

  @Post('/:id/toggle-auto')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async toggleAutoGeneration(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: { autoGenerate: boolean }
  ) {
    return this.editorialPlanService.toggleAutoGeneration(id, org.id, body.autoGenerate);
  }
}
