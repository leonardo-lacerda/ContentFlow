import {
  IsString,
  IsOptional,
  IsInt,
  IsObject,
  IsDateString,
  Min,
} from 'class-validator';

export class RecordCarouselPerformanceDto {
  @IsString()
  carouselProjectId!: string;

  @IsOptional()
  @IsString()
  postId?: string;

  @IsString()
  brandProfileId!: string;

  @IsString()
  platform!: string;

  @IsInt()
  @Min(0)
  impressions: number = 0;

  @IsInt()
  @Min(0)
  reach: number = 0;

  @IsInt()
  @Min(0)
  saves: number = 0;

  @IsInt()
  @Min(0)
  shares: number = 0;

  @IsInt()
  @Min(0)
  comments: number = 0;

  @IsInt()
  @Min(0)
  clicks: number = 0;

  @IsInt()
  @Min(0)
  likes: number = 0;

  @IsOptional()
  @IsObject()
  rawMetrics?: any;

  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;
}
