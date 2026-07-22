import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { AiGenerateCarouselDto } from '@gitroom/nestjs-libraries/dtos/ai-generate/ai-generate-carousel.dto';
import { AiGenerateCarouselIdeasDto } from '@gitroom/nestjs-libraries/dtos/ai-generate/ai-generate-carousel-ideas.dto';
import { AiGenerateImageDto } from '@gitroom/nestjs-libraries/dtos/ai-generate/ai-generate-image.dto';
import { AiGenerateCaptionDto } from '@gitroom/nestjs-libraries/dtos/ai-generate/ai-generate-caption.dto';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { ExtractContentService } from '@gitroom/nestjs-libraries/openai/extract.content.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import {
  validateAiResponse,
  buildAiMetadata,
} from './ai-response-validator';
import { GenerationJobService } from '@gitroom/nestjs-libraries/database/prisma/generation-jobs/generation-job.service';
import { GenerationCostService } from '@gitroom/nestjs-libraries/database/prisma/generation-costs/generation-cost.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { PromptInjectionGuard } from './prompt-injection-guard';

type AiGenerateImage = {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
  mediaId?: string;
};

type AiGenerateResponse = {
  created: number;
  data?: AiGenerateImage[];
  images?: AiGenerateImage[];
  usage?: Record<string, unknown>;
};

type ImageProvider = 'ia_generate' | 'openai_official';

type AiGenerateCostLedgerEntry = {
  id: string;
  orgId: string;
  type: 'text' | 'image' | 'estimate';
  label: string;
  createdAt: string;
  cost: CostEstimate;
};

type CarouselSlide = {
  index: number;
  headline: string;
  body: string;
  cta: string;
  imagePrompt: string;
  altText: string;
};

type CarouselPlan = {
  title: string;
  platform: string;
  language: string;
  caption: string;
  hashtags: string[];
  imageStyleGuide: string;
  slides: CarouselSlide[];
};

// Cache do brief visual das inspirações: evita re-descrever as mesmas imagens
// a cada slide do mesmo carrossel (economiza chamadas do modelo de visão).
const referenceBriefCache = new Map<
  string,
  { promise: Promise<{ model: string; text: string }>; expires: number }
>();

function estimateSyntheticCost(tokens: NormalizedUsage): CostEstimate {
  return estimateCostInUsdAndBrl({
    text_input_tokens: tokens.textInputTokens,
    text_input_cached_tokens: tokens.textInputCachedTokens,
    image_input_tokens: tokens.imageInputTokens,
    image_input_cached_tokens: tokens.imageInputCachedTokens,
    image_output_tokens: tokens.imageOutputTokens,
  })!;
}

type NormalizedUsage = {
  textInputTokens: number;
  textInputCachedTokens: number;
  imageInputTokens: number;
  imageInputCachedTokens: number;
  imageOutputTokens: number;
  totalTokens: number;
};

type CostEstimate = {
  usd: number;
  brl: number;
  usdToBrl: number;
  ratesUsdPer1M: {
    textInput: number;
    textInputCached: number;
    imageInput: number;
    imageInputCached: number;
    imageOutput: number;
  };
  tokens: NormalizedUsage;
};

function readEnvNumber(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function usageNumber(
  usage: Record<string, unknown> | undefined,
  keys: string[]
) {
  if (!usage) {
    return 0;
  }

  for (const key of keys) {
    const value = usage[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return Math.ceil(value);
    }
  }

  return 0;
}

function normalizeUsage(
  usage: Record<string, unknown> | undefined
): NormalizedUsage {
  let textInputTokens = usageNumber(usage, [
    'text_input_tokens',
    'input_text_tokens',
    'prompt_tokens',
  ]);
  const textInputCachedTokens = usageNumber(usage, [
    'text_input_cached_tokens',
    'cached_text_input_tokens',
  ]);
  let imageInputTokens = usageNumber(usage, [
    'image_input_tokens',
    'input_image_tokens',
  ]);
  const imageInputCachedTokens = usageNumber(usage, [
    'image_input_cached_tokens',
    'cached_image_input_tokens',
  ]);
  const imageOutputTokens = usageNumber(usage, [
    'image_output_tokens',
    'output_image_tokens',
    'output_tokens',
    'completion_tokens',
  ]);

  const genericInputTokens = usageNumber(usage, ['input_tokens']);
  if (!textInputTokens && !imageInputTokens && genericInputTokens) {
    textInputTokens = genericInputTokens;
  }

  const totalTokensFromUsage = usageNumber(usage, ['total_tokens']);
  const totalTokens = totalTokensFromUsage
    ? totalTokensFromUsage
    : textInputTokens +
      textInputCachedTokens +
      imageInputTokens +
      imageInputCachedTokens +
      imageOutputTokens;

  if (!imageInputTokens && totalTokens > 0 && textInputTokens > totalTokens) {
    imageInputTokens = 0;
  }

  return {
    textInputTokens,
    textInputCachedTokens,
    imageInputTokens,
    imageInputCachedTokens,
    imageOutputTokens,
    totalTokens,
  };
}

function estimateCostInUsdAndBrl(
  usage: Record<string, unknown> | undefined
): CostEstimate | null {
  if (!usage) {
    return null;
  }

  const tokens = normalizeUsage(usage);
  if (tokens.totalTokens <= 0) {
    return null;
  }

  const ratesUsdPer1M = {
    textInput: readEnvNumber('AI_GENERATE_PRICE_TEXT_INPUT_USD_PER_1M', 5),
    textInputCached: readEnvNumber(
      'AI_GENERATE_PRICE_TEXT_INPUT_CACHED_USD_PER_1M',
      1.25
    ),
    imageInput: readEnvNumber('AI_GENERATE_PRICE_IMAGE_INPUT_USD_PER_1M', 8),
    imageInputCached: readEnvNumber(
      'AI_GENERATE_PRICE_IMAGE_INPUT_CACHED_USD_PER_1M',
      2
    ),
    imageOutput: readEnvNumber('AI_GENERATE_PRICE_IMAGE_OUTPUT_USD_PER_1M', 30),
  };
  const usdToBrl = readEnvNumber('AI_GENERATE_USD_TO_BRL', 5.5);

  const usd =
    (tokens.textInputTokens / 1_000_000) * ratesUsdPer1M.textInput +
    (tokens.textInputCachedTokens / 1_000_000) * ratesUsdPer1M.textInputCached +
    (tokens.imageInputTokens / 1_000_000) * ratesUsdPer1M.imageInput +
    (tokens.imageInputCachedTokens / 1_000_000) *
      ratesUsdPer1M.imageInputCached +
    (tokens.imageOutputTokens / 1_000_000) * ratesUsdPer1M.imageOutput;
  const brl = usd * usdToBrl;

  return {
    usd: Number(usd.toFixed(6)),
    brl: Number(brl.toFixed(6)),
    usdToBrl,
    ratesUsdPer1M,
    tokens,
  };
}

function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function firstString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function parseJsonPayload(content: string) {
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch (error) {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(content.slice(start, end + 1)) as Record<
        string,
        unknown
      >;
    }

    throw error;
  }
}

function dataUrlToBlob(value: string) {
  const match = value.match(
    /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/
  );
  if (!match) {
    return null;
  }

  const mimeType = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
  const bytes = Buffer.from(match[2], 'base64');
  return new Blob([bytes], { type: mimeType });
}

function dataUrlMimeType(value: string) {
  return value.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,/i)?.[1] || '';
}

function extractResponseText(data: Record<string, unknown>) {
  if (typeof data.output_text === 'string') {
    return data.output_text.trim();
  }

  const output = Array.isArray(data.output) ? data.output : [];
  const chunks: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as unknown[])
      : [];

    for (const part of content) {
      if (!part || typeof part !== 'object') {
        continue;
      }

      const text = (part as Record<string, unknown>).text;
      if (typeof text === 'string') {
        chunks.push(text);
      }
    }
  }

  return chunks.join('\n').trim();
}

function normalizeCarouselPlan(
  payload: Record<string, unknown>,
  body: AiGenerateCarouselDto,
  slideCount: number
): CarouselPlan {
  const rawSlides = Array.isArray(payload.slides) ? payload.slides : [];
  const slides = rawSlides
    .slice(0, slideCount)
    .map((slide, index) => {
      const item =
        slide && typeof slide === 'object'
          ? (slide as Record<string, unknown>)
          : {};

      return {
        index: index + 1,
        headline: firstString(item.headline, `Slide ${index + 1}`),
        body: firstString(item.body),
        cta: firstString(item.cta),
        imagePrompt: firstString(item.imagePrompt || item.image_prompt),
        altText: firstString(item.altText || item.alt_text),
      };
    })
    .filter((slide) => slide.headline || slide.body || slide.imagePrompt);

  while (slides.length < slideCount) {
    const index = slides.length + 1;
    slides.push({
      index,
      headline:
        index === 1 ? firstString(body.topic, 'Abertura') : `Ideia ${index}`,
      body: '',
      cta: index === slideCount ? 'Salve este post para consultar depois.' : '',
      imagePrompt: `${body.topic}. ${
        body.visualStyle || 'Visual moderno para carrossel de rede social.'
      }`,
      altText: firstString(body.topic, 'Imagem do carrossel'),
    });
  }

  return {
    title: firstString(payload.title, body.topic),
    platform: firstString(payload.platform, body.platform || 'instagram'),
    language: firstString(payload.language, body.language || 'pt-BR'),
    caption: firstString(payload.caption),
    hashtags: Array.isArray(payload.hashtags)
      ? payload.hashtags
          .map((tag) => firstString(tag))
          .filter(Boolean)
          .slice(0, 20)
      : [],
    imageStyleGuide: firstString(
      payload.imageStyleGuide || payload.image_style_guide
    ),
    slides,
  };
}

