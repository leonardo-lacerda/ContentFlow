import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { CreativeJobStatus, CreativeWorkflowRunStatus, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { CreativeCreditService } from './creative-credit.service';
import { CreativeProviderService } from './creative-provider.service';
import { CreativeWebhookService } from './creative-webhook.service';
import { CreativeCapability, CreativeProviderInput, scopeCreativeIdempotencyKey } from './creative-engine.types';
import { CreativeMediaTool, CreativeMediaToolService } from './creative-media-tool.service';
import { CreativeOutputValidationService } from './creative-output-validation.service';
import { CreativeMetricsService } from './creative-metrics.service';
import { CreativeModerationService } from './creative-moderation.service';
import { TemporalService } from 'nestjs-temporal-core';
import { CreativeOutputStorageService } from './creative-output-storage.service';

type WorkflowNodeInput = { nodeKey: string; type: string; config?: any; inputSchema?: any; outputSchema?: any; position?: any };
type WorkflowEdgeInput = { sourceNode: string; targetNode: string };

const CREATIVE_TOOL_CREDITS: Record<CreativeMediaTool, number> = {
  captions: 8,
  transcribe: 20,
  resize: 18,
  trim: 18,
  merge: 35,
  compose: 55,
  'scene-render': 80,
};

@Injectable()
export class CreativeWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreativeCreditService,
    private readonly providers: CreativeProviderService,
    private readonly webhooks: CreativeWebhookService,
    @Optional() private readonly mediaTools?: CreativeMediaToolService,
    @Optional() private readonly outputValidation?: CreativeOutputValidationService,
    @Optional() private readonly metrics?: CreativeMetricsService,
    @Optional() private readonly moderation?: CreativeModerationService,
    @Optional() private readonly temporal?: TemporalService,
    @Optional() private readonly outputStorage?: CreativeOutputStorageService,
  ) {}

  async create(organizationId: string, input: {
    projectId?: string;
    name: string;
    nodes: WorkflowNodeInput[];
    edges: WorkflowEdgeInput[];
    status?: 'DRAFT' | 'ACTIVE';
    version?: number;
    maxCredits?: number;
  }) {
    if (!input.name?.trim()) throw new BadRequestException('Workflow name is required');
    const version = Math.min(10000, Math.max(1, Number(input.version || 1)));
    const maxCredits = input.maxCredits === undefined ? undefined : Math.min(1000000, Math.max(1, Math.floor(input.maxCredits)));
    if (input.projectId) {
      const project = await this.prisma.creativeProject.findFirst({ where: { id: input.projectId, organizationId, deletedAt: null }, select: { id: true } });
      if (!project) throw new NotFoundException('Creative project not found');
    }
    const definition = this.validateDefinition(input.nodes, input.edges);
    return this.prisma.creativeWorkflow.create({
      data: {
        organizationId,
        projectId: input.projectId,
        name: input.name.trim(),
        version,
        maxCredits,
        status: input.status || 'DRAFT',
        definition: definition as Prisma.InputJsonValue,
        nodes: {
          create: input.nodes.map((node) => ({
            nodeKey: node.nodeKey,
            type: node.type,
            config: (node.config || {}) as Prisma.InputJsonValue,
            inputSchema: node.inputSchema as Prisma.InputJsonValue,
            outputSchema: node.outputSchema as Prisma.InputJsonValue,
            position: node.position as Prisma.InputJsonValue,
          })),
        },
        edges: {
          create: input.edges.map((edge) => ({
            sourceNode: edge.sourceNode,
            targetNode: edge.targetNode,
          })),
        },
      },
      include: { nodes: true, edges: true },
    });
  }

  async list(organizationId: string) {
    return this.prisma.creativeWorkflow.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      include: { nodes: true, edges: true, _count: { select: { runs: true } } },
    });
  }

  async get(id: string, organizationId: string) {
    const workflow = await this.prisma.creativeWorkflow.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { nodes: true, edges: true },
    });
    if (!workflow) throw new NotFoundException('Creative workflow not found');
    return workflow;
  }

  async duplicate(id: string, organizationId: string, input: { name: string; version?: number }) {
    const workflow = await this.get(id, organizationId);
    if (!input.name?.trim()) throw new BadRequestException('Workflow name is required');
    return this.create(organizationId, {
      projectId: workflow.projectId || undefined,
      name: input.name,
      version: input.version,
      maxCredits: workflow.maxCredits || undefined,
      status: 'DRAFT',
      nodes: workflow.nodes.map((node) => ({
        nodeKey: node.nodeKey,
        type: node.type,
        config: node.config,
        inputSchema: node.inputSchema,
        outputSchema: node.outputSchema,
        position: node.position,
      })),
      edges: workflow.edges.map((edge) => ({ sourceNode: edge.sourceNode, targetNode: edge.targetNode })),
    });
  }

  async validate(id: string, organizationId: string) {
    const workflow = await this.get(id, organizationId);
    return {
      valid: true,
      definition: this.validateDefinition(
        workflow.nodes.map((node) => ({
          nodeKey: node.nodeKey,
          type: node.type,
          config: node.config as Record<string, any>,
          inputSchema: node.inputSchema as Record<string, any> | undefined,
          outputSchema: node.outputSchema as Record<string, any> | undefined,
        })),
        workflow.edges,
      ),
    };
  }

  async quote(id: string, organizationId: string, input: Record<string, any> = {}) {
    const workflow = await this.get(id, organizationId);
    this.validateDefinition(workflow.nodes, workflow.edges);
    const workflowInput = this.normalizeInput(input);
    let credits = 0;
    const items: Array<{ nodeKey: string; capability: CreativeCapability; credits: number }> = [];
    for (const node of workflow.nodes) {
      const capability = this.capabilityFor(node.type);
      if (capability) {
        const nodeInput = this.inputForNode(node, workflowInput);
        this.moderation?.assertAllowed(`${nodeInput.prompt || ''}\n${nodeInput.script || ''}`);
        await this.assertWorkflowRights(organizationId, capability, nodeInput);
        const quote = this.providers.quote(capability, nodeInput, node.config && (node.config as any).provider);
        credits += quote.estimatedCredits;
        items.push({ nodeKey: node.nodeKey, capability, credits: quote.estimatedCredits });
        continue;
      }
      const tool = this.toolFor(node.type);
      if (tool) {
        const toolCredits = CREATIVE_TOOL_CREDITS[tool];
        credits += toolCredits;
        items.push({ nodeKey: node.nodeKey, capability: `tool.${tool}` as CreativeCapability, credits: toolCredits });
      }
    }
    if (credits <= 0) throw new BadRequestException('Workflow must contain at least one billable creative node');
    const balance = await this.credits.getBalance(organizationId);
    const withinMaxCredits = !workflow.maxCredits || credits <= workflow.maxCredits;
    return {
      estimatedCredits: credits,
      maxCredits: workflow.maxCredits,
      balance,
      canGenerate: withinMaxCredits && balance.balance >= credits,
      withinMaxCredits,
      items,
    };
  }

  async run(id: string, organizationId: string, input: Record<string, any> = {}) {
    const workflow = await this.get(id, organizationId);
    const validation = this.validateDefinition(workflow.nodes, workflow.edges);
    const workflowInput = this.normalizeInput(input);
    const inputHash = createHash('sha256').update(JSON.stringify({ workflowId: id, input: workflowInput })).digest('hex');
    const idempotencyKey = input.idempotencyKey
      ? scopeCreativeIdempotencyKey(organizationId, String(input.idempotencyKey))
      : `workflow:${createHash('sha256').update(JSON.stringify({ organizationId, id, input: workflowInput })).digest('hex')}`;
    const existing = await this.prisma.creativeWorkflowRun.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.organizationId !== organizationId) throw new BadRequestException('Workflow idempotency key belongs to another organization');
      return this.getRun(existing.id, organizationId);
    }
    await this.credits.assertConcurrencyQuota(organizationId);
    const quote = await this.quote(id, organizationId, workflowInput);
    if (!quote.withinMaxCredits) {
      throw new BadRequestException(`Workflow quote exceeds maxCredits (${workflow.maxCredits})`);
    }
    const quoteByNode = new Map(quote.items.map((item) => [item.nodeKey, item]));
    let run: any;
    try {
      run = await this.prisma.creativeWorkflowRun.create({
        data: {
          organizationId,
          workflowId: id,
          projectId: workflow.projectId,
          idempotencyKey,
          inputHash,
          status: CreativeWorkflowRunStatus.QUEUED,
          input: workflowInput as Prisma.InputJsonValue,
          estimatedCost: quote.estimatedCredits,
          items: {
            create: validation.order.map((nodeKey) => ({
              nodeKey,
              status: CreativeJobStatus.QUEUED,
              costEstimate: quoteByNode.get(nodeKey)?.credits || 0,
            })),
          },
        },
        include: { items: true },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const raced = await this.prisma.creativeWorkflowRun.findUnique({ where: { idempotencyKey } });
        if (raced && raced.organizationId === organizationId) return this.getRun(raced.id, organizationId);
      }
      throw error;
    }
    try {
      const reservation = await this.credits.reserve(organizationId, quote.estimatedCredits, {
        workflowRunId: run.id,
        projectId: workflow.projectId || undefined,
        idempotencyKey: `workflow-reservation:${run.id}`,
        metadata: { workflowId: id },
      });
      await this.prisma.creativeWorkflowRun.update({
        where: { id: run.id },
        data: { input: { ...workflowInput, reservationId: reservation.id } as Prisma.InputJsonValue, status: CreativeWorkflowRunStatus.RUNNING, startedAt: new Date() },
      });
    } catch (error: any) {
      await this.prisma.creativeWorkflowRun.update({
        where: { id: run.id },
        data: { status: CreativeWorkflowRunStatus.FAILED, error: error?.message || String(error), completedAt: new Date() },
      });
      throw error;
    }
    void this.dispatchRun(run.id, organizationId, workflow.id, validation.order);
    return this.getRun(run.id, organizationId);
  }

  async executeForWorker(runId: string, organizationId: string) {
    const run = await this.getRun(runId, organizationId);
    const validation = this.validateDefinition(run.workflow.nodes, run.workflow.edges);
    return this.executeRun(runId, organizationId, run.workflowId, validation.order);
  }

  async getRun(id: string, organizationId: string) {
    const run = await this.prisma.creativeWorkflowRun.findFirst({
      where: { id, organizationId },
      include: { items: true, workflow: { include: { nodes: true, edges: true } } },
    });
    if (!run) throw new NotFoundException('Creative workflow run not found');
    return run;
  }

  async cancelRun(id: string, organizationId: string) {
    const run = await this.getRun(id, organizationId);
    if (([CreativeWorkflowRunStatus.SUCCEEDED, CreativeWorkflowRunStatus.FAILED, CreativeWorkflowRunStatus.CANCELLED] as string[]).includes(run.status)) return run;
    const reservationId = (run.input as any)?.reservationId;
    const spent = run.items.reduce((total, item) => total + Number(item.costActual || 0), 0);
    if (reservationId) await this.credits.settle(reservationId, spent);
    const result = await this.prisma.creativeWorkflowRun.update({
      where: { id },
      data: { status: CreativeWorkflowRunStatus.CANCELLED, actualCost: spent, completedAt: new Date() },
      include: { items: true },
    });
    await this.webhooks.emit(organizationId, 'creative.workflow.cancelled', { runId: id, status: result.status, actualCost: spent });
    await this.metrics?.record({ organizationId, projectId: result.projectId, workflowRunId: id, event: 'creative.workflow.cancelled', value: spent });
    return result;
  }

  private async executeRun(runId: string, organizationId: string, workflowId: string, order: string[]) {
    const workflow = await this.get(workflowId, organizationId);
    const run = await this.getRun(runId, organizationId);
    if (([CreativeWorkflowRunStatus.SUCCEEDED, CreativeWorkflowRunStatus.FAILED, CreativeWorkflowRunStatus.CANCELLED] as string[]).includes(run.status)) return run;
    const input = run.input as Record<string, any>;
    const values: Record<string, any> = { ...input };
    let failed = false;
    let failureMessage = '';
    let spentCredits = 0;
    try {
      for (const nodeKey of order) {
        const currentRun = await this.getRun(runId, organizationId);
        if (currentRun.status === CreativeWorkflowRunStatus.CANCELLED) {
          return this.finalizeRun(currentRun, organizationId, workflowId, CreativeWorkflowRunStatus.CANCELLED, values, spentCredits);
        }
        const node = workflow.nodes.find((item) => item.nodeKey === nodeKey);
        const item = currentRun.items.find((entry) => entry.nodeKey === nodeKey);
        if (!node || !item) continue;
        if (item.status === CreativeJobStatus.SUCCEEDED) {
          values[nodeKey] = item.output;
          spentCredits += Number(item.costActual || 0);
          continue;
        }
        await this.prisma.creativeWorkflowRunItem.update({ where: { id: item.id }, data: { status: CreativeJobStatus.RUNNING } });
        try {
          const capability = this.capabilityFor(node.type);
          const tool = this.toolFor(node.type);
          let output: any;
          let provider: string | undefined;
          let model: string | undefined;
          let estimatedCredits = Number(item.costEstimate || 0);
          if (capability) {
            const nodeInput = this.inputForNode(node, values);
            this.moderation?.assertAllowed(`${nodeInput.prompt || ''}\n${nodeInput.script || ''}`);
            await this.assertWorkflowRights(organizationId, capability, nodeInput);
            const quote = this.providers.quote(capability, nodeInput, (node.config as any)?.provider);
            estimatedCredits = Number(item.costEstimate || quote.estimatedCredits);
            output = await this.providers.generate(capability, nodeInput, (node.config as any)?.provider);
            this.outputValidation?.validate(capability, output);
            if (this.outputStorage) output = await this.outputStorage.persist(output, { jobId: `${runId}-${nodeKey}`, capability });
            provider = output.provider;
            model = output.model;
          } else if (tool) {
            if (!this.mediaTools) throw new BadRequestException('Creative media tools are not configured');
            const toolInput = this.toolInput(node, values, input);
            output = await this.mediaTools.execute(tool, toolInput);
            this.outputValidation?.validateTool(tool, output);
            provider = 'contentflow';
            model = `creative-${tool}`;
          } else if (node.type === 'input') {
            output = (node.config as any)?.key ? values[(node.config as any).key] : values;
          } else if (node.type === 'output') {
            output = values[(node.config as any)?.from || nodeKey] || values;
          } else {
            throw new BadRequestException(`Unsupported workflow node type: ${node.type}`);
          }
          const requestedActual = Number(output?.metadata?.actualCredits);
          const actualCredits = Number.isFinite(requestedActual)
            ? Math.min(estimatedCredits, Math.max(0, Math.ceil(requestedActual)))
            : estimatedCredits;
          values[nodeKey] = output;
          spentCredits += actualCredits;
          await this.prisma.creativeWorkflowRunItem.update({
            where: { id: item.id },
            data: {
              status: CreativeJobStatus.SUCCEEDED,
              provider,
              model,
              costActual: actualCredits,
              output: JSON.parse(JSON.stringify(output)) as Prisma.InputJsonValue,
            },
          });
          if (capability || tool) {
            await this.prisma.creativeProvenance.create({
              data: {
                organizationId,
                projectId: workflow.projectId,
                operation: `workflow.${node.type}`,
                provider,
                model,
                inputHash: createHash('sha256').update(JSON.stringify({ node, input: values })).digest('hex'),
                data: JSON.parse(JSON.stringify({ node, output })) as Prisma.InputJsonValue,
              },
            });
            await this.metrics?.record({
              organizationId,
              projectId: workflow.projectId,
              workflowRunId: runId,
              event: 'creative.workflow.node.completed',
              provider,
              model,
              value: actualCredits,
              metadata: { nodeKey, type: node.type },
            });
          }
        } catch (error: any) {
          failed = true;
          failureMessage = error?.message || String(error);
          await this.prisma.creativeWorkflowRunItem.update({ where: { id: item.id }, data: { status: CreativeJobStatus.FAILED, error: failureMessage } });
          await this.metrics?.record({ organizationId, projectId: workflow.projectId, workflowRunId: runId, event: 'creative.workflow.node.failed', value: 1, metadata: { nodeKey, type: node.type, error: failureMessage } });
          break;
        }
      }
      const current = await this.getRun(runId, organizationId);
      const status = current.status === CreativeWorkflowRunStatus.CANCELLED
        ? CreativeWorkflowRunStatus.CANCELLED
        : failed
          ? (spentCredits > 0 ? CreativeWorkflowRunStatus.PARTIAL : CreativeWorkflowRunStatus.FAILED)
          : CreativeWorkflowRunStatus.SUCCEEDED;
      return this.finalizeRun(current, organizationId, workflowId, status, values, spentCredits, failureMessage);
    } catch (error: any) {
      const current = await this.getRun(runId, organizationId);
      const reservationId = (current.input as any)?.reservationId;
      if (reservationId) await this.credits.settle(reservationId, spentCredits);
      const result = await this.prisma.creativeWorkflowRun.update({
        where: { id: runId },
        data: { status: spentCredits > 0 ? CreativeWorkflowRunStatus.PARTIAL : CreativeWorkflowRunStatus.FAILED, actualCost: spentCredits, error: error?.message || String(error), completedAt: new Date() },
      });
      await this.webhooks.emit(organizationId, 'creative.workflow.failed', {
        runId,
        workflowId,
        status: result.status,
        error: result.error,
      });
      return result;
    }
  }

  private async dispatchRun(runId: string, organizationId: string, workflowId: string, order: string[]) {
    if (process.env.DISABLE_TEMPORAL !== 'true') {
      try {
        const raw = this.temporal?.client?.getRawClient();
        if (raw?.workflow?.start) {
          await raw.workflow.start('creativeWorkflowRunWorkflow', {
            workflowId: `creative-workflow-run-${runId}`,
            args: [{ runId, organizationId }],
            taskQueue: 'main',
          });
          return;
        }
      } catch (error) {
        if (String((error as any)?.message || error).toLowerCase().includes('already started')) return;
      }
    }
    void this.executeRun(runId, organizationId, workflowId, order);
  }

  private async finalizeRun(
    current: any,
    organizationId: string,
    workflowId: string,
    status: CreativeWorkflowRunStatus,
    values: Record<string, any>,
    spentCredits: number,
    error?: string,
  ) {
    if ([CreativeWorkflowRunStatus.SUCCEEDED, CreativeWorkflowRunStatus.FAILED, CreativeWorkflowRunStatus.CANCELLED].includes(current.status)) return current;
    const reservationId = (current.input as any)?.reservationId;
    if (reservationId) await this.credits.settle(reservationId, spentCredits);
    const result = await this.prisma.creativeWorkflowRun.update({
      where: { id: current.id },
      data: {
        status,
        output: JSON.parse(JSON.stringify(values)) as Prisma.InputJsonValue,
        error: error || undefined,
        completedAt: new Date(),
        actualCost: spentCredits,
      },
      include: { items: true },
    });
    const event = status === CreativeWorkflowRunStatus.SUCCEEDED
      ? 'creative.workflow.completed'
      : status === CreativeWorkflowRunStatus.CANCELLED
        ? 'creative.workflow.cancelled'
        : 'creative.workflow.failed';
    await this.webhooks.emit(organizationId, event, { runId: current.id, workflowId, status, output: result.output, error });
    await this.metrics?.record({
      organizationId,
      projectId: current.projectId,
      workflowRunId: current.id,
      event,
      value: spentCredits,
      metadata: { status, error },
    });
    return result;
  }

  private capabilityFor(type: string): CreativeCapability | null {
    const map: Record<string, CreativeCapability> = {
      'generate.image': 'image-generation',
      'generate.video': 'video-generation',
      'generate.talking-actor': 'talking-actor',
      'generate.b-roll': 'b-roll',
      'generate.tts': 'text-to-speech',
      'generate.translate': 'translation',
      'generate.lip-sync': 'lip-sync',
      'generate.actor-replacement': 'actor-replacement',
    };
    return map[type] || null;
  }

  private toolFor(type: string): CreativeMediaTool | null {
    const map: Record<string, CreativeMediaTool> = {
      'tool.captions': 'captions',
      'tool.transcribe': 'transcribe',
      'tool.resize': 'resize',
      'tool.trim': 'trim',
      'tool.merge': 'merge',
      'tool.compose': 'compose',
      'tool.scene-render': 'scene-render',
    };
    return map[type] || null;
  }

  private inputForNode(node: { config?: Prisma.JsonValue }, input: Record<string, any>): CreativeProviderInput {
    const config = (node.config || {}) as Record<string, any>;
    const source = config.from ? input[config.from] : undefined;
    const videoSource = config.videoFrom ? input[config.videoFrom] : undefined;
    const audioSource = config.audioFrom ? input[config.audioFrom] : undefined;
    const sourceText = typeof source === 'string'
      ? source
      : source?.metadata?.translatedText || source?.translatedText || source?.metadata?.text || source?.text;
    const script = config.script || sourceText || input.script;
    const prompt = config.promptTemplate
      ? String(config.promptTemplate).replace(/\{([^}]+)\}/g, (_match: string, key: string) => String(input[key] ?? ''))
      : String(config.prompt || sourceText || input.prompt || 'Create a performance marketing creative');
    return {
      prompt,
      script,
      imageUrls: input.imageUrls || config.imageUrls,
      aspectRatio: input.aspectRatio || config.aspectRatio || '9:16',
      durationSec: Number(input.durationSec || config.durationSec || 8),
      language: input.language || config.language || 'pt-BR',
      actor: input.actor || (input.actorId ? { id: input.actorId } : undefined) || config.actor || (config.actorId ? { id: config.actorId } : undefined),
      voice: input.voice || (input.voiceId ? { id: input.voiceId } : undefined) || config.voice || (config.voiceId ? { id: config.voiceId } : undefined),
      audioUrl: config.audioUrl || audioSource?.audioUrl || audioSource?.url || source?.audioUrl || input.audioUrl,
      videoUrl: config.videoUrl || videoSource?.videoUrl || videoSource?.url || source?.videoUrl || input.videoUrl,
      metadata: { input, config },
    };
  }

  private toolInput(node: { config?: Prisma.JsonValue }, values: Record<string, any>, rootInput: Record<string, any>) {
    const config = (node.config || {}) as Record<string, any>;
    const source = config.from ? values[config.from] : undefined;
    const sourceUrl = typeof source === 'string' ? source : source?.url || source?.videoUrl || source?.audioUrl;
    const sourceUrls = Array.isArray(source) ? source : source?.urls || rootInput.sourceUrls || config.sourceUrls;
    return {
      ...rootInput,
      script: config.script || rootInput.script || rootInput.prompt || source?.metadata?.translatedText || source?.translatedText,
      language: config.language || rootInput.language,
      format: config.format || rootInput.format,
      audioUrl: config.audioUrl || rootInput.audioUrl || source?.audioUrl || sourceUrl,
      sourceUrl: config.sourceUrl || rootInput.sourceUrl || source?.videoUrl || sourceUrl,
      captionsUrl: config.captionsUrl || rootInput.captionsUrl || source?.captionsUrl,
      watermarkUrl: config.watermarkUrl || rootInput.watermarkUrl,
      overlayText: config.overlayText || rootInput.overlayText,
      sourceUrls,
      aspectRatio: config.aspectRatio || rootInput.aspectRatio,
      startSec: config.startSec ?? rootInput.startSec,
      durationSec: config.durationSec ?? rootInput.durationSec,
    };
  }

  private normalizeInput(input: Record<string, any>) {
    if (input && input.input && typeof input.input === 'object' && !Array.isArray(input.input)) return input.input as Record<string, any>;
    const { idempotencyKey: _idempotencyKey, ...workflowInput } = input || {};
    return workflowInput;
  }

  private async assertWorkflowRights(organizationId: string, capability: CreativeCapability, input: CreativeProviderInput): Promise<CreativeProviderInput> {
    const actorRequired = ['talking-actor', 'actor-replacement'].includes(capability);
    const actorId = input.actor?.id;
    if (actorRequired && !actorId) throw new BadRequestException(`Capability ${capability} requires an approved actorId`);
    if (actorId) {
      const actor = await this.prisma.creativeActor.findFirst({ where: { id: actorId, organizationId, deletedAt: null } });
      const grant = await this.prisma.creativeRightsGrant.findFirst({
        where: {
          organizationId,
          resourceType: 'actor',
          resourceId: actorId,
          status: 'APPROVED',
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
      });
      if (!actor || actor.rightsStatus !== 'APPROVED' || !grant) throw new BadRequestException('Workflow actor rights are not approved');
      input.actor = { id: actor.id, imageUrl: actor.imageUrl || undefined, externalId: actor.externalId || undefined };
    }
    const voiceId = input.voice?.id;
    if (voiceId) {
      const voice = await this.prisma.creativeVoice.findFirst({ where: { id: voiceId, organizationId } });
      const grant = await this.prisma.creativeRightsGrant.findFirst({
        where: {
          organizationId,
          resourceType: 'voice',
          resourceId: voiceId,
          status: 'APPROVED',
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
      });
      if (!voice || voice.rightsStatus !== 'APPROVED' || !grant) throw new BadRequestException('Workflow voice rights are not approved');
      input.voice = { id: voice.id, externalId: voice.externalId || undefined, language: voice.language };
    }
    return input;
  }

  private validateDefinition(nodes: WorkflowNodeInput[], edges: WorkflowEdgeInput[]) {
    if (!Array.isArray(nodes) || nodes.length === 0 || nodes.length > 100) throw new BadRequestException('Workflow must have between 1 and 100 nodes');
    const keys = new Set<string>();
    for (const node of nodes) {
      if (!node.nodeKey || keys.has(node.nodeKey)) throw new BadRequestException('Workflow node keys must be unique');
      keys.add(node.nodeKey);
      if (!node.type) throw new BadRequestException(`Workflow node ${node.nodeKey} has no type`);
      if (!this.capabilityFor(node.type) && !this.toolFor(node.type) && !['input', 'output'].includes(node.type)) {
        throw new BadRequestException(`Unsupported workflow node type: ${node.type}`);
      }
    }
    const indegree = new Map<string, number>(nodes.map((node) => [node.nodeKey, 0]));
    const outgoing = new Map<string, string[]>(nodes.map((node) => [node.nodeKey, []]));
    for (const edge of edges || []) {
      if (!keys.has(edge.sourceNode) || !keys.has(edge.targetNode)) throw new BadRequestException('Workflow edge references an unknown node');
      indegree.set(edge.targetNode, (indegree.get(edge.targetNode) || 0) + 1);
      outgoing.get(edge.sourceNode)?.push(edge.targetNode);
    }
    const queue = [...indegree.entries()].filter(([, value]) => value === 0).map(([key]) => key);
    const order: string[] = [];
    while (queue.length) {
      const key = queue.shift() as string;
      order.push(key);
      for (const target of outgoing.get(key) || []) {
        const next = (indegree.get(target) || 0) - 1;
        indegree.set(target, next);
        if (next === 0) queue.push(target);
      }
    }
    if (order.length !== nodes.length) throw new BadRequestException('Workflow graph contains a cycle');
    return { nodes, edges: edges || [], order };
  }
}
