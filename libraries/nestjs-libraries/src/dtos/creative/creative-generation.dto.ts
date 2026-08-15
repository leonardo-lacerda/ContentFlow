import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

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

export class CreativeCarouselSlideDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  index?: number;

  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  cta?: string;

  @IsString()
  imagePrompt!: string;

  @IsOptional()
  @IsIn(['9:16', '1:1', '16:9', '4:5'])
  aspectRatio?: string;
}

export class CreativeGenerateCarouselDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  brief?: string;

  @IsOptional()
  @IsIn(['9:16', '1:1', '16:9', '4:5'])
  aspectRatio?: string;

  @IsOptional()
  @IsObject()
  designSpec?: Record<string, unknown>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreativeCarouselSlideDto)
  slides!: CreativeCarouselSlideDto[];

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  // The click that reaches this endpoint already carries the user's explicit
  // approval (this is the follow-up to the copy/design approval step); the
  // flag mirrors the "confirmed=true" gate the rest of the credit-consuming
  // Creative Engine operations use, so a stray/duplicate request is rejected
  // instead of silently spending credits.
  @IsBoolean()
  confirmed!: boolean;
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

// One generated slide image belonging to a Studio chat carousel card.
// Every field is decorated on purpose: an undecorated class-validator field is
// still emitted by swc and whitelist-validation then rejects the whole request.
export class StudioCarouselImageItemDto {
  @IsString()
  slideId!: string;

  @IsString()
  imageUrl!: string;
}

export class SaveStudioCarouselImagesDto {
  @IsString()
  cardKey!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudioCarouselImageItemDto)
  images!: StudioCarouselImageItemDto[];
}
