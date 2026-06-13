import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { AiGenerateCarouselDto } from '@gitroom/nestjs-libraries/dtos/ai-generate/ai-generate-carousel.dto';
import { AiGenerateCarouselIdeasDto } from '@gitroom/nestjs-libraries/dtos/ai-generate/ai-generate-carousel-ideas.dto';
import { AiGenerateImageDto } from '@gitroom/nestjs-libraries/dtos/ai-generate/ai-generate-image.dto';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';

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

type CarouselImageJobStatus = 'queued' | 'running' | 'completed' | 'failed';

type CarouselImageJobSlide = {
  slideIndex: number;
  status: CarouselImageJobStatus;
  request: AiGenerateImageDto;
  result?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
};

type CarouselImageJob = {
  id: string;
  orgId: string;
  status: CarouselImageJobStatus;
  total: number;
  completed: number;
  failed: number;
  createdAt: string;
  updatedAt: string;
  slides: CarouselImageJobSlide[];
};

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

const carouselImageJobs = new Map<string, CarouselImageJob>();
const costLedger = new Map<string, AiGenerateCostLedgerEntry[]>();
// Cache do brief visual das inspirações: evita re-descrever as mesmas imagens
// a cada slide do mesmo carrossel (economiza chamadas do modelo de visão).
const referenceBriefCache = new Map<
  string,
  { promise: Promise<{ model: string; text: string }>; expires: number }
>();

