"use client";

import { useId } from "react";
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
};

type RoadmapPoint = { month: number } & Record<string, number>;

const DONE_COLOR = "var(--status-good)";

function formatCurrency(value: number, currency: string) {
  return `${currency}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function RoadmapAreaChart({
  data,
  series,
  currency,
}: {
  data: RoadmapPoint[];
  series: RoadmapSeries[];
  currency: string;
}) {
  // useId output contains characters that break url(#...) references.
  const idPrefix = `roadmap-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;

  return (
    <div className="w-full">
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 12, right: 16, left: 8, bottom: 8 }}
          >
            <defs>
              {series.map((s) => (
                // Vertical gradients map high balances to the series colour and
                // the zero line to green, so each line turns green as it finishes.
                <g key={s.key}>
                  <linearGradient
                    id={`${idPrefix}-stroke-${s.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={s.color} />
                    <stop offset="55%" stopColor={s.color} />
                    <stop offset="100%" stopColor={DONE_COLOR} />
                  </linearGradient>
                  <linearGradient
                    id={`${idPrefix}-fill-${s.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                    <stop
                      offset="70%"
                      stopColor={DONE_COLOR}
                      stopOpacity={0.1}
                    />
                    <stop
                      offset="100%"
                      stopColor={DONE_COLOR}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </g>
              ))}
            </defs>
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
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={`url(#${idPrefix}-stroke-${s.key})`}
                strokeWidth={2.5}
                fill={`url(#${idPrefix}-fill-${s.key})`}
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
            <span
              aria-hidden="true"
              className="h-1 w-6 rounded-full"
              style={{
                background: `linear-gradient(90deg, ${s.color}, ${DONE_COLOR})`,
              }}
            />
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
