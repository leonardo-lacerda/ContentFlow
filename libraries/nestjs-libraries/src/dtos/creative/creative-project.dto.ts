import { Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateCreativeProjectDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  brandProfileId?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsIn(['9:16', '1:1', '16:9', '4:5'])
  aspectRatio?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(180)
  maxDurationSec?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateCreativeProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsIn(['9:16', '1:1', '16:9', '4:5'])
  aspectRatio?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(180)
  maxDurationSec?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateCreativeScriptDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  brief?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  language?: string;
}
