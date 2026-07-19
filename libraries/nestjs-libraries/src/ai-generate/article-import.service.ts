import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ExtractContentService } from '@gitroom/nestjs-libraries/openai/extract.content.service';
import { AiGenerateService } from '@gitroom/nestjs-libraries/ai-generate/ai-generate.service';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';

@Injectable()
export class ArticleImportService {
  constructor(
    private _extractContentService: ExtractContentService,
    private _aiGenerateService: AiGenerateService,
    private _brandProfileService: BrandProfileService,
  ) {}

  /**
   * Import an article/URL and convert to carousel.
   * Extracts content from URL, then generates a carousel plan.
   */
  async importAndGenerate(
    orgId: string,
    data: {
      url: string;
      brandProfileId: string;
      slideCount?: number;
      language?: string;
    },
  ) {
    // Validate brand ownership
    const brand = await this._brandProfileService.getBrand(
      data.brandProfileId,
      orgId
    );
    if (!brand) {
      throw new HttpException(
        { msg: 'Brand not found or access denied' },
        HttpStatus.NOT_FOUND,
      );
    }

    // Extract content from URL
    let extractedContent: string;
    try {
      extractedContent = await this._extractContentService.extractFromUrl(
        data.url,
      );
    } catch (error: any) {
      throw new HttpException(
        { msg: `Failed to extract content from URL: ${error.message}` },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!extractedContent || extractedContent.length < 50) {
      throw new HttpException(
        { msg: 'Insufficient content extracted from URL' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Generate carousel from extracted content
    return this._aiGenerateService.generateCarouselPlan(orgId, {
      brandProfileId: data.brandProfileId,
      sourceUrl: data.url,
      sourceText: extractedContent.substring(0, 5000),
      slideCount: data.slideCount || 6,
      language: data.language || 'pt-BR',
    });
  }

  /**
   * Extract content from URL without generating carousel.
   * Useful for preview before generation.
   */
  async extractOnly(url: string) {
    try {
      const content = await this._extractContentService.extractFromUrl(url);
      return {
        url,
        contentLength: content.length,
        preview: content.substring(0, 500),
        fullContent: content,
      };
    } catch (error: any) {
      throw new HttpException(
        { msg: `Failed to extract content: ${error.message}` },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
