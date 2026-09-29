import { router } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";

import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { PermissionState } from "@/components/states/QueryState";
import { Button } from "@/components/ui/Button";
import { ChipGroup } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { hasPermission } from "@/features/auth/permissions";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { clientInvitationLink, representativeCode, shareClientInvitation } from "@/features/clients/client-invitation";
import { ClientJourneyBoard, ClientPendingActions, ClientPortfolio } from "@/features/clients/components/ClientLists";
import { useProfile } from "@/features/profile/useProfile";
import { spacing } from "@/theme/tokens";

type Segment = "portfolio" | "journey" | "pending";
const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "portfolio", label: "Carteira" },
  { value: "journey", label: "Jornada" },
  { value: "pending", label: "Pendências" }
];

/** S15 / S18 / S19 — Clientes (Carteira · Jornada · Pendências). */
export default function ClientsScreen() {
  const { me } = useAuthenticatedContext();
  const [segment, setSegment] = useState<Segment>("portfolio");
  const profile = useProfile();
  const canWrite = hasPermission(me, "clients:write");

  const newClient = () => router.push("/clients/new");

  async function shareLink() {
    const code = profile.data ? representativeCode(profile.data) : null;
    const link = code ? clientInvitationLink(code) : null;
    if (!link) {
      Alert.alert("Link indisponível", "Não foi possível gerar seu link de cadastro agora. Tente novamente mais tarde.");
      return;
    }
    await shareClientInvitation(link);
  }

  if (!hasPermission(me, "clients:read")) {
    return (
      <Screen>
        <ScreenHeader title="Clientes" showNotifications />
        <PermissionState />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <ScreenHeader title="Clientes" showNotifications />
      {canWrite ? (
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button label="Novo cliente" fullWidth onPress={newClient} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Enviar link" variant="outline" fullWidth loading={profile.isPending} onPress={() => void shareLink()} />
          </View>
        </View>
      ) : null}
      <ChipGroup options={SEGMENTS} value={segment} onChange={setSegment} />
      {segment === "portfolio" ? <ClientPortfolio onNewClient={newClient} /> : null}
      {segment === "journey" ? <ClientJourneyBoard /> : null}
      {segment === "pending" ? <ClientPendingActions /> : null}
    </Screen>
  );
}
