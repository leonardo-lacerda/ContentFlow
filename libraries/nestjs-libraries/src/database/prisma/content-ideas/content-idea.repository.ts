import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { ContentIdeaStatus } from '@prisma/client';

@Injectable()
export class ContentIdeaRepository {
  constructor(private prisma: PrismaService) {}

  findByOrganization(orgId: string) {
    return this.prisma.contentIdea.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByBrandProfile(orgId: string, brandProfileId: string, status?: ContentIdeaStatus) {
    return this.prisma.contentIdea.findMany({
      where: {
        organizationId: orgId,
        brandProfileId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string, orgId: string) {
    return this.prisma.contentIdea.findFirst({ where: { id, organizationId: orgId } });
  }

  create(data: {
    organizationId: string;
    brandProfileId: string;
    title: string;
    hook: string;
    goal: string;
    angle: string;
    templateSuggestion?: string;
    platformSuggestion?: string;
    score?: number;
  }) {
    return this.prisma.contentIdea.create({ data });
  }

  async updateStatus(id: string, orgId: string, status: ContentIdeaStatus, rejectionReason?: string) {
    const existing = await this.prisma.contentIdea.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new Error('Content idea not found');
    return this.prisma.contentIdea.update({
      where: { id },
      data: { status, rejectionReason },
    });
  }

  countByBrandAndStatus(brandProfileId: string, status: ContentIdeaStatus) {
    return this.prisma.contentIdea.count({
      where: { brandProfileId, status },
    });
  }

  findExistingTitles(brandProfileId: string) {
    return this.prisma.contentIdea.findMany({
      where: { brandProfileId },
      select: { title: true },
    });
  }
}
