import { router } from "expo-router";
import { View } from "react-native";

import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { useAuthenticatedContext, useSession } from "@/features/auth/SessionProvider";
import { OwnDocuments } from "@/features/documents/components/OwnDocuments";
import { EDITABLE_ONBOARDING_STATUSES } from "@/features/onboarding/onboarding.service";
import { useOnboarding, useStartOnboarding } from "@/features/onboarding/useOnboarding";
import { formatDate } from "@/lib/format";
import { accountStatusLabel, onboardingStepLabel } from "@/lib/status-labels";
import { userMessage } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

/**
 * N01 / S13 — "Seu cadastro": approval state from /v1/auth/me, onboarding status, completed steps, pending
 * requirements and documents, plus the portal entry points to start/continue the registration wizard.
 * The backend decides every transition (approval stays with the ACVEL team).
 */
export default function PendingStatusScreen() {
  const { me, role } = useAuthenticatedContext();
  const { refresh } = useSession();
  const onboarding = useOnboarding();
  const status = accountStatusLabel(me.accountStatus);
  const notStarted = me.approvalStatus === "NO_RECORD";
  const start = useStartOnboarding();
  const editable = !onboarding.data || EDITABLE_ONBOARDING_STATUSES.includes(onboarding.data.status);
  const begin = () =>
    start.mutate(undefined, {
      // First tap on NO_RECORD only creates the business record; the wizard opens once the id exists.
      onSuccess: (result) => {
        if (result !== null) router.push("/pending/onboarding");
      }
    });

  return (
    <Screen onRefresh={() => void Promise.all([refresh(), onboarding.refetch()])} refreshing={onboarding.isRefetching}>
      <ScreenHeader title="Seu cadastro" subtitle={role === "SUBLICENCIADO" ? "Representante" : "Licenciado"} />
      <Card>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="overline" tone="muted">
            Situação atual
          </AppText>
          <Badge label={status.label} tone={status.tone} />
          <AppText tone="muted">
            {notStarted
              ? "Seu cadastro ainda não foi iniciado. Toque em Iniciar cadastro para começar."
              : me.accountStatus === "EM_ANALISE"
                ? "Seu cadastro está em análise. Você receberá uma notificação quando houver novidades."
                : "Acompanhe abaixo o andamento do seu cadastro."}
          </AppText>
          {notStarted || !onboarding.data ? (
            <Button label="Iniciar cadastro" size="lg" fullWidth loading={start.isPending} onPress={begin} />
          ) : editable ? (
            <Button label="Continuar cadastro" size="lg" fullWidth onPress={() => router.push("/pending/onboarding")} />
          ) : null}
          {start.error ? (
            <AppText variant="callout" tone="danger">
              {userMessage(start.error)}
            </AppText>
          ) : null}
        </View>
      </Card>

      {notStarted ? null : (
        <QueryState query={onboarding} loadingLines={2}>
          {(data) =>
            data ? (
              <View style={{ gap: spacing.md }}>
                <Card>
                  <View style={{ gap: spacing.xs }}>
                    <AppText variant="overline" tone="muted">
                      Progresso
                    </AppText>
                    <AppText variant="title3">{data.progresso_percentual}% concluído</AppText>
                    {data.reprovado_motivo ? (
                      <AppText variant="callout" tone="danger">
                        Motivo da reprovação: {data.reprovado_motivo}
                      </AppText>
                    ) : null}
                    {data.submitted_at ? (
                      <AppText variant="caption" tone="muted">
                        Enviado para análise em {formatDate(data.submitted_at)}
                      </AppText>
                    ) : null}
                    {data.etapas_concluidas.length > 0 ? (
                      <View style={{ gap: 2 }}>
                        <AppText variant="calloutStrong">Etapas concluídas</AppText>
                        {data.etapas_concluidas.map((step) => (
                          <AppText key={step} variant="callout" tone="success">
                            ✓ {onboardingStepLabel(step)}
                          </AppText>
                        ))}
                      </View>
                    ) : null}
                    {data.pendencias.length > 0 ? (
                      <View style={{ gap: 2 }}>
                        <AppText variant="calloutStrong">Pendências</AppText>
                        {data.pendencias.map((item) => (
                          <AppText key={item} variant="callout" tone="muted">
                            • {onboardingStepLabel(item)}
                          </AppText>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </Card>
                <OwnDocuments title="Documentos" />
              </View>
            ) : (
              <Card>
                <AppText tone="muted">As etapas do seu cadastro aparecerão aqui assim que ele for iniciado.</AppText>
              </Card>
            )
          }
        </QueryState>
      )}
    </Screen>
  );
}
