"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CalendarMonth } from "@/lib/queries/calendar";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

const CHART_ROWS: Array<[string, keyof CalendarMonth]> = [
  ["Income", "income"],
  ["Expenses", "expenses"],
  ["Subscriptions", "subscriptions"],
  ["Debt payments", "debtPayments"],
  ["Goal contributions", "goalPayments"],
  ["Cash committed", "totalOut"],
  ["Net cash", "net"],
];

// With one month selected the bars carry money meaning; with two, each month
// keeps one consistent colour so the lengths are what you compare.
function semanticFill(measure: string, value: number) {
  if (measure === "Income") return "var(--status-good)";
  if (measure === "Net cash") return value >= 0 ? "var(--status-good)" : "var(--status-critical)";
  return "var(--cat-other)";
}

export function MonthCompareChart({
  months,
  currency,
  year,
}: {
  months: CalendarMonth[];
  currency: string;
  year: number;
}) {
  const data = CHART_ROWS.map(([label, key]) => {
    const row: Record<string, string | number> = { measure: label };
    for (const month of months) row[String(month.monthIndex)] = month[key] as number;
    return row;
  });

  const summary = months
    .map(
      (month) =>
        `${MONTH_NAMES[month.monthIndex]} ${formatCurrency(month.income, currency)} in, ${formatCurrency(
          month.totalOut,
          currency
        )} out, net ${formatCurrency(month.net, currency)}`
    )
    .join("; ");

  return (
    <div role="img" aria-label={`Cash activity for ${year}: ${summary}.`} className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-gridline)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "var(--chart-text-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatCurrency(value, currency)}
          />
          <YAxis
            type="category"
            dataKey="measure"
            tick={{ fill: "var(--chart-text-secondary)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={130}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value), currency)}
            contentStyle={{
              background: "var(--chart-surface)",
              border: "1px solid var(--chart-gridline)",
              borderRadius: 8,
              color: "var(--chart-text-primary)",
            }}
          />
          {months.length > 1 && (
            <Legend wrapperStyle={{ color: "var(--chart-text-secondary)", fontSize: 12 }} />
          )}
          {months.map((month, index) => (
            <Bar
              key={month.monthIndex}
              dataKey={String(month.monthIndex)}
              name={MONTH_NAMES[month.monthIndex]}
              fill={months.length > 1 ? (index === 0 ? "var(--primary)" : "var(--cat-other)") : "var(--cat-other)"}
              radius={[0, 3, 3, 0]}
            >
              {months.length === 1 &&
                data.map((row) => (
                  <Cell
                    key={String(row.measure)}
                    fill={semanticFill(String(row.measure), Number(row[String(month.monthIndex)]))}
                  />
                ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
