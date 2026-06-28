import { IsString, IsOptional, IsNumber, MinLength, MaxLength, Min } from 'class-validator';

export class CreateGenerationJobDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  brandProfileId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  carouselProjectId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  provider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  promptVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  schemaVersion?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costEstimate?: number;
}
