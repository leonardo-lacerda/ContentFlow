import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateOnboardingDto {
  // Keep as free-form object (same pattern as Brand DNA JSON DTOs)
  @IsObject()
  @IsOptional()
  progress?: {
    currentStep?: string;
    brandId?: string;
    skippedFeatureIds?: string[];
    openedFeatureIds?: string[];
    version?: string;
  };

  @IsBoolean()
  @IsOptional()
  complete?: boolean;

  @IsBoolean()
  @IsOptional()
  reset?: boolean;
}
