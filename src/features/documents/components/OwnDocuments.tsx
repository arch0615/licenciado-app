import { useState } from "react";
import { View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { userMessage } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

import type { DocumentItem, DocumentType } from "../document.service";
import { useOwnDocuments, useUploadOwnDocument } from "../useDocuments";
import { DocumentList, pickDocumentFile } from "./DocumentList";

/**
 * The caller's documents (portal /perfil "Documentos enviados" + "Reenviar documento" after rejection).
 * View via signed URL; re-send only for REPROVADO documents.
 */
export function OwnDocuments({ title = "Documentos enviados" }: { title?: string }) {
  const documents = useOwnDocuments();
  const upload = useUploadOwnDocument();
  const [resendingId, setResendingId] = useState<string | null>(null);

  async function resend(doc: DocumentItem) {
    const file = await pickDocumentFile();
    if (!file) return;
    setResendingId(doc.id);
    upload.mutate(
      { tipo: doc.tipo as DocumentType, file, replaceDocumentId: doc.id },
      { onSettled: () => setResendingId(null) }
    );
  }

  return (
    <View style={{ gap: spacing.xs }}>
      <DocumentList title={title} query={documents} onResend={(doc) => void resend(doc)} resendingId={resendingId} />
      {upload.error ? (
        <AppText variant="callout" tone="danger">
          {userMessage(upload.error)}
        </AppText>
      ) : upload.isSuccess ? (
        <AppText variant="callout" tone="success">
          Documento reenviado para análise.
        </AppText>
      ) : null}
    </View>
  );
}
