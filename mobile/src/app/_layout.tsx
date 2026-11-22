import { Geist_400Regular } from "@expo-google-fonts/geist/400Regular";
import { Geist_500Medium } from "@expo-google-fonts/geist/500Medium";
import { Geist_600SemiBold } from "@expo-google-fonts/geist/600SemiBold";
import { Geist_700Bold } from "@expo-google-fonts/geist/700Bold";
import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces/600SemiBold";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { AuthProvider } from "@/lib/auth-context";
import { initDatabase } from "@/lib/db";
import { AppThemeProvider, useAppTheme } from "@/lib/theme";

initDatabase();
SplashScreen.preventAutoHideAsync();

function ThemedStack() {
  const { palette, isDark } = useAppTheme();
  const base = isDark ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          background: palette.background,
          card: palette.surface,
          text: palette.foreground,
          border: palette.border,
          primary: palette.primary,
        },
      }}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen
          name="scan"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Scan receipt",
            headerStyle: { backgroundColor: palette.surface },
            headerTintColor: palette.foreground,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    Fraunces_600SemiBold,
  });
  const ready = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <AppThemeProvider>
        <AuthProvider>
          <ThemedStack />
        </AuthProvider>
      </AppThemeProvider>
    </ErrorBoundary>
  );
}
