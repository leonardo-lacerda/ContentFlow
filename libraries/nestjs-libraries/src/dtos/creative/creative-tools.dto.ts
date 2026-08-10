import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreativeToolQuoteDto {
  @IsIn(['captions', 'transcribe', 'resize', 'trim', 'merge', 'compose', 'scene-render'])
  tool!: 'captions' | 'transcribe' | 'resize' | 'trim' | 'merge' | 'compose' | 'scene-render';
}

export class CreativeToolRunDto extends CreativeToolQuoteDto {
  @IsOptional()
  @IsString()
  script?: string;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsIn(['srt', 'vtt'])
  format?: 'srt' | 'vtt';

  @IsOptional()
  @IsString()
  audioUrl?: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  captionsUrl?: string;

  @IsOptional()
  @IsString()
  watermarkUrl?: string;

  @IsOptional()
  @IsString()
  overlayText?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceUrls?: string[];

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  scenes?: Array<Record<string, unknown>>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(180)
  maxDurationSec?: number;

  @IsOptional()
  @IsIn(['9:16', '1:1', '16:9', '4:5'])
  aspectRatio?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(180)
  startSec?: number;

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

export class CreativeVoicePreviewDto {
  @IsString()
  voiceId!: string;

  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  language?: string;

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
