import * as DocumentPicker from "expo-document-picker";
import { View } from "react-native";

import { QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import type { DocumentItem, DocumentType } from "@/features/documents/document.service";
import { documentStatusLabel } from "@/lib/status-labels";
import { userMessage } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

import { useMyDocuments, useUploadMyDocument } from "../useOnboarding";

const REQUIRED: { tipo: DocumentType; label: string }[] = [
  { tipo: "RG", label: "RG ou CNH" },
  { tipo: "CNPJ", label: "Cartão CNPJ" }
];

/** Documents step: real upload (presign → PUT → confirm), re-upload of rejected documents. */
export function DocumentsCard({ role }: { role: "LICENCIADO" | "SUBLICENCIADO" }) {
  const documents = useMyDocuments();
  const upload = useUploadMyDocument();
  const required = role === "LICENCIADO" ? REQUIRED : REQUIRED.slice(0, 1);

  async function pick(tipo: DocumentType, replace?: DocumentItem) {
    const result = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], copyToCacheDirectory: true });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    upload.mutate({
      tipo,
      replaceDocumentId: replace?.status_validacao === "REPROVADO" ? replace.id : undefined,
      file: { uri: asset.uri, name: asset.name, size: asset.size ?? 0, mimeType: asset.mimeType ?? "application/octet-stream" }
    });
  }

  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="overline" tone="muted">
          Documentos
        </AppText>
        <QueryState query={documents} loadingLines={1}>
          {(list) => (
            <View>
              {required.map(({ tipo, label }) => {
                const current = list.find((doc) => doc.tipo === tipo || (tipo === "RG" && doc.tipo === "CNH"));
                const status = current ? documentStatusLabel(current.status_validacao) : null;
                const canSend = !current || current.status_validacao === "REPROVADO";
                return (
                  <ListRow
                    key={tipo}
                    title={label}
                    subtitle={current?.reprovado_motivo ?? current?.arquivo_nome ?? "Não enviado"}
                    right={
                      canSend ? (
                        <Button
                          label={current ? "Reenviar" : "Enviar"}
                          variant="outline"
                          loading={upload.isPending && upload.variables?.tipo === tipo}
                          onPress={() => void pick(tipo, current)}
                        />
                      ) : status ? (
                        <Badge label={status.label} tone={status.tone} />
                      ) : null
                    }
                  />
                );
              })}
            </View>
          )}
        </QueryState>
        {upload.error ? (
          <AppText variant="callout" tone="danger">
            {userMessage(upload.error)}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}
