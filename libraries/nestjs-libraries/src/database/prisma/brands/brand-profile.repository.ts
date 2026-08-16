import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { BrandProfileStatus } from '@prisma/client';

@Injectable()
export class BrandProfileRepository {
  constructor(private prisma: PrismaService) {}

  findByOrganization(orgId: string) {
    return this.prisma.brandProfile.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string, orgId: string) {
    return this.prisma.brandProfile.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
  }

  findSelected(orgId: string) {
    return this.prisma.brandProfile.findFirst({
      where: { organizationId: orgId, selected: true, deletedAt: null },
    });
  }

  create(data: { organizationId: string; name: string; website?: string; industry?: string }) {
    return this.prisma.brandProfile.create({
      data: {
        ...data,
        status: BrandProfileStatus.DRAFT,
      },
    });
  }

  async update(id: string, orgId: string, data: { name?: string; website?: string; industry?: string; status?: BrandProfileStatus; selected?: boolean }) {
    const existing = await this.prisma.brandProfile.findFirst({ where: { id, organizationId: orgId, deletedAt: null } });
    if (!existing) throw new Error('Brand not found');
    return this.prisma.brandProfile.update({
      where: { id },
      data,
    });
  }

  /** Internal update by id only (used by extraction/jobs that already validated ownership). */
  async updateById(
    id: string,
    data: {
      name?: string;
      website?: string;
      industry?: string;
      status?: BrandProfileStatus;
      lastAnalysisError?: string | null;
      selected?: boolean;
    }
  ) {
    return this.prisma.brandProfile.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string, orgId: string) {
    const existing = await this.prisma.brandProfile.findFirst({ where: { id, organizationId: orgId, deletedAt: null } });
    if (!existing) throw new Error('Brand not found');
    return this.prisma.brandProfile.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async selectBrand(orgId: string, brandId: string) {
    const brand = await this.prisma.brandProfile.findFirst({
      where: { id: brandId, organizationId: orgId, deletedAt: null },
    });
    if (!brand) throw new Error('Brand not found');
    await this.prisma.brandProfile.updateMany({
      where: { organizationId: orgId, selected: true, deletedAt: null },
      data: { selected: false },
    });
    return this.prisma.brandProfile.update({
      where: { id: brandId },
      data: { selected: true },
    });
  }

  countByOrganization(orgId: string) {
    return this.prisma.brandProfile.count({
      where: { organizationId: orgId, deletedAt: null },
    });
  }

  async validateOwnership(brandId: string, orgId: string): Promise<boolean> {
    const brand = await this.prisma.brandProfile.findFirst({
      where: { id: brandId, organizationId: orgId, deletedAt: null },
    });
    return !!brand;
  }
}
