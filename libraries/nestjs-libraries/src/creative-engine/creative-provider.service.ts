import {
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Readable } from 'stream';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { VideoManager } from '@gitroom/nestjs-libraries/videos/video.manager';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import {
  CreativeCapability,
  CreativeProvider,
  CreativeProviderInput,
  CreativeProviderOutput,
  CreativeProviderQuote,
  estimateCreativeCredits,
} from './creative-engine.types';
import { KieCreativeProvider } from './providers/kie/kie-creative.provider';
import { PricingCatalogService } from '@gitroom/nestjs-libraries/services/pricing-catalog.service';

@Injectable()
export class CreativeProviderService {
  private readonly logger = new Logger(CreativeProviderService.name);
  private readonly providers = new Map<string, CreativeProvider>();

  constructor(
    private readonly openaiService: OpenaiService,
    private readonly videoManager: VideoManager,
    @Optional() private readonly kieProvider?: KieCreativeProvider,
    @Optional() private readonly pricingCatalog?: PricingCatalogService,
  ) {
    if (this.kieProvider?.capabilities().length) {
      this.providers.set(this.kieProvider.id, this.kieProvider);
    }
    this.providers.set('contentflow', this.createContentFlowProvider());
    if (process.env.CREATIVE_TALKING_ACTOR_URL) {
      this.providers.set('talking-actor-http', this.createHttpProvider(
        'talking-actor-http',
        'talking-actor',
        process.env.CREATIVE_TALKING_ACTOR_URL,
        process.env.CREATIVE_TALKING_ACTOR_TOKEN,
        process.env.CREATIVE_TALKING_ACTOR_MODEL,
      ));
    }
    if (process.env.CREATIVE_LIP_SYNC_URL) {
      this.providers.set('lip-sync-http', this.createHttpProvider(
        'lip-sync-http',
        'lip-sync',
        process.env.CREATIVE_LIP_SYNC_URL,
        process.env.CREATIVE_LIP_SYNC_TOKEN,
        process.env.CREATIVE_LIP_SYNC_MODEL,
      ));
    }
    if (process.env.CREATIVE_ACTOR_REPLACEMENT_URL) {
      this.providers.set('actor-replacement-http', this.createHttpProvider(
        'actor-replacement-http',
        'actor-replacement',
        process.env.CREATIVE_ACTOR_REPLACEMENT_URL,
        process.env.CREATIVE_ACTOR_REPLACEMENT_TOKEN,
        process.env.CREATIVE_ACTOR_REPLACEMENT_MODEL,
      ));
    }
    const genericHttpProviders: Array<{
      id: 'image-http' | 'video-http' | 'b-roll-http' | 'tts-http' | 'translation-http';
      capability: 'image-generation' | 'video-generation' | 'b-roll' | 'text-to-speech' | 'translation';
      endpoint?: string;
      token?: string;
      model?: string;
    }> = [
      { id: 'image-http', capability: 'image-generation', endpoint: process.env.CREATIVE_IMAGE_URL, token: process.env.CREATIVE_IMAGE_TOKEN, model: process.env.CREATIVE_IMAGE_PROVIDER_MODEL },
      { id: 'video-http', capability: 'video-generation', endpoint: process.env.CREATIVE_VIDEO_URL, token: process.env.CREATIVE_VIDEO_TOKEN, model: process.env.CREATIVE_VIDEO_PROVIDER_MODEL },
      { id: 'b-roll-http', capability: 'b-roll', endpoint: process.env.CREATIVE_BROLL_URL, token: process.env.CREATIVE_BROLL_TOKEN, model: process.env.CREATIVE_BROLL_PROVIDER_MODEL },
      { id: 'tts-http', capability: 'text-to-speech', endpoint: process.env.CREATIVE_TTS_URL, token: process.env.CREATIVE_TTS_TOKEN, model: process.env.CREATIVE_TTS_PROVIDER_MODEL },
      { id: 'translation-http', capability: 'translation', endpoint: process.env.CREATIVE_TRANSLATION_URL, token: process.env.CREATIVE_TRANSLATION_TOKEN, model: process.env.CREATIVE_TRANSLATION_PROVIDER_MODEL },
    ];
    for (const config of genericHttpProviders) {
      if (config.endpoint) {
        this.providers.set(config.id, this.createHttpProvider(config.id, config.capability, config.endpoint, config.token, config.model));
      }
    }
  }

