import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

type JsonRecord = Record<string, unknown>;

const toJson = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;

@Injectable()
export class StudioArtifactService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    organizationId: string,
    filters: { threadId?: string; type?: string; includeArchived?: boolean } = {},
  ) {
    return this.prisma.studioArtifact.findMany({
      where: {
        organizationId,
        ...(filters.threadId ? { threadId: filters.threadId } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.includeArchived ? {} : { archivedAt: null }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: {
        versions: { orderBy: { version: 'desc' }, take: 1 },
        attachments: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async get(id: string, organizationId: string) {
    const artifact = await this.prisma.studioArtifact.findFirst({
      where: { id, organizationId },
      include: {
        versions: { orderBy: { version: 'desc' } },
        events: { orderBy: { createdAt: 'desc' }, take: 100 },
        attachments: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!artifact) throw new NotFoundException('Studio artifact not found');
    return artifact;
  }

  async create(
    organizationId: string,
    input: {
      threadId?: string;
      type: string;
      title: string;
      status?: string;
      content: unknown;
      source?: string;
      brandProfileId?: string;
      metadata?: JsonRecord;
      createdBy?: string;
    },
  ) {
    if (!input.type?.trim() || !input.title?.trim()) {
      throw new BadRequestException('Artifact type and title are required');
    }
    return this.prisma.$transaction(async (tx) => {
      const artifact = await tx.studioArtifact.create({
        data: {
          organizationId,
          threadId: input.threadId,
          type: input.type.trim().toUpperCase(),
          title: input.title.trim(),
          status: input.status || 'DRAFT',
          content: toJson(input.content),
          source: input.source,
          brandProfileId: input.brandProfileId,
          metadata: input.metadata ? toJson(input.metadata) : undefined,
        },
      });
      await tx.studioArtifactVersion.create({
        data: {
          artifactId: artifact.id,
          version: 1,
          content: toJson(input.content),
          changeSummary: 'Initial version',
          createdBy: input.createdBy,
        },
      });
      await tx.studioArtifactEvent.create({
        data: {
          artifactId: artifact.id,
          event: 'created',
          payload: toJson({ source: input.source || 'studio' }),
        },
      });
      return artifact;
    });
  }

  async createVersion(
    id: string,
    organizationId: string,
    input: {
      content: unknown;
      title?: string;
      status?: string;
      changeSummary?: string;
      createdBy?: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const artifact = await tx.studioArtifact.findFirst({
        where: { id, organizationId },
      });
      if (!artifact) throw new NotFoundException('Studio artifact not found');
      const version = artifact.currentVersion + 1;
      const updated = await tx.studioArtifact.update({
        where: { id },
        data: {
          currentVersion: version,
          content: toJson(input.content),
          ...(input.title?.trim() ? { title: input.title.trim() } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
      });
      await tx.studioArtifactVersion.create({
        data: {
          artifactId: id,
          version,
          content: toJson(input.content),
          changeSummary: input.changeSummary || 'Updated in Studio',
          createdBy: input.createdBy,
        },
      });
      await tx.studioArtifactEvent.create({
        data: {
          artifactId: id,
          event: 'version.created',
          payload: toJson({ version, changeSummary: input.changeSummary }),
        },
      });
      return updated;
    });
  }

  async getVersion(id: string, organizationId: string, version: number) {
    await this.assertOwned(id, organizationId);
    const record = await this.prisma.studioArtifactVersion.findFirst({
      where: { artifactId: id, version },
    });
    if (!record) throw new NotFoundException('Studio artifact version not found');
    return record;
  }

  async restoreVersion(id: string, organizationId: string, version: number, createdBy?: string) {
    const previous = await this.getVersion(id, organizationId, version);
    return this.createVersion(id, organizationId, {
      content: previous.content,
      changeSummary: `Restaurado da versão ${version}`,
      createdBy,
    });
  }

  async listVersions(id: string, organizationId: string) {
    await this.assertOwned(id, organizationId);
    return this.prisma.studioArtifactVersion.findMany({
      where: { artifactId: id },
      orderBy: { version: 'desc' },
    });
  }

  async approve(id: string, organizationId: string, approvedBy?: string) {
    return this.transition(id, organizationId, 'APPROVED', 'approved', {
      approvedAt: new Date(),
      approvedBy,
    });
  }

  async reject(id: string, organizationId: string, reason?: string) {
    return this.transition(id, organizationId, 'REJECTED', 'rejected', { reason });
  }

  async archive(id: string, organizationId: string) {
    return this.transition(id, organizationId, 'ARCHIVED', 'archived', {
      archivedAt: new Date(),
    });
  }

  async restore(id: string, organizationId: string) {
    return this.transition(id, organizationId, 'DRAFT', 'restored', {
      archivedAt: null,
    });
  }

  async duplicate(id: string, organizationId: string, title?: string) {
    const artifact = await this.assertOwned(id, organizationId);
    return this.create(organizationId, {
      threadId: artifact.threadId || undefined,
      type: artifact.type,
      title: title?.trim() || `${artifact.title} (cópia)`,
      status: 'DRAFT',
      content: artifact.content,
      source: 'duplicate',
      brandProfileId: artifact.brandProfileId || undefined,
      metadata: (artifact.metadata as JsonRecord | null) || undefined,
    });
  }

  async events(id: string, organizationId: string) {
    await this.assertOwned(id, organizationId);
    return this.prisma.studioArtifactEvent.findMany({
      where: { artifactId: id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async addAttachment(
    organizationId: string,
    input: {
      artifactId?: string;
      threadId?: string;
      kind?: string;
      filename: string;
      mimeType?: string;
      size?: number;
      storageUrl: string;
      status?: string;
      metadata?: JsonRecord;
    },
  ) {
    if (!input.filename?.trim() || !input.storageUrl?.trim()) {
      throw new BadRequestException('Attachment filename and storageUrl are required');
    }
    if (input.artifactId) await this.assertOwned(input.artifactId, organizationId);
    this.assertSafeStorageUrl(input.storageUrl);
    return this.prisma.studioAttachment.create({
      data: {
        organizationId,
        artifactId: input.artifactId,
        threadId: input.threadId,
        kind: input.kind || 'FILE',
        filename: input.filename.trim(),
        mimeType: input.mimeType,
        size: input.size,
        storageUrl: input.storageUrl,
        status: input.status || 'READY',
        metadata: input.metadata ? toJson(input.metadata) : undefined,
      },
    });
  }

  async listAttachments(organizationId: string, threadId?: string, artifactId?: string) {
    return this.prisma.studioAttachment.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(threadId ? { threadId } : {}),
        ...(artifactId ? { artifactId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async updateAttachment(
    id: string,
    organizationId: string,
    input: { status?: string; metadata?: JsonRecord }
  ) {
    const attachment = await this.prisma.studioAttachment.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!attachment) throw new NotFoundException('Studio attachment not found');
    return this.prisma.studioAttachment.update({
      where: { id },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.metadata ? { metadata: toJson(input.metadata) } : {}),
      },
    });
  }

  async removeAttachment(id: string, organizationId: string) {
    const attachment = await this.prisma.studioAttachment.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!attachment) throw new NotFoundException('Studio attachment not found');
    return this.prisma.studioAttachment.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'DELETED' },
    });
  }

  private async assertOwned(id: string, organizationId: string) {
    const artifact = await this.prisma.studioArtifact.findFirst({
      where: { id, organizationId },
    });
    if (!artifact) throw new NotFoundException('Studio artifact not found');
    return artifact;
  }

  private async transition(
    id: string,
    organizationId: string,
    status: string,
    event: string,
    payload: JsonRecord,
  ) {
    await this.assertOwned(id, organizationId);
    return this.prisma.$transaction(async (tx) => {
      const artifact = await tx.studioArtifact.update({
        where: { id },
        data: {
          status,
          ...(payload.approvedAt ? { approvedAt: payload.approvedAt as Date } : {}),
          ...(Object.prototype.hasOwnProperty.call(payload, 'archivedAt')
            ? { archivedAt: payload.archivedAt as Date | null }
            : {}),
        },
      });
      await tx.studioArtifactEvent.create({
        data: { artifactId: id, event, payload: toJson(payload) },
      });
      return artifact;
    });
  }

  private assertSafeStorageUrl(value: string) {
    const normalized = value.trim();
    if (normalized.startsWith('/')) return;
    try {
      const url = new URL(normalized);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsafe');
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;
      if (url.protocol !== 'https:') throw new Error('unsafe');
    } catch {
      throw new BadRequestException('Attachment storageUrl must be a local upload or HTTPS URL');
    }
  }
}
