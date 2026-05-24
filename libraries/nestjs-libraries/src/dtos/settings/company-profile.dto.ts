import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class CompanyProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(80)
  id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  companyName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  website?: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  industry?: string;

  @IsString()
  @IsOptional()
  @MaxLength(240)
  targetAudience?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  productsOrServices?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  differentials?: string;

  @IsString()
  @IsOptional()
  @MaxLength(180)
  toneOfVoice?: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  summary?: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  visualIdentitySummary?: string;

  @IsString()
  @IsOptional()
  @MaxLength(240)
  brandColors?: string;

  @IsString()
  @IsOptional()
  @MaxLength(240)
  brandFonts?: string;

  @IsString()
  @IsOptional()
  @MaxLength(240)
  defaultCta?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  forbiddenTerms?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  contentPreferences?: string;

  @IsArray()
  @IsOptional()
  visualIdentityAssets?: Array<{
    id?: string;
    name?: string;
    type?: string;
    dataUrl?: string;
    description?: string;
  }>;

  @IsArray()
  @IsOptional()
  brandPalettes?: Array<{
    id?: string;
    name?: string;
    colors?: string[];
    usage?: string;
  }>;

  @IsArray()
  @IsOptional()
  brandFontPresets?: Array<{
    id?: string;
    name?: string;
    headline?: string;
    body?: string;
    usage?: string;
  }>;

  @IsArray()
  @IsOptional()
  brandLogos?: Array<{
    id?: string;
    name?: string;
    dataUrl?: string;
    usage?: string;
    description?: string;
  }>;

  @IsArray()
  @IsOptional()
  styleRules?: Array<{
    id?: string;
    type?: 'do' | 'dont';
    text?: string;
  }>;

  @IsArray()
  @IsOptional()
  inspirationLibrary?: Array<{
    id?: string;
    name?: string;
    src?: string;
    source?: string;
    category?: string;
    favorite?: boolean;
    approved?: boolean;
    description?: string;
  }>;
}
