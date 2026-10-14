import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { BrandMark } from "@/components/brand/BrandMark";
import { ErrorState } from "@/components/states/States";
import { Button } from "@/components/ui/Button";
import { AppText } from "@/components/ui/AppText";
import { Screen } from "@/components/ui/Screen";
import { useSession } from "@/features/auth/SessionProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";

const SLOW_BOOTSTRAP_MS = 20_000;

/** Shown while the session resolves (S01) and when /v1/auth/me fails for reasons other than 401/403. */
export default function BootstrapScreen() {
  const { state, refresh, signOut } = useSession();
  const { colors } = useTheme();
  // If loading takes unusually long (slow or blocked network), offer a way out instead of an endless spinner.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (state.kind !== "bootstrapping") return;
    const timer = setTimeout(() => setSlow(true), SLOW_BOOTSTRAP_MS);
    return () => clearTimeout(timer);
  }, [state.kind]);
  const retry = () => {
    setSlow(false);
    void refresh();
  };

  return (
    <Screen edges={["top", "bottom", "left", "right"]}>
      <View style={{ flex: 1, minHeight: 480, alignItems: "center", justifyContent: "center", gap: spacing.lg }}>
        <BrandMark />
        {state.kind === "error" ? (
          <View style={{ alignSelf: "stretch", gap: spacing.sm }}>
            <ErrorState title="Não foi possível carregar sua conta" error={state.error} onRetry={retry} />
            <AppText variant="callout" tone="primary" align="center" onPress={() => void signOut()}>
              Sair e entrar com outra conta
            </AppText>
          </View>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} />
            <AppText tone="muted" align="center">
              Carregando sua conta…
            </AppText>
            {slow && state.kind === "bootstrapping" ? (
              <View style={{ alignSelf: "stretch", gap: spacing.sm }}>
                <AppText variant="callout" tone="muted" align="center">
                  Está demorando mais que o normal. Verifique sua conexão com a internet.
                </AppText>
                <Button label="Tentar novamente" fullWidth onPress={retry} />
                <Button label="Sair e entrar novamente" variant="ghost" fullWidth onPress={() => void signOut()} />
              </View>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}