@Injectable()
export class AiGenerateService {
  private readonly logger = new Logger(AiGenerateService.name);
  private storage = UploadFactory.createStorage();

  constructor(
    private _mediaService: MediaService,
    private _extractContentService: ExtractContentService,
    private _generationJobService: GenerationJobService,
    private _generationCostService: GenerationCostService,
    private _circuitBreaker: CircuitBreakerService
  ) {}

  private recordCost(
    orgId: string,
    type: 'text' | 'image' | 'estimate',
    label: string,
    cost: CostEstimate | null | undefined
  ) {
    if (!cost) {
      return;
    }

    // Fire-and-forget: persist to DB without blocking the caller
    void this._generationCostService.recordCost({
      organizationId: orgId,
      type,
      label,
      costUsd: cost.usd,
      costBrl: cost.brl,
      usdToBrl: cost.usdToBrl,
      tokens: cost.tokens as unknown as Record<string, number>,
    }).catch((err) => {
      this.logger.warn(`Failed to persist cost record: ${err?.message || err}`);
    });
  }

  async getCostHistory(orgId: string) {
    const result = await this._generationCostService.getCostHistory(orgId);
    return {
      ...result,
      softLimitBrl: readEnvNumber('AI_GENERATE_WORKSPACE_SOFT_LIMIT_BRL', 50),
      hardLimitBrl: readEnvNumber('AI_GENERATE_WORKSPACE_HARD_LIMIT_BRL', 100),
    };
  }

  estimateCarouselCosts(
    orgId: string,
    body: { slideCount?: number; referenceCount?: number; promptChars?: number }
  ) {
    const slideCount = clampNumber(body.slideCount, 5, 1, 20);
    const referenceCount = clampNumber(body.referenceCount, 0, 0, 3);
    const promptChars = clampNumber(body.promptChars, 1200, 100, 32000);
    const textTokens = Math.ceil(promptChars / 4) + slideCount * 180;
    const imageInputTokens = slideCount * (referenceCount ? 600 + referenceCount * 450 : 180);
    const imageOutputTokens =
      slideCount *
      readEnvNumber('AI_GENERATE_ESTIMATED_IMAGE_OUTPUT_TOKENS', 2200);
    const cost = estimateSyntheticCost({
      textInputTokens: textTokens,
      textInputCachedTokens: 0,
      imageInputTokens,
      imageInputCachedTokens: 0,
      imageOutputTokens,
      totalTokens: textTokens + imageInputTokens + imageOutputTokens,
    });

    return {
      slideCount,
      referenceCount,
      cost_estimate: cost,
      assumptions: {
        textTokens,
        imageInputTokens,
        imageOutputTokens,
      },
    };
  }

