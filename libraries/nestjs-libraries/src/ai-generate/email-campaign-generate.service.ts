import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { EmailCampaignSchema, WelcomeSequenceSchema } from './schemas/email-campaign.schema';
import type { EmailCampaignData, WelcomeSequence } from './schemas/email-campaign.schema';
import { validateAiResponse } from './ai-response-validator';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';
import { ContentIdeaService } from '@gitroom/nestjs-libraries/database/prisma/content-ideas/content-idea.service';
import { CarouselProjectService } from '@gitroom/nestjs-libraries/database/prisma/carousel-projects/carousel-project.service';
import { GenerationJobService } from '@gitroom/nestjs-libraries/database/prisma/generation-jobs/generation-job.service';
import { EmailCampaignService } from '@gitroom/nestjs-libraries/database/prisma/email-campaigns/email-campaign.service';
import { renderEmailHtml, renderSimpleEmailHtml } from '@gitroom/nestjs-libraries/email-generator/email-html.renderer';
import { getEmailTemplateById, getActiveEmailTemplates } from '@gitroom/nestjs-libraries/email-generator/email-template-definitions';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'sk-proj-' });

const SYSTEM_PROMPT = `You are an expert email marketing copywriter. You create email campaigns from brand content.

You must:
1. Write compelling subject lines that drive opens
2. Create scannable email content with clear hierarchy
3. Include strong CTAs
4. Use inline-styled HTML blocks for email compatibility
5. Adapt tone for newsletter, welcome, or promotional context
6. Keep mobile-first design in mind

Email best practices:
- Subject: 30-50 chars, create curiosity or urgency
- Preheader: 40-90 chars, complement the subject
- Body: Scannable, short paragraphs, clear CTA
- Newsletter: Content digest, value-first
- Welcome: Warm, set expectations
- Promotional: Direct, benefit-focused, urgency`;

@Injectable()
export class EmailCampaignGenerateService {
  private readonly logger = new Logger(EmailCampaignGenerateService.name);

  constructor(
    private brandProfileService: BrandProfileService,
    private contentIdeaService: ContentIdeaService,
    private carouselProjectService: CarouselProjectService,
    private generationJobService: GenerationJobService,
    private emailCampaignService: EmailCampaignService,
  ) {}

