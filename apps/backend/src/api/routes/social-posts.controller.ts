import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { SocialPostGenerateService } from '@gitroom/nestjs-libraries/ai-generate/social-post-generate.service';
import { GenerateSocialPostsDto } from '@gitroom/nestjs-libraries/dtos/ai-generate/generate-social-posts.dto';

@ApiTags('Social Posts')
@Controller('/social-posts')
export class SocialPostsController {
  constructor(
    private socialPostGenerateService: SocialPostGenerateService,
  ) {}

  @Post('/generate')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  @ApiOperation({
    summary: 'Generate platform-optimized social media posts',
    description:
      'Generates social media posts optimized for each selected platform. Supports standalone topic-based generation, content idea-based generation, and carousel-based generation.',
  })
  @ApiResponse({ status: 201, description: 'Posts generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Unauthorized' })
  async generatePosts(
    @GetOrgFromRequest() org: Organization,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    body: GenerateSocialPostsDto,
  ) {
    return this.socialPostGenerateService.generateSocialPosts(org.id, body);
  }

  @Get('/from-idea/:ideaId')
  @ApiOperation({ summary: 'Get generated posts linked to a content idea' })
  @ApiResponse({ status: 200, description: 'Posts retrieved' })
  async getPostsFromIdea(@Param('ideaId') ideaId: string) {
    return this.socialPostGenerateService.getPostsByContentIdea(ideaId);
  }

  @Get('/from-carousel/:carouselId')
  @ApiOperation({ summary: 'Get generated posts linked to a carousel project' })
  @ApiResponse({ status: 200, description: 'Posts retrieved' })
  async getPostsFromCarousel(@Param('carouselId') carouselId: string) {
    return this.socialPostGenerateService.getPostsByCarouselProject(carouselId);
  }
}
