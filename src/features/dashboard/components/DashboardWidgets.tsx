import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import type { Contract } from "@/features/profile/profile.service";
import type { AccountProfile } from "@/features/profile/types";
import type { TeamMember } from "@/features/team/types";
import { formatCompetencia, formatCurrency, formatNumber } from "@/lib/format";
import { accountStatusLabel, REGION_LABELS } from "@/lib/status-labels";
import { userMessage } from "@/services/api/errors";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, spacing } from "@/theme/tokens";

import type { Dashboard, DashboardAlert, MonthPoint } from "../dashboard.service";
import { useDashboardAlertAction } from "../useDashboard";

/** Portal greeting card: licenciado code (or representative link code) and coupon with copy. */
export function CodeCouponCard({ profile }: { profile: AccountProfile }) {
  const [copied, setCopied] = useState(false);
  const isSub = profile.role === "SUBLICENCIADO";
  const code = isSub ? profile.data.codigo_sublicenciado : profile.data.codigo_licenciado;
  const coupon = profile.data.codigo_cupom;
  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="overline" tone="muted">
          {isSub ? "Código de vínculo para o cliente" : "Código do licenciado"}
        </AppText>
        <AppText variant="title3" selectable>
          {code || (isSub ? "Não disponível" : "Não gerado")}
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <AppText variant="callout" tone="muted">
            Cupom: {coupon || "Não definido"}
          </AppText>
          {coupon ? (
            <Button
              label={copied ? "Cupom copiado" : "Copiar cupom"}
              variant="ghost"
              onPress={() => void Clipboard.setStringAsync(coupon).then(() => setCopied(true))}
            />
          ) : null}
        </View>
      </View>
    </Card>
  );
}

/** Portal "kWh disponível" card for the licenciado's region. */
export function KwhCard({ summary }: { summary: Dashboard["summary"] }) {
  const region = summary.regiao ? REGION_LABELS[summary.regiao] : null;
  const kwh = summary.kwh_disponivel_regiao;
  const reason = !summary.regiao ? "Região não informada" : kwh === null || kwh === undefined ? "Ainda não configurado" : "kWh/mês";
  return (
    <Card>
      <View style={{ gap: 2 }}>
        <AppText variant="overline" tone="muted">
          kWh disponível
        </AppText>
        <AppText variant="caption" tone="muted">
          {region ? `Região ${region}` : "na sua região"}
        </AppText>
        <AppText variant="title2">{kwh === null || kwh === undefined ? "—" : formatNumber(kwh)}</AppText>
        <AppText variant="caption" tone="muted">
          {reason}
        </AppText>
      </View>
    </Card>
  );
}