  /**
   * Generate a single email campaign from brand DNA + content.
   * Saves to DB and returns the saved campaign.
   */
  async generateEmailCampaign(orgId: string, dto: {
    brandProfileId: string;
    contentIdeaId?: string;
    carouselProjectId?: string;
    campaignType: string;
    name: string;
    templateId?: string;
    additionalContext?: string;
  }): Promise<any> {
    const brand = await this.brandProfileService.getBrand(dto.brandProfileId);
    if (!brand || brand.organizationId !== orgId) throw new Error('Brand not found');

    const dna = await this.brandProfileService.getLatestDnaSnapshot(dto.brandProfileId);

    let sourceContent: { title: string; content: string; caption?: string } = { title: '', content: '' };
    if (dto.contentIdeaId) {
      const idea = await this.contentIdeaService.getIdea(dto.contentIdeaId);
      if (idea) sourceContent = { title: idea.title, content: `${idea.hook} - ${idea.angle}` };
    } else if (dto.carouselProjectId) {
      const project = await this.carouselProjectService.getProject(dto.carouselProjectId);
      if (project) sourceContent = { title: project.title, content: project.caption || '', caption: project.caption || undefined };
    }

    // Get template instruction if provided
    const template = dto.templateId ? getEmailTemplateById(dto.templateId) : null;
    const templateInstruction = template?.promptInstruction || '';

    const campaignTypeMap: Record<string, string> = {
      newsletter: 'NEWSLETTER',
      welcome_sequence: 'WELCOME_SEQUENCE',
      promotional: 'PROMOTIONAL',
    };
    const campaignType = campaignTypeMap[dto.campaignType] || dto.campaignType;

    const job = await this.generationJobService.createJob({
      organizationId: orgId,
      brandProfileId: dto.brandProfileId,
      type: 'EMAIL_GENERATION',
      model: 'gpt-4.1',
      provider: 'openai',
      promptVersion: '1.0.0',
      schemaVersion: '1.0.0',
    });

    try {
      await this.generationJobService.startJob(job.id);

      const prompt = `Generate an email campaign.

## Brand
Name: ${brand.name}
Industry: ${brand.industry || 'General'}
Voice: ${JSON.stringify(dna?.voice || {})}
Audience: ${JSON.stringify(dna?.audience || {})}

## Content
Title: ${sourceContent.title}
Content: ${sourceContent.content}
${sourceContent.caption ? `Caption: ${sourceContent.caption}` : ''}

## Campaign
Type: ${campaignType}
Name: ${dto.name}
${templateInstruction ? `Template: ${templateInstruction}` : ''}
${dto.additionalContext ? `Instructions: ${dto.additionalContext}` : ''}

Generate the email with subject, preheader, content blocks, and CTA. Return JSON.`;

      const rawResponse = await openai.chat.completions.parse({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        response_format: zodResponseFormat(EmailCampaignSchema, 'emailCampaign'),
      });

      const parsed = rawResponse.choices[0].message.parsed;
      if (!parsed) throw new Error('Failed to parse AI response');

      const validation = validateAiResponse('email-campaign', JSON.stringify(parsed));
      if (!validation.success) throw new Error('Validation failed');

      await this.generationJobService.completeJob(job.id, validation.data);

      const data = validation.data as EmailCampaignData;

      // Render HTML from blocks
      const html = renderEmailHtml({
        blocks: data.blocks as any[],
        subject: data.subject,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        headerImageUrl: data.headerImageUrl,
        logoUrl: data.logoUrl,
        preheader: data.preheader,
      });

      // Save to DB
      const campaign = await this.emailCampaignService.createCampaign({
        organization: { connect: { id: orgId } },
        brandProfile: { connect: { id: dto.brandProfileId } },
        ...(dto.contentIdeaId ? { contentIdea: { connect: { id: dto.contentIdeaId } } } : {}),
        ...(dto.carouselProjectId ? { carouselProject: { connect: { id: dto.carouselProjectId } } } : {}),
        type: campaignType as any,
        name: dto.name,
        status: 'READY',
        subject: data.subject,
        preheader: data.preheader,
        bodyHtml: html,
        bodyJson: { blocks: data.blocks } as any,
        ctaText: data.ctaText,
        ctaUrl: data.ctaUrl,
        ctaColor: data.ctaColor,
        headerImageUrl: data.headerImageUrl,
        logoUrl: data.logoUrl,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        model: 'gpt-4.1',
        provider: 'openai',
        promptVersion: '1.0.0',
        schemaVersion: '1.0.0',
        generationMeta: { templateId: dto.templateId, campaignType } as any,
      });

      this.logger.log(`Email campaign generated, job ${job.id}, campaign ${campaign.id}`);
      return campaign;
    } catch (error: any) {
      await this.generationJobService.failJob(job.id, error.message);
      throw error;
    }
  }

