export const MONTHLY_FACTOR: Record<string, number> = {
  weekly: 4.345,
  fortnightly: 2.1725,
  monthly: 1,
  quarterly: 1 / 3,
  half_yearly: 1 / 6,
  yearly: 1 / 12,
};

export const BILLING_CYCLE_LABELS: Record<string, string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-Yearly",
  yearly: "Yearly",
};

export function calcMonthlyCost(billingCycle: string, billedAmount: number) {
  return billedAmount * (MONTHLY_FACTOR[billingCycle] ?? 1);
}
