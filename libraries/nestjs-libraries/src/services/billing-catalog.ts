export type BillingPlanCode =
  | 'FREE'
  | 'STARTER'
  | 'CREATOR'
  | 'PRO'
  | 'STUDIO'
  | 'AGENCY';

export type BillingFeatureCode =
  | 'studio'
  | 'content-ideas'
  | 'brand-dna'
  | 'carousel-copy'
  | 'image-generation'
  | 'video-generation'
  | 'editorial-plan'
  | 'ad-kit'
  | 'email-campaign'
  | 'advanced-design'
  | 'bulk-generation'
  | 'analytics'
  | 'approval-workflows'
  | 'client-workspaces'
  | 'public-api'
  | 'webhooks'
  | 'white-label'
  | 'priority-queue';

export type BillingModelAccessCode =
  | 'text-default'
  | 'image-basic'
  | 'image-2k'
  | 'image-4k'
  | 'seedance-2.5-480p'
  | 'seedance-2.5-720p'
  | 'kling-3.0'
  | 'veo-3.1'
  | 'avatar';

export type BillingCapacityCode = 'brands' | 'channels' | 'members';

export interface BillingPlanAccess {
  features: readonly BillingFeatureCode[];
  models: readonly BillingModelAccessCode[];
  capacities: Readonly<Record<BillingCapacityCode, number>>;
}

export type BillingPriceKind = 'PLAN' | 'TOPUP';

export interface BillingCatalogPlan {
  code: BillingPlanCode;
  name: string;
  priceCents: number;
  monthlyCredits: number;
  access: BillingPlanAccess;
}

export interface BillingCatalogTopup {
  code: string;
  name: string;
  amountCents: number;
  credits: number;
  validityDays: number;
}

const CORE_FEATURES = [
  'studio',
  'content-ideas',
  'brand-dna',
  'carousel-copy',
  'image-generation',
  'editorial-plan',
  'ad-kit',
  'email-campaign',
] as const satisfies readonly BillingFeatureCode[];

const TEXT_AND_BASIC_IMAGE = ['text-default', 'image-basic'] as const satisfies readonly BillingModelAccessCode[];

export const BILLING_CATALOG_PLANS: readonly BillingCatalogPlan[] = [
  {
    code: 'FREE', name: 'Free', priceCents: 0, monthlyCredits: 200,
    access: { features: CORE_FEATURES, models: TEXT_AND_BASIC_IMAGE, capacities: { brands: 3, channels: 1, members: 1 } },
  },
  {
    code: 'STARTER', name: 'Starter', priceCents: 4900, monthlyCredits: 1000,
    access: {
      features: [...CORE_FEATURES, 'video-generation'],
      models: [...TEXT_AND_BASIC_IMAGE, 'seedance-2.5-480p'],
      capacities: { brands: 5, channels: 3, members: 1 },
    },
  },
  {
    code: 'CREATOR', name: 'Creator', priceCents: 9900, monthlyCredits: 2500,
    access: {
      features: [...CORE_FEATURES, 'video-generation', 'advanced-design'],
      models: [...TEXT_AND_BASIC_IMAGE, 'image-2k', 'image-4k', 'seedance-2.5-480p'],
      capacities: { brands: 10, channels: 5, members: 1 },
    },
  },
  {
    code: 'PRO', name: 'Pro', priceCents: 19900, monthlyCredits: 6000,
    access: {
      features: [...CORE_FEATURES, 'video-generation', 'advanced-design', 'bulk-generation', 'analytics'],
      models: [...TEXT_AND_BASIC_IMAGE, 'image-2k', 'image-4k', 'seedance-2.5-480p', 'seedance-2.5-720p', 'kling-3.0', 'veo-3.1', 'avatar'],
      capacities: { brands: 20, channels: 10, members: 3 },
    },
  },
  {
    code: 'STUDIO', name: 'Studio', priceCents: 39900, monthlyCredits: 16000,
    access: {
      features: [...CORE_FEATURES, 'video-generation', 'advanced-design', 'bulk-generation', 'analytics', 'approval-workflows', 'client-workspaces'],
      models: [...TEXT_AND_BASIC_IMAGE, 'image-2k', 'image-4k', 'seedance-2.5-480p', 'seedance-2.5-720p', 'kling-3.0', 'veo-3.1', 'avatar'],
      capacities: { brands: 50, channels: 25, members: 10 },
    },
  },
  {
    code: 'AGENCY', name: 'Agency', priceCents: 89900, monthlyCredits: 40000,
    access: {
      features: [...CORE_FEATURES, 'video-generation', 'advanced-design', 'bulk-generation', 'analytics', 'approval-workflows', 'client-workspaces', 'public-api', 'webhooks', 'white-label', 'priority-queue'],
      models: [...TEXT_AND_BASIC_IMAGE, 'image-2k', 'image-4k', 'seedance-2.5-480p', 'seedance-2.5-720p', 'kling-3.0', 'veo-3.1', 'avatar'],
      capacities: { brands: 200, channels: 100, members: 25 },
    },
  },
];

export function getBillingCatalogPlan(code?: string | null): BillingCatalogPlan {
  return BILLING_CATALOG_PLANS.find((plan) => plan.code === String(code || '').toUpperCase()) || BILLING_CATALOG_PLANS[0];
}

export const BILLING_CATALOG_TOPUPS: readonly BillingCatalogTopup[] = [
  { code: 'TOPUP_500', name: 'Pequeno', amountCents: 2900, credits: 500, validityDays: 90 },
  { code: 'TOPUP_2000', name: 'Médio', amountCents: 9900, credits: 2000, validityDays: 90 },
  { code: 'TOPUP_5000', name: 'Grande', amountCents: 22900, credits: 5000, validityDays: 90 },
  { code: 'TOPUP_10000', name: 'Profissional', amountCents: 39900, credits: 10000, validityDays: 90 },
];

export function billingPeriodEnd(now = new Date()) {
  const end = new Date(now);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
