"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function GoalsRoadmapChart({
  data,
  currency,
}: {
  data: { month: number; largest: number; smallest: number }[];
  currency: string;
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-gridline)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "var(--chart-text-muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--chart-baseline)" }}
            tickLine={false}
            label={{
              value: "Months from now",
              position: "insideBottom",
              offset: -4,
              fill: "var(--chart-text-muted)",
              fontSize: 12,
            }}
          />
          <YAxis
            tick={{ fill: "var(--chart-text-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatCurrency(v, currency)}
            width={70}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value), currency)}
            labelFormatter={(l) => `Month ${l}`}
            contentStyle={{
              background: "var(--chart-surface)",
              border: "1px solid var(--chart-gridline)",
              borderRadius: 8,
              color: "var(--chart-text-primary)",
            }}
          />
          <Legend wrapperStyle={{ color: "var(--chart-text-secondary)", fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="largest"
            name="Largest remaining first"
            stroke="var(--series-1)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="smallest"
            name="Smallest remaining first"
            stroke="var(--series-2)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
