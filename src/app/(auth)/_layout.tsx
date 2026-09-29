import { Stack } from "expo-router";

import { useTheme } from "@/theme/ThemeProvider";
import { fontFamily } from "@/theme/tokens";

export const unstable_settings = { initialRouteName: "welcome" };

/** PublicStack — signed-out users only (guarded in the root layout). */
export default function AuthLayout() {
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
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: "Entrar" }} />
      <Stack.Screen name="register" options={{ title: "Quero ser Licenciado" }} />
      <Stack.Screen name="register-sublicenciado" options={{ title: "Convite de representante" }} />
      <Stack.Screen name="recover" options={{ title: "Recuperar senha" }} />
    </Stack>
  );
}
