import { router } from "expo-router";
import { useState } from "react";

import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { PermissionState } from "@/components/states/QueryState";
import { Button } from "@/components/ui/Button";
import { ChipGroup } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { hasPermission } from "@/features/auth/permissions";
import { useAuthenticatedContext } from "@/features/auth/SessionProvider";
import { ClientJourneyBoard, ClientPendingActions, ClientPortfolio } from "@/features/clients/components/ClientLists";

type Segment = "portfolio" | "journey" | "pending";
const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "portfolio", label: "Carteira" },
  { value: "journey", label: "Acompanhamento" },
  { value: "pending", label: "Alertas" }
];

/**
 * S15 / S18 / S19 — Clientes (Carteira · Jornada · Pendências). New clients join through the consumer
 * self-registration link (QR code / share), as in the portal.
 */
export default function ClientsScreen() {
  const { me } = useAuthenticatedContext();
  const [segment, setSegment] = useState<Segment>("portfolio");
  const openSignupLink = () => router.push("/clients/signup-link");

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
      <Button label="Gerar QR Code de cadastro" variant="outline" fullWidth onPress={openSignupLink} />
      <ChipGroup options={SEGMENTS} value={segment} onChange={setSegment} />
      {segment === "portfolio" ? <ClientPortfolio onShareLink={openSignupLink} /> : null}
      {segment === "journey" ? <ClientJourneyBoard /> : null}
      {segment === "pending" ? <ClientPendingActions /> : null}
    </Screen>
  );
}
