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
  const factor = MONTHLY_FACTOR[billingCycle] ?? 1;
  return billedAmount * factor;
}

export function isSubscriptionActiveInMonth(
  startDate: Date,
  endDate: Date | null,
  monthStart: Date
) {
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  if (startDate > monthEnd) return false;
  if (endDate && endDate < new Date(monthStart.getFullYear(), monthStart.getMonth(), 1)) {
    return false;
  }
  return true;
}
