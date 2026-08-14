import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { ApprovalStatus, CarouselProjectStatus } from '@prisma/client';

@Injectable()
export class CarouselProjectRepository {
  constructor(private prisma: PrismaService) {}

  findByOrganization(orgId: string) {
    return this.prisma.carouselProject.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByBrandProfile(orgId: string, brandProfileId: string, status?: CarouselProjectStatus) {
    return this.prisma.carouselProject.findMany({
      where: {
        organizationId: orgId,
        brandProfileId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string, orgId: string) {
    return this.prisma.carouselProject.findFirst({ where: { id, organizationId: orgId } });
  }

  create(data: {
    organizationId: string;
    brandProfileId: string;
    contentIdeaId?: string;
    title: string;
    slides: any;
    caption?: string;
    hashtags?: string[];
    metadata?: any;
  }) {
    return this.prisma.carouselProject.create({ data });
  }

  async update(id: string, orgId: string, data: {
    title?: string;
    slides?: any;
    caption?: string;
    hashtags?: string[];
    status?: CarouselProjectStatus;
    metadata?: any;
    approvalStatus?: ApprovalStatus;
    approvedBy?: string;
    approvedAt?: Date;
    rejectionReason?: string;
  }) {
    const existing = await this.prisma.carouselProject.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new Error('Carousel project not found');
    return this.prisma.carouselProject.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id: string, orgId: string, status: CarouselProjectStatus) {
    const existing = await this.prisma.carouselProject.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new Error('Carousel project not found');
    return this.prisma.carouselProject.update({
      where: { id },
      data: { status },
    });
  }

  countByBrandAndStatus(orgId: string, brandProfileId: string, status: CarouselProjectStatus) {
    return this.prisma.carouselProject.count({
      where: { organizationId: orgId, brandProfileId, status },
    });
  }
}
