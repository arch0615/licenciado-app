import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { MetricCard } from "@/components/cards/MetricCard";
import { TextField } from "@/components/forms/TextField";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { PermissionState, QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChipGroup } from "@/components/ui/Chip";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { hasPermission } from "@/features/auth/permissions";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import type { Commission, CommissionStats } from "@/features/commissions/types";
import { useCommissions, useCommissionSummary, usePayments } from "@/features/commissions/useCommissions";
import { MonthBarChart } from "@/features/dashboard/components/DashboardWidgets";
import { formatCompetencia, formatCurrency, formatDate } from "@/lib/format";
import { commissionStatusLabel, portalPaymentStatusLabel } from "@/lib/status-labels";
import { spacing } from "@/theme/tokens";

type Segment = "statement" | "payments";

/** Amount shown to the viewer: the representative sees only their own share (sent by the backend). */
const shareOf = (role: string, total: number | null | undefined, subTotal: number | null | undefined) =>
  role === "SUBLICENCIADO" ? subTotal : total;

function Summary({ stats, role }: { stats: CommissionStats; role: string }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <MetricCard label="Total em comissões" value={formatCurrency(shareOf(role, stats.total_valor, stats.total_valor_sublicenciado))} />
        {stats.a_receber != null ? <MetricCard label="A receber" value={formatCurrency(stats.a_receber)} /> : null}
        {stats.previsto_mes_atual != null ? (
          <MetricCard label="Estimado (mês atual)" value={formatCurrency(stats.previsto_mes_atual)} />
        ) : null}
        {stats.pago_ultimos_12_meses != null ? (
          <MetricCard label="Pago (últimos 12 meses)" value={formatCurrency(stats.pago_ultimos_12_meses)} />
        ) : null}
      </View>
      {stats.por_status.length > 0 ? (
        <Card>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="overline" tone="muted">
              Comissão por status
            </AppText>
            {stats.por_status.map((row) => {
              const label = commissionStatusLabel(row.status);
              return (
                <View key={row.status} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Badge label={label.label} tone={label.tone} />
                  <AppText variant="bodyStrong">
                    {formatCurrency(shareOf(role, row.valor_total, row.valor_total_sublicenciado))}
                  </AppText>
                </View>
              );
            })}
          </View>
        </Card>
      ) : null}
      <MonthBarChart
        title="Comissões por mês"
        format={formatCurrency}
        emptyText="Sem comissões no período."
        points={[...stats.por_competencia]
          .sort((x, y) => x.competencia.localeCompare(y.competencia))
          .slice(-6)
          .map((row) => ({ month: row.competencia, value: shareOf(role, row.valor_total, row.valor_total_sublicenciado) as number }))}
      />
    </View>
  );
}

function CommissionRow({ item, role }: { item: Commission; role: string }) {
  const status = commissionStatusLabel(item.status);
  return (
    <ListRow
      title={item.consumidor_nome ?? "Cliente"}
      subtitle={`${formatCompetencia(item.competencia)} · ${status.label}${item.sublicenciado_nome ? ` · Cadastrado por: ${item.sublicenciado_nome}` : ""}`}
      right={<AppText variant="bodyStrong">{formatCurrency(shareOf(role, item.valor_comissao, item.valor_comissao_sublicenciado))}</AppText>}
      onPress={() => router.push({ pathname: "/commissions/[commissionId]", params: { commissionId: item.id } })}
    />
  );
}

/** Portal status filter (backend values GERADA/APROVADA/PAGA/CANCELADA, labelled as in the portal). */
const STATUS_FILTERS = [
  { value: "ALL", label: "Todos" },
  { value: "GERADA", label: "Pendente" },
  { value: "APROVADA", label: "Liberada" },
  { value: "PAGA", label: "Paga" },
  { value: "CANCELADA", label: "Cancelada" }
];
const TIPO_FILTERS = [
  { value: "ALL", label: "Todos os tipos" },
  { value: "PREVISTA", label: "Prevista" },
  { value: "GERADA", label: "Gerada" },
  { value: "AJUSTE", label: "Ajuste" },
  { value: "ESTORNO", label: "Estorno" },
  { value: "PAGA", label: "Paga" }
];

