import { Injectable } from '@nestjs/common';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { UrlValidationService } from '@gitroom/nestjs-libraries/openai/url-validation.service';
import { WebsiteMetadataExtractor } from '@gitroom/nestjs-libraries/openai/website-metadata.extractor';
import { BrandProfileRepository } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.repository';
import { BrandDnaSnapshotRepository } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-dna-snapshot.repository';
import { BrandAssetRepository } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-asset.repository';
import { PlanLimitsService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/plan-limits.service';
import {
  normalizeBrandDnaExtraction,
  VERSION,
} from '@gitroom/nestjs-libraries/ai-generate/schemas/brand-dna-extraction.schema';
import type { BrandDnaExtraction } from '@gitroom/nestjs-libraries/ai-generate/schemas/brand-dna-extraction.schema';
import { BrandProfileStatus } from '@prisma/client';
import { aiTextConfig } from '@gitroom/nestjs-libraries/openai/ai-text.client';

export interface ExtractionResult {
  success: boolean;
  snapshot?: any;
  assets?: any[];
  errors?: string[];
}

@Injectable()
export class BrandDnaExtractionService {
  constructor(
    private urlValidationService: UrlValidationService,
    private websiteMetadataExtractor: WebsiteMetadataExtractor,
    private openaiService: OpenaiService,
    private brandProfileRepository: BrandProfileRepository,
    private brandDnaSnapshotRepository: BrandDnaSnapshotRepository,
    private brandAssetRepository: BrandAssetRepository,
    private planLimitsService: PlanLimitsService,
  ) {}

  // Fast, synchronous guards shared by both the blocking analyze() and the
  // fire-and-forget startAnalysis(): plan limit + URL validation, then flips
  // the brand to ANALYZING. Returns the validated URL, or an early error the
  // caller surfaces to the user immediately (without ever leaving the brand
  // stuck on ANALYZING, since ANALYZING is only set once both guards pass).
  // Returns { url } on success, or { error } with an early ExtractionResult the
  // caller returns as-is. Two nullable fields (rather than a discriminated
  // union) so callers narrow with a plain truthiness check — this project's
  // tsconfig doesn't reliably narrow `ok: true | false` unions.
  private async prepareAnalysis(
    brandProfileId: string,
    rawUrl: string,
    orgId?: string,
  ): Promise<{ url?: string; error?: ExtractionResult }> {
    // 0. Enforce plan limits (throws -> surfaces to the caller synchronously)
    if (orgId) {
      await this.planLimitsService.enforceLimit(orgId, 'dna_extraction');
    }

    // 1. Validar URL
    const validation = await this.urlValidationService.validate(rawUrl);
    if (!validation.success) {
      return { error: { success: false, errors: ['URL validation failed'] } };
    }
    const { url } = validation.data;

    // 2. Atualizar status para ANALYZING (clears any stale error from a
    // previous failed attempt so the UI doesn't show an old reason for a
    // brand-new run).
    await this.brandProfileRepository.updateById(brandProfileId, {
      status: BrandProfileStatus.ANALYZING,
      lastAnalysisError: null,
    });

    return { url };
  }

  // Blocking analysis: runs the whole pipeline and returns the extracted DNA
  // inline. Kept for callers that need the result in the response (the public
  // v1 API). The brand-DNA UI uses startAnalysis() to dodge the proxy timeout.
  async analyze(
    brandProfileId: string,
    rawUrl: string,
    orgId?: string,
  ): Promise<ExtractionResult> {
    const prepared = await this.prepareAnalysis(brandProfileId, rawUrl, orgId);
    if (prepared.error || !prepared.url) {
      return prepared.error ?? { success: false, errors: ['URL validation failed'] };
    }
    return this.runExtraction(brandProfileId, prepared.url);
  }

  // Non-blocking analysis: runs the fast guards synchronously (so plan-limit
  // and bad-URL errors still reach the user immediately), then kicks the heavy
  // fetch + LLM + save work off in the background and returns right away with
  // status ANALYZING. The UI polls the brand/DNA until it settles on
  // NEEDS_REVIEW or FAILED. This is what stops the request from exceeding the
  // ~60s reverse-proxy timeout and surfacing a false "analysis failed" even
  // though the extraction actually completed server-side.
  async startAnalysis(
    brandProfileId: string,
    rawUrl: string,
    orgId?: string,
  ): Promise<{ success: boolean; started?: boolean; status?: string; errors?: string[] }> {
    const prepared = await this.prepareAnalysis(brandProfileId, rawUrl, orgId);
    if (prepared.error || !prepared.url) {
      return prepared.error ?? { success: false, errors: ['URL validation failed'] };
    }
    // Fire-and-forget: runExtraction sets NEEDS_REVIEW/FAILED on its own, so a
    // failure never leaves the brand stuck on ANALYZING. The backend process
    // is long-lived (pm2), so the unawaited promise runs to completion.
    const url = prepared.url;
    void this.runExtraction(brandProfileId, url).catch(() => {
      // runExtraction already recorded FAILED; nothing else to do here.
    });
    return { success: true, started: true, status: BrandProfileStatus.ANALYZING };
  }

  private async runExtraction(
    brandProfileId: string,
    url: string,
  ): Promise<ExtractionResult> {
    const errors: string[] = [];
    try {
      // 3. Extrair metadados do site
      const metadata = await this.websiteMetadataExtractor.extract(url);

      // 4. Construir prompt para LLM
      const prompt = this.buildPrompt(metadata);

      // 5. Chamar OpenAI (generateStructured already validates against the
      // schema internally and retries on failure - a non-null `data` here is
      // already schema-valid, so there is nothing left to re-validate).
      const { data: llmResult, lastError } = await this.openaiService.generateBrandDna(prompt);

      if (!llmResult) {
        // lastError is the REAL reason (provider exception, unparseable
        // reply, or schema mismatch) instead of the old generic message that
        // gave no way to tell those apart without production log access.
        const reason = lastError || 'AI returned no usable response after retries';
        errors.push(reason);
        await this.brandProfileRepository.updateById(brandProfileId, {
          status: BrandProfileStatus.FAILED,
          lastAnalysisError: reason.slice(0, 2000),
        });
        return { success: false, errors };
      }

      // Because every field is optional (kie.ai has no structured-output
      // enforcement - see the schema file's header comment), a technically
      // valid but completely empty `{}` would otherwise "succeed" with a
      // useless blank DNA. Require at least one substantive field.
      const hasContent =
        llmResult.summary?.tagline || llmResult.summary?.description || llmResult.summary?.industry ||
        llmResult.voice?.tone || llmResult.offer?.products?.length || llmResult.offer?.services?.length;
      if (!hasContent) {
        const reason = 'AI response validated but contained no usable brand data';
        errors.push(reason);
        await this.brandProfileRepository.updateById(brandProfileId, {
          status: BrandProfileStatus.FAILED,
          lastAnalysisError: reason,
        });
        return { success: false, errors };
      }

      const dnaData: BrandDnaExtraction = normalizeBrandDnaExtraction(llmResult);

      // 7. Calculate next version
      const latestSnapshot =
        await this.brandDnaSnapshotRepository.findLatest(brandProfileId);
      const nextVersion = latestSnapshot ? latestSnapshot.version + 1 : 1;

      // 8. Salvar snapshot (new fields go into existing Json columns)
      const snapshot = await this.brandDnaSnapshotRepository.create({
        brandProfileId,
        version: nextVersion,
        sourceType: 'website',
        sourceUrl: url,
        summary: dnaData.summary,
        voice: dnaData.voice,
        audience: dnaData.audience,
        offer: dnaData.offer,
        visual: dnaData.visual,
        constraints: dnaData.constraints,
        messaging: dnaData.messaging,
        contentGuidelines: dnaData.contentGuidelines,
        confidence: dnaData.confidence || null,
        promptVersion: VERSION,
        model: aiTextConfig().model,
      });

      // 9. Salvar assets candidatos
      const assets: any[] = [];

      if (metadata.favicon) {
        const asset = await this.brandAssetRepository.create({
          brandProfileId,
          type: 'favicon',
          sourceUrl: metadata.favicon,
        });
        assets.push(asset);
      }

      if (metadata.logo) {
        const asset = await this.brandAssetRepository.create({
          brandProfileId,
          type: 'logo',
          sourceUrl: metadata.logo,
        });
        assets.push(asset);
      }

      if (metadata.ogImage) {
        const asset = await this.brandAssetRepository.create({
          brandProfileId,
          type: 'og_image',
          sourceUrl: metadata.ogImage,
        });
        assets.push(asset);
      }

      // 10. Atualizar status para NEEDS_REVIEW
      await this.brandProfileRepository.updateById(brandProfileId, {
        status: BrandProfileStatus.NEEDS_REVIEW,
        lastAnalysisError: null,
      });

      // Serialize Prisma models to plain JSON-safe objects
      return {
        success: true,
        snapshot: JSON.parse(
          JSON.stringify(snapshot, (_k, v) =>
            typeof v === 'bigint' ? v.toString() : v
          )
        ),
        assets: JSON.parse(
          JSON.stringify(assets, (_k, v) =>
            typeof v === 'bigint' ? v.toString() : v
          )
        ),
      };
    } catch (error: any) {
      // Catches failures from steps before the LLM call too - most notably
      // websiteMetadataExtractor.extract() throwing (site fetch failed,
      // timed out, or returned something JSDOM/extraction choked on). This
      // is a real, distinct failure mode from the LLM-response cases above,
      // and previously produced the exact same opaque "Falhou" badge.
      const reason = error?.message || 'Extraction failed';
      errors.push(reason);
      try {
        await this.brandProfileRepository.updateById(brandProfileId, {
          status: BrandProfileStatus.FAILED,
          lastAnalysisError: String(reason).slice(0, 2000),
        });
      } catch {
        // ignore secondary failure
      }
      return { success: false, errors };
    }
  }

  private buildPrompt(metadata: any): string {
    return `You are a senior brand strategist and content marketing expert. Analyze this brand website and extract a comprehensive, structured brand DNA profile. Be specific, insightful, and evidence-based.

Website URL: ${metadata.url}
Title: ${metadata.title || 'N/A'}
Description: ${metadata.description || 'N/A'}
Industry hint: ${metadata.ogSiteName || 'N/A'}

Website content:
${metadata.mainText?.slice(0, 10000) || 'No content extracted'}

Extract the following as structured JSON:

## 1. Summary
- **tagline**: A short, catchy tagline (from the website or inferred)
- **description**: Concise description of what the brand does
- **industry**: The industry the brand operates in
- **targetAudience**: The primary target audience
- **missionStatement**: The brand mission statement (empty string if not found)
- **valueProposition**: The core value proposition - what unique value they deliver

## 2. Voice
- **tone**: Overall tone (e.g. "professional yet approachable", "bold and irreverent")
- **style**: Writing style (e.g. "conversational", "technical", "storytelling")
- **personality**: 2-4 personality adjectives that define the brand character
- **forbiddenWords**: Words/phrases the brand clearly avoids
- **examplePhrases**: 2-3 example sentences in the brand voice (rewrite key website phrases to illustrate tone)

## 3. Audience
- **demographics**: Key demographic info (age, gender, profession, income level)
- **painPoints**: 2-4 primary pain points the audience faces that this brand addresses
- **desires**: What the audience aspires to achieve
- **objections**: Common objections to purchasing or engaging
- **buyerPersonas**: Create 2-3 specific buyer personas, each with:
  - name: A short persona label (e.g. "Startup Founder Sam", "Marketing Director Maria")
  - description: 1-2 sentence description
  - role: Their typical job role or life context

## 4. Offer
- **products**: All products mentioned on the site
- **services**: All services offered
- **uniqueSellingPoints**: 2-4 key differentiators vs competitors
- **pricingHint**: Pricing positioning (e.g. "premium", "freemium", "enterprise pricing") or null
- **category**: Product/service category (e.g. "SaaS", "E-commerce", "Agency", "Consulting") or null
- **topCompetitors**: 2-4 competitor brand names detected from website mentions

## 5. Visual
- **colors**: Brand colors (use hex codes if extractable, otherwise descriptive names)
- **style**: Visual style description (e.g. "minimalist with bold accent colors")
- **typographyHint**: Typography preferences if identifiable, or null
- **imageryStyle**: Type of imagery used (e.g. "lifestyle photography", "abstract illustrations", "product close-ups")

## 6. Constraints
- **do**: Specific things to do when representing this brand (5-8 items)
- **avoid**: Specific things to avoid (5-8 items)
- **requiredElements**: Elements that must be in every piece of content (e.g. "logo placement", "tagline", "brand colors")

## 7. Messaging
- **messagingPillars**: 3-5 core messaging pillars / recurring themes the brand emphasizes across channels
- **keyMessages**: 2-4 key messages the brand consistently communicates
- **callToActionStyle**: Preferred CTA style (e.g. "urgency-driven", "value-led", "soft invitation") or null

## 8. Content Guidelines
- **preferredFormats**: Content formats the brand favors (e.g. "carousels", "short-form video", "infographics")
- **hashtagsStrategy**: Hashtag usage strategy observed, or null if not applicable
- **emojiUsage**: Emoji usage pattern observed, or null

## 9. Confidence (0-1 scale for each)
- **overall**: Overall extraction confidence
- **textual**: Confidence based on text content quality
- **visual**: Confidence based on visual/style information available
- **commercial**: Confidence in offer/pricing extraction
- **messaging**: Confidence in messaging pillar extraction
- **brandValues**: Confidence in mission/values extraction

IMPORTANT RULES:
- Use evidence from the website content - do not fabricate information
- When inferring, use "inferred from context" reasoning
- For fields where no evidence exists, use empty strings/arrays and low confidence scores (0.1-0.3)
- Colors should prefer hex format (#RRGGBB) when detectable from CSS/meta
- Buyer personas should feel specific and actionable, not generic`;
  }
}
