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

    // Prisma Decimal / pg BigInt are not JSON-serializable as-is.
    const toNum = (value: unknown): number => {
      if (value == null) return 0;
      if (typeof value === 'bigint') return Number(value);
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      if (
        typeof value === 'object' &&
        value !== null &&
        'toNumber' in value &&
        typeof (value as { toNumber: () => number }).toNumber === 'function'
      ) {
        return (value as { toNumber: () => number }).toNumber();
      }
      const parsed = Number(value as any);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const totalUsd = toNum(sumResult._sum.costUsd);
    const totalBrl = toNum(sumResult._sum.costBrl);
    const totalTokens = toNum(tokenResult?.totalTokens);

    return {
      entries: entries.map((entry) => ({
        id: entry.id,
        type: entry.type as 'text' | 'image' | 'estimate',
        label: entry.label,
        createdAt: entry.createdAt.toISOString(),
        cost: {
          usd: toNum(entry.costUsd),
          brl: toNum(entry.costBrl),
          usdToBrl: toNum(entry.usdToBrl),
          tokens: entry.tokens ?? {},
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
