"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type MoneyFlowPoint = {
  label: string;
  income: number;
  expenses: number;
  subscriptions: number;
  debtPayments: number;
};

function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function MoneyFlowChart({
  data,
  currency,
}: {
  data: MoneyFlowPoint[];
  currency: string;
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--chart-gridline)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--chart-text-muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--chart-baseline)" }}
            tickLine={false}
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
            contentStyle={{
              background: "var(--chart-surface)",
              border: "1px solid var(--chart-gridline)",
              borderRadius: 8,
              color: "var(--chart-text-primary)",
            }}
          />
          <Legend wrapperStyle={{ color: "var(--chart-text-secondary)", fontSize: 12 }} />
          <Bar dataKey="income" name="Income" fill="var(--series-1)" radius={[4, 4, 0, 0]} />
          <Bar
            dataKey="expenses"
            name="Expenses"
            stackId="out"
            fill="var(--series-2)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="subscriptions"
            name="Subscriptions"
            stackId="out"
            fill="var(--series-3)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="debtPayments"
            name="Debt payments"
            stackId="out"
            fill="var(--series-4)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
