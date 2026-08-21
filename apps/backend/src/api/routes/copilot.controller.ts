import {
  Logger,
  Controller,
  Get,
  Post,
  Req,
  Res,
  Query,
  Param,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNodeHttpEndpoint,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import OpenAI from 'openai';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { MastraAgent } from '@ag-ui/mastra';
import { MastraService } from '@gitroom/nestjs-libraries/chat/mastra.service';
import { Request, Response } from 'express';
import { RequestContext } from '@mastra/core/di';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { StudioArtifactService } from '@gitroom/nestjs-libraries/chat/studio/studio-artifact.service';
import { CreditAccountingService } from '@gitroom/nestjs-libraries/services/credit-accounting.service';
import { PricingCatalogService } from '@gitroom/nestjs-libraries/services/pricing-catalog.service';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';

export type ChannelsContext = {
  integrations: string;
  organization: string;
  ui: string;
  studioAttachments: string;
  brandContext: string;
  requestId: string;
};

type PrimaryAiConfig = {
  provider: 'kie' | 'openai';
  apiKey: string;
  baseURL?: string;
  model: string;
};

function primaryAiConfig(): PrimaryAiConfig | null {
  const provider = (process.env.AI_PRIMARY_PROVIDER || 'kie').toLowerCase();
  if (provider === 'kie') {
    const apiKey = process.env.KIEAI_API_KEY || '';
    if (!apiKey) return null;
    return {
      provider: 'kie',
      apiKey,
      baseURL:
        process.env.KIEAI_CHAT_BASE_URL ||
        `${(process.env.CREATIVE_KIE_BASE_URL || 'https://api.kie.ai').replace(/\/$/, '')}/${process.env.KIEAI_CHAT_MODEL || 'gpt-5-2'}/v1`,
      model: process.env.KIEAI_CHAT_MODEL || 'gpt-5-2',
    };
  }

  const apiKey = process.env.OPENAI_API_KEY || '';
  if (!apiKey) return null;
  return {
    provider: 'openai',
    apiKey,
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4.1',
  };
}

function primaryAiAdapter() {
  const config = primaryAiConfig();
  if (!config) return null;
  const openai = new OpenAI({
    apiKey: config.apiKey,
    ...(config.baseURL ? { baseURL: config.baseURL } : {}),
  });

  if (config.provider === 'kie') {
    // CopilotKit's OpenAIAdapter currently calls the beta streaming helper:
    // `openai.beta.chat.completions.stream(...)`. Kie.ai implements the
    // OpenAI-compatible Chat Completions API, but does not expose that beta
    // helper. Bridge the adapter to the supported standard streaming method.
    const client = openai as any;
    client.beta = client.beta || {};
    client.beta.chat = client.beta.chat || {};
    client.beta.chat.completions = client.beta.chat.completions || {};
    client.beta.chat.completions.stream = (request: Record<string, unknown>) => ({
      async *[Symbol.asyncIterator]() {
        const stream = await openai.chat.completions.create(request as any);
        for await (const chunk of stream as any) {
          yield chunk;
        }
      },
    });
  }

  return new OpenAIAdapter({ openai: openai as any, model: config.model });
}

@Controller('/copilot')
export class CopilotController {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _mastraService: MastraService,
    private _studioArtifacts: StudioArtifactService,
    private _credits: CreditAccountingService,
    private _pricingCatalog: PricingCatalogService,
    private _brandProfiles: BrandProfileService,
  ) {}

  // Compiles the org's selected Brand Profile + latest DNA snapshot into a
  // compact context block for the agent's system prompt. Without this the
  // Studio agent has no way to know the brand's niche, audience, offer or
  // voice — there is no brand tool in its tool list — so it interrogates the
  // user for details ContentFlow already extracted ("what's your niche and
  // target audience?"), which reads as the assistant being clueless about the
  // very brand it was set up for. Best-effort: any failure yields an empty
  // block so chat still works.
  private async buildBrandContext(organizationId: string): Promise<string> {
    const compact = (value: unknown, max = 200): string => {
      if (!value) return '';
      const text = typeof value === 'string' ? value : JSON.stringify(value);
      const clean = text.replace(/\s+/g, ' ').trim();
      return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
    };
    try {
      const brand = await this._brandProfiles.getSelectedBrand(organizationId);
      if (!brand?.name) return '';
      const dna: any = await this._brandProfiles.getLatestDnaSnapshot(brand.id);
      const lines: string[] = [`Name: ${compact(brand.name, 80)}.`];
      const industry = brand.industry || dna?.summary?.industry;
      if (industry) lines.push(`Industry / niche: ${compact(industry, 80)}.`);
      if (dna?.summary?.tagline) lines.push(`Tagline: ${compact(dna.summary.tagline, 120)}.`);
      const audience = compact(dna?.audience?.demographics) || compact(dna?.audience);
      if (audience) lines.push(`Target audience: ${audience}`);
      if (Array.isArray(dna?.audience?.painPoints) && dna.audience.painPoints.length) {
        lines.push(`Audience pain points: ${compact(dna.audience.painPoints.join(', '))}`);
      }
      const offer = compact(dna?.offer?.uniqueSellingPoints) || compact(dna?.offer);
      if (offer) lines.push(`Offer / value proposition: ${offer}`);
      const voice = [dna?.voice?.tone, dna?.voice?.style, dna?.voice?.personality]
        .map((v) => compact(v, 60))
        .filter(Boolean)
        .join(', ');
      if (voice) lines.push(`Brand voice: ${voice}.`);
      return lines.join('\n');
    } catch {
      return '';
    }
  }

  @Get('/status')
  status() {
    const config = primaryAiConfig();
    return {
      aiConfigured: Boolean(config),
      chatAvailable: Boolean(config),
      provider: config?.provider || null,
      model: config?.model || null,
    };
  }

  @Post('/chat')
  chatAgent(@Req() req: Request, @Res() res: Response) {
    const serviceAdapter = primaryAiAdapter();
    if (!serviceAdapter) {
      Logger.warn('Primary AI provider is not configured, chat functionality will not work');
      return res.status(503).json({
        code: 'AI_PROVIDER_NOT_CONFIGURED',
        message: 'O provedor de IA ainda nao foi configurado no backend.',
      });
    }

    const copilotRuntimeHandler = copilotRuntimeNodeHttpEndpoint({
      endpoint: '/copilot/chat',
      runtime: new CopilotRuntime(),
      serviceAdapter,
    });

    return copilotRuntimeHandler(req, res);
  }

  @Post('/agent')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async agent(
    @Req() req: Request,
    @Res() res: Response,
    @GetOrgFromRequest() organization: Organization
  ) {
    const serviceAdapter = primaryAiAdapter();
    if (!serviceAdapter) {
      Logger.warn('Primary AI provider is not configured, chat functionality will not work');
      return res.status(503).json({
        code: 'AI_PROVIDER_NOT_CONFIGURED',
        message: 'O provedor de IA ainda nao foi configurado no backend.',
      });
    }
    const mastra = await this._mastraService.mastra();
    const requestContext = new RequestContext<ChannelsContext>();
    requestContext.set(
      'integrations',
      req?.body?.variables?.properties?.integrations || []
    );

    requestContext.set('organization', JSON.stringify(organization));
    requestContext.set('ui', 'true');
    requestContext.set('brandContext', await this.buildBrandContext(organization.id));
    // One fresh id per incoming HTTP request, stable across every step of
    // this request's tool-calling loop (maxSteps: 8 — see
    // load.tools.service.ts) but different on the next request. Credit-
    // spending tools use this to make sure a confirmed=true call can only
    // consume a pending confirmation that was asked in an EARLIER request —
    // closing the gap where the model could otherwise ask-then-confirm
    // entirely on its own within one multi-step tool loop, no real user
    // turn involved. See ToolConfirmationService.
    requestContext.set('requestId', randomUUID());
    const threadId =
      req.body?.threadId || req.body?.thread?.id || req.body?.variables?.threadId;
    if (threadId) {
      const attachments = await this._studioArtifacts.listAttachments(
        organization.id,
        threadId,
      );
      requestContext.set(
        'studioAttachments',
        JSON.stringify(
          attachments.map((attachment: any) => ({
            id: attachment.id,
            filename: attachment.filename,
            kind: attachment.kind,
            mimeType: attachment.mimeType,
            storageUrl: attachment.storageUrl,
            status: attachment.status,
            metadata: attachment.metadata,
          })),
        ),
      );
    }
    // CopilotKit drives several GraphQL operations through this one endpoint:
    // `availableAgents` and `loadAgentState` are cheap metadata queries that run
    // on every page load, and only the `generateCopilotResponse` mutation calls
    // the model. Charging all of them billed ~3x per interaction and could
    // exhaust an org's credits without a single generation.
    if (req?.body?.operationName === 'generateCopilotResponse') {
      const quote = await this._pricingCatalog.quote({ operation: 'chat-ideas' });
      // The previous fallback keyed on Date.now(), which is unique on every
      // call by construction - it could never actually deduplicate anything,
      // so a dropped connection or client retry of the exact same mutation
      // reserved (and eventually billed) credits a second time for one chat
      // turn. Hashing the request body makes a genuine retry - byte-identical
      // payload - collapse onto the same reservation via reserve()'s own
      // idempotencyKey lookup. Bucketed to a short window so the key expires
      // naturally instead of colliding with a much later, coincidentally
      // identical body.
      const idempotencyKey = String(
        req.headers['idempotency-key'] ||
          `chat:${organization.id}:${createHash('sha256')
            .update(JSON.stringify(req.body || {}))
            .digest('hex')}:${Math.floor(Date.now() / 30000)}`
      );
      const reservation = await this._credits.reserve(organization.id, quote.credits, {
        quoteId: quote.quoteId,
        idempotencyKey,
        operation: 'chat-ideas',
        provider: quote.provider,
        model: quote.model,
      });
      // 'finish' only fires when the response completes normally. Chat responses
      // are streamed, so a client abort or a dropped connection emits 'close'
      // instead — without it the reservation is never released and the org
      // silently loses those credits for good.
      let creditsFinalized = false;
      const finalizeCredits = () => {
        if (creditsFinalized) return;
        creditsFinalized = true;
        const aborted = !res.writableEnded;
        const failed = aborted || res.statusCode >= 400;
        const action = failed
          ? this._credits.refund(
              reservation.id,
              aborted ? 'chat-aborted' : `chat-http-${res.statusCode}`
            )
          : this._credits.settle(reservation.id, quote.credits);
        void action.catch((error) => Logger.error(`Failed to settle chat credits: ${String(error)}`));
      };
      res.once('finish', finalizeCredits);
      res.once('close', finalizeCredits);
    }

    const agents = MastraAgent.getLocalAgents({
      resourceId: organization.id,
      mastra,
      requestContext: requestContext as any,
    });

    const runtime = new CopilotRuntime({
      agents,
    });

    const copilotRuntimeHandler = copilotRuntimeNextJSAppRouterEndpoint({
      endpoint: '/copilot/agent',
      runtime,
      // properties: req.body.variables.properties,
      serviceAdapter,
    });

    // Diagnostic only (temporary): production has been observed returning a
    // clean 200 for generateCopilotResponse - full HTTP success, credits
    // settled - while the agent run produces no text and nothing gets saved
    // to Mastra's message store. copilotRuntimeNextJSAppRouterEndpoint
    // appears to swallow the underlying failure rather than throwing, so
    // nothing reaches Nest's exception logging. Inspect the actual bytes
    // written to the client so the next failing run leaves a stack trace /
    // error payload in the logs instead of vanishing silently.
    if (req?.body?.operationName === 'generateCopilotResponse') {
      const responseChunks: Buffer[] = [];
      const originalWrite = res.write.bind(res);
      const originalEnd = res.end.bind(res);
      (res as any).write = (chunk: any, ...args: any[]) => {
        if (chunk) {
          responseChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        }
        return originalWrite(chunk, ...args);
      };
      (res as any).end = (chunk?: any, ...args: any[]) => {
        if (chunk) {
          responseChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        }
        try {
          const body = Buffer.concat(responseChunks).toString('utf8');
          if (/"errors"\s*:|RUN_ERROR|"type"\s*:\s*"error"/i.test(body)) {
            Logger.error(
              `[copilot/agent] chat run for org ${organization.id} completed with an error payload: ${body.slice(0, 4000)}`
            );
          }
        } catch (inspectError) {
          Logger.error(`[copilot/agent] failed to inspect chat response body: ${String(inspectError)}`);
        }
        return originalEnd(chunk, ...args);
      };
    }

    try {
      return await copilotRuntimeHandler.handleRequest(req, res);
    } catch (error) {
      Logger.error(
        `[copilot/agent] chat run for org ${organization.id} threw: ${error instanceof Error ? error.stack : String(error)}`
      );
      throw error;
    }
  }

  @Get('/credits')
  calculateCredits(
    @GetOrgFromRequest() organization: Organization,
    @Query('type') type: 'ai_images' | 'ai_videos'
  ) {
    return this._subscriptionService.checkCredits(
      organization,
      type || 'ai_images'
    );
  }

  @Get('/:thread/list')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async getMessagesList(
    @GetOrgFromRequest() organization: Organization,
    @Param('thread') threadId: string
  ): Promise<any> {
    const mastra = await this._mastraService.mastra();
    // Studio's own thread/message management now reads from the
    // 'contentflow-studio' agent (see docs/studio-audit.md, item C4) - the
    // one actually used by the chat UI. Both agents share the same
    // Postgres-backed storage (keyed by resourceId/threadId, not by agent
    // name), so this is not a data migration, just pointing reads at the
    // agent object the Studio UI's own runs are recorded under.
    const memory = await mastra.getAgent('contentflow-studio').getMemory();
    try {
      return await memory.recall({
        resourceId: organization.id,
        threadId,
      });
    } catch (err) {
      return { messages: [] };
    }
  }

  @Get('/:thread/context')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async getThreadContext(
    @GetOrgFromRequest() organization: Organization,
    @Param('thread') threadId: string
  ): Promise<any> {
    const mastra = await this._mastraService.mastra();
    // Studio's own thread/message management now reads from the
    // 'contentflow-studio' agent (see docs/studio-audit.md, item C4) - the
    // one actually used by the chat UI. Both agents share the same
    // Postgres-backed storage (keyed by resourceId/threadId, not by agent
    // name), so this is not a data migration, just pointing reads at the
    // agent object the Studio UI's own runs are recorded under.
    const memory = await mastra.getAgent('contentflow-studio').getMemory();
    const thread = await memory.getThreadById({ threadId });
    if (!thread || thread.resourceId !== organization.id) {
      return { thread: null, metadata: {} };
    }
    return {
      thread: {
        id: thread.id,
        title: thread.title,
        resourceId: thread.resourceId,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
      },
      metadata: this.parseThreadMetadata(thread.metadata),
    };
  }

  @Post('/:thread/archive')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async archiveThread(
    @GetOrgFromRequest() organization: Organization,
    @Param('thread') threadId: string
  ): Promise<any> {
    const mastra = await this._mastraService.mastra();
    // Studio's own thread/message management now reads from the
    // 'contentflow-studio' agent (see docs/studio-audit.md, item C4) - the
    // one actually used by the chat UI. Both agents share the same
    // Postgres-backed storage (keyed by resourceId/threadId, not by agent
    // name), so this is not a data migration, just pointing reads at the
    // agent object the Studio UI's own runs are recorded under.
    const memory = await mastra.getAgent('contentflow-studio').getMemory();
    const thread = await memory.getThreadById({ threadId });
    if (!thread || thread.resourceId !== organization.id) {
      return { archived: false };
    }
    const metadata = this.parseThreadMetadata(thread.metadata);
    metadata.archivedAt = new Date().toISOString();
    await (memory as any).updateThread({
      id: thread.id,
      title: thread.title,
      metadata,
    });
    return { archived: true, threadId };
  }

  @Post('/:thread/restore')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async restoreThread(
    @GetOrgFromRequest() organization: Organization,
    @Param('thread') threadId: string
  ): Promise<any> {
    const mastra = await this._mastraService.mastra();
    // Studio's own thread/message management now reads from the
    // 'contentflow-studio' agent (see docs/studio-audit.md, item C4) - the
    // one actually used by the chat UI. Both agents share the same
    // Postgres-backed storage (keyed by resourceId/threadId, not by agent
    // name), so this is not a data migration, just pointing reads at the
    // agent object the Studio UI's own runs are recorded under.
    const memory = await mastra.getAgent('contentflow-studio').getMemory();
    const thread = await memory.getThreadById({ threadId });
    if (!thread || thread.resourceId !== organization.id) {
      return { restored: false };
    }
    const metadata = this.parseThreadMetadata(thread.metadata);
    delete metadata.archivedAt;
    await (memory as any).updateThread({
      id: thread.id,
      title: thread.title,
      metadata,
    });
    return { restored: true, threadId };
  }

  @Get('/list')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async getList(@GetOrgFromRequest() organization: Organization) {
    const mastra = await this._mastraService.mastra();
    // Studio's own thread/message management now reads from the
    // 'contentflow-studio' agent (see docs/studio-audit.md, item C4) - the
    // one actually used by the chat UI. Both agents share the same
    // Postgres-backed storage (keyed by resourceId/threadId, not by agent
    // name), so this is not a data migration, just pointing reads at the
    // agent object the Studio UI's own runs are recorded under.
    const memory = await mastra.getAgent('contentflow-studio').getMemory();
    const list = await memory.listThreads({
      filter: { resourceId: organization.id },
      perPage: 100000,
      page: 0,
      orderBy: { field: 'createdAt', direction: 'DESC' },
    });

    return {
      threads: list.threads.filter((p) => !this.parseThreadMetadata(p.metadata).archivedAt).map((p) => ({
        id: p.id,
        title: p.title,
      })),
    };
  }

  private parseThreadMetadata(metadata: unknown): Record<string, any> {
    if (!metadata) return {};
    if (typeof metadata === 'object') return metadata as Record<string, any>;
    if (typeof metadata !== 'string') return {};
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
}
