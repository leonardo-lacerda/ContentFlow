import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class AiGenerateCaptionDto {
  @IsString()
  @IsOptional()
  @MaxLength(240)
  title?: string;

  // Conteúdo dos slides (headline/body) para a legenda refletir o carrossel.
  @IsArray()
  @IsOptional()
  slides?: Array<{ headline?: string; body?: string }>;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  platform?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  tone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  language?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  companyContext?: string;

  @IsString()
  @IsOptional()
  @MaxLength(240)
  forbiddenTerms?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  defaultCta?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  textModel?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  brandProfileId?: string;
}