  listCapabilities() {
    return [...this.providers.values()].flatMap((provider) =>
      provider.capabilities().map((capability) => ({
        provider: provider.id,
        capability,
      })),
    );
  }

  health() {
    const capabilities = [
      ...new Set(
        [...this.providers.values()].flatMap((provider) => provider.capabilities()),
      ),
    ];
    return {
      checkedAt: new Date().toISOString(),
      providers: [...this.providers.values()].map((provider) => ({
        id: provider.id,
        capabilities: provider.capabilities(),
      })),
      routing: capabilities.map((capability) => {
        const configured = this.configuredProviderFor(capability);
        const available = [...this.providers.values()].filter((provider) =>
          provider.capabilities().includes(capability),
        );
        const primary = configured && available.some((provider) => provider.id === configured)
          ? configured
          : available[0]?.id || null;
        return {
          capability,
          ready: Boolean(primary),
          primary,
          fallbacks: available.filter((provider) => provider.id !== primary).map((provider) => provider.id),
        };
      }),
      temporalEnabled: process.env.DISABLE_TEMPORAL !== 'true',
      ffmpegConfigured: Boolean(process.env.CREATIVE_FFMPEG_PATH),
    };
  }

  quote(
    capability: CreativeCapability,
    input: CreativeProviderInput,
    providerId?: string,
  ): CreativeProviderQuote {
    const provider = this.resolveProvider(capability, providerId);
    const quote = provider.quote(capability, input);
    return this.pricingCatalog?.normalizeProviderQuote(quote, capability, input) || quote;
  }

  async generate(
    capability: CreativeCapability,
    input: CreativeProviderInput,
    providerId?: string,
  ): Promise<CreativeProviderOutput> {
    const candidates = this.providerCandidates(capability, providerId);
    let lastError: unknown;
    for (const provider of candidates) {
      try {
        return await provider.generate(capability, input);
      } catch (error) {
        lastError = error;
        if (providerId) throw error;
        this.logger.warn(
          `Creative provider ${provider.id} failed for ${capability}; trying fallback`,
        );
      }
    }
    throw lastError || new ServiceUnavailableException(
      `No provider is configured for creative capability: ${capability}`,
    );
  }

  async cancel(
    capability: CreativeCapability,
    input: CreativeProviderInput,
    providerId?: string,
  ) {
    const provider = this.resolveProvider(capability, providerId);
    if (provider.cancel) await provider.cancel(capability, input);
  }

  private resolveProvider(capability: CreativeCapability, providerId?: string) {
    return this.providerCandidates(capability, providerId)[0];
  }

  private providerCandidates(capability: CreativeCapability, providerId?: string) {
    const selectedProviderId = providerId || this.configuredProviderFor(capability);
    const selected = selectedProviderId
      ? this.providers.get(selectedProviderId)
      : undefined;
    if (providerId && (!selected || !selected.capabilities().includes(capability))) {
      throw new ServiceUnavailableException(
        `No provider is configured for creative capability: ${capability}`,
      );
    }

    const fallbacks = [...this.providers.values()].filter(
      (item) => item.capabilities().includes(capability) && item !== selected,
    );
    const candidates = selected ? [selected, ...fallbacks] : fallbacks;
    if (!candidates.length) {
      throw new ServiceUnavailableException(
        `No provider is configured for creative capability: ${capability}`,
      );
    }
    return candidates;
  }

  private configuredProviderFor(capability: CreativeCapability) {
    const variableByCapability: Partial<Record<CreativeCapability, string>> = {
      'image-generation': 'CREATIVE_IMAGE_PROVIDER',
      'video-generation': 'CREATIVE_VIDEO_PROVIDER',
      'b-roll': 'CREATIVE_BROLL_PROVIDER',
      'text-to-speech': 'CREATIVE_TTS_PROVIDER',
      translation: 'CREATIVE_TRANSLATION_PROVIDER',
      'talking-actor': 'CREATIVE_TALKING_ACTOR_PROVIDER',
      'lip-sync': 'CREATIVE_LIP_SYNC_PROVIDER',
      'actor-replacement': 'CREATIVE_ACTOR_REPLACEMENT_PROVIDER',
    };
    const explicit = variableByCapability[capability]
      ? process.env[variableByCapability[capability] as string]
      : undefined;
    if (explicit) return explicit;
    if (this.providers.has('kie') && ['image-generation', 'video-generation', 'b-roll', 'text-to-speech', 'talking-actor', 'lip-sync', 'actor-replacement'].includes(capability)) return 'kie';
    if (capability === 'translation' || capability === 'captions') return 'contentflow';
    return undefined;
  }

