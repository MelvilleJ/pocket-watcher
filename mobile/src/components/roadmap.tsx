import Slider from "@react-native-community/slider";
import { StyleSheet, View } from "react-native";

import { Section } from "@/components/ui/layout";
import { AppText, Label } from "@/components/ui/text";
import { Spacing } from "@/constants/theme";
import { formatCurrency, monthsFromNowLabel } from "@/lib/format";
import { usePalette } from "@/lib/theme";

export function AmountSlider({
  label,
  value,
  max,
  onChange,
  currency,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
  currency: string;
}) {
  const palette = usePalette();
  return (
    <Section>
      <AppText size={14} weight="medium" color="muted">
        {label}{" "}
        <AppText size={14} weight="bold" tabular>
          {formatCurrency(value, currency, 0)}
        </AppText>
      </AppText>
      <Slider
        minimumValue={0}
        maximumValue={max}
        step={10}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={palette.primary}
        maximumTrackTintColor={palette.borderStrong}
        thumbTintColor={palette.primary}
      />
    </Section>
  );
}

export function StrategyTable({
  title,
  summary,
  columns,
  rows,
}: {
  title: string;
  summary: string;
  columns: [string, string, string];
  rows: { id: string; name: string; month: number | null; amount: string }[];
}) {
  const palette = usePalette();
  const sorted = rows.slice().sort((a, b) => (a.month ?? Infinity) - (b.month ?? Infinity));
  return (
    <Section title={title} subtitle={summary} padded={false}>
      <View style={[styles.row, { borderBottomColor: palette.border }]}>
        {columns.map((c, i) => (
          <View key={c} style={{ flex: i === 0 ? 1.4 : 1 }}>
            <Label align={i === 0 ? "left" : "right"}>{c}</Label>
          </View>
        ))}
      </View>
      {sorted.map((r) => (
        <View key={r.id} style={[styles.row, { borderBottomColor: palette.border }]}>
          <AppText size={13} numberOfLines={1} style={{ flex: 1.4 }}>
            {r.name}
          </AppText>
          <AppText size={13} tabular align="right" style={{ flex: 1 }}>
            {monthsFromNowLabel(r.month)}
          </AppText>
          <AppText size={13} tabular align="right" style={{ flex: 1 }}>
            {r.amount}
          </AppText>
        </View>
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
