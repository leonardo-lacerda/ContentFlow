import { IsOptional, IsString, IsDateString } from 'class-validator';

export class QueryCarouselPerformanceDto {
  @IsOptional()
  @IsString()
  brandProfileId?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
