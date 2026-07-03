import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
  MinLength,
  MaxLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateAdCreativesDto {
  @IsString()
  @MinLength(1)
  brandProfileId!: string;

  @IsOptional()
  @IsString()
  contentIdeaId?: string;

  @IsOptional()
  @IsString()
  carouselProjectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  contentObjective?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  productOrService?: string;

  @IsArray()
  @IsString({ each: true })
  platforms!: string[];

  @IsString()
  objective!: string;

  @IsString()
  @IsEnum(['STATIC', 'CAROUSEL', 'AUTO'])
  adType!: string;

  @IsOptional()
  @IsString()
  adTemplateId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  variants?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  destinationUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  additionalContext?: string;

  @IsOptional()
  @IsString()
  ctaButton?: string;

  @IsOptional()
  @IsBoolean()
  generateImagePrompts?: boolean;
}

export class UpdateAdCreativeDto {
  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  primaryText?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  ctaButton?: string;

  @IsOptional()
  @IsString()
  destinationUrl?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class ExportAdCreativeDto {
  @IsString()
  adCreativeId!: string;

  @IsString()
  @IsEnum(['META_CSV', 'LINKEDIN_CSV', 'JSON', 'NATIVE_FORMAT'])
  format!: string;
}
