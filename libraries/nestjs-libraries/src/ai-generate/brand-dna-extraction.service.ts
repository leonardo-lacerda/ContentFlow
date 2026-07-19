import { Injectable } from '@nestjs/common';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { UrlValidationService } from '@gitroom/nestjs-libraries/openai/url-validation.service';
import { WebsiteMetadataExtractor } from '@gitroom/nestjs-libraries/openai/website-metadata.extractor';
import { BrandProfileRepository } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.repository';
import { BrandDnaSnapshotRepository } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-dna-snapshot.repository';
import { BrandAssetRepository } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-asset.repository';
import {
  BrandDnaExtractionSchema,
  VERSION,
} from '@gitroom/nestjs-libraries/ai-generate/schemas/brand-dna-extraction.schema';
import type { BrandDnaExtraction } from '@gitroom/nestjs-libraries/ai-generate/schemas/brand-dna-extraction.schema';
import { BrandProfileStatus } from '@prisma/client';

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
  ) {}

  async analyze(
    brandProfileId: string,
    rawUrl: string,
  ): Promise<ExtractionResult> {
    const errors: string[] = [];

    // 1. Validar URL
    const validation = await this.urlValidationService.validate(rawUrl);
    if (!validation.success) {
      return { success: false, errors: [validation.error.message] };
    }
    const { url } = validation.data;

    // 2. Atualizar status para ANALYZING
    await this.brandProfileRepository.updateById(brandProfileId, {
      status: BrandProfileStatus.ANALYZING,
    });

    try {
      // 3. Extrair metadados do site
      const metadata = await this.websiteMetadataExtractor.extract(url);

      // 4. Construir prompt para LLM
      const prompt = this.buildPrompt(metadata);

      // 5. Chamar OpenAI
      const llmResult = await this.openaiService.generateBrandDna(prompt);

      if (!llmResult) {
        errors.push('AI returned null or empty response');
        await this.brandProfileRepository.updateById(brandProfileId, {
          status: BrandProfileStatus.FAILED,
        });
        return { success: false, errors };
      }

      // 6. Validar resposta contra schema
      const validationResult = BrandDnaExtractionSchema.safeParse(llmResult);
      if (!validationResult.success) {
        errors.push(
          'AI response validation failed: ' + validationResult.error.message,
        );
        await this.brandProfileRepository.updateById(brandProfileId, {
          status: BrandProfileStatus.FAILED,
        });
        return { success: false, errors };
      }

      const dnaData: BrandDnaExtraction = validationResult.data;

      // 7. Calcular próximo version
      const latestSnapshot =
        await this.brandDnaSnapshotRepository.findLatest(brandProfileId);
      const nextVersion = latestSnapshot ? latestSnapshot.version + 1 : 1;

      // 8. Salvar snapshot
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
        confidence: dnaData.confidence || null,
        promptVersion: VERSION,
        model: 'gpt-4.1',
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
      });

      // Serialize Prisma models to plain JSON-safe objects (no Decimal/BigInt surprises)
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
      errors.push(error.message || 'Extraction failed');
      try {
        await this.brandProfileRepository.updateById(brandProfileId, {
          status: BrandProfileStatus.FAILED,
        });
      } catch {
        // ignore secondary failure
      }
      return { success: false, errors };
    }
  }

  private buildPrompt(metadata: any): string {
    return `Analyze this brand website and extract structured brand DNA.

Website URL: ${metadata.url}
Title: ${metadata.title || 'N/A'}
Description: ${metadata.description || 'N/A'}
Industry hint: ${metadata.ogSiteName || 'N/A'}

Website content:
${metadata.mainText?.slice(0, 10000) || 'No content extracted'}

Extract the following as structured JSON:
1. **Summary**: tagline, description, industry, target audience
2. **Voice**: tone, style, personality, forbidden words
3. **Audience**: demographics, pain points, desires, objections
4. **Offer**: products, services, unique selling points, pricing hint
5. **Visual**: colors, style, typography hint
6. **Constraints**: things to do, things to avoid, required elements
7. **Confidence**: overall, textual, visual, commercial (0-1)

Be specific and use evidence from the website content. If information is not available, leave fields empty or use low confidence scores.`;
  }
}
