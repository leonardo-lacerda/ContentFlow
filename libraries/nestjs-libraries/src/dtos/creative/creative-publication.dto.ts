import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreativePublishVariantDto {
  @IsString()
  integrationId!: string;

  @IsOptional()
  @IsIn(['draft', 'schedule', 'now'])
  type?: 'draft' | 'schedule' | 'now';

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  shortLink?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
