import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from "react-native";

import { AppText, Label } from "@/components/ui/text";
import { Radius, Spacing, withAlpha, type Palette } from "@/constants/theme";
import { usePalette } from "@/lib/theme";

export function Screen({
  children,
  refreshing,
  onRefresh,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const palette = usePalette();

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(refreshing)}
              onRefresh={onRefresh}
              tintColor={palette.primary}
              colors={[palette.primary]}
              progressBackgroundColor={palette.surface}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </View>
  );
}

export type HeroStat = { label: string; value: ReactNode };

export function PageHero({
  title,
  description,
  stats = [],
  actions,
  children,
}: {
  title: string;
  description: string;
  stats?: HeroStat[];
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View style={styles.hero}>
      <View style={{ gap: Spacing.one }}>
        <AppText size={32} weight="display" tracking={-0.02} lineHeight={38} accessibilityRole="header">
          {title}
        </AppText>
        <AppText size={14} color="muted" lineHeight={21}>
          {description}
        </AppText>
      </View>
      {children}
      {actions && <View style={styles.heroActions}>{actions}</View>}
      {stats.length > 0 && (
        <View style={styles.heroStats}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.heroStat}>
              <Label>{stat.label}</Label>
              {typeof stat.value === "string" ? (
                <AppText size={22} weight="display" tabular numberOfLines={1} adjustsFontSizeToFit>
                  {stat.value}
                </AppText>
              ) : (
                stat.value
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function Section({
  title,
  subtitle,
  right,
  children,
  padded = true,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  padded?: boolean;
}) {
  const palette = usePalette();

  return (
    <View style={[styles.sectionShadow, cardShadow(palette), { backgroundColor: palette.surface }]}>
      <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        {title && (
          <View style={[styles.sectionHeader, { borderBottomColor: palette.border }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText size={15} weight="semibold" tracking={-0.012} accessibilityRole="header">
                {title}
              </AppText>
              {subtitle && (
                <AppText size={12} weight="medium" color="muted">
                  {subtitle}
                </AppText>
              )}
            </View>
            {right}
          </View>
        )}
        <View style={padded ? styles.sectionBody : undefined}>{children}</View>
      </View>
    </View>
  );
}

export function cardShadow(palette: Palette): ViewStyle {
  return {
    shadowColor: palette.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}

export function FocalRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.focalRow}>
      <AppText size={14} color="muted">
        {label}
      </AppText>
      {typeof children === "string" ? (
        <AppText size={15} weight="semibold" tabular>
          {children}
        </AppText>
      ) : (
        children
      )}
    </View>
  );
}

export function FocalPanel({ label, children, footer }: { label: string; children: ReactNode; footer?: ReactNode }) {
  const palette = usePalette();

  return (
    <View style={[styles.focal, { backgroundColor: palette.primarySoft, borderColor: withAlpha(palette.primary, 0.25) }]}>
      <AppText size={13} weight="semibold" color="primaryDeep">
        {label}
      </AppText>
      {children}
      {footer && <View style={[styles.focalFooter, { borderTopColor: withAlpha(palette.primary, 0.25) }]}>{footer}</View>}
    </View>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <View style={styles.statGrid}>{children}</View>;
}

export function StatTile({
  label,
  value,
  tone = "neutral",
  detail,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "critical";
  detail?: string;
}) {
  const palette = usePalette();
  const valueColor = tone === "good" ? palette.good : tone === "critical" ? palette.critical : palette.foreground;

  return (
    <View style={[styles.statTile, cardShadow(palette), { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Label>{label}</Label>
      <AppText size={20} weight="bold" tabular tracking={-0.02} color={valueColor} numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: "auto" }}>
        {value}
      </AppText>
      {detail && (
        <AppText size={12} tabular color="muted">
          {detail}
        </AppText>
      )}
    </View>
  );
}

export function ProgressBar({ value, color }: { value: number; color: string }) {
  const palette = usePalette();
  return (
    <View style={[styles.progress, { backgroundColor: palette.surfaceInset }]}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: "100%", backgroundColor: color, borderRadius: Radius.pill }} />
    </View>
  );
}

export function Notice({ tone = "neutral", children }: { tone?: "neutral" | "warning" | "critical"; children: ReactNode }) {
  const palette = usePalette();
  const color = tone === "warning" ? palette.warning : tone === "critical" ? palette.critical : palette.muted;
  const textColor = tone === "warning" ? palette.warningInk : color;
  return (
    <View style={[styles.notice, { backgroundColor: withAlpha(color, 0.12), borderColor: withAlpha(color, 0.3) }]}>
      <AppText size={13} weight="medium" color={tone === "neutral" ? "muted" : textColor}>
        {children}
      </AppText>
    </View>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <AppText size={14} color="muted" align="center" style={{ paddingVertical: Spacing.six, paddingHorizontal: Spacing.five }}>
      {children}
    </AppText>
  );
}

export function Divider() {
  const palette = usePalette();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: palette.border }} />;
}

export function Row({
  children,
  style,
  gap = Spacing.two,
}: {
  children: ReactNode;
  style?: ViewStyle;
  gap?: number;
}) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.five, paddingBottom: Spacing.eight * 2 },
  hero: { gap: Spacing.four, paddingTop: Spacing.two },
  heroActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: Spacing.three },
  heroStats: { flexDirection: "row", flexWrap: "wrap", columnGap: Spacing.six, rowGap: Spacing.three },
  heroStat: { flexShrink: 1, minWidth: 96, gap: 2 },
  sectionShadow: { borderRadius: Radius.xl },
  section: { borderWidth: 1, borderRadius: Radius.xl, overflow: "hidden" },
  focal: { borderWidth: 1, borderRadius: Radius.xxl, padding: Spacing.five, gap: Spacing.one },
  focalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: Spacing.three },
  focalFooter: { marginTop: Spacing.three, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth, gap: Spacing.two },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionBody: { padding: Spacing.five, gap: Spacing.four },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.three },
  statTile: {
    flexGrow: 1,
    flexBasis: "45%",
    minHeight: 96,
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.four,
    paddingHorizontal: 18,
    gap: Spacing.two,
  },
  progress: { height: 8, borderRadius: Radius.pill, overflow: "hidden" },
  notice: { borderWidth: 1, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: Spacing.four },
});
