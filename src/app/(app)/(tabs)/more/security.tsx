import { Stack } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";

import { TextField } from "@/components/forms/TextField";
import { QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { AuthError } from "@/features/auth/auth-gateway";
import { PasswordChecklist } from "@/features/auth/components/PasswordChecklist";
import { passwordMeetsPolicy } from "@/features/auth/password-policy";
import { useChangePassword } from "@/features/auth/useAuthActions";
import {
  useAccountDeletionRequest,
  useRevokeAllSessions,
  useRevokeSession,
  useSessions
} from "@/features/profile/useProfile";
import { formatDate, formatDateTime } from "@/lib/format";
import { userMessage } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

function ChangePasswordCard() {
  const change = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!current) return setError("Informe a senha atual.");
    if (!passwordMeetsPolicy(next)) return setError("A nova senha não atende aos requisitos.");
    if (next !== confirm) return setError("As senhas não conferem.");
    setError(null);
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setCurrent("");
          setNext("");
          setConfirm("");
        }
      }
    );
  }

  const failure = error ?? (change.error ? (change.error instanceof AuthError ? change.error.message : userMessage(change.error)) : null);

  return (
    <Card>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="overline" tone="muted">
          Trocar senha
        </AppText>
        <TextField label="Senha atual" value={current} onChangeText={setCurrent} password autoComplete="current-password" />
        <TextField label="Nova senha" value={next} onChangeText={setNext} password autoComplete="new-password" />
        <PasswordChecklist value={next} />
        <TextField label="Confirmar nova senha" value={confirm} onChangeText={setConfirm} password autoComplete="new-password" />
        {failure ? (
          <AppText variant="callout" tone="danger" accessibilityLiveRegion="polite">
            {failure}
          </AppText>
        ) : null}
        {change.isSuccess ? (
          <AppText variant="callout" tone="success" accessibilityLiveRegion="polite">
            Senha alterada com sucesso.
          </AppText>
        ) : null}
        <Button label="Trocar senha" fullWidth loading={change.isPending} onPress={submit} />
      </View>
    </Card>
  );
}

function SessionsCard() {
  const sessions = useSessions();
  const revoke = useRevokeSession();
  const revokeAll = useRevokeAllSessions();
  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="overline" tone="muted">
          Dispositivos conectados
        </AppText>
        <QueryState
          query={sessions}
          isEmpty={(list) => list.length === 0}
          empty={<AppText tone="muted">Nenhum dispositivo registrado.</AppText>}
        >
          {(list) =>
            list.map((session) => (
              <ListRow
                key={session.id}
                title={session.deviceLabel}
                subtitle={`Último acesso: ${formatDateTime(session.lastSeenAt)}`}
                right={
                  session.isCurrent ? (
                    <Badge label="Este aparelho" tone="success" />
                  ) : (
                    <Button
                      label="Encerrar"
                      variant="ghost"
                      loading={revoke.isPending && revoke.variables === session.id}
                      onPress={() => revoke.mutate(session.id)}
                    />
                  )
                }
              />
            ))
          }
        </QueryState>
        {revoke.error || revokeAll.error ? (
          <AppText variant="callout" tone="danger">
            {userMessage(revoke.error ?? revokeAll.error)}
          </AppText>
        ) : null}
        <Button
          label="Sair de todos os dispositivos"
          variant="outline"
          fullWidth
          loading={revokeAll.isPending}
          onPress={() =>
            Alert.alert("Sair de todos os dispositivos?", "Você precisará entrar novamente em todos os aparelhos.", [
              { text: "Cancelar", style: "cancel" },
              { text: "Sair de todos", style: "destructive", onPress: () => revokeAll.mutate() }
            ])
          }
        />
      </View>
    </Card>
  );
}

function DeleteAccountCard() {
  const request = useAccountDeletionRequest();
  return (
    <Card variant="alert" tone="danger">
      <View style={{ gap: spacing.sm }}>
        <AppText variant="bodyStrong">Excluir conta</AppText>
        <AppText variant="callout" tone="muted">
          Vamos registrar seu pedido e a ACVEL entrará em contato para concluir a exclusão conforme a LGPD. Dados que a
          lei exige guardar (por exemplo, fiscais) são mantidos pelo prazo legal.
        </AppText>
        {request.data ? (
          <AppText variant="callout" tone="success">
            Pedido registrado em {formatDate(request.data.requestedAt)}.
          </AppText>
        ) : (
          <Button
            label="Solicitar exclusão"
            variant="destructive"
            fullWidth
            loading={request.isPending}
            onPress={() =>
              Alert.alert("Solicitar exclusão da conta?", "Esta ação inicia o processo de exclusão dos seus dados.", [
                { text: "Cancelar", style: "cancel" },
                { text: "Solicitar", style: "destructive", onPress: () => request.mutate() }
              ])
            }
          />
        )}
        {request.error ? (
          <AppText variant="callout" tone="danger">
            {userMessage(request.error)}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}

/** S37 — Segurança: Firebase password change, backend sessions (inventory A6–A8), deletion request (A9). */
export default function SecurityScreen() {
  return (
    <Screen>
      <Stack.Screen options={{ title: "Segurança" }} />
      <ChangePasswordCard />
      <SessionsCard />
      <DeleteAccountCard />
    </Screen>
  );
}
