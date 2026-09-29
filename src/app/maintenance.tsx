import { View } from "react-native";
import { Wrench } from "lucide-react-native";

import { BrandMark } from "@/components/brand/BrandMark";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { useSession } from "@/features/auth/SessionProvider";
import { DevTools } from "@/components/dev/DevTools";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";

/** S09 — driven by the remote app status (planned GET /v1/app/status). */
export default function MaintenanceScreen() {
  const { state, refresh } = useSession();
  const { colors } = useTheme();
  const message = state.kind === "maintenance" ? state.message : null;

  return (
    <Screen edges={["top", "bottom", "left", "right"]}>
      <View style={{ alignItems: "center", gap: spacing.md, paddingTop: spacing.xxxl }}>
        <BrandMark />
        <Wrench size={48} color={colors.primary} />
        <AppText variant="title2" align="center">
          Estamos em manutenção
        </AppText>
        <AppText tone="muted" align="center">
          {message ?? "Estamos realizando uma atualização para melhorar sua experiência. Volte em instantes."}
        </AppText>
        <Button label="Tentar novamente" onPress={() => void refresh()} fullWidth />
      </View>
      <DevTools />
    </Screen>
  );
}
