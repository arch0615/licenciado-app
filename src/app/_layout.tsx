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

/** Fonts must be ready before any text is laid out; this timeout only guards against a font load that never settles. */
const FONT_TIMEOUT_MS = 6000;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold
  });
  const [fontWaitOver, setFontWaitOver] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFontWaitOver(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);
  const fontsSettled = fontsLoaded || fontError !== null || fontWaitOver;

  // Keep the native splash (nothing rendered) until the fonts are settled, so text is never measured with the
  // fallback font — on Android that leaves every label clipped at the fallback width.
  if (!fontsSettled) return null;

  return (
    <SafeAreaProvider>
      <QueryProvider>
        <ThemeProvider>
          <SessionProvider>
            <SplashController fontsLoaded={fontsSettled} />
            <RootNavigator />
          </SessionProvider>
        </ThemeProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
