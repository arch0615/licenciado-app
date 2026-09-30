import { Stack } from "expo-router";
import { useState } from "react";
import { Share, View } from "react-native";

import { TextField } from "@/components/forms/TextField";
import { PermissionState, QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { hasPermission } from "@/features/auth/permissions";
import { EMAIL_PATTERN } from "@/features/auth/password-policy";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { useProfile } from "@/features/profile/useProfile";
import { codeInviteLink } from "@/features/team/team.service";
import { useCreateInvitation, useInvitations } from "@/features/team/useTeam";
import { formatDate } from "@/lib/format";
import { userMessage } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

const shareInvitation = (link: string) =>
  Share.share({ message: `Você foi convidado para ser representante ACVEL. Cadastre-se pelo link: ${link}` });

/**
 * S28 — Convidar representante, shared with the native share sheet (no QR service):
 * - token invitations (licenciado-api: POST /v1/sublicenciados/convites, single-use link returned once);
 * - live ACVEL API (no invitation endpoints): the licenciado's code link, like the web portal.
 */
export default function InviteScreen() {
  const { me } = useAuthenticatedContext();
  const create = useCreateInvitation();
  const invitations = useInvitations();
  const profile = useProfile();
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

  // Live ACVEL API: no token invitations → share the code-based signup link.
  if (invitations.data === null) {
    return (
      <Screen edges={["left", "right", "bottom"]}>
        <Stack.Screen options={{ title: "Convidar representante" }} />
        <QueryState query={profile} loadingLines={2}>
          {(data) => {
            const codigo = data.role === "LICENCIADO" ? data.data.codigo_licenciado : null;
            return codigo ? (
              <View style={{ gap: spacing.md }}>
                <AppText tone="muted">
                  Envie seu link de cadastro. Quem se cadastrar por ele ficará vinculado à sua equipe após a aprovação
                  da ACVEL.
                </AppText>
                <Card>
                  <AppText variant="overline" tone="muted">
                    Seu código
                  </AppText>
                  <AppText variant="title3">{codigo}</AppText>
                </Card>
                <Button label="Compartilhar link" size="lg" fullWidth onPress={() => void shareInvitation(codeInviteLink(codigo))} />
              </View>
            ) : (
              <AppText tone="muted">Seu código de licenciado ainda não foi gerado.</AppText>
            );
          }}
        </QueryState>
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
