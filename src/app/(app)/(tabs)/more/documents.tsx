import { Stack } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { OwnDocuments } from "@/features/documents/components/OwnDocuments";
import { useOwnDocuments } from "@/features/documents/useDocuments";

/** Mais → Documentos (portal /perfil "Documentos enviados": view/download, re-send after rejection). */
export default function DocumentsScreen() {
  const documents = useOwnDocuments();
  return (
    <Screen edges={["left", "right"]} onRefresh={() => void documents.refetch()} refreshing={documents.isRefetching}>
      <Stack.Screen options={{ title: "Documentos" }} />
      <OwnDocuments />
    </Screen>
  );
}
