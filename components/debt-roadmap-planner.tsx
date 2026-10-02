"use client";

import { useMemo, useState } from "react";
import { simulateDebtRoadmap, type RoadmapDebtInput } from "@/lib/finance/debt-roadmap";
import { RoadmapAreaChart } from "@/components/charts/roadmap-area-chart";

function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function monthsFromNowLabel(months: number | null) {
  if (months === null) return "-";
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} mo`;
  if (rem === 0) return `${years} yr`;
  return `${years} yr ${rem} mo`;
}

export function DebtRoadmapPlanner({
  debts,
  currency,
  minTotalPayment,
}: {
  debts: RoadmapDebtInput[];
  currency: string;
  minTotalPayment: number;
}) {
  const [extraPayment, setExtraPayment] = useState(0);

  const avalanche = useMemo(
    () => simulateDebtRoadmap(debts, extraPayment, "avalanche"),
    [debts, extraPayment]
  );
  const snowball = useMemo(
    () => simulateDebtRoadmap(debts, extraPayment, "snowball"),
    [debts, extraPayment]
  );

  const chartLength = Math.max(avalanche.months.length, snowball.months.length, 1);
  const chartData = Array.from({ length: chartLength }, (_, i) => ({
    month: i + 1,
    avalanche: avalanche.months[i]?.totalBalance ?? 0,
    snowball: snowball.months[i]?.totalBalance ?? 0,
  }));

  const interestSaved = snowball.totalInterestPaid - avalanche.totalInterestPaid;

  if (debts.length === 0) {
    return <p className="text-sm text-zinc-500">Add debts to see a roadmap.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
        <label htmlFor="extra" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Extra payment per month, on top of {formatCurrency(minTotalPayment, currency)} minimums:{" "}
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(extraPayment, currency)}
          </span>
        </label>
        <input
          id="extra"
          type="range"
          min={0}
          max={Math.max(minTotalPayment * 3, 500)}
          step={10}
          value={extraPayment}
          onChange={(e) => setExtraPayment(Number(e.target.value))}
          className="mt-3 w-full"
        />
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Total balance over time
        </h2>
        <div className="mt-4">
          <RoadmapAreaChart
            data={chartData}
            currency={currency}
            series={[
              { key: "avalanche", name: "Avalanche (highest interest first)", color: "var(--status-critical)" },
              { key: "snowball", name: "Snowball (smallest balance first)", color: "var(--status-serious)" },
            ]}
          />
        </div>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {interestSaved > 0.5
            ? `Avalanche saves ${formatCurrency(interestSaved, currency)} in interest vs. snowball at this extra payment.`
            : "Both strategies cost about the same in interest at this extra payment."}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <RoadmapTable title="Avalanche (highest interest first)" result={avalanche} currency={currency} />
        <RoadmapTable title="Snowball (smallest balance first)" result={snowball} currency={currency} />
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
  result: ReturnType<typeof simulateDebtRoadmap>;
  currency: string;
}) {
  return (
    <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Debt-free in {monthsFromNowLabel(result.payoffMonth)} · Total interest{" "}
        {formatCurrency(result.totalInterestPaid, currency)}
      </p>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-left text-zinc-500">
            <th className="py-1 font-medium">Debt</th>
            <th className="py-1 font-medium text-right">Paid off in</th>
            <th className="py-1 font-medium text-right">Interest</th>
          </tr>
        </thead>
        <tbody>
          {result.debts
            .slice()
            .sort((a, b) => (a.payoffMonth ?? Infinity) - (b.payoffMonth ?? Infinity))
            .map((d) => (
              <tr key={d.id} className="border-t border-black/5 dark:border-white/5">
                <td className="py-1.5">{d.name}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {monthsFromNowLabel(d.payoffMonth)}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatCurrency(d.totalInterestPaid, currency)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </section>
  );
}
