import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class DesignSlideDto {
  @IsOptional()
  @IsNumber()
  slideIndex?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  headline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  cta?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  templateId?: string;
}

class DesignRecipeDto {
  @IsOptional()
  @IsString()
  directionId?: string;

  @IsOptional()
  @IsString()
  paletteId?: string;

  @IsOptional()
  @IsString()
  fontId?: string;

  @IsOptional()
  @IsString()
  sizeId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  motifs?: string[];

  @IsOptional()
  @IsString()
  handle?: string;
}

class DesignBrandDto {
  @IsOptional()
  @IsString()
  handle?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @IsOptional()
  @IsString()
  textColor?: string;

  @IsOptional()
  @IsString()
  fontFamily?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  paletteId?: string;

  @IsOptional()
  @IsString()
  fontPairingId?: string;

  @IsOptional()
  @IsString()
  accentStrategy?: 'brand-first' | 'catalog-blend';
}

export class CreateCarouselDesignJobDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignSlideDto)
  slides!: DesignSlideDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => DesignRecipeDto)
  recipe?: DesignRecipeDto;

  @IsOptional()
  @IsBoolean()
  autoIdeate?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  query?: string;

  @IsOptional()
  @IsNumber()
  seed?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => DesignBrandDto)
  brand?: DesignBrandDto;

  @IsOptional()
  @IsString()
  handle?: string;

  @IsOptional()
  @IsString()
  sizeId?: string;

  @IsOptional()
  @IsNumber()
  scale?: number;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}

export class DesignSystemIdeateDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  query?: string;

  @IsOptional()
  @IsNumber()
  count?: number;

  @IsOptional()
  @IsNumber()
  seed?: number;

  @IsOptional()
  @IsString()
  directionId?: string;

  @IsOptional()
  @IsString()
  sizeId?: string;

  @IsOptional()
  @IsString()
  handle?: string;
}