  /**
   * Generate a full welcome sequence (3-5 emails).
   * Each email is saved independently with sequenceIndex/sequenceTotal.
   */
  async generateWelcomeSequence(orgId: string, dto: {
    brandProfileId: string;
    sequenceLength?: number;
    additionalContext?: string;
  }): Promise<any[]> {
    const brand = await this.brandProfileService.getBrand(dto.brandProfileId);
    if (!brand || brand.organizationId !== orgId) throw new Error('Brand not found');

    const dna = await this.brandProfileService.getLatestDnaSnapshot(dto.brandProfileId);
    const sequenceLength = dto.sequenceLength || 3;

    const job = await this.generationJobService.createJob({
      organizationId: orgId,
      brandProfileId: dto.brandProfileId,
      type: 'EMAIL_GENERATION',
      model: 'gpt-4.1',
      provider: 'openai',
      promptVersion: '1.0.0',
      schemaVersion: '1.0.0',
    });

    try {
      await this.generationJobService.startJob(job.id);

      const prompt = `Generate a welcome email sequence of ${sequenceLength} emails.

## Brand
Name: ${brand.name}
Industry: ${brand.industry || 'General'}
Voice: ${JSON.stringify(dna?.voice || {})}
Audience: ${JSON.stringify(dna?.audience || {})}
Offer: ${JSON.stringify(dna?.offer || {})}

## Sequence Requirements
- Total emails: ${sequenceLength}
- Email 1: Welcome + set expectations (sent immediately)
- Email 2: Brand introduction + value proposition (sent after 2 days)
- Email 3+: Progressive value content + CTA (each 2-3 days apart)
- Each email should be independent but cohesive
- Tone should be warm and welcoming
${dto.additionalContext ? `Additional: ${dto.additionalContext}` : ''}

Return JSON with an "emails" array containing ${sequenceLength} email campaign objects. Each email must have sequenceIndex (0-based), sequenceTotal (${sequenceLength}), and sequenceDelayDays (0 for first, 2 for second, etc.).`;

      const rawResponse = await openai.chat.completions.parse({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        response_format: zodResponseFormat(WelcomeSequenceSchema, 'welcomeSequence'),
      });

      const parsed = rawResponse.choices[0].message.parsed;
      if (!parsed) throw new Error('Failed to parse AI response');

      await this.generationJobService.completeJob(job.id, parsed);

      const emails = (parsed as WelcomeSequence).emails;

      // Save each email as a separate campaign
      const campaigns = [];
      for (const email of emails) {
        const html = renderEmailHtml({
          blocks: email.blocks as any[],
          subject: email.subject,
          primaryColor: email.primaryColor,
          secondaryColor: email.secondaryColor,
          headerImageUrl: email.headerImageUrl,
          logoUrl: email.logoUrl,
          preheader: email.preheader,
        });

        const campaign = await this.emailCampaignService.createCampaign({
          organization: { connect: { id: orgId } },
          brandProfile: { connect: { id: dto.brandProfileId } },
          type: 'WELCOME_SEQUENCE',
          name: `Welcome ${email.sequenceIndex! + 1}/${email.sequenceTotal}: ${email.name}`,
          status: 'READY',
          subject: email.subject,
          preheader: email.preheader,
          bodyHtml: html,
          bodyJson: { blocks: email.blocks } as any,
          ctaText: email.ctaText,
          ctaUrl: email.ctaUrl,
          ctaColor: email.ctaColor,
          headerImageUrl: email.headerImageUrl,
          logoUrl: email.logoUrl,
          primaryColor: email.primaryColor,
          secondaryColor: email.secondaryColor,
          sequenceIndex: email.sequenceIndex,
          sequenceTotal: email.sequenceTotal,
          sequenceDelayDays: email.sequenceDelayDays,
          model: 'gpt-4.1',
          provider: 'openai',
          promptVersion: '1.0.0',
          schemaVersion: '1.0.0',
          generationMeta: { welcomeSequence: true, sequenceLength } as any,
        });

        campaigns.push(campaign);
      }

      this.logger.log(`Welcome sequence generated: ${campaigns.length} emails, job ${job.id}`);
      return campaigns;
    } catch (error: any) {
      await this.generationJobService.failJob(job.id, error.message);
      throw error;
    }
  }

  /**
   * Render HTML from blocks (used by controller for on-demand rendering).
   */
  renderHtml(data: {
    blocks: any[];
    subject?: string;
    ctaText?: string;
    ctaUrl?: string;
    ctaColor?: string;
    primaryColor?: string;
    secondaryColor?: string;
    headerImageUrl?: string;
    logoUrl?: string;
    preheader?: string;
  }): string {
    return renderEmailHtml(data);
  }

  /**
   * Re-render HTML from edited bodyJson.
   */
  async reRenderHtml(campaignId: string, bodyJson: { blocks: Array<Record<string, any>> }): Promise<{ html: string; campaign: any }> {
    const campaign = await this.emailCampaignService.getCampaign(campaignId);

    const html = renderEmailHtml({
      blocks: bodyJson.blocks,
      subject: campaign.subject,
      primaryColor: campaign.primaryColor || undefined,
      secondaryColor: campaign.secondaryColor || undefined,
      headerImageUrl: campaign.headerImageUrl || undefined,
      logoUrl: campaign.logoUrl || undefined,
      preheader: campaign.preheader || undefined,
    });

    await this.emailCampaignService.updateCampaignHtml(campaignId, html, bodyJson);
    const updated = await this.emailCampaignService.getCampaign(campaignId);

    return { html, campaign: updated };
  }

  /**
   * Export final HTML (increments export counter).
   */
  async exportHtml(campaignId: string): Promise<{ html: string; filename: string }> {
    const campaign = await this.emailCampaignService.getCampaign(campaignId);

    await this.emailCampaignService.markExported(campaignId);

    return {
      html: campaign.bodyHtml,
      filename: `${campaign.name.replace(/\s+/g, '-').toLowerCase()}.html`,
    };
  }

  /**
   * Get available email templates.
   */
  getTemplates(category?: string) {
    if (category) {
      return getEmailTemplatesByCat(category);
    }
    return getActiveTemplates();
  }
}

import { getEmailTemplatesByCategory as getEmailTemplatesByCat, getActiveEmailTemplates as getActiveTemplates } from '@gitroom/nestjs-libraries/email-generator/email-template-definitions';
