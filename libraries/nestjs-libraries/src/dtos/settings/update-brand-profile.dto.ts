import { IsString, IsOptional } from 'class-validator';

export class UpdateBrandProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  industry?: string;
}
