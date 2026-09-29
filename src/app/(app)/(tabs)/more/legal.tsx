import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import { View } from "react-native";

import { QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { config } from "@/config/env";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import type { Contract } from "@/features/profile/profile.service";
import { useContract } from "@/features/profile/useProfile";
import { formatDate } from "@/lib/format";
import { spacing } from "@/theme/tokens";

const CONTRACT_STATUS: Record<Contract["status"], { label: string; tone: "warning" | "success" | "neutral" }> = {
  AGUARDANDO_ASSINATURA: { label: "Aguardando assinatura", tone: "warning" },
  ASSINADO: { label: "Assinado", tone: "success" },
  CANCELADO: { label: "Cancelado", tone: "neutral" }
};

const isHttps = (url: string | null): url is string => typeof url === "string" && url.startsWith("https://");

/**
 * Termos e privacidade. Read-only: the app never accepts documents on the user's behalf.
 * Contract signing happens in the provider's page (ZapSign), opened in the browser.
 */
export default function LegalScreen() {
  const { role } = useAuthenticatedContext();
  const contract = useContract(role === "LICENCIADO");

  return (
    <Screen>
      <Stack.Screen options={{ title: "Termos e privacidade" }} />
      <Card>
        <View style={{ gap: spacing.xxs }}>
          <AppText variant="overline" tone="muted">
            Documentos
          </AppText>
          {config.termsUrl ? (
            <ListRow title="Termos de Uso" onPress={() => void Linking.openURL(config.termsUrl)} />
          ) : null}
          {config.privacyUrl ? (
            <ListRow title="Política de Privacidade" onPress={() => void Linking.openURL(config.privacyUrl)} />
          ) : null}
          {!config.termsUrl && !config.privacyUrl ? (
            <AppText tone="muted">Os documentos legais ainda não estão disponíveis no aplicativo.</AppText>
          ) : null}
        </View>
      </Card>

      {role === "LICENCIADO" ? (
        <Card>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="overline" tone="muted">
              Contrato de licenciamento
            </AppText>
            <QueryState query={contract} loadingLines={1}>
              {(data) =>
                data ? (
                  <View style={{ gap: spacing.xs }}>
                    <Badge label={CONTRACT_STATUS[data.status].label} tone={CONTRACT_STATUS[data.status].tone} />
                    <AppText variant="callout" tone="muted">
                      {data.signed_at ? `Assinado em ${formatDate(data.signed_at)}` : `Enviado em ${formatDate(data.sent_at)}`}
                    </AppText>
                    {data.status === "AGUARDANDO_ASSINATURA" && isHttps(data.signing_url) ? (
                      <Button label="Ler e assinar o contrato" onPress={() => void Linking.openURL(data.signing_url!)} />
                    ) : null}
                  </View>
                ) : (
                  <AppText tone="muted">Seu contrato será enviado após a análise do cadastro.</AppText>
                )
              }
            </QueryState>
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
