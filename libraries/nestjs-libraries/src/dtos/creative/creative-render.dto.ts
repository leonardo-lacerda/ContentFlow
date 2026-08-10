import { IsString } from 'class-validator';
import { CreativeGenerateVariantDto } from './creative-generation.dto';

export class CreativePublicRenderDto extends CreativeGenerateVariantDto {
  @IsString()
  projectId!: string;
}
