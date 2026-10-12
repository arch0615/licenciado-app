import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { DocumentList } from "@/features/documents/components/DocumentList";
import { useTeamMember } from "@/features/team/useTeam";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { accountStatusLabel } from "@/lib/status-labels";
import { spacing } from "@/theme/tokens";

/** S27 — Detalhe do representante (GET /v1/sublicenciados/{id}, Swagger). */
export default function TeamMemberScreen() {
  const { memberId } = useLocalSearchParams<{ memberId: string }>();
  const member = useTeamMember(memberId);

  return (
    <Screen edges={["left", "right"]} onRefresh={() => void member.refetch()} refreshing={member.isRefetching}>
      <Stack.Screen options={{ title: "Representante" }} />
      <QueryState query={member} loadingLines={4}>
        {(data) => {
          const status = accountStatusLabel(data.status);
          return (
            <View style={{ gap: spacing.md }}>
              <Card>
                <View style={{ gap: spacing.xs }}>
                  <AppText variant="title3">{data.nome_completo ?? data.email}</AppText>
                  <Badge label={status.label} tone={status.tone} />
                  <AppText variant="callout" tone="muted">
                    {[data.email, data.telefone, `Código ${data.codigo_sublicenciado}`, `Desde ${formatDate(data.created_at)}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </AppText>
                  {data.reprovado_motivo ? (
                    <AppText variant="callout" tone="danger">
                      {data.reprovado_motivo}
                    </AppText>
                  ) : null}
                </View>
              </Card>
              <Card>
                <ListRow title="Clientes" right={<AppText variant="bodyStrong">{formatNumber(data.total_consumidores)}</AppText>} />
                <ListRow title="UCs vinculadas" right={<AppText variant="bodyStrong">{formatNumber(data.total_ucs)}</AppText>} />
                <ListRow
                  title="Comissão prevista no mês"
                  right={<AppText variant="bodyStrong">{formatCurrency(data.comissao_prevista_mes)}</AppText>}
                />
              </Card>
              <DocumentList
                title="Documentos"
                items={data.documentos.map((doc) => ({
                  id: doc.id,
                  tipo: doc.tipo,
                  status_validacao: doc.status_validacao,
                  reprovado_motivo: doc.reprovado_motivo,
                  created_at: doc.created_at,
                  arquivo_nome: doc.arquivo_nome
                }))}
                emptyText="Sem documentos vinculados."
              />
            </View>
          );
        }}
      </QueryState>
    </Screen>
  );
}
