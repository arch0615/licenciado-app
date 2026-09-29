import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { Screen } from "@/components/ui/Screen";
import { TicketList } from "@/features/support/components/SupportViews";

/** S33 — Ajuda (available before approval). */
export default function PendingHelpScreen() {
  return (
    <Screen>
      <ScreenHeader title="Ajuda" />
      <TicketList base="/pending/support" />
    </Screen>
  );
}
