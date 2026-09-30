import { useLocalSearchParams } from "expo-router";
import { Share } from "react-native";

import { EmptyState, ErrorState, LoadingState } from "@/components/states/States";
import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import {
  useInvitationValidation,
  useLicenciadoCodeValidation,
  useRegisterSublicenciado
} from "@/features/auth/useAuthActions";
import { isApiError } from "@/services/api/errors";

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

const askForNewInvite = () =>
  void Share.share({ message: "Olá! Meu link de cadastro de representante ACVEL não funcionou. Pode me enviar um novo?" });

type Validation = { isPending: boolean; error: unknown; refetch: () => unknown };

/** Shared loading / invalid-link states for both link formats. */
function LinkState({ validation, children }: { validation: Validation; children: React.ReactNode }) {
  if (validation.isPending) return <LoadingState lines={2} />;
  if (validation.error) {
    // 4xx = link problem (backend message: expirado / usado / código inválido); otherwise retry.
    const invalid = isApiError(validation.error) && validation.error.isClientError;
    return invalid ? (
      <EmptyState
        title={(validation.error as Error).message}
        message="Peça um novo link ao seu licenciado."
        action={{ label: "Pedir um novo link", onPress: askForNewInvite }}
      />
    ) : (
      <ErrorState error={validation.error} onRetry={() => void validation.refetch()} />
    );
  }
  return <>{children}</>;
}

/**
 * S05 — Cadastro de representante. Two link formats:
 * - live ACVEL API: `?codigo=<codigo_licenciado>` → POST /v1/sublicenciados/validate-codigo, then
 *   POST /v1/auth/register-sublicenciado { codigo_licenciado } (the web portal's link format);
 * - licenciado-api: `?convite=<token>` → POST /v1/convites/validar, then register with { convite }.
 * The link to a licenciado is always validated by the backend.
 */
export default function RegisterSublicenciadoScreen() {
  const { convite, codigo } = useLocalSearchParams<{ convite?: string; codigo?: string }>();
  const invitation = useInvitationValidation(convite);
  const code = useLicenciadoCodeValidation(convite ? undefined : codigo);
  const register = useRegisterSublicenciado();

  if (!convite && !codigo) {
    return (
      <Screen edges={["bottom", "left", "right"]}>
        <EmptyState
          title="Nenhum convite encontrado"
          message="Abra o link enviado pelo seu licenciado ou peça um novo."
          action={{ label: "Pedir um link", onPress: askForNewInvite }}
        />
      </Screen>
    );
  }

  if (convite) {
    return (
      <Screen edges={["bottom", "left", "right"]}>
        <LinkState validation={invitation}>
          {invitation.data ? (
            <>
              <Card>
                <AppText variant="overline" tone="muted">
                  Convite
                </AppText>
                <AppText variant="bodyStrong">Convite de {invitation.data.licenciado.nome ?? "seu licenciado"}</AppText>
                <AppText variant="callout" tone="muted">
                  Válido até {formatDate(invitation.data.expires_at)}
                </AppText>
              </Card>
              <RegisterForm
                submitLabel="Criar conta"
                lockedEmail={null}
                submitting={register.isPending}
                error={register.error}
                onSubmit={(values) => register.mutate({ ...values, convite })}
              />
            </>
          ) : null}
        </LinkState>
      </Screen>
    );
  }

  const codigoLicenciado = codigo!.trim().toUpperCase();
  return (
    <Screen edges={["bottom", "left", "right"]}>
      <LinkState validation={code}>
        <Card>
          <AppText variant="overline" tone="muted">
            Convite
          </AppText>
          <AppText variant="bodyStrong">Código do licenciado: {codigoLicenciado}</AppText>
          <AppText variant="callout" tone="muted">
            Código confirmado. Crie sua conta para começar.
          </AppText>
        </Card>
        <RegisterForm
          submitLabel="Criar conta"
          lockedEmail={null}
          submitting={register.isPending}
          error={register.error}
          onSubmit={(values) => register.mutate({ ...values, codigoLicenciado })}
        />
      </LinkState>
    </Screen>
  );
}
