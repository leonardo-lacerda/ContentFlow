import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AffiliateService {
  constructor(private readonly _prisma: PrismaService) {}

  /**
   * Register a new affiliate for an organization.
   */
  async register(orgId: string, data: { name: string; email: string }) {
    // Check if already registered
    const existing = await this._prisma.affiliate.findFirst({
      where: { organizationId: orgId, deletedAt: null },
    });
    if (existing) {
      throw new HttpException(
        'Organização já possui afiliado registrado',
        HttpStatus.CONFLICT,
      );
    }

    const code = this.generateCode();

    return this._prisma.affiliate.create({
      data: {
        organizationId: orgId,
        code,
        name: data.name,
        email: data.email,
        status: 'PENDING',
      },
    });
  }

  /**
   * Get affiliate info for an organization.
   */
  async getAffiliate(orgId: string) {
    return this._prisma.affiliate.findFirst({
      where: { organizationId: orgId, deletedAt: null },
      include: {
        referrals: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
  }

  /**
   * Track a referral click.
   */
  async trackClick(code: string, ip?: string, userAgent?: string) {
    const affiliate = await this._prisma.affiliate.findUnique({
      where: { code },
    });

    if (!affiliate || affiliate.status !== 'ACTIVE') {
      return { success: false, message: 'Código de afiliado inválido' };
    }

    await this._prisma.referral.create({
      data: {
        affiliateId: affiliate.id,
        referralCode: code,
        visitorIp: ip,
        userAgent,
        status: 'CLICKED',
      },
    });

    await this._prisma.affiliate.update({
      where: { id: affiliate.id },
      data: { totalReferrals: { increment: 1 } },
    });

    return { success: true, affiliateId: affiliate.id };
  }

  /**
   * Mark a referral as converted (when referred org subscribes).
   */
  async convertReferral(code: string, referredOrgId: string, amount: number) {
    const affiliate = await this._prisma.affiliate.findUnique({
      where: { code },
    });

    if (!affiliate || affiliate.status !== 'ACTIVE') {
      return null;
    }

    const commission = amount * affiliate.commissionRate;

    // Find most recent clicked referral for this code
    const referral = await this._prisma.referral.findFirst({
      where: {
        affiliateId: affiliate.id,
        referralCode: code,
        status: 'CLICKED',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!referral) {
      return null;
    }

    await this._prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: 'CONVERTED',
        referredOrgId,
        commissionAmount: commission,
        convertedAt: new Date(),
      },
    });

    await this._prisma.affiliate.update({
      where: { id: affiliate.id },
      data: {
        totalConversions: { increment: 1 },
        totalEarnings: { increment: commission },
      },
    });

    return { referralId: referral.id, commission };
  }

  /**
   * Get affiliate dashboard stats.
   */
  async getStats(orgId: string) {
    const affiliate = await this._prisma.affiliate.findFirst({
      where: { organizationId: orgId, deletedAt: null },
    });

    if (!affiliate) {
      throw new HttpException('Afiliado não encontrado', HttpStatus.NOT_FOUND);
    }

    const referrals = await this._prisma.referral.groupBy({
      by: ['status'],
      where: { affiliateId: affiliate.id },
      _count: { id: true },
    });

    const statusCounts = referrals.reduce((acc, r) => {
      acc[r.status] = r._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      affiliate: {
        code: affiliate.code,
        status: affiliate.status,
        commissionRate: affiliate.commissionRate,
      },
      stats: {
        totalClicks: affiliate.totalReferrals,
        totalConversions: affiliate.totalConversions,
        totalEarnings: affiliate.totalEarnings,
        pendingEarnings: affiliate.totalEarnings - affiliate.paidEarnings,
        conversionRate:
          affiliate.totalReferrals > 0
            ? ((affiliate.totalConversions / affiliate.totalReferrals) * 100).toFixed(1)
            : '0.0',
      },
      referralsByStatus: statusCounts,
    };
  }

  /**
   * Generate a unique affiliate code.
   */
  private generateCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }
}
