import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreativeRightsStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class CreativeRightsService {
  constructor(private readonly prisma: PrismaService) {}

  async grant(organizationId: string, input: {
    resourceType: string;
    resourceId: string;
    status?: CreativeRightsStatus;
    consentReference?: string;
    scope?: Record<string, unknown>;
    expiresAt?: string;
  }) {
    if (!input.resourceType || !input.resourceId || !input.consentReference) {
      throw new BadRequestException('resourceType, resourceId and consentReference are required');
    }
    await this.assertResourceOwned(organizationId, input.resourceType, input.resourceId);
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) throw new BadRequestException('Invalid rights expiration date');
    const grant = await this.prisma.creativeRightsGrant.create({
      data: {
        organizationId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        status: input.status || CreativeRightsStatus.APPROVED,
        consentReference: input.consentReference,
        scope: input.scope as Prisma.InputJsonValue,
        expiresAt,
      },
    });
    await this.syncResourceStatus(organizationId, input.resourceType, input.resourceId, grant.status);
    return grant;
  }

  async list(organizationId: string, resourceType?: string, resourceId?: string) {
    return this.prisma.creativeRightsGrant.findMany({
      where: { organizationId, ...(resourceType ? { resourceType } : {}), ...(resourceId ? { resourceId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(id: string, organizationId: string, reason?: string) {
    const grant = await this.prisma.creativeRightsGrant.findFirst({ where: { id, organizationId } });
    if (!grant) throw new NotFoundException('Rights grant not found');
    const updated = await this.prisma.creativeRightsGrant.update({ where: { id }, data: { status: CreativeRightsStatus.REVOKED, revokedAt: new Date(), metadata: { ...(grant.metadata as any || {}), reason } as Prisma.InputJsonValue } });
    await this.syncResourceStatus(organizationId, grant.resourceType, grant.resourceId, CreativeRightsStatus.REVOKED);
    return updated;
  }

  private async syncResourceStatus(organizationId: string, resourceType: string, resourceId: string, status: CreativeRightsStatus) {
    if (resourceType === 'actor') await this.prisma.creativeActor.updateMany({ where: { id: resourceId, organizationId }, data: { rightsStatus: status } });
    if (resourceType === 'voice') await this.prisma.creativeVoice.updateMany({ where: { id: resourceId, organizationId }, data: { rightsStatus: status } });
    if (resourceType === 'asset') await this.prisma.creativeAsset.updateMany({ where: { id: resourceId, organizationId }, data: { rightsStatus: status } });
  }

  private async assertResourceOwned(organizationId: string, resourceType: string, resourceId: string) {
    if (resourceType === 'actor') {
      const resource = await this.prisma.creativeActor.findFirst({ where: { id: resourceId, organizationId, deletedAt: null }, select: { id: true } });
      if (!resource) throw new NotFoundException('Creative actor not found');
      return;
    }
    if (resourceType === 'voice') {
      const resource = await this.prisma.creativeVoice.findFirst({ where: { id: resourceId, organizationId, deletedAt: null }, select: { id: true } });
      if (!resource) throw new NotFoundException('Creative voice not found');
      return;
    }
    if (resourceType === 'asset') {
      const resource = await this.prisma.creativeAsset.findFirst({ where: { id: resourceId, organizationId, deletedAt: null }, select: { id: true } });
      if (!resource) throw new NotFoundException('Creative asset not found');
      return;
    }
    throw new BadRequestException('Rights can only be granted to an actor, voice or asset');
  }
}
