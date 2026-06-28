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
  @IsOptional()
  @MinLength(3)
  @MaxLength(240)
  topic?: string;

  // Conteúdo de origem para "repurpose": link de um artigo/página e/ou texto
  // colado. Quando presente, o carrossel é gerado a partir desse material.
  @IsString()
  @IsOptional()
  @MaxLength(500)
  sourceUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20000)
  sourceText?: string;

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

  @IsString()
  @IsOptional()
  @MaxLength(80)
  templateId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  brandProfileId?: string;
}
