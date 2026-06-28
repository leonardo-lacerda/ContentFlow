import { IsString, IsOptional } from 'class-validator';

export class CreateBrandProfileDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  industry?: string;
}
