import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class GenerateVideoScriptDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(180)
  targetDurationSec?: number;

  @IsOptional()
  @IsString()
  style?: string; // "energetic", "calm", "educational", "humorous"
}
