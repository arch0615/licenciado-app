import { View } from "react-native";
import { ShieldAlert } from "lucide-react-native";

import { BrandMark } from "@/components/brand/BrandMark";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import type { BlockedReason } from "@/features/auth/route-state";
import { useSession } from "@/features/auth/SessionProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";

const COPY: Record<BlockedReason, { title: string; message: string }> = {
  SUSPENDED: { title: "Conta suspensa", message: "Seu acesso está temporariamente suspenso. Fale com o suporte ACVEL para mais informações." },
  INACTIVE: { title: "Conta inativa", message: "Sua conta está inativa. Fale com o suporte ACVEL para reativá-la." },
  BLOCKED: { title: "Conta bloqueada", message: "Seu acesso foi bloqueado. Fale com o suporte ACVEL." },
  USER_BLOCKED: { title: "Acesso bloqueado", message: "Seu usuário está bloqueado. Fale com o suporte ACVEL." },
  PLATFORM_FORBIDDEN: {
    title: "Acesso não permitido",
    message: "Sua conta está autenticada, mas não tem acesso ao aplicativo do Licenciado. Entre com uma conta autorizada."
  },
  STAFF: {
    title: "Conta administrativa",
    message: "Contas da equipe ACVEL usam as ferramentas administrativas. Este aplicativo é para licenciados e representantes."
  }
};

/** S08 + blocked states (suspended / inactive / blocked / forbidden / staff). */
export default function BlockedScreen() {
  const { state, signOut } = useSession();
  const { colors } = useTheme();
  const reason: BlockedReason = state.kind === "blocked" ? state.reason : "BLOCKED";
  const copy = COPY[reason];

  return (
    <Screen edges={["top", "bottom", "left", "right"]}>
      <View style={{ alignItems: "center", gap: spacing.md, paddingTop: spacing.xxxl }}>
        <BrandMark />
        <ShieldAlert size={48} color={colors.warning} />
        <AppText variant="title2" align="center">
          {copy.title}
        </AppText>
        <AppText tone="muted" align="center">
          {copy.message}
        </AppText>
      </View>
      <Card>
        <AppText variant="bodyStrong">Precisa de suporte?</AppText>
        <AppText variant="callout" tone="muted">
          Entre em contato com a equipe ACVEL.
        </AppText>
      </Card>
      <Button label="Sair" variant="outline" onPress={() => void signOut()} fullWidth />
    </Screen>
  );
}
