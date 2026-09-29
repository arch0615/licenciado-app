import { router } from "expo-router";

import { EmptyState } from "@/components/states/States";
import { Screen } from "@/components/ui/Screen";

export default function NotFoundScreen() {
  return (
    <Screen>
      <EmptyState
        title="Página não encontrada"
        message="O link que você abriu não existe ou não está disponível para a sua conta."
        action={{ label: "Voltar ao início", onPress: () => router.replace("/") }}
      />
    </Screen>
  );
}