  private createContentFlowProvider(): CreativeProvider {
    const openaiService = this.openaiService;
    const videoManager = this.videoManager;
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVENSLABS_API_KEY;

    return {
      id: 'contentflow',
      capabilities: () => {
        const capabilities: CreativeCapability[] = [];
        if (process.env.OPENAI_API_KEY) capabilities.push('image-generation');
        if (process.env.KIEAI_API_KEY && process.env.CREATIVE_KIE_ENABLED !== 'false') capabilities.push('video-generation', 'b-roll');
        if (elevenLabsApiKey) capabilities.push('text-to-speech');
        capabilities.push('captions');
        if (process.env.OPENAI_API_KEY) capabilities.push('translation');
        if (process.env.CREATIVE_ALLOW_VIDEO_TALKING_ACTOR_FALLBACK === 'true') {
          capabilities.push('talking-actor');
        }
        return capabilities;
      },
      quote: (capability, input) => ({
        provider: 'contentflow',
        model: this.modelFor(capability),
        estimatedCredits: estimateCreativeCredits(capability, input),
        explanation: `Estimativa ContentFlow para ${capability}`,
      }),
      generate: async (capability, input) => {
        if (capability === 'image-generation') {
          const url = await openaiService.generateImage(
            input.prompt,
            true,
            input.aspectRatio === '9:16' || input.aspectRatio === '4:5',
          );
          return { provider: 'contentflow', model: process.env.CREATIVE_IMAGE_MODEL || process.env.AI_GENERATE_IMAGE_MODEL || 'dall-e-3', url: url || undefined };
        }

        if (capability === 'video-generation' || capability === 'b-roll') {
          const registered = videoManager.getAllVideos().find((item) => item.identifier === 'veo3');
          if (!registered) throw new ServiceUnavailableException('Veo3 is not configured');
          const video = videoManager.getVideoByName('veo3');
          const url = await video.instance.process(
            input.aspectRatio === '16:9' ? 'horizontal' : 'vertical',
            {
              prompt: input.prompt,
              images: (input.imageUrls || []).slice(0, 3).map((path) => ({ id: path, path })),
            },
          );
          return { provider: 'contentflow', model: 'veo3_fast', url };
        }

        if (capability === 'text-to-speech') {
          const voiceId = input.voice?.externalId || process.env.CREATIVE_DEFAULT_VOICE_ID;
          if (!voiceId) {
            throw new ServiceUnavailableException(
              'A voice external id or CREATIVE_DEFAULT_VOICE_ID is required for text-to-speech',
            );
          }
          const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'xi-api-key': elevenLabsApiKey || '',
              },
              body: JSON.stringify({
                text: input.script || input.prompt,
                model_id: process.env.CREATIVE_TTS_MODEL || 'eleven_multilingual_v2',
              }),
              signal: AbortSignal.timeout(Number(process.env.CREATIVE_PROVIDER_TIMEOUT_MS || 120000)),
            },
          );
          if (!response.ok) {
            throw new Error(`ElevenLabs TTS failed (${response.status}): ${(await response.text()).slice(0, 400)}`);
          }
          const buffer = Buffer.from(await response.arrayBuffer());
          const storage = UploadFactory.createStorage();
          const uploaded = await storage.uploadFile({
            buffer,
            mimetype: 'audio/mpeg',
            size: buffer.length,
            path: '',
            fieldname: 'creative-audio',
            destination: '',
            stream: Readable.from(buffer),
            filename: `creative-${Date.now()}.mp3`,
            originalname: `creative-${Date.now()}.mp3`,
            encoding: '7bit',
          });
          const audioUrl = String(uploaded.path || '');
          return {
            provider: 'contentflow',
            model: process.env.CREATIVE_TTS_MODEL || 'eleven_multilingual_v2',
            url: audioUrl.indexOf('http') === 0
              ? audioUrl
              : `${process.env.FRONTEND_URL || ''}/${process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY || ''}${audioUrl}`,
            audioUrl,
          };
        }

