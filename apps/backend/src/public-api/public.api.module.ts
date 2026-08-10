import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthService } from '@gitroom/backend/services/auth/auth.service';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { CaktoService } from '@gitroom/nestjs-libraries/services/cakto.service';
import { PoliciesGuard } from '@gitroom/backend/services/auth/permissions/permissions.guard';
import { PermissionsService } from '@gitroom/backend/services/auth/permissions/permissions.service';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { UploadModule } from '@gitroom/nestjs-libraries/upload/upload.module';
import { DesignSystemModule } from '@gitroom/nestjs-libraries/design-system/design-system.module';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { ExtractContentService } from '@gitroom/nestjs-libraries/openai/extract.content.service';
import { CodesService } from '@gitroom/nestjs-libraries/services/codes.service';
import { PublicIntegrationsController } from '@gitroom/backend/public-api/routes/v1/public.integrations.controller';
import { PublicCarouselsController } from '@gitroom/backend/public-api/routes/v1/public.carousels.controller';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';
import { ContentIdeaService } from '@gitroom/nestjs-libraries/database/prisma/content-ideas/content-idea.service';
import { CarouselProjectService } from '@gitroom/nestjs-libraries/database/prisma/carousel-projects/carousel-project.service';
import { GenerationJobService } from '@gitroom/nestjs-libraries/database/prisma/generation-jobs/generation-job.service';
import { AiGenerateService } from '@gitroom/nestjs-libraries/ai-generate/ai-generate.service';
import { PublicAuthMiddleware } from '@gitroom/backend/services/auth/public.auth.middleware';
import { IdempotencyMiddleware } from '@gitroom/backend/services/auth/idempotency.middleware';
import { PublicCreativeController } from '@gitroom/backend/public-api/routes/v1/public.creative.controller';
import { CreativeEngineService } from '@gitroom/nestjs-libraries/creative-engine/creative-engine.service';
import { CreativeWorkflowService } from '@gitroom/nestjs-libraries/creative-engine/creative-workflow.service';
import { CreativeProviderService } from '@gitroom/nestjs-libraries/creative-engine/creative-provider.service';
import { CreativeCreditService } from '@gitroom/nestjs-libraries/creative-engine/creative-credit.service';
import { CreditAccountingService } from '@gitroom/nestjs-libraries/services/credit-accounting.service';
import { PricingCatalogService } from '@gitroom/nestjs-libraries/services/pricing-catalog.service';
import { CreativeWebhookService } from '@gitroom/nestjs-libraries/creative-engine/creative-webhook.service';
import { CreativeModerationService } from '@gitroom/nestjs-libraries/creative-engine/creative-moderation.service';
import { CreativeMediaToolService } from '@gitroom/nestjs-libraries/creative-engine/creative-media-tool.service';
import { CreativeOutputValidationService } from '@gitroom/nestjs-libraries/creative-engine/creative-output-validation.service';
import { CreativeMetricsService } from '@gitroom/nestjs-libraries/creative-engine/creative-metrics.service';
import { CreativeExportService } from '@gitroom/nestjs-libraries/creative-engine/creative-export.service';
import { CreativeEvaluationService } from '@gitroom/nestjs-libraries/creative-engine/creative-evaluation.service';
import { CreativePublishService } from '@gitroom/nestjs-libraries/creative-engine/creative-publish.service';
import { CreativeOutputStorageService } from '@gitroom/nestjs-libraries/creative-engine/creative-output-storage.service';
import { CreativeSceneGraphService } from '@gitroom/nestjs-libraries/creative-engine/creative-scene-graph.service';
import { CreativeFeatureFlagGuard } from '@gitroom/nestjs-libraries/creative-engine/creative-feature-flag.guard';

const authenticatedController = [PublicIntegrationsController, PublicCarouselsController, PublicCreativeController];
@Module({
  imports: [UploadModule, DesignSystemModule],
  controllers: [...authenticatedController],
  providers: [
    AuthService,
    StripeService,
    CaktoService,
    OpenaiService,
    ExtractContentService,
    PoliciesGuard,
    PermissionsService,
    CodesService,
    IntegrationManager,
    BrandProfileService,
    ContentIdeaService,
    CarouselProjectService,
    GenerationJobService,
    AiGenerateService,
    CreativeEngineService,
    CreativeWorkflowService,
    CreativeProviderService,
    CreativeCreditService,
    CreditAccountingService,
    PricingCatalogService,
    CreativeWebhookService,
    CreativeModerationService,
    CreativeMediaToolService,
    CreativeOutputValidationService,
    CreativeMetricsService,
    CreativeExportService,
    CreativeEvaluationService,
    CreativePublishService,
    CreativeOutputStorageService,
    CreativeSceneGraphService,
    CreativeFeatureFlagGuard,
  ],
  get exports() {
    return [...this.imports, ...this.providers];
  },
})
export class PublicApiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PublicAuthMiddleware).forRoutes(...authenticatedController);
    consumer.apply(IdempotencyMiddleware).forRoutes(...authenticatedController);
  }
}

