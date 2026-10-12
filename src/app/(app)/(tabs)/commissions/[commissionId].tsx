import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { commissionEligibility } from "@/features/commissions/commission.service";
import { useCommission } from "@/features/commissions/useCommissions";
import { formatCompetencia, formatCurrency, formatDate } from "@/lib/format";
import { commissionStatusLabel } from "@/lib/status-labels";
import { spacing } from "@/theme/tokens";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
      <AppText tone="muted">{label}</AppText>
      <AppText variant="bodyStrong" style={{ flexShrink: 1, textAlign: "right" }}>
        {value}
      </AppText>
    </View>
  );
}

/** S22 — Detalhe da comissão (M-C3). Eligibility comes from the backend (`regra_aplicada`). */
export default function CommissionDetailScreen() {
  const { commissionId } = useLocalSearchParams<{ commissionId: string }>();
  const { role } = useAuthenticatedContext();
  const commission = useCommission(commissionId);

  return (
    <Screen edges={["left", "right"]}>
      <Stack.Screen options={{ title: "Detalhe do lançamento" }} />
      <QueryState query={commission}>
        {(item) => {
          const status = commissionStatusLabel(item.status);
          const amount = role === "SUBLICENCIADO" ? item.valor_comissao_sublicenciado : item.valor_comissao;
          return (
            <View style={{ gap: spacing.md }}>
              <Card variant="hero">
                <View style={{ gap: spacing.xs }}>
                  <AppText variant="overline" tone="muted">
                    {formatCompetencia(item.competencia)}
                  </AppText>
                  <AppText variant="title1">{formatCurrency(amount)}</AppText>
                  <Badge label={status.label} tone={status.tone} />
                </View>
              </Card>
              <Card>
                <View style={{ gap: spacing.sm }}>
                  <Row label="Cliente" value={item.consumidor_nome ?? "—"} />
                  {item.sublicenciado_nome ? <Row label="Representante" value={item.sublicenciado_nome} /> : null}
                  {role === "LICENCIADO" && item.valor_comissao_sublicenciado != null ? (
                    <Row label="Repasse ao representante" value={formatCurrency(item.valor_comissao_sublicenciado)} />
                  ) : null}
                  <Row label="Gerada em" value={formatDate(item.data_geracao)} />
                  <Row label="Paga em" value={formatDate(item.data_pagamento)} />
                </View>
              </Card>
              {(() => {
                const rule = commissionEligibility(item);
                return (
                  <Card>
                    <View style={{ gap: 2 }}>
                      <AppText variant="overline" tone="muted">
                        Critérios de geração
                      </AppText>
                      {rule.available ? (
                        <>
                          <AppText variant="callout">{rule.isCompensating ? "✅" : "❌"} Cliente compensando</AppText>
                          <AppText variant="callout">{rule.invoicePaid ? "✅" : "❌"} Fatura paga</AppText>
                          <AppText variant="callout">
                            {rule.customerStatus === "ATIVO_COMPENSANDO" ? "✅" : "❌"} Status ativo e compensando
                          </AppText>
                        </>
                      ) : (
                        <AppText variant="callout" tone="muted">
                          Critérios indisponíveis para este lançamento.
                        </AppText>
                      )}
                    </View>
                  </Card>
                );
              })()}
              {item.regra_aplicada?.motivo ? (
                <Card variant="alert" tone={item.regra_aplicada.elegivel ? "success" : "info"}>
                  <AppText variant="callout">{item.regra_aplicada.motivo}</AppText>
                </Card>
              ) : null}
            </View>
          );
        }}
      </QueryState>
    </Screen>
  );
}
