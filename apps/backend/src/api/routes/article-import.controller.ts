import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { ArticleImportService } from '@gitroom/nestjs-libraries/ai-generate/article-import.service';

@ApiTags('Article Import')
@Controller('/article-import')
export class ArticleImportController {
  constructor(private readonly _articleImportService: ArticleImportService) {}

  @Post('/generate')
  async importAndGenerate(
    @GetOrgFromRequest() org: Organization,
    @Body()
    body: {
      url: string;
      brandProfileId: string;
      slideCount?: number;
      language?: string;
    },
  ) {
    return this._articleImportService.importAndGenerate(org.id, body);
  }

  @Get('/extract')
  async extractOnly(@Query('url') url: string) {
    return this._articleImportService.extractOnly(url);
  }
}
