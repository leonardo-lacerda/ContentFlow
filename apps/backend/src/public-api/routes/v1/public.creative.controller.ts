import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CreativeEngineService } from '@gitroom/nestjs-libraries/creative-engine/creative-engine.service';
import { CreativeWorkflowService } from '@gitroom/nestjs-libraries/creative-engine/creative-workflow.service';
import { CreativeExportService } from '@gitroom/nestjs-libraries/creative-engine/creative-export.service';
import { CreativeEvaluationService } from '@gitroom/nestjs-libraries/creative-engine/creative-evaluation.service';
import { CreativePublishService } from '@gitroom/nestjs-libraries/creative-engine/creative-publish.service';
import { CreativeWebhookService } from '@gitroom/nestjs-libraries/creative-engine/creative-webhook.service';
import {
  CreateCreativeProjectDto,
  UpdateCreativeProjectDto,
  CreateCreativeScriptDto,
  CreativeQuoteDto,
  CreativeGenerateVariantDto,
  CreateCreativeWorkflowDto,
  CreativeDuplicateWorkflowDto,
  RunCreativeWorkflowDto,
  CreativeToolQuoteDto,
  CreativeToolRunDto,
  CreativeVariantMatrixDto,
  CreativeVariantMatrixGenerateDto,
  CreativeWorkflowQuoteDto,
  CreativeVoicePreviewDto,
  CreativeReviewDto,
  CreativePublishVariantDto,
  CreateCreativeAssetDto,
  CreateCreativeProductDto,
  UpdateCreativeAssetDto,
  UpdateCreativeProductDto,
  UpdateCreativeActorDto,
  UpdateCreativeVoiceDto,
  CreativeLocalizeVariantDto,
  CreativePresetRunDto,
  CreativePublicRenderDto,
  CreateCreativeWebhookDto,
} from '@gitroom/nestjs-libraries/dtos/creative';
import { CreativeFeatureFlagGuard } from '@gitroom/nestjs-libraries/creative-engine/creative-feature-flag.guard';

@ApiTags('Public API - Creative Engine')
@Controller('/public/v1/creative')
@UseGuards(CreativeFeatureFlagGuard)
export class PublicCreativeController {
  constructor(
    private readonly creative: CreativeEngineService,
    private readonly workflows: CreativeWorkflowService,
    private readonly exports: CreativeExportService,
    private readonly evaluation: CreativeEvaluationService,
    private readonly publishing: CreativePublishService,
    private readonly webhooks: CreativeWebhookService,
  ) {}

  @Get('/capabilities')
  capabilities() {
    return { capabilities: this.creative.listCapabilities() };
  }

  @Get('/health')
  health() {
    return this.creative.getHealth();
  }

  @Post('/renders')
  render(@GetOrgFromRequest() org: Organization, @Body() body: CreativePublicRenderDto) {
    const { projectId, ...input } = body;
    return this.creative.generateVariant(org.id, projectId, input);
  }

  @Get('/renders/:id')
  renderStatus(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.getJob(id, org.id);
  }

  @Get('/renders/:id/download')
  async renderDownload(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    const job = await this.creative.getJob(id, org.id);
    if (job.variantId) return this.creative.getVariantDownload(job.variantId, org.id);
    return { jobId: id, status: job.status, output: job.output, expiresAt: null as string | null };
  }

  @Get('/presets')
  presets() {
    return { presets: this.creative.listPresets() };
  }

  @Post('/projects/:id/presets/:presetId/run')
  runPreset(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Param('presetId') presetId: string, @Body() body: CreativePresetRunDto) {
    return this.creative.runPreset(org.id, id, presetId, body);
  }

  @Get('/projects')
  projects(@GetOrgFromRequest() org: Organization) {
    return this.creative.listProjects(org.id);
  }

  @Get('/actors')
  actors(@GetOrgFromRequest() org: Organization, @Query('projectId') projectId?: string) {
    return this.creative.listActors(org.id, projectId, false);
  }

  @Get('/actors/:id')
  actor(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.getActor(id, org.id, false);
  }

  @Patch('/actors/:id')
  updateActor(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: UpdateCreativeActorDto) {
    return this.creative.updateActor(id, org.id, body);
  }

  @Delete('/actors/:id')
  deleteActor(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.archiveActor(id, org.id);
  }

