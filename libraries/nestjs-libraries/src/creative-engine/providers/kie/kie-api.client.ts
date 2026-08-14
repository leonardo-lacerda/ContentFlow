import { Injectable, Logger } from '@nestjs/common';
import { KieSeedanceInput, KieTaskHandle, KieTaskResult, KieVeoInput } from './kie.types';

type JsonRecord = Record<string, any>;

const TERMINAL_SUCCESS = new Set(['succeeded', 'completed', 'ready', 'success', 'done', 'finished']);
const TERMINAL_FAILURE = new Set(['failed', 'error', 'cancelled', 'canceled', 'rejected', 'expired']);

const KIE_GPT_IMAGE_ASPECT_RATIOS = [
  { value: '1:1', ratio: 1 },
  { value: '3:2', ratio: 3 / 2 },
  { value: '2:3', ratio: 2 / 3 },
] as const;

export const normalizeKieGptImageAspectRatio = (value?: string) => {
  const normalized = String(value || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!normalized) return '2:3';
  if (normalized === 'square') return '1:1';

  const match = normalized.match(/^(\d+(?:\.\d+)?)(?::|x)(\d+(?:\.\d+)?)$/);
  if (!match) return '2:3';
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height) return '2:3';
  const ratio = width / height;

  return KIE_GPT_IMAGE_ASPECT_RATIOS.reduce((closest, candidate) =>
    Math.abs(candidate.ratio - ratio) < Math.abs(closest.ratio - ratio)
      ? candidate
      : closest
  ).value;
};

// GPT Image 2 (Kie market model gpt-image-2-*) accepts a much wider set of
// aspect ratios natively than 1.5 did, including 4:5 — the exact ratio the
// Studio carousel design uses, which used to get lossily snapped to 2:3 under
// the 1.5 client. Source: https://docs.kie.ai/market/gpt/gpt-image-2-text-to-image
const KIE_GPT_IMAGE_2_ASPECT_RATIOS = [
  { value: '1:1', ratio: 1 },
  { value: '3:2', ratio: 3 / 2 },
  { value: '2:3', ratio: 2 / 3 },
  { value: '4:3', ratio: 4 / 3 },
  { value: '3:4', ratio: 3 / 4 },
  { value: '5:4', ratio: 5 / 4 },
  { value: '4:5', ratio: 4 / 5 },
  { value: '16:9', ratio: 16 / 9 },
  { value: '9:16', ratio: 9 / 16 },
  { value: '2:1', ratio: 2 },
  { value: '1:2', ratio: 1 / 2 },
  { value: '3:1', ratio: 3 },
  { value: '1:3', ratio: 1 / 3 },
  { value: '21:9', ratio: 21 / 9 },
  { value: '9:21', ratio: 9 / 21 },
] as const;

export const normalizeKieGptImage2AspectRatio = (value?: string) => {
  const normalized = String(value || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!normalized || normalized === 'auto') return 'auto';
  if (normalized === 'square') return '1:1';

  const match = normalized.match(/^(\d+(?:\.\d+)?)(?::|x)(\d+(?:\.\d+)?)$/);
  if (!match) return 'auto';
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height) return 'auto';
  const ratio = width / height;

  return KIE_GPT_IMAGE_2_ASPECT_RATIOS.reduce((closest, candidate) =>
    Math.abs(candidate.ratio - ratio) < Math.abs(closest.ratio - ratio)
      ? candidate
      : closest
  ).value;
};

@Injectable()
export class KieApiClient {
  private readonly logger = new Logger(KieApiClient.name);
  private readonly baseUrl = (process.env.CREATIVE_KIE_BASE_URL || 'https://api.kie.ai').replace(/\/$/, '');

  isConfigured() {
    return process.env.CREATIVE_KIE_ENABLED !== 'false' && Boolean(process.env.KIEAI_API_KEY);
  }

