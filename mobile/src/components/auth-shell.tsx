import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark } from "@/components/icons";
import { cardShadow } from "@/components/ui/layout";
import { AppText } from "@/components/ui/text";
import { Radius, Spacing } from "@/constants/theme";
import { usePalette } from "@/lib/theme";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: palette.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + Spacing.six, paddingBottom: insets.bottom + Spacing.six }]}
      >
        <View style={[styles.card, cardShadow(palette), { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.brand}>
            <BrandMark size={44} color={palette.foreground} />
            <AppText size={20} weight="display" tracking={-0.01}>
              Pocket Watcher
            </AppText>
          </View>
          <AppText size={30} weight="display" tracking={-0.02} lineHeight={36} accessibilityRole="header">
            {title}
          </AppText>
          <AppText size={14} color="muted" lineHeight={22} style={{ marginTop: Spacing.two }}>
            {description}
          </AppText>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: Spacing.five },
  card: { borderWidth: 1, borderRadius: Radius.xxl, padding: Spacing.six },
  brand: { flexDirection: "row", alignItems: "center", gap: Spacing.three, marginBottom: Spacing.eight },
});
