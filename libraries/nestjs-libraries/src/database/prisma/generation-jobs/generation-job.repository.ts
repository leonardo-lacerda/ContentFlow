import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { GenerationJobStatus, GenerationJobType } from '@prisma/client';

@Injectable()
export class GenerationJobRepository {
  constructor(private prisma: PrismaService) {}

  findByOrganization(orgId: string) {
    return this.prisma.generationJob.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string, orgId: string) {
    return this.prisma.generationJob.findFirst({ where: { id, organizationId: orgId } });
  }

  findByIdempotencyKey(key: string) {
    return this.prisma.generationJob.findUnique({ where: { idempotencyKey: key } });
  }

  create(data: {
    organizationId: string;
    brandProfileId?: string;
    carouselProjectId?: string;
    type: GenerationJobType;
    idempotencyKey?: string;
    model?: string;
    provider?: string;
    promptVersion?: string;
    schemaVersion?: string;
    costEstimate?: number;
  }) {
    return this.prisma.generationJob.create({ data });
  }

  updateStatus(id: string, status: GenerationJobStatus) {
    const data: any = { status };
    if (status === 'RUNNING') data.startedAt = new Date();
    if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') {
      data.completedAt = new Date();
    }
    return this.prisma.generationJob.update({ where: { id }, data });
  }

  updateProgress(id: string, progress: any) {
    return this.prisma.generationJob.update({
      where: { id },
      data: { progress },
    });
  }

  complete(id: string, result: any, usage?: any) {
    return this.prisma.generationJob.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        result,
        usage,
        completedAt: new Date(),
      },
    });
  }

  fail(id: string, error: string) {
    return this.prisma.generationJob.update({
      where: { id },
      data: {
        status: 'FAILED',
        error,
        completedAt: new Date(),
      },
    });
  }

  cancel(id: string) {
    return this.prisma.generationJob.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });
  }

  countByOrgAndStatus(orgId: string, status: GenerationJobStatus) {
    return this.prisma.generationJob.count({
      where: { organizationId: orgId, status },
    });
  }
}
