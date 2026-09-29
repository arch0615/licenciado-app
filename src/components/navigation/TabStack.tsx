import { Stack } from "expo-router";

import { useTheme } from "@/theme/ThemeProvider";
import { fontFamily } from "@/theme/tokens";

/** Per-tab stack: detail screens for this tab are added as siblings of index.tsx. */
export function TabStack() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontFamily: fontFamily.semibold, color: colors.foreground },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
