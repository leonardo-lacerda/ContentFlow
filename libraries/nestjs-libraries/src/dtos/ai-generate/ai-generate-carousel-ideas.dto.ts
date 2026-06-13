import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AiGenerateCarouselIdeasDto {
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(240)
  topicHint?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  companyContext?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  language?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  textModel?: string;

  /**
   * Títulos de ideias já geradas/salvas anteriormente. A IA recebe essa lista
   * para evitar repetir ideias e gerar apenas temas inéditos.
   */
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @MaxLength(240, { each: true })
  existingTitles?: string[];
}
