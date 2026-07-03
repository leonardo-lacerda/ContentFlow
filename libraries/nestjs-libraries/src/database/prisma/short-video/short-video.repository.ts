import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { ShortVideoStatus, ShortVideoFormat } from '@prisma/client';

@Injectable()
export class ShortVideoRepository {
  constructor(private prisma: PrismaService) {}

  findByOrganization(orgId: string) {
    return this.prisma.shortVideoProject.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        carouselProject: { select: { id: true, title: true } },
        brandProfile: { select: { id: true, name: true } },
      },
    });
  }

  findByBrandProfile(brandProfileId: string, status?: ShortVideoStatus) {
    return this.prisma.shortVideoProject.findMany({
      where: {
        brandProfileId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        carouselProject: { select: { id: true, title: true } },
      },
    });
  }

  findById(id: string, orgId: string) {
    return this.prisma.shortVideoProject.findFirst({
      where: { id, organizationId: orgId },
      include: {
        carouselProject: true,
        brandProfile: { select: { id: true, name: true } },
      },
    });
  }

  create(data: {
    organizationId: string;
    brandProfileId: string;
    carouselProjectId: string;
    contentIdeaId?: string;
    name: string;
    format?: ShortVideoFormat;
    maxDurationSec?: number;
    aspectRatio?: string;
  }) {
    return this.prisma.shortVideoProject.create({ data });
  }

  update(id: string, orgId: string, data: {
    name?: string;
    format?: ShortVideoFormat;
    status?: ShortVideoStatus;
    aspectRatio?: string;
    maxDurationSec?: number;
    script?: any;
    totalDurationSec?: number;
    videoUrl?: string;
    thumbnailUrl?: string;
    renderProvider?: string;
    renderJobId?: string;
    scriptCostEstimate?: number;
    renderCostEstimate?: number;
    totalCostEstimate?: number;
    renderCostActual?: number;
    metadata?: any;
  }) {
    return this.prisma.shortVideoProject.update({
      where: { id },
      data,
    });
  }

  updateStatus(id: string, orgId: string, status: ShortVideoStatus) {
    return this.prisma.shortVideoProject.update({
      where: { id },
      data: { status },
    });
  }

  delete(id: string, orgId: string) {
    return this.prisma.shortVideoProject.delete({
      where: { id },
    });
  }

  countByOrgAndStatus(orgId: string, status: ShortVideoStatus) {
    return this.prisma.shortVideoProject.count({
      where: { organizationId: orgId, status },
    });
  }
}