  @Get('/voices')
  voices(@GetOrgFromRequest() org: Organization, @Query('language') language?: string) {
    return this.creative.listVoices(org.id, language);
  }

  @Get('/voices/:id')
  voice(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.getVoice(id, org.id, false);
  }

  @Patch('/voices/:id')
  updateVoice(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: UpdateCreativeVoiceDto) {
    return this.creative.updateVoice(id, org.id, body);
  }

  @Delete('/voices/:id')
  deleteVoice(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.archiveVoice(id, org.id);
  }

  @Get('/assets')
  assets(@GetOrgFromRequest() org: Organization, @Query('projectId') projectId?: string) {
    return this.creative.listAssets(org.id, projectId);
  }

  @Post('/assets')
  createAsset(@GetOrgFromRequest() org: Organization, @Body() body: CreateCreativeAssetDto) {
    return this.creative.createAsset(org.id, body);
  }

  @Get('/assets/:id')
  asset(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.getAsset(id, org.id);
  }

  @Patch('/assets/:id')
  updateAsset(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: UpdateCreativeAssetDto) {
    return this.creative.updateAsset(id, org.id, body);
  }

  @Delete('/assets/:id')
  deleteAsset(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.archiveAsset(id, org.id);
  }

  @Get('/products')
  products(@GetOrgFromRequest() org: Organization, @Query('projectId') projectId?: string) {
    return this.creative.listProducts(org.id, projectId);
  }

  @Post('/products')
  createProduct(@GetOrgFromRequest() org: Organization, @Body() body: CreateCreativeProductDto) {
    return this.creative.createProduct(org.id, body);
  }

  @Get('/products/:id')
  product(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.getProduct(id, org.id);
  }

  @Patch('/products/:id')
  updateProduct(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: UpdateCreativeProductDto) {
    return this.creative.updateProduct(id, org.id, body);
  }

  @Delete('/products/:id')
  deleteProduct(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.archiveProduct(id, org.id);
  }

  @Get('/credits')
  credits(@GetOrgFromRequest() org: Organization) {
    return this.creative.getCreditBalance(org.id);
  }

  @Get('/metrics')
  metrics(@GetOrgFromRequest() org: Organization, @Query('days') days?: string) {
    return this.creative.getMetrics(org.id, days ? Number(days) : 30);
  }

  @Get('/webhooks')
  webhooksList(@GetOrgFromRequest() org: Organization) {
    return this.webhooks.list(org.id);
  }

  @Get('/webhooks/deliveries')
  webhookDeliveries(@GetOrgFromRequest() org: Organization, @Query('subscriptionId') subscriptionId?: string) {
    return this.webhooks.listDeliveries(org.id, subscriptionId);
  }

  @Post('/webhooks')
  webhooksCreate(@GetOrgFromRequest() org: Organization, @Body() body: CreateCreativeWebhookDto) {
    return this.webhooks.create(org.id, body);
  }

  @Post('/webhooks/deliveries/:id/replay')
  replayWebhook(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.webhooks.replay(id, org.id);
  }

  @Post('/projects')
  createProject(@GetOrgFromRequest() org: Organization, @Body() body: CreateCreativeProjectDto) {
    return this.creative.createProject(org.id, body);
  }

  @Get('/projects/:id')
  project(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.getProject(id, org.id);
  }

  @Patch('/projects/:id')
  updateProject(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: UpdateCreativeProjectDto) {
    return this.creative.updateProject(id, org.id, body);
  }

  @Post('/projects/:id/export')
  exportProject(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.exports.exportProject(org.id, id);
  }

  @Post('/projects/:id/scripts')
  script(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreateCreativeScriptDto) {
    return this.creative.createScript(org.id, id, body);
  }

  @Get('/projects/:id/scripts')
  scripts(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.listScripts(org.id, id);
  }

  @Get('/projects/:id/scripts/:scriptId')
  scriptById(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Param('scriptId') scriptId: string) {
    return this.creative.getScript(org.id, id, scriptId);
  }

  @Post('/projects/:id/scripts/:scriptId/revise')
  reviseScript(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Param('scriptId') scriptId: string, @Body() body: CreateCreativeScriptDto) {
    return this.creative.reviseScript(org.id, id, scriptId, body);
  }

