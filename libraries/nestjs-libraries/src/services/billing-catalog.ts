export type BillingPlanCode =
  | 'FREE'
  | 'STARTER'
  | 'CREATOR'
  | 'PRO'
  | 'STUDIO'
  | 'AGENCY';

export type BillingPriceKind = 'PLAN' | 'TOPUP';

export interface BillingCatalogPlan {
  code: BillingPlanCode;
  name: string;
  priceCents: number;
  monthlyCredits: number;
}

export interface BillingCatalogTopup {
  code: string;
  name: string;
  amountCents: number;
  credits: number;
  validityDays: number;
}

export const BILLING_CATALOG_PLANS: readonly BillingCatalogPlan[] = [
  { code: 'FREE', name: 'Free', priceCents: 0, monthlyCredits: 200 },
  { code: 'STARTER', name: 'Starter', priceCents: 4900, monthlyCredits: 1000 },
  { code: 'CREATOR', name: 'Creator', priceCents: 9900, monthlyCredits: 2500 },
  { code: 'PRO', name: 'Pro', priceCents: 19900, monthlyCredits: 6000 },
  { code: 'STUDIO', name: 'Studio', priceCents: 39900, monthlyCredits: 16000 },
  { code: 'AGENCY', name: 'Agency', priceCents: 89900, monthlyCredits: 40000 },
];

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

