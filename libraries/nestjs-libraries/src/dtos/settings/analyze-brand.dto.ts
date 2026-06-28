import { IsString, IsUrl } from 'class-validator';

export class AnalyzeBrandDto {
  @IsString()
  @IsUrl()
  url!: string;
}
