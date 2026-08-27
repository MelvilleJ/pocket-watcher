"use client";

import { useMemo, useState } from "react";
import { simulateGoalsRoadmap, type RoadmapGoalInput } from "@/lib/finance/goals-roadmap";
import { GoalsRoadmapChart } from "@/components/charts/goals-roadmap-chart";

function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function monthsFromNowLabel(months: number | null) {
  if (months === null) return "—";
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} mo`;
  if (rem === 0) return `${years} yr`;
  return `${years} yr ${rem} mo`;
}

export function GoalsRoadmapPlanner({
  goals,
  currency,
  minTotalContribution,
}: {
  goals: RoadmapGoalInput[];
  currency: string;
  minTotalContribution: number;
}) {
  const [monthlyAllocation, setMonthlyAllocation] = useState(minTotalContribution);

  const largest = useMemo(
    () => simulateGoalsRoadmap(goals, monthlyAllocation, "largest"),
    [goals, monthlyAllocation]
  );
  const smallest = useMemo(
    () => simulateGoalsRoadmap(goals, monthlyAllocation, "smallest"),
    [goals, monthlyAllocation]
  );

  const chartLength = Math.max(largest.months.length, smallest.months.length, 1);
  const chartData = Array.from({ length: chartLength }, (_, i) => ({
    month: i + 1,
    largest: largest.months[i]?.totalRemaining ?? 0,
    smallest: smallest.months[i]?.totalRemaining ?? 0,
  }));

  if (goals.length === 0) {
    return <p className="text-sm text-zinc-500">Add goals to see a roadmap.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
        <label htmlFor="alloc" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Monthly allocation (on top of {formatCurrency(minTotalContribution, currency)} minimums):{" "}
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(monthlyAllocation, currency)}
          </span>
        </label>
        <input
          id="alloc"
          type="range"
          min={0}
          max={Math.max(minTotalContribution * 5, 2000)}
          step={10}
          value={monthlyAllocation}
          onChange={(e) => setMonthlyAllocation(Number(e.target.value))}
          className="mt-3 w-full accent-[color:var(--series-1)]"
        />
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Total remaining over time</h2>
        <div className="mt-4">
          <GoalsRoadmapChart data={chartData} currency={currency} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <RoadmapTable title="Largest remaining first" result={largest} currency={currency} />
        <RoadmapTable title="Smallest remaining first" result={smallest} currency={currency} />
      </div>
    </div>
  );
}

function RoadmapTable({
  title,
  result,
  currency,
}: {
  title: string;
  result: ReturnType<typeof simulateGoalsRoadmap>;
  currency: string;
}) {
  return (
    <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        All goals complete in {monthsFromNowLabel(result.completionMonth)} · Total contributed {formatCurrency(result.totalContributed, currency)}
      </p>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-left text-zinc-500">
            <th className="py-1 font-medium">Goal</th>
            <th className="py-1 font-medium text-right">Completed in</th>
            <th className="py-1 font-medium text-right">Contributed</th>
          </tr>
        </thead>
        <tbody>
          {result.goals
            .slice()
            .sort((a, b) => (a.completionMonth ?? Infinity) - (b.completionMonth ?? Infinity))
            .map((g) => (
              <tr key={g.id} className="border-t border-black/5 dark:border-white/5">
                <td className="py-1.5">{g.name}</td>
                <td className="py-1.5 text-right tabular-nums">{monthsFromNowLabel(g.completionMonth)}</td>
                <td className="py-1.5 text-right tabular-nums">{formatCurrency(g.totalContributed, currency)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </section>
  );
}
