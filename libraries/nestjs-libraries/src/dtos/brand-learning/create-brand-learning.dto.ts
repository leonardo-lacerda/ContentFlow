import { IsString, IsOptional, IsNumber, IsEnum, MinLength, MaxLength, Min, Max } from 'class-validator';
import { BrandLearningType } from '@prisma/client';

export class CreateBrandLearningDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  brandProfileId!: string;

  @IsEnum(BrandLearningType)
  type!: BrandLearningType;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  evidence?: any;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @IsOptional()
  metadata?: any;
}
