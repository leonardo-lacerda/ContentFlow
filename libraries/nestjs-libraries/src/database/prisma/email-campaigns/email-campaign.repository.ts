import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { EmailCampaignType, EmailCampaignStatus, Prisma } from '@prisma/client';

@Injectable()
export class EmailCampaignRepository {
  constructor(private prisma: PrismaService) {}

  findByOrganization(orgId: string, type?: EmailCampaignType) {
    return this.prisma.emailCampaign.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.emailCampaign.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findByIdAndOrg(id: string, orgId: string) {
    return this.prisma.emailCampaign.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
  }

  findByBrand(brandProfileId: string, type?: EmailCampaignType) {
    return this.prisma.emailCampaign.findMany({
      where: {
        brandProfileId,
        deletedAt: null,
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findWelcomeSequence(orgId: string, brandProfileId: string) {
    return this.prisma.emailCampaign.findMany({
      where: {
        organizationId: orgId,
        brandProfileId,
        type: 'WELCOME_SEQUENCE',
        deletedAt: null,
      },
      orderBy: { sequenceIndex: 'asc' },
    });
  }

  create(data: Prisma.EmailCampaignCreateInput) {
    return this.prisma.emailCampaign.create({ data });
  }

  update(id: string, data: Prisma.EmailCampaignUpdateInput) {
    return this.prisma.emailCampaign.update({
      where: { id },
      data,
    });
  }

  updateHtml(id: string, html: string, bodyJson?: any) {
    return this.prisma.emailCampaign.update({
      where: { id },
      data: {
        bodyHtml: html,
        ...(bodyJson ? { bodyJson } : {}),
        status: 'READY',
      },
    });
  }

  updateStatus(id: string, status: EmailCampaignStatus) {
    return this.prisma.emailCampaign.update({
      where: { id },
      data: { status },
    });
  }

  incrementExport(id: string) {
    return this.prisma.emailCampaign.update({
      where: { id },
      data: {
        exportCount: { increment: 1 },
        lastExportedAt: new Date(),
        status: 'EXPORTED',
      },
    });
  }

  softDelete(id: string) {
    return this.prisma.emailCampaign.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
