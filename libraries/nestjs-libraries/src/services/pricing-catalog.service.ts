import { Injectable } from '@nestjs/common';
import { Prisma, PricingVersion } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { CreativeCapability, CreativeProviderInput, CreativeProviderQuote } from '@gitroom/nestjs-libraries/creative-engine/creative-engine.types';

const DEFAULT_PRICES = [
  ['chat-ideas', 'contentflow', 'text-default', 'request', 10, 0],
  ['carousel-copy', 'contentflow', 'text-default', 'request', 20, 0],
  ['brand-dna', 'contentflow', 'text-default', 'request', 20, 0],
  ['editorial-plan', 'contentflow', 'text-default', 'request', 30, 0],
  ['ad-kit', 'contentflow', 'text-default', 'request', 40, 0],
  ['email-campaign', 'contentflow', 'text-default', 'request', 30, 0],
  ['script', 'contentflow', 'text-default', 'request', 25, 0],
  ['image-basic', 'kie', 'gpt-image-2', 'image', 25, 0.03],
  ['image-2k', 'kie', 'gpt-image-2', 'image', 50, 0.06],
  ['image-4k', 'kie', 'gpt-image-2', 'image', 100, 0.12],
  ['seedance-2.5-480p-10', 'kie', 'seedance-2.5', '10_seconds', 900, 1.40],
  ['seedance-2.5-720p-10', 'kie', 'seedance-2.5', '10_seconds', 2000, 3.15],
  ['seedance-2.5-720p-input-10', 'kie', 'seedance-2.5', '10_seconds_with_input', 2500, 1.90],
  ['seedance-2.5-720p-30', 'kie', 'seedance-2.5', '30_seconds', 6000, 9.45],
  ['seedance-2.5-720p-input-30', 'kie', 'seedance-2.5', '30_seconds_with_input', 7500, 5.70],
  ['kling3-10', 'kie', 'kling-3.0', '10_seconds', 1000, 2.00],
  ['veo3.1-1080p', 'kie', 'veo3.1', 'video', 1600, 1.28],
  ['veo3.1-4k', 'kie', 'veo3.1', 'video', 2400, 1.85],
  ['talking-actor-15', 'kie', 'avatar', '15_seconds', 325, 4.00],
  ['tts-30', 'kie', 'text-to-speech', '30_seconds', 12, 0.06],
  ['translation', 'contentflow', 'text-default', 'request', 20, 0.01],
  ['captions', 'contentflow', 'deterministic-srt', 'request', 8, 0],
] as const;

