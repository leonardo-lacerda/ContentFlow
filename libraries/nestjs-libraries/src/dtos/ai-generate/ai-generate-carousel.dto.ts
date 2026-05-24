import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AiGenerateCarouselDto {
  @IsString()
  @MinLength(3)
  @MaxLength(240)
  topic: string;

  @IsString()
  @IsOptional()
  @MaxLength(240)
  goal?: string;

  @IsString()
  @IsOptional()
  @MaxLength(240)
  audience?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  tone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  platform?: string;

  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(10)
  @IsOptional()
  slideCount?: number;

  @IsString()
  @IsOptional()
  @MaxLength(400)
  visualStyle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  brandNotes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  language?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  textModel?: string;

  @IsString()
  @IsOptional()
  @MaxLength(16_000)
  reviewPayload?: string;
}
