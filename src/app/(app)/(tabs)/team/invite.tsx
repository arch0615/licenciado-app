import { Stack } from "expo-router";
import { useState } from "react";
import { Share, View } from "react-native";

import { TextField } from "@/components/forms/TextField";
import { PermissionState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { hasPermission } from "@/features/auth/permissions";
import { EMAIL_PATTERN } from "@/features/auth/password-policy";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { useCreateInvitation } from "@/features/team/useTeam";
import { formatDate } from "@/lib/format";
import { userMessage } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

const shareInvitation = (link: string) =>
  Share.share({ message: `Você foi convidado para ser representante ACVEL. Cadastre-se pelo link: ${link}` });

/**
 * S28 — Convidar representante: POST /v1/sublicenciados/convites (Swagger). The single-use link is
 * returned once and shared with the native share sheet (no QR service).
 */
export default function InviteScreen() {
  const { me } = useAuthenticatedContext();
  const create = useCreateInvitation();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  if (!hasPermission(me, "team:invite")) {
    return (
      <Screen edges={["left", "right", "bottom"]}>
        <Stack.Screen options={{ title: "Convidar" }} />
        <PermissionState message="Você não tem permissão para convidar representantes." />
      </Screen>
    );
  }

  function submit() {
    if (email.trim() && !EMAIL_PATTERN.test(email.trim())) {
      setEmailError("Informe um e-mail válido ou deixe em branco.");
      return;
    }
    setEmailError(null);
    create.mutate({ email: email.trim() || undefined });
  }

  const invitation = create.data;

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Convidar representante" }} />
      {invitation ? (
        <View style={{ gap: spacing.md }}>
          <Card variant="alert" tone="success">
            <View style={{ gap: spacing.xs }}>
              <AppText variant="bodyStrong">Convite criado</AppText>
              <AppText variant="callout" tone="muted">
                {invitation.email ? `Somente ${invitation.email} poderá usar este convite. ` : ""}
                Válido até {formatDate(invitation.expires_at)}. O link só pode ser usado uma vez.
              </AppText>
            </View>
          </Card>
          <Button label="Compartilhar convite" size="lg" fullWidth onPress={() => void shareInvitation(invitation.link)} />
          <Button
            label="Criar outro convite"
            variant="ghost"
            fullWidth
            onPress={() => {
              setEmail("");
              create.reset();
            }}
          />
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          <AppText tone="muted">
            Gere um link de convite e envie pelo WhatsApp ou outro aplicativo. Se informar um e-mail, apenas essa pessoa
            poderá usar o convite.
          </AppText>
          <TextField
            label="E-mail do representante (opcional)"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {create.error ? (
            <Card variant="alert" tone="danger">
              <AppText variant="callout">{userMessage(create.error)}</AppText>
            </Card>
          ) : null}
          <Button label="Gerar convite" size="lg" fullWidth loading={create.isPending} onPress={submit} />
        </View>
      )}
    </Screen>
  );
}
