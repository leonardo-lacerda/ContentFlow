import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SaveMediaCarouselItemDto {
  @IsInt()
  @Min(1)
  @Max(10)
  index: number;

  @IsString()
  @MaxLength(12_000_000)
  image: string;

  @IsString()
  @IsOptional()
  @MaxLength(256)
  mediaId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  alt?: string;
}

export class SaveMediaCarouselDto {
  @IsString()
  @MaxLength(160)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(12_000)
  projectMetadata?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SaveMediaCarouselItemDto)
  images: SaveMediaCarouselItemDto[];
}
