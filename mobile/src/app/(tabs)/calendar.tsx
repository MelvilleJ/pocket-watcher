import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { LinkButton, PeriodPicker } from "@/components/ui/controls";
import { EmptyState, Notice, PageHero, Screen, Section } from "@/components/ui/layout";
import { AppText, Label } from "@/components/ui/text";
import { Spacing, withAlpha } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";
import { formatCompactCurrency, formatCurrency, MONTH_NAMES } from "@/lib/format";
import { useRemote } from "@/lib/remote";
import type { CalendarMonth, CalendarResponse } from "@/lib/remote-types";
import { usePalette } from "@/lib/theme";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const MEASURES: [string, keyof CalendarMonth][] = [
  ["Income", "income"],
  ["Expenses", "expenses"],
  ["Subscriptions", "subscriptions"],
  ["Debt payments", "debtPayments"],
  ["Goal contributions", "goalPayments"],
  ["Cash committed", "totalOut"],
  ["Net cash", "net"],
];

export default function CalendarScreen() {
  const { user } = useAuth();
  const palette = usePalette();
  const [year, setYear] = useState(new Date().getFullYear());
  const { data, loading, error, pulling, pull } = useRemote<CalendarResponse>(`/api/mobile/calendar?year=${year}`);
  const [comparison, setComparison] = useState<number[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const currency = user?.currency ?? "TT$";

  const years = data?.years ?? [year];
  const compared = comparison
    .map((m) => data?.months.find((month) => month.monthIndex === m))
    .filter((m): m is CalendarMonth => Boolean(m));

  function changeYear(next: number) {
    setYear(next);
    setComparison([]);
    setExpanded(null);
  }

  function toggleComparison(monthIndex: number) {
    setComparison((current) =>
      current.includes(monthIndex) ? current.filter((v) => v !== monthIndex) : [...current.slice(-1), monthIndex]
    );
  }

  return (
    <Screen refreshing={pulling} onRefresh={pull}>
      <PageHero
        title="Calendar"
        description="Review daily cash activity, then compare the months that matter."
        actions={
          <PeriodPicker
            label={String(year)}
            onPrevious={years.includes(year - 1) ? () => changeYear(year - 1) : undefined}
            onNext={years.includes(year + 1) ? () => changeYear(year + 1) : undefined}
          />
        }
      />

      {error && <Notice tone="warning">{error}</Notice>}

      <AppText size={14} color="muted">
        Tap a month to expand it. Use Compare on up to two months to see their cash activity side by side.
      </AppText>

      {compared.length > 0 && (
        <Section title="Month comparison" padded={false} right={<LinkButton label="Clear" size={12} onPress={() => setComparison([])} />}>
          <View style={[styles.compareRow, { borderBottomColor: palette.border }]}>
            <View style={{ flex: 1.3 }}>
              <Label>Measure</Label>
            </View>
            {compared.map((m) => (
              <View key={m.monthIndex} style={{ flex: 1 }}>
                <Label align="right">{MONTH_NAMES[m.monthIndex].slice(0, 3)}</Label>
              </View>
            ))}
          </View>
          {MEASURES.map(([label, key]) => (
            <View key={key} style={[styles.compareRow, { borderBottomColor: palette.border }]}>
              <AppText size={13} color="muted" style={{ flex: 1.3 }}>
                {label}
              </AppText>
              {compared.map((m) => (
                <AppText key={m.monthIndex} size={13} tabular align="right" style={{ flex: 1 }}>
                  {formatCurrency(m[key] as number, currency)}
                </AppText>
              ))}
            </View>
          ))}
        </Section>
      )}

      {!data ? (
        <View style={{ paddingVertical: Spacing.eight }}>
          {loading ? <ActivityIndicator color={palette.primary} /> : <EmptyState>Connect to your server to load the calendar.</EmptyState>}
        </View>
      ) : (
        data.months.map((month) => (
          <MonthCard
            key={`${data.year}-${month.monthIndex}`}
            year={data.year}
            month={month}
            currency={currency}
            expanded={expanded === month.monthIndex}
            selected={comparison.includes(month.monthIndex)}
            onToggleExpand={() => setExpanded(expanded === month.monthIndex ? null : month.monthIndex)}
            onToggleCompare={() => toggleComparison(month.monthIndex)}
          />
        ))
      )}

      <AppText size={12} color="muted">
        Green days include income, red days include cash outflows, and amber days include both.
      </AppText>
    </Screen>
  );
}

function MonthCard({
  year,
  month,
  currency,
  expanded,
  selected,
  onToggleExpand,
  onToggleCompare,
}: {
  year: number;
  month: CalendarMonth;
  currency: string;
  expanded: boolean;
  selected: boolean;
  onToggleExpand: () => void;
  onToggleCompare: () => void;
}) {
  const palette = usePalette();
  const days = new Map(month.days.map((d) => [d.day, d]));
  const blanks = new Date(year, month.monthIndex, 1).getDay();
  const count = new Date(year, month.monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(blanks).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];

  return (
    <Pressable
      onPress={onToggleExpand}
      style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: selected ? palette.primary : palette.border,
          borderWidth: selected ? 2 : 1,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <AppText size={16} weight="semibold">
            {MONTH_NAMES[month.monthIndex]}
          </AppText>
          <AppText size={12} tabular color={month.net >= 0 ? "good" : "critical"}>
            Net {formatCompactCurrency(month.net, currency)}
          </AppText>
        </View>
        <Pressable
          onPress={onToggleCompare}
          hitSlop={6}
          style={[styles.compareChip, { backgroundColor: selected ? palette.primarySoft : palette.surfaceInset }]}
        >
          <AppText size={11} weight="semibold" color={selected ? palette.primaryDeep : palette.muted}>
            {selected ? "Selected" : "Compare"}
          </AppText>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((d, i) => (
          <View key={`w${i}`} style={styles.cell}>
            <AppText size={11} weight="medium" color="muted">
              {d}
            </AppText>
          </View>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <View key={`b${i}`} style={styles.cell} />;
          const value = days.get(day);
          const incoming = value?.income ?? 0;
          const outgoing = (value?.expenses ?? 0) + (value?.subscriptions ?? 0) + (value?.debtPayments ?? 0) + (value?.goalPayments ?? 0);
          const tone =
            incoming > 0 && outgoing > 0
              ? { bg: withAlpha(palette.warning, 0.25), fg: palette.foreground }
              : incoming > 0
                ? { bg: withAlpha(palette.good, 0.2), fg: palette.good }
                : outgoing > 0
                  ? { bg: withAlpha(palette.critical, 0.15), fg: palette.critical }
                  : { bg: "transparent", fg: palette.muted };
          return (
            <View key={day} style={styles.cell}>
              <View style={[styles.dayBox, { backgroundColor: tone.bg }]}>
                <AppText size={11} weight={value ? "semibold" : "regular"} color={tone.fg}>
                  {day}
                </AppText>
              </View>
            </View>
          );
        })}
      </View>

      {expanded && (
        <View style={[styles.details, { borderTopColor: palette.border }]}>
          {[
            ["Income", month.income],
            ["Expenses", month.expenses],
            ["Subscriptions", month.subscriptions],
            ["Debt", month.debtPayments],
            ["Goals", month.goalPayments],
          ].map(([label, value]) => (
            <View key={label as string} style={styles.detailRow}>
              <AppText size={12} color="muted">
                {label}
              </AppText>
              <AppText size={12} tabular>
                {formatCurrency(value as number, currency)}
              </AppText>
            </View>
          ))}
          <View style={styles.detailRow}>
            <AppText size={12} weight="semibold">
              Committed
            </AppText>
            <AppText size={12} weight="semibold" tabular>
              {formatCurrency(month.totalOut, currency)}
            </AppText>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  compareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  card: { borderRadius: 14, padding: Spacing.four, gap: Spacing.three },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.three },
  compareChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, alignItems: "center", paddingVertical: 2 },
  dayBox: { width: 30, height: 24, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  details: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.three, gap: 4 },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
});
