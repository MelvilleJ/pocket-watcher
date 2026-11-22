import type { BottomTabBarProps } from "expo-router/js-tabs";
import { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark, Icon, type IconName } from "@/components/icons";
import { AppText } from "@/components/ui/text";
import { Spacing, withAlpha } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";
import { usePalette } from "@/lib/theme";
import { useConfirmLogout } from "@/lib/use-confirm-logout";

export const NAV_ITEMS: { name: string; label: string; icon: IconName }[] = [
  { name: "index", label: "Summary", icon: "home" },
  { name: "calendar", label: "Calendar", icon: "calendar" },
  { name: "budget", label: "Budget", icon: "budget" },
  { name: "transactions", label: "Transactions", icon: "transactions" },
  { name: "subscriptions", label: "Subscriptions", icon: "subscription" },
  { name: "debts", label: "Debts", icon: "debt" },
  { name: "goals", label: "Goals", icon: "goal" },
  { name: "history", label: "History", icon: "history" },
  { name: "settings", label: "Settings", icon: "settings" },
];

// The web app's narrow-screen header: brand row on top, a scrolling row of pill links underneath.
export function AppHeader({ state, navigation }: BottomTabBarProps) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const activeName = state.routes[state.index]?.name;

  useEffect(() => {
    const x = offsets.current[activeName];
    if (x !== undefined) scrollRef.current?.scrollTo({ x: Math.max(x - 24, 0), animated: true });
  }, [activeName]);

  const confirmLogout = useConfirmLogout();

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top, backgroundColor: withAlpha(palette.surface, 0.97), borderBottomColor: palette.border },
      ]}
    >
      <View style={styles.brandRow}>
        <Pressable style={styles.brand} onPress={() => navigation.navigate("index")}>
          <BrandMark size={34} color={palette.foreground} />
          <AppText size={18} weight="display" tracking={-0.01}>
            Pocket Watcher
          </AppText>
        </Pressable>
        <View style={styles.brandActions}>
          <View style={[styles.avatar, { backgroundColor: palette.surfaceInset }]}>
            <AppText size={13} weight="bold" color="primaryDeep">
              {(user?.name ?? "?").slice(0, 1).toUpperCase()}
            </AppText>
          </View>
          <Pressable
            onPress={confirmLogout}
            accessibilityLabel="Log out"
            style={({ pressed }) => [
              styles.logout,
              {
                borderColor: pressed ? withAlpha(palette.critical, 0.4) : palette.border,
                backgroundColor: pressed ? withAlpha(palette.critical, 0.06) : palette.surface,
              },
            ]}
          >
            {({ pressed }) => <Icon name="logout" size={16} color={pressed ? palette.critical : palette.muted} />}
          </Pressable>
        </View>
      </View>

      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const route = state.routes.find((r) => r.name === item.name);
          if (!route) return null;
          const active = item.name === activeName;
          const color = active ? palette.primaryDeep : palette.muted;
          return (
            <Pressable
              key={item.name}
              onLayout={(e) => {
                offsets.current[item.name] = e.nativeEvent.layout.x;
              }}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!active && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={({ pressed }) => [
                styles.navLink,
                { backgroundColor: active ? palette.primarySoft : pressed ? palette.surfaceInset : "transparent" },
              ]}
            >
              <Icon name={item.icon} size={15} color={color} />
              <AppText size={12} weight="semibold" color={color}>
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { borderBottomWidth: StyleSheet.hairlineWidth },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandActions: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  avatar: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  logout: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  nav: { gap: Spacing.one, paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  navLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 11,
    borderRadius: 10,
  },
});
