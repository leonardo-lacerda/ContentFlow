import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { CreativeEngineService } from '@gitroom/nestjs-libraries/creative-engine/creative-engine.service';
import { CreativeWebhookService } from '@gitroom/nestjs-libraries/creative-engine/creative-webhook.service';
import { CreativeRightsService } from '@gitroom/nestjs-libraries/creative-engine/creative-rights.service';
import { CreativeExportService } from '@gitroom/nestjs-libraries/creative-engine/creative-export.service';
import { CreativeEvaluationService } from '@gitroom/nestjs-libraries/creative-engine/creative-evaluation.service';
import { CreativePublishService } from '@gitroom/nestjs-libraries/creative-engine/creative-publish.service';
import { CreativeFeatureFlagGuard } from '@gitroom/nestjs-libraries/creative-engine/creative-feature-flag.guard';
import {
  CreateCreativeProjectDto,
  UpdateCreativeProjectDto,
  CreateCreativeScriptDto,
  CreativeGenerateImageDto,
  CreativeQuoteDto,
  CreativeGenerateVariantDto,
  CreativeToolQuoteDto,
  CreativeToolRunDto,
  CreativeVariantMatrixDto,
  CreativeVariantMatrixGenerateDto,
  CreateCreativeWebhookDto,
  GrantCreativeRightsDto,
  CreativeTakedownDto,
  CreateCreativeAssetDto,
  CreateCreativeProductDto,
  CreateCreativeActorDto,
  CreateCreativeVoiceDto,
  UpdateCreativeAssetDto,
  UpdateCreativeProductDto,
  UpdateCreativeActorDto,
  UpdateCreativeVoiceDto,
  RevokeCreativeRightsDto,
  CreativeVoicePreviewDto,
  CreativeReviewDto,
  CreativePublishVariantDto,
  CreativeLocalizeVariantDto,
  CreativePresetRunDto,
} from '@gitroom/nestjs-libraries/dtos/creative';

@ApiTags('Creative Engine')
@Controller('/creative')
@UseGuards(CreativeFeatureFlagGuard)
export class CreativeController {
  constructor(
    private readonly creative: CreativeEngineService,
    private readonly webhooks: CreativeWebhookService,
    private readonly rights: CreativeRightsService,
    private readonly exports: CreativeExportService,
    private readonly evaluation: CreativeEvaluationService,
    private readonly publishing: CreativePublishService,
  ) {}

  @Get('/capabilities')
  getCapabilities() {
    return this.creative.listCapabilities();
  }

  @Get('/health')
  getHealth() {
    return this.creative.getHealth();
  }

  @Get('/presets')
  getPresets() {
    return this.creative.listPresets();
  }

  @Post('/projects/:id/presets/:presetId/run')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  runPreset(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Param('presetId') presetId: string, @Body() body: CreativePresetRunDto) {
    return this.creative.runPreset(org.id, id, presetId, body);
  }

  @Get('/projects')
  listProjects(@GetOrgFromRequest() org: Organization) {
    return this.creative.listProjects(org.id);
  }

  @Post('/projects')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  createProject(@GetOrgFromRequest() org: Organization, @Body() body: CreateCreativeProjectDto) {
    return this.creative.createProject(org.id, body);
  }

  @Get('/projects/:id')
  getProject(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.getProject(id, org.id);
  }

  @Patch('/projects/:id')
  @CheckPolicies([AuthorizationActions.Update, Sections.AI])
  updateProject(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: UpdateCreativeProjectDto) {
    return this.creative.updateProject(id, org.id, body);
  }

  @Delete('/projects/:id')
  @CheckPolicies([AuthorizationActions.Delete, Sections.AI])
  archiveProject(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.archiveProject(id, org.id);
  }

  @Post('/projects/:id/takedown')
  @CheckPolicies([AuthorizationActions.Delete, Sections.AI])
  takedownProject(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeTakedownDto) {
    return this.creative.takedownProject(id, org.id, body?.reason);
  }

  @Post('/projects/:id/export')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  exportProject(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.exports.exportProject(org.id, id);
  }

  @Get('/assets')
  listAssets(@GetOrgFromRequest() org: Organization, @Query('projectId') projectId?: string) {
    return this.creative.listAssets(org.id, projectId);
  }

  @Post('/assets')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  createAsset(@GetOrgFromRequest() org: Organization, @Body() body: CreateCreativeAssetDto) {
    return this.creative.createAsset(org.id, body);
  }

  @Get('/assets/:id')
  getAsset(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.getAsset(id, org.id);
  }

  @Patch('/assets/:id')
  @CheckPolicies([AuthorizationActions.Update, Sections.AI])
  updateAsset(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: UpdateCreativeAssetDto) {
    return this.creative.updateAsset(id, org.id, body);
  }

