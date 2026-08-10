import { Injectable } from '@nestjs/common';
import {
  CreativeCapability,
  CreativeProvider,
  CreativeProviderInput,
  CreativeProviderOutput,
  CreativeProviderQuote,
  estimateCreativeCredits,
} from '../../creative-engine.types';
import { KieApiClient } from './kie-api.client';
import {
  assertModelPricingConfigured,
  chooseProtectedCredits,
} from '../../creative-credit-policy';

@Injectable()
export class KieCreativeProvider implements CreativeProvider {
  readonly id = 'kie';

  constructor(private readonly client: KieApiClient) {}

  capabilities(): CreativeCapability[] {
    if (!this.client.isConfigured()) return [];
    const result: CreativeCapability[] = [
      'image-generation',
      'video-generation',
      'b-roll',
      'text-to-speech',
      'talking-actor',
      'lip-sync',
    ];
    if (process.env.CREATIVE_KIE_TRANSLATION_MODEL) result.push('translation');
    if (process.env.CREATIVE_KIE_ACTOR_REPLACEMENT_MODEL) result.push('actor-replacement');
    return result;
  }

  quote(capability: CreativeCapability, input: CreativeProviderInput): CreativeProviderQuote {
    const model = this.modelFor(capability);
    const configuredCredits = Number(process.env[`CREATIVE_KIE_${this.envName(capability)}_CREDITS`] || 0);
    const configuredCostUsd = Number(process.env[`CREATIVE_KIE_${this.envName(capability)}_COST_USD`] || 0);
    assertModelPricingConfigured({ capability, model, configuredCredits, configuredCostUsd });
    return {
      provider: this.id,
      model,
      estimatedCredits: chooseProtectedCredits({
        capability,
        input,
        model,
        configuredCredits: configuredCredits > 0 ? configuredCredits : estimateCreativeCredits(capability, input),
      }),
      estimatedCostUsd: this.costFor(capability, input),
      explanation: `Estimativa Kie.ai para ${model}; custo real pode variar conforme duração, resolução e créditos da conta Kie.`,
    };
  }

  async generate(capability: CreativeCapability, input: CreativeProviderInput): Promise<CreativeProviderOutput> {
    if (!this.capabilities().includes(capability)) throw new Error(`Kie.ai is not configured for ${capability}`);
    const model = this.modelFor(capability);
    if (capability === 'video-generation' && model.toLowerCase().includes('sora')) {
      throw new Error('Sora is blocked until its Kie route and live pricing are configured');
    }
    let result;

    if (capability === 'video-generation' || capability === 'b-roll') {
      const videoInput = {
        prompt: input.prompt,
        imageUrls: input.imageUrls || [],
        aspectRatio: this.aspectRatio(input.aspectRatio),
        durationSec: input.durationSec,
        generateAudio: input.metadata?.generateAudio !== false,
      };
      result = model.toLowerCase().includes('seedance')
        ? await this.client.generateSeedance(model, videoInput)
        : await this.client.generateVeo({
            ...videoInput,
            model,
            generationType: input.imageUrls?.length ? 'REFERENCE_2_VIDEO' : 'TEXT_2_VIDEO',
          });
    } else if (capability === 'image-generation') {
      result = await this.client.generateImage(model, {
        prompt: input.prompt,
        imageUrls: input.imageUrls || [],
        aspectRatio: this.aspectRatio(input.aspectRatio),
        size: String(input.metadata?.size || input.metadata?.resolution || ''),
      });
    } else if (capability === 'text-to-speech') {
      const voiceId = input.voice?.externalId || input.voice?.id || process.env.CREATIVE_DEFAULT_VOICE_ID;
      if (!voiceId) throw new Error('Kie TTS requires a voice external id or CREATIVE_DEFAULT_VOICE_ID');
      result = await this.client.createMarketTask(model, {
        text: input.script || input.prompt,
        voice: voiceId,
        voice_id: voiceId,
        language_code: input.language || input.voice?.language,
        stability: input.metadata?.stability,
        similarity_boost: input.metadata?.similarityBoost,
        style: input.metadata?.style,
        speed: input.metadata?.speed,
        timestamps: input.metadata?.timestamps === true,
      });
    } else if (capability === 'talking-actor' || capability === 'lip-sync') {
      if (!input.actor?.imageUrl) throw new Error('Kie avatar generation requires actor.imageUrl');
      if (!input.audioUrl) throw new Error('Kie avatar generation requires audioUrl');
      result = await this.client.createMarketTask(model, {
        image_url: input.actor.imageUrl,
        audio_url: input.audioUrl,
        video_url: input.videoUrl,
        prompt: input.prompt || input.script,
      });
    } else if (capability === 'actor-replacement') {
      if (!input.videoUrl) throw new Error('Kie actor replacement requires videoUrl');
      result = await this.client.createMarketTask(model, {
        video_url: input.videoUrl,
        image_url: input.actor?.imageUrl,
        audio_url: input.audioUrl,
        prompt: input.prompt || input.script,
      });
    } else if (capability === 'translation') {
      result = await this.client.createMarketTask(model, {
        text: input.script || input.prompt,
        target_language: input.metadata?.targetLanguage || input.language,
        source_language: input.metadata?.sourceLanguage,
      });
    } else {
      throw new Error(`Kie.ai does not implement ${capability}`);
    }

    return {
      provider: this.id,
      model,
      url: result.url,
      audioUrl: result.audioUrl,
      thumbnailUrl: result.thumbnailUrl,
      metadata: {
        providerTaskId: result.taskId,
        providerEndpoint: capability === 'video-generation' || capability === 'b-roll'
          ? 'veo'
          : capability === 'image-generation' && (process.env.CREATIVE_KIE_IMAGE_ENDPOINT || '').includes('gpt4o-image')
            ? 'image'
            : 'market',
        status: result.status,
        ...(result.translatedText ? { translatedText: result.translatedText } : {}),
        raw: process.env.CREATIVE_KIE_INCLUDE_RAW_RESPONSE === 'true' ? result.raw : undefined,
      },
    };
  }

