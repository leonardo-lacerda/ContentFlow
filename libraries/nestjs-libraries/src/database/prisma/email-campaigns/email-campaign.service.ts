import { Injectable, NotFoundException } from '@nestjs/common';
import { EmailCampaignRepository } from './email-campaign.repository';
import { EmailCampaignType, EmailCampaignStatus, Prisma } from '@prisma/client';
import { renderEmailHtml } from '@gitroom/nestjs-libraries/email-generator/email-html.renderer';

@Injectable()
export class EmailCampaignService {
  constructor(private emailCampaignRepository: EmailCampaignRepository) {}

  // ── CRUD ─────────────────────────────────────────────────

  async getCampaigns(orgId: string, type?: EmailCampaignType) {
    return this.emailCampaignRepository.findByOrganization(orgId, type);
  }

  async getCampaign(id: string) {
    const campaign = await this.emailCampaignRepository.findById(id);
    if (!campaign) throw new NotFoundException('Email campaign not found');
    return campaign;
  }

  async getCampaignByOrg(id: string, orgId: string) {
    const campaign = await this.emailCampaignRepository.findByIdAndOrg(id, orgId);
    if (!campaign) throw new NotFoundException('Email campaign not found');
    return campaign;
  }

  async getCampaignsByBrand(orgId: string, brandProfileId: string, type?: EmailCampaignType) {
    return this.emailCampaignRepository.findByBrand(orgId, brandProfileId, type);
  }

  async createCampaign(data: Prisma.EmailCampaignCreateInput) {
    return this.emailCampaignRepository.create(data);
  }

  async updateCampaign(id: string, data: Prisma.EmailCampaignUpdateInput) {
    // If bodyJson is updated, re-render HTML
    if (data.bodyJson) {
      const bodyJson = data.bodyJson as any;
      if (bodyJson.blocks) {
        const existing = await this.getCampaign(id);
        const html = renderEmailHtml({
          blocks: bodyJson.blocks,
          subject: (data.subject as string) || existing.subject,
          primaryColor: (data.primaryColor as string) || existing.primaryColor || undefined,
          secondaryColor: (data.secondaryColor as string) || existing.secondaryColor || undefined,
          headerImageUrl: (data.headerImageUrl as string) || existing.headerImageUrl || undefined,
          logoUrl: (data.logoUrl as string) || existing.logoUrl || undefined,
          preheader: (data.preheader as string) || existing.preheader || undefined,
        });
        data.bodyHtml = html;
      }
    }
    return this.emailCampaignRepository.update(id, data);
  }

  async deleteCampaign(id: string) {
    await this.getCampaign(id); // Verify exists
    return this.emailCampaignRepository.softDelete(id);
  }

  // ── HTML management ─────────────────────────────────────

  async updateCampaignHtml(id: string, html: string, bodyJson?: any) {
    return this.emailCampaignRepository.updateHtml(id, html, bodyJson);
  }

  async getExportableHtml(id: string): Promise<string> {
    const campaign = await this.getCampaign(id);
    return campaign.bodyHtml;
  }

  // ── Welcome sequence ─────────────────────────────────────

  async getWelcomeSequence(orgId: string, brandProfileId: string) {
    return this.emailCampaignRepository.findWelcomeSequence(orgId, brandProfileId);
  }

  // ── Export tracking ──────────────────────────────────────

  async markExported(id: string) {
    return this.emailCampaignRepository.incrementExport(id);
  }

  // ── Status management ────────────────────────────────────

  async updateStatus(id: string, status: EmailCampaignStatus) {
    return this.emailCampaignRepository.updateStatus(id, status);
  }
}
