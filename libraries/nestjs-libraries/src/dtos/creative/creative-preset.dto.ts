import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const PRESET_CAPABILITIES = [
  'image-generation',
  'video-generation',
  'talking-actor',
  'lip-sync',
  'b-roll',
] as const;

export class CreativePresetRunDto {
  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsString()
  voiceId?: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsString()
  targetLanguage?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productAssetIds?: string[];

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsIn(PRESET_CAPABILITIES)
  capability?: (typeof PRESET_CAPABILITIES)[number];

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsIn(['9:16', '1:1', '16:9', '4:5'])
  aspectRatio?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(180)
  durationSec?: number;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
