import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SocialPostGenerateService } from '../social-post-generate.service';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';
import { ContentIdeaService } from '@gitroom/nestjs-libraries/database/prisma/content-ideas/content-idea.service';
import { CarouselProjectService } from '@gitroom/nestjs-libraries/database/prisma/carousel-projects/carousel-project.service';
import { GenerationJobService } from '@gitroom/nestjs-libraries/database/prisma/generation-jobs/generation-job.service';
import { PlanLimitsService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/plan-limits.service';

describe('SocialPostGenerateService', () => {
  let service: SocialPostGenerateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialPostGenerateService,
        { provide: BrandProfileService, useValue: { getBrandProfile: jest.fn() } },
        { provide: ContentIdeaService, useValue: { getContentIdea: jest.fn() } },
        { provide: CarouselProjectService, useValue: { getProject: jest.fn() } },
        { provide: GenerationJobService, useValue: { createJob: jest.fn() } },
        { provide: PlanLimitsService, useValue: { enforceLimit: jest.fn() } },
      ],
    }).compile();

    service = module.get<SocialPostGenerateService>(SocialPostGenerateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSocialPosts', () => {
    it('should throw BadRequestException when no input source provided', async () => {
      await expect(
        service.generateSocialPosts('org-1', {
          // No topic, no contentIdeaId, no carouselProjectId
        })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
