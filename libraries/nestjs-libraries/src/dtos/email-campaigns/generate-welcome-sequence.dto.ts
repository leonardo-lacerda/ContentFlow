import { IsString, IsOptional, IsNumber, Max, Min } from 'class-validator';

export class GenerateWelcomeSequenceDto {
  @IsString()
  brandProfileId!: string;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(5)
  sequenceLength?: number;

  @IsOptional()
  @IsString()
  additionalContext?: string;
}
