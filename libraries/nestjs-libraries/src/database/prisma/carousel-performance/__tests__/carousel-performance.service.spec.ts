import { Test, TestingModule } from '@nestjs/testing';
import { CarouselPerformanceService } from './carousel-performance.service';
import { CarouselPerformanceRepository } from './carousel-performance.repository';
import { RecommendationService } from '../brand-learning/recommendation.service';

describe('CarouselPerformanceService', () => {
  let service: CarouselPerformanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarouselPerformanceService,
        { provide: CarouselPerformanceRepository, useValue: {} },
        { provide: RecommendationService, useValue: {} },
      ],
    }).compile();

    service = module.get<CarouselPerformanceService>(CarouselPerformanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateNormalizedScore', () => {
    const baseData = {
      impressions: 10000,
      reach: 5000,
      saves: 50,
      shares: 30,
      comments: 20,
      clicks: 100,
      likes: 200,
      platform: 'instagram',
    };

    it('should return a score between 0 and 100', () => {
      const score = service.calculateNormalizedScore(baseData);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return higher score for higher engagement', () => {
      const lowEngagement = service.calculateNormalizedScore({
        ...baseData,
        saves: 5,
        shares: 2,
        comments: 1,
        likes: 20,
      });
      const highEngagement = service.calculateNormalizedScore({
        ...baseData,
        saves: 100,
        shares: 80,
        comments: 50,
        likes: 500,
      });
      expect(highEngagement).toBeGreaterThan(lowEngagement);
    });

    it('should return 0 for zero engagement', () => {
      const score = service.calculateNormalizedScore({
        impressions: 0,
        reach: 0,
        saves: 0,
        shares: 0,
        comments: 0,
        clicks: 0,
        likes: 0,
        platform: 'instagram',
      });
      expect(score).toBe(0);
    });

    it('should handle different platforms', () => {
      const instagramScore = service.calculateNormalizedScore({
        ...baseData,
        platform: 'instagram',
      });
      const linkedinScore = service.calculateNormalizedScore({
        ...baseData,
        platform: 'linkedin',
      });
      // Different platforms have different weights, so scores should differ
      // (or at least not crash)
      expect(instagramScore).toBeGreaterThanOrEqual(0);
      expect(linkedinScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle unknown platform with default weights', () => {
      const score = service.calculateNormalizedScore({
        ...baseData,
        platform: 'unknown-platform',
      });
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give volume bonus for high impressions', () => {
      const lowImpressions = service.calculateNormalizedScore({
        ...baseData,
        impressions: 100,
        reach: 50,
      });
      const highImpressions = service.calculateNormalizedScore({
        ...baseData,
        impressions: 1000000,
        reach: 500000,
      });
      expect(highImpressions).toBeGreaterThan(lowImpressions);
    });

    it('should give reach efficiency bonus', () => {
      const lowReach = service.calculateNormalizedScore({
        ...baseData,
        impressions: 10000,
        reach: 1000, // 10% reach rate
      });
      const highReach = service.calculateNormalizedScore({
        ...baseData,
        impressions: 10000,
        reach: 9000, // 90% reach rate
      });
      expect(highReach).toBeGreaterThan(lowReach);
    });

    it('should round to 1 decimal place', () => {
      const score = service.calculateNormalizedScore(baseData);
      const decimalPlaces = score.toString().split('.')[1]?.length ?? 0;
      expect(decimalPlaces).toBeLessThanOrEqual(1);
    });
  });

  describe('getPlatformWeights', () => {
    it('should return weights for known platforms', () => {
      const instagramWeights = service.getPlatformWeights('instagram');
      expect(instagramWeights).toBeDefined();
      expect(instagramWeights.engagementDivisor).toBeGreaterThan(0);
    });

    it('should return default weights for unknown platform', () => {
      const weights = service.getPlatformWeights('unknown');
      expect(weights).toBeDefined();
      expect(weights.engagementDivisor).toBeGreaterThan(0);
    });

    it('should be case-insensitive', () => {
      const lower = service.getPlatformWeights('instagram');
      const upper = service.getPlatformWeights('INSTAGRAM');
      const mixed = service.getPlatformWeights('Instagram');
      expect(lower).toEqual(upper);
      expect(lower).toEqual(mixed);
    });
  });
});
