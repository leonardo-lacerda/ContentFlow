import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class BrandDnaSnapshotRepository {
  constructor(private prisma: PrismaService) {}

  findByBrandProfile(brandProfileId: string) {
    return this.prisma.brandDnaSnapshot.findMany({
      where: { brandProfileId },
      orderBy: { version: 'desc' },
    });
  }

  findLatest(brandProfileId: string) {
    return this.prisma.brandDnaSnapshot.findFirst({
      where: { brandProfileId },
      orderBy: { version: 'desc' },
    });
  }

  create(data: {
    brandProfileId: string;
    version: number;
    sourceType: string;
    sourceUrl?: string;
    summary: any;
    voice: any;
    audience: any;
    offer: any;
    visual: any;
    constraints: any;
    confidence?: any;
    promptVersion: string;
    model: string;
  }) {
    return this.prisma.brandDnaSnapshot.create({ data });
  }
}
