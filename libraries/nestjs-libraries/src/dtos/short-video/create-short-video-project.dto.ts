import { IsString, IsOptional, IsNumber, IsEnum, MinLength, MaxLength, Min, Max } from 'class-validator';

export class CreateShortVideoProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  brandProfileId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  carouselProjectId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  contentIdeaId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  name!: string;

  @IsOptional()
  @IsEnum(['REELS', 'TIKTOK', 'SHORTS', 'STORIES', 'CUSTOM'])
  format?: string;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(180)
  maxDurationSec?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  aspectRatio?: string;
}
