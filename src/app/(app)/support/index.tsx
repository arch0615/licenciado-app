import { Stack } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { TicketList } from "@/features/support/components/SupportViews";

/** S33–S35 — Suporte (approved area). */
export default function SupportScreen() {
  return (
    <Screen edges={["left", "right"]}>
      <Stack.Screen options={{ title: "Suporte" }} />
      <TicketList base="/support" />
    </Screen>
  );
}
