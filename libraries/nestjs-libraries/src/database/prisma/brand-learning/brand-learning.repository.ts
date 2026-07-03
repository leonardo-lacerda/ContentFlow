import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { BrandLearningStatus, BrandLearningType } from '@prisma/client';

@Injectable()
export class BrandLearningRepository {
  constructor(private prisma: PrismaService) {}

  findByBrand(brandProfileId: string, status?: BrandLearningStatus) {
    return this.prisma.brandLearning.findMany({
      where: {
        brandProfileId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByOrganization(organizationId: string) {
    return this.prisma.brandLearning.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.brandLearning.findUnique({ where: { id } });
  }

  create(data: {
    brandProfileId: string;
    organizationId: string;
    type: BrandLearningType;
    title: string;
    description: string;
    evidence?: any;
    confidence?: number;
    metadata?: any;
  }) {
    return this.prisma.brandLearning.create({ data });
  }

  update(id: string, data: {
    title?: string;
    description?: string;
    evidence?: any;
    confidence?: number;
    metadata?: any;
  }) {
    return this.prisma.brandLearning.update({ where: { id }, data });
  }

  approve(id: string) {
    return this.prisma.brandLearning.update({
      where: { id },
      data: { status: BrandLearningStatus.APPROVED },
    });
  }

  reject(id: string) {
    return this.prisma.brandLearning.update({
      where: { id },
      data: { status: BrandLearningStatus.REJECTED },
    });
  }

  apply(id: string, version: number) {
    return this.prisma.brandLearning.update({
      where: { id },
      data: {
        status: BrandLearningStatus.APPLIED,
        appliedAt: new Date(),
        appliedVersion: version,
      },
    });
  }

  getByType(brandProfileId: string, type: BrandLearningType) {
    return this.prisma.brandLearning.findMany({
      where: { brandProfileId, type },
      orderBy: { createdAt: 'desc' },
    });
  }

  countByStatus(brandProfileId: string) {
    return this.prisma.brandLearning.groupBy({
      by: ['status'],
      where: { brandProfileId },
      _count: { status: true },
    });
  }
}
