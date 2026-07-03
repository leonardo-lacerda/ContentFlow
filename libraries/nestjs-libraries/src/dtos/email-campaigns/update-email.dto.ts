import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateEmailDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  preheader?: string;

  @IsOptional()
  @IsObject()
  bodyJson?: any;

  @IsOptional()
  @IsString()
  ctaText?: string;

  @IsOptional()
  @IsString()
  ctaUrl?: string;

  @IsOptional()
  @IsString()
  ctaColor?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  headerImageUrl?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}