        if (capability === 'captions') {
          const text = (input.script || input.prompt || '').trim();
          if (!text) throw new ServiceUnavailableException('Script text is required to create captions');
          const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
          const srt = lines.map((line, index) => {
            const start = index * 4;
            const end = start + 4;
            const stamp = (seconds: number) => `00:${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')},000`;
            return `${index + 1}\n${stamp(start)} --> ${stamp(end)}\n${line}\n`;
          }).join('\n');
          const buffer = Buffer.from(srt, 'utf8');
          const storage = UploadFactory.createStorage();
          const uploaded = await storage.uploadFile({
            buffer,
            mimetype: 'application/x-subrip',
            size: buffer.length,
            path: '',
            fieldname: 'creative-captions',
            destination: '',
            stream: Readable.from(buffer),
            filename: `creative-${Date.now()}.srt`,
            originalname: `creative-${Date.now()}.srt`,
            encoding: '7bit',
          });
          const captionUrl = String(uploaded.path || '');
          return {
            provider: 'contentflow',
            model: 'deterministic-srt',
            url: captionUrl.indexOf('http') === 0
              ? captionUrl
              : `${process.env.FRONTEND_URL || ''}/${process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY || ''}${captionUrl}`,
            metadata: { language: input.language || 'pt-BR', format: 'srt', cueCount: lines.length },
          };
        }

