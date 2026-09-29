import { Stack } from "expo-router";

import { useTheme } from "@/theme/ThemeProvider";
import { fontFamily } from "@/theme/tokens";

/**
 * Approved area. Hosts the bottom tabs plus full-screen routes and modal flows that sit above
 * the tab bar (notifications now; novo cliente, convidar, suporte… as they are built).
 */
export default function AppLayout() {
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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ title: "Notificações" }} />
    </Stack>
  );
}
