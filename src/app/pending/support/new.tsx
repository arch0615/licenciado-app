import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { NewTicketForm } from "@/features/support/components/SupportViews";

export default function PendingNewTicketScreen() {
  return (
    <Screen>
      <ScreenHeader title="Novo ticket" />
      <NewTicketForm base="/pending/support" />
    </Screen>
  );
}
