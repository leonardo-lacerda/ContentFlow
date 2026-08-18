import { Global, Module } from '@nestjs/common';
import { PrismaRepository, PrismaService, PrismaTransaction } from './prisma.service';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { UsersRepository } from '@gitroom/nestjs-libraries/database/prisma/users/users.repository';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { SubscriptionRepository } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.repository';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { IntegrationRepository } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.repository';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { PostsRepository } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.repository';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { MediaRepository } from '@gitroom/nestjs-libraries/database/prisma/media/media.repository';
import { CarouselImageCompositorService } from '@gitroom/nestjs-libraries/database/prisma/media/carousel-image-compositor.service';
import { NotificationsRepository } from '@gitroom/nestjs-libraries/database/prisma/notifications/notifications.repository';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { CaktoService } from '@gitroom/nestjs-libraries/services/cakto.service';
import { ExtractContentService } from '@gitroom/nestjs-libraries/openai/extract.content.service';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { UrlValidationService } from '@gitroom/nestjs-libraries/openai/url-validation.service';
import { WebsiteMetadataExtractor } from '@gitroom/nestjs-libraries/openai/website-metadata.extractor';
import { AgenciesService } from '@gitroom/nestjs-libraries/database/prisma/agencies/agencies.service';
import { AgenciesRepository } from '@gitroom/nestjs-libraries/database/prisma/agencies/agencies.repository';
import { TrackService } from '@gitroom/nestjs-libraries/track/track.service';
import { ShortLinkService } from '@gitroom/nestjs-libraries/short-linking/short.link.service';
import { WebhooksRepository } from '@gitroom/nestjs-libraries/database/prisma/webhooks/webhooks.repository';
import { WebhooksService } from '@gitroom/nestjs-libraries/database/prisma/webhooks/webhooks.service';
import { SignatureRepository } from '@gitroom/nestjs-libraries/database/prisma/signatures/signature.repository';
import { SignatureService } from '@gitroom/nestjs-libraries/database/prisma/signatures/signature.service';
import { AutopostRepository } from '@gitroom/nestjs-libraries/database/prisma/autopost/autopost.repository';
import { AutopostService } from '@gitroom/nestjs-libraries/database/prisma/autopost/autopost.service';
import { SetsService } from '@gitroom/nestjs-libraries/database/prisma/sets/sets.service';
import { SetsRepository } from '@gitroom/nestjs-libraries/database/prisma/sets/sets.repository';
import { ThirdPartyRepository } from '@gitroom/nestjs-libraries/database/prisma/third-party/third-party.repository';
import { ThirdPartyService } from '@gitroom/nestjs-libraries/database/prisma/third-party/third-party.service';
import { VideoManager } from '@gitroom/nestjs-libraries/videos/video.manager';
import { FalService } from '@gitroom/nestjs-libraries/openai/fal.service';
import { RefreshIntegrationService } from '@gitroom/nestjs-libraries/integrations/refresh.integration.service';
import { OAuthRepository } from '@gitroom/nestjs-libraries/database/prisma/oauth/oauth.repository';
import { OAuthService } from '@gitroom/nestjs-libraries/database/prisma/oauth/oauth.service';
import { AnnouncementsRepository } from '@gitroom/nestjs-libraries/database/prisma/announcements/announcements.repository';
import { AnnouncementsService } from '@gitroom/nestjs-libraries/database/prisma/announcements/announcements.service';
import { ErrorsRepository } from '@gitroom/nestjs-libraries/database/prisma/errors/errors.repository';
import { ErrorsService } from '@gitroom/nestjs-libraries/database/prisma/errors/errors.service';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';
import { BrandProfileRepository } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.repository';
import { BrandDnaSnapshotRepository } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-dna-snapshot.repository';
import { BrandAssetRepository } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-asset.repository';
import { BrandDnaExtractionService } from '@gitroom/nestjs-libraries/ai-generate/brand-dna-extraction.service';
import { PlanLimitsService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/plan-limits.service';
import { EditorialPlanService } from '@gitroom/nestjs-libraries/database/prisma/editorial-plans/editorial-plan.service';
import { EditorialPlanRepository } from '@gitroom/nestjs-libraries/database/prisma/editorial-plans/editorial-plan.repository';
import { CarouselPerformanceRepository } from '@gitroom/nestjs-libraries/database/prisma/carousel-performance/carousel-performance.repository';
import { CarouselPerformanceService } from '@gitroom/nestjs-libraries/database/prisma/carousel-performance/carousel-performance.service';
import { RecommendationService } from '@gitroom/nestjs-libraries/database/prisma/carousel-performance/recommendation.service';
import { BrandLearningService } from '@gitroom/nestjs-libraries/database/prisma/brand-learning/brand-learning.service';
import { BrandLearningRepository } from '@gitroom/nestjs-libraries/database/prisma/brand-learning/brand-learning.repository';
import { GenerationCostService } from '@gitroom/nestjs-libraries/database/prisma/generation-costs/generation-cost.service';
import { GenerationCostRepository } from '@gitroom/nestjs-libraries/database/prisma/generation-costs/generation-cost.repository';
import { CarouselDraftService } from '@gitroom/nestjs-libraries/database/prisma/carousel-drafts/carousel-draft.service';
import { CarouselDraftRepository } from '@gitroom/nestjs-libraries/database/prisma/carousel-drafts/carousel-draft.repository';
import { TemporalService } from 'nestjs-temporal-core';
import { CreditAccountingService } from '@gitroom/nestjs-libraries/services/credit-accounting.service';
import { AdminUserRepository } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-user.repository';
import { AdminUserService } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-user.service';
import { AdminSessionRepository } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-session.repository';
import { AdminSessionService } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-session.service';
import { AdminAuditRepository } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-audit.repository';
import { AdminAuditService } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-audit.service';
import { TotpService } from '@gitroom/nestjs-libraries/security/totp.service';
import { AdminRefreshTokenRepository } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-refresh-token.repository';
import { AdminRefreshTokenService } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-refresh-token.service';
import { AdminAlertService } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-alert.service';
import { BillingEntitlementsService } from '@gitroom/nestjs-libraries/services/billing-entitlements.service';
import { PricingCatalogService } from '@gitroom/nestjs-libraries/services/pricing-catalog.service';

// Quando o Temporal esta desabilitado (DISABLE_TEMPORAL=true), o modulo global
// do Temporal nao e carregado e o TemporalService deixa de existir no container
// de DI. Varios servicos (notifications, email, posts, autopost, integration,
// refresh) injetam TemporalService no construtor e quebrariam a inicializacao do
// NestJS. Este stub no-op permite que esses servicos sejam construidos; todas as
// chamadas de workflow viram no-op com optional chaining nos call sites.
const temporalDisabled = process.env.DISABLE_TEMPORAL === 'true';

const temporalStub = {
  client: {
    getRawClient: (): undefined => undefined,
    getWorkflowHandle: (): undefined => undefined,
  },
  terminateWorkflow: (): undefined => undefined,
} as unknown as TemporalService;

const temporalStubProvider = temporalDisabled
  ? [{ provide: TemporalService, useValue: temporalStub }]
  : [];

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [
    PrismaService,
    PrismaRepository,
    PrismaTransaction,
    UsersService,
    UsersRepository,
    OrganizationService,
    OrganizationRepository,
    SubscriptionService,
    SubscriptionRepository,
    NotificationService,
    NotificationsRepository,
    WebhooksRepository,
    WebhooksService,
    IntegrationService,
    IntegrationRepository,
    PostsService,
    PostsRepository,
    StripeService,
    CaktoService,
    SignatureRepository,
    AutopostRepository,
    AutopostService,
    SignatureService,
    MediaService,
    MediaRepository,
    CarouselImageCompositorService,
    AgenciesService,
    AgenciesRepository,
    IntegrationManager,
    RefreshIntegrationService,
    ExtractContentService,
    OpenaiService,
    FalService,
    EmailService,
    TrackService,
    ShortLinkService,
    SetsService,
    SetsRepository,
    ThirdPartyRepository,
    ThirdPartyService,
    OAuthRepository,
    OAuthService,
    VideoManager,
    AnnouncementsRepository,
    AnnouncementsService,
    ErrorsRepository,
    ErrorsService,
    BrandProfileService,
    BrandProfileRepository,
    BrandDnaSnapshotRepository,
    BrandAssetRepository,
    PlanLimitsService,
    UrlValidationService,
    WebsiteMetadataExtractor,
    BrandDnaExtractionService,
    EditorialPlanService,
    EditorialPlanRepository,
    CarouselPerformanceRepository,
    CarouselPerformanceService,
    RecommendationService,
    BrandLearningService,
    BrandLearningRepository,
    GenerationCostService,
    GenerationCostRepository,
    CreditAccountingService,
    BillingEntitlementsService,
    PricingCatalogService,
    CarouselDraftService,
    CarouselDraftRepository,
    AdminUserRepository,
    AdminUserService,
    AdminSessionRepository,
    AdminSessionService,
    AdminAuditRepository,
    AdminAuditService,
    TotpService,
    AdminRefreshTokenRepository,
    AdminRefreshTokenService,
    AdminAlertService,
    ...temporalStubProvider,
  ],
  get exports() {
    return this.providers;
  },
})
export class DatabaseModule {}
