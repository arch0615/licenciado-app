import { useLocalSearchParams } from "expo-router";

import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { Screen } from "@/components/ui/Screen";
import { TicketConversation } from "@/features/support/components/SupportViews";

export default function PendingTicketScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  return (
    <Screen>
      <ScreenHeader title="Chamado" />
      <TicketConversation ticketId={ticketId} />
    </Screen>
  );
}
