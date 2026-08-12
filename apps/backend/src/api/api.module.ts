import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthController } from '@gitroom/backend/api/routes/auth.controller';
import { AuthService } from '@gitroom/backend/services/auth/auth.service';
import { UsersController } from '@gitroom/backend/api/routes/users.controller';
import { AuthMiddleware } from '@gitroom/backend/services/auth/auth.middleware';
import { StripeController } from '@gitroom/backend/api/routes/stripe.controller';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { CaktoService } from '@gitroom/nestjs-libraries/services/cakto.service';
import { AnalyticsController } from '@gitroom/backend/api/routes/analytics.controller';
import { PoliciesGuard } from '@gitroom/backend/services/auth/permissions/permissions.guard';
import { PermissionsService } from '@gitroom/backend/services/auth/permissions/permissions.service';
import { IntegrationsController } from '@gitroom/backend/api/routes/integrations.controller';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { SettingsController } from '@gitroom/backend/api/routes/settings.controller';
import { PostsController } from '@gitroom/backend/api/routes/posts.controller';
import { MediaController } from '@gitroom/backend/api/routes/media.controller';
import { UploadModule } from '@gitroom/nestjs-libraries/upload/upload.module';
import { BillingController } from '@gitroom/backend/api/routes/billing.controller';
import { NotificationsController } from '@gitroom/backend/api/routes/notifications.controller';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { ExtractContentService } from '@gitroom/nestjs-libraries/openai/extract.content.service';
import { CodesService } from '@gitroom/nestjs-libraries/services/codes.service';
import { CopilotController } from '@gitroom/backend/api/routes/copilot.controller';
import { PublicController } from '@gitroom/backend/api/routes/public.controller';
import { RootController } from '@gitroom/backend/api/routes/root.controller';
import { TrackService } from '@gitroom/nestjs-libraries/track/track.service';
import { ShortLinkService } from '@gitroom/nestjs-libraries/short-linking/short.link.service';
import { Nowpayments } from '@gitroom/nestjs-libraries/crypto/nowpayments';
import { WebhookController } from '@gitroom/backend/api/routes/webhooks.controller';
import { SignatureController } from '@gitroom/backend/api/routes/signature.controller';
import { AutopostController } from '@gitroom/backend/api/routes/autopost.controller';
import { SetsController } from '@gitroom/backend/api/routes/sets.controller';
import { ThirdPartyController } from '@gitroom/backend/api/routes/third-party.controller';
import { MonitorController } from '@gitroom/backend/api/routes/monitor.controller';
import { NoAuthIntegrationsController } from '@gitroom/backend/api/routes/no.auth.integrations.controller';
import { EnterpriseController } from '@gitroom/backend/api/routes/enterprise.controller';
import { OAuthAppController } from '@gitroom/backend/api/routes/oauth-app.controller';
import { ApprovedAppsController } from '@gitroom/backend/api/routes/approved-apps.controller';
import { OAuthController, OAuthAuthorizedController } from '@gitroom/backend/api/routes/oauth.controller';
import { AnnouncementsController } from '@gitroom/backend/api/routes/announcements.controller';
import { AdminController } from '@gitroom/backend/api/routes/admin.controller';
import { AiGenerateController } from '@gitroom/backend/api/routes/ai-generate.controller';
import { AiGenerateService } from '@gitroom/nestjs-libraries/ai-generate/ai-generate.service';
import { DesignSystemModule } from '@gitroom/nestjs-libraries/design-system/design-system.module';
import { TemplateRecommenderService } from '@gitroom/nestjs-libraries/ai-generate/templates/template-recommender.service';
import { AuthProviderManager } from '@gitroom/backend/services/auth/providers/providers.manager';
import { BrandsController } from '@gitroom/backend/api/routes/brands.controller';
import { ContentIdeaController } from '@gitroom/backend/api/routes/content-ideas.controller';
import { CarouselProjectController } from '@gitroom/backend/api/routes/carousel-projects.controller';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';
import { BrandProfileRepository } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.repository';
import { BrandDnaSnapshotRepository } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-dna-snapshot.repository';
import { BrandAssetRepository } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-asset.repository';
import { BrandLearningService } from '@gitroom/nestjs-libraries/database/prisma/brand-learning/brand-learning.service';
import { BrandLearningRepository } from '@gitroom/nestjs-libraries/database/prisma/brand-learning/brand-learning.repository';
import { ContentIdeaService } from '@gitroom/nestjs-libraries/database/prisma/content-ideas/content-idea.service';
import { ContentIdeaRepository } from '@gitroom/nestjs-libraries/database/prisma/content-ideas/content-idea.repository';
import { CarouselProjectService } from '@gitroom/nestjs-libraries/database/prisma/carousel-projects/carousel-project.service';
import { CarouselProjectRepository } from '@gitroom/nestjs-libraries/database/prisma/carousel-projects/carousel-project.repository';
import { GenerationJobService } from '@gitroom/nestjs-libraries/database/prisma/generation-jobs/generation-job.service';
import { GenerationJobRepository } from '@gitroom/nestjs-libraries/database/prisma/generation-jobs/generation-job.repository';
import { PlanLimitsService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/plan-limits.service';
import { GenerationJobController } from '@gitroom/backend/api/routes/generation-jobs.controller';
import { EditorialPlansController } from '@gitroom/backend/api/routes/editorial-plans.controller';
import { EditorialPlanService } from '@gitroom/nestjs-libraries/database/prisma/editorial-plans/editorial-plan.service';
import { EditorialPlanRepository } from '@gitroom/nestjs-libraries/database/prisma/editorial-plans/editorial-plan.repository';
import { CarouselPerformanceController } from '@gitroom/backend/api/routes/carousel-performance.controller';
import { BrandLearningController } from '@gitroom/backend/api/routes/brand-learning.controller';
import { CarouselPerformanceService } from '@gitroom/nestjs-libraries/database/prisma/carousel-performance/carousel-performance.service';
import { CarouselPerformanceRepository } from '@gitroom/nestjs-libraries/database/prisma/carousel-performance/carousel-performance.repository';
import { RecommendationService } from '@gitroom/nestjs-libraries/database/prisma/carousel-performance/recommendation.service';
import { GithubProvider } from '@gitroom/backend/services/auth/providers/github.provider';
import { SocialPostsController } from '@gitroom/backend/api/routes/social-posts.controller';
import { SocialPostGenerateService } from '@gitroom/nestjs-libraries/ai-generate/social-post-generate.service';
import { AdCreativesController } from '@gitroom/backend/api/routes/ad-creatives.controller';
import { AdCreativeGenerateService } from '@gitroom/nestjs-libraries/ai-generate/ad-creative-generate.service';
import { EmailCampaignsController } from '@gitroom/backend/api/routes/email-campaigns.controller';
import { EmailCampaignGenerateService } from '@gitroom/nestjs-libraries/ai-generate/email-campaign-generate.service';
import { EmailCampaignService } from '@gitroom/nestjs-libraries/database/prisma/email-campaigns/email-campaign.service';
import { EmailCampaignRepository } from '@gitroom/nestjs-libraries/database/prisma/email-campaigns/email-campaign.repository';
import { VideoScriptsController } from '@gitroom/backend/api/routes/video-scripts.controller';
import { PlanLimitsController } from '@gitroom/backend/api/routes/plan-limits.controller';
import { AffiliatesController } from '@gitroom/backend/api/routes/affiliates.controller';
import { AffiliateService } from '@gitroom/nestjs-libraries/database/prisma/affiliates/affiliate.service';
import { TemplateMarketplaceController } from '@gitroom/backend/api/routes/template-marketplace.controller';
import { TemplateMarketplaceService } from '@gitroom/nestjs-libraries/database/prisma/templates/template-marketplace.service';
import { WebhooksController } from '@gitroom/backend/api/routes/webhooks-integrations.controller';
import { WebhookService } from '@gitroom/nestjs-libraries/database/prisma/webhooks/webhook.service';
import { ArticleImportController } from '@gitroom/backend/api/routes/article-import.controller';
import { ArticleImportService } from '@gitroom/nestjs-libraries/ai-generate/article-import.service';
import { VideoScriptGenerateService } from '@gitroom/nestjs-libraries/ai-generate/video-script-generate.service';
import { ShortVideoService } from '@gitroom/nestjs-libraries/database/prisma/short-video/short-video.service';
import { ShortVideoRepository } from '@gitroom/nestjs-libraries/database/prisma/short-video/short-video.repository';
import { GoogleProvider } from '@gitroom/backend/services/auth/providers/google.provider';
import { FarcasterProvider } from '@gitroom/backend/services/auth/providers/farcaster.provider';
import { WalletProvider } from '@gitroom/backend/services/auth/providers/wallet.provider';
import { OauthProvider } from '@gitroom/backend/services/auth/providers/oauth.provider';
import { CircuitBreakerService } from '@gitroom/nestjs-libraries/ai-generate/circuit-breaker.service';
import { CarouselDraftsController } from './routes/carousel-drafts.controller';
import { CarouselDraftService } from '@gitroom/nestjs-libraries/database/prisma/carousel-drafts/carousel-draft.service';
import { CarouselDraftRepository } from '@gitroom/nestjs-libraries/database/prisma/carousel-drafts/carousel-draft.repository';
import { CreativeController } from '@gitroom/backend/api/routes/creative.controller';
import { CreativeWorkflowsController } from '@gitroom/backend/api/routes/creative-workflows.controller';
import { CreativeEngineService } from '@gitroom/nestjs-libraries/creative-engine/creative-engine.service';
import { CreativeProviderService } from '@gitroom/nestjs-libraries/creative-engine/creative-provider.service';
import { CreativeCreditService } from '@gitroom/nestjs-libraries/creative-engine/creative-credit.service';
import { CreativeWorkflowService } from '@gitroom/nestjs-libraries/creative-engine/creative-workflow.service';
import { CreativeWebhookService } from '@gitroom/nestjs-libraries/creative-engine/creative-webhook.service';
import { CreativeRightsService } from '@gitroom/nestjs-libraries/creative-engine/creative-rights.service';
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
import { CreativeKieController } from '@gitroom/backend/api/routes/creative-kie.controller';
import { StudioController } from '@gitroom/backend/api/routes/studio.controller';
import { StudioArtifactService } from '@gitroom/nestjs-libraries/chat/studio/studio-artifact.service';
import { CreditAccountingService } from '@gitroom/nestjs-libraries/services/credit-accounting.service';
import { BillingAccountingService } from '@gitroom/nestjs-libraries/services/billing-accounting.service';
import { BillingStripeService } from '@gitroom/nestjs-libraries/services/billing-stripe.service';
import { PricingCatalogService } from '@gitroom/nestjs-libraries/services/pricing-catalog.service';
import { AdminSecurityController } from '@gitroom/backend/api/routes/admin/admin-security.controller';
import { AdminAuditController } from '@gitroom/backend/api/routes/admin/admin-audit.controller';
import { AdminAuthService } from '@gitroom/backend/services/auth/admin/admin-auth.service';
import { AdminSessionGuard } from '@gitroom/backend/services/auth/admin/admin-session.guard';
import { AdminPermissionGuard } from '@gitroom/backend/services/auth/admin/admin-permission.guard';
import { AdminDomainService } from '@gitroom/backend/api/routes/admin/admin-domain.service';
import { AdminUsersController, AdminOrganizationsController } from '@gitroom/backend/api/routes/admin/admin-users-organizations.controller';
import { AdminBillingController, AdminCreditsController, AdminAiController } from '@gitroom/backend/api/routes/admin/admin-billing-ai.controller';
import { AdminContentController, AdminIntegrationsController, AdminSystemController } from '@gitroom/backend/api/routes/admin/admin-content-integrations-system.controller';
import { AdminAnalyticsController, AdminSecurityOperationsController } from '@gitroom/backend/api/routes/admin/admin-analytics-security.controller';

const authenticatedController = [
  UsersController,
  AnalyticsController,
  IntegrationsController,
  SettingsController,
  PostsController,
  MediaController,
  BillingController,
  NotificationsController,
  CopilotController,
  WebhookController,
  SignatureController,
  AutopostController,
  SetsController,
  ThirdPartyController,
  OAuthAppController,
  ApprovedAppsController,
  OAuthAuthorizedController,
  AnnouncementsController,
  AdminController,
  AiGenerateController,
  BrandsController,
  ContentIdeaController,
  CarouselProjectController,
  GenerationJobController,
  EditorialPlansController,
  CarouselPerformanceController,
  BrandLearningController,
  SocialPostsController,
  AdCreativesController,
  EmailCampaignsController,
  VideoScriptsController,
  PlanLimitsController,
  AffiliatesController,
  TemplateMarketplaceController,
  WebhooksController,
  ArticleImportController,
  CarouselDraftsController,
  CreativeController,
  CreativeWorkflowsController,
  StudioController,
  AdminSecurityController,
  AdminAuditController,
  AdminUsersController,
  AdminOrganizationsController,
  AdminBillingController,
  AdminCreditsController,
  AdminAiController,
  AdminContentController,
  AdminIntegrationsController,
  AdminSystemController,
  AdminAnalyticsController,
  AdminSecurityOperationsController,
];
@Module({
  imports: [UploadModule, DesignSystemModule],
  controllers: [
    RootController,
    StripeController,
    AuthController,
    PublicController,
    MonitorController,
    EnterpriseController,
    NoAuthIntegrationsController,
    CreativeKieController,
    OAuthController,
    ...authenticatedController,
  ],
  providers: [
    AuthService,
    StripeService,
    CaktoService,
    OpenaiService,
    ExtractContentService,
    AuthMiddleware,
    PoliciesGuard,
    PermissionsService,
    CodesService,
    IntegrationManager,
    TrackService,
    ShortLinkService,
    Nowpayments,
    AiGenerateService,
    TemplateRecommenderService,
    AuthProviderManager,
    GithubProvider,
    GoogleProvider,
    FarcasterProvider,
    WalletProvider,
    OauthProvider,
    BrandProfileService,
    BrandProfileRepository,
    BrandDnaSnapshotRepository,
    BrandAssetRepository,
    ContentIdeaService,
    ContentIdeaRepository,
    CarouselProjectService,
    CarouselProjectRepository,
    GenerationJobService,
    GenerationJobRepository,
    PlanLimitsService,
  AffiliateService,
  TemplateMarketplaceService,
  WebhookService,
  ArticleImportService,
    EditorialPlanService,
    EditorialPlanRepository,
    CarouselPerformanceService,
    CarouselPerformanceRepository,
    RecommendationService,
    BrandLearningService,
  BrandLearningRepository,
  SocialPostGenerateService,
  AdCreativeGenerateService,
  EmailCampaignGenerateService,
  EmailCampaignService,
  EmailCampaignRepository,
  VideoScriptGenerateService,
  ShortVideoService,
  ShortVideoRepository,
  CircuitBreakerService,
  CarouselDraftService,
  CarouselDraftRepository,
  CreativeEngineService,
  CreativeProviderService,
  CreativeCreditService,
  CreditAccountingService,
  BillingAccountingService,
  BillingStripeService,
  PricingCatalogService,
  CreativeWorkflowService,
  CreativeWebhookService,
  CreativeRightsService,
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
    StudioArtifactService,
    AdminAuthService,
    AdminSessionGuard,
    AdminPermissionGuard,
    AdminDomainService,
  ],
  get exports() {
    return [...this.imports, ...this.providers];
  },
})
export class ApiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(...authenticatedController);
  }
}