  @Post('/projects/:id/quote')
  quote(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeQuoteDto) {
    return this.creative.quoteVariant(org.id, id, body);
  }

  @Post('/projects/:id/voices/preview')
  voicePreview(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeVoicePreviewDto) {
    return this.creative.generateVoicePreview(org.id, id, body);
  }

  @Post('/projects/:id/variant-matrix/quote')
  quoteVariantMatrix(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeVariantMatrixDto) {
    return this.creative.quoteVariantMatrix(org.id, id, body);
  }

  @Post('/projects/:id/variant-matrix/generate')
  generateVariantMatrix(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeVariantMatrixGenerateDto) {
    return this.creative.generateVariantMatrix(org.id, id, body);
  }

  @Post('/projects/:id/tools/quote')
  quoteTool(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeToolQuoteDto) {
    return this.creative.quoteTool(org.id, id, body);
  }

  @Post('/projects/:id/tools/run')
  runTool(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeToolRunDto) {
    return this.creative.runTool(org.id, id, body);
  }

  @Post('/projects/:id/variants/generate')
  generate(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeGenerateVariantDto) {
    return this.creative.generateVariant(org.id, id, body);
  }

  @Get('/jobs/:id')
  job(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.getJob(id, org.id);
  }

  @Get('/variants')
  variants(@GetOrgFromRequest() org: Organization, @Query('projectId') projectId?: string) {
    return this.creative.listVariants(org.id, projectId);
  }

  @Get('/variants/:id')
  variant(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.getVariant(id, org.id);
  }

  @Get('/variants/:id/download')
  downloadVariant(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.getVariantDownload(id, org.id);
  }

  @Post('/projects/:id/variants/:variantId/localize')
  localizeVariant(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Param('variantId') variantId: string, @Body() body: CreativeLocalizeVariantDto) {
    return this.creative.localizeVariant(org.id, id, variantId, body);
  }

  @Post('/jobs/:id/evaluate')
  evaluateJob(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.evaluation.preflight(org.id, id);
  }

  @Post('/jobs/:id/review')
  reviewJob(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeReviewDto) {
    return this.evaluation.review(org.id, id, body);
  }

  @Get('/reviews')
  reviews(@GetOrgFromRequest() org: Organization, @Query('jobId') jobId?: string, @Query('variantId') variantId?: string) {
    return this.evaluation.listReviews(org.id, jobId, variantId);
  }

  @Get('/publications')
  publications(@GetOrgFromRequest() org: Organization, @Query('projectId') projectId?: string) {
    return this.publishing.list(org.id, projectId);
  }

  @Post('/projects/:id/variants/:variantId/publish')
  publishVariant(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Param('variantId') variantId: string, @Body() body: CreativePublishVariantDto) {
    return this.publishing.publishVariant(org.id, id, variantId, body);
  }

  @Post('/jobs/:id/cancel')
  cancel(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.creative.cancelJob(id, org.id);
  }

  @Post('/workflows')
  createWorkflow(@GetOrgFromRequest() org: Organization, @Body() body: CreateCreativeWorkflowDto) {
    return this.workflows.create(org.id, body);
  }

  @Get('/workflows')
  listWorkflows(@GetOrgFromRequest() org: Organization) {
    return this.workflows.list(org.id);
  }

  @Get('/workflows/:id')
  getWorkflow(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.workflows.get(id, org.id);
  }

  @Post('/workflows/:id/duplicate')
  duplicateWorkflow(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeDuplicateWorkflowDto) {
    return this.workflows.duplicate(id, org.id, body);
  }

  @Post('/workflows/:id/validate')
  validateWorkflow(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.workflows.validate(id, org.id);
  }

  @Post('/workflows/:id/quote')
  quoteWorkflow(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: CreativeWorkflowQuoteDto) {
    return this.workflows.quote(id, org.id, body || {});
  }

  @Post('/workflows/:id/runs')
  runWorkflow(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: RunCreativeWorkflowDto) {
    return this.workflows.run(id, org.id, body || {});
  }

  @Get('/workflow-runs/:id')
  workflowRun(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.workflows.getRun(id, org.id);
  }

  @Delete('/workflow-runs/:id')
  cancelWorkflowRun(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.workflows.cancelRun(id, org.id);
  }
}
