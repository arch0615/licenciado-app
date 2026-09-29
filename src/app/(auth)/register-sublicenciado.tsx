import { useLocalSearchParams } from "expo-router";
import { Share } from "react-native";

import { EmptyState, ErrorState, LoadingState } from "@/components/states/States";
import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { useInvitationValidation, useRegisterSublicenciado } from "@/features/auth/useAuthActions";
import { isApiError } from "@/services/api/errors";

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

const askForNewInvite = () =>
  void Share.share({ message: "Olá! Meu convite de representante ACVEL não é mais válido. Pode me enviar um novo?" });

/**
 * S05 — Cadastro de representante via convite. Opened by the invite link (`?convite=<token>`).
 * POST /v1/convites/validar → form → POST /v1/auth/register-sublicenciado { convite } → sign-in.
 * The link to a licenciado happens only through the invitation token.
 */
export default function RegisterSublicenciadoScreen() {
  const { convite } = useLocalSearchParams<{ convite?: string }>();
  const invitation = useInvitationValidation(convite);
  const register = useRegisterSublicenciado();

  if (!convite) {
    return (
      <Screen edges={["bottom", "left", "right"]}>
        <EmptyState
          title="Nenhum convite encontrado"
          message="Abra o link enviado pelo seu licenciado ou peça um novo convite."
          action={{ label: "Pedir um convite", onPress: askForNewInvite }}
        />
      </Screen>
    );
  }

  if (invitation.isPending) {
    return (
      <Screen edges={["bottom", "left", "right"]}>
        <LoadingState lines={2} />
      </Screen>
    );
  }

  if (invitation.error) {
    // 4xx = invitation problem (backend message: expirado / usado / cancelado / inválido); else retry.
    const invalid = isApiError(invitation.error) && invitation.error.isClientError;
    return (
      <Screen edges={["bottom", "left", "right"]}>
        {invalid ? (
          <EmptyState
            title={invitation.error.message}
            message="Peça um novo convite ao seu licenciado."
            action={{ label: "Pedir um novo convite", onPress: askForNewInvite }}
          />
        ) : (
          <ErrorState error={invitation.error} onRetry={() => void invitation.refetch()} />
        )}
      </Screen>
    );
  }

  const data = invitation.data;
  return (
    <Screen edges={["bottom", "left", "right"]}>
      <Card>
        <AppText variant="overline" tone="muted">
          Convite
        </AppText>
        <AppText variant="bodyStrong">Convite de {data.licenciado.nome ?? "seu licenciado"}</AppText>
        <AppText variant="callout" tone="muted">
          Válido até {formatDate(data.expires_at)}
        </AppText>
      </Card>
      <RegisterForm
        submitLabel="Criar conta"
        // The validation response does not disclose the restricted e-mail: the backend checks it on registration.
        lockedEmail={null}
        submitting={register.isPending}
        error={register.error}
        onSubmit={(values) => register.mutate({ ...values, convite })}
      />
    </Screen>
  );
}
