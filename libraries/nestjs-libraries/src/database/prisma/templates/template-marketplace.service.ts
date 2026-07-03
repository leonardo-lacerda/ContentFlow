import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class TemplateMarketplaceService {
  constructor(private readonly _prisma: PrismaService) {}

  /**
   * List available templates with filters.
   */
  async listTemplates(filters?: {
    category?: string;
    source?: string;
    status?: string;
    search?: string;
  }) {
    const where: any = { deletedAt: null };

    if (filters?.category) where.category = filters.category;
    if (filters?.source) where.source = filters.source;
    if (filters?.status) where.status = filters.status;
    else where.status = 'APPROVED'; // Default: only approved templates

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this._prisma.marketplaceTemplate.findMany({
      where,
      orderBy: { installCount: 'desc' },
      take: 50,
    });
  }

  /**
   * Get a single template by ID.
   */
  async getTemplate(id: string) {
    const template = await this._prisma.marketplaceTemplate.findUnique({
      where: { id },
    });
    if (!template || template.deletedAt) {
      throw new HttpException('Template não encontrado', HttpStatus.NOT_FOUND);
    }
    return template;
  }

  /**
   * Create a new template (community or official).
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
      source?: 'OFFICIAL' | 'COMMUNITY' | 'PRIVATE';
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
        source: data.source || 'COMMUNITY',
        status: data.source === 'OFFICIAL' ? 'APPROVED' : 'PENDING_REVIEW',
      },
    });
  }

  /**
   * Install a template for an organization.
   */
  async installTemplate(orgId: string, templateId: string) {
    const template = await this.getTemplate(templateId);

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
   * Record template usage.
   */
  async recordUsage(templateId: string) {
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
