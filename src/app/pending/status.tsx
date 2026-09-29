import { View } from "react-native";

import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { useAuthenticatedContext, useSession } from "@/features/auth/SessionProvider";
import { DocumentsCard } from "@/features/onboarding/components/DocumentsCard";
import { useOnboarding, useStartOnboarding, useSubmitOnboarding } from "@/features/onboarding/useOnboarding";
import { formatDate } from "@/lib/format";
import { accountStatusLabel } from "@/lib/status-labels";
import { userMessage } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

/**
 * N01 / S13 — "Seu cadastro": approval state (from /v1/auth/me), onboarding status and pending items,
 * document upload and submission. The backend decides every transition; the app only reflects it.
 */
export default function PendingStatusScreen() {
  const { me, role } = useAuthenticatedContext();
  const { refresh } = useSession();
  const onboarding = useOnboarding();
  const start = useStartOnboarding();
  const submit = useSubmitOnboarding();
  const status = accountStatusLabel(me.accountStatus);
  const notStarted = me.approvalStatus === "NO_RECORD";

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
              ? "Conclua seu cadastro para enviá-lo para análise da ACVEL."
              : me.accountStatus === "EM_ANALISE"
                ? "Seu cadastro está em análise. Você receberá uma notificação quando houver novidades."
                : "Complete as etapas abaixo e envie para análise."}
          </AppText>
        </View>
      </Card>

      {start.error || submit.error ? (
        <Card variant="alert" tone="danger">
          <AppText variant="callout">{userMessage(start.error ?? submit.error)}</AppText>
        </Card>
      ) : null}

      {notStarted ? (
        <Button label="Iniciar cadastro" size="lg" fullWidth loading={start.isPending} onPress={() => start.mutate()} />
      ) : (
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
                        Ajustes solicitados: {data.reprovado_motivo}
                      </AppText>
                    ) : null}
                    {data.submitted_at ? (
                      <AppText variant="caption" tone="muted">
                        Enviado em {formatDate(data.submitted_at)}
                      </AppText>
                    ) : null}
                    {data.pendencias.length > 0 ? (
                      <View style={{ gap: 2 }}>
                        <AppText variant="calloutStrong">Pendências</AppText>
                        {data.pendencias.map((item) => (
                          <AppText key={item} variant="callout" tone="muted">
                            • {item}
                          </AppText>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </Card>
                {!data.submitted ? <DocumentsCard role={role} /> : null}
                {!data.submitted ? (
                  <Button
                    label="Enviar para análise"
                    size="lg"
                    fullWidth
                    disabled={!data.can_submit}
                    loading={submit.isPending}
                    onPress={() => submit.mutate()}
                  />
                ) : null}
                {!data.submitted && !data.can_submit ? (
                  <AppText variant="caption" tone="muted" align="center">
                    O envio fica disponível quando todas as pendências forem resolvidas. Dados pessoais, bancários e o
                    aceite do contrato são concluídos no cadastro completo.
                  </AppText>
                ) : null}
              </View>
            ) : (
              <Button label="Começar etapas do cadastro" size="lg" fullWidth loading={start.isPending} onPress={() => start.mutate()} />
            )
          }
        </QueryState>
      )}
    </Screen>
  );
}
