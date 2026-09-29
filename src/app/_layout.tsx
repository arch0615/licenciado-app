import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  useFonts
} from "@expo-google-fonts/montserrat";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SessionProvider, useSession } from "@/features/auth/SessionProvider";
import { QueryProvider } from "@/services/query/QueryProvider";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";

void SplashScreen.preventAutoHideAsync();

/** Keep the native splash until fonts are ready and the first routing decision is made (max 4s). */
function SplashController({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { state } = useSession();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (fontsLoaded && (state.kind !== "bootstrapping" || timedOut)) SplashScreen.hide();
  }, [fontsLoaded, state.kind, timedOut]);

  return null;
}

/**
 * Role & approval routing (docs/mobile-navigation.md §2.1). Exactly one group is reachable per
 * RouteState; when the state changes, Expo Router redirects to the newly allowed group.
 * Client-side guards are UX only — the backend enforces access on every request.
 */
function RootNavigator() {
  const { state } = useSession();
  const { colors, scheme } = useTheme();

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={state.kind === "bootstrapping" || state.kind === "error"}>
          <Stack.Screen name="bootstrap" />
        </Stack.Protected>
        <Stack.Protected guard={state.kind === "maintenance"}>
          <Stack.Screen name="maintenance" />
        </Stack.Protected>
        <Stack.Protected guard={state.kind === "signedOut"}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={state.kind === "blocked"}>
          <Stack.Screen name="blocked" />
        </Stack.Protected>
        <Stack.Protected guard={state.kind === "pending"}>
          <Stack.Screen name="pending" />
        </Stack.Protected>
        <Stack.Protected guard={state.kind === "approved"}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold
  });

  return (
    <SafeAreaProvider>
      <QueryProvider>
        <ThemeProvider>
          <SessionProvider>
            <SplashController fontsLoaded={fontsLoaded || fontError !== null} />
            <RootNavigator />
          </SessionProvider>
        </ThemeProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
