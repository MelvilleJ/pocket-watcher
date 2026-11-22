import { Text } from "react-native";

import { AppText, type AppTextProps } from "@/components/ui/text";
import { Fonts } from "@/constants/theme";
import { formatCurrency, splitCurrency } from "@/lib/format";
import { usePalette } from "@/lib/theme";

// The identity motif from DESIGN.md: large tabular figure with a smaller, muted currency prefix.
export function Money({
  amount,
  currency,
  size = 20,
  color = "foreground",
  fractionDigits = 2,
  numberOfLines = 1,
}: {
  amount: number;
  currency: string;
  size?: number;
  color?: AppTextProps["color"];
  fractionDigits?: number;
  numberOfLines?: number;
}) {
  const palette = usePalette();
  const parts = splitCurrency(amount, currency, fractionDigits);

  const display = size >= 22;

  return (
    <AppText
      size={size}
      weight={display ? "display" : "bold"}
      tabular
      tracking={display ? -0.01 : -0.02}
      color={color}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit
      accessibilityLabel={formatCurrency(amount, currency, fractionDigits)}
    >
      {parts.sign}
      <Text style={{ fontFamily: Fonts.semibold, fontSize: Math.round(size * (display ? 0.5 : 0.6)), color: palette.muted, letterSpacing: 0 }}>
        {parts.currency}
        {" "}
      </Text>
      {parts.number}
    </AppText>
  );
}
