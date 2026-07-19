import { UseGuards, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { V1SurfaceGuard } from '@gitroom/backend/services/auth/v1-surface.guard';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { EditorialPlanService } from '@gitroom/nestjs-libraries/database/prisma/editorial-plans/editorial-plan.service';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';

@ApiTags('Editorial Plans')
@UseGuards(V1SurfaceGuard)
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
  async getPlansByBrand(@Param('brandId') brandId: string) {
    return this.editorialPlanService.getPlansByBrand(brandId);
  }

  @Get('/:id')
  async getPlan(@Param('id') id: string) {
    return this.editorialPlanService.getPlan(id);
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
  async updatePlan(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.editorialPlanService.updatePlan(id, body);
  }

  @Delete('/:id')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async deletePlan(@Param('id') id: string) {
    return this.editorialPlanService.deletePlan(id);
  }

  @Post('/:id/generate-calendar')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async generateCalendar(
    @Param('id') id: string,
    @Body() body: { days?: number }
  ) {
    return this.editorialPlanService.generateCalendar(id, body.days || 30);
  }

  @Get('/:id/slots')
  async getSlots(@Param('id') id: string) {
    return this.editorialPlanService.getSlots(id);
  }

  @Patch('/slots/:slotId')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async updateSlot(@Param('slotId') slotId: string, @Body() body: Record<string, unknown>) {
    return this.editorialPlanService.updateSlot(slotId, body);
  }

  @Post('/:id/run-generation')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async runGeneration(@Param('id') id: string) {
    return this.editorialPlanService.runGeneration(id);
  }

  @Post('/:id/toggle-auto')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async toggleAutoGeneration(
    @Param('id') id: string,
    @Body() body: { autoGenerate: boolean }
  ) {
    return this.editorialPlanService.toggleAutoGeneration(id, body.autoGenerate);
  }
}
