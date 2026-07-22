import { Module } from '@nestjs/common';
import { BrandTokenMapper } from './brand/brand-token-mapper';
import { TemplateFillService } from './build/template-fill.service';
import { DesignSystemCatalogService } from './catalog/catalog.service';
import { HybridComposeService } from './hybrid/hybrid-compose.service';
import { IdeateService } from './ideate/ideate.service';
import { DesignSystemJobService } from './jobs/design-system-job.service';
import { PlaywrightRenderService } from './render/playwright-render.service';

/**
 * Design System (xniper-style HTML → Playwright PNG).
 * Depends on global DatabaseModule for GenerationJobService + MediaService.
 */
@Module({
  providers: [
    DesignSystemCatalogService,
    IdeateService,
    TemplateFillService,
    BrandTokenMapper,
    PlaywrightRenderService,
    DesignSystemJobService,
    HybridComposeService,
  ],
  exports: [
    DesignSystemCatalogService,
    IdeateService,
    TemplateFillService,
    BrandTokenMapper,
    PlaywrightRenderService,
    DesignSystemJobService,
    HybridComposeService,
  ],
})
export class DesignSystemModule {}
