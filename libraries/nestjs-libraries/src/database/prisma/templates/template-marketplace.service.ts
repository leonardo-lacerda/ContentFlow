import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class TemplateMarketplaceService {
  constructor(private readonly _prisma: PrismaService) {}

  /**
   * List available templates with filters.
   *
   * Found while re-verifying the F-08 fix (2026-08-20 audit): this was the
   * bypass for it — `getTemplate`/`installTemplate` got an ownership check,
   * but this method had none, so `?source=PRIVATE` (or simply omitting
   * `source`, which left `where.source` unconstrained) returned every
   * organization's PRIVATE templates, and `?status=PENDING_REVIEW`/any other
   * status overrode the safe APPROVED default with no scoping at all. Same
   * visibility rule as getTemplate, enforced here too: PRIVATE and
   * non-APPROVED results are only ever the requester's own.
   */
  async listTemplates(
    filters?: {
      category?: string;
      source?: string;
      status?: string;
      search?: string;
    },
    requestingOrgId?: string
  ) {
    const status = filters?.status || 'APPROVED';
    const wantsNonApproved = status !== 'APPROVED';
    const wantsPrivateOnly = filters?.source === 'PRIVATE';

    if ((wantsNonApproved || wantsPrivateOnly) && !requestingOrgId) {
      return [];
    }

    const and: any[] = [{ deletedAt: null }, { status }];

    if (filters?.category) and.push({ category: filters.category });

    if (filters?.source) {
      and.push({ source: filters.source });
      if (wantsPrivateOnly) and.push({ creatorOrgId: requestingOrgId });
    } else {
      // No explicit source requested: never surface another org's PRIVATE
      // templates in a general browse.
      and.push({
        OR: [
          { source: { not: 'PRIVATE' } },
          { source: 'PRIVATE', creatorOrgId: requestingOrgId },
        ],
      });
    }

    if (wantsNonApproved) and.push({ creatorOrgId: requestingOrgId });

    if (filters?.search) {
      and.push({
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }

    return this._prisma.marketplaceTemplate.findMany({
      where: { AND: and },
      orderBy: { installCount: 'desc' },
      take: 50,
    });
  }

  /**
   * Get a single template by ID.
   *
   * PRIVATE templates and anything not yet APPROVED are only visible to the
   * organization that created them — requestingOrgId must be threaded through
   * from every caller so this stays true regardless of entry point.
   */
  async getTemplate(id: string, requestingOrgId?: string) {
    const template = await this._prisma.marketplaceTemplate.findUnique({
      where: { id },
    });
    if (!template || template.deletedAt) {
      throw new HttpException('Template não encontrado', HttpStatus.NOT_FOUND);
    }

    const isOwner =
      !!requestingOrgId && template.creatorOrgId === requestingOrgId;
    const isPubliclyVisible =
      template.status === 'APPROVED' && template.source !== 'PRIVATE';

    if (!isOwner && !isPubliclyVisible) {
      // Same 404 as "doesn't exist" — don't confirm existence of a private
      // or unreviewed template to a non-owner.
      throw new HttpException('Template não encontrado', HttpStatus.NOT_FOUND);
    }

    return template;
  }

  /**
   * Create a new template. `source` is never taken from the caller: only the
   * admin-only `reviewTemplate` path (content.moderate permission) may grant
   * APPROVED/OFFICIAL status. Every org-created template starts as COMMUNITY
   * (or PRIVATE, scoped to its own org) and PENDING_REVIEW.
   */
  async createTemplate(
    creatorOrgId: string,
    data: {
      name: string;
      description: string;
      category: string;
      templateData: any;
      tags?: string[];
      previewImageUrl?: string;
      private?: boolean;
    },
  ) {
    return this._prisma.marketplaceTemplate.create({
      data: {
        creatorOrgId,
        name: data.name,
        description: data.description,
        category: data.category,
        templateData: data.templateData,
        tags: data.tags || [],
        previewImageUrl: data.previewImageUrl,
        source: data.private ? 'PRIVATE' : 'COMMUNITY',
        status: 'PENDING_REVIEW',
      },
    });
  }

  /**
   * Install a template for an organization.
   */
  async installTemplate(orgId: string, templateId: string) {
    const template = await this.getTemplate(templateId, orgId);

    if (template.status !== 'APPROVED') {
      throw new HttpException(
        'Template não está aprovado',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if already installed
    const existing = await this._prisma.templateInstallation.findUnique({
      where: {
        organizationId_templateId: {
          organizationId: orgId,
          templateId,
        },
      },
    });

    if (existing) {
      if (!existing.active) {
        // Reactivate
        await this._prisma.templateInstallation.update({
          where: { id: existing.id },
          data: { active: true, installedVersion: template.version },
        });
      }
      return existing;
    }

    const installation = await this._prisma.templateInstallation.create({
      data: {
        organizationId: orgId,
        templateId,
        installedVersion: template.version,
      },
    });

    // Increment install count
    await this._prisma.marketplaceTemplate.update({
      where: { id: templateId },
      data: { installCount: { increment: 1 } },
    });

    return installation;
  }

  /**
   * Uninstall a template for an organization.
   */
  async uninstallTemplate(orgId: string, templateId: string) {
    const installation =
      await this._prisma.templateInstallation.findUnique({
        where: {
          organizationId_templateId: {
            organizationId: orgId,
            templateId,
          },
        },
      });

    if (!installation) {
      throw new HttpException(
        'Template não instalado',
        HttpStatus.NOT_FOUND,
      );
    }

    await this._prisma.templateInstallation.update({
      where: { id: installation.id },
      data: { active: false },
    });

    return { success: true };
  }

  /**
   * List installed templates for an organization.
   */
  async getInstalledTemplates(orgId: string) {
    return this._prisma.templateInstallation.findMany({
      where: { organizationId: orgId, active: true },
      include: { template: true },
    });
  }

  /**
   * Approve or reject a template (admin only).
   */
  async reviewTemplate(
    templateId: string,
    status: 'APPROVED' | 'REJECTED',
    feedback?: string,
  ) {
    return this._prisma.marketplaceTemplate.update({
      where: { id: templateId },
      data: {
        status,
        metadata: { feedback },
      },
    });
  }

  /**
   * Update template version.
   */
  async updateTemplate(
    templateId: string,
    data: {
      templateData?: any;
      description?: string;
      tags?: string[];
    },
  ) {
    return this._prisma.marketplaceTemplate.update({
      where: { id: templateId },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });
  }

  /**
   * Record template usage. Went through `getTemplate`'s own visibility
   * check (PRIVATE templates only visible to their creator org) rather than
   * a bare `update({ where: { id } })` — any authenticated user of any org
   * could otherwise increment `usageCount` on a template they can't even
   * see, including a probe to confirm a guessed private-template id exists
   * (an update on a missing/invisible id previously just silently no-op'd
   * instead of 404ing, which itself was a second, smaller tell).
   */
  async recordUsage(templateId: string, requestingOrgId?: string) {
    await this.getTemplate(templateId, requestingOrgId);
    await this._prisma.marketplaceTemplate.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });
  }

  /**
   * Check for abuse patterns in template marketplace.
   * Returns flagged templates and organizations.
   */
  async detectAbuse() {
    const flags: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      templateId?: string;
      orgId?: string;
      message: string;
    }> = [];

    // 1. Check for templates with suspiciously high install/usage ratio
    const highRatioTemplates = await this._prisma.marketplaceTemplate.findMany({
      where: {
        status: 'APPROVED',
        deletedAt: null,
        installCount: { gt: 10 },
      },
    });

    for (const template of highRatioTemplates) {
      if (template.usageCount > 0 && template.installCount > 0) {
        const ratio = template.usageCount / template.installCount;
        // If usage is 50x installs, suspicious
        if (ratio > 50) {
          flags.push({
            type: 'high_usage_ratio',
            severity: 'medium',
            templateId: template.id,
            message: `Template "${template.name}" has usage/install ratio of ${ratio.toFixed(1)}x`,
          });
        }
      }
    }

    // 2. Check for organizations installing too many templates in short period
    const recentInstallations =
      await this._prisma.templateInstallation.groupBy({
        by: ['organizationId'],
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
          },
        },
        _count: { id: true },
      });

    for (const org of recentInstallations) {
      if (org._count.id > 20) {
        flags.push({
          type: 'mass_install',
          severity: 'high',
          orgId: org.organizationId,
          message: `Organization installed ${org._count.id} templates in 24h`,
        });
      }
    }

    // 3. Check for templates with no description or suspiciously short content
    const suspiciousTemplates = await this._prisma.marketplaceTemplate.findMany({
      where: {
        status: { in: ['PENDING_REVIEW', 'APPROVED'] },
        deletedAt: null,
        OR: [
          { description: { lt: '10' } }, // Very short description
          { name: { contains: 'test', mode: 'insensitive' } },
        ],
      },
    });

    for (const template of suspiciousTemplates) {
      if (template.description.length < 10) {
        flags.push({
          type: 'low_quality',
          severity: 'low',
          templateId: template.id,
          message: `Template "${template.name}" has very short description (${template.description.length} chars)`,
        });
      }
    }

    // 4. Check for duplicate template names from same creator
    const duplicates = await this._prisma.$queryRaw<
      Array<{ creatorOrgId: string; name: string; count: bigint }>
    >`
      SELECT "creatorOrgId", "name", COUNT(*) as count
      FROM "MarketplaceTemplate"
      WHERE "deletedAt" IS NULL
      GROUP BY "creatorOrgId", "name"
      HAVING COUNT(*) > 1
    `;

    for (const dup of duplicates) {
      flags.push({
        type: 'duplicate_names',
        severity: 'low',
        orgId: dup.creatorOrgId || undefined,
        message: `Duplicate template name "${dup.name}" (${dup.count} copies)`,
      });
    }

    return {
      totalFlags: flags.length,
      highSeverity: flags.filter((f) => f.severity === 'high').length,
      mediumSeverity: flags.filter((f) => f.severity === 'medium').length,
      lowSeverity: flags.filter((f) => f.severity === 'low').length,
      flags,
    };
  }

  /**
   * Auto-suspend a template flagged for abuse.
   */
  async suspendTemplate(templateId: string, reason: string) {
    return this._prisma.marketplaceTemplate.update({
      where: { id: templateId },
      data: {
        status: 'REJECTED',
        metadata: { suspendedReason: reason, suspendedAt: new Date().toISOString() },
      },
    });
  }
}
