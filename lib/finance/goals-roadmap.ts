export type RoadmapGoalInput = {
  id: string;
  name: string;
  targetAmount: number;
  currentSaved: number;
  minMonthlyContribution: number;
};

export type GoalRoadmapStrategy = "largest" | "smallest";

export type RoadmapMonthPoint = {
  month: number;
  totalRemaining: number;
  balances: Record<string, number>;
};

export type RoadmapGoalResult = {
  id: string;
  name: string;
  completionMonth: number | null;
  totalContributed: number;
};

export type RoadmapResult = {
  strategy: GoalRoadmapStrategy;
  monthlyAllocation: number;
  months: RoadmapMonthPoint[];
  goals: RoadmapGoalResult[];
  completionMonth: number | null;
  totalContributed: number;
};

const MAX_MONTHS = 600;

export function simulateGoalsRoadmap(
  input: RoadmapGoalInput[],
  monthlyAllocation: number,
  strategy: GoalRoadmapStrategy
): RoadmapResult {
  const state = input.map((g) => ({
    ...g,
    remaining: Math.max(g.targetAmount - g.currentSaved, 0),
    contributed: 0,
  }));

  const completionMonth = new Map<string, number | null>();
  input.forEach((g) => completionMonth.set(g.id, g.targetAmount - g.currentSaved <= 0 ? 0 : null));

  const months: RoadmapMonthPoint[] = [];
  let month = 0;
  let totalContributed = 0;

  while (state.some((g) => g.remaining > 0.005) && month < MAX_MONTHS) {
    month += 1;

    // First, apply minimum contributions
    for (const g of state) {
      if (g.remaining <= 0) continue;
      const contrib = Math.min(g.minMonthlyContribution, g.remaining);
      g.remaining -= contrib;
      g.contributed += contrib;
      totalContributed += contrib;
    }

    // Then distribute the shared monthly allocation
    let pool = monthlyAllocation;

    const order = [...state]
      .filter((g) => g.remaining > 0)
      .sort((a, b) => (strategy === "largest" ? b.remaining - a.remaining : a.remaining - b.remaining));

    for (const g of order) {
      if (pool <= 0) break;
      if (g.remaining <= 0) continue;
      const pay = Math.min(pool, g.remaining);
      g.remaining -= pay;
      g.contributed += pay;
      totalContributed += pay;
      pool -= pay;
    }

    for (const g of state) {
      if (g.remaining <= 0.005 && completionMonth.get(g.id) === null) {
        completionMonth.set(g.id, month);
        g.remaining = 0;
      }
    }

    months.push({
      month,
      totalRemaining: state.reduce((s, g) => s + Math.max(g.remaining, 0), 0),
      balances: Object.fromEntries(state.map((g) => [g.id, Math.max(g.remaining, 0)])),
    });
  }

  const goalsResult: RoadmapGoalResult[] = state.map((g) => ({
    id: g.id,
    name: g.name,
    completionMonth: completionMonth.get(g.id) ?? null,
    totalContributed: g.contributed,
  }));

  return {
    strategy,
    monthlyAllocation,
    months,
    goals: goalsResult,
    completionMonth: months.length > 0 ? months[months.length - 1].month : 0,
    totalContributed,
  };
}
