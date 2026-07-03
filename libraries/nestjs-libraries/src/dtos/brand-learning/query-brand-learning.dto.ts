import { IsOptional, IsString, IsEnum } from 'class-validator';
import { BrandLearningStatus, BrandLearningType } from '@prisma/client';

export class QueryBrandLearningDto {
  @IsOptional()
  @IsString()
  brandProfileId?: string;

  @IsOptional()
  @IsEnum(BrandLearningStatus)
  status?: BrandLearningStatus;

  @IsOptional()
  @IsEnum(BrandLearningType)
  type?: BrandLearningType;
}