  @Delete('/assets/:id')
  @CheckPolicies([AuthorizationActions.Delete, Sections.AI])
  archiveAsset(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.archiveAsset(id, org.id);
  }

  @Get('/products')
  listProducts(@GetOrgFromRequest() org: Organization, @Query('projectId') projectId?: string) {
    return this.creative.listProducts(org.id, projectId);
  }

  @Post('/products')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  createProduct(@GetOrgFromRequest() org: Organization, @Body() body: CreateCreativeProductDto) {
    return this.creative.createProduct(org.id, body);
  }

  @Get('/products/:id')
  getProduct(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.getProduct(id, org.id);
  }

  @Patch('/products/:id')
  @CheckPolicies([AuthorizationActions.Update, Sections.AI])
  updateProduct(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: UpdateCreativeProductDto) {
    return this.creative.updateProduct(id, org.id, body);
  }

  @Delete('/products/:id')
  @CheckPolicies([AuthorizationActions.Delete, Sections.AI])
  archiveProduct(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.archiveProduct(id, org.id);
  }

  @Get('/actors')
  listActors(
    @GetOrgFromRequest() org: Organization,
    @Query('projectId') projectId?: string,
    @Query('includeUnapproved') includeUnapproved?: string,
  ) {
    return this.creative.listActors(org.id, projectId, includeUnapproved === 'true');
  }

  @Post('/actors')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  createActor(@GetOrgFromRequest() org: Organization, @Body() body: CreateCreativeActorDto) {
    return this.creative.createActor(org.id, body);
  }

  @Get('/actors/:id')
  getActor(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.getActor(id, org.id);
  }

  @Patch('/actors/:id')
  @CheckPolicies([AuthorizationActions.Update, Sections.AI])
  updateActor(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: UpdateCreativeActorDto) {
    return this.creative.updateActor(id, org.id, body);
  }

  @Delete('/actors/:id')
  @CheckPolicies([AuthorizationActions.Delete, Sections.AI])
  archiveActor(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.archiveActor(id, org.id);
  }

  @Get('/voices')
  listVoices(@GetOrgFromRequest() org: Organization, @Query('language') language?: string, @Query('includeUnapproved') includeUnapproved?: string) {
    return this.creative.listVoices(org.id, language, includeUnapproved === 'true');
  }

  @Post('/voices')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  createVoice(@GetOrgFromRequest() org: Organization, @Body() body: CreateCreativeVoiceDto) {
    return this.creative.createVoice(org.id, body);
  }

  @Get('/voices/:id')
  getVoice(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.getVoice(id, org.id);
  }

  @Patch('/voices/:id')
  @CheckPolicies([AuthorizationActions.Update, Sections.AI])
  updateVoice(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: UpdateCreativeVoiceDto) {
    return this.creative.updateVoice(id, org.id, body);
  }

  @Delete('/voices/:id')
  @CheckPolicies([AuthorizationActions.Delete, Sections.AI])
  archiveVoice(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.archiveVoice(id, org.id);
  }

  @Post('/projects/:id/scripts')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  createScript(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreateCreativeScriptDto) {
    return this.creative.createScript(org.id, id, body);
  }

  @Get('/projects/:id/scripts')
  listScripts(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.listScripts(org.id, id);
  }

  @Get('/projects/:id/scripts/:scriptId')
  getScript(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Param('scriptId') scriptId: string) {
    return this.creative.getScript(org.id, id, scriptId);
  }

  @Post('/projects/:id/scripts/:scriptId/revise')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  reviseScript(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Param('scriptId') scriptId: string, @Body() body: CreateCreativeScriptDto) {
    return this.creative.reviseScript(org.id, id, scriptId, body);
  }

  @Post('/projects/:id/images/generate')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  generateImage(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeGenerateImageDto) {
    return this.creative.generateImage(org.id, id, body);
  }

  @Post('/projects/:id/voices/preview')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  generateVoicePreview(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeVoicePreviewDto) {
    return this.creative.generateVoicePreview(org.id, id, body);
  }

  @Post('/projects/:id/tools/quote')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  quoteTool(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeToolQuoteDto) {
    return this.creative.quoteTool(org.id, id, body);
  }

  @Post('/projects/:id/tools/run')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  runTool(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeToolRunDto) {
    return this.creative.runTool(org.id, id, body);
  }

  @Post('/projects/:id/quote')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  quoteVariant(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeQuoteDto) {
    return this.creative.quoteVariant(org.id, id, body);
  }

  @Post('/projects/:id/variant-matrix/quote')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  quoteVariantMatrix(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeVariantMatrixDto) {
    return this.creative.quoteVariantMatrix(org.id, id, body);
  }

