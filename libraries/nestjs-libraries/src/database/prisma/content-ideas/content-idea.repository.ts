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

  findByBrandProfile(brandProfileId: string, status?: ContentIdeaStatus) {
    return this.prisma.contentIdea.findMany({
      where: {
        brandProfileId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.contentIdea.findUnique({ where: { id } });
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

  updateStatus(id: string, status: ContentIdeaStatus, rejectionReason?: string) {
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
