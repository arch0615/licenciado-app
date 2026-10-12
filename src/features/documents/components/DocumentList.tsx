import type { UseQueryResult } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as Linking from "expo-linking";
import { View } from "react-native";

import { QueryState } from "@/components/states/QueryState";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { formatDate } from "@/lib/format";
import { documentStatusLabel } from "@/lib/status-labels";
import { userMessage } from "@/services/api/errors";
import { spacing } from "@/theme/tokens";

import type { DocumentItem, DocumentType, PickedFile } from "../document.service";
import { useDocumentViewUrl } from "../useDocuments";

export const DOCUMENT_LABELS: Record<string, string> = {
  RG: "RG",
  CNH: "CNH",
  CPF: "CPF",
  CNPJ: "Cartão CNPJ",
  FATURA_ENERGIA: "Fatura de energia",
  COMPROVANTE_RESIDENCIA: "Comprovante de residência",
  CONTRATO_SOCIAL: "Contrato social",
  CONTRATO_ASSINADO: "Contrato assinado",
  TERMO_ADESAO: "Termo de adesão"
};

/** Picks a PDF or image (portal accepts PDF/JPG/PNG/WEBP). Returns null when cancelled. */
export async function pickDocumentFile(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], copyToCacheDirectory: true });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  return { uri: asset.uri, name: asset.name, size: asset.size ?? 0, mimeType: asset.mimeType ?? "application/octet-stream" };
}

type Props = {
  title?: string;
  /** Either a query (own/client documents) or documents already loaded (e.g. inside a team member). */
  query?: UseQueryResult<DocumentItem[]>;
  items?: DocumentItem[];
  emptyText?: string;
  /** Re-send a rejected document (portal "Reenviar documento"); omit for read-only lists. */
  onResend?: (doc: DocumentItem) => void;
  resendingId?: string | null;
};

/**
 * Document list with status, rejection reason and "Ver" (portal "Visualizar/Baixar" via signed URL).
 * Only a public https link is opened. The homologation backend returns a relative `/content` path that needs
 * the login token (a browser cannot send it), so "Ver" shows a notice instead of opening a broken page
 * (backend dependency, docs/live-api-validation.md §13).
 */
export function DocumentList({ title = "Documentos", query, items, emptyText = "Sem documentos enviados", onResend, resendingId }: Props) {
  const view = useDocumentViewUrl();

  function open(documentId: string) {
    view.mutate(documentId, {
      onSuccess: (url) => {
        if (url) void Linking.openURL(url);
      }
    });
  }

  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="overline" tone="muted">
          {title}
        </AppText>
        {(() => {
          const render = (list: DocumentItem[]) =>
            list.length === 0 ? (
              <AppText tone="muted">{emptyText}</AppText>
            ) : (
            <View>
              {list.map((doc) => {
                const status = documentStatusLabel(doc.status_validacao);
                return (
                  <ListRow
                    key={doc.id}
                    title={DOCUMENT_LABELS[doc.tipo] ?? "Documento"}
                    subtitle={doc.reprovado_motivo ? `Motivo: ${doc.reprovado_motivo}` : `Enviado em ${formatDate(doc.created_at)}`}
                    right={
                      <View style={{ alignItems: "flex-end", gap: spacing.xxs }}>
                        <Badge label={status.label} tone={status.tone} />
                        <View style={{ flexDirection: "row" }}>
                          <Button label="Visualizar" variant="ghost" loading={view.isPending && view.variables === doc.id} onPress={() => open(doc.id)} />
                          {onResend && doc.status_validacao === "REPROVADO" ? (
                            <Button label="Reenviar" variant="ghost" loading={resendingId === doc.id} onPress={() => onResend(doc)} />
                          ) : null}
                        </View>
                      </View>
                    }
                  />
                );
              })}
            </View>
            );
          return query ? (
            <QueryState query={query} loadingLines={1}>
              {render}
            </QueryState>
          ) : (
            render(items ?? [])
          );
        })()}
        {view.error ? (
          <AppText variant="callout" tone="danger">
            {userMessage(view.error)}
          </AppText>
        ) : view.isSuccess && view.data === null ? (
          <AppText variant="callout" tone="muted">
            Visualização indisponível. Solicite abertura pelo portal.
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}

export type { DocumentType };