  async cancel(_capability: CreativeCapability, input: CreativeProviderInput) {
    const taskId = String(input.metadata?.providerTaskId || '');
    if (!taskId) return;
    const endpoint = String(input.metadata?.providerEndpoint || 'market');
    await this.client.cancelTask(taskId, endpoint === 'veo' || endpoint === 'image' ? endpoint : 'market');
  }

  private modelFor(capability: CreativeCapability) {
    if (capability === 'image-generation') return process.env.CREATIVE_KIE_IMAGE_MODEL || 'gpt-image-1';
    if (capability === 'video-generation') return process.env.CREATIVE_KIE_VIDEO_MODEL || 'veo3_fast';
    if (capability === 'b-roll') return process.env.CREATIVE_KIE_BROLL_MODEL || process.env.CREATIVE_KIE_VIDEO_MODEL || 'veo3_fast';
    if (capability === 'text-to-speech') return process.env.CREATIVE_KIE_TTS_MODEL || 'elevenlabs/text-to-speech-multilingual-v2';
    if (capability === 'talking-actor') return process.env.CREATIVE_KIE_TALKING_ACTOR_MODEL || 'kling/ai-avatar-standard';
    if (capability === 'lip-sync') return process.env.CREATIVE_KIE_LIP_SYNC_MODEL || 'kling/ai-avatar-standard';
    if (capability === 'actor-replacement') return process.env.CREATIVE_KIE_ACTOR_REPLACEMENT_MODEL || 'kie/actor-replacement';
    return process.env.CREATIVE_KIE_TRANSLATION_MODEL || 'gpt-5.2';
  }

  private envName(capability: CreativeCapability) {
    const names: Partial<Record<CreativeCapability, string>> = {
      'image-generation': 'IMAGE',
      'video-generation': 'VIDEO',
      'b-roll': 'BROLL',
      'text-to-speech': 'TTS',
      'talking-actor': 'TALKING_ACTOR',
      'lip-sync': 'LIP_SYNC',
      translation: 'TRANSLATION',
      captions: 'CAPTIONS',
      'actor-replacement': 'ACTOR_REPLACEMENT',
    };
    return names[capability] || capability.toUpperCase().replace(/-/g, '_');
  }

  private costFor(capability: CreativeCapability, input: CreativeProviderInput) {
    const configured = Number(process.env[`CREATIVE_KIE_${this.envName(capability)}_COST_USD`] || 0);
    if (configured > 0) return configured;
    const duration = Math.max(1, Number(input.durationSec || 1));
    const perSecond = Number(process.env[`CREATIVE_KIE_${this.envName(capability)}_COST_PER_SECOND_USD`] || 0);
    return perSecond > 0 ? Number((duration * perSecond).toFixed(6)) : undefined;
  }

  private aspectRatio(value?: string) {
    return value === '16:9' || value === '1:1' || value === '4:5' ? value : '9:16';
  }
}
