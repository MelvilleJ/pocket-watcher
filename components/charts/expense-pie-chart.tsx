"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { CategoryPoint } from "@/components/charts/category-breakdown-chart";

const SLICE_COLORS = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--cat-5)"];
const OTHER_COLOR = "var(--cat-other)";

type Slice = CategoryPoint & { color: string; share: number };

function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// More than five slices stop being comparable, so the long tail folds into "Other".
function toSlices(data: CategoryPoint[]): Slice[] {
  const sorted = [...data].filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, d) => sum + d.value, 0) || 1;
  const head = sorted.slice(0, SLICE_COLORS.length);
  const tail = sorted.slice(SLICE_COLORS.length);
  const slices = head.map((d, i) => ({ ...d, color: SLICE_COLORS[i], share: d.value / total }));
  if (tail.length > 0) {
    const value = tail.reduce((sum, d) => sum + d.value, 0);
    slices.push({
      category: `Other (${tail.length})`,
      value,
      color: OTHER_COLOR,
      share: value / total,
    });
  }
  return slices;
}

export function ExpensePieChart({ data, currency }: { data: CategoryPoint[]; currency: string }) {
  const slices = toSlices(data);
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const summary = slices
    .map((s) => `${s.category} ${Math.round(s.share * 100)}%`)
    .join(", ");

  return (
    <div className="expense-pie">
      <div
        className="expense-pie-chart"
        role="img"
        aria-label={`Expenses this month, ${formatCurrency(total, currency)} in total: ${summary}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="category"
              innerRadius="62%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="var(--chart-surface)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.category} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [formatCurrency(Number(value), currency), name]}
              contentStyle={{
                background: "var(--chart-surface)",
                border: "1px solid var(--chart-gridline)",
                borderRadius: 8,
                color: "var(--chart-text-primary)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="expense-pie-center" aria-hidden="true">
          <span className="expense-pie-center-label">Spent</span>
          <span className="expense-pie-center-value">{formatCurrency(total, currency)}</span>
        </div>
      </div>

      <ol className="expense-pie-legend">
        {slices.map((s) => (
          <li key={s.category}>
            <span className="expense-pie-swatch" style={{ background: s.color }} aria-hidden="true" />
            <span className="expense-pie-name">{s.category}</span>
            <span className="expense-pie-share">{Math.round(s.share * 100)}%</span>
            <span className="expense-pie-amount">{formatCurrency(s.value, currency)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
