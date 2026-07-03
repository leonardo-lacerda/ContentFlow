import { IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SaveCarouselDraftDto {
  @ApiPropertyOptional({ description: 'Draft ID for updating existing draft' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brandProfileId?: string;

  @ApiPropertyOptional({ default: 'draft' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: 'Full carousel state (plan, ideas, review, caption, etc.)' })
  @IsObject()
  data: Record<string, unknown>;
}
