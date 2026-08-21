import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class AdminCreatePlanDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsInt()
  @IsPositive()
  priceCents: number;

  @IsInt()
  @Min(0)
  monthlyCredits: number;
}

export class AdminUpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  priceCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyCredits?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class AdminCreatePriceDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsIn(['PLAN', 'TOPUP'])
  kind?: string;

  @IsInt()
  @IsPositive()
  amountCents: number;

  @IsInt()
  @Min(0)
  credits: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  validityDays?: number;

  @IsOptional()
  @IsString()
  provider?: string;
}

export class AdminUpdatePriceDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  amountCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  credits?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  validityDays?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class AdminCreateSubscriptionDto {
  @IsString()
  organizationId: string;

  @IsString()
  planId: string;

  @IsOptional()
  @IsString()
  provider?: string;
}

export class AdminChangeSubscriptionDto {
  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;
}

export class AdminRefundDto {
  @IsString()
  organizationId: string;

  @IsArray()
  @IsString({ each: true })
  chargeIds: string[];

  @IsOptional()
  @IsNumber()
  amountCents?: number;
}

export class AdminAdjustCreditsDto {
  @IsString()
  organizationId: string;

  @IsInt()
  credits: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class AdminAiProviderConfigDto {
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  disabled?: boolean;
}

export class AdminUpdatePricingDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  baseCredits?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minCredits?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  providerCostUsd?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class AdminKillSwitchDto {
  @IsBoolean()
  enabled: boolean;
}
