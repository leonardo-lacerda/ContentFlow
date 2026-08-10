import {
  URL,
  Video,
  VideoAbstract,
} from '@gitroom/nestjs-libraries/videos/video.interface';
import { ArrayMaxSize, IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { KieApiClient } from '@gitroom/nestjs-libraries/creative-engine/providers/kie/kie-api.client';

class Image {
  @IsString()
  id: string;

  @IsString()
  path: string;
}
class Veo3Params {
  @IsString()
  prompt: string;

  @Type(() => Image)
  @ValidateNested({ each: true })
  @IsArray()
  @ArrayMaxSize(3)
  images: Image[];
}

@Video({
  identifier: 'veo3',
  title: 'Veo3 (Audio + Video)',
  description: 'Generate videos with the most advanced video model.',
  placement: 'text-to-image',
  dto: Veo3Params,
  tools: [],
  trial: false,
  available: !!process.env.KIEAI_API_KEY,
})
export class Veo3 extends VideoAbstract<Veo3Params> {
  override dto = Veo3Params;

  constructor(private readonly kie: KieApiClient) {
    super();
  }

  async process(
    output: 'vertical' | 'horizontal',
    customParams: Veo3Params
  ): Promise<URL> {
    const result = await this.kie.generateVeo({
      prompt: customParams.prompt,
      imageUrls: customParams?.images?.map((p) => p.path) || [],
      model: process.env.CREATIVE_KIE_VIDEO_MODEL || 'veo3_fast',
      aspectRatio: output === 'horizontal' ? '16:9' : '9:16',
    });
    if (!result.url) throw new Error('Kie Veo returned no video URL');
    return result.url;
  }
}