  async generateVeo(input: KieVeoInput): Promise<KieTaskResult> {
    this.assertConfigured();
    const model = input.model || process.env.CREATIVE_KIE_VIDEO_MODEL || 'veo3_fast';
    const payload: JsonRecord = {
      prompt: input.prompt,
      imageUrls: input.imageUrls || [],
      model,
      aspect_ratio: input.aspectRatio || '9:16',
      ...((input.callbackUrl || process.env.CREATIVE_KIE_CALLBACK_URL) ? { callBackUrl: input.callbackUrl || process.env.CREATIVE_KIE_CALLBACK_URL } : {}),
      ...(input.generateAudio !== undefined ? { generate_audio: input.generateAudio } : {}),
      ...(input.generationType ? { generationType: input.generationType } : {}),
      ...(input.watermark ? { watermark: input.watermark } : {}),
      ...(input.durationSec ? { duration: input.durationSec } : {}),
    };
    const response = await this.request<JsonRecord>('/api/v1/veo/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const taskId = this.extractTaskId(response);
    if (!taskId) throw new Error('Kie Veo returned no taskId');
    return this.waitForTask({ taskId, endpoint: 'veo', model });
  }

  async generateSeedance(model: string, input: KieSeedanceInput): Promise<KieTaskResult> {
    return this.createMarketTask(model, {
      prompt: input.prompt,
      first_frame_url: input.imageUrls?.[0],
      last_frame_url: input.imageUrls?.[1],
      reference_image_urls: input.imageUrls || [],
      reference_video_urls: input.videoUrls || [],
      reference_audio_urls: input.audioUrls || [],
      generate_audio: input.generateAudio !== false,
      resolution: input.resolution || process.env.CREATIVE_KIE_SEEDANCE_RESOLUTION || '720p',
      aspect_ratio: input.aspectRatio || '9:16',
      duration: input.durationSec || 5,
      output_format: 'mp4',
      nsfw_checker: true,
    });
  }

  async createMarketTask(model: string, input: JsonRecord, callbackUrl?: string, endpoint = '/api/v1/jobs/createTask'): Promise<KieTaskResult> {
    this.assertConfigured();
    const response = await this.request<JsonRecord>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        model,
        input,
        ...((callbackUrl || process.env.CREATIVE_KIE_CALLBACK_URL) ? { callBackUrl: callbackUrl || process.env.CREATIVE_KIE_CALLBACK_URL } : {}),
      }),
    });
    const taskId = this.extractTaskId(response);
    if (!taskId) throw new Error(`Kie model ${model} returned no taskId`);
    return this.waitForTask({ taskId, endpoint: endpoint.toLowerCase().includes('gpt4o-image') ? 'image' : 'market', model });
  }

  async generateImage(model: string, input: { prompt: string; imageUrls?: string[]; aspectRatio?: string; size?: string }) {
    const endpoint = process.env.CREATIVE_KIE_IMAGE_ENDPOINT || '/api/v1/jobs/createTask';
    if (!endpoint.toLowerCase().includes('gpt4o-image')) {
      const imageUrls = (input.imageUrls || []).filter(Boolean);
      const resolvedModel = this.resolveMarketImageModel(model, imageUrls.length > 0);
      const isGptImage15 = resolvedModel.startsWith('gpt-image/1.5-');
      const isGptImage2 = resolvedModel.startsWith('gpt-image-2-');
      const marketInput: JsonRecord = isGptImage15
        ? {
            prompt: input.prompt,
            ...(imageUrls.length ? { input_urls: imageUrls } : {}),
            aspect_ratio: normalizeKieGptImageAspectRatio(input.aspectRatio),
            quality: process.env.CREATIVE_KIE_IMAGE_QUALITY || 'medium',
          }
        : isGptImage2
          ? {
              prompt: input.prompt,
              ...(imageUrls.length ? { input_urls: imageUrls } : {}),
              aspect_ratio: normalizeKieGptImage2AspectRatio(input.aspectRatio),
              ...(process.env.CREATIVE_KIE_IMAGE_RESOLUTION ? { resolution: process.env.CREATIVE_KIE_IMAGE_RESOLUTION } : {}),
            }
          : {
              prompt: input.prompt,
              ...(imageUrls.length ? { image_urls: imageUrls } : {}),
              aspect_ratio: input.aspectRatio || '9:16',
              ...(input.size ? { size: input.size } : {}),
            };
      return this.createMarketTask(resolvedModel, marketInput, undefined, endpoint);
    }
    this.assertConfigured();
    const response = await this.request<JsonRecord>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        filesUrl: input.imageUrls || [],
        prompt: input.prompt,
        size: input.size || input.aspectRatio || '1024x1024',
        ...(process.env.CREATIVE_KIE_CALLBACK_URL ? { callBackUrl: process.env.CREATIVE_KIE_CALLBACK_URL } : {}),
      }),
    });
    const taskId = this.extractTaskId(response);
    if (!taskId) throw new Error(`Kie image model ${model} returned no taskId`);
    return this.waitForTask({ taskId, endpoint: 'image', model });
  }

  private resolveMarketImageModel(model: string, hasReferences: boolean) {
    const normalized = String(model || '').trim().toLowerCase();
    // Only an explicit "1.5" request still resolves to the 1.5 contract.
    if (
      normalized === 'gpt-image-1.5' ||
      normalized === 'gpt-image/1.5-text-to-image' ||
      normalized === 'gpt-image/1.5-image-to-image'
    ) {
      return hasReferences
        ? 'gpt-image/1.5-image-to-image'
        : 'gpt-image/1.5-text-to-image';
    }
    // Empty/generic aliases default to GPT Image 2 — the current default.
    if (
      !normalized ||
      normalized === 'gpt-image-1' ||
      normalized === 'gpt-image-2' ||
      normalized === 'gpt-image-2-text-to-image' ||
      normalized === 'gpt-image-2-image-to-image'
    ) {
      return hasReferences
        ? 'gpt-image-2-image-to-image'
        : 'gpt-image-2-text-to-image';
    }
    return model;
  }

  async getTask(taskId: string, endpoint: 'veo' | 'market' | 'image' = 'market') {
    this.assertConfigured();
    const path = endpoint === 'veo'
      ? `/api/v1/veo/record-info?taskId=${encodeURIComponent(taskId)}`
      : endpoint === 'image'
        ? `/api/v1/gpt4o-image/record-info?taskId=${encodeURIComponent(taskId)}`
        : `/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`;
    return this.request<JsonRecord>(path, { method: 'GET' }, [400]);
  }

  async cancelTask(taskId: string, endpoint: 'veo' | 'market' | 'image' = 'market') {
    this.assertConfigured();
    const path = endpoint === 'veo'
      ? `/api/v1/veo/cancel?taskId=${encodeURIComponent(taskId)}`
      : endpoint === 'image'
        ? `/api/v1/gpt4o-image/cancel?taskId=${encodeURIComponent(taskId)}`
        : `/api/v1/jobs/cancelTask?taskId=${encodeURIComponent(taskId)}`;
    const response = await this.request<JsonRecord>(path, { method: 'POST' });
    return response;
  }

  private async waitForTask(handle: KieTaskHandle): Promise<KieTaskResult> {
    const attempts = Math.min(360, Math.max(1, Number(process.env.CREATIVE_KIE_MAX_POLL_ATTEMPTS || 180)));
    const intervalMs = Math.min(30000, Math.max(250, Number(process.env.CREATIVE_KIE_POLL_INTERVAL_MS || 5000)));
    let lastStatus = 'queued';

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (attempt > 0) await this.delay(intervalMs);
      const response = await this.getTask(handle.taskId, handle.endpoint);
      const result = this.parseTaskResult(handle.taskId, response);
      lastStatus = result.status;
      if (result.url || result.audioUrl || result.translatedText || TERMINAL_SUCCESS.has(result.status)) {
        if (!result.url && !result.audioUrl && !result.translatedText) {
          throw new Error(`Kie task ${handle.taskId} completed without an output`);
        }
        return result;
      }
      if (TERMINAL_FAILURE.has(result.status)) {
        throw new Error(`Kie task ${handle.taskId} failed with status ${result.status}`);
      }
    }

    throw new Error(`Kie task ${handle.taskId} timed out after ${attempts} polls (last status: ${lastStatus})`);
  }

  private parseTaskResult(taskId: string, response: JsonRecord): KieTaskResult {
    const root = response?.data ?? response;
    const status = this.findStatus(root) || this.findStatus(response) || 'queued';
    // /api/v1/jobs/recordInfo (the "market" createTask family — nano-banana,
    // seedance, kling, etc.) reports its output as `resultJson`, a
    // JSON-*encoded string* like '{"resultUrls":["https://..."]}', not a
    // nested object. findUrl only ever recurses into objects/arrays, so
    // without parsing this first every successful job on this endpoint read
    // as "completed without an output" — the provider had already returned
    // the asset and billed for it, and the app discarded it.
    const searchRoot = this.withParsedResultJson(root);
    const url = this.findUrl(searchRoot, ['video', 'image', 'output', 'result', 'url']);
    const audioUrl = this.findUrl(searchRoot, ['audio', 'audioUrl', 'audio_url', 'sound']);
    const thumbnailUrl = this.findUrl(searchRoot, ['thumbnail', 'thumbnailUrl', 'cover', 'coverUrl']);
    const translatedText = this.findText(searchRoot);
    return { taskId, status, url, audioUrl, thumbnailUrl, translatedText, raw: response };
  }

  private withParsedResultJson(root: unknown): JsonRecord {
    if (!root || typeof root !== 'object') return (root as JsonRecord) || {};
    const object = root as JsonRecord;
    const raw = object.resultJson;
    if (typeof raw !== 'string' || !raw.trim()) return object;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? { ...object, ...parsed } : object;
    } catch {
      return object;
    }
  }

  private findStatus(value: unknown): string | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const object = value as JsonRecord;
    for (const candidate of [object.status, object.state, object.taskStatus, object.task?.status, object.response?.status, object.output?.status]) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim().toLowerCase();
    }
    return undefined;
  }

  private findText(value: unknown): string | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const object = value as JsonRecord;
    for (const candidate of [object.translatedText, object.translated_text, object.text, object.output?.translatedText, object.response?.translatedText]) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
    return undefined;
  }

  private findUrl(value: unknown, preferredKeys: string[]): string | undefined {
    const visited = new Set<unknown>();
    const walk = (current: unknown, depth: number): string | undefined => {
      if (!current || depth > 7 || visited.has(current)) return undefined;
      if (typeof current === 'string' && /^https?:\/\//i.test(current)) return current;
      if (typeof current !== 'object') return undefined;
      visited.add(current);
      const object = current as JsonRecord;
      for (const key of preferredKeys) {
        const candidate = object[key];
        const found = Array.isArray(candidate)
          ? candidate.map((item) => walk(item, depth + 1)).find(Boolean)
          : walk(candidate, depth + 1);
        if (found) return found;
      }
      for (const [key, candidate] of Object.entries(object)) {
        if (/url|uri|result|output|response|data|file|media|audio|video|image|cover/i.test(key)) {
          const found = Array.isArray(candidate)
            ? candidate.map((item) => walk(item, depth + 1)).find(Boolean)
            : walk(candidate, depth + 1);
          if (found) return found;
        }
      }
      return undefined;
    };
    return walk(value, 0);
  }

  private extractTaskId(response: JsonRecord) {
    const candidates = [
      response?.data?.taskId,
      response?.data?.task_id,
      response?.data?.id,
      response?.taskId,
      response?.task_id,
      response?.id,
    ];
    const taskId = candidates.find((value) => typeof value === 'string' && value.trim());
    return taskId ? String(taskId) : undefined;
  }

  private async request<T>(path: string, init: RequestInit, allowedCodes: number[] = []): Promise<T> {
    const timeout = Number(process.env.CREATIVE_KIE_REQUEST_TIMEOUT_MS || process.env.CREATIVE_PROVIDER_TIMEOUT_MS || 120000);
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.KIEAI_API_KEY || ''}`,
        ...(init.headers || {}),
      },
      signal: AbortSignal.timeout(timeout),
    });
    const body = await response.text();
    let parsed: T;
    try {
      parsed = (body ? JSON.parse(body) : {}) as T;
    } catch {
      throw new Error(`Kie returned invalid JSON (${response.status})`);
    }
    if (!response.ok) {
      const message = typeof parsed === 'object' && parsed ? (parsed as JsonRecord).msg || (parsed as JsonRecord).message : body;
      throw new Error(`Kie request failed (${response.status}): ${String(message || body).slice(0, 500)}`);
    }
    const code = typeof parsed === 'object' && parsed ? Number((parsed as JsonRecord).code || 0) : 0;
    if (code >= 400 && !allowedCodes.includes(code)) throw new Error(`Kie request failed (${code}): ${String((parsed as JsonRecord).msg || 'unknown error').slice(0, 500)}`);
    return parsed;
  }

  private assertConfigured() {
    if (!this.isConfigured()) throw new Error('Kie.ai is not configured; set KIEAI_API_KEY and CREATIVE_KIE_ENABLED=true');
  }

  private async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