@Injectable()
export class PricingCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureCatalog() {
    for (const [code, provider, model, unit, baseCredits, providerCostUsd] of DEFAULT_PRICES) {
      // Concurrent callers race to seed the same code; the row existing is the
      // desired end state, so the loser's unique violation is not an error.
      await this.prisma.pricingVersion.upsert({
        where: { code },
        update: {},
        create: { code, operation: code.split('-')[0], provider, model, unit, baseCredits, providerCostUsd, minCredits: baseCredits },
      }).catch((error: any) => {
        if (error?.code !== 'P2002') throw error;
      });
    }
  }

  async list() {
    await this.ensureCatalog();
    return this.prisma.pricingVersion.findMany({ where: { active: true }, orderBy: [{ provider: 'asc' }, { operation: 'asc' }] });
  }

  async update(code: string, input: { baseCredits?: number; minCredits?: number; providerCostUsd?: number; active?: boolean; updatedBy?: string }) {
    const current = await this.prisma.pricingVersion.findUnique({ where: { code } });
    if (!current) throw new Error(`Pricing version not found: ${code}`);
    return this.prisma.pricingVersion.update({
      where: { code },
      data: {
        baseCredits: input.baseCredits,
        minCredits: input.minCredits,
        providerCostUsd: input.providerCostUsd,
        active: input.active,
        parameters: {
          ...(current.parameters as Record<string, unknown> || {}),
          lastUpdatedBy: input.updatedBy,
          lastUpdatedAt: new Date().toISOString(),
        },
      },
    });
  }

  async quote(input: {
    capability?: CreativeCapability;
    operation?: string;
    model?: string;
    durationSec?: number;
    resolution?: string;
    hasInput?: boolean;
    provider?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.ensureCatalog();
    const capability = input.capability || 'image-generation';
    const model = input.model || String(input.metadata?.model || '');
    const durationSec = Math.max(1, Number(input.durationSec || 10));
    const resolution = String(input.resolution || input.metadata?.resolution || '720p').toLowerCase();
    let code = input.operation ? String(input.operation) : this.codeFor(capability, model, durationSec, resolution, Boolean(input.hasInput));
    let price = await this.prisma.pricingVersion.findUnique({ where: { code } });
    if (!price) {
      const fallbackCode = capability === 'image-generation' ? 'image-basic' : capability === 'text-to-speech' ? 'tts-30' : capability === 'captions' ? 'captions' : 'script';
      price = await this.prisma.pricingVersion.findUnique({ where: { code: fallbackCode } });
    }
    if (!price) throw new Error(`No pricing configured for ${capability}`);
    const blocks = capability === 'video-generation' || capability === 'b-roll'
      ? Math.max(1, Math.ceil(durationSec / 10))
      : capability === 'text-to-speech'
        ? Math.max(1, Math.ceil(durationSec / 30))
        : 1;
    const credits = Math.max(price.minCredits, price.baseCredits * blocks);
    const providerCostUsd = price.providerCostUsd ? Number(price.providerCostUsd) * blocks : undefined;
    return {
      quoteId: randomUUID(),
      operation: input.operation || capability,
      provider: price.provider,
      model: price.model,
      credits,
      providerCostUsd,
      providerCostBrl: providerCostUsd ? providerCostUsd * Number(process.env.BILLING_USD_BRL || 5.5) : undefined,
      pricingVersion: price.code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      lineItems: [{ label: `${price.model} · ${price.unit}`, quantity: blocks, credits }],
    };
  }

  normalizeProviderQuote(quote: CreativeProviderQuote, capability: CreativeCapability, input: CreativeProviderInput) {
    const model = quote.model || '';
    if (!model.toLowerCase().includes('seedance') || !['video-generation', 'b-roll'].includes(capability)) return quote;
    const resolution = String(input.metadata?.resolution || process.env.CREATIVE_KIE_SEEDANCE_RESOLUTION || '720p').toLowerCase();
    const hasInput = Boolean(input.imageUrls?.length || input.videoUrl);
    const durationSec = Math.max(1, Number(input.durationSec || 10));
    const perBlock = resolution === '480p' ? 900 : hasInput ? 2500 : 2000;
    const providerCostUsd = resolution === '480p' ? 1.4 : hasInput ? 1.9 : 3.15;
    return {
      ...quote,
      estimatedCredits: perBlock * Math.max(1, Math.ceil(durationSec / 10)),
      estimatedCostUsd: providerCostUsd * Math.max(1, Math.ceil(durationSec / 10)),
      explanation: `Preço catalogado para ${model}, ${resolution}, ${durationSec}s${hasInput ? ' com mídia de entrada' : ''}`,
    };
  }

  async recordProviderCost(input: {
    organizationId?: string;
    provider: string;
    model: string;
    operation: string;
    providerRequestId?: string;
    estimatedCostUsd?: number;
    actualCostUsd?: number;
    costBrlCents?: number;
    creditsCharged?: number;
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.providerCostRecord.create({
      data: {
        organizationId: input.organizationId,
        provider: input.provider,
        model: input.model,
        operation: input.operation,
        providerRequestId: input.providerRequestId,
        estimatedCostUsd: input.estimatedCostUsd,
        actualCostUsd: input.actualCostUsd,
        costBrlCents: input.costBrlCents,
        creditsCharged: input.creditsCharged,
        input: input.input ? JSON.parse(JSON.stringify(input.input)) as Prisma.InputJsonValue : undefined,
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue : {},
      },
    });
  }

  private codeFor(capability: CreativeCapability, model: string, durationSec: number, resolution: string, hasInput: boolean) {
    const normalizedModel = model.toLowerCase();
    if (capability === 'image-generation') return resolution.includes('4k') ? 'image-4k' : resolution.includes('2k') ? 'image-2k' : 'image-basic';
    if (capability === 'video-generation' || capability === 'b-roll') {
      if (normalizedModel.includes('seedance') && resolution === '480p') return 'seedance-2.5-480p-10';
      if (normalizedModel.includes('seedance') && hasInput) return `seedance-2.5-${resolution}-input-${durationSec > 10 ? 30 : 10}`;
      if (normalizedModel.includes('seedance')) return `seedance-2.5-${resolution}-${durationSec > 10 ? 30 : 10}`;
      if (normalizedModel.includes('kling')) return 'kling3-10';
      if (normalizedModel.includes('veo') && resolution.includes('4k')) return 'veo3.1-4k';
      if (normalizedModel.includes('veo')) return 'veo3.1-1080p';
    }
    if (capability === 'text-to-speech') return 'tts-30';
    if (capability === 'talking-actor' || capability === 'lip-sync') return 'talking-actor-15';
    if (capability === 'translation') return 'translation';
    if (capability === 'captions') return 'captions';
    return 'script';
  }
}
