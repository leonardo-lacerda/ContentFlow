import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';

export class RenderVideoDto {
  @IsString()
  provider!: string; // "image-text-slides", "veo3"

  @IsOptional()
  @IsString()
  voiceId?: string;

  @IsOptional()
  @IsString()
  musicStyle?: string;

  @IsOptional()
  @IsBoolean()
  includeSubtitles?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCostUsd?: number;
}
