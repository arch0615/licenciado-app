import { Stack } from "expo-router";
import { Share, View } from "react-native";

import { PermissionState, QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { LinkQrCard } from "@/components/ui/LinkQrCard";
import { Screen } from "@/components/ui/Screen";
import { hasPermission } from "@/features/auth/permissions";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { useProfile } from "@/features/profile/useProfile";
import { codeInviteLink } from "@/features/team/team.service";
import { spacing } from "@/theme/tokens";

const shareInvitation = (link: string) =>
  Share.share({ message: `Você foi convidado para ser representante ACVEL. Cadastre-se pelo link: ${link}` });

/**
 * S28 — Convidar representante (portal /equipe/convidar on the live API): shares the licenciado's existing code link to the web portal
 * signup as a QR code, copy and native share. No invitation record is created by the app.
 */
export default function InviteScreen() {
  const { me } = useAuthenticatedContext();
  const profile = useProfile();

  if (!hasPermission(me, "team:invite")) {
    return (
      <Screen edges={["left", "right", "bottom"]}>
        <Stack.Screen options={{ title: "Convidar" }} />
        <PermissionState message="Você não tem permissão para convidar representantes." />
      </Screen>
    );
  }

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Convidar representante" }} />
      <QueryState query={profile} loadingLines={2}>
        {(data) => {
          const codigo = data.role === "LICENCIADO" ? data.data.codigo_licenciado : null;
          const link = codigo ? codeInviteLink(codigo) : null;
          if (!codigo) return <AppText tone="muted">Seu código de licenciado ainda não foi gerado.</AppText>;
          return (
            <View style={{ gap: spacing.md }}>
              <AppText tone="muted">
                Envie seu link de cadastro. Quem se cadastrar por ele ficará vinculado à sua equipe após a aprovação da
                ACVEL.
              </AppText>
              <Card>
                <AppText variant="overline" tone="muted">
                  Seu código
                </AppText>
                <AppText variant="title3">{codigo}</AppText>
              </Card>
              {link ? (
                <LinkQrCard
                  link={link}
                  caption="O representante escaneia o QR Code ou abre o link para se cadastrar na sua equipe."
                  onShare={() => void shareInvitation(link)}
                />
              ) : (
                <AppText variant="callout" tone="muted">
                  O link de cadastro ainda não está disponível no aplicativo. Informe seu código ao representante.
                </AppText>
              )}
            </View>
          );
        }}
      </QueryState>
    </Screen>
  );
}
