import { BadRequestException, Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { isSafePublicHttpsUrl } from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';
import { ssrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
import { readCreativeLocalUpload } from './creative-local-media';
import { CreativeCapability, CreativeProviderOutput } from './creative-engine.types';

const MAX_OUTPUT_BYTES = 1024 * 1024 * 1024;

@Injectable()
export class CreativeOutputStorageService {
  private readonly storage = UploadFactory.createStorage();

  async persist(output: CreativeProviderOutput, context: { jobId: string; capability: CreativeCapability }) {
    const sourceUrls = [output.url, output.audioUrl, output.thumbnailUrl].filter((value): value is string => Boolean(value));
    if (!sourceUrls.length) return output;

    const persisted = new Map<string, string>();
    for (const sourceUrl of sourceUrls) {
      if (await readCreativeLocalUpload(sourceUrl) || this.isOwnedUrl(sourceUrl)) {
        persisted.set(sourceUrl, sourceUrl);
        continue;
      }
      const downloaded = await this.download(sourceUrl);
      const extension = this.extension(downloaded.contentType, sourceUrl);
      const filename = `creative-${context.jobId}-${persisted.size}.${extension}`;
      const uploaded = await this.storage.uploadFile({
        buffer: downloaded.buffer,
        mimetype: downloaded.contentType,
        size: downloaded.buffer.length,
        path: '',
        fieldname: 'creative-provider-output',
        destination: '',
        stream: Readable.from(downloaded.buffer),
        filename,
        originalname: filename,
        encoding: '7bit',
      });
      const destination = String(uploaded.path || '');
      if (!destination) throw new BadRequestException('Creative storage returned no output URL');
      persisted.set(sourceUrl, destination);
    }

    const metadata = {
      ...(output.metadata || {}),
      storage: 'contentflow',
      importedAt: new Date().toISOString(),
      sourceUrls,
    };
    return {
      ...output,
      url: output.url ? persisted.get(output.url) || output.url : undefined,
      audioUrl: output.audioUrl ? persisted.get(output.audioUrl) || output.audioUrl : undefined,
      thumbnailUrl: output.thumbnailUrl ? persisted.get(output.thumbnailUrl) || output.thumbnailUrl : undefined,
      metadata,
    };
  }

  private async download(url: string) {
    const local = await readCreativeLocalUpload(url);
    if (local) return { ...local, buffer: local.buffer };
    if (!(await isSafePublicHttpsUrl(url))) throw new BadRequestException('Provider output must be a public HTTPS URL or a ContentFlow upload');
    const response = await fetch(url, {
      // @ts-expect-error undici dispatcher is supported by the runtime fetch implementation.
      dispatcher: ssrfSafeDispatcher,
      signal: AbortSignal.timeout(Number(process.env.CREATIVE_OUTPUT_DOWNLOAD_TIMEOUT_MS || 120000)),
    });
    if (!response.ok) throw new BadRequestException(`Unable to import creative provider output (${response.status})`);
    const length = Number(response.headers.get('content-length') || 0);
    if (length > MAX_OUTPUT_BYTES) throw new BadRequestException('Creative provider output is too large');
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_OUTPUT_BYTES) throw new BadRequestException('Creative provider output is too large');
    return { buffer, contentType: (response.headers.get('content-type') || 'application/octet-stream').split(';')[0] };
  }

  private isOwnedUrl(value: string) {
    const candidates = [process.env.FRONTEND_URL, process.env.CLOUDFLARE_BUCKET_URL]
      .filter((item): item is string => Boolean(item));
    try {
      const origin = new URL(value).origin;
      return candidates.some((candidate) => {
        try { return new URL(candidate).origin === origin; } catch { return false; }
      });
    } catch {
      return false;
    }
  }

  private extension(contentType: string, url: string) {
    const byMime: Record<string, string> = {
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/wav': 'wav',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'application/x-subrip': 'srt',
      'text/vtt': 'vtt',
    };
    if (byMime[contentType.toLowerCase()]) return byMime[contentType.toLowerCase()];
    try {
      const suffix = new URL(url).pathname.split('.').pop()?.toLowerCase();
      return suffix && /^[a-z0-9]{1,8}$/.test(suffix) ? suffix : 'bin';
    } catch {
      return 'bin';
    }
  }
}