function Statement({ stats, role }: { stats: CommissionStats | undefined; role: string }) {
  const [competencia, setCompetencia] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [tipo, setTipo] = useState("ALL");
  const [search, setSearch] = useState("");
  const commissions = useCommissions({
    competencia: competencia === "ALL" ? undefined : competencia,
    status: status === "ALL" ? undefined : status
  });
  const term = search.trim().toLowerCase();
  // Tipo and client search are client-side in the portal too (the API has no such filters).
  const items = (commissions.data?.pages.flatMap((page) => page.items) ?? []).filter(
    (item) =>
      (tipo === "ALL" || item.tipo === tipo) &&
      (!term || `${item.consumidor_nome ?? ""} ${item.fatura_id ?? ""}`.toLowerCase().includes(term))
  );
  const months = [
    { value: "ALL", label: "Todas" },
    ...(stats?.por_competencia ?? []).slice(0, 12).map((row) => ({ value: row.competencia, label: formatCompetencia(row.competencia) }))
  ];

  return (
    <View style={{ gap: spacing.sm }}>
      <ChipGroup options={months} value={competencia} onChange={setCompetencia} />
      <ChipGroup options={STATUS_FILTERS} value={status} onChange={setStatus} />
      <ChipGroup options={TIPO_FILTERS} value={tipo} onChange={setTipo} />
      <TextField label="Buscar cliente/UC" value={search} onChangeText={setSearch} autoCorrect={false} />
      <QueryState
        query={commissions}
        isEmpty={() => items.length === 0}
        empty={<AppText tone="muted">Sem lançamentos no extrato para esses filtros.</AppText>}
      >
        {() => (
          <Card>
            {items.map((item) => (
              <CommissionRow key={item.id} item={item} role={role} />
            ))}
            {commissions.hasNextPage ? (
              <Button
                label="Carregar mais"
                variant="ghost"
                loading={commissions.isFetchingNextPage}
                onPress={() => void commissions.fetchNextPage()}
              />
            ) : null}
          </Card>
        )}
      </QueryState>
    </View>
  );
}

function Payments() {
  const payments = usePayments();
  const items = payments.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <QueryState
      query={payments}
      isEmpty={() => items.length === 0}
      empty={<AppText tone="muted">Sem pagamentos para exibir.</AppText>}
    >
      {() => (
        <Card>
          {items.map((payment) => {
            const status = portalPaymentStatusLabel(payment.status);
            return (
              <ListRow
                key={payment.id}
                title={formatCurrency(payment.valor_liquido ?? payment.valor_comissoes)}
                subtitle={`${payment.competencias.map(formatCompetencia).join(", ") || formatDate(payment.created_at)} · ${status.label}`}
                onPress={() => router.push({ pathname: "/commissions/payments/[paymentId]", params: { paymentId: payment.id } })}
              />
            );
          })}
          {payments.isFetchingNextPage ? <ActivityIndicator /> : null}
        </Card>
      )}
    </QueryState>
  );
}

/** S20–S25 — Comissões: resumo (M-C1), extrato (M-C2) e pagamentos (M-C4, licenciado). */
export default function CommissionsScreen() {
  const { me, role } = useAuthenticatedContext();
  const summary = useCommissionSummary();
  const [segment, setSegment] = useState<Segment>("statement");
  const canSeePayments = hasPermission(me, "payments:read");

  if (!hasPermission(me, "commissions:read")) {
    return (
      <Screen>
        <ScreenHeader title="Comissões" showNotifications />
        <PermissionState />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={() => void summary.refetch()} refreshing={summary.isRefetching}>
      <ScreenHeader title="Comissões" showNotifications />
      <QueryState query={summary} loadingLines={2}>
        {(stats) => <Summary stats={stats} role={role} />}
      </QueryState>
      <Button label="Ver regras de comissão" variant="ghost" onPress={() => router.push("/commissions/rules")} />
      {canSeePayments ? (
        <ChipGroup
          options={[
            { value: "statement", label: "Extrato" },
            { value: "payments", label: "Pagamentos" }
          ]}
          value={segment}
          onChange={setSegment}
        />
      ) : null}
      {segment === "payments" && canSeePayments ? <Payments /> : <Statement stats={summary.data} role={role} />}
    </Screen>
  );
}
