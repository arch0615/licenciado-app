import { router } from "expo-router";
import { View } from "react-native";

import { MetricCard } from "@/components/cards/MetricCard";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { ErrorState } from "@/components/states/States";
import { PermissionState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { useAuthenticatedContext, useSession } from "@/features/auth/SessionProvider";
import { useDashboard } from "@/features/dashboard/useDashboard";
import { formatCurrency, formatNumber } from "@/lib/format";
import { roleLabels } from "@/lib/status-labels";
import { isApiError } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

/** S14 — Início: dashboard B23. Metrics show "—" when the backend sends no value (never invented). */
export default function HomeScreen() {
  const { me, role } = useAuthenticatedContext();
  const { refresh } = useSession();
  const dashboard = useDashboard();
  const firstName = (me.displayName ?? me.email).split(" ")[0];
  const summary = dashboard.data?.summary;
  const loading = dashboard.isPending && dashboard.fetchStatus !== "idle";
  const alerts = (dashboard.data?.alerts ?? []).filter((alert) => !alert.resolved_at);

  return (
    <Screen
      onRefresh={() => void Promise.all([refresh(), dashboard.refetch()])}
      refreshing={dashboard.isRefetching}
    >
      <ScreenHeader title={`Olá, ${firstName}`} subtitle={roleLabels[role]} showNotifications />
      {dashboard.error && !dashboard.data ? (
        isApiError(dashboard.error) && dashboard.error.isForbidden ? (
          <PermissionState message={dashboard.error.message} />
        ) : (
          <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />
        )
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <MetricCard
          label="Clientes"
          value={summary ? formatNumber(summary.total_clientes) : null}
          caption="Na carteira"
          loading={loading}
          onPress={() => router.push("/clients")}
        />
        <MetricCard label="UCs em ativação" value={summary ? formatNumber(summary.ucs_em_ativacao) : null} caption="Em andamento" loading={loading} />
        <MetricCard
          label="Comissão do mês"
          value={summary ? formatCurrency(summary.comissao_prevista_mes) : null}
          caption="Previsto"
          loading={loading}
          onPress={() => router.push("/commissions")}
        />
        <MetricCard label="Clientes ativos" value={summary ? formatNumber(summary.clientes_ativos) : null} caption="Compensando" loading={loading} />
      </View>
      {alerts.length > 0 ? (
        <Card>
          <AppText variant="overline" tone="muted">
            Precisa da sua atenção
          </AppText>
          {alerts.slice(0, 5).map((alert) => (
            <ListRow
              key={alert.id}
              title={alert.description}
              onPress={
                alert.entityType === "CLIENTE" && alert.entityId
                  ? () => router.push({ pathname: "/clients/[clientId]", params: { clientId: alert.entityId! } })
                  : undefined
              }
            />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
