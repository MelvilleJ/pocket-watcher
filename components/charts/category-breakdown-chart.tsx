"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type CategoryPoint = {
  category: string;
  value: number;
};

function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

const SEQUENTIAL_STEPS = [
  "#cde2fb",
  "#9ec5f4",
  "#6da7ec",
  "#3987e5",
  "#256abf",
  "#184f95",
  "#0d366b",
];

export function CategoryBreakdownChart({
  data,
  currency,
}: {
  data: CategoryPoint[];
  currency: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div style={{ height: Math.max(data.length * 34, 120) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-gridline)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "var(--chart-text-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatCurrency(v, currency)}
          />
          <YAxis
            type="category"
            dataKey="category"
            tick={{ fill: "var(--chart-text-secondary)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={140}
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
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((d) => {
              const intensity = d.value / max;
              const stepIndex = Math.min(
                SEQUENTIAL_STEPS.length - 1,
                Math.round(intensity * (SEQUENTIAL_STEPS.length - 1))
              );
              return <Cell key={d.category} fill={SEQUENTIAL_STEPS[stepIndex]} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
