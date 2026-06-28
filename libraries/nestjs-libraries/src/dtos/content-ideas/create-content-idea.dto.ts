import { IsString, IsOptional, IsNumber, MinLength, MaxLength, Min, Max } from 'class-validator';

export class CreateContentIdeaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  brandProfileId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  hook!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  goal!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  angle!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  templateSuggestion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  platformSuggestion?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;
}
