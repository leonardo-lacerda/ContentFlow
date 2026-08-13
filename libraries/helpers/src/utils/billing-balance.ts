export type BillingBalance = {
  balance: number;
  total: number;
  reserved: number;
  debt: number;
};

const finiteNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Accepts the current `/billing/v2/account` response and the short-lived
 * nested response used by an older deployment. Invalid or missing payloads
 * return null instead of silently presenting a real account as zero balance.
 */
export function normalizeBillingBalance(account: unknown): BillingBalance | null {
  if (!account || typeof account !== 'object') return null;
  const credits = (account as Record<string, unknown>).credits;
  if (!credits || typeof credits !== 'object') return null;

  const direct = credits as Record<string, unknown>;
  const candidate = direct.balance && typeof direct.balance === 'object'
    ? direct.balance as Record<string, unknown>
    : direct;
  if (!['balance', 'total', 'reserved', 'debt'].some((key) => key in candidate)) return null;

  return {
    balance: finiteNumber(candidate.balance),
    total: finiteNumber(candidate.total),
    reserved: finiteNumber(candidate.reserved),
    debt: finiteNumber(candidate.debt),
  };
}