function makeLedgerId() {
  return `cost_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

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
  private storage = UploadFactory.createStorage();

  constructor(private _mediaService: MediaService) {}

  private recordCost(
    orgId: string,
    type: AiGenerateCostLedgerEntry['type'],
    label: string,
    cost: CostEstimate | null | undefined
  ) {
    if (!cost) {
      return;
    }

    const current = costLedger.get(orgId) || [];
    costLedger.set(
      orgId,
      [
        {
          id: makeLedgerId(),
          orgId,
          type,
          label,
          cost,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 200)
    );
  }

  getCostHistory(orgId: string) {
    const entries = (costLedger.get(orgId) || []).filter(
      (entry) => entry.type !== 'estimate'
    );
    const totals = entries.reduce(
      (acc, entry) => ({
        usd: acc.usd + entry.cost.usd,
        brl: acc.brl + entry.cost.brl,
        tokens: acc.tokens + entry.cost.tokens.totalTokens,
      }),
      { usd: 0, brl: 0, tokens: 0 }
    );

    return {
      entries,
      totals: {
        usd: Number(totals.usd.toFixed(6)),
        brl: Number(totals.brl.toFixed(6)),
        tokens: totals.tokens,
      },
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
              }${avoidanceInstruction}\n\nRetorne EXATAMENTE:\n{\n  "ideas": [\n    {\n      "title": "tema curto do carrossel",\n      "hook": "frase gancho para abrir o post",\n      "goal": "objetivo do post (educar, autoridade, conversao, etc)",\n      "angle": "angulo editorial em 1 frase"\n    }\n  ]\n}\n\nGere entre 8 e 12 ideias, com variedade de formatos (educacional, storytelling, lista, mitos e verdades, case, antes/depois, oferta, autoridade).`,
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

      const parsed = parseJsonPayload(content);
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

  async generateCarouselPlan(orgId: string, body: AiGenerateCarouselDto) {
    const topic = body.topic?.trim();
    if (!topic) {
      throw new HttpException('Topic is required', HttpStatus.BAD_REQUEST);
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
      topic,
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
                'Voce e um diretor de arte e copywriter senior para carrosseis de redes sociais. Gere copy curta para ser renderizada dentro das imagens, alem de prompts visuais com layout editorial. Responda somente JSON valido, sem markdown.',
            },
            {
              role: 'user',
              content: `Crie um plano completo de carrossel com exatamente ${slideCount} slides.\n\nBriefing:\n${JSON.stringify(
                brief,
                null,
                2
              )}\n\nFormato obrigatorio do JSON:\n{\n  "title": "titulo do post",\n  "platform": "instagram",\n  "language": "pt-BR",\n  "caption": "legenda curta para acompanhar o post fora da imagem",\n  "hashtags": ["#tag"],\n  "imageStyleGuide": "guia visual consistente para todas as imagens, incluindo tipografia, cores, composicao e elementos de marca",\n  "slides": [\n    {\n      "index": 1,\n      "headline": "frase principal curta que deve aparecer GRANDE dentro da imagem",\n      "body": "texto de apoio curto que tambem deve aparecer dentro da imagem",\n      "cta": "micro chamada visual opcional para aparecer no slide",\n      "imagePrompt": "descricao visual do fundo, objeto/personagem/metafora, layout e espacos de respiro para encaixar a tipografia",\n      "altText": "descricao acessivel da imagem"\n    }\n  ]\n}\n\nRegras: headline e body sao copy visual para dentro do criativo, nao descricao do post. Escreva pouco texto por slide, com quebras naturais e alto impacto. Use uma linguagem natural em portugues do Brasil. Cada slide deve funcionar como uma peca editorial quadrada: tipografia grande, hierarquia clara, bastante margem e uma metafora visual forte. O imagePrompt deve preparar uma imagem que contenha texto renderizado com legibilidade, sem pedir legenda externa. Evite promessas exageradas, nao invente logos; se nao houver marca, use um pequeno selo textual com o tema ou categoria.`,
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

      const plan = normalizeCarouselPlan(
        parseJsonPayload(content),
        body,
        slideCount
      );

      const result = {
        ...plan,
        provider: 'openai_official',
        model: resolvedModel,
        usage: data.usage,
        cost_estimate: estimateCostInUsdAndBrl(data.usage),
      };
      this.recordCost(orgId, 'text', `Copy: ${topic.slice(0, 80)}`, result.cost_estimate);
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
              'Voce e editor senior de carrosseis e diretor de arte. Avalie legibilidade, clareza, promessa exagerada, consistencia com marca, funcao de cada slide e qualidade visual. Responda somente JSON valido.',
          },
          {
            role: 'user',
            content: `Revise este carrossel antes da geracao final de imagens.\n\nPayload:\n${payload.slice(
              0,
              16000
            )}\n\nRetorne exatamente:\n{\n  "score": 0,\n  "verdict": "resumo curto do nivel editorial",\n  "issues": [\n    {"slide": 1, "severity": "low|medium|high", "issue": "problema", "suggestion": "correcao objetiva"}\n  ],\n  "strengths": ["ponto forte"]\n}\n\nSe estiver bom, issues pode ser vazio. Use pt-BR.`,
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

    return parseJsonPayload(content);
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
              'Voce e editor senior de carrosseis e diretor de arte. Corrija copy visual e prompts mantendo estrategia, ordem dos slides e identidade de marca. Responda somente JSON valido.',
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

    const parsed = parseJsonPayload(content);
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
    };
    this.recordCost(orgId, 'text', `Correção editorial: ${body.topic.slice(0, 80)}`, result.cost_estimate);
    return result;
  }

  startCarouselImageJob(
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

    const now = new Date().toISOString();
    const id = `carousel_job_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    const job: CarouselImageJob = {
      id,
      orgId,
      status: 'queued',
      total: normalizedSlides.length,
      completed: 0,
      failed: 0,
      createdAt: now,
      updatedAt: now,
      slides: normalizedSlides.map((slide) => ({
        slideIndex: slide.slideIndex,
        status: 'queued',
        request: slide.request!,
      })),
    };

    carouselImageJobs.set(id, job);
    void this.runCarouselImageJob(job);

    return this.publicCarouselImageJob(job);
  }

  getCarouselImageJob(orgId: string, id: string) {
    const job = carouselImageJobs.get(id);
    if (!job || job.orgId !== orgId) {
      throw new HttpException('Carousel image job not found', HttpStatus.NOT_FOUND);
    }

    return this.publicCarouselImageJob(job);
  }

  private publicCarouselImageJob(job: CarouselImageJob) {
    return {
      id: job.id,
      status: job.status,
      total: job.total,
      completed: job.completed,
      failed: job.failed,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      slides: job.slides.map((slide) => ({
        slideIndex: slide.slideIndex,
        status: slide.status,
        result: slide.result,
        error: slide.error,
        startedAt: slide.startedAt,
        completedAt: slide.completedAt,
      })),
    };
  }

  private async runCarouselImageJob(job: CarouselImageJob) {
    job.status = 'running';
    job.updatedAt = new Date().toISOString();

    const concurrency = Math.max(
      1,
      Math.min(4, Number(process.env.AI_GENERATE_JOB_CONCURRENCY || 2))
    );
    const queue = [...job.slides];
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length) {
        const slide = queue.shift();
        if (!slide) {
          return;
        }

        slide.status = 'running';
        slide.startedAt = new Date().toISOString();
        job.updatedAt = slide.startedAt;

        try {
          slide.result = await this.generateImage(job.orgId, slide.request);
          slide.status = 'completed';
          job.completed += 1;
        } catch (error: unknown) {
          slide.status = 'failed';
          slide.error =
            error instanceof HttpException
              ? String(error.getResponse())
              : error instanceof Error
              ? error.message
              : 'Image generation failed';
          job.failed += 1;
        } finally {
          slide.completedAt = new Date().toISOString();
          job.updatedAt = slide.completedAt;
        }
      }
    });

    await Promise.all(workers);
    job.status = job.failed === job.total ? 'failed' : 'completed';
    job.updatedAt = new Date().toISOString();

    const ttlMs = Number(process.env.AI_GENERATE_JOB_TTL_MS || 1000 * 60 * 60 * 6);
    setTimeout(() => carouselImageJobs.delete(job.id), ttlMs).unref?.();
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
