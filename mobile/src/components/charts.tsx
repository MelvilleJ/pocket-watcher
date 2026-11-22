import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { G, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { AppText } from "@/components/ui/text";
import { Fonts, Spacing } from "@/constants/theme";
import { formatCompactCurrency, formatCurrency, MONTH_NAMES } from "@/lib/format";
import { usePalette } from "@/lib/theme";

function niceMax(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  const step = steps.find((s) => s * magnitude >= value) ?? 10;
  return step * magnitude;
}

function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <View style={styles.legend}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          {item.dashed ? (
            <Svg width={16} height={10}>
              <Line x1={0} x2={16} y1={5} y2={5} stroke={item.color} strokeWidth={2} strokeDasharray="4 3" />
            </Svg>
          ) : (
            <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
          )}
          <AppText size={12} color="chartTextSecondary">
            {item.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function Tooltip({ title, rows, currency }: { title: string; rows: { label: string; value: number; color: string }[]; currency: string }) {
  const palette = usePalette();
  return (
    <View style={[styles.tooltip, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <AppText size={12} weight="bold">
        {title}
      </AppText>
      {rows.map((r) => (
        <View key={r.label} style={styles.tooltipRow}>
          <View style={[styles.legendSwatch, { backgroundColor: r.color }]} />
          <AppText size={12} color="muted" style={{ flex: 1 }}>
            {r.label}
          </AppText>
          <AppText size={12} weight="semibold" tabular>
            {formatCurrency(r.value, currency, 0)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

export type MoneyFlowPoint = {
  monthIndex: number;
  income: number;
  expenses: number;
  subscriptions: number;
  debtPayments: number;
};

export function MoneyFlowChart({ data, currency }: { data: MoneyFlowPoint[]; currency: string }) {
  const palette = usePalette();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const height = 220;
  const left = 46;
  const bottom = 22;
  const top = 8;
  const plotW = Math.max(width - left, 1);
  const plotH = height - bottom - top;
  const max = niceMax(Math.max(...data.map((d) => Math.max(d.income, d.expenses + d.subscriptions + d.debtPayments)), 0));
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const slot = plotW / Math.max(data.length, 1);
  const barW = Math.max(Math.min(slot * 0.3, 14), 3);
  const series = [
    { key: "expenses" as const, label: "Expenses", color: palette.primaryDeep },
    { key: "subscriptions" as const, label: "Subscriptions", color: palette.series[2] },
    { key: "debtPayments" as const, label: "Debt payments", color: palette.series[3] },
  ];
  const point = selected !== null ? data[selected] : null;
  const active = data.filter((d) => d.income > 0 || d.expenses + d.subscriptions + d.debtPayments > 0);
  const overspent = active.filter((d) => d.expenses + d.subscriptions + d.debtPayments > d.income).length;
  const summary =
    active.length === 0
      ? "No money in or out recorded this year yet."
      : `Money out was higher than money in for ${overspent} of ${active.length} month${active.length === 1 ? "" : "s"} with activity.`;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ gap: Spacing.three }}>
      {width > 0 && (
        <View accessible accessibilityRole="image" accessibilityLabel={summary}>
        <Svg width={width} height={height}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <G key={t}>
              <Line x1={left} x2={width} y1={y(max * t)} y2={y(max * t)} stroke={palette.chartGridline} strokeDasharray="3 3" />
              <SvgText x={left - 6} y={y(max * t) + 4} fontSize={10} fill={palette.chartTextMuted} textAnchor="end" fontFamily={Fonts.regular}>
                {formatCompactCurrency(max * t, currency)}
              </SvgText>
            </G>
          ))}
          <Line x1={left} x2={width} y1={top + plotH} y2={top + plotH} stroke={palette.chartBaseline} />
          {data.map((d, i) => {
            const cx = left + slot * i + slot / 2;
            let stackTop = top + plotH;
            const dim = selected !== null && selected !== i;
            return (
              <G key={d.monthIndex} opacity={dim ? 0.45 : 1}>
                <Rect x={cx - barW - 1} y={y(d.income)} width={barW} height={top + plotH - y(d.income)} rx={3} fill={palette.good} />
                {series.map((s) => {
                  const h = (d[s.key] / max) * plotH;
                  stackTop -= h;
                  // A surface-coloured edge keeps neighbouring segments apart where their hues are close.
                  return <Rect key={s.key} x={cx + 1} y={stackTop} width={barW} height={h} fill={s.color} stroke={palette.surface} strokeWidth={h > 2 ? 1 : 0} />;
                })}
                <SvgText x={cx} y={height - 6} fontSize={10} fill={palette.chartTextMuted} textAnchor="middle" fontFamily={Fonts.regular}>
                  {MONTH_NAMES[d.monthIndex].slice(0, 1)}
                </SvgText>
              </G>
            );
          })}
        </Svg>
        </View>
      )}
      {width > 0 && (
        <View style={[StyleSheet.absoluteFill, { flexDirection: "row", left, height }]}>
          {data.map((d, i) => (
            <Pressable
              key={d.monthIndex}
              style={{ flex: 1 }}
              accessibilityRole="button"
              accessibilityLabel={`${MONTH_NAMES[d.monthIndex]} details`}
              accessibilityState={{ selected: selected === i }}
              onPress={() => setSelected(selected === i ? null : i)}
            />
          ))}
        </View>
      )}
      {point ? (
        <Tooltip
          title={MONTH_NAMES[point.monthIndex]}
          currency={currency}
          rows={[{ label: "Income", value: point.income, color: palette.good }, ...series.map((s) => ({ label: s.label, value: point[s.key], color: s.color }))]}
        />
      ) : (
        <Legend items={[{ label: "Income", color: palette.good }, ...series]} />
      )}
    </View>
  );
}

export function CategoryBreakdownChart({ data, currency }: { data: { category: string; value: number }[]; currency: string }) {
  const palette = usePalette();
  const ramp = palette.chartRamp;
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const top = data.reduce<(typeof data)[number] | null>((best, d) => (!best || d.value > best.value ? d : best), null);
  const summary = top
    ? `Most spending went to ${top.category}: ${formatCurrency(top.value, currency, 0)}, ${Math.round((top.value / Math.max(total, 1)) * 100)}% of the month's total.`
    : "No spending recorded.";
  const breakdown = data.map((d) => `${d.category} ${formatCurrency(d.value, currency, 0)}`).join(", ");
  return (
    <View style={{ gap: 10 }} accessible accessibilityRole="image" accessibilityLabel={top ? `${summary} ${breakdown}.` : summary}>
      {data.map((d) => {
        const intensity = d.value / max;
        const color = ramp[Math.min(ramp.length - 1, Math.round(intensity * (ramp.length - 1)))];
        return (
          <View key={d.category} style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: Spacing.two }}>
              <AppText size={13} color="chartTextSecondary" numberOfLines={1} style={{ flex: 1 }}>
                {d.category}
              </AppText>
              <AppText size={13} weight="semibold" tabular>
                {formatCurrency(d.value, currency, 0)}
              </AppText>
            </View>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: palette.chartGridline, overflow: "hidden" }}>
              <View style={{ width: `${Math.max(intensity * 100, 2)}%`, height: "100%", borderRadius: 5, backgroundColor: color }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export type RoadmapSeries = { key: string; name: string; color: string; dashed?: boolean };

export function RoadmapAreaChart({
  data,
  series,
  currency,
  summary,
}: {
  data: ({ month: number } & Record<string, number>)[];
  series: RoadmapSeries[];
  currency: string;
  summary: string;
}) {
  const palette = usePalette();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const height = 220;
  const left = 50;
  const bottom = 22;
  const top = 10;
  const plotW = Math.max(width - left - 8, 1);
  const plotH = height - bottom - top;
  const max = niceMax(Math.max(...data.flatMap((d) => series.map((s) => d[s.key] ?? 0)), 0));
  const x = (i: number) => left + (data.length <= 1 ? 0 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const tickEvery = Math.max(1, Math.ceil(data.length / 6));

  const linePath = (key: string) => data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d[key] ?? 0)}`).join(" ");
  const areaPath = (key: string) => `${linePath(key)} L${x(data.length - 1)},${top + plotH} L${x(0)},${top + plotH} Z`;
  const point = selected !== null ? data[selected] : null;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ gap: Spacing.three }}>
      {width > 0 && (
        <View accessible accessibilityRole="image" accessibilityLabel={summary}>
        <Svg width={width} height={height}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <G key={t}>
              <Line x1={left} x2={width} y1={y(max * t)} y2={y(max * t)} stroke={palette.chartGridline} strokeDasharray="3 3" />
              <SvgText x={left - 6} y={y(max * t) + 4} fontSize={10} fill={palette.chartTextMuted} textAnchor="end" fontFamily={Fonts.regular}>
                {formatCompactCurrency(max * t, currency)}
              </SvgText>
            </G>
          ))}
          {data.length > 1 &&
            series.map((s) => (
              <G key={s.key}>
                {!s.dashed && <Path d={areaPath(s.key)} fill={s.color} fillOpacity={0.1} />}
                <Path d={linePath(s.key)} stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "6 4" : undefined} fill="none" />
              </G>
            ))}
          {data.map((d, i) =>
            i % tickEvery === 0 ? (
              <SvgText key={d.month} x={x(i)} y={height - 6} fontSize={10} fill={palette.chartTextMuted} textAnchor="middle" fontFamily={Fonts.regular}>
                {`M${d.month}`}
              </SvgText>
            ) : null
          )}
          {selected !== null && <Line x1={x(selected)} x2={x(selected)} y1={top} y2={top + plotH} stroke={palette.borderStrong} />}
        </Svg>
        </View>
      )}
      {width > 0 && data.length > 1 && (
        <View
          style={[StyleSheet.absoluteFill, { left, width: plotW, height }]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => setSelected(Math.round((e.nativeEvent.locationX / plotW) * (data.length - 1)))}
          onResponderMove={(e) =>
            setSelected(Math.max(0, Math.min(data.length - 1, Math.round((e.nativeEvent.locationX / plotW) * (data.length - 1)))))
          }
        />
      )}
      {point ? (
        <Tooltip
          title={`Month ${point.month}`}
          currency={currency}
          rows={series.map((s) => ({ label: s.name, value: point[s.key] ?? 0, color: s.color }))}
        />
      ) : (
        <Legend items={series.map((s) => ({ label: s.name, color: s.color, dashed: s.dashed }))} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: Spacing.three },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  tooltip: { borderWidth: 1, borderRadius: 11, padding: Spacing.three, gap: 4 },
  tooltipRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
});
