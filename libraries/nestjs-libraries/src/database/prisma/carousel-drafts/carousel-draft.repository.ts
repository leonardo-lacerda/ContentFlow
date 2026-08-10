import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CarouselDraftRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    organizationId: string;
    brandProfileId?: string;
    status?: string;
    data: Record<string, unknown>;
  }) {
    return this.prisma.carouselDraft.create({
      data: {
        organizationId: data.organizationId,
        brandProfileId: data.brandProfileId,
        status: data.status,
        data: data.data as Prisma.InputJsonValue,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.carouselDraft.findUnique({ where: { id } });
  }

  async findByIdAndOrg(id: string, organizationId: string) {
    return this.prisma.carouselDraft.findFirst({
      where: { id, organizationId },
    });
  }

  async findByOrganization(organizationId: string) {
    return this.prisma.carouselDraft.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        brandProfileId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(id: string, organizationId: string, data: {
    status?: string;
    data?: Record<string, unknown>;
  }) {
    return this.prisma.carouselDraft.updateMany({
      where: { id, organizationId },
      data: {
        status: data.status,
        data: data.data as Prisma.InputJsonValue | undefined,
        updatedAt: new Date(),
      },
    });
  }

  async upsertByOrg(organizationId: string, draftData: {
    id?: string;
    brandProfileId?: string;
    status?: string;
    data: Record<string, unknown>;
  }) {
    if (draftData.id) {
      const existing = await this.findByIdAndOrg(draftData.id, organizationId);
      if (existing) {
        await this.update(draftData.id, organizationId, {
          status: draftData.status,
          data: draftData.data,
        });
        return this.findById(draftData.id);
      }
    }
    return this.create({
      organizationId,
      brandProfileId: draftData.brandProfileId,
      status: draftData.status,
      data: draftData.data,
    });
  }

  async delete(id: string, organizationId: string) {
    return this.prisma.carouselDraft.deleteMany({
      where: { id, organizationId },
    });
  }
}
