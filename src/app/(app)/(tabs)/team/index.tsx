import { router } from "expo-router";
import { Alert, View } from "react-native";

import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { PermissionState, QueryState } from "@/components/states/QueryState";
import { EmptyState } from "@/components/states/States";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { hasPermission } from "@/features/auth/permissions";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { useInvitations, useRevokeInvitation, useTeam } from "@/features/team/useTeam";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { accountStatusLabel, invitationStatusLabel } from "@/lib/status-labels";
import { userMessage } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

function Invitations() {
  const invitations = useInvitations();
  const revoke = useRevokeInvitation();
  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="overline" tone="muted">
          Convites
        </AppText>
        <QueryState
          query={invitations}
          loadingLines={1}
          isEmpty={(list) => list.length === 0}
          empty={<AppText tone="muted">Nenhum convite enviado.</AppText>}
        >
          {(list) =>
            list.map((invitation) => {
              const status = invitationStatusLabel(invitation.status);
              return (
                <ListRow
                  key={invitation.id}
                  title={invitation.email ?? "Convite por link"}
                  subtitle={`Válido até ${formatDate(invitation.expires_at)}`}
                  right={
                    invitation.status === "ATIVO" ? (
                      <Button
                        label="Cancelar"
                        variant="ghost"
                        loading={revoke.isPending && revoke.variables === invitation.id}
                        onPress={() =>
                          Alert.alert("Cancelar convite?", "O link deixará de funcionar.", [
                            { text: "Voltar", style: "cancel" },
                            { text: "Cancelar convite", style: "destructive", onPress: () => revoke.mutate(invitation.id) }
                          ])
                        }
                      />
                    ) : (
                      <Badge label={status.label} tone={status.tone} />
                    )
                  }
                />
              );
            })
          }
        </QueryState>
        {revoke.error ? (
          <AppText variant="callout" tone="danger">
            {userMessage(revoke.error)}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}

/** S26–S29 — Minha equipe (licenciado): members (E1), invitations (convites). */
export default function TeamScreen() {
  const { me } = useAuthenticatedContext();
  const team = useTeam();
  const canInvite = hasPermission(me, "team:invite");

  if (!hasPermission(me, "team:read")) {
    return (
      <Screen>
        <ScreenHeader title="Equipe" showNotifications />
        <PermissionState />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={() => void team.refetch()} refreshing={team.isRefetching}>
      <ScreenHeader title="Equipe" showNotifications />
      {canInvite ? <Button label="Convidar representante" fullWidth onPress={() => router.push("/team/invite")} /> : null}
      <QueryState
        query={team}
        isEmpty={(data) => data.data.length === 0}
        empty={
          <EmptyState
            title="Você ainda não tem representantes"
            message="Convide pessoas para vender com você."
            action={{ label: "Convidar representante", onPress: () => router.push("/team/invite") }}
          />
        }
      >
        {(data) => (
          <Card>
            <AppText variant="overline" tone="muted">
              {data.total} representante(s)
            </AppText>
            {data.data.map((member) => {
              const status = accountStatusLabel(member.status);
              return (
                <ListRow
                  key={member.id}
                  title={member.nome_completo ?? member.email}
                  subtitle={`${formatNumber(member.total_consumidores)} clientes · previsto ${formatCurrency(member.comissao_prevista_mes)}`}
                  right={<Badge label={status.label} tone={status.tone} />}
                  onPress={() => router.push({ pathname: "/team/[memberId]", params: { memberId: member.id } })}
                />
              );
            })}
          </Card>
        )}
      </QueryState>
      {canInvite ? <Invitations /> : null}
    </Screen>
  );
}
