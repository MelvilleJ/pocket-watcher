import { addMonths, addWeeks } from "date-fns";

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

const CYCLE_STEP: Record<string, { weeks?: number; months?: number }> = {
  weekly: { weeks: 1 },
  fortnightly: { weeks: 2 },
  monthly: { months: 1 },
  quarterly: { months: 3 },
  half_yearly: { months: 6 },
  yearly: { months: 12 },
};

// Start dates are stored as UTC midnight of the chosen day, so the UTC parts are the calendar date.
// Each date is offset from the anchor rather than the previous date so a 31st clamps per month instead of drifting.
export function billingDates(billingCycle: string, startDate: Date, through: Date): Date[] {
  const step = CYCLE_STEP[billingCycle] ?? CYCLE_STEP.monthly;
  const anchor = new Date(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const dates: Date[] = [];
  for (let n = 0; ; n++) {
    const date = step.weeks ? addWeeks(anchor, n * step.weeks) : addMonths(anchor, n * step.months!);
    if (date > through) return dates;
    dates.push(date);
  }
}
