import { Injectable } from '@nestjs/common';
import { GenerationCostRepository } from './generation-cost.repository';

@Injectable()
export class GenerationCostService {
  constructor(private generationCostRepository: GenerationCostRepository) {}

  async recordCost(data: {
    organizationId: string;
    generationJobId?: string;
    type: 'text' | 'image' | 'estimate';
    label: string;
    costUsd: number;
    costBrl: number;
    usdToBrl: number;
    tokens: Record<string, number>;
    provider?: string;
    model?: string;
  }) {
    return this.generationCostRepository.create(data);
  }

  async getCostHistory(orgId: string) {
    const [entries, sumResult, tokenResult] = await Promise.all([
      this.generationCostRepository.findByOrganization(orgId, { includeEstimates: false }),
      this.generationCostRepository.aggregateTotals(orgId),
      this.generationCostRepository.aggregateTokenTotals(orgId),
    ]);

    const totalUsd = sumResult._sum.costUsd ?? 0;
    const totalBrl = sumResult._sum.costBrl ?? 0;
    const totalTokens = tokenResult?.totalTokens ?? 0;

    return {
      entries: entries.map((entry) => ({
        id: entry.id,
        type: entry.type as 'text' | 'image' | 'estimate',
        label: entry.label,
        createdAt: entry.createdAt.toISOString(),
        cost: {
          usd: entry.costUsd,
          brl: entry.costBrl,
          usdToBrl: entry.usdToBrl,
          tokens: entry.tokens,
        },
      })),
      totals: {
        usd: Number(totalUsd.toFixed(6)),
        brl: Number(totalBrl.toFixed(6)),
        tokens: totalTokens,
      },
    };
  }
}
