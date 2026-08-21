import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { MediaRepository } from '@gitroom/nestjs-libraries/database/prisma/media/media.repository';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { Organization } from '@prisma/client';
import { SaveMediaInformationDto } from '@gitroom/nestjs-libraries/dtos/media/save.media.information.dto';
import { VideoManager } from '@gitroom/nestjs-libraries/videos/video.manager';
import { VideoDto } from '@gitroom/nestjs-libraries/dtos/videos/video.dto';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { SaveMediaCarouselDto } from '@gitroom/nestjs-libraries/dtos/media/save.media.carousel.dto';
import { SetCarouselLogoDto } from '@gitroom/nestjs-libraries/dtos/media/carousel-logo.dto';
import {
  AuthorizationActions,
  Sections,
  SubscriptionException,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import {
  CAROUSEL_PROJECT_METADATA_PREFIX,
  parseCarouselProjectMetadata,
} from '@gitroom/nestjs-libraries/database/prisma/media/media.repository';
import { CarouselImageCompositorService } from '@gitroom/nestjs-libraries/database/prisma/media/carousel-image-compositor.service';
import { isSafePublicHttpsUrl } from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';
import { ssrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
import {
  fetchBufferWithLimit,
  RemoteFetchError,
} from '@gitroom/nestjs-libraries/upload/bounded-fetch';

// Matches the pre-existing cap on the base64 carousel-image branch below.
const MAX_REMOTE_CAROUSEL_IMAGE_BYTES = 12 * 1024 * 1024;
const REMOTE_CAROUSEL_IMAGE_TIMEOUT_MS = 15_000;

@Injectable()
export class MediaService {
  private storage = UploadFactory.createStorage();

  constructor(
    private _mediaRepository: MediaRepository,
    private _openAi: OpenaiService,
    private _subscriptionService: SubscriptionService,
    private _videoManager: VideoManager,
    private _compositor: CarouselImageCompositorService
  ) {}

  async deleteMedia(org: string, id: string) {
    return this._mediaRepository.deleteMedia(org, id);
  }

  getMediaById(org: string, id: string) {
    return this._mediaRepository.getMediaById(org, id);
  }

  async generateImage(
    prompt: string,
    org: Organization,
    generatePromptFirst?: boolean
  ) {
    const generating = await this._subscriptionService.useCredit(
      org,
      'ai_images',
      async () => {
        if (generatePromptFirst) {
          prompt = await this._openAi.generatePromptForPicture(prompt);
          console.log('Prompt:', prompt);
        }
        return this._openAi.generateImage(prompt, !!generatePromptFirst);
      },
      createHash('sha256').update(`${prompt}:${!!generatePromptFirst}`).digest('hex')
    );

    return generating;
  }

  saveFile(
    org: string,
    fileName: string,
    filePath: string,
    originalName?: string
  ) {
    return this._mediaRepository.saveFile(
      org,
      fileName,
      filePath,
      originalName
    );
  }

  async saveCarousel(org: string, body: SaveMediaCarouselDto) {
    const title = (body.title || 'Carrossel gerado por IA').trim();
    const folderStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const folderName = `Carrossel: ${title} (${folderStamp})`;
    const images = [...body.images].sort((a, b) => a.index - b.index);
    const projectMetadata = body.projectMetadata?.trim();

    return Promise.all(
      images.map(async (item) => {
        const uploaded = await this.uploadCarouselImage(item.image, item.index);
        const saved = await this.saveFile(
          org,
          `carousel-slide-${String(item.index).padStart(2, '0')}-${
            uploaded.originalname
          }`,
          uploaded.path,
          folderName
        );

        const alt = [
          item.index === 1 &&
            projectMetadata &&
            `${CAROUSEL_PROJECT_METADATA_PREFIX}${projectMetadata}`,
          item.alt?.trim(),
        ]
          .filter(Boolean)
          .join('\n\n');

        if (alt) {
          return this.saveMediaInformation(org, {
            id: saved.id,
            alt,
          });
        }

        return saved;
      })
    );
  }

  /**
   * The frontend only ever holds the synthetic "carousel:<id1>:<id2>:..." id
   * `getMedia`'s grouping already produces - this parses it back into the
   * child Media ids without a second lookup by originalName.
   */
  private parseCarouselGroupId(groupId: string): string[] {
    const parts = groupId.split(':');
    if (parts[0] !== 'carousel' || parts.length < 2) {
      throw new BadRequestException('Invalid carousel group id');
    }
    return parts.slice(1);
  }

  private slugifyTitle(title: string): string {
    return (
      title
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'carrossel'
    );
  }

  async setCarouselLogo(org: string, body: SetCarouselLogoDto) {
    const childIds = this.parseCarouselGroupId(body.groupId);
    const logo = await this.resolveCarouselLogoConfig(org, body.logo);
    const result = await this._mediaRepository.setCarouselLogo(
      org,
      childIds,
      logo
    );
    if (!result) throw new NotFoundException('Carousel not found');
    return { ok: true };
  }

  /**
   * `logo.url` in the request body is client-supplied and must never be
   * trusted directly - it's later fetched server-side by
   * CarouselImageCompositorService with a deliberately unguarded fetch()
   * (see that file's comment), which only stays safe because every URL it
   * sees is guaranteed to be one this backend itself produced. The only
   * thing trusted from the client here is `mediaId`, and only after
   * confirming it's a media row this organization actually owns - the
   * stored `url` always comes from that row's own `path`, never from the
   * request body.
   */
  private async resolveCarouselLogoConfig(
    org: string,
    logo: SetCarouselLogoDto['logo']
  ) {
    if (!logo) return null;
    const media = await this._mediaRepository.getMediaById(org, logo.mediaId);
    if (!media) {
      throw new NotFoundException('Logo media not found');
    }
    return {
      mediaId: logo.mediaId,
      url: media.path,
      position: logo.position,
      x: logo.x,
      y: logo.y,
      widthPct: logo.widthPct,
      opacity: logo.opacity,
    };
  }

  /**
   * Resolves a carousel group and its current logo config (if any) in one
   * call, shared by both the single-slide and zip download paths so they
   * always agree on which logo is "current".
   */
  private async resolveCarouselForDownload(org: string, groupId: string) {
    const childIds = this.parseCarouselGroupId(groupId);
    const group = await this._mediaRepository.getCarouselGroup(org, childIds);
    if (!group.length) throw new NotFoundException('Carousel not found');
    const carrier = group.find((item) =>
      item.alt?.startsWith(CAROUSEL_PROJECT_METADATA_PREFIX)
    );
    const parsed = parseCarouselProjectMetadata(carrier?.alt);
    const metadata =
      parsed.projectMetadata && typeof parsed.projectMetadata === 'object'
        ? (parsed.projectMetadata as Record<string, unknown>)
        : {};
    const logo = (metadata.logo as any) || null;
    const title =
      (metadata.plan as any)?.title ||
      group[0]?.originalName?.replace(/^Carrossel:\s*/, '').replace(/\s*\([^)]*\)\s*$/, '') ||
      'Carrossel';
    return { group, logo, title: this.slugifyTitle(title) };
  }

  /**
   * Renders one slide (logo baked in if configured) and returns the bytes
   * plus a predictable filename. Always renders fresh from the untouched
   * original - never persists the composited result - so removing/changing
   * the logo later needs no cleanup of stale baked files.
   */
  async downloadCarouselSlide(org: string, groupId: string, mediaId: string) {
    const { group, logo, title } = await this.resolveCarouselForDownload(org, groupId);
    const index = group.findIndex((item) => item.id === mediaId);
    if (index < 0) throw new NotFoundException('Slide not found in this carousel');
    const buffer = await this._compositor.renderSlide(group[index].path, logo);
    return {
      buffer,
      filename: `${title}-slide-${String(index + 1).padStart(2, '0')}.png`,
    };
  }

  /**
   * Renders every slide (logo baked in if configured) for a zip download.
   * Returns the entries plus the archive's own filename; the controller owns
   * streaming them into a zip since it owns the HTTP response.
   */
  async renderCarouselForZip(org: string, groupId: string) {
    const { group, logo, title } = await this.resolveCarouselForDownload(org, groupId);
    const entries = await Promise.all(
      group.map(async (item, index) => ({
        filename: `${title}-slide-${String(index + 1).padStart(2, '0')}.png`,
        buffer: await this._compositor.renderSlide(item.path, logo),
      }))
    );
    return { title, entries };
  }

  streamZipTo(
    writeStream: NodeJS.WritableStream,
    entries: Array<{ filename: string; buffer: Buffer }>
  ) {
    return this._compositor.streamZip(writeStream, entries);
  }

  /**
   * A client-supplied `http(s)://` value here is fully attacker-controlled -
   * it must never be stored as `Media.path` verbatim (that value gets
   * fetched again, unguarded, at every later slide/zip download - see
   * CarouselImageCompositorService). Instead validate it against the same
   * public-HTTPS/no-private-IP guard used for every other user-supplied URL
   * in this codebase, download it server-side through the SSRF-safe
   * dispatcher with a size/time cap, and re-host the bytes through the
   * normal upload pipeline (magic-byte validated, same as the base64
   * branch below) so `Media.path` always ends up being our own trusted
   * storage URL, never a URL an attacker could point anywhere they choose.
   */
  private async fetchRemoteCarouselImage(url: string, index: number) {
    if (!(await isSafePublicHttpsUrl(url))) {
      throw new HttpException('Image URL is not allowed', 400);
    }

    let buffer: Buffer;
    let contentType: string | null;
    try {
      ({ buffer, contentType } = await fetchBufferWithLimit(url, {
        dispatcher: ssrfSafeDispatcher,
        maxBytes: MAX_REMOTE_CAROUSEL_IMAGE_BYTES,
        timeoutMs: REMOTE_CAROUSEL_IMAGE_TIMEOUT_MS,
        blockRedirects: true,
      }));
    } catch (err) {
      if (err instanceof RemoteFetchError) {
        throw new HttpException('Could not download image URL', 400);
      }
      throw err;
    }

    if (!buffer.length) {
      throw new HttpException('Invalid carousel image payload', 400);
    }

    const mimeType = (contentType || 'image/png').split(';')[0].trim();

    return this.storage.uploadFile({
      fieldname: 'file',
      originalname: `carousel-slide-${index}.png`,
      encoding: '7bit',
      mimetype: mimeType,
      size: buffer.length,
      buffer,
      stream: undefined as any,
      destination: '',
      filename: `carousel-slide-${index}.png`,
      path: '',
    } as any);
  }

  private async uploadCarouselImage(image: string, index: number) {
    const trimmedImage = image.trim();

    if (/^https?:\/\//i.test(trimmedImage)) {
      const uploaded = await this.fetchRemoteCarouselImage(trimmedImage, index);
      return {
        originalname:
          uploaded.originalname || `carousel-slide-${index}.png`,
        path: uploaded.path,
      };
    }

    const match = trimmedImage.match(
      /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/
    );
    const mimeType =
      match?.[1] === 'image/jpg' ? 'image/jpeg' : match?.[1] || 'image/png';
    const rawBase64 = match?.[2] || trimmedImage;
    const buffer = Buffer.from(rawBase64, 'base64');

    if (!buffer.length || buffer.length > 12 * 1024 * 1024) {
      throw new HttpException('Invalid carousel image payload', 400);
    }

    return this.storage.uploadFile({
      fieldname: 'file',
      originalname: `carousel-slide-${String(index).padStart(2, '0')}.png`,
      encoding: '7bit',
      mimetype: mimeType,
      size: buffer.length,
      buffer,
      stream: undefined as any,
      destination: '',
      filename: `carousel-slide-${String(index).padStart(2, '0')}.png`,
      path: '',
    });
  }

  getMedia(org: string, page: number, search?: string) {
    return this._mediaRepository.getMedia(org, page, search);
  }

  saveMediaInformation(org: string, data: SaveMediaInformationDto) {
    return this._mediaRepository.saveMediaInformation(org, data);
  }

  getVideoOptions() {
    return this._videoManager.getAllVideos();
  }

  async generateVideoAllowed(org: Organization, type: string) {
    const video = this._videoManager.getVideoByName(type);
    if (!video) {
      throw new Error(`Video type ${type} not found`);
    }

    if (!video.trial && org.isTrailing) {
      throw new HttpException('This video is not available in trial mode', 406);
    }

    return true;
  }

  async generateVideo(org: Organization, body: VideoDto) {
    const totalCredits = await this._subscriptionService.checkCredits(
      org,
      'ai_videos'
    );

    if (totalCredits.credits <= 0) {
      throw new SubscriptionException({
        action: AuthorizationActions.Create,
        section: Sections.VIDEOS_PER_MONTH,
      });
    }

    const video = this._videoManager.getVideoByName(body.type);
    if (!video) {
      throw new Error(`Video type ${body.type} not found`);
    }

    if (!video.trial && org.isTrailing) {
      throw new HttpException('This video is not available in trial mode', 406);
    }

    console.log(body.customParams);
    await video.instance.processAndValidate(body.customParams);
    console.log('no err');

    return await this._subscriptionService.useCredit(
      org,
      'ai_videos',
      async () => {
        const loadedData = await video.instance.process(
          body.output,
          body.customParams
        );

        const file = await this.storage.uploadSimple(loadedData);
        return this.saveFile(org.id, file.split('/').pop(), file);
      },
      createHash('sha256').update(JSON.stringify({ type: body.type, output: body.output, customParams: body.customParams })).digest('hex')
    );
  }

  async videoFunction(identifier: string, functionName: string, body: any) {
    const video = this._videoManager.getVideoByName(identifier);
    if (!video) {
      throw new Error(`Video with identifier ${identifier} not found`);
    }

    // @ts-ignore
    const functionToCall = video.instance[functionName];
    if (
      typeof functionToCall !== 'function' ||
      this._videoManager.checkAvailableVideoFunction(functionToCall)
    ) {
      throw new HttpException(
        `Function ${functionName} not found on video instance`,
        400
      );
    }

    return functionToCall(body);
  }
}
