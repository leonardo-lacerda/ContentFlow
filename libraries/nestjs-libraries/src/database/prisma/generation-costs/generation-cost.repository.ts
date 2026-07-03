import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class GenerationCostRepository {
  constructor(private prisma: PrismaService) {}

  create(data: {
    organizationId: string;
    generationJobId?: string;
    type: string;
    label: string;
    costUsd: number;
    costBrl: number;
    usdToBrl: number;
    tokens: Record<string, number>;
    provider?: string;
    model?: string;
  }) {
    return this.prisma.generationCost.create({ data });
  }

  findByOrganization(orgId: string, options?: { includeEstimates?: boolean }) {
    const where: any = { organizationId: orgId };
    if (!options?.includeEstimates) {
      where.type = { not: 'estimate' };
    }
    return this.prisma.generationCost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  aggregateTotals(orgId: string) {
    return this.prisma.generationCost.aggregate({
      where: { organizationId: orgId, type: { not: 'estimate' } },
      _sum: { costUsd: true, costBrl: true },
    });
  }

  aggregateTokenTotals(orgId: string): Promise<{ totalTokens: number } | null> {
    return this.prisma.$queryRaw<{ totalTokens: number }[]>`
      SELECT COALESCE(SUM((tokens->>'totalTokens')::int), 0) as "totalTokens"
      FROM "GenerationCost"
      WHERE "organizationId" = ${orgId} AND type != 'estimate'
    `.then(rows => rows[0] ?? null);
  }
}