  async generateCarouselIdeas(orgId: string, body: AiGenerateCarouselIdeasDto) {
    const openAiApiKey =
      process.env.AI_GENERATE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const openAiBaseUrl =
      process.env.AI_GENERATE_OPENAI_BASE_URL?.replace(/\/$/, '') ||
      'https://api.openai.com';

    if (!openAiApiKey) {
      throw new HttpException(
        'OpenAI official API is not configured',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    const resolvedModel =
      body.textModel?.trim() ||
      process.env.AI_GENERATE_OPENAI_TEXT_MODEL ||
      'gpt-4.1-mini';
    const timeoutMs = Number(process.env.AI_GENERATE_TIMEOUT_MS || 120000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const existingTitles = Array.isArray(body.existingTitles)
      ? Array.from(
          new Set(
            body.existingTitles
              .map((title) => firstString(title))
              .filter(Boolean)
          )
        ).slice(0, 120)
      : [];
    const avoidanceInstruction = existingTitles.length
      ? `\n\nIMPORTANTE: as ideias abaixo JA foram geradas anteriormente. NAO repita nenhuma delas e NAO crie variacoes muito parecidas. Gere apenas ideias ineditas, com angulos e temas diferentes destes:\n- ${existingTitles.join(
          '\n- '
        )}`
      : '';

    try {
      const response = await fetch(`${openAiBaseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: resolvedModel,
          temperature: 0.9,
          response_format: { type: 'json_object' },
          user: orgId,
          messages: [
            {
              role: 'system',
              content:
                'Voce e estrategista de conteudo para redes sociais. Gere ideias de carrossel acionaveis, sem promessas exageradas. Responda apenas JSON valido.',
            },
            {
              role: 'user',
              content: `Com base no contexto abaixo, gere ideias de posts em portugues do Brasil para carrossel.\n\nContexto da empresa:\n${
                body.companyContext || 'Sem contexto detalhado'
              }\n\nHint opcional de tema: ${
                body.topicHint || 'Sem hint'
              }${avoidanceInstruction}\n\nRetorne EXATAMENTE:\n{\n  "ideas": [\n    {\n      "title": "tema curto do carrossel",\n      "hook": "frase gancho para abrir o post",\n      "goal": "objetivo do post (educar, autoridade, conversao, etc)",\n      "angle": "angulo editorial em 1 frase"\n    }\n  ]\n}\n\nGere entre 8 e 12 ideias, com variedade de formatos e hooks. Use estes tipos de gancho (1-2 de cada):
- question: pergunta que provoca curiosidade ("E se {topic} fosse mais simples?")
- bold_claim: afirmação ousada que quebra expectativa ("Seu {topic} esta custando clientes.")
- listicle: lista numerada que promete valor rapido ("5 erros de {topic} que voce comete")
- curiosity: mistério que obriga a swipar ("Ninguem te conta isso sobre {topic}")
- contrarian: opinião contra o mainstream ("Pare de postar todo dia. Foque em {topic}")
- transformation: antes/depois que mostra resultado ("De zero a 20k mudando {topic}")
- mistake: erro comum que o leitor comete ("O erro #1 que faz seu {topic} falhar")
- cta: chamada para ação direta ("Salve isso pro seu proximo {topic}")

Escolha o hook mais forte para cada ideia. O titulo deve ser curto (max 8 palavras), concreto, sem hashtags.`,
            },
          ],
        }),
        signal: controller.signal,
      });

      const data = (await response.json().catch(() => ({}))) as {
        choices?: Array<{ message?: { content?: string } }>;
        message?: string;
        error?: { message?: string } | string;
      };

      if (!response.ok) {
        const errorMessage =
          data.message ||
          (typeof data.error === 'string' ? data.error : data.error?.message) ||
          'Carousel ideas generation failed';
        const status =
          response.status < 500 ? response.status : HttpStatus.BAD_GATEWAY;
        throw new HttpException(errorMessage, status);
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new HttpException(
          'OpenAI did not return ideas content',
          HttpStatus.BAD_GATEWAY
        );
      }

      // Validate with Zod schema
      const validation = validateAiResponse<{ ideas: Array<{
        title: string;
        hook: string;
        goal: string;
        angle: string;
      }> }>('carousel-idea', content, 1);

      if (!validation.success) {
        Logger.warn(
          `Carousel ideas validation failed: ${validation.errors?.issues?.length || 0} issues`,
          'AiGenerateService'
        );
      }

      const parsed = validation.success && validation.data
        ? validation.data
        : parseJsonPayload(content);
      const ideasRaw = Array.isArray(parsed.ideas) ? parsed.ideas : [];
      const normalizeTitle = (title: string) =>
        title
          .toLowerCase()
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .replace(/[^a-z0-9]+/g, ' ')
          .trim();
      const seenTitles = new Set(existingTitles.map(normalizeTitle));
      const ideas = ideasRaw
        .map((item) => {
          const record =
            item && typeof item === 'object'
              ? (item as Record<string, unknown>)
              : {};

          return {
            title: firstString(record.title),
            hook: firstString(record.hook),
            goal: firstString(record.goal),
            angle: firstString(record.angle),
          };
        })
        .filter((idea) => {
          if (!idea.title) {
            return false;
          }

          const normalized = normalizeTitle(idea.title);
          if (!normalized || seenTitles.has(normalized)) {
            return false;
          }

          seenTitles.add(normalized);
          return true;
        })
        .slice(0, 12);

      return {
        ideas,
        provider: 'openai_official',
        model: resolvedModel,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpException(
          'OpenAI carousel ideas request timed out',
          HttpStatus.GATEWAY_TIMEOUT
        );
      }

      throw new HttpException(
        'Unable to generate carousel ideas',
        HttpStatus.BAD_GATEWAY
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  // Gera a legenda do post + hashtags adaptadas à rede escolhida, a partir do
  // conteúdo do carrossel já criado.
  async generateCarouselCaption(orgId: string, body: AiGenerateCaptionDto) {
    const openAiApiKey =
      process.env.AI_GENERATE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const openAiBaseUrl =
      process.env.AI_GENERATE_OPENAI_BASE_URL?.replace(/\/$/, '') ||
      'https://api.openai.com';

    if (!openAiApiKey) {
      throw new HttpException(
        'OpenAI official API is not configured',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    const platform = (body.platform || 'instagram').toLowerCase();
    const resolvedModel =
      body.textModel?.trim() ||
      process.env.AI_GENERATE_OPENAI_TEXT_MODEL ||
      'gpt-4.1-mini';
    const timeoutMs = Number(process.env.AI_GENERATE_TIMEOUT_MS || 120000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const slidesText = Array.isArray(body.slides)
      ? body.slides
          .map((slide, index) =>
            `Slide ${index + 1}: ${firstString(slide?.headline)}${
              slide?.body ? ` — ${firstString(slide.body)}` : ''
            }`
          )
          .filter(Boolean)
          .join('\n')
          .slice(0, 6000)
      : '';

    const platformGuides: Record<string, string> = {
      instagram:
        'Instagram: tom leve e proximo, gancho forte na primeira linha, quebras de linha curtas, emojis com moderacao, CTA convidando a salvar/comentar. 5 a 12 hashtags relevantes.',
      linkedin:
        'LinkedIn: tom profissional e de autoridade, gancho na primeira linha, paragrafos curtos, poucos ou nenhum emoji, foco em insight/valor. No maximo 3 a 5 hashtags.',
      tiktok:
        'TikTok: tom direto, jovem e dinamico, frase curta de impacto, 1 ou 2 emojis, CTA rapido. 3 a 6 hashtags em tendencia/relevantes.',
    };
    const platformGuide = platformGuides[platform] || platformGuides.instagram;

    try {
      const response = await fetch(`${openAiBaseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: resolvedModel,
          temperature: 0.8,
          response_format: { type: 'json_object' },
          user: orgId,
          messages: [
            {
              role: 'system',
              content:
                'Voce e copywriter senior de redes sociais. Escreva a legenda (texto que vai FORA da imagem) e hashtags para acompanhar um carrossel. Responda apenas JSON valido.',
            },
            {
              role: 'user',
              content: `Escreva a legenda e as hashtags para acompanhar este carrossel na rede indicada.\n\nRede: ${platform}\nDiretrizes da rede: ${platformGuide}\nTom de voz: ${
                body.tone || 'claro, prático e persuasivo'
              }\nIdioma: ${body.language || 'pt-BR'}\n${
                body.defaultCta ? `CTA preferido: ${body.defaultCta}\n` : ''
              }${
                body.forbiddenTerms
                  ? `Evite estes termos/claims: ${body.forbiddenTerms}\n`
                  : ''
              }${
                body.companyContext
                  ? `Contexto da empresa:\n${body.companyContext.slice(0, 2000)}\n`
                  : ''
              }\nTitulo do carrossel: ${firstString(body.title)}\nConteudo dos slides:\n${
                slidesText || '(sem detalhe de slides)'
              }\n\nRetorne EXATAMENTE:\n{\n  "caption": "legenda pronta para publicar, com quebras de linha quando fizer sentido",\n  "hashtags": ["#exemplo"]\n}`,
            },
          ],
        }),
        signal: controller.signal,
      });

      const data = (await response.json().catch(() => ({}))) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: Record<string, unknown>;
        message?: string;
        error?: { message?: string } | string;
      };

      if (!response.ok) {
        const errorMessage =
          data.message ||
          (typeof data.error === 'string' ? data.error : data.error?.message) ||
          'Caption generation failed';
        const status =
          response.status < 500 ? response.status : HttpStatus.BAD_GATEWAY;
        throw new HttpException(errorMessage, status);
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new HttpException(
          'OpenAI did not return caption content',
          HttpStatus.BAD_GATEWAY
        );
      }

      // Validate with Zod schema
      const validation = validateAiResponse<{
        caption: string;
        hashtags: string[];
      }>('caption-package', content, 1);

      if (!validation.success) {
        Logger.warn(
          `Caption validation failed: ${validation.errors?.issues?.length || 0} issues`,
          'AiGenerateService'
        );
        // Fallback: use raw parsed data
        const parsed = parseJsonPayload(content);
        const caption = firstString(parsed.caption);
        const hashtags = Array.isArray(parsed.hashtags)
          ? parsed.hashtags
              .map((tag: unknown) => firstString(tag))
              .filter(Boolean)
              .map((tag: string) => (tag.startsWith('#') ? tag : `#${tag}`))
              .slice(0, 15)
          : [];

        const result = {
          caption,
          hashtags,
          platform,
          provider: 'openai_official',
          model: resolvedModel,
          usage: data.usage,
          cost_estimate: estimateCostInUsdAndBrl(data.usage),
          ...buildAiMetadata('caption-package', resolvedModel, 'openai_official'),
        };
        this.recordCost(
          orgId,
          'text',
          `Legenda ${platform}: ${(body.title || 'carrossel').slice(0, 60)}`,
          result.cost_estimate
        );
        return result;
      }

      const validated = validation.data!;
      const caption = firstString(validated.caption);
      const hashtags = Array.isArray(validated.hashtags)
        ? validated.hashtags
            .map((tag: string) => (tag.startsWith('#') ? tag : `#${tag}`))
            .slice(0, 15)
        : [];

      const result = {
        caption,
        hashtags,
        platform,
        provider: 'openai_official',
        model: resolvedModel,
        usage: data.usage,
        cost_estimate: estimateCostInUsdAndBrl(data.usage),
        ...buildAiMetadata('caption-package', resolvedModel, 'openai_official'),
      };
      this.recordCost(
        orgId,
        'text',
        `Legenda ${platform}: ${(body.title || 'carrossel').slice(0, 60)}`,
        result.cost_estimate
      );
      return result;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpException(
          'OpenAI caption request timed out',
          HttpStatus.GATEWAY_TIMEOUT
        );
      }
      throw new HttpException(
        'Unable to generate caption',
        HttpStatus.BAD_GATEWAY
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateCarouselPlan(orgId: string, body: AiGenerateCarouselDto) {
    const topic = body.topic?.trim();
    const sourceUrl = body.sourceUrl?.trim();
    const sourceTextInput = body.sourceText?.trim();

    // Repurpose: se veio um link, extraímos o conteúdo da página.
    let sourceContent = sourceTextInput || '';
    if (sourceUrl) {
      try {
        const normalizedUrl = /^https?:\/\//i.test(sourceUrl)
          ? sourceUrl
          : `https://${sourceUrl}`;
        const extracted = await this._extractContentService.extractContent(
          normalizedUrl
        );
        const cleaned = (extracted || '').trim();
        if (cleaned) {
          sourceContent = [sourceContent, cleaned].filter(Boolean).join('\n\n');
        }
      } catch {
        // Se falhar a extração, seguimos com o texto colado (se houver).
      }
    }
    sourceContent = sourceContent.slice(0, 12000);

    // Prompt injection protection — sanitize external content
    const { sanitized: safeContent, suspiciousPatterns } =
      PromptInjectionGuard.sanitize(sourceContent);
    if (suspiciousPatterns.length > 0) {
      this.logger.warn(
        `Prompt injection patterns detected in source content: ${suspiciousPatterns.join(', ')}`
      );
    }
    sourceContent = safeContent;

    if (!topic && !sourceContent) {
      throw new HttpException(
        'Informe um tema ou um link/texto de origem.',
        HttpStatus.BAD_REQUEST
      );
    }

    // Resolve template enrichment when a templateId is provided.
    // The template's instruction and narrative promptInstruction are injected
    // into the system prompt to steer the model toward the chosen structure.
    let templateEnrichment = '';
    if (body.templateId) {
      try {
        // Lazy import to avoid circular dependency issues at module level
        const { templateRegistry } = await import(
          '@gitroom/nestjs-libraries/ai-generate/templates/template-registry'
        );
        const template = templateRegistry.get(body.templateId);
        if (template) {
          templateEnrichment =
            `\n\nTEMPLATE ESCOLHIDO: "${template.label}" (${template.id})` +
            `\nInstrucao do template: ${template.instruction}` +
            `\nNarrativa: ${template.narrative.promptInstruction}` +
            `\nTom recomendado: ${template.tone}` +
            `\nDensidade de texto: ${template.textDensity}` +
            `\nDirecao visual padrao: editorial=${template.defaultDirection.editorial}, hierarquia=${template.defaultDirection.hierarchy}, densidade=${template.defaultDirection.density}` +
            `\nCTA recomendado: ${template.recommendedCta}`;
        }
      } catch {
        // If the registry import fails, proceed without template enrichment.
      }
    }

    const openAiApiKey =
      process.env.AI_GENERATE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const openAiBaseUrl =
      process.env.AI_GENERATE_OPENAI_BASE_URL?.replace(/\/$/, '') ||
      'https://api.openai.com';

    if (!openAiApiKey) {
      throw new HttpException(
        'OpenAI official API is not configured',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    const slideCount = clampNumber(body.slideCount, 5, 2, 10);
    const resolvedModel =
      body.textModel?.trim() ||
      process.env.AI_GENERATE_OPENAI_TEXT_MODEL ||
      'gpt-4.1-mini';
    const timeoutMs = Number(process.env.AI_GENERATE_TIMEOUT_MS || 120000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const brief = {
      topic: topic || (sourceContent ? '(derivar do conteúdo de origem)' : ''),
      goal: body.goal || 'educar e gerar engajamento',
      audience: body.audience || 'pessoas interessadas no tema',
      tone: body.tone || 'claro, prático e persuasivo',
      platform: body.platform || 'instagram',
      slideCount,
      visualStyle:
        body.visualStyle ||
        'arte editorial premium para carrossel, tipografia forte, texto grande e legivel dentro da imagem',
      brandNotes: body.brandNotes || '',
      language: body.language || 'pt-BR',
    };

    try {
      const response = await fetch(`${openAiBaseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: resolvedModel,
          temperature: 0.7,
          response_format: { type: 'json_object' },
          user: orgId,
          messages: [
            {
              role: 'system',
              content:
                'Voce e um diretor de arte e copywriter senior para carrosseis de redes sociais. Gere copy curta para ser renderizada dentro das imagens, alem de prompts visuais com layout editorial premium. Responda somente JSON valido, sem markdown.\n\nREGRAS DE DESIGN PREMIUM:\n- Tipografia: display fonts bold + peso 800-900, tracking -0.02em a -0.04em, line-height 0.95-1.05. Nunca usar Arial/Inter/Roboto como fonte de destaque.\n- Cor: paleta base (60%), neutra (30%), um acento travado (10%). Sem gradiente roxo/azul genérico em fundo branco.\n- Profundidade: todo slide precisa de pelo menos 1 elemento de profundidade (gradiente sutil, textura grain, sombra tintada, shapes sobrepostos). Nunca fundo flat cor única.\n- Contraste: texto deve ter minimo 4.5:1 contra o fundo. Texto claro em fundo claro = proibido.\n- Layout: padding generoso (6-8% da largura), hierarquia visual clara, um ponto focal dominante por slide.\n- Icones: SVG inline (Lucide/Phosphor), nunca emoji como estrutura.\n- Anti-AI-tell: evitar glow roxo/azul em branco, cards idênticos em grid, tudo centralizado, espaçamento mecânico uniforme.',
            },
            {
              role: 'user',
              content: `Crie um plano completo de carrossel com exatamente ${slideCount} slides.\n\nBriefing:\n${JSON.stringify(
                brief,
                null,
                2
              )}${
                sourceContent
                  ? `\n\nCONTEUDO DE ORIGEM (transforme ISTO em carrossel; extraia os pontos principais, resuma e adapte para slides curtos e impactantes; se nao houver tema definido, crie um titulo forte a partir deste conteudo):\n"""\n${sourceContent}\n"""`
                  : ''
              }${templateEnrichment}\n\nESTRUTURA DO CARROSSEL (papeis dos slides):\n- Slide 1 (CAPA): Obrigatório. Gancho forte que obriga a swipar. Headline grande e ousada, visual chamativo. Use um tipo de hook: question, bold_claim, curiosity, mistake, ou contrarian.\n- Slides 2 a N-1 (CONTEÚDO): Um insight por slide. Grid disciplinado, consistente. Cada slide = 1 ideia clara.\n- Último slide (CTA): Chamada para ação clara (salvar, comentar, seguir, link na bio). Incluir engajamento: "Salve para depois", "Comente X", ou "Siga para mais".\n\nMÓDULOS VISUAIS (use no imagePrompt para enriquecer o layout):\n- Pill/chip: containers arredondados para badges, handles, datas, categorias\n- Stat chip: card com ícone + label + número/gráfico (para dados e estatísticas)\n- Dual-panel: comparação lado a lado com divisor "VS" ou seta\n- Before/After: barra de transformação visual\n- Payoff bar: frase de efeito na parte inferior do slide\n- Number hero: um número gigante (70-80% do canvas) como elemento focal\n\nFormato obrigatorio do JSON:\n{\n  "title": "titulo do post",\n  "platform": "instagram",\n  "language": "pt-BR",\n  "caption": "legenda curta para acompanhar o post fora da imagem",\n  "hashtags": ["#tag"],\n  "imageStyleGuide": "CONCEITO CRIATIVO da campanha: nomeie uma ideia visual central especifica deste tema (metafora visual ou dispositivo grafico assinatura que se repete e evolui pelos slides — ex: 'linha vermelha que conecta os slides', 'numeros gigantes recortados', 'sombra dura diagonal'), + paleta com papeis definidos (fundo 60%, neutro 30%, UM acento 10%), voz tipografica display (peso 800-900, tracking negativo) e dispositivo de profundidade (grain, gradiente tonal sutil ou shapes sobrepostos). O conceito deve ser especifico e memoravel, nunca generico",\n  "slides": [\n    {\n      "index": 1,\n      "headline": "frase principal curta que deve aparecer GRANDE dentro da imagem (max 8 palavras)",\n      "body": "texto de apoio curto que tambem deve aparecer dentro da imagem",\n      "cta": "micro chamada visual opcional para aparecer no slide",\n      "imagePrompt": "CENA UNICA deste slide, obrigatoriamente diferente de todos os outros slides: derive do conceito criativo um objeto focal proprio, um enquadramento proprio e um modulo visual proprio (pill, stat-chip, dual-panel, number-hero, recorte extremo sangrando a borda, numeral gigante); descreva o fundo com profundidade (gradiente tonal, textura, shapes), onde fica a zona de respiro para a tipografia e como o contraste fica garantido. PROIBIDO repetir o mesmo fundo, mesma composicao ou mesmo dispositivo visual de outro slide da lista",\n      "altText": "descricao acessivel da imagem"\n    }\n  ]\n}\n\nREGRAS DE COPY VISUAL:\n- Headline: max 78 caracteres, aparece GRANDE na imagem (peso 800-900)\n- Body: abaixo de 140 caracteres, texto de apoio\n- Texto dentro da imagem deve ser legível no celular (fundo escuro = texto claro, e vice-versa)\n- Uma ideia por slide. Sem claims absolutos ("o melhor", "nunca", "100%")\n- Sem inventar dados ou estatísticas fictícias\n- Use linguagem natural em portugues do Brasil\n- Tipografia curva (aspas reais ""), travessões para pausa, sem excesso de emojis\n\nO imagePrompt deve preparar uma imagem com texto renderizado com legibilidade. Evite promessas exageradas, nao invente logos; se nao houver marca, use um pequeno selo textual com o tema ou categoria.`,
            },
          ],
        }),
        signal: controller.signal,
      });

      const data = (await response.json().catch(() => ({}))) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: Record<string, unknown>;
        message?: string;
        error?: { message?: string } | string;
      };

      if (!response.ok) {
        const errorMessage =
          data.message ||
          (typeof data.error === 'string' ? data.error : data.error?.message) ||
          'Carousel generation failed';
        const status =
          response.status < 500 ? response.status : HttpStatus.BAD_GATEWAY;
        throw new HttpException(errorMessage, status);
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new HttpException(
          'OpenAI did not return carousel content',
          HttpStatus.BAD_GATEWAY
        );
      }

      // Validate with Zod schema
      const validation = validateAiResponse<CarouselPlan>('carousel-plan', content, 1);

      if (!validation.success) {
        Logger.warn(
          `Carousel plan validation failed: ${validation.errors?.issues?.length || 0} issues`,
          'AiGenerateService'
        );
      }

      const validatedPlan = validation.success && validation.data
        ? validation.data as unknown as Record<string, unknown>
        : parseJsonPayload(content);

      const plan = normalizeCarouselPlan(
        validatedPlan,
        body,
        slideCount
      );

      const result = {
        ...plan,
        provider: 'openai_official',
        model: resolvedModel,
        usage: data.usage,
        cost_estimate: estimateCostInUsdAndBrl(data.usage),
        ...buildAiMetadata('carousel-plan', resolvedModel, 'openai_official'),
      };
      this.recordCost(orgId, 'text', `Copy: ${(topic || plan.title || 'conteúdo').slice(0, 80)}`, result.cost_estimate);
      return result;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpException(
          'OpenAI carousel request timed out',
          HttpStatus.GATEWAY_TIMEOUT
        );
      }

      throw new HttpException(
        'Unable to generate carousel plan',
        HttpStatus.BAD_GATEWAY
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async reviewCarousel(orgId: string, body: AiGenerateCarouselDto) {
    const openAiApiKey =
      process.env.AI_GENERATE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const openAiBaseUrl =
      process.env.AI_GENERATE_OPENAI_BASE_URL?.replace(/\/$/, '') ||
      'https://api.openai.com';

    if (!openAiApiKey) {
      throw new HttpException(
        'OpenAI official API is not configured',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    const resolvedModel =
      body.textModel?.trim() ||
      process.env.AI_GENERATE_OPENAI_TEXT_MODEL ||
      'gpt-4.1-mini';
    const payload = body.reviewPayload || JSON.stringify(body);

    // --- Extract template checks and forbidden terms from reviewPayload ---
    let parsedPayload: Record<string, unknown> = {};
    try { parsedPayload = JSON.parse(payload); } catch { /* ignore */ }

    const editorialChecks = (parsedPayload.editorialChecks || []) as Array<{
      id: string; description?: string; severity?: string; message?: string; pattern?: string;
    }>;
    const forbiddenTerms = (parsedPayload.forbiddenTerms || '') as string;
    const templateId = (parsedPayload.templateId || body.templateId || '') as string;

    // Build template checks section for the prompt
    const templateChecksSection = editorialChecks.length > 0
      ? `\n\nREGRAS EDITORIAIS DO TEMPLATE "${templateId}":\n` +
        editorialChecks.map((check) =>
          `- [${check.severity || 'warning'}] ${check.description || check.id}: ${check.message || ''}${
            check.pattern ? ` (padrão regex: ${check.pattern})` : ''
          }`
        ).join('\n')
      : '';

    // Build forbidden terms section for the prompt
    const forbiddenSection = forbiddenTerms
      ? `\n\nTERMOS PROIBIDOS PELA MARCA (devem ser denunciados se encontrados no conteúdo):\n${forbiddenTerms}`
      : '';

    const response = await fetch(`${openAiBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: resolvedModel,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        user: orgId,
        messages: [
          {
            role: 'system',
            content:
              'Você é editor sênior de carrosseis e diretor de arte. Avalie legibilidade, clareza, promessa exagerada, consistência com marca, função de cada slide e qualidade visual. Verifique também as regras editoriais do template e termos proibidos da marca. Responda somente JSON válido.\n\nRUBRICA DE 9 DIMENSÕES (score 0-5 cada, CRITICAL = obrigatório >=4):\n1. FOCAL HIERARCHY [CRITICAL] — Um elemento domina o olhar em 0.5s. Se não, fixe: aumente hierarquia, reduza competidores, adicione whitespace.\n2. COMPOSITION & BALANCE [CRITICAL] — Grid consistente, margens ópticas (6-8% da largura), alinhamento claro. Fixe: centre em um sistema de alinhamento.\n3. TYPE CRAFT — Fontes display distintas (nunca Arial/Inter/Roboto), tracking negativo no headline, peso 800-900, line-height 0.95-1.05. Corpo >=24px em 1080w.\n4. COLOR CRAFT — Base 60%, neutra 30%, acento 10% (um acento travado). Sombras tintadas (nunca #000 puro). Gradientes sem banding. Sem glow roxo/azul em fundo branco.\n5. DEPTH & ATMOSPHERE — Pelo menos 1 dispositivo de profundidade por slide: gradiente mesh, grain 4-8%, glow tintado, shapes sobrepostos, ou tipo gigante ao fundo.\n6. LEGIBILITY & CONTRAST [CRITICAL] — Texto minimo 4.5:1 (normal) ou 3:1 (display). Texto sobre imagem = scrim obrigatório. Sem texto cinza claro em fundo branco.\n7. SAFE ZONES & FIT — Dimensões exatas da plataforma, conteúdo crítico nos 80% centrais. Stories/Reels: respeitar overlay de UI.\n8. COPY — Headline <=8 palavras, uma ideia por slide. Sem filler, sem stats fictícios. Aspas reais, sem excesso de emojis.\n9. DIRECTION COMMITMENT [CRITICAL] — Todo slide pertence a uma estética coesa. Pelo menos 2 motivos visuais identificáveis por slide. Teste: um desconhecido conseguiria nomear o vibe?',
          },
          {
            role: 'user',
            content: `Revise este carrossel antes da geração final de imagens. Aplique a rubrica de 9 dimensões do system prompt.${templateChecksSection}${forbiddenSection}

Payload:
${payload.slice(0, 14000)}

Retorne exatamente:
{
  "score": 0-100,
  "verdict": "resumo curto do nível editorial",
  "dimensions": {
    "focalHierarchy": 0-5,
    "compositionBalance": 0-5,
    "typeCraft": 0-5,
    "colorCraft": 0-5,
    "depthAtmosphere": 0-5,
    "legibilityContrast": 0-5,
    "safeZonesFit": 0-5,
    "copy": 0-5,
    "directionCommitment": 0-5
  },
  "issues": [
    {
      "slideIndex": 1,
      "field": "headline|body|cta|imagePrompt",
      "message": "problema",
      "suggestion": "correção objetiva",
      "type": "warning|blocker"
    }
  ],
  "strengths": ["ponto forte"],
  "templateCheckResults": [
    {
      "checkId": "id-do-check",
      "passed": true|false,
      "message": "detalhe"
    }
  ],
  "forbiddenTermMatches": [
    {
      "term": "termo proibido encontrado",
      "slideIndex": 1,
      "field": "headline|body"
    }
  ]
}

Score geral = média das 9 dimensões × 20. Dimensões CRITICAL (focalHierarchy, compositionBalance, legibilityContrast, directionCommitment) com score <4 geram blocker automático. Se estiver bom, issues pode ser vazio. Use pt-BR.`,
          },
        ],
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string } | string;
      message?: string;
    };

    if (!response.ok) {
      const errorMessage =
        data.message ||
        (typeof data.error === 'string' ? data.error : data.error?.message) ||
        'Carousel review failed';
      throw new HttpException(errorMessage, HttpStatus.BAD_GATEWAY);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new HttpException(
        'OpenAI did not return review content',
        HttpStatus.BAD_GATEWAY
      );
    }

    // Validate with Zod schema
    const validation = validateAiResponse('editorial-review', content, 1);

    if (!validation.success) {
      Logger.warn(
        `Editorial review validation failed: ${validation.errors?.issues?.length || 0} issues`,
        'AiGenerateService'
      );
    }

    const parsed = validation.success && validation.data
      ? validation.data as Record<string, unknown>
      : parseJsonPayload(content);

    // --- Local forbidden terms validation as fallback ---
    if (forbiddenTerms && Array.isArray(parsed.issues)) {
      const terms = forbiddenTerms.split(/[,;]\s*/).map(t => t.trim().toLowerCase()).filter(Boolean);
      const planSlides = (parsedPayload.plan?.slides || parsedPayload.slides || []) as Array<{
        index?: number; headline?: string; body?: string; cta?: string;
      }>;
      const existingMatches = (parsed.forbiddenTermMatches || []) as Array<{
        term: string; slideIndex: number; field: string;
      }>;
      const matchSet = new Set(existingMatches.map(m => `${m.term}-${m.slideIndex}-${m.field}`));

      for (const slide of planSlides) {
        const fields: Record<string, string> = {
          headline: (slide.headline || '').toLowerCase(),
          body: (slide.body || '').toLowerCase(),
          cta: (slide.cta || '').toLowerCase(),
        };
        for (const term of terms) {
          for (const [field, value] of Object.entries(fields)) {
            if (value.includes(term) && !matchSet.has(`${term}-${slide.index}-${field}`)) {
              existingMatches.push({ term, slideIndex: slide.index || 0, field });
              matchSet.add(`${term}-${slide.index}-${field}`);
              (parsed.issues as Array<Record<string, unknown>>).push({
                type: 'blocker',
                slideIndex: slide.index,
                field,
                message: `Termo proibido "${term}" encontrado.`,
                suggestion: `Remova ou substitua o termo "${term}" por uma alternativa.`,
              });
            }
          }
        }
      }
      parsed.forbiddenTermMatches = existingMatches;
    }

    return {
      ...parsed,
      ...buildAiMetadata('editorial-review', resolvedModel, 'openai_official'),
    };
  }

  async fixCarouselWithEditorialReview(orgId: string, body: AiGenerateCarouselDto) {
    const openAiApiKey =
      process.env.AI_GENERATE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const openAiBaseUrl =
      process.env.AI_GENERATE_OPENAI_BASE_URL?.replace(/\/$/, '') ||
      'https://api.openai.com';

    if (!openAiApiKey) {
      throw new HttpException(
        'OpenAI official API is not configured',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    const resolvedModel =
      body.textModel?.trim() ||
      process.env.AI_GENERATE_OPENAI_TEXT_MODEL ||
      'gpt-4.1-mini';
    const payload = body.reviewPayload || JSON.stringify(body);
    const slideCount = clampNumber(body.slideCount, 5, 2, 10);

    const response = await fetch(`${openAiBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: resolvedModel,
        temperature: 0.35,
        response_format: { type: 'json_object' },
        user: orgId,
        messages: [
          {
            role: 'system',
            content:
              'Voce e editor senior de carrosseis e diretor de arte. Corrija copy visual e prompts mantendo estrategia, ordem dos slides e identidade de marca. Responda somente JSON valido.\n\nREGRAS DE DESIGN APLICAR NA CORREÇÃO:\n- Headline: peso 800-900, tracking negativo, max 78 caracteres, destaque visual dominante\n- Profundidade: todo slide precisa de 1+ elemento de profundidade (gradiente, grain, shapes) — nunca fundo flat\n- Contraste: minimo 4.5:1 para texto normal, 3:1 para display. Texto sobre imagem = scrim\n- Cor: paleta coesa (base/neutra/acento), sombras tintadas, sem #000 puro\n- Modular: sugerir módulos visuais no imagePrompt quando apropriado (pill, stat-chip, number-hero)\n- Anti-AI: evitar glow roxo/azul em branco, grid idêntico, tudo centralizado',
          },
          {
            role: 'user',
            content: `Corrija este carrossel com base na revisão editorial. Mantenha exatamente ${slideCount} slides. Preserve o tema, mas resolva problemas de clareza, legibilidade, promessa exagerada, CTA fraco e direção visual confusa.\n\nPayload:\n${payload.slice(
              0,
              18000
            )}\n\nRetorne exatamente o mesmo formato de plano:\n{\n  "title": "titulo",\n  "platform": "instagram",\n  "language": "pt-BR",\n  "caption": "legenda",\n  "hashtags": ["#tag"],\n  "imageStyleGuide": "guia visual revisado",\n  "slides": [\n    {"index": 1, "headline": "curta", "body": "curto", "cta": "curto", "imagePrompt": "visual legivel", "altText": "alt"}\n  ],\n  "fixSummary": ["correcao feita"]\n}\n\nRegras: headline maximo 78 caracteres, body idealmente abaixo de 140 caracteres, texto dentro da imagem precisa ser legivel no celular, sem claims absolutos, sem inventar dados. Use pt-BR.`,
          },
        ],
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: Record<string, unknown>;
      error?: { message?: string } | string;
      message?: string;
    };

    if (!response.ok) {
      const errorMessage =
        data.message ||
        (typeof data.error === 'string' ? data.error : data.error?.message) ||
        'Carousel fix failed';
      throw new HttpException(errorMessage, HttpStatus.BAD_GATEWAY);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new HttpException(
        'OpenAI did not return fixed carousel content',
        HttpStatus.BAD_GATEWAY
      );
    }

    // Validate with Zod schema
    const validation = validateAiResponse('carousel-plan', content, 1);

    if (!validation.success) {
      Logger.warn(
        `Carousel plan (fix) validation failed: ${validation.errors?.issues?.length || 0} issues`,
        'AiGenerateService'
      );
    }

    const parsed = validation.success && validation.data
      ? validation.data as unknown as Record<string, unknown>
      : parseJsonPayload(content);
    const plan = normalizeCarouselPlan(parsed, body, slideCount);
    const result = {
      ...plan,
      fixSummary: Array.isArray(parsed.fixSummary)
        ? parsed.fixSummary.map((item) => firstString(item)).filter(Boolean).slice(0, 12)
        : [],
      provider: 'openai_official',
      model: resolvedModel,
      usage: data.usage,
      cost_estimate: estimateCostInUsdAndBrl(data.usage),
      ...buildAiMetadata('carousel-plan', resolvedModel, 'openai_official'),
    };
    this.recordCost(orgId, 'text', `Correção editorial: ${body.topic.slice(0, 80)}`, result.cost_estimate);
    return result;
  }

  // ─── Etapa de Direção de Arte (LLM) ─────────────────────────────────────
  // Passe intermediário entre o plano e a geração de imagens: um modelo de
  // texto expande o imagePrompt de cada slide em um "render brief" vívido e
  // específico, todos derivados de um único conceito de campanha. Custo baixo
  // (uma chamada de texto) e ganho alto de qualidade/variedade visual.
  async artDirectCarousel(
    orgId: string,
    body: {
      title?: string;
      imageStyleGuide?: string;
      directionSummary?: string;
      brandName?: string;
      brandColors?: string;
      textModel?: string;
      slides?: Array<{
        index?: number;
        headline?: string;
        body?: string;
        cta?: string;
        imagePrompt?: string;
      }>;
    }
  ) {
    const slides = (Array.isArray(body.slides) ? body.slides : [])
      .map((slide, position) => ({
        index: Number(slide.index || position + 1),
        headline: (slide.headline || '').slice(0, 200),
        body: (slide.body || '').slice(0, 300),
        cta: (slide.cta || '').slice(0, 120),
        imagePrompt: (slide.imagePrompt || '').slice(0, 600),
      }))
      .slice(0, 12);

    if (!slides.length) {
      throw new HttpException(
        'At least one slide is required for art direction',
        HttpStatus.BAD_REQUEST
      );
    }

    const openAiApiKey =
      process.env.AI_GENERATE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const openAiBaseUrl =
      process.env.AI_GENERATE_OPENAI_BASE_URL?.replace(/\/$/, '') ||
      'https://api.openai.com';

    if (!openAiApiKey) {
      throw new HttpException(
        'OpenAI official API is not configured',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    const resolvedModel =
      body.textModel?.trim() ||
      process.env.AI_GENERATE_OPENAI_TEXT_MODEL ||
      'gpt-4.1-mini';
    const timeoutMs = Number(process.env.AI_GENERATE_TIMEOUT_MS || 120000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${openAiBaseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: resolvedModel,
          temperature: 0.9,
          response_format: { type: 'json_object' },
          user: orgId,
          messages: [
            {
              role: 'system',
              content:
                'Voce e um diretor de arte premiado (Cannes Lions, D&AD) especializado em social media de alto nivel. Sua funcao: transformar briefings crus de slides em RENDER BRIEFS cinematograficos para um modelo de geracao de imagem — descricoes vividas, especificas e declarativas da arte final, como se voce descrevesse uma peca ja pronta pendurada na parede do estudio.\n\nPRINCIPIOS:\n- Primeiro invente UM conceito criativo de campanha: uma metafora visual ou dispositivo grafico assinatura, especifico do tema (nunca generico), que se repete e EVOLUI slide a slide.\n- Cada render brief descreve UMA cena unica: objeto focal proprio, enquadramento proprio, dispositivo grafico proprio. Slides irmaos jamais repetem fundo ou composicao.\n- Escreva em linguagem visual concreta: materiais, texturas, iluminacao, angulo de camera, profundidade, acabamento. "Uma engrenagem de latao fotografada de topo sobre feltro grafite, sombra dura as 14h" — nao "imagem moderna de engrenagem".\n- Respeite rigorosamente a paleta e o design system informados; o acento cobre ~10% da area.\n- Reserve SEMPRE uma zona de respiro clara para a tipografia entrar depois (indique onde: tercio superior, faixa inferior, coluna esquerda...).\n- Anti-AI-look: proibido gradiente roxo/azul generico, glow neon em branco, blobs 3D brilhantes, tudo centralizado, pessoas com cara de banco de imagem.\n\nResponda somente JSON valido, sem markdown.',
            },
            {
              role: 'user',
              content: `Campanha: ${body.title || 'carrossel de redes sociais'}
Marca: ${body.brandName || 'nao informada'}
Paleta da marca: ${body.brandColors || 'livre, desde que coesa'}
Design system escolhido: ${body.directionSummary || 'editorial premium'}
Guia visual do plano: ${body.imageStyleGuide || 'nao informado'}

Slides (briefings crus):
${JSON.stringify(slides, null, 2)}

Tarefa: crie o conceito criativo da campanha e, para CADA slide, um render brief de 60-110 palavras derivado desse conceito. O slide 1 e a CAPA (cena mais ousada, gancho visual maximo); o ultimo e o FECHAMENTO (composicao estavel conduzindo ao CTA); os demais sao CONTEUDO com diagramacoes distintas entre si.\n\nRetorne exatamente:\n{\n  "campaignConcept": "o conceito assinatura em 1-2 frases especificas",\n  "slides": [\n    { "index": 1, "renderBrief": "descricao vivida da cena final, com objeto focal, material/textura, iluminacao, enquadramento, dispositivo grafico do conceito e zona de respiro para o texto" }\n  ]\n}\n\nUse pt-BR. Um render brief por slide, indices iguais aos de entrada.`,
            },
          ],
        }),
        signal: controller.signal,
      });

      const data = (await response.json().catch(() => ({}))) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: Record<string, unknown>;
        message?: string;
        error?: { message?: string } | string;
      };

      if (!response.ok) {
        const errorMessage =
          data.message ||
          (typeof data.error === 'string' ? data.error : data.error?.message) ||
          'Art direction failed';
        const status =
          response.status < 500 ? response.status : HttpStatus.BAD_GATEWAY;
        throw new HttpException(errorMessage, status);
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new HttpException(
          'OpenAI did not return art direction content',
          HttpStatus.BAD_GATEWAY
        );
      }

      const parsed = parseJsonPayload(content);
      const rawSlides = Array.isArray(parsed.slides) ? parsed.slides : [];
      const briefs = rawSlides
        .map((item) => {
          const record = item as Record<string, unknown>;
          return {
            index: Number(record.index) || 0,
            renderBrief: firstString(record.renderBrief).slice(0, 1400),
          };
        })
        .filter((item) => item.index > 0 && item.renderBrief.trim());

      const result = {
        campaignConcept: firstString(parsed.campaignConcept).slice(0, 600),
        slides: briefs,
        provider: 'openai_official',
        model: resolvedModel,
        usage: data.usage,
        cost_estimate: estimateCostInUsdAndBrl(data.usage),
      };
      this.recordCost(
        orgId,
        'text',
        `Direção de arte: ${(body.title || 'carrossel').slice(0, 80)}`,
        result.cost_estimate
      );
      return result;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpException(
          'Art direction request timed out',
          HttpStatus.GATEWAY_TIMEOUT
        );
      }
      throw new HttpException(
        'Unable to reach OpenAI for art direction',
        HttpStatus.BAD_GATEWAY
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async startCarouselImageJob(
    orgId: string,
    body: { slides?: Array<{ slideIndex?: number; request?: AiGenerateImageDto }> }
  ) {
    const slides = Array.isArray(body.slides) ? body.slides : [];
    const normalizedSlides = slides
      .map((slide, index) => ({
        slideIndex: Number(slide.slideIndex || index + 1),
        request: slide.request,
      }))
      .filter((slide) => slide.request?.prompt?.trim())
      .slice(0, 20);

    if (!normalizedSlides.length) {
      throw new HttpException(
        'At least one slide image request is required',
        HttpStatus.BAD_REQUEST
      );
    }

    // Verificar concorrência por org (max 2 jobs simultâneos)
    const activeCount = await this._generationJobService.countActiveJobs(orgId);
    if (activeCount >= 2) {
      throw new HttpException(
        'Too many active jobs. Wait for existing jobs to complete.',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Criar job no Prisma
    const job = await this._generationJobService.createJob({
      organizationId: orgId,
      type: 'IMAGE_GENERATION',
      progress: {
        total: normalizedSlides.length,
        completed: 0,
        failed: 0,
        slides: normalizedSlides.map(s => ({
          slideIndex: s.slideIndex,
          status: 'queued',
        })),
      },
    });

    // Executar job em background
    void this.runCarouselImageJobPersisted(job.id, orgId, normalizedSlides);

    return {
      id: job.id,
      status: job.status.toLowerCase(),
      total: normalizedSlides.length,
      completed: 0,
      failed: 0,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  async getCarouselImageJob(orgId: string, id: string) {
    const job = await this._generationJobService.getJob(id, orgId);
    if (!job) {
      throw new HttpException('Carousel image job not found', HttpStatus.NOT_FOUND);
    }

    const progress = (job.progress as any) || {};
    return {
      id: job.id,
      status: job.status.toLowerCase(),
      total: progress.total || 0,
      completed: progress.completed || 0,
      failed: progress.failed || 0,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      slides: (progress.slides || []).map((s: any) => ({
        slideIndex: s.slideIndex,
        status: s.status,
        result: s.result,
        error: s.error,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
      })),
    };
  }

  private async runCarouselImageJobPersisted(
    jobId: string,
    orgId: string,
    slides: Array<{ slideIndex: number; request: AiGenerateImageDto }>
  ) {
    await this._generationJobService.startJob(jobId);

    const concurrency = Math.max(
      1,
      Math.min(2, Number(process.env.AI_GENERATE_JOB_CONCURRENCY || 2))
    );

    const maxRetries = 3;
    const backoffMs = [1000, 4000, 16000];
    const results: any[] = [];
    const queue = [...slides];

    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length) {
        const slide = queue.shift();
        if (!slide) return;

        let lastError: string | undefined;
        let attempts = 0;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          attempts = attempt + 1;

          try {
            const result = await this.generateImage(orgId, slide.request);
            results.push({
              slideIndex: slide.slideIndex,
              status: 'completed',
              result,
              attempts,
            });
            lastError = undefined;
            break;
          } catch (error: unknown) {
            if (error instanceof HttpException) {
              const res = error.getResponse();
              lastError =
                typeof res === 'string'
                  ? res
                  : (res as { message?: string })?.message || error.message;
            } else if (error instanceof Error) {
              lastError = error.message;
            } else {
              lastError = 'Image generation failed';
            }

            if (attempt < maxRetries - 1) {
              const delay = backoffMs[attempt] || 16000;
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
        }

        if (lastError) {
          results.push({
            slideIndex: slide.slideIndex,
            status: 'failed',
            error: lastError,
            attempts,
          });
        }

        // Atualizar progresso parcial
        const completedCount = results.filter(r => r.status === 'completed').length;
        const failedCount = results.filter(r => r.status === 'failed').length;
        
        await this._generationJobService.updateProgress(jobId, {
          total: slides.length,
          completed: completedCount,
          failed: failedCount,
          currentSlide: slide.slideIndex,
          slides: results,
        });
      }
    });

    await Promise.all(workers);

    // Determinar status final
    const allFailed = results.every(r => r.status === 'failed');
    const someFailed = results.some(r => r.status === 'failed');
    const finalStatus = allFailed ? 'FAILED' : someFailed ? 'PARTIAL' : 'COMPLETED';

    if (finalStatus === 'COMPLETED') {
      await this._generationJobService.completeJob(jobId, { results });
    } else if (finalStatus === 'PARTIAL') {
      await this._generationJobService.completeJob(jobId, { results });
    } else {
      await this._generationJobService.failJob(jobId, 'All slides failed');
    }
  }

  async generateImage(orgId: string, body: AiGenerateImageDto) {
    const provider: ImageProvider =
      body.provider === 'openai_official' ? 'openai_official' : 'ia_generate';
    const {
      provider: _provider,
      response_format: responseFormat,
      reference_images: referenceImages,
      reference_description_model: referenceDescriptionModel,
      reference_mode: referenceModeRaw,
      input_fidelity: _inputFidelity,
      persist,
      // brandProfileId é metadado interno; nunca deve ir para o provider de
      // imagem (OpenAI rejeita parâmetros desconhecidos com 400).
      brandProfileId: _brandProfileId,
      ...requestBody
    } = body;
    const referenceMode: 'brand' | 'balanced' | 'inspiration' =
      referenceModeRaw === 'brand' || referenceModeRaw === 'inspiration'
        ? referenceModeRaw
        : 'balanced';

    const prompt = body.prompt?.trim();
    if (!prompt) {
      throw new HttpException('Prompt is required', HttpStatus.BAD_REQUEST);
    }

    if (prompt.length > 32000) {
      throw new HttpException(
        'Prompt must be 32000 characters or less',
        HttpStatus.BAD_REQUEST
      );
    }

    const timeoutMs = Number(process.env.AI_GENERATE_TIMEOUT_MS || 120000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let response: Response;
      let resolvedModel = requestBody.model;

      if (provider === 'openai_official') {
        const openAiApiKey =
          process.env.AI_GENERATE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
        const openAiBaseUrl =
          process.env.AI_GENERATE_OPENAI_BASE_URL?.replace(/\/$/, '') ||
          'https://api.openai.com';

        if (!openAiApiKey) {
          throw new HttpException(
            'OpenAI official API is not configured',
            HttpStatus.SERVICE_UNAVAILABLE
          );
        }

        const validReferenceDataUrls = (referenceImages || [])
          .slice(0, 3)
          .filter((image) => !!dataUrlToBlob(image));

        const size =
          requestBody.size ||
          process.env.AI_GENERATE_IMAGE_SIZE ||
          '1024x1024';

        // Modelo que GERA a imagem (separado do modelo que descreve as
        // inspirações). Quando há inspirações, permitimos um modelo dedicado.
        resolvedModel = validReferenceDataUrls.length
          ? requestBody.model ||
            process.env.AI_GENERATE_OPENAI_IMAGE_MODEL_WITH_REFERENCES ||
            process.env.AI_GENERATE_OPENAI_IMAGE_MODEL ||
            'gpt-image-2'
          : requestBody.model ||
            process.env.AI_GENERATE_OPENAI_IMAGE_MODEL ||
            'gpt-image-2';

        let finalPrompt = prompt;
        // Nos modos "balanced" e "inspiration" as inspirações vão como IMAGENS
        // reais para o modelo (endpoint /images/edits aceita imagens de
        // entrada). No modo "brand" elas viram apenas descrição em texto e a
        // identidade da marca continua mandando.
        const useImageInputs =
          validReferenceDataUrls.length > 0 && referenceMode !== 'brand';

        if (useImageInputs) {
          finalPrompt =
            referenceMode === 'inspiration'
              ? `${prompt}

As imagens anexadas são as inspirações selecionadas e a DIREÇÃO VISUAL PRINCIPAL desta arte: siga fielmente a composição, o enquadramento, a paleta, a tipografia, a textura, a iluminação e a atmosfera delas. Se houver conflito com qualquer instrução de estilo no texto acima, priorize as imagens anexadas. Não copie marcas, logos, rostos ou elementos protegidos; preserve o texto do slide com legibilidade perfeita.`
              : `${prompt}

As imagens anexadas são as inspirações selecionadas: use-as como referência forte de composição, paleta, tipografia, textura e atmosfera, equilibrando com a identidade da marca descrita acima. Não copie marcas, logos, rostos ou elementos protegidos; preserve o texto do slide com legibilidade perfeita.`;

          const form = new FormData();
          validReferenceDataUrls.forEach((dataUrl, index) => {
            const blob = dataUrlToBlob(dataUrl);
            if (!blob) {
              return;
            }
            const extension =
              blob.type === 'image/png'
                ? 'png'
                : blob.type === 'image/webp'
                ? 'webp'
                : 'jpg';
            form.append('image[]', blob, `reference-${index + 1}.${extension}`);
          });
          form.append('model', resolvedModel);
          form.append('prompt', finalPrompt);
          form.append('n', String(requestBody.n || 1));
          form.append('size', size);
          if (requestBody.quality) {
            form.append('quality', requestBody.quality);
          }
          form.append('user', requestBody.user || orgId);

          response = await fetch(`${openAiBaseUrl}/v1/images/edits`, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${openAiApiKey}`,
            },
            body: form,
            signal: controller.signal,
          });
        } else {
          if (validReferenceDataUrls.length) {
            // Modo "brand": um modelo de VISÃO descreve as inspirações em um
            // brief e a marca segue como prioridade. Best-effort: se falhar,
            // ainda geramos a imagem.
            try {
              const referenceBrief = await this.describeReferenceImagesCached(
                openAiBaseUrl,
                openAiApiKey,
                orgId,
                validReferenceDataUrls,
                referenceDescriptionModel
              );

              finalPrompt = `${prompt}

Brief visual extraído das inspirações usando ${referenceBrief.model}:
${referenceBrief.text}

Use esse brief visual como tempero (composição, enquadramento, textura, iluminação e atmosfera), mas em caso de conflito priorize a identidade visual da marca descrita acima. Não copie marcas, logos, rostos ou elementos protegidos das referências.`;
            } catch {
              // Sem brief disponível: ainda assim geramos com o prompt base.
            }
          }

          response = await fetch(`${openAiBaseUrl}/v1/images/generations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Bearer ${openAiApiKey}`,
            },
            body: JSON.stringify({
              ...requestBody,
              prompt: finalPrompt,
              model: resolvedModel,
              n: requestBody.n || 1,
              size,
              user: requestBody.user || orgId,
            }),
            signal: controller.signal,
          });
        }
      } else {
        const baseUrl = process.env.AI_GENERATE_BASE_URL?.replace(/\/$/, '');
        const apiKey = process.env.AI_GENERATE_API_KEY;

        if (!baseUrl || !apiKey) {
          throw new HttpException(
            'AI Generate integration is not configured',
            HttpStatus.SERVICE_UNAVAILABLE
          );
        }

        resolvedModel =
          requestBody.model ||
          process.env.AI_GENERATE_IMAGE_MODEL ||
          'gpt-image-1';

        response = await fetch(`${baseUrl}/v1/images/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            ...requestBody,
            prompt,
            model: resolvedModel,
            n: requestBody.n || 1,
            size:
              requestBody.size ||
              process.env.AI_GENERATE_IMAGE_SIZE ||
              '1024x1024',
            response_format:
              responseFormat ||
              process.env.AI_GENERATE_IMAGE_RESPONSE_FORMAT ||
              'b64_json',
            user: requestBody.user || orgId,
          }),
          signal: controller.signal,
        });
      }

      const data = (await response
        .json()
        .catch(() => ({}))) as AiGenerateResponse & {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        const message = data.message || data.error || 'Image generation failed';
        const status =
          response.status < 500 ? response.status : HttpStatus.BAD_GATEWAY;
        throw new HttpException(message, status);
      }

      const images = data.images || data.data || [];
      if (!images.length) {
        throw new HttpException(
          'AI Generate did not return any images',
          HttpStatus.BAD_GATEWAY
        );
      }

      const normalizedImages =
        persist === false
          ? images
          : await Promise.all(
              images.map((image, index) =>
                this.persistGeneratedImage(orgId, image, index)
              )
            );

      const result = {
        created: data.created,
        images: normalizedImages,
        usage: data.usage,
        provider,
        model: resolvedModel,
        cost_estimate: estimateCostInUsdAndBrl(data.usage),
      };
      this.recordCost(orgId, 'image', `Imagem: ${prompt.slice(0, 80)}`, result.cost_estimate);
      return result;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpException(
          provider === 'openai_official'
            ? 'OpenAI official API request timed out'
            : 'AI Generate request timed out',
          HttpStatus.GATEWAY_TIMEOUT
        );
      }

      throw new HttpException(
        provider === 'openai_official'
          ? 'Unable to reach OpenAI official API'
          : 'Unable to reach AI Generate',
        HttpStatus.BAD_GATEWAY
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async persistGeneratedImage(
    orgId: string,
    image: AiGenerateImage,
    index: number
  ): Promise<AiGenerateImage> {
    if (!image.b64_json && !image.url) {
      return image;
    }

    const uploaded = image.b64_json
      ? await this.storage.uploadFile({
          fieldname: 'file',
          originalname: `ai-generated-${index + 1}.png`,
          encoding: '7bit',
          mimetype: 'image/png',
          buffer: Buffer.from(image.b64_json, 'base64'),
        } as Express.Multer.File)
      : await this.storage.uploadSimple(image.url!);
    const uploadedUrl = typeof uploaded === 'string' ? uploaded : uploaded.path;

    const saved = await this._mediaService.saveFile(
      orgId,
      uploadedUrl.split('/').pop() || `ai-generated-${index + 1}.png`,
      uploadedUrl,
      'AI generated images'
    );

    return {
      url: uploadedUrl,
      revised_prompt: image.revised_prompt,
      mediaId: saved?.id,
    };
  }

  // Reaproveita o brief de inspirações idênticas dentro de uma janela curta,
  // deduplicando inclusive chamadas concorrentes de slides do mesmo carrossel.
  private describeReferenceImagesCached(
    openAiBaseUrl: string,
    openAiApiKey: string,
    orgId: string,
    images: string[],
    requestedModel?: string
  ) {
    const now = Date.now();
    const ttlMs = Number(
      process.env.AI_GENERATE_REFERENCE_BRIEF_TTL_MS || 10 * 60 * 1000
    );
    const key = createHash('sha1')
      .update(`${requestedModel || ''}|${images.join('|')}`)
      .digest('hex');

    const existing = referenceBriefCache.get(key);
    if (existing && existing.expires > now) {
      return existing.promise;
    }

    const promise = this.describeReferenceImages(
      openAiBaseUrl,
      openAiApiKey,
      orgId,
      images,
      requestedModel
    ).catch((error) => {
      // Não cacheia falhas: permite nova tentativa na próxima geração.
      referenceBriefCache.delete(key);
      throw error;
    });

    referenceBriefCache.set(key, { promise, expires: now + ttlMs });

    if (referenceBriefCache.size > 50) {
      for (const [cacheKey, entry] of referenceBriefCache) {
        if (entry.expires <= now) {
          referenceBriefCache.delete(cacheKey);
        }
      }
    }

    return promise;
  }

  private async describeReferenceImages(
    openAiBaseUrl: string,
    openAiApiKey: string,
    orgId: string,
    images: string[],
    requestedModel?: string
  ) {
    const primaryModel =
      process.env.AI_GENERATE_OPENAI_REFERENCE_DESCRIPTION_MODEL ||
      requestedModel ||
      'gpt-4.1-mini';
    const fallbackModel =
      process.env.AI_GENERATE_OPENAI_REFERENCE_DESCRIPTION_FALLBACK_MODEL ||
      'gpt-4o-mini';
    const models = [...new Set([primaryModel, fallbackModel].filter(Boolean))];

    const content = [
      {
        type: 'input_text',
        text:
          'Analise as imagens de inspiração para criar um brief visual objetivo para gerar posts/carrosséis. Retorne em português, sem JSON, com no máximo 900 caracteres. Foque em: composição, enquadramento, hierarquia tipográfica, paleta, textura, iluminação, atmosfera, uso de espaço negativo, estilo editorial e elementos que devem ser evitados para não copiar marcas/logos/rostos. Não descreva o assunto literal como algo obrigatório; descreva a direção visual reutilizável.',
      },
      ...images.slice(0, 3).map((image) => ({
        type: 'input_image',
        image_url: image,
        detail: dataUrlMimeType(image) === 'image/webp' ? 'auto' : 'high',
      })),
    ];

    let lastMessage = '';

    for (const model of models) {
      const response = await fetch(`${openAiBaseUrl}/v1/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model,
          user: orgId,
          input: [
            {
              role: 'user',
              content,
            },
          ],
          max_output_tokens: 450,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      > & {
        error?: string | { message?: string };
        message?: string;
      };

      if (!response.ok) {
        lastMessage =
          data.message ||
          (typeof data.error === 'string' ? data.error : data.error?.message) ||
          `Reference description failed with ${model}`;
        continue;
      }

      const text = extractResponseText(data);
      if (text) {
        return {
          model,
          text: text.slice(0, 1200),
        };
      }

      lastMessage = `Reference description returned empty text with ${model}`;
    }

    throw new HttpException(
      lastMessage || 'Unable to describe reference images',
      HttpStatus.BAD_GATEWAY
    );
  }
}
