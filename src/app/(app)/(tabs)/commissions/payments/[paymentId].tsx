import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { usePaymentStatement } from "@/features/commissions/useCommissions";
import { formatCompetencia, formatCurrency, formatDate } from "@/lib/format";
import { paymentStatusLabel } from "@/lib/status-labels";
import { spacing } from "@/theme/tokens";

/** S24 — Detalhe do pagamento (M-C5 extrato). Licenciado only; totals come from the backend. */
export default function PaymentDetailScreen() {
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const statement = usePaymentStatement(paymentId);

  return (
    <Screen edges={["left", "right"]}>
      <Stack.Screen options={{ title: "Pagamento" }} />
      <QueryState query={statement} loadingLines={4}>
        {({ pagamento, totais, itens }) => {
          const status = paymentStatusLabel(pagamento.status);
          return (
            <View style={{ gap: spacing.md }}>
              <Card variant="hero">
                <View style={{ gap: spacing.xs }}>
                  <AppText variant="overline" tone="muted">
                    {pagamento.competencias.map(formatCompetencia).join(", ")}
                  </AppText>
                  <AppText variant="title1">{formatCurrency(pagamento.valor_liquido ?? pagamento.valor_total_pago)}</AppText>
                  <Badge label={status.label} tone={status.tone} />
                  <AppText variant="caption" tone="muted">
                    {pagamento.pago_em ? `Pago em ${formatDate(pagamento.pago_em)}` : `Criado em ${formatDate(pagamento.created_at)}`}
                  </AppText>
                </View>
              </Card>
              <Card>
                <View style={{ gap: spacing.xs }}>
                  <AppText variant="overline" tone="muted">
                    Resumo
                  </AppText>
                  <ListRow title="Sua parte" right={<AppText variant="bodyStrong">{formatCurrency(totais.valor_parte_licenciado)}</AppText>} />
                  <ListRow
                    title="Repasses a representantes"
                    right={<AppText variant="bodyStrong">{formatCurrency(totais.valor_repasses_sublicenciados)}</AppText>}
                  />
                  <ListRow
                    title="Comissões"
                    subtitle={`${totais.quantidade_comissoes} comissões · ${totais.quantidade_clientes} clientes`}
                  />
                </View>
              </Card>
              <Card>
                <AppText variant="overline" tone="muted">
                  Itens
                </AppText>
                {itens.map((item) => (
                  <ListRow
                    key={item.comissao_id}
                    title={item.consumidor_nome ?? "Cliente"}
                    subtitle={[formatCompetencia(item.competencia), item.sublicenciado_nome].filter(Boolean).join(" · ")}
                    right={<AppText variant="bodyStrong">{formatCurrency(item.valor_total_comissao)}</AppText>}
                  />
                ))}
              </Card>
            </View>
          );
        }}
      </QueryState>
    </Screen>
  );
}