  @Post('/projects/:id/variant-matrix/generate')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  generateVariantMatrix(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeVariantMatrixGenerateDto) {
    return this.creative.generateVariantMatrix(org.id, id, body);
  }

  @Post('/projects/:id/variants/generate')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  generateVariant(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeGenerateVariantDto) {
    return this.creative.generateVariant(org.id, id, body);
  }

  @Get('/jobs')
  listJobs(@GetOrgFromRequest() org: Organization) {
    return this.creative.listJobs(org.id);
  }

  @Get('/variants')
  listVariants(@GetOrgFromRequest() org: Organization, @Query('projectId') projectId?: string) {
    return this.creative.listVariants(org.id, projectId);
  }

  @Get('/variants/:id')
  getVariant(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.getVariant(id, org.id);
  }

  @Get('/variants/:id/download')
  downloadVariant(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.getVariantDownload(id, org.id);
  }

  @Post('/projects/:id/variants/:variantId/localize')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  localizeVariant(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Param('variantId') variantId: string, @Body() body: CreativeLocalizeVariantDto) {
    return this.creative.localizeVariant(org.id, id, variantId, body);
  }

  @Get('/jobs/:id')
  getJob(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.getJob(id, org.id);
  }

  @Post('/jobs/:id/cancel')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  cancelJob(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.cancelJob(id, org.id);
  }

  @Get('/credits')
  getCredits(@GetOrgFromRequest() org: Organization) {
    return this.creative.getCreditBalance(org.id);
  }

  @Get('/metrics')
  getMetrics(@GetOrgFromRequest() org: Organization, @Query('days') days?: string) {
    return this.creative.getMetrics(org.id, days ? Number(days) : 30);
  }

  @Post('/jobs/:id/evaluate')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  evaluateJob(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.evaluation.preflight(org.id, id);
  }

  @Post('/jobs/:id/review')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  reviewJob(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeReviewDto) {
    return this.evaluation.review(org.id, id, body);
  }

  @Get('/reviews')
  listReviews(@GetOrgFromRequest() org: Organization, @Query('jobId') jobId?: string, @Query('variantId') variantId?: string) {
    return this.evaluation.listReviews(org.id, jobId, variantId);
  }

  @Get('/publications')
  listPublications(@GetOrgFromRequest() org: Organization, @Query('projectId') projectId?: string) {
    return this.publishing.list(org.id, projectId);
  }

  @Post('/projects/:id/variants/:variantId/publish')
  @CheckPolicies([AuthorizationActions.Create, Sections.POSTS_PER_MONTH])
  publishVariant(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Param('variantId') variantId: string, @Body() body: CreativePublishVariantDto) {
    return this.publishing.publishVariant(org.id, id, variantId, body);
  }

  @Get('/credits/ledger')
  getCreditLedger(@GetOrgFromRequest() org: Organization, @Query('limit') limit?: string) {
    return this.creative.listCreditLedger(org.id, limit ? Number(limit) : undefined);
  }

  @Get('/credits/reconcile')
  reconcileCredits(@GetOrgFromRequest() org: Organization) {
    return this.creative.reconcileCredits(org.id);
  }

  @Get('/webhooks')
  listWebhooks(@GetOrgFromRequest() org: Organization) {
    return this.webhooks.list(org.id);
  }

  @Get('/webhooks/deliveries')
  listWebhookDeliveries(@GetOrgFromRequest() org: Organization, @Query('subscriptionId') subscriptionId?: string) {
    return this.webhooks.listDeliveries(org.id, subscriptionId);
  }

  @Post('/webhooks')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  createWebhook(@GetOrgFromRequest() org: Organization, @Body() body: CreateCreativeWebhookDto) {
    return this.webhooks.create(org.id, body);
  }

  @Delete('/webhooks/:id')
  @CheckPolicies([AuthorizationActions.Delete, Sections.AI])
  removeWebhook(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.webhooks.remove(id, org.id);
  }

  @Post('/webhooks/deliveries/:id/replay')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  replayWebhook(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.webhooks.replay(id, org.id);
  }

  @Get('/rights')
  listRights(@GetOrgFromRequest() org: Organization, @Query('resourceType') resourceType?: string, @Query('resourceId') resourceId?: string) {
    return this.rights.list(org.id, resourceType, resourceId);
  }

  @Post('/rights')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  grantRights(@GetOrgFromRequest() org: Organization, @Body() body: GrantCreativeRightsDto) {
    return this.rights.grant(org.id, body);
  }

  @Delete('/rights/:id')
  @CheckPolicies([AuthorizationActions.Delete, Sections.AI])
  revokeRights(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: RevokeCreativeRightsDto) {
    return this.rights.revoke(id, org.id, body?.reason);
  }
}
