import { ActivityIndicator, View } from "react-native";

import { BrandMark } from "@/components/brand/BrandMark";
import { ErrorState } from "@/components/states/States";
import { AppText } from "@/components/ui/AppText";
import { Screen } from "@/components/ui/Screen";
import { useSession } from "@/features/auth/SessionProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";

/** Shown while the session resolves (S01) and when /v1/auth/me fails for reasons other than 401/403. */
export default function BootstrapScreen() {
  const { state, refresh, signOut } = useSession();
  const { colors } = useTheme();

  return (
    <Screen edges={["top", "bottom", "left", "right"]}>
      <View style={{ flex: 1, minHeight: 480, alignItems: "center", justifyContent: "center", gap: spacing.lg }}>
        <BrandMark />
        {state.kind === "error" ? (
          <View style={{ alignSelf: "stretch", gap: spacing.sm }}>
            <ErrorState title="Não foi possível carregar sua conta" error={state.error} onRetry={() => void refresh()} />
            <AppText variant="callout" tone="primary" align="center" onPress={() => void signOut()}>
              Sair e entrar com outra conta
            </AppText>
          </View>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} />
            <AppText tone="muted">Carregando sua conta…</AppText>
          </>
        )}
      </View>
    </Screen>
  );
}
