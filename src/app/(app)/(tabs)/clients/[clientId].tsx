import * as Linking from "expo-linking";
import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import type { JourneyStep } from "@/features/clients/types";
import { useClient, useClientJourney } from "@/features/clients/useClients";
import { formatDate, onlyDigits } from "@/lib/format";
import { clientStatusLabel } from "@/lib/status-labels";
import { spacing } from "@/theme/tokens";

const STEP_MARK: Record<JourneyStep["state"], string> = {
  DONE: "✓",
  CURRENT: "●",
  PENDING: "○",
  BLOCKED: "!",
  SKIPPED: "–"
};

function Journey({ clientId }: { clientId: string }) {
  const journey = useClientJourney(clientId);
  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="overline" tone="muted">
          Jornada
        </AppText>
        <QueryState query={journey} loadingLines={2}>
          {(card) =>
            card.clientJourney && card.clientJourney.length > 0 ? (
              <View style={{ gap: spacing.xs }}>
                {card.clientJourney.map((step) => (
                  <View key={step.key} style={{ flexDirection: "row", gap: spacing.sm }}>
                    <AppText tone={step.state === "DONE" ? "success" : step.state === "BLOCKED" ? "danger" : "muted"}>
                      {STEP_MARK[step.state]}
                    </AppText>
                    <View style={{ flex: 1 }}>
                      <AppText variant={step.state === "CURRENT" ? "bodyStrong" : "body"}>{step.label}</AppText>
                      {step.detail || step.date ? (
                        <AppText variant="caption" tone="muted">
                          {[step.detail, step.date && formatDate(step.date)].filter(Boolean).join(" · ")}
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <AppText tone="muted">{card.nextRecommendedActionLabel ?? "Sem etapas registradas."}</AppText>
            )
          }
        </QueryState>
      </View>
    </Card>
  );
}

/** S16 — Detalhe do cliente: C12 (dados + UCs) and T3 (jornada). */
export default function ClientDetailScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const client = useClient(clientId);

  return (
    <Screen edges={["left", "right"]} onRefresh={() => void client.refetch()} refreshing={client.isRefetching}>
      <Stack.Screen options={{ title: "Cliente" }} />
      <QueryState query={client} loadingLines={4}>
        {(data) => {
          const status = clientStatusLabel(data.status);
          const phone = onlyDigits(data.celular ?? data.telefone ?? "");
          const name = data.tipo_pessoa === "JURIDICA" ? (data.razao_social ?? data.nome_completo) : data.nome_completo;
          return (
            <View style={{ gap: spacing.md }}>
              <Card>
                <View style={{ gap: spacing.xs }}>
                  <AppText variant="title3">{name ?? "Cliente"}</AppText>
                  <Badge label={status.label} tone={status.tone} />
                  <AppText variant="callout" tone="muted">
                    {[data.email, data.cidade && `${data.cidade}/${data.uf ?? ""}`, `Desde ${formatDate(data.created_at)}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </AppText>
                  {phone ? (
                    <View style={{ flexDirection: "row", gap: spacing.sm }}>
                      <Button label="Ligar" variant="outline" onPress={() => void Linking.openURL(`tel:${phone}`)} />
                      <Button
                        label="WhatsApp"
                        variant="whatsapp"
                        onPress={() => void Linking.openURL(`https://wa.me/55${phone}`)}
                      />
                    </View>
                  ) : null}
                </View>
              </Card>
              <Card>
                <View style={{ gap: spacing.xs }}>
                  <AppText variant="overline" tone="muted">
                    Unidades consumidoras
                  </AppText>
                  {data.vinculos_uc && data.vinculos_uc.length > 0 ? (
                    data.vinculos_uc.map((link) => (
                      <View key={link.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <AppText>
                          UC {link.uc_numero}
                          {link.uc?.concessionaria ? ` · ${link.uc.concessionaria}` : ""}
                        </AppText>
                        <Badge label={link.ativo ? "Ativa" : "Inativa"} tone={link.ativo ? "success" : "neutral"} />
                      </View>
                    ))
                  ) : (
                    <AppText tone="muted">Nenhuma UC vinculada.</AppText>
                  )}
                </View>
              </Card>
              <Journey clientId={clientId} />
            </View>
          );
        }}
      </QueryState>
    </Screen>
  );
}
