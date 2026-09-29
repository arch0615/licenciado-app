import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { NewTicketForm } from "@/features/support/components/SupportViews";

export default function PendingNewTicketScreen() {
  return (
    <Screen>
      <ScreenHeader title="Novo chamado" />
      <NewTicketForm base="/pending/support" />
    </Screen>
  );
}
