import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { AiGenerateService } from '@gitroom/nestjs-libraries/ai-generate/ai-generate.service';
import { AiGenerateCarouselDto } from '@gitroom/nestjs-libraries/dtos/ai-generate/ai-generate-carousel.dto';
import { AiGenerateCarouselIdeasDto } from '@gitroom/nestjs-libraries/dtos/ai-generate/ai-generate-carousel-ideas.dto';
import { AiGenerateImageDto } from '@gitroom/nestjs-libraries/dtos/ai-generate/ai-generate-image.dto';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';

@ApiTags('AI Generate')
@Controller('/ai-generate')
export class AiGenerateController {
  constructor(private _aiGenerateService: AiGenerateService) {}

  @Post('/images')
  generateImage(
    @GetOrgFromRequest() org: Organization,
    @Body() body: AiGenerateImageDto
  ) {
    return this._aiGenerateService.generateImage(org.id, body);
  }

  @Post('/carousel-plan')
  generateCarouselPlan(
    @GetOrgFromRequest() org: Organization,
    @Body() body: AiGenerateCarouselDto
  ) {
    return this._aiGenerateService.generateCarouselPlan(org.id, body);
  }

  @Post('/carousel-ideas')
  generateCarouselIdeas(
    @GetOrgFromRequest() org: Organization,
    @Body() body: AiGenerateCarouselIdeasDto
  ) {
    return this._aiGenerateService.generateCarouselIdeas(org.id, body);
  }

  @Post('/carousel-review')
  reviewCarousel(
    @GetOrgFromRequest() org: Organization,
    @Body() body: AiGenerateCarouselDto
  ) {
    return this._aiGenerateService.reviewCarousel(org.id, body);
  }

  @Post('/carousel-fix')
  fixCarousel(
    @GetOrgFromRequest() org: Organization,
    @Body() body: AiGenerateCarouselDto
  ) {
    return this._aiGenerateService.fixCarouselWithEditorialReview(org.id, body);
  }

  @Post('/cost-estimate')
  estimateCosts(
    @GetOrgFromRequest() org: Organization,
    @Body()
    body: {
      slideCount?: number;
      referenceCount?: number;
      promptChars?: number;
    }
  ) {
    return this._aiGenerateService.estimateCarouselCosts(org.id, body);
  }

  @Get('/cost-history')
  getCostHistory(@GetOrgFromRequest() org: Organization) {
    return this._aiGenerateService.getCostHistory(org.id);
  }

  @Post('/carousel-image-jobs')
  startCarouselImageJob(
    @GetOrgFromRequest() org: Organization,
    @Body()
    body: {
      slides?: Array<{
        slideIndex?: number;
        request?: AiGenerateImageDto;
      }>;
    }
  ) {
    return this._aiGenerateService.startCarouselImageJob(org.id, body);
  }

  @Get('/carousel-image-jobs/:id')
  getCarouselImageJob(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._aiGenerateService.getCarouselImageJob(org.id, id);
  }
}
