import { Module } from '@nestjs/common';
import { PostActivity } from '@gitroom/orchestrator/activities/post.activity';
import { getTemporalModule } from '@gitroom/nestjs-libraries/temporal/temporal.module';
import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { AutopostService } from '@gitroom/nestjs-libraries/database/prisma/autopost/autopost.service';
import { EmailActivity } from '@gitroom/orchestrator/activities/email.activity';
import { IntegrationsActivity } from '@gitroom/orchestrator/activities/integrations.activity';
import { HealthController } from '@gitroom/orchestrator/health.controller';
import { VideoModule } from '@gitroom/nestjs-libraries/videos/video.module';
import { CreativeActivity } from '@gitroom/orchestrator/activities/creative.activity';
import { CreativeProviderService } from '@gitroom/nestjs-libraries/creative-engine/creative-provider.service';
import { CreativeCreditService } from '@gitroom/nestjs-libraries/creative-engine/creative-credit.service';
import { CreativeWebhookService } from '@gitroom/nestjs-libraries/creative-engine/creative-webhook.service';
import { CreativeOutputValidationService } from '@gitroom/nestjs-libraries/creative-engine/creative-output-validation.service';
import { CreativeMetricsService } from '@gitroom/nestjs-libraries/creative-engine/creative-metrics.service';
import { CreativeWorkflowService } from '@gitroom/nestjs-libraries/creative-engine/creative-workflow.service';
import { CreativeMediaToolService } from '@gitroom/nestjs-libraries/creative-engine/creative-media-tool.service';
import { CreativeModerationService } from '@gitroom/nestjs-libraries/creative-engine/creative-moderation.service';
import { CreativeOutputStorageService } from '@gitroom/nestjs-libraries/creative-engine/creative-output-storage.service';
import { CreativeSceneGraphService } from '@gitroom/nestjs-libraries/creative-engine/creative-scene-graph.service';

const activities = [
  PostActivity,
  AutopostService,
  EmailActivity,
  IntegrationsActivity,
  CreativeActivity,
];
@Module({
  imports: [
    DatabaseModule,
    VideoModule,
    getTemporalModule(true, require.resolve('./workflows'), activities),
  ],
  controllers: [HealthController],
  providers: [...activities, CreativeProviderService, CreativeCreditService, CreativeWebhookService, CreativeOutputValidationService, CreativeOutputStorageService, CreativeMetricsService, CreativeWorkflowService, CreativeMediaToolService, CreativeSceneGraphService, CreativeModerationService],
  get exports() {
    return [...this.providers, ...this.imports];
  },
})
export class AppModule {}
