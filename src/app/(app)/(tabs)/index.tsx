import { router } from "expo-router";
import { View } from "react-native";

import { MetricCard } from "@/components/cards/MetricCard";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { ErrorState } from "@/components/states/States";
import { PermissionState } from "@/components/states/QueryState";
import { Screen } from "@/components/ui/Screen";
import { hasPermission } from "@/features/auth/permissions";
import { useAuthenticatedContext, useSession } from "@/features/auth/SessionProvider";
import {
  CodeCouponCard,
  ContractBanner,
  KwhCard,
  MonthBarChart,
  OperationalAlerts,
  TeamBreakdown
} from "@/features/dashboard/components/DashboardWidgets";
import { useDashboard } from "@/features/dashboard/useDashboard";
import { useContract, useProfile } from "@/features/profile/useProfile";
import { useTeam } from "@/features/team/useTeam";
import { formatCurrency, formatNumber } from "@/lib/format";
import { roleLabels } from "@/lib/status-labels";
import { isApiError } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

/**
 * S14 — Início (portal /inicio): KPI cards, code/coupon, kWh by region, contract banner, monthly charts,
 * operational alerts and the licenciado's team breakdown. Values are the backend's (never invented).
 */
export default function HomeScreen() {
  const { me, role } = useAuthenticatedContext();
  const { refresh } = useSession();
  const dashboard = useDashboard();
  const profile = useProfile();
  const contract = useContract(role === "LICENCIADO");
  const team = useTeam();
  const firstName = (me.displayName ?? me.email).split(" ")[0];
  const summary = dashboard.data?.summary;
  const loading = dashboard.isPending && dashboard.fetchStatus !== "idle";

  return (
    <Screen
      onRefresh={() => void Promise.all([refresh(), dashboard.refetch(), profile.refetch(), contract.refetch(), team.refetch()])}
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
      {profile.data ? <CodeCouponCard profile={profile.data} /> : null}
      <ContractBanner contract={contract.data} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <MetricCard
          label="Clientes cadastrados"
          value={summary ? formatNumber(summary.total_clientes) : null}
          caption="Total na carteira"
          loading={loading}
          onPress={() => router.push("/clients")}
        />
        <MetricCard label="UCs em ativação" value={summary ? formatNumber(summary.ucs_em_ativacao) : null} caption="Em andamento" loading={loading} />
        <MetricCard
          label="Comissões previstas"
          value={summary ? formatCurrency(summary.comissao_prevista_mes) : null}
          caption="Competência atual"
          loading={loading}
          onPress={() => router.push("/commissions")}
        />
        <MetricCard label="Clientes ativos" value={summary ? formatNumber(summary.clientes_ativos) : null} caption="Compensando" loading={loading} />
      </View>
      {summary ? <KwhCard summary={summary} /> : null}
      {dashboard.data ? (
        <>
          <MonthBarChart title="Evolução de clientes" points={dashboard.data.charts?.clientes_por_mes} />
          <MonthBarChart
            title="Comissões por mês"
            points={dashboard.data.charts?.comissoes_por_mes}
            format={(value) => formatCurrency(value)}
            emptyText="Sem comissões no período."
          />
          <OperationalAlerts alerts={dashboard.data.alerts} />
        </>
      ) : null}
      {role === "LICENCIADO" && hasPermission(me, "team:read") && team.data ? <TeamBreakdown members={team.data.data} /> : null}
    </Screen>
  );
}
