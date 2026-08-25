import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator } from "react-native";

import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/lib/auth-context";

export default function TabsLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="index" options={{ title: "Summary" }} />
      <Tabs.Screen name="income" options={{ title: "Income" }} />
      <Tabs.Screen name="expenses" options={{ title: "Expenses" }} />
      <Tabs.Screen name="subscriptions" options={{ title: "Subscriptions" }} />
      <Tabs.Screen name="debts" options={{ title: "Debts" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
