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

  approve(id: string) {
    return this.prisma.brandAsset.update({
      where: { id },
      data: { approved: true },
    });
  }

  softDelete(id: string) {
    return this.prisma.brandAsset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
