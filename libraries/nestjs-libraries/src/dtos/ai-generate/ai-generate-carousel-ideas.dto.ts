import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
}
