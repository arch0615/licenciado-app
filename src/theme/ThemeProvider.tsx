import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { useColorScheme } from "react-native";

import { secureStorage } from "@/services/storage/secure-storage";

import {
  darkColors,
  elevation,
  lightColors,
  radius,
  spacing,
  typography,
  type ColorTokens
} from "./tokens";

export type ThemePreference = "system" | "light" | "dark";
export type ColorSchemeName = "light" | "dark";

export type Theme = {
  scheme: ColorSchemeName;
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  elevation: typeof elevation;
};

type ThemeContextValue = Theme & {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const PREFERENCE_KEY = "acvel.theme.preference";
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function buildTheme(scheme: ColorSchemeName): Theme {
  return {
    scheme,
    colors: scheme === "dark" ? darkColors : lightColors,
    spacing,
    radius,
    typography,
    elevation
  };
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    void secureStorage.get(PREFERENCE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") setPreferenceState(stored);
    });
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void secureStorage.set(PREFERENCE_KEY, next);
  }, []);

  const scheme: ColorSchemeName = preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({ ...buildTheme(scheme), preference, setPreference }),
    [scheme, preference, setPreference]
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>");
  return context;
}
