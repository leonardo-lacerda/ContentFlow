import { Injectable, Logger } from '@nestjs/common';
import { KieSeedanceInput, KieTaskHandle, KieTaskResult, KieVeoInput } from './kie.types';

type JsonRecord = Record<string, any>;

const TERMINAL_SUCCESS = new Set(['succeeded', 'completed', 'ready', 'success', 'done', 'finished']);
const TERMINAL_FAILURE = new Set(['failed', 'error', 'cancelled', 'canceled', 'rejected', 'expired']);

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
      return this.createMarketTask(model, {
        prompt: input.prompt,
        image_urls: input.imageUrls || [],
        aspect_ratio: input.aspectRatio || '9:16',
        size: input.size,
      }, undefined, endpoint);
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
    const url = this.findUrl(root, ['video', 'image', 'output', 'result', 'url']);
    const audioUrl = this.findUrl(root, ['audio', 'audioUrl', 'audio_url', 'sound']);
    const thumbnailUrl = this.findUrl(root, ['thumbnail', 'thumbnailUrl', 'cover', 'coverUrl']);
    const translatedText = this.findText(root);
    return { taskId, status, url, audioUrl, thumbnailUrl, translatedText, raw: response };
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
