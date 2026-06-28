import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TemplateRecommendationDto {
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(240)
  topic?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  platform?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  niche?: string;

  @IsString()
  @IsOptional()
  @MaxLength(240)
  goal?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  tone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  category?: string;

  @IsEnum(['minimal', 'light', 'medium', 'rich'] as const)
  @IsOptional()
  textDensity?: 'minimal' | 'light' | 'medium' | 'rich';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  limit?: number;

  /**
   * Template IDs to exclude from recommendations.
   * Useful when the frontend already shows certain templates.
   */
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  excludeIds?: string[];
}
