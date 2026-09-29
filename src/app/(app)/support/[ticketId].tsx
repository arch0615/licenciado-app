import { Stack, useLocalSearchParams } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { TicketConversation } from "@/features/support/components/SupportViews";

export default function TicketScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Chamado" }} />
      <TicketConversation ticketId={ticketId} />
    </Screen>
  );
}
