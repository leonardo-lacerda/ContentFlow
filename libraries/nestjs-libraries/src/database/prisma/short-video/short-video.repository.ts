import { Injectable, NotFoundException } from '@nestjs/common';
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

  findByBrandProfile(orgId: string, brandProfileId: string, status?: ShortVideoStatus) {
    return this.prisma.shortVideoProject.findMany({
      where: {
        organizationId: orgId,
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
    carouselProjectId?: string | null;
    contentIdeaId?: string | null;
    name: string;
    format?: ShortVideoFormat;
    maxDurationSec?: number;
    aspectRatio?: string;
  }) {
    return this.prisma.shortVideoProject.create({
      data: {
        organizationId: data.organizationId,
        brandProfileId: data.brandProfileId,
        carouselProjectId: data.carouselProjectId || null,
        contentIdeaId: data.contentIdeaId || null,
        name: data.name,
        format: data.format,
        maxDurationSec: data.maxDurationSec,
        aspectRatio: data.aspectRatio,
      },
    });
  }

  async update(id: string, orgId: string, data: {
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
    const existing = await this.prisma.shortVideoProject.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Short video project not found');
    return this.prisma.shortVideoProject.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id: string, orgId: string, status: ShortVideoStatus) {
    const existing = await this.prisma.shortVideoProject.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Short video project not found');
    return this.prisma.shortVideoProject.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: string, orgId: string) {
    const existing = await this.prisma.shortVideoProject.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Short video project not found');
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
