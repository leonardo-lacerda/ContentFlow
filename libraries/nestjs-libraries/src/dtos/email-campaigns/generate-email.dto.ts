import { IsString, IsOptional, IsEnum } from 'class-validator';

export class GenerateEmailDto {
  @IsString()
  brandProfileId!: string;

  @IsOptional()
  @IsString()
  contentIdeaId?: string;

  @IsOptional()
  @IsString()
  carouselProjectId?: string;

  @IsEnum(['NEWSLETTER', 'WELCOME_SEQUENCE', 'PROMOTIONAL'])
  campaignType!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  additionalContext?: string;
}
