import { Redirect } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { ActivityIndicator, View } from "react-native";

import { AppHeader, NAV_ITEMS } from "@/components/app-header";
import { useAuth } from "@/lib/auth-context";
import { usePalette } from "@/lib/theme";

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const palette = usePalette();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.background }}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      tabBar={(props) => <AppHeader {...props} />}
      screenOptions={{ headerShown: false, tabBarPosition: "top", sceneStyle: { backgroundColor: palette.background } }}
    >
      {NAV_ITEMS.map((item) => (
        <Tabs.Screen key={item.name} name={item.name} options={{ title: item.label }} />
      ))}
    </Tabs>
  );
}
