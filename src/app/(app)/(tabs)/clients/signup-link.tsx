import { Stack } from "expo-router";

import { QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { LinkQrCard } from "@/components/ui/LinkQrCard";
import { Screen } from "@/components/ui/Screen";
import { clientInvitationLink, representativeCode, shareClientInvitation } from "@/features/clients/client-invitation";
import { useProfile } from "@/features/profile/useProfile";

/** Portal /clientes "Link de cadastro": QR code + copy/share of the consumer self-registration link. */
export default function ClientSignupLinkScreen() {
  const profile = useProfile();
  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Link de cadastro" }} />
      <QueryState query={profile} loadingLines={3}>
        {(data) => {
          const code = representativeCode(data);
          const link = code ? clientInvitationLink(code) : null;
          if (!link) {
            return <AppText tone="muted">Seu link de cadastro ainda não está disponível. Tente novamente mais tarde.</AppText>;
          }
          return (
            <LinkQrCard
              link={link}
              caption="Compartilhe com o cliente para cadastro vinculado ao seu código de representante."
              onShare={() => void shareClientInvitation(link)}
            />
          );
        }}
      </QueryState>
    </Screen>
  );
}
