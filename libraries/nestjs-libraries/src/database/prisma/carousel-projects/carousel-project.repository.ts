import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { CarouselProjectStatus } from '@prisma/client';

@Injectable()
export class CarouselProjectRepository {
  constructor(private prisma: PrismaService) {}

  findByOrganization(orgId: string) {
    return this.prisma.carouselProject.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByBrandProfile(brandProfileId: string, status?: CarouselProjectStatus) {
    return this.prisma.carouselProject.findMany({
      where: {
        brandProfileId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.carouselProject.findUnique({ where: { id } });
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

  update(id: string, data: {
    title?: string;
    slides?: any;
    caption?: string;
    hashtags?: string[];
    status?: CarouselProjectStatus;
    metadata?: any;
    approvalStatus?: string;
    approvedBy?: string;
    approvedAt?: Date;
    rejectionReason?: string;
  }) {
    return this.prisma.carouselProject.update({
      where: { id },
      data,
    });
  }

  updateStatus(id: string, status: CarouselProjectStatus) {
    return this.prisma.carouselProject.update({
      where: { id },
      data: { status },
    });
  }

  countByBrandAndStatus(brandProfileId: string, status: CarouselProjectStatus) {
    return this.prisma.carouselProject.count({
      where: { brandProfileId, status },
    });
  }
}
