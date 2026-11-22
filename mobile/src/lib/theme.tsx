import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

import { Palettes, type Palette } from "@/constants/theme";

const STORAGE_KEY = "pocket_watcher_theme";

type ThemeContextValue = {
  palette: Palette;
  isDark: boolean;
  setDark: (dark: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [override, setOverride] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((value) => {
      if (value === "light" || value === "dark") setOverride(value);
    });
  }, []);

  const isDark = (override ?? system) === "dark";

  const value = useMemo<ThemeContextValue>(
    () => ({
      palette: isDark ? Palettes.dark : Palettes.light,
      isDark,
      setDark(dark) {
        const next = dark ? "dark" : "light";
        setOverride(next);
        SecureStore.setItemAsync(STORAGE_KEY, next);
      },
    }),
    [isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within AppThemeProvider");
  return ctx;
}

export function usePalette() {
  return useAppTheme().palette;
}
