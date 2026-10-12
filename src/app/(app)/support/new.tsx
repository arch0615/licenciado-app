import { Stack } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { NewTicketForm } from "@/features/support/components/SupportViews";

export default function NewTicketScreen() {
  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Novo ticket" }} />
      <NewTicketForm base="/support" />
    </Screen>
  );
}
