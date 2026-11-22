import { Text, type TextProps } from "react-native";

import { Fonts, type Palette } from "@/constants/theme";
import { usePalette } from "@/lib/theme";

type Weight = keyof typeof Fonts;
type ColorKey = { [K in keyof Palette]: Palette[K] extends string ? K : never }[keyof Palette];

export type AppTextProps = TextProps & {
  size?: number;
  weight?: Weight;
  color?: ColorKey | (string & {});
  tabular?: boolean;
  tracking?: number;
  lineHeight?: number;
  align?: "left" | "center" | "right";
};

// Android ignores fontWeight for custom fonts, so each weight maps to its own Geist file.
export function AppText({
  size = 14,
  weight = "regular",
  color = "foreground",
  tabular,
  tracking,
  lineHeight,
  align,
  style,
  ...rest
}: AppTextProps) {
  const palette = usePalette();
  const resolved = color in palette ? (palette[color as ColorKey] as string) : color;

  return (
    <Text
      style={[
        {
          fontFamily: Fonts[weight],
          fontSize: size,
          color: resolved,
          lineHeight: lineHeight ?? Math.round(size * 1.4),
          letterSpacing: tracking !== undefined ? tracking * size : undefined,
          fontVariant: tabular ? ["tabular-nums"] : undefined,
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    />
  );
}

export function Label({
  children,
  color = "muted",
  align,
}: {
  children: React.ReactNode;
  color?: AppTextProps["color"];
  align?: AppTextProps["align"];
}) {
  return (
    <AppText size={12} weight="medium" color={color} align={align}>
      {children}
    </AppText>
  );
}