/** Simple monthly bar chart (portal "Evolução de clientes" / "Comissões por mês"). Values are the backend's. */
export function MonthBarChart({
  title,
  points,
  format = formatNumber,
  emptyText = "Sem dados no período."
}: {
  title: string;
  points: MonthPoint[] | undefined;
  format?: (value: number) => string;
  emptyText?: string;
}) {
  const { colors } = useTheme();
  const data = (points ?? []).filter((point) => typeof point.value === "number" && Number.isFinite(point.value));
  // Scaling bar heights to the largest value is presentation only, not a business calculation.
  const max = Math.max(0, ...data.map((point) => point.value));
  return (
    <Card>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="overline" tone="muted">
          {title}
        </AppText>
        {data.length === 0 ? (
          <AppText tone="muted">{emptyText}</AppText>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.xs, height: 140 }} accessibilityRole="image" accessibilityLabel={title}>
            {data.map((point) => (
              <View key={point.month} style={{ flex: 1, alignItems: "center", gap: 2 }}>
                <AppText variant="caption" tone="muted" numberOfLines={1}>
                  {format(point.value)}
                </AppText>
                <View
                  style={{
                    width: "70%",
                    height: max > 0 ? Math.max(4, (point.value / max) * 90) : 4,
                    backgroundColor: colors.primary,
                    borderRadius: radius.sm
                  }}
                />
                <AppText variant="caption" tone="muted" numberOfLines={1}>
                  {formatCompetencia(point.month)}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </View>
    </Card>
  );
}

/** Portal "Carteira por representante" (licenciado only, when the team is not empty). */
export function TeamBreakdown({ members }: { members: TeamMember[] }) {
  if (members.length === 0) return null;
  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="overline" tone="muted">
          Carteira por representante
        </AppText>
        {members.map((member) => {
          const status = accountStatusLabel(member.status);
          return (
            <ListRow
              key={member.id}
              title={member.nome_completo ?? member.email ?? "Representante"}
              subtitle={`${formatNumber(member.total_consumidores)} clientes · ${formatNumber(member.total_ucs)} UCs · comissão prevista ${formatCurrency(member.comissao_prevista_mes)}`}
              right={<Badge label={status.label} tone={status.tone} />}
              onPress={() => router.push({ pathname: "/team/[memberId]", params: { memberId: member.id } })}
            />
          );
        })}
      </View>
    </Card>
  );
}

/** Portal contract banner: shown while the contract waits for the licenciado's signature (ZapSign). */
export function ContractBanner({ contract }: { contract: Contract | null | undefined }) {
  if (!contract || contract.status !== "AGUARDANDO_ASSINATURA") return null;
  const url = contract.signing_url;
  return (
    <Card variant="alert" tone="warning">
      <View style={{ gap: spacing.xs }}>
        <AppText variant="bodyStrong">Seu contrato Licenciado Pro está aguardando assinatura</AppText>
        <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
          {url && url.startsWith("https://") ? <Button label="Assinar contrato" onPress={() => void Linking.openURL(url)} /> : null}
          <Button label="Ver detalhes" variant="ghost" onPress={() => router.push("/more/legal")} />
        </View>
      </View>
    </Card>
  );
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  DOCUMENTO_PENDENTE: "Documento pendente",
  UC_AGUARDANDO_ATIVACAO: "UC aguardando ativação",
  PAGAMENTO_PENDENTE: "Pagamento pendente"
};

function alertTarget(alert: DashboardAlert): (() => void) | null {
  const clientId = alert.metadata?.clienteId ?? (alert.entityType === "CLIENTE" ? alert.entityId : null);
  if (clientId) return () => router.push({ pathname: "/clients/[clientId]", params: { clientId } });
  if (alert.entityType === "PAGAMENTO") return () => router.push("/commissions");
  return null;
}

/** Portal "Alertas operacionais": Ver, Marcar como lido, Resolver. */
export function OperationalAlerts({ alerts }: { alerts: DashboardAlert[] }) {
  const action = useDashboardAlertAction();
  const open = alerts.filter((alert) => !alert.resolved_at);
  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="overline" tone="muted">
          Alertas operacionais
        </AppText>
        {open.length === 0 ? <AppText tone="muted">Nenhum alerta operacional pendente no momento.</AppText> : null}
        {open.slice(0, 10).map((alert) => {
          const target = alertTarget(alert);
          const busy = action.isPending && action.variables?.alertId === alert.id;
          return (
            <View key={alert.id} style={{ gap: 2, paddingVertical: spacing.xs }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
                <AppText variant="calloutStrong" style={{ flex: 1 }}>
                  {ALERT_TYPE_LABELS[alert.type] ?? "Alerta"}
                </AppText>
                <Badge label={alert.read_at ? "Lido" : "Não lido"} tone={alert.read_at ? "neutral" : "info"} />
              </View>
              <AppText variant="callout" tone="muted">
                {alert.description}
              </AppText>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {target ? <Button label="Ver" variant="ghost" onPress={target} /> : null}
                {!alert.read_at ? (
                  <Button label="Marcar como lido" variant="ghost" loading={busy && action.variables?.action === "read"} onPress={() => action.mutate({ alertId: alert.id, action: "read" })} />
                ) : null}
                <Button label="Resolver" variant="ghost" loading={busy && action.variables?.action === "resolve"} onPress={() => action.mutate({ alertId: alert.id, action: "resolve" })} />
              </View>
            </View>
          );
        })}
        {action.error ? (
          <AppText variant="callout" tone="danger">
            {userMessage(action.error)}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}
