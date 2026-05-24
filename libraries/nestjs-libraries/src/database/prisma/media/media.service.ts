import { HttpException, Injectable } from '@nestjs/common';
import { MediaRepository } from '@gitroom/nestjs-libraries/database/prisma/media/media.repository';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { Organization } from '@prisma/client';
import { SaveMediaInformationDto } from '@gitroom/nestjs-libraries/dtos/media/save.media.information.dto';
import { VideoManager } from '@gitroom/nestjs-libraries/videos/video.manager';
import { VideoDto } from '@gitroom/nestjs-libraries/dtos/videos/video.dto';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { SaveMediaCarouselDto } from '@gitroom/nestjs-libraries/dtos/media/save.media.carousel.dto';
import {
  AuthorizationActions,
  Sections,
  SubscriptionException,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';

export const CAROUSEL_PROJECT_METADATA_PREFIX =
  '__CONTENTFLOW_CAROUSEL_PROJECT__:';

@Injectable()
export class MediaService {
  private storage = UploadFactory.createStorage();

  constructor(
    private _mediaRepository: MediaRepository,
    private _openAi: OpenaiService,
    private _subscriptionService: SubscriptionService,
    private _videoManager: VideoManager
  ) {}

  async deleteMedia(org: string, id: string) {
    return this._mediaRepository.deleteMedia(org, id);
  }

  getMediaById(id: string) {
    return this._mediaRepository.getMediaById(id);
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
      }
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

  private async uploadCarouselImage(image: string, index: number) {
    const trimmedImage = image.trim();

    if (/^https?:\/\//i.test(trimmedImage)) {
      const file = trimmedImage;
      return {
        originalname: file.split('/').pop() || `carousel-slide-${index}.png`,
        path: file,
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
      }
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
