import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { BrandLearningStatus, BrandLearningType } from '@prisma/client';

@Injectable()
export class BrandLearningRepository {
  constructor(private prisma: PrismaService) {}

  findByBrand(orgId: string, brandProfileId: string, status?: BrandLearningStatus) {
    return this.prisma.brandLearning.findMany({
      where: {
        organizationId: orgId,
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

  findById(id: string, organizationId: string) {
    return this.prisma.brandLearning.findFirst({ where: { id, organizationId } });
  }

  async assertBrandOwnership(brandProfileId: string, organizationId: string) {
    const brand = await this.prisma.brandProfile.findFirst({
      where: { id: brandProfileId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!brand) throw new Error('Brand not found or access denied');
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

  async approve(id: string, organizationId: string) {
    const existing = await this.findById(id, organizationId);
    if (!existing) throw new Error('Brand learning not found');
    return this.prisma.brandLearning.update({
      where: { id },
      data: { status: BrandLearningStatus.APPROVED },
    });
  }

  async reject(id: string, organizationId: string) {
    const existing = await this.findById(id, organizationId);
    if (!existing) throw new Error('Brand learning not found');
    return this.prisma.brandLearning.update({
      where: { id },
      data: { status: BrandLearningStatus.REJECTED },
    });
  }

  async apply(id: string, organizationId: string, version: number) {
    const existing = await this.findById(id, organizationId);
    if (!existing) throw new Error('Brand learning not found');
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

  countByStatus(brandProfileId: string, organizationId: string) {
    return this.prisma.brandLearning.groupBy({
      by: ['status'],
      where: { brandProfileId, organizationId },
      _count: { status: true },
    });
  }
}
