import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import { zipSync, strToU8 } from 'fflate';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import {
  isSafePublicHttpsUrl,
} from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';
import { ssrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
import { readCreativeLocalUpload } from './creative-local-media';

const MAX_MEDIA_BYTES = 512 * 1024 * 1024;
const MAX_EXPORT_BYTES = 1024 * 1024 * 1024;

export interface CreativeExportResult {
  url: string;
  filename: string;
  mimeType: 'application/zip';
  fileCount: number;
  skippedMedia: string[];
  sha256: string;
  expiresAt: string | null;
}

@Injectable()
export class CreativeExportService {
  private readonly storage = UploadFactory.createStorage();

  constructor(private readonly prisma: PrismaService) {}

  async exportProject(organizationId: string, projectId: string): Promise<CreativeExportResult> {
    const project = await this.prisma.creativeProject.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
      include: {
        assets: true,
        products: true,
        actors: true,
        scripts: { include: { scenes: true } },
        variants: true,
        publications: true,
        jobs: true,
        reviews: true,
        provenance: true,
      },
    });
    if (!project) throw new NotFoundException('Creative project not found');
    const voiceIds = [...new Set((project.variants || []).map((variant: any) => variant.voiceId).filter(Boolean))];
    const voices = voiceIds.length
      ? await this.prisma.creativeVoice.findMany({ where: { organizationId, id: { in: voiceIds } } })
      : [];
    const rights = await this.prisma.creativeRightsGrant.findMany({
      where: { organizationId, resourceId: { in: [project.id, ...project.assets.map((asset) => asset.id), ...project.actors.map((actor) => actor.id), ...voiceIds] } },
    });
    const snapshot = {
      ...(this.serialize(project) as Record<string, unknown>),
      voices: this.serialize(voices),
      rights: this.serialize(rights),
    };

    const files: Record<string, Uint8Array> = {
      'manifest.json': this.json({
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        projectId: project.id,
        organizationId,
        included: ['project', 'assets', 'products', 'actors', 'voices', 'scripts', 'variants', 'publications', 'jobs', 'reviews', 'rights', 'provenance', 'public-media'],
      }),
      'project.json': this.json(snapshot),
    };
    const skippedMedia: string[] = [];
    const mediaCandidates = this.collectMedia(project, voices);
    let totalBytes = 0;

    for (const [index, candidate] of mediaCandidates.entries()) {
      const local = await readCreativeLocalUpload(candidate.url);
      if (!local && !(await isSafePublicHttpsUrl(candidate.url))) {
        skippedMedia.push(candidate.url);
        continue;
      }
      const downloaded = await this.download(candidate.url);
      totalBytes += downloaded.buffer.length;
      if (totalBytes > MAX_EXPORT_BYTES) {
        throw new BadRequestException('Creative export exceeds the 1 GB media limit');
      }
      const extension = this.extension(downloaded.contentType, candidate.url);
      files[`media/${String(index + 1).padStart(4, '0')}-${this.slug(candidate.label)}.${extension}`] = downloaded.buffer;
    }

    const archive = Buffer.from(zipSync(files, { level: 6 }));
    const filename = `contentflow-creative-${this.slug(project.name)}-${project.id.slice(0, 8)}.zip`;
    const sha256 = createHash('sha256').update(archive).digest('hex');
    const uploaded = await this.storage.uploadFile({
      buffer: archive,
      mimetype: 'application/zip',
      size: archive.length,
      path: '',
      fieldname: 'creative-export',
      destination: '',
      stream: Readable.from(archive),
      filename,
      originalname: filename,
      encoding: '7bit',
    });

    return {
      url: String(uploaded.path || ''),
      filename,
      mimeType: 'application/zip',
      fileCount: Object.keys(files).length,
      skippedMedia,
      sha256,
      expiresAt: null,
    };
  }

  private collectMedia(project: any, voices: any[] = []): Array<{ url: string; label: string }> {
    const candidates: Array<{ url: string; label: string }> = [];
    const add = (url: unknown, label: string) => {
      if (typeof url === 'string' && url.trim()) candidates.push({ url: url.trim(), label });
    };
    for (const asset of project.assets || []) {
      add(asset.url, `asset-${asset.id}`);
      add(asset.thumbnailUrl, `asset-${asset.id}-thumbnail`);
    }
    for (const actor of project.actors || []) {
      add(actor.imageUrl, `actor-${actor.id}`);
      add(actor.previewUrl, `actor-${actor.id}-preview`);
    }
    for (const voice of voices) add(voice.previewUrl, `voice-${voice.id}`);
    for (const variant of project.variants || []) {
      add(variant.videoUrl, `variant-${variant.id}`);
      add(variant.thumbnailUrl, `variant-${variant.id}-thumbnail`);
      add(variant.captionsUrl, `variant-${variant.id}-captions`);
    }
    return candidates;
  }

  private async download(url: string): Promise<{ buffer: Buffer; contentType: string }> {
    const local = await readCreativeLocalUpload(url);
    if (local) return local;
    const response = await fetch(url, {
      // @ts-expect-error undici dispatcher is supported by the runtime fetch implementation.
      dispatcher: ssrfSafeDispatcher,
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) throw new BadRequestException(`Unable to download export media (${response.status})`);
    const length = Number(response.headers.get('content-length') || 0);
    if (length > MAX_MEDIA_BYTES) throw new BadRequestException('Export media file is too large');
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_MEDIA_BYTES) throw new BadRequestException('Export media file is too large');
    return { buffer, contentType: response.headers.get('content-type') || 'application/octet-stream' };
  }

  private json(value: unknown): Uint8Array {
    return strToU8(JSON.stringify(value, null, 2));
  }

  private serialize(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value));
  }

  private slug(value: string): string {
    return String(value || 'creative')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'creative';
  }

  private extension(contentType: string, url: string): string {
    const normalized = contentType.split(';')[0].trim().toLowerCase();
    const byMime: Record<string, string> = {
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'application/x-subrip': 'srt',
      'text/plain': 'txt',
    };
    if (byMime[normalized]) return byMime[normalized];
    const suffix = new URL(url).pathname.split('.').pop()?.toLowerCase();
    return suffix && /^[a-z0-9]{1,8}$/.test(suffix) ? suffix : 'bin';
  }
}
