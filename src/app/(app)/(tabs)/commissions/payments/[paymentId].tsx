import { Stack, useLocalSearchParams } from "expo-router";
import { Share, View } from "react-native";

import { QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { hasPaymentReceipt } from "@/features/commissions/commission.service";
import { usePaymentReceipt, usePaymentStatement } from "@/features/commissions/useCommissions";
import { formatCompetencia, formatCurrency, formatDate } from "@/lib/format";
import { paymentMethodLabel, portalPaymentStatusLabel } from "@/lib/status-labels";
import { userMessage } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

const FAILURE_HELP: Record<string, string> = {
  FALHOU_TECNICO: "Falha técnica. O reprocessamento é feito pelo time interno.",
  FALHOU_BANCARIO: "Falha bancária. É necessário corrigir os dados e gerar novo lote."
};

/**
 * S24 — Detalhe do pagamento (portal /comissoes/pagamentos "Ver extrato" + "Baixar comprovante").
 * Licenciado only. Every amount comes from the backend statement; nothing is computed here.
 */
export default function PaymentDetailScreen() {
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const statement = usePaymentStatement(paymentId);
  const receipt = usePaymentReceipt();

  return (
    <Screen edges={["left", "right"]} onRefresh={() => void statement.refetch()} refreshing={statement.isRefetching}>
      <Stack.Screen options={{ title: "Extrato do pagamento" }} />
      <QueryState query={statement} loadingLines={4}>
        {({ pagamento, totais, itens, clientes_diretos, sublicenciados }) => {
          const status = portalPaymentStatusLabel(pagamento.status);
          const receiptAvailable = hasPaymentReceipt({ status: pagamento.status, comprovante_path: pagamento.comprovante_path });
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
                    {paymentMethodLabel(pagamento.metodo) ? ` · ${paymentMethodLabel(pagamento.metodo)}` : ""}
                  </AppText>
                  {FAILURE_HELP[pagamento.status] ? (
                    <AppText variant="callout" tone="danger">
                      {FAILURE_HELP[pagamento.status]}
                    </AppText>
                  ) : null}
                </View>
              </Card>

              {receiptAvailable ? (
                <Card>
                  <View style={{ gap: spacing.xs }}>
                    <AppText variant="overline" tone="muted">
                      Comprovante
                    </AppText>
                    {receipt.data ? (
                      <>
                        <AppText selectable variant="caption">
                          {receipt.data}
                        </AppText>
                        <Button
                          label="Compartilhar comprovante"
                          variant="outline"
                          onPress={() => void Share.share({ title: `recibo-pagamento-${pagamento.id}`, message: receipt.data })}
                        />
                      </>
                    ) : (
                      <Button label="Ver comprovante" variant="outline" loading={receipt.isPending} onPress={() => receipt.mutate(paymentId)} />
                    )}
                    {receipt.error ? (
                      <AppText variant="callout" tone="danger">
                        {userMessage(receipt.error)}
                      </AppText>
                    ) : null}
                  </View>
                </Card>
              ) : null}

              <Card>
                <View style={{ gap: spacing.xs }}>
                  <AppText variant="overline" tone="muted">
                    Resumo
                  </AppText>
                  <ListRow title="Total pago" right={<AppText variant="bodyStrong">{formatCurrency(totais.valor_total_pago)}</AppText>} />
                  <ListRow title="Parte do licenciado" right={<AppText variant="bodyStrong">{formatCurrency(totais.valor_parte_licenciado)}</AppText>} />
                  <ListRow
                    title="Repasses a representantes"
                    right={<AppText variant="bodyStrong">{formatCurrency(totais.valor_repasses_sublicenciados)}</AppText>}
                  />
                  <ListRow title="Comissões" subtitle={`${totais.quantidade_comissoes} comissões · ${totais.quantidade_clientes} clientes`} />
                  {totais.divergencia_total_lote ? (
                    <AppText variant="callout" tone="warning">
                      Divergência entre total do lote e itens: {formatCurrency(totais.divergencia_total_lote)}
                    </AppText>
                  ) : null}
                </View>
              </Card>

              {clientes_diretos ? (
                <Card>
                  <AppText variant="overline" tone="muted">
                    Clientes diretos do licenciado
                  </AppText>
                  <ListRow
                    title={`${clientes_diretos.quantidade_clientes} clientes · ${clientes_diretos.quantidade_comissoes} comissões`}
                    right={<AppText variant="bodyStrong">{formatCurrency(clientes_diretos.valor_comissao)}</AppText>}
                  />
                </Card>
              ) : null}

              {sublicenciados && sublicenciados.length > 0 ? (
                <Card>
                  <AppText variant="overline" tone="muted">
                    Por representante
                  </AppText>
                  {sublicenciados.map((sub) => (
                    <ListRow
                      key={sub.sublicenciado_id}
                      title={sub.nome ?? sub.codigo_sublicenciado ?? "Representante"}
                      subtitle={`${sub.quantidade_clientes} clientes · repasse ${formatCurrency(sub.valor_repassado_sublicenciado)}`}
                      right={<AppText variant="bodyStrong">{formatCurrency(sub.valor_parte_licenciado)}</AppText>}
                    />
                  ))}
                </Card>
              ) : null}

              <Card>
                <AppText variant="overline" tone="muted">
                  Itens
                </AppText>
                {itens.length === 0 ? <AppText tone="muted">Nenhum item encontrado neste lote.</AppText> : null}
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
