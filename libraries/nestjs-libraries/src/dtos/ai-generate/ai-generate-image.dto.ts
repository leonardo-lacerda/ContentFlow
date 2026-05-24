import {
  IsDefined,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AiGenerateImageDto {
  @IsString()
  @IsIn(['ia_generate', 'openai_official'])
  @IsOptional()
  provider?: 'ia_generate' | 'openai_official';

  @IsString()
  @IsDefined()
  @MinLength(1)
  @MaxLength(32000)
  prompt: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  model?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  n?: number;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  size?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  quality?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  style?: string;

  @IsString()
  @IsIn(['url', 'b64_json'])
  @IsOptional()
  response_format?: 'url' | 'b64_json';

  @IsString()
  @IsOptional()
  @MaxLength(256)
  user?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  background?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  moderation?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  output_compression?: number;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  output_format?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  input_fidelity?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  reference_images?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(128)
  reference_description_model?: string;

  @IsBoolean()
  @IsOptional()
  persist?: boolean;
}
