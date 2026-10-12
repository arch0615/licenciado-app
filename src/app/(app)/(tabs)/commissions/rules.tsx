import { Stack } from "expo-router";
import { View } from "react-native";

import { QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { commissionEligibility } from "@/features/commissions/commission.service";
import { useCommissions } from "@/features/commissions/useCommissions";
import { formatCompetencia } from "@/lib/format";
import { spacing } from "@/theme/tokens";

const mark = (ok: boolean) => (ok ? "✅" : "❌");

/**
 * S23 — Regras de comissão (portal /comissoes/regras): the portal's static explanation plus the per-client
 * checklist built from each commission's backend `regra_aplicada` (compensando, fatura paga, status).
 */
export default function CommissionRulesScreen() {
  const commissions = useCommissions({});
  const items = commissions.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Screen edges={["left", "right"]} onRefresh={() => void commissions.refetch()} refreshing={commissions.isRefetching}>
      <Stack.Screen options={{ title: "Regras de comissão" }} />
      <Card>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="bodyStrong">Conceitos</AppText>
          <AppText tone="muted">Cliente ativo/compensando é condição operacional do ecossistema Rateio.</AppText>
          <AppText tone="muted">Fatura paga é condição financeira para liberar comissionamento.</AppText>
          <AppText tone="muted">Comissão calculada é evento financeiro do consultor.</AppText>
        </View>
      </Card>
      <Card>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="bodyStrong">Gatilho principal</AppText>
          <AppText tone="muted">• Cliente compensando</AppText>
          <AppText tone="muted">• Fatura paga</AppText>
          <AppText tone="muted">• Status do cliente: ativo e compensando</AppText>
        </View>
      </Card>
      <Card>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="bodyStrong">Previsão (estimado mês a mês)</AppText>
          <AppText tone="muted">Soma das comissões potenciais de clientes que já estão compensando.</AppText>
        </View>
      </Card>
      <AppText variant="overline" tone="muted">
        Checklist por cliente/UC
      </AppText>
      <QueryState
        query={commissions}
        isEmpty={() => items.length === 0}
        empty={<AppText tone="muted">Sem regras para exibir.</AppText>}
      >
        {() => (
          <View style={{ gap: spacing.sm }}>
            {items.map((item) => {
              const rule = commissionEligibility(item);
              return (
                <Card key={item.id}>
                  <View style={{ gap: 2 }}>
                    <AppText variant="bodyStrong">
                      {item.consumidor_nome ?? "Cliente"} · {formatCompetencia(item.competencia)}
                    </AppText>
                    {rule.available ? (
                      <>
                        <AppText variant="callout">{mark(rule.isCompensating)} compensando</AppText>
                        <AppText variant="callout">{mark(rule.invoicePaid)} fatura paga</AppText>
                        <AppText variant="callout">{mark(rule.customerStatus === "ATIVO_COMPENSANDO")} status</AppText>
                        <AppText variant="calloutStrong" tone={rule.canGenerate ? "success" : "danger"}>
                          Pode gerar: {rule.canGenerate ? "SIM" : "NÃO"}
                        </AppText>
                      </>
                    ) : (
                      <AppText variant="callout" tone="muted">
                        Critérios indisponíveis.
                      </AppText>
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </QueryState>
    </Screen>
  );
}
