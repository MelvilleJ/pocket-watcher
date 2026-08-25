export type RoadmapDebtInput = {
  id: string;
  name: string;
  balance: number;
  interestRate: number;
  minMonthlyPayment: number;
};

export type RoadmapStrategy = "avalanche" | "snowball";

export type RoadmapMonthPoint = {
  month: number;
  totalBalance: number;
  balances: Record<string, number>;
};

export type RoadmapDebtResult = {
  id: string;
  name: string;
  payoffMonth: number | null;
  totalInterestPaid: number;
};

export type RoadmapResult = {
  strategy: RoadmapStrategy;
  extraPayment: number;
  months: RoadmapMonthPoint[];
  debts: RoadmapDebtResult[];
  payoffMonth: number | null;
  totalInterestPaid: number;
};

const MAX_MONTHS = 600;

export function simulateDebtRoadmap(
  input: RoadmapDebtInput[],
  extraPayment: number,
  strategy: RoadmapStrategy
): RoadmapResult {
  const state = input.map((d) => ({ ...d, remaining: d.balance, interestPaid: 0 }));
  const payoffMonth = new Map<string, number | null>();
  input.forEach((d) => payoffMonth.set(d.id, d.balance <= 0 ? 0 : null));

  const months: RoadmapMonthPoint[] = [];
  let month = 0;
  let totalInterestPaid = 0;

  while (state.some((d) => d.remaining > 0.005) && month < MAX_MONTHS) {
    month += 1;

    for (const d of state) {
      if (d.remaining <= 0) continue;
      const monthlyRate = d.interestRate / 12;
      const interest = d.remaining * monthlyRate;
      d.remaining += interest;
      d.interestPaid += interest;
      totalInterestPaid += interest;
    }

    const order = [...state]
      .filter((d) => d.remaining > 0)
      .sort((a, b) =>
        strategy === "avalanche"
          ? b.interestRate - a.interestRate
          : a.remaining - b.remaining
      );

    let pool = extraPayment;

    for (const d of state) {
      if (d.remaining <= 0) continue;
      const payment = Math.min(d.minMonthlyPayment, d.remaining);
      d.remaining -= payment;
    }

    for (const d of order) {
      if (pool <= 0) break;
      if (d.remaining <= 0) continue;
      const payment = Math.min(pool, d.remaining);
      d.remaining -= payment;
      pool -= payment;
    }

    for (const d of state) {
      if (d.remaining <= 0.005 && payoffMonth.get(d.id) === null) {
        payoffMonth.set(d.id, month);
        d.remaining = 0;
      }
    }

    months.push({
      month,
      totalBalance: state.reduce((sum, d) => sum + Math.max(d.remaining, 0), 0),
      balances: Object.fromEntries(state.map((d) => [d.id, Math.max(d.remaining, 0)])),
    });
  }

  const debtsResult: RoadmapDebtResult[] = state.map((d) => ({
    id: d.id,
    name: d.name,
    payoffMonth: payoffMonth.get(d.id) ?? null,
    totalInterestPaid: d.interestPaid,
  }));

  return {
    strategy,
    extraPayment,
    months,
    debts: debtsResult,
    payoffMonth: months.length > 0 ? months[months.length - 1].month : 0,
    totalInterestPaid,
  };
}