        if (capability === 'translation') {
          const targetLanguage = String(input.metadata?.targetLanguage || input.language || 'en-US');
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
            body: JSON.stringify({
              model: process.env.CREATIVE_TRANSLATION_MODEL || 'gpt-4.1-mini',
              temperature: 0.2,
              messages: [
                { role: 'system', content: `Translate the supplied advertising script to ${targetLanguage}. Preserve meaning, CTA, timing cues, and line breaks. Return only the translated text.` },
                { role: 'user', content: input.script || input.prompt },
              ],
            }),
            signal: AbortSignal.timeout(Number(process.env.CREATIVE_PROVIDER_TIMEOUT_MS || 120000)),
          });
          if (!response.ok) throw new Error(`OpenAI translation failed (${response.status}): ${(await response.text()).slice(0, 400)}`);
          const result = await response.json() as any;
          const translatedText = result?.choices?.[0]?.message?.content?.trim();
          if (!translatedText) throw new Error('OpenAI translation returned empty text');
          return {
            provider: 'contentflow',
            model: process.env.CREATIVE_TRANSLATION_MODEL || 'gpt-4.1-mini',
            metadata: { translatedText, targetLanguage },
          };
        }

        if (capability === 'talking-actor' && process.env.CREATIVE_ALLOW_VIDEO_TALKING_ACTOR_FALLBACK === 'true') {
          const actorHint = input.actor?.imageUrl ? ` Keep the actor from this image: ${input.actor.imageUrl}.` : '';
          const url = await videoManager.getVideoByName('veo3').instance.process(
            input.aspectRatio === '16:9' ? 'horizontal' : 'vertical',
            { prompt: `${input.script || input.prompt}${actorHint}`, images: [] },
          );
          return {
            provider: 'contentflow',
            model: 'veo3_fallback',
            url,
            metadata: { fallback: true, warning: 'This is not a lip-sync talking actor provider.' },
          };
        }

        throw new ServiceUnavailableException(`Capability ${capability} is not configured`);
      },
    };
  }

  private createHttpProvider(
    id: 'talking-actor-http' | 'lip-sync-http' | 'actor-replacement-http' | 'image-http' | 'video-http' | 'b-roll-http' | 'tts-http' | 'translation-http',
    capability: 'talking-actor' | 'lip-sync' | 'actor-replacement' | 'image-generation' | 'video-generation' | 'b-roll' | 'text-to-speech' | 'translation',
    endpoint: string,
    token?: string,
    model?: string,
  ): CreativeProvider {
    return {
      id,
      capabilities: () => [capability],
      quote: (capability, input) => ({
        provider: id,
        model: model || 'default',
        estimatedCredits: estimateCreativeCredits(capability, input),
        explanation: `Provider externo de ${capability} configurado pelo operador`,
      }),
      generate: async (_capability, input) => {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token
              ? { Authorization: `Bearer ${token}` }
              : {}),
          },
          body: JSON.stringify(input),
          signal: AbortSignal.timeout(Number(process.env.CREATIVE_PROVIDER_TIMEOUT_MS || 120000)),
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(`${capability} provider failed (${response.status}): ${message.slice(0, 400)}`);
        }
        let result = (await response.json()) as CreativeProviderOutput & Record<string, any>;
        const immediateUrl = result.url || result.audioUrl || result.output?.url || result.output?.audioUrl;
        const immediateText = capability === 'translation' && (result.translatedText || result.output?.translatedText);
        if (!immediateUrl && !immediateText) {
          const rawStatusUrl = result.statusUrl || result.pollUrl || result.outputUrl || (result.id ? `${endpoint.replace(/\/$/, '')}/${encodeURIComponent(String(result.id))}` : undefined);
          if (!rawStatusUrl) throw new Error(`${capability} provider returned no output URL or polling handle`);
          const statusUrl = new URL(rawStatusUrl, endpoint);
          if (statusUrl.origin !== new URL(endpoint).origin) throw new Error(`${capability} provider returned an unsafe polling URL`);
          const attempts = Math.min(120, Math.max(1, Number(process.env.CREATIVE_PROVIDER_POLL_ATTEMPTS || 60)));
          const intervalMs = Math.min(10000, Math.max(250, Number(process.env.CREATIVE_PROVIDER_POLL_INTERVAL_MS || 1000)));
          for (let attempt = 0; attempt < attempts; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, intervalMs));
            const poll = await fetch(statusUrl, {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              signal: AbortSignal.timeout(Number(process.env.CREATIVE_PROVIDER_TIMEOUT_MS || 120000)),
            });
            if (!poll.ok) throw new Error(`${capability} provider polling failed (${poll.status})`);
            result = (await poll.json()) as CreativeProviderOutput & Record<string, any>;
            const state = String(result.status || result.state || result.output?.status || '').toLowerCase();
            const polledUrl = result.url || result.audioUrl || result.output?.url || result.output?.audioUrl;
            const polledText = capability === 'translation' && (result.translatedText || result.output?.translatedText);
            if (polledUrl || polledText || ['succeeded', 'completed', 'ready', 'success', 'done'].includes(state)) {
              if (!polledUrl && !polledText) throw new Error(`${capability} provider completed without an output`);
              break;
            }
            if (['failed', 'error', 'cancelled', 'canceled'].includes(state)) {
              throw new Error(`${capability} provider returned terminal state ${state}`);
            }
            if (attempt === attempts - 1) throw new Error(`${capability} provider polling timed out`);
          }
        }
        const pollingUrl = result.statusUrl || result.pollUrl || result.outputUrl || (result.id ? `${endpoint.replace(/\/$/, '')}/${encodeURIComponent(String(result.id))}` : undefined);
        return {
          provider: id,
          model: model || 'default',
          ...result,
          url: result.url || result.output?.url,
          audioUrl: result.audioUrl || result.output?.audioUrl,
          metadata: {
            ...(result.metadata || {}),
            ...(result.translatedText || result.output?.translatedText
              ? { translatedText: result.translatedText || result.output?.translatedText }
              : {}),
            ...(result.id ? { providerJobId: String(result.id) } : {}),
            ...(pollingUrl ? { statusUrl: pollingUrl } : {}),
          },
        };
      },
      cancel: async (_capability, input) => {
        const rawStatusUrl = String(input.metadata?.statusUrl || '');
        if (!rawStatusUrl) return;
        const statusUrl = new URL(rawStatusUrl, endpoint);
        if (statusUrl.origin !== new URL(endpoint).origin) throw new Error(`${capability} provider returned an unsafe cancellation URL`);
        const response = await fetch(statusUrl, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: AbortSignal.timeout(Number(process.env.CREATIVE_PROVIDER_TIMEOUT_MS || 120000)),
        });
        if (!response.ok && response.status !== 404) throw new Error(`${capability} provider cancellation failed (${response.status})`);
      },
    };
  }

  private modelFor(capability: CreativeCapability) {
    if (capability === 'image-generation') return process.env.CREATIVE_IMAGE_MODEL || process.env.AI_GENERATE_IMAGE_MODEL || 'dall-e-3';
    if (capability === 'video-generation' || capability === 'b-roll') return 'veo3_fast';
    if (capability === 'text-to-speech') return process.env.CREATIVE_TTS_MODEL || 'eleven_multilingual_v2';
    if (capability === 'captions') return 'deterministic-srt';
    if (capability === 'translation') return process.env.CREATIVE_TRANSLATION_MODEL || 'gpt-4.1-mini';
    if (capability === 'lip-sync') return process.env.CREATIVE_LIP_SYNC_MODEL || 'default';
    if (capability === 'actor-replacement') return process.env.CREATIVE_ACTOR_REPLACEMENT_MODEL || 'default';
    return 'contentflow-default';
  }
}
