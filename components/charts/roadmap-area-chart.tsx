"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type RoadmapSeries = {
  key: string;
  name: string;
  color: string;
  dashed?: boolean;
};

type RoadmapPoint = { month: number } & Record<string, number>;

const DONE_COLOR = "var(--status-good)";
const DASH = "6 4";

function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function RoadmapAreaChart({
  data,
  series,
  currency,
  summary,
}: {
  data: RoadmapPoint[];
  series: RoadmapSeries[];
  currency: string;
  summary: string;
}) {
  return (
    <div className="w-full">
      <div role="img" aria-label={summary} className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 12, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--chart-gridline)"
              vertical={false}
            />
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
              itemStyle={{ color: "var(--chart-text-primary)" }}
            />
            {series.map((s, seriesIndex) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2.5}
                strokeDasharray={s.dashed ? DASH : undefined}
                fill={s.color}
                fillOpacity={seriesIndex === 0 ? 0.1 : 0}
                dot={(props: { cx?: number; cy?: number; index?: number }) => {
                  const { cx, cy, index = 0 } = props;
                  const reachedZero =
                    index > 0 &&
                    data[index]?.[s.key] === 0 &&
                    (data[index - 1]?.[s.key] ?? 0) > 0;
                  if (!reachedZero || cx === undefined || cy === undefined) {
                    return <g key={`${s.key}-dot-${index}`} />;
                  }
                  return (
                    <circle
                      key={`${s.key}-dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={DONE_COLOR}
                      stroke="var(--chart-surface)"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{
                  r: 4,
                  fill: s.color,
                  stroke: "var(--chart-surface)",
                  strokeWidth: 2,
                }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-[color:var(--chart-text-secondary)]">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <svg aria-hidden="true" width="24" height="4" className="shrink-0">
              <line
                x1="0"
                y1="2"
                x2="24"
                y2="2"
                stroke={s.color}
                strokeWidth="2.5"
                strokeDasharray={s.dashed ? DASH : undefined}
              />
            </svg>
            {s.name}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: DONE_COLOR }}
          />
          Finished
        </li>
      </ul>
    </div>
  );
}
