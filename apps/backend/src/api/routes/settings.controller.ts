import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { AddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/add.team.member.dto';
import { ShortlinkPreferenceDto } from '@gitroom/nestjs-libraries/dtos/settings/shortlink-preference.dto';
import { CompanyProfileDto } from '@gitroom/nestjs-libraries/dtos/settings/company-profile.dto';
import { CompanyProfileSummaryDto } from '@gitroom/nestjs-libraries/dtos/settings/company-profile-summary.dto';
import { ApiTags } from '@nestjs/swagger';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';

@ApiTags('Settings')
@Controller('/settings')
export class SettingsController {
  constructor(
    private _organizationService: OrganizationService
  ) {}

  @Get('/team')
  @CheckPolicies(
    [AuthorizationActions.Create, Sections.TEAM_MEMBERS],
    [AuthorizationActions.Create, Sections.ADMIN]
  )
  async getTeam(@GetOrgFromRequest() org: Organization) {
    return this._organizationService.getTeam(org.id);
  }

  @Post('/team')
  @CheckPolicies(
    [AuthorizationActions.Create, Sections.TEAM_MEMBERS],
    [AuthorizationActions.Create, Sections.ADMIN]
  )
  async inviteTeamMember(
    @GetOrgFromRequest() org: Organization,
    @Body() body: AddTeamMemberDto
  ) {
    return this._organizationService.inviteTeamMember(org.id, body);
  }

  @Delete('/team/:id')
  @CheckPolicies(
    [AuthorizationActions.Create, Sections.TEAM_MEMBERS],
    [AuthorizationActions.Create, Sections.ADMIN]
  )
  deleteTeamMember(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._organizationService.deleteTeamMember(org, id);
  }

  @Get('/shortlink')
  async getShortlinkPreference(@GetOrgFromRequest() org: Organization) {
    return this._organizationService.getShortlinkPreference(org.id);
  }

  @Post('/shortlink')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async updateShortlinkPreference(
    @GetOrgFromRequest() org: Organization,
    @Body() body: ShortlinkPreferenceDto
  ) {
    return this._organizationService.updateShortlinkPreference(
      org.id,
      body.shortlink
    );
  }

  @Get('/company-profile')
  async getCompanyProfile(@GetOrgFromRequest() org: Organization) {
    return this._organizationService.getCompanyProfile(org.id);
  }

  @Get('/company-profiles')
  async getCompanyProfiles(@GetOrgFromRequest() org: Organization) {
    return this._organizationService.getCompanyProfiles(org.id);
  }

  @Post('/company-profile')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async updateCompanyProfile(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CompanyProfileDto
  ) {
    return this._organizationService.upsertCompanyProfile(org.id, body);
  }

  @Post('/company-profiles')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async updateCompanyProfiles(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CompanyProfileDto
  ) {
    return this._organizationService.upsertCompanyProfile(org.id, body);
  }

  @Delete('/company-profiles/:id')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async deleteCompanyProfile(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._organizationService.deleteCompanyProfile(org.id, id);
  }

  @Post('/company-profile/generate-summary')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async generateCompanySummary(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CompanyProfileSummaryDto
  ) {
    return this._organizationService.generateCompanySummary(org.id, body);
  }

  @Post('/company-profiles/generate-summary')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async generateCompanyProfileSummary(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CompanyProfileSummaryDto
  ) {
    return this._organizationService.generateCompanySummary(org.id, body);
  }

  @Post('/company-profiles/generate-visual-identity')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async generateCompanyVisualIdentity(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CompanyProfileDto
  ) {
    return this._organizationService.generateCompanyVisualIdentity(org.id, body);
  }
}
