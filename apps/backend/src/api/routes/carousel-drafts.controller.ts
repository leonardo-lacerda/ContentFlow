import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org-from-request';
import { Organization } from '@prisma/client';
import { CarouselDraftService } from '@gitroom/nestjs-libraries/database/prisma/carousel-drafts/carousel-draft.service';
import { SaveCarouselDraftDto } from '@gitroom/nestjs-libraries/dtos/carousel-drafts/save-carousel-draft.dto';
import { PoliciesGuard } from '@gitroom/nestjs-libraries/authorization/policies.guard';
import { CheckPolicies } from '@gitroom/nestjs-libraries/authorization/policy.decorator';
import { Action, AppAbility } from '@gitroom/nestjs-libraries/authorization/ability.factory';

@ApiTags('Carousel Drafts')
@Controller('/carousel-drafts')
@UseGuards(PoliciesGuard)
export class CarouselDraftsController {
  constructor(private carouselDraftService: CarouselDraftService) {}

  @Put()
  @ApiOperation({ summary: 'Save or update a carousel draft' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Create, 'Post'))
  async saveDraft(
    @GetOrgFromRequest() org: Organization,
    @Body() body: SaveCarouselDraftDto
  ) {
    return this.carouselDraftService.saveDraft(org.id, body);
  }

  @Get()
  @ApiOperation({ summary: 'List all carousel drafts for the organization' })
  async listDrafts(@GetOrgFromRequest() org: Organization) {
    return this.carouselDraftService.listDrafts(org.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single carousel draft' })
  async getDraft(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.carouselDraftService.getDraft(org.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a carousel draft' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Delete, 'Post'))
  async deleteDraft(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.carouselDraftService.deleteDraft(org.id, id);
  }
}
