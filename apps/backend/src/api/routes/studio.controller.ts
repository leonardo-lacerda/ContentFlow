import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { StudioArtifactService } from '@gitroom/nestjs-libraries/chat/studio/studio-artifact.service';
import { ExtractContentService } from '@gitroom/nestjs-libraries/openai/extract.content.service';
import { readCreativeLocalUpload } from '@gitroom/nestjs-libraries/creative-engine/creative-local-media';
import pdfParse = require('pdf-parse');

@Controller('/studio')
export class StudioController {
  constructor(
    private readonly artifacts: StudioArtifactService,
    private readonly extractContent: ExtractContentService,
  ) {}

  @Get('/artifacts')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  list(
    @GetOrgFromRequest() org: Organization,
    @Query('threadId') threadId?: string,
    @Query('type') type?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.artifacts.list(org.id, {
      threadId,
      type,
      includeArchived: includeArchived === 'true',
    });
  }

  @Get('/attachments')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  listAttachments(
    @GetOrgFromRequest() org: Organization,
    @Query('threadId') threadId?: string,
    @Query('artifactId') artifactId?: string,
  ) {
    return this.artifacts.listAttachments(org.id, threadId, artifactId);
  }

  @Post('/attachments')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async addAttachment(@GetOrgFromRequest() org: Organization, @Body() body: any) {
    const attachmentKind = String(body?.kind || '').toUpperCase();
    const isLink = attachmentKind === 'LINK';
    const isFile = attachmentKind === 'FILE' || !attachmentKind;
    const attachment = await this.artifacts.addAttachment(org.id, {
      ...body,
      ...((isLink || isFile) ? { status: 'PROCESSING' } : {}),
    });
    if (isLink) {
      void this.processLink(org.id, attachment.id, body.storageUrl);
    } else if (isFile) {
      void this.processFile(org.id, attachment);
    }
    return attachment;
  }

  private async processFile(organizationId: string, attachment: any) {
    try {
      const local = await readCreativeLocalUpload(attachment.storageUrl);
      if (!local || local.buffer.length > 10 * 1024 * 1024) {
        throw new Error('File is not available in local storage or is too large');
      }
      const mimeType = String(attachment.mimeType || local.contentType || '').toLowerCase();
      const filename = String(attachment.filename || '').toLowerCase();
      const isPdf = mimeType === 'application/pdf' || filename.endsWith('.pdf');
      const isText = mimeType.startsWith('text/') ||
        ['.md', '.csv', '.json', '.txt'].some((extension) => filename.endsWith(extension));
      if (isPdf) {
        const parsed = await pdfParse(local.buffer);
        await this.artifacts.updateAttachment(attachment.id, organizationId, {
          status: parsed.text?.trim() ? 'READY' : 'EMPTY',
          metadata: {
            extraction: 'pdf',
            pageCount: parsed.numpages || null,
            extractedText: String(parsed.text || '').slice(0, 12000),
            extractedAt: new Date().toISOString(),
          },
        });
        return;
      }
      if (isText) {
        await this.artifacts.updateAttachment(attachment.id, organizationId, {
          status: 'READY',
          metadata: {
            extraction: 'text',
            extractedText: local.buffer.toString('utf8').slice(0, 12000),
            extractedAt: new Date().toISOString(),
          },
        });
        return;
      }
      await this.artifacts.updateAttachment(attachment.id, organizationId, {
        status: 'READY_NO_TEXT',
        metadata: {
          extraction: 'metadata-only',
          extractedAt: new Date().toISOString(),
        },
      });
    } catch {
      await this.artifacts.updateAttachment(attachment.id, organizationId, {
        status: 'FAILED',
        metadata: {
          extraction: 'file',
          error: 'Unable to extract this file safely',
          extractedAt: new Date().toISOString(),
        },
      }).catch(() => undefined);
    }
  }

  private async processLink(
    organizationId: string,
    attachmentId: string,
    url: string,
  ) {
    try {
      const extractedText = await this.extractContent.extractContent(url);
      await this.artifacts.updateAttachment(attachmentId, organizationId, {
        status: extractedText ? 'READY' : 'EMPTY',
        metadata: {
          extraction: 'html',
          extractedText: String(extractedText || '').slice(0, 12000),
          extractedAt: new Date().toISOString(),
        },
      });
    } catch {
      await this.artifacts.updateAttachment(attachmentId, organizationId, {
        status: 'FAILED',
        metadata: {
          extraction: 'html',
          error: 'Unable to extract this link safely',
          extractedAt: new Date().toISOString(),
        },
      }).catch(() => undefined);
    }
  }

  @Delete('/attachments/:attachmentId')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  removeAttachment(
    @GetOrgFromRequest() org: Organization,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.artifacts.removeAttachment(attachmentId, org.id);
  }

  @Get('/artifacts/:id')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  get(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.artifacts.get(id, org.id);
  }

  @Post('/artifacts')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  create(@GetOrgFromRequest() org: Organization, @Body() body: any) {
    return this.artifacts.create(org.id, body);
  }

  @Get('/artifacts/:id/versions')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  versions(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.artifacts.listVersions(id, org.id);
  }

  @Get('/artifacts/:id/versions/:version')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  version(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Param('version') version: string,
  ) {
    return this.artifacts.getVersion(id, org.id, Number(version));
  }

  @Post('/artifacts/:id/versions')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  createVersion(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: any) {
    return this.artifacts.createVersion(id, org.id, body);
  }

  @Get('/artifacts/:id/events')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  events(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.artifacts.events(id, org.id);
  }

  @Post('/artifacts/:id/approve')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  approve(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.artifacts.approve(id, org.id);
  }

  @Post('/artifacts/:id/reject')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  reject(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.artifacts.reject(id, org.id, body?.reason);
  }

  @Post('/artifacts/:id/archive')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  archive(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.artifacts.archive(id, org.id);
  }

  @Post('/artifacts/:id/restore')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  restore(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.artifacts.restore(id, org.id);
  }

  @Post('/artifacts/:id/duplicate')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  duplicate(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: { title?: string }) {
    return this.artifacts.duplicate(id, org.id, body?.title);
  }
}
