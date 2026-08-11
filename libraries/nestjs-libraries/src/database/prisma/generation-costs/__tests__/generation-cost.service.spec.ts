import { Test, TestingModule } from '@nestjs/testing';
import { GenerationCostService } from '../generation-cost.service';
import { GenerationCostRepository } from '../generation-cost.repository';

describe('GenerationCostService', () => {
  let service: GenerationCostService;
  let repository: jest.Mocked<GenerationCostRepository>;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findByOrganization: jest.fn(),
      aggregateTotals: jest.fn(),
      aggregateTokenTotals: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerationCostService,
        { provide: GenerationCostRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<GenerationCostService>(GenerationCostService);
    repository = module.get(GenerationCostRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordCost', () => {
    it('should delegate to repository.create', async () => {
      const data = {
        organizationId: 'org-1',
        type: 'text' as const,
        label: 'Carousel plan generation',
        costUsd: 0.05,
        costBrl: 0.25,
        usdToBrl: 5.0,
        tokens: { textInputTokens: 1000, textOutputTokens: 500 },
        provider: 'openai',
        model: 'gpt-4o',
      };
      repository.create.mockResolvedValue({ id: 'cost-1', ...data });

      const result = await service.recordCost(data);

      expect(repository.create).toHaveBeenCalledWith(data);
      expect(result.id).toBe('cost-1');
    });
  });

  describe('getCostHistory', () => {
    it('should return entries and totals', async () => {
      const entries = [
        {
          id: 'cost-1',
          type: 'text',
          label: 'Plan generation',
          createdAt: new Date('2026-07-03'),
          costUsd: 0.05,
          costBrl: 0.25,
          usdToBrl: 5.0,
          tokens: { totalTokens: 1500 },
        },
      ];
      repository.findByOrganization.mockResolvedValue(entries);
      repository.aggregateTotals.mockResolvedValue({
        _sum: { costUsd: 0.05, costBrl: 0.25 },
      });
      repository.aggregateTokenTotals.mockResolvedValue({ totalTokens: 1500 });

      const result = await service.getCostHistory('org-1');

      expect(result.entries).toHaveLength(1);
      expect(result.totals.usd).toBe(0.05);
      expect(result.totals.brl).toBe(0.25);
      expect(result.totals.tokens).toBe(1500);
    });

    it('should handle empty history', async () => {
      repository.findByOrganization.mockResolvedValue([]);
      repository.aggregateTotals.mockResolvedValue({ _sum: {} });
      repository.aggregateTokenTotals.mockResolvedValue(null);

      const result = await service.getCostHistory('org-1');

      expect(result.entries).toHaveLength(0);
      expect(result.totals.usd).toBe(0);
      expect(result.totals.brl).toBe(0);
      expect(result.totals.tokens).toBe(0);
    });

    it('should coerce BigInt token totals for JSON serialization', async () => {
      repository.findByOrganization.mockResolvedValue([]);
      repository.aggregateTotals.mockResolvedValue({
        _sum: { costUsd: 1.5, costBrl: 8.25 },
      });
      repository.aggregateTokenTotals.mockResolvedValue({
        totalTokens: 42n as unknown as number,
      });

      const result = await service.getCostHistory('org-1');

      expect(result.totals.tokens).toBe(42);
      expect(() => JSON.stringify(result)).not.toThrow();
    });
  });
});
