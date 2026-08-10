import { Global, Module } from '@nestjs/common';
import { ImagesSlides } from '@gitroom/nestjs-libraries/videos/images-slides/images.slides';
import { VideoManager } from '@gitroom/nestjs-libraries/videos/video.manager';
import { Veo3 } from '@gitroom/nestjs-libraries/videos/veo3/veo3';
import { KieApiClient } from '@gitroom/nestjs-libraries/creative-engine/providers/kie/kie-api.client';
import { KieCreativeProvider } from '@gitroom/nestjs-libraries/creative-engine/providers/kie/kie-creative.provider';

@Global()
@Module({
  providers: [ImagesSlides, Veo3, VideoManager, KieApiClient, KieCreativeProvider],
  get exports() {
    return this.providers;
  },
})
export class VideoModule {}
