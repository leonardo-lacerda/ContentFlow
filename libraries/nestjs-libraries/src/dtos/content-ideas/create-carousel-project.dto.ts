import { IsString, IsOptional, IsArray, IsObject, MinLength, MaxLength } from 'class-validator';

export class CreateCarouselProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  brandProfileId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  contentIdeaId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title!: string;

  @IsObject()
  slides!: any;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  caption?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: any;
}
