import { IsIn, IsObject, IsOptional, IsString, IsISO8601 } from 'class-validator';
import { CreativeRightsStatus } from '@prisma/client';

export class GrantCreativeRightsDto {
  @IsString()
  @IsIn(['actor', 'voice', 'asset'])
  resourceType!: string;

  @IsString()
  resourceId!: string;

  @IsOptional()
  @IsIn(['UNKNOWN', 'PENDING', 'APPROVED', 'REVOKED', 'EXPIRED'])
  status?: CreativeRightsStatus;

  @IsString()
  consentReference!: string;

  @IsOptional()
  @IsObject()
  scope?: Record<string, unknown>;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
