import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class BrandAssetRepository {
  constructor(private prisma: PrismaService) {}

  findByBrandProfile(brandProfileId: string, type?: string) {
    return this.prisma.brandAsset.findMany({
      where: {
        brandProfileId,
        deletedAt: null,
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: {
    brandProfileId: string;
    type: string;
    mediaId?: string;
    sourceUrl?: string;
    metadata?: any;
  }) {
    return this.prisma.brandAsset.create({ data });
  }

  async approve(id: string, brandProfileId: string) {
    const existing = await this.prisma.brandAsset.findFirst({
      where: { id, brandProfileId, deletedAt: null },
    });
    if (!existing) throw new Error('Brand asset not found');
    return this.prisma.brandAsset.update({
      where: { id },
      data: { approved: true },
    });
  }

  async softDelete(id: string, brandProfileId: string) {
    const existing = await this.prisma.brandAsset.findFirst({
      where: { id, brandProfileId, deletedAt: null },
    });
    if (!existing) throw new Error('Brand asset not found');
    return this.prisma.brandAsset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
