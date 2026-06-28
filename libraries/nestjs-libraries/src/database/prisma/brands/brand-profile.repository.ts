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

  findById(id: string) {
    return this.prisma.brandProfile.findFirst({
      where: { id, deletedAt: null },
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

  update(id: string, data: { name?: string; website?: string; industry?: string; status?: BrandProfileStatus; selected?: boolean }) {
    return this.prisma.brandProfile.update({
      where: { id },
      data,
    });
  }

  softDelete(id: string) {
    return this.prisma.brandProfile.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async selectBrand(orgId: string, brandId: string) {
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
