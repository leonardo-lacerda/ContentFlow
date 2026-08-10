import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const CAPABILITIES = [
  'image-generation',
  'video-generation',
  'talking-actor',
  'text-to-speech',
  'translation',
  'lip-sync',
  'captions',
  'b-roll',
  'actor-replacement',
] as const;

export class CreativeQuoteDto {
  @IsOptional()
  @IsIn(CAPABILITIES)
  capability?: (typeof CAPABILITIES)[number];

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsString()
  voiceId?: string;

  @IsOptional()
  @IsString()
  scriptId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productAssetIds?: string[];

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  aspectRatio?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(180)
  durationSec?: number;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;
}

export class CreativeGenerateVariantDto extends CreativeQuoteDto {
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class CreativeGenerateImageDto {
  @IsString()
  prompt!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['9:16', '1:1', '16:9', '4:5'])
  aspectRatio?: string;

  @IsOptional()
  productAssetIds?: string[];
}

export class CreativeVariantMatrixDto {
  @IsOptional()
  @IsIn(CAPABILITIES)
  capability?: (typeof CAPABILITIES)[number];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actorIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  voiceIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(['9:16', '1:1', '16:9', '4:5'], { each: true })
  aspectRatios?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prompts?: string[];

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxItems?: number;
}

export class CreativeVariantMatrixGenerateDto extends CreativeVariantMatrixDto {
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class CreativeLocalizeVariantDto {
  @IsString()
  targetLanguage!: string;

  @IsOptional()
  @IsIn(CAPABILITIES)
  capability?: (typeof CAPABILITIES)[number];

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
