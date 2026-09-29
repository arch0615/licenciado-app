import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { useTeamMember } from "@/features/team/useTeam";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { accountStatusLabel, documentStatusLabel } from "@/lib/status-labels";
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
                <ListRow title="UCs" right={<AppText variant="bodyStrong">{formatNumber(data.total_ucs)}</AppText>} />
                <ListRow
                  title="Comissão prevista no mês"
                  right={<AppText variant="bodyStrong">{formatCurrency(data.comissao_prevista_mes)}</AppText>}
                />
              </Card>
              <Card>
                <AppText variant="overline" tone="muted">
                  Documentos
                </AppText>
                {data.documentos.length === 0 ? <AppText tone="muted">Nenhum documento enviado.</AppText> : null}
                {data.documentos.map((doc) => {
                  const docStatus = documentStatusLabel(doc.status_validacao);
                  return (
                    <ListRow
                      key={doc.id}
                      title={doc.tipo}
                      subtitle={doc.reprovado_motivo ?? doc.arquivo_nome}
                      right={<Badge label={docStatus.label} tone={docStatus.tone} />}
                    />
                  );
                })}
              </Card>
            </View>
          );
        }}
      </QueryState>
    </Screen>
  );
}
